const fs         = require('fs-extra'),
      path       = require('path'),
      plist      = require('simple-plist'),
      zipFolder  = require('zip-folder'),
      tmp        = require('tmp'),
      template   = require('./template'),
      simulator  = require('./simulator'),
      shell      = require('./shell'),
      syncfolder = require('./syncfolder');

var commands = {

    createProject : function(project, options) {
        if (fs.existsSync(project)) {
            console.log('ERROR: ' + project + ' already exists!');
            return;
        }

        template.copy(options.template, options.language, project);    

        if (!fs.existsSync(project)) {
            console.log('ERROR: template may not exists.');
            return;
        }

        var pkg_path = path.resolve(project, 'package.bon');
        var pkginfo = JSON.parse(fs.readFileSync(pkg_path, 'utf8'));

        pkginfo.id = options.app_id;
        pkginfo.version = options.version;
        fs.writeFile(pkg_path, JSON.stringify(pkginfo, null, 4));
    },

    runProject : function() {
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

        var pkginfo = JSON.parse(fs.readFileSync('./package.bon', 'utf8'));
        var settings = plist.readFileSync(path.resolve(container, 'Settings.plist'));

        simulator.launch(app_id);

        shell.ready(60 * 1000, function() {  // 1 minute
            shell.open(function() {
                shell.execute('app id ' + pkginfo.id, function() {
                    shell.execute('catalog path bundle', function(bundle_path) {
                        var needs_reset = true;
                        syncfolder.start('./catalogs', bundle_path, function() {
                            if (needs_reset) {
                                shell.execute('catalog reset');
                                needs_reset = false;
                            } else {
                                shell.execute('catalog reload');
                            }
                        });
                    });
                });
            });
        });
    },

    buildProject : function() {
        if (!fs.existsSync('./package.bon')) {
            console.log('ERROR: package.bon not found!');
            return;
        }

        var jamfile = path.basename(path.resolve('.')) + '.jam';

        if (fs.existsSync(jamfile)) {
            fs.unlink(jamfile);
        }

        tempfile = tmp.tmpNameSync();
        zipFolder('.', tempfile, function(err) {
            if (err) {
                throw err;
            }

            fs.rename(tempfile, jamfile);
        });
    }
};

module.exports = commands;

