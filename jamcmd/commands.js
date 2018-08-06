const fs         = require('fs-extra'),
      path       = require('path'),
      plist      = require('simple-plist'),
      zipdir     = require('zip-dir'),
      tmp        = require('tmp'),
      template   = require('./template'),
      simulator  = require('./simulator'),
      shell      = require('./shell'),
      syncfolder = require('./syncfolder');

var commands = {

    createApp : function(name, options) {
        if (fs.existsSync(name)) {
            console.log('ERROR: ' + name + ' already exists!');
            return;
        }

        template.copy('apps', options.template, options.language, name);    

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

    runApp : function(mode) {
        if (!fs.existsSync('./package.bon')) {
            console.log('ERROR: package.bon not found!');
            return;
        }

        simulator.start();

        var app_path = path.resolve(__dirname, 'jamkit.app');
        var app_info = plist.readFileSync(path.resolve(app_path, 'Info.plist'))
        var app_id = app_info.CFBundleIdentifier;
        var app_version = app_info.CFBundleVersion;
        var container = simulator.getAppContainer(app_id);

        if (container != null) {
            var installed_info = plist.readFileSync(path.resolve(container, 'Info.plist'));
            var installed_version = installed_info.CFBundleVersion;

            if (installed_version !== app_version) {
                simulator.uninstall(app_id);
                container = null;
            }
        }

        if (container == null) {
            simulator.install(app_path);
            container = simulator.getAppContainer(app_id);
        }

        var appinfo = JSON.parse(fs.readFileSync('./package.bon', 'utf8'));
        var settings = plist.readFileSync(path.resolve(container, 'Settings.plist'));

        simulator.launch(app_id);

        shell.ready(60 * 1000) // 1 minute
            .then(function() { 
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
                    return shell.execute('catalog path bundle');
                }
            })
            .then(function(resource_path) {
                var needs_reset = true;
                syncfolder.start('./catalogs', resource_path, function() {
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

    createBook : function(name, options) {
        if (fs.existsSync(name)) {
            console.log('ERROR: ' + name + ' already exists!');
            return;
        }

        template.copy('books', options.template, options.language, name);    

        if (!fs.existsSync(name)) {
            console.log('ERROR: template may not exists.');
            return;
        }

        var bon_path = path.resolve(name, 'book.bon');
        var bookinfo = JSON.parse(fs.readFileSync(bon_path, 'utf8'));

        bookinfo.version = options.version;
        fs.writeFile(bon_path, JSON.stringify(bookinfo, null, 4));
    },

    runBook : function() {
        if (!fs.existsSync('./book.bon')) {
            console.log('ERROR: book.bon not found!');
            return;
        }

        simulator.start();

        var app_path = path.resolve(__dirname, 'jamkit.app');
        var app_info = plist.readFileSync(path.resolve(app_path, 'Info.plist'))
        var app_id = app_info.CFBundleIdentifier;
        var app_version = app_info.CFBundleVersion;
        var container = simulator.getAppContainer(app_id);

        if (container != null) {
            var installed_info = plist.readFileSync(path.resolve(container, 'Info.plist'));
            var installed_version = installed_info.CFBundleVersion;

            if (installed_version !== app_version) {
                simulator.uninstall(app_id);
                container = null;
            }
        }

        if (container == null) {
            simulator.install(app_path);
            container = simulator.getAppContainer(app_id);
        }

        simulator.launch(app_id);

        shell.ready(60 * 1000) // 1 minute
            .then(function() { 
                return shell.open();
            })
            .then(function() {
                return shell.execute('book path bundle');
            })
            .then(function(bundle_path) {
                var needs_open = true;
                syncfolder.start('.', bundle_path, function() {
                    if (needs_open) {
                        shell.execute('book open');
                        needs_open = false;
                    } else {
                        shell.execute('book reload');
                    }
                });
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
    }
};

module.exports = commands;

