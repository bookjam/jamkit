const chokidar = require('chokidar'),
      path     = require('path'),
      fs       = require('fs-extra'),
      avdctl   = require('./avdctl')

var __impl = {
    "ios" : {
        sync : function(app_id, src, dest) {
            if (fs.existsSync(dest)) {
                fs.removeSync(dest);
            }

            fs.copySync(src, dest);
        },

        copy : function(app_id, src, dest) {
            fs.copySync(src, dest);
        },
        
        remove : function(app_id, path) {
            fs.removeSync(path);
        }
    },

    "android" : {
        sync : function(app_id, src, dest) {
            var tmproot = '/data/local/tmp/jamkit';

            avdctl.shell('rm -rf ' + tmproot);
            avdctl.push(src, tmproot);
            avdctl.shell('run-as ' + app_id + ' cp -rf ' + tmproot + '/* ' + dest);
        },

        copy : function(app_id, src, dest) {
            var tmproot = '/data/local/tmp/jamkit';
            var tmppath = (tmproot + "/" + src).replace(/\\/g, '/');

            avdctl.push(src, tmppath);
            avdctl.shell('run-as ' + app_id + ' cp -rf ' + tmppath + ' ' + dest);
        },
        
        remove : function(app_id, path) {
            avdctl.shell('run-as ' + app_id + ' rm -rf ' + path.replace(/\\/g, '/'));
        }
    }
}

module.exports = {
    start : function(platform, app_id, src, dest, handler) {
        var watcher = chokidar.watch(src, { ignored: /[\/\\]\./, persistent: true });
        var is_ready = false;
        
        watcher
            .on('ready', function() {
				var target = dest.replace(/\\/g, '/');
                
				__impl[platform].sync(app_id, src, target);
                is_ready = true;

                handler();
            })
            .on('add', function(file) {
                if (is_ready) {
					var target = path.join(dest, path.relative(src, file)).replace(/\\/g, '/');
					
                    __impl[platform].copy(app_id, file, target);

                    handler();
                }
            })
            .on('addDir', function(dir) {
                if (is_ready) {
					var target = path.join(dest, path.relative(src, dir)).replace(/\\/g, '/');

                    __impl[platform].copy(app_id, dir, target);

                    handler();
                }
            })
            .on('change', function(file, stats) {
                if (is_ready) {
					var target = path.join(dest, path.relative(src, file)).replace(/\\/g, '/');

                    __impl[platform].copy(app_id, file, target);

                    handler();
                }
            })
            .on('unlink', function(file) {
                if (is_ready) {
					var target = path.join(dest, path.relative(src, file)).replace(/\\/g, '/');

                    __impl[platform].remove(app_id, target); 

                    handler();
                }
            })
            .on('unlinkDir', function(dir) {
                if (is_ready) {
					var target = path.join(dest, path.relative(src, dir)).replace(/\\/g, '/');

                    __impl[platform].remove(app_id, target); 

                    handler();
                }
            });
    }
};
