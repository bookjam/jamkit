const fs         = require('fs-extra'),
      path       = require('path'),
      zipdir     = require('zip-dir'),
      tmp        = require('tmp'),
      ipfs       = require('ipfs-http-client'),
      urlencode  = require('urlencode'),
      uuid       = require('uuid'),
      template   = require('./template'),
      catalog    = require('./catalog'),
      simulator  = require('./simulator'),
      shell      = require('./shell'),
      syncfolder = require('./syncfolder'),
      installer  = require('./installer'),
      bon        = require('./bon'),
      leafly     = require('./leafly'),
      utils      = require('./utils');

const connect_base_url = "https://jamkit.io";

function _generate_app_id(wanted_app_id, template_app_id) {
    if (wanted_app_id === 'auto') {
        return 'com.yourdomain.' + uuid.v4();
    }

    if (wanted_app_id === 'manual') {
        return template_app_id;
    }

    return wanted_app_id;
}

function _compress_folder(zip_path, callback) {
    zipdir('.', { 
        saveTo: zip_path,
        filter: function(fullPath, stat) {
            if (path.basename(fullPath).startsWith(".")) {
                return false;
            }

            if (['.jam','.bxp'].includes(path.extname(fullPath))) {
                return false;
            }

            return true;
        }
     }, 
     function(err, buffer) {
        if (err) {
            throw err;
        }

        callback();
    });
}

function _publish_app(app_id, options, ipfs_options, callback) {
    if (!options['app-url']) {
        var basename = app_id.split(".").slice(-1);
        var jamfile = basename + '.jam';

        if (fs.existsSync(jamfile)) {
            fs.unlinkSync(jamfile);
        }

        var tempfile = tmp.tmpNameSync();
        _compress_folder(tempfile, function() {
            fs.moveSync(tempfile, jamfile);

            _publish_file(jamfile, ipfs_options)
                .then(function(hash) {
                    callback("ipfs://hash/" + hash);
                })
                .catch(function(err){
                    console.log(err);
                });
        });
    } else {
        callback(options['app-url']);
    }
}

function _publish_book(options, ipfs_options, callback) {
    if (!options['book-url']) {
        var basename = path.basename(path.resolve('.'))
        var bxpfile = basename + '.bxp';

        if (fs.existsSync(bxpfile)) {
            fs.unlinkSync(bxpfile);
        }

        var tempfile = tmp.tmpNameSync();
        _compress_folder(tempfile, function() {
            fs.moveSync(tempfile, bxpfile);

            _publish_file(bxpfile, ipfs_options)
                .then(function(hash) {
                    callback("ipfs://hash/" + hash);
                })
                .catch(function(err){
                    console.log(err);
                });
        });
    } else {
        callback(options['book-url']);
    }
}

function _publish_image(options, ipfs_options, callback) {
    if (!options['image-url']) {
        if (options['image-file']) {
            _publish_file(options['image-file'], ipfs_options)
                .then(function(hash) {
                    callback("https://ipfs.io/ipfs/" + hash);
                })
                .catch(function(err){
                    console.log(err);
                });
        } else {
            callback();
        }
    } else {
        callback(options['image-url']);
    }
}

async function _publish_file(path, options, callback) {
    for await (const file of ipfs.create(options).addAll(ipfs.globSource('./', path))) {
        callback(file["cid"]);
    }
}

function _shorten_url(url, callback) {
    leafly.create_short_url(url)
        .then(function({ url }) {
            callback(url);
        })
        .catch(function(error) {
            callback(url);
        });
}

