const fs         = require('fs-extra'),
      path       = require('path'),
      zipdir     = require('zip-dir'),
      tmp        = require('tmp'),
      ipfs       = require('ipfs-http-client'),
      template   = require('./template'),
      simulator  = require('./simulator'),
      shell      = require('./shell'),
      syncfolder = require('./syncfolder');

module.exports = {
    createApp : function(name, options) {
        if (fs.existsSync(name)) {
            console.log('ERROR: ' + name + ' already exists!');
            return;
        }

        template.copy('apps', options.repository, options.template, options.language, name);    

        if (!fs.existsSync(name)) {
            console.log('ERROR: template may not exists.');
            return;
        }

        var bon_path = path.resolve(name, 'package.bon');
        var appinfo = JSON.parse(fs.readFileSync(bon_path, 'utf8'));

        appinfo.id = options.app_id;
        appinfo.version = options.version;
        
        fs.writeFile(bon_path, JSON.stringify(appinfo, null, 4));
    },

    runApp : function(platform, mode) {
        if (!fs.existsSync('./package.bon')) {
            console.log('ERROR: package.bon not found.');
            return;
        }
        
        var appinfo = JSON.parse(fs.readFileSync('./package.bon', 'utf8'));

        if (!appinfo || !appinfo.id) {
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
                    return shell.execute('app id ' + appinfo.id);
                }
            })
            .then(function() {
                if (mode === 'jam') {
                    return shell.execute('catalog path resource ' + appinfo.id);
                } else {
                    return shell.execute('catalog path resource');
                }
            })
            .then(function(resource_path) {
                var needs_reset = true;
                syncfolder.start(platform, app_id, './catalogs', resource_path, function() {
                    if (needs_reset) {
                        if (mode === 'jam') {
                            shell.execute('catalog reset ' + appinfo.id);
                        } else {
                            shell.execute('catalog reset');
                        }
                        needs_reset = false;
                    } else {
                        if (mode === 'jam') {
                            shell.execute('catalog reload ' + appinfo.id);
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
        if (!fs.existsSync('./package.bon')) {
            console.log('ERROR: package.bon not found!');
            return;
        }

        var jamfile = path.basename(path.resolve('.')) + '.jam';

        if (fs.existsSync(jamfile)) {
            fs.unlinkSync(jamfile);
        }

        tempfile = tmp.tmpNameSync();
        zipdir('.', { saveTo:tempfile }, function(err, buffer) {
            if (err) {
                throw err;
            }

            fs.renameSync(tempfile, jamfile);
        });
    },

    publishApp : function(host_app, ipfs_options) {
        if (!fs.existsSync('./package.bon')) {
            console.log('ERROR: package.bon not found!');
            return;
        }

        var jamfile = path.basename(path.resolve('.')) + '.jam';

        if (fs.existsSync(jamfile)) {
            fs.unlinkSync(jamfile);
        }

        tempfile = tmp.tmpNameSync();
        zipdir('.', { saveTo:tempfile }, function(err, buffer) {
            if (err) {
                throw err;
            }

            fs.renameSync(tempfile, jamfile);

            ipfs(ipfs_options).addFromFs(jamfile, {}, function(err, result) {
                if (err) {
                    throw err;
                }

                var url = "https://jamkit.io/connect/app/?"
                        + "url=" + "ipfs://" + result[0]['hash'] + "&" 
                        + "host-app=" + host_app;

                console.log(url);
            });
       });
    },

    createBook : function(name, options) {
        if (fs.existsSync(name)) {
            console.log('ERROR: ' + name + ' already exists!');
            return;
        }

        template.copy('books', options.repository, options.template, options.language, name);    

        if (!fs.existsSync(name)) {
            console.log('ERROR: template may not exists.');
            return;
        }

        var bon_path = path.resolve(name, 'book.bon');
        var bookinfo = JSON.parse(fs.readFileSync(bon_path, 'utf8'));

        bookinfo.version = options.version;
        fs.writeFile(bon_path, JSON.stringify(bookinfo, null, 4));
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
        if (!fs.existsSync('./book.bon')) {
            console.log('ERROR: book.bon not found!');
            return;
        }

        var bxpfile = path.basename(path.resolve('.')) + '.bxp';

        if (fs.existsSync(bxpfile)) {
            fs.unlinkSync(bxpfile);
        }

        tempfile = tmp.tmpNameSync();
        zipdir('.', { saveTo:tempfile }, function(err, buffer) {
            if (err) {
                throw err;
            }

            fs.renameSync(tempfile, bxpfile);
        });
    },

    publishBook : function(host_app, ipfs_options) {
        if (!fs.existsSync('./book.bon')) {
            console.log('ERROR: book.bon not found!');
            return;
        }

        var bxpfile = path.basename(path.resolve('.')) + '.bxp';
        
        if (fs.existsSync(bxpfile)) {
            fs.unlinkSync(bxpfile);
        }

        tempfile = tmp.tmpNameSync();
        zipdir('.', { saveTo:tempfile }, function(err, buffer) {
            if (err) {
                throw err;
            }

            fs.renameSync(tempfile, bxpfile);

            ipfs(ipfs_options).addFromFs(bxpfile, {}, function(err, result) {
                if (err) {
                    throw err;
                }

                var url = "https://jamkit.io/connect/book/?"
                        + "url=" + "ipfs://" + result[0]['hash'] + "&" 
                        + "host-app=" + host_app;

                console.log(url);
            });
        });
    }
};
