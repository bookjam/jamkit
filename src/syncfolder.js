const chokidar = require('chokidar'),
      path     = require('path'),
      fs       = require('fs-extra'),
      avdctl   = require('./avdctl-helper')

var _impl = {
    "ios" : {
        sync: function(app_id, src, dest) {
            if (fs.existsSync(dest)) {
                fs.removeSync(dest);
            }

            fs.copySync(src, dest);
        },

        copy: function(app_id, src, dest) {
            if (!fs.lstatSync(src).isDirectory) {
                fs.writeFileSync(dest, fs.readFileSync(src));
            } else {
                fs.copySync(src, dest);
            }
        },
    
        remove: function(app_id, path) {
            fs.removeSync(path);
        }
    },

    "android" : {
        sync: function(app_id, src, dest) {
            var tmproot = '/data/local/tmp/jamkit';

            avdctl.shell('rm -rf ' + tmproot);
            avdctl.push(src, tmproot);

            if (avdctl.get_sdk_version() >= 30) {
                avdctl.shell('rm -rf ' + dest);
                avdctl.shell('mkdir ' + dest);
                avdctl.shell('cp -rf ' + tmproot + '/* ' + dest);
            } else {
                avdctl.shell('run-as ' + app_id + ' rm -rf ' + dest);
                avdctl.shell('run-as ' + app_id + ' mkdir ' + dest);
                avdctl.shell('run-as ' + app_id + ' cp -rf ' + tmproot + '/* ' + dest);
            }
        },

        copy: function(app_id, src, dest) {
            var tmproot = '/data/local/tmp/jamkit';
            var tmppath = tmproot + "/" + path.basename(src);

            avdctl.push(src, tmppath);

            if (avdctl.get_sdk_version() >= 30) {
                avdctl.shell('cp -rf ' + tmppath + ' ' + dest);
            } else {
                avdctl.shell('run-as ' + app_id + ' cp -rf ' + tmppath + ' ' + dest);
            }
        },
        
        remove: function(app_id, path) {
            if (avdctl.get_sdk_version() >= 30) {
                avdctl.shell('rm -rf ' + path.replace(/\\/g, '/'));
            } else {
                avdctl.shell('run-as ' + app_id + ' rm -rf ' + path.replace(/\\/g, '/'));
            }
        }
    }
}

module.exports = {
    start: function(platform, app_id, src, dest, options, handler) {
        var watcher = chokidar.watch(src, { ignored: /[\/\\]\./, persistent: true });
        var is_ready = false;
        
        watcher
            .on('ready', function() {
                if (!options['skip-sync']) {
                    _impl[platform].sync(app_id, src, dest);
                }

                is_ready = true;

                console.log("Done");

                handler();
            })
            .on('add', function(file) {
                if (is_ready) {
					var subpath = path.relative(src, file).replace(/\\/g, '/');

                    _impl[platform].copy(app_id, file, dest + "/" + subpath);

                    handler();
                }
            })
            .on('addDir', function(dir) {
                if (is_ready) {
					var subpath = path.relative(src, dir).replace(/\\/g, '/');
					
                    _impl[platform].copy(app_id, dir, dest + "/" + subpath);

                    handler();
                }
            })
            .on('change', function(file, stats) {
                if (is_ready) {
					var subpath = path.relative(src, file).replace(/\\/g, '/');
					
                    _impl[platform].copy(app_id, file, dest + "/" + subpath);

                    handler();
                }
            })
            .on('unlink', function(file) {
                if (is_ready) {
					var subpath = path.relative(src, file).replace(/\\/g, '/');

                    _impl[platform].remove(app_id, dest + "/" + subpath); 

                    handler();
                }
            })
            .on('unlinkDir', function(dir) {
                if (is_ready) {
					var subpath = path.relative(src, dir).replace(/\\/g, '/');

                    _impl[platform].remove(app_id, dest + "/" + subpath); 

                    handler();
                }
            });
        
        process.stdout.write("Copying files to the browser. It may takes several minutes... ");
    }
}
