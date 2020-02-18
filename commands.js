const fs          = require('fs-extra'),
      path        = require('path'),
      zipdir      = require('zip-dir'),
      tmp         = require('tmp'),
      ipfs        = require('ipfs-http-client'),
      template    = require('./template'),
      catalog     = require('./catalog'),
      simulator   = require('./simulator'),
      shell       = require('./shell'),
      syncfolder  = require('./syncfolder'),
      urlencode   = require('urlencode'),
      uuid        = require('uuid/v4');

const connect_base_url = "https://jamkit.io";

module.exports = {
    createApp : function(name, options) {
        var self = this;

        if (fs.existsSync(name)) {
            console.log('ERROR: ' + name + ' already exists!');
            return;
        }

        template.copy('apps', name, options);

        if (!fs.existsSync(name)) {
            console.log('ERROR: template may not exists.');
            return;
        }

        var bon_path = path.resolve(name, 'package.bon');
        var appinfo = JSON.parse(fs.readFileSync(bon_path, 'utf8'));

        appinfo['id'] = self.__generateAppID(options['app-id']);
        appinfo['version'] = options['version'];
        
        fs.writeFileSync(bon_path, JSON.stringify(appinfo, null, 4));
    },

    runApp : function(platform, mode) {
        if (!fs.existsSync('./package.bon')) {
            console.log('ERROR: package.bon not found.');
            return;
        }
        
        var appinfo = JSON.parse(fs.readFileSync('./package.bon', 'utf8'));

        if (!appinfo || !appinfo['id']) {
            console.log('ERROR: package.bon is malformed.');
            return;
        }

        simulator.start(platform).then(function(app_id) {
            shell.ready(60 * 1000).then(function() {  // 1 minute
                return shell.open();
            })
            .then(function() {
                if (mode === 'jam') {
                    return shell.execute('app id'); // dummy command for promise
                } else {
                    return shell.execute('app id ' + appinfo['id']);
                }
            })
            .then(function() {
                if (mode === 'jam') {
                    return shell.execute('catalog path resource ' + appinfo['id']);
                } else {
                    return shell.execute('catalog path resource');
                }
            })
            .then(function(resource_path) {
                var needs_reset = true;
                syncfolder.start(platform, app_id, './catalogs', resource_path, function() {
                    if (needs_reset) {
                        if (mode === 'jam') {
                            shell.execute('catalog reset ' + appinfo['id']);
                        } else {
                            shell.execute('catalog reset');
                        }
                        needs_reset = false;
                    } else {
                        if (mode === 'jam') {
                            shell.execute('catalog reload ' + appinfo['id']);
                        } else {
                            shell.execute('catalog reload');
                        }
                    }
                });
            });
        }, function() {
            console.log('ERROR: could not start a simulator!');
        });
    },

    buildApp : function() {
        var self = this;

        if (!fs.existsSync('./package.bon')) {
            console.log('ERROR: package.bon not found!');
            return;
        }

        var appinfo = JSON.parse(fs.readFileSync('./package.bon', 'utf8'));

        if (!appinfo || !appinfo['id']) {
            console.log('ERROR: package.bon is malformed.');
            return;
        }

        var jamfile = path.basename(path.resolve('.')) + '.jam';

        if (fs.existsSync(jamfile)) {
            fs.unlinkSync(jamfile);
        }

        var tempfile = tmp.tmpNameSync();
        self.__compressFolder(tempfile, function() {
            fs.moveSync(tempfile, jamfile);
        })
    },

    publishApp : function(host_app, options, ipfs_options, install_urls) {
        var self = this;

        if (!fs.existsSync('./package.bon')) {
            console.log('ERROR: package.bon not found!');
            return;
        }

        var appinfo = JSON.parse(fs.readFileSync('./package.bon', 'utf8'));

        if (!appinfo || !appinfo['id']) {
            console.log('ERROR: package.bon is malformed.');
            return;
        }

        var jamfile = path.basename(path.resolve('.')) + '.jam';

        if (fs.existsSync(jamfile)) {
            fs.unlinkSync(jamfile);
        }

        var tempfile = tmp.tmpNameSync();
        self.__compressFolder(tempfile, function() {
            fs.moveSync(tempfile, jamfile);

            self.__publishFile(jamfile, ipfs_options, function(hash) {
                var title = options['title'] || appinfo['title']
                var url = connect_base_url + "/connect/app/?"
                        + "app=" + appinfo['id'] + "&"
                        + "url=" + urlencode("ipfs://hash/" + hash) + "&" 
                        + (title ? "title=" + urlencode(title) + "&" : "")
                        + (appinfo['version'] ? "version=" + appinfo['version'] + "&" : "")
                        + (options['image-url'] ? "image=" + urlencode(options['image-url']) + "&" : "")
                        + "host-app=" + host_app;

                Object.keys(install_urls).forEach(function(platform) {
                    if (install_urls[platform] !== 'auto') {
                        url = url + "&" + platform + "-install-url=" + urlencode(install_urls[platform]);
                    }
                });

                console.log(url);
            });
        })
    },

    createBook : function(name, options) {
        if (fs.existsSync(name)) {
            console.log('ERROR: ' + name + ' already exists!');
            return;
        }

        template.copy('books', name, options);

        if (!fs.existsSync(name)) {
            console.log('ERROR: template may not exists.');
            return;
        }

        var bon_path = path.resolve(name, 'book.bon');
        var bookinfo = JSON.parse(fs.readFileSync(bon_path, 'utf8'));

        bookinfo['version'] = options['version'];

        fs.writeFileSync(bon_path, JSON.stringify(bookinfo, null, 4));
    },

    runBook : function(platform) {
        if (!fs.existsSync('./book.bon')) {
            console.log('ERROR: book.bon not found!');
            return;
        }

        simulator.start(platform).then(function(app_id) {
            shell.ready(60 * 1000).then(function() { // 1 minute
                return shell.open();
            })
            .then(function() {
                return shell.execute('book path resource');
            })
            .then(function(resource_path) {
                var needs_open = true;
                syncfolder.start(platform, app_id, '.', resource_path, function() {
                    if (needs_open) {
                        shell.execute('book open');
                        needs_open = false;
                    } else {
                        shell.execute('book reload');
                    }
                });
            });
        }, function() {
            console.log('ERROR: could not start a simulator!');
        });
    },

    buildBook : function() {
        var self = this;

        if (!fs.existsSync('./book.bon')) {
            console.log('ERROR: book.bon not found!');
            return;
        }

        var bxpfile = path.basename(path.resolve('.')) + '.bxp';

        if (fs.existsSync(bxpfile)) {
            fs.unlinkSync(bxpfile);
        }

        var tempfile = tmp.tmpNameSync();
        self.__compressFolder(tempfile, function() {
            fs.renameSync(tempfile, bxpfile);
        })
    },

    publishBook : function(host_app, options, ipfs_options, install_urls) {
        var self = this;

        if (!fs.existsSync('./book.bon')) {
            console.log('ERROR: book.bon not found!');
            return;
        }

        var bookinfo = JSON.parse(fs.readFileSync('./book.bon', 'utf8'));

        if (!bookinfo) {
            console.log('ERROR: book.bon is malformed.');
            return;
        }

        var bxpfile = path.basename(path.resolve('.')) + '.bxp';
        
        if (fs.existsSync(bxpfile)) {
            fs.unlinkSync(bxpfile);
        }

        var tempfile = tmp.tmpNameSync();
        self.__compressFolder(tempfile, function() {
            fs.renameSync(tempfile, bxpfile);

            self.__publishFile(bxpfile, ipfs_options, function(hash) {
                var title = options['title'] || bookinfo['title']
                var url = connect_base_url + "/connect/book/?"
                        + "url=" + urlencode("ipfs://hash/" + hash) + "&" 
                        + (title ? "title=" + urlencode(title) + "&" : "")
                        + (bookinfo['version'] ? "version=" + bookinfo['version'] + "&" : "")
                        + (options['image-url'] ? "image=" + urlencode(options['image-url']) + "&" : "")
                        + "host-app=" + host_app;

                Object.keys(install_urls).forEach(function(platform) {
                    if (install_urls[platform] !== 'auto') {
                        url = url + "&" + platform + "-install-url=" + urlencode(install_urls[platform]);
                    }
                });
        
                console.log(url);
            });
        });
    },

    generateDatabase : function(target, store, file) {
        var data = catalog.load_from_spreadsheet(file, store);
        var basedir = path.join('catalogs', target);

        catalog.save_to_file(data[0], path.join(basedir, 'catalog.bon'));
        catalog.save_to_database(data[0], data[1], path.join(basedir, 'catalog.sqlite'));
    },

    __generateAppID : function(wanted_app_id) {
        if (wanted_app_id === 'auto') {
            return 'com.yourdomain.' + uuid();
        }

        return wanted_app_id;
    },

    __compressFolder : function(zipPath, callback) {
        zipdir('.', { 
            saveTo: zipPath,
            filter: function(fullPath, stat) {
                if (path.basename(fullPath).startsWith(".")) {
                    return false;
                }

                if (['.jam','.bxp'].includes(path.extname(fullPath)) {
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
    },

    __publishFile : function(zipPath, options, callback) {
        ipfs(options).addFromFs(zipPath, {}, function(err, result) {
            if (err) {
                throw err;
            }

            callback(result[0]['hash']);
        });
    } 
}