module.exports = {
    create_app: function(name, options) {
        if (fs.existsSync(name)) {
            console.log('ERROR: ' + name + ' already exists!');
            return;
        }

        template.copy('apps', name, options)
            .then(function() {
                var bon_path = path.resolve(name, 'package.bon');
                var appinfo = bon.parse(fs.readFileSync(bon_path, 'utf8'));
        
                appinfo['id'] = _generate_app_id(options['app-id'], appinfo['id']);
                appinfo['version'] = options['version'];
                
                fs.writeFileSync(bon_path, bon.stringify(appinfo));        
            })
            .catch(function(error) {
                console.log('ERROR: template may not exists.');
            });
    },

    run_app: function(platform, mode, shell_options, options) {
        if (!fs.existsSync('./package.bon')) {
            console.log('ERROR: package.bon not found.');
            return;
        }
        
        var appinfo = bon.parse(fs.readFileSync('./package.bon', 'utf8'));

        if (!appinfo || !appinfo['id']) {
            console.log('ERROR: package.bon is malformed.');
            return;
        }

        simulator.start(platform, shell_options['port'])
            .then(function(app_id) {
                shell.ready(shell_options['host'], shell_options['port'], 60 * 1000) // 1 minute
                    .then(function() {
                        return shell.open();
                    })
                    .then(function() {
                        if ([ 'jam', 'widget' ].includes(mode)) {
                            return Promise.resolve(); // nothing to do
                        } else {
                            return shell.execute('app id ' + appinfo['id']);
                        }
                    })
                    .then(function() {
                        if ([ 'jam', 'widget' ].includes(mode)) {
                            return shell.execute('catalog path resource ' + appinfo['id']);
                        } else {
                            return shell.execute('catalog path resource');
                        }
                    })
                    .then(function(resource_path) {
                        var needs_reset = true;
                        syncfolder.start(platform, app_id, './catalogs', resource_path, options, function() {
                            if (needs_reset) {
                                if ([ 'jam', 'widget' ].includes(mode)) {
                                    shell.execute('app install ' + utils.dataToDataURL(appinfo));

                                    if ([ 'jam' ].includes(mode)) {
                                        shell.execute('catalog reset ' + appinfo['id']);
                                    } else {
                                        shell.execute('catalog reload');
                                    }
                                } else {
                                    shell.execute('catalog reset');
                                }
                                needs_reset = false;
                            } else {
                                if ([ 'jam' ].includes(mode)) {
                                    shell.execute('catalog reload ' + appinfo['id']);
                                } else {
                                    shell.execute('catalog reload');
                                }
                            }
                        });
                });
            })
            .catch(function() {
                console.log('ERROR: could not start a simulator!');
            });
    },

    build_app: function() {
        if (!fs.existsSync('./package.bon')) {
            console.log('ERROR: package.bon not found!');
            return;
        }

        var appinfo = bon.parse(fs.readFileSync('./package.bon', 'utf8'));

        if (!appinfo || !appinfo['id']) {
            console.log('ERROR: package.bon is malformed.');
            return;
        }

        var basename = appinfo["id"].split(".").slice(-1);
        var jamfile = basename + '.jam';

        if (fs.existsSync(jamfile)) {
            fs.unlinkSync(jamfile);
        }

        var tempfile = tmp.tmpNameSync();
        _compress_folder(tempfile, function() {
            fs.moveSync(tempfile, jamfile);
        });
    },

    install_app: function(platform) {
        if (!fs.existsSync('./package.bon')) {
            console.log('ERROR: package.bon not found!');
            return;
        }

        var appinfo = bon.parse(fs.readFileSync('./package.bon', 'utf8'));

        if (!appinfo || !appinfo['id']) {
            console.log('ERROR: package.bon is malformed.');
            return;
        }

        var basename = appinfo["id"].split(".").slice(-1);
        var jamfile = basename + '.jam';

        if (fs.existsSync(jamfile)) {
            fs.unlinkSync(jamfile);
        }

        var tempfile = tmp.tmpNameSync();
        _compress_folder(tempfile, function() {
            fs.moveSync(tempfile, jamfile);

            installer.install(platform, jamfile);
        });
    },

    publish_app: function(host, options, ipfs_options, install_urls) {
        if (!options['app-url'] && !fs.existsSync('./package.bon')) {
            console.log('ERROR: package.bon not found!');
            return;
        }

        var appinfo = bon.parse(fs.readFileSync('./package.bon', 'utf8')) || {};

        if (!options['app-url'] && !appinfo) {
            console.log('ERROR: package.bon is malformed.');
            return;
        }

        if (options['language'] && appinfo['localization']) {
            var localization = appinfo['localization'][options['language']] || {};

            if (localization['title']) {
                appinfo['title'] = localization['title'];
            }
        }

        _publish_app(appinfo["id"], options, ipfs_options, function(app_url) {
            _publish_image(options, ipfs_options, function(image_url) {
                var title = options['title'] || appinfo['title'] || "";
                var url = (host['url'] || connect_base_url) + "/connect/app/?"
                        + "app=" + appinfo['id'] + "&" + "url=" + urlencode(app_url)
                        + (title ? "&" + "title=" + urlencode(title) : "")
                        + (appinfo['version'] ? "&" + "version=" + appinfo['version'] : "")
                        + (image_url ? "&" + "image=" + urlencode(image_url) : "")
                        + (host['url'] ? "" : "&" + "host-scheme=" + host['scheme']);
    
                Object.keys(install_urls).forEach(function(platform) {
                    if (install_urls[platform] !== 'auto') {
                        url = url + "&" + platform + "-install-url=" + urlencode(install_urls[platform]);
                    }
                });
    
                if (options['shorten-url']) {
                    _shorten_url(url, function(url) {
                        console.log(url);
                    });
                } else {
                    console.log(url);
                }
            });
        });
    },

    create_book: function(name, options) {
        if (fs.existsSync(name)) {
            console.log('ERROR: ' + name + ' already exists!');
            return;
        }

        template.copy('books', name, options)
            .then(function() {
                var bon_path = path.resolve(name, 'book.bon');
                var bookinfo = bon.parse(fs.readFileSync(bon_path, 'utf8'));
        
                bookinfo['version'] = options['version'];
        
                fs.writeFileSync(bon_path, bon.stringify(bookinfo));        
            })
            .catch(function(error) {
                console.log('ERROR: template may not exists.');
            });
    },

    run_book: function(platform, shell_options, options) {
        if (!fs.existsSync('./book.bon')) {
            console.log('ERROR: book.bon not found!');
            return;
        }

        simulator.start(platform, shell_options['port'])
            .then(function(app_id) {
                shell.ready(shell_options['host'], shell_options['port'], 60 * 1000) // 1 minute
                    .then(function() { 
                        return shell.open();
                    })
                    .then(function() {
                        return shell.execute('book path resource');
                    })
                    .then(function(resource_path) {
                        var needs_open = true;
                        syncfolder.start(platform, app_id, '.', resource_path, options, function() {
                            if (needs_open) {
                                shell.execute('book open');
                                needs_open = false;
                            } else {
                                shell.execute('book reload');
                            }
                        });
                    });
        })
        .catch(function() {
            console.log('ERROR: could not start a simulator!');
        });
    },

    build_book: function() {
        if (!fs.existsSync('./book.bon')) {
            console.log('ERROR: book.bon not found!');
            return;
        }

        var basename = path.basename(path.resolve('.'))
        var bxpfile = basename + '.bxp';

        if (fs.existsSync(bxpfile)) {
            fs.unlinkSync(bxpfile);
        }

        var tempfile = tmp.tmpNameSync();
        _compress_folder(tempfile, function() {
            fs.moveSync(tempfile, bxpfile);
        });
    },

    install_book: function(platform) {
        if (!fs.existsSync('./book.bon')) {
            console.log('ERROR: book.bon not found!');
            return;
        }

        var basename = path.basename(path.resolve('.'))
        var bxpfile = basename + '.bxp';

        if (fs.existsSync(bxpfile)) {
            fs.unlinkSync(bxpfile);
        }

        var tempfile = tmp.tmpNameSync();
        _compress_folder(tempfile, function() {
            fs.moveSync(tempfile, bxpfile);

            installer.install(platform, jamfile);
        });
    },

    publish_book: function(host, options, ipfs_options, install_urls) {
        if (!options['book-url'] && !fs.existsSync('./book.bon')) {
            console.log('ERROR: book.bon not found!');
            return;
        }

        var bookinfo = bon.parse(fs.readFileSync('./book.bon', 'utf8'));

        if (!options['book-url'] && !bookinfo) {
            console.log('ERROR: book.bon is malformed.');
            return;
        }

        _publish_book(options, function(book_url) {
            _publish_image(options, ipfs_options, function(image_url) {
                var title = options['title'] || appinfo['title'] || "";
                var url = (host['url'] || connect_base_url) + "/connect/book/?"
                        + "book=" + basename + "&" + "url=" + urlencode(book_url)
                        + (title ? "&" + "title=" + urlencode(title) : "")
                        + (bookinfo['version'] ? "&" + "version=" + bookinfo['version'] : "")
                        + (image_url ? "&" + "image=" + urlencode(image_url) : "")
                        + (host['url'] ? "" : "&" + "host-scheme=" + host['scheme']);
    
                Object.keys(install_urls).forEach(function(platform) {
                    if (install_urls[platform] !== 'auto') {
                        url = url + "&" + platform + "-install-url=" + urlencode(install_urls[platform]);
                    }
                });
    
                if (options['shorten-url']) {
                    _shorten_url(url, function(url) {
                        console.log(url);
                    });
                } else {
                    console.log(url);
                }
            });
        });
    },

    generate_database: function(target, store, file) {
        var data = catalog.load_from_spreadsheet(file, store);
        var basedir = path.join('catalogs', target);

        catalog.save_to_file(data[0], path.join(basedir, 'catalog.bon'));
        catalog.save_to_database(data[0], data[1], path.join(basedir, 'catalog.sqlite'));
    }
}
