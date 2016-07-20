const chokidar = require('chokidar');
const path     = require('path');
const fs       = require('fs-extra');

var syncfolder = {

    start : function(src, dest, handler) {
		var watcher = chokidar.watch(src, { ignored: /[\/\\]\./, persistent: true });
		var is_ready = false;

		watcher
			.on('ready', function() {
				if (fs.existsSync(dest)) {
					fs.removeSync(dest);
				}

				fs.copySync(src, dest);
				handler();

				is_ready = true;
			})
			.on('add', function(file) {
				if (is_ready) {
					fs.copySync(file, path.join(dest, path.relative(src, file)));
					handler();
				}
			})
			.on('addDir', function(dir) {
				if (is_ready) {
					fs.copySync(dir, path.join(dest, path.relative(src, dir)));
					handler();
				}
			})
			.on('change', function(file, stats) {
				if (is_ready) {
					fs.copySync(file, path.join(dest, path.relative(src, file)));
					handler();
				}
			})
			.on('unlink', function(file) {
				if (is_ready) {
					fs.removeSync(path.join(dest, path.relative(src, file)));	
					handler();
				}
			})
			.on('unlinkDir', function(dir) {
				if (is_ready) {
					fs.removeSync(path.join(dest, path.relative(src, dir)));	
					handler();
				}
			});
    }
};

module.exports = syncfolder;
