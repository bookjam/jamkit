const fs     = require('fs'),
      path   = require('path'),
      avdctl = require('./avdctl')

function _walk_dir(root, dir, handler) {
    fs.readdirSync(path.join(root, dir)).forEach(function(file) {
        var subpath = path.join(dir, file);
        var stats = fs.statSync(path.join(root, subpath));

        handler(subpath, stats);

        if (stats.isDirectory()) {
            _walk_dir(root, subpath, handler);
        }
    }); 
}

module.exports = {
    push : function(src, dest) {
        var stats = fs.statSync(src);

        if (stats.isDirectory()) {
            avdctl.shell("mkdir " + dest);

            _walk_dir(src, ".", function(file, stats) {
                var subpath = file.replace(/\\/g, '/');

                if (stats.isDirectory()) {
                    avdctl.shell("mkdir " + dest + "/" + subpath);
                } else {
                    avdctl.push(path.join(src, file), dest + "/" + subpath);
                }
            });
        } else {
            avdctl.push(src, dest);
        }
    }, 

    shell : function(cmd) {
        avdctl.shell(cmd);
    }
}
