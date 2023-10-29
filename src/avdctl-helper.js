const fs     = require("fs"),
      path   = require("path"),
      avdctl = require("./avdctl");

const _sdk_version = parseInt(avdctl.property("ro.build.version.sdk"));

function _walk_dir(root, dir, handler) {
    fs.readdirSync(path.join(root, dir)).forEach((file) => {
        const subpath = path.join(dir, file);
        const stats = fs.statSync(path.join(root, subpath));

        handler(subpath, stats);

        if (stats.isDirectory()) {
            _walk_dir(root, subpath, handler);
        }
    }); 
}

module.exports = {
    push: function(src, dest) {
        const stats = fs.statSync(src);

        if (stats.isDirectory()) {
            avdctl.shell(`mkdir ${dest}`);

            _walk_dir(src, ".", (file, stats) => {
                const subpath = file.replace(/\\/g, "/");

                if (stats.isDirectory()) {
                    avdctl.shell(`mkdir ${dest}/${subpath}`);
                } else {
                    avdctl.push(path.join(src, file), `${dest}/${subpath}`);
                }
            });
        } else {
            avdctl.push(src, dest);
        }
    }, 

    intent: function(action, url) {
        avdctl.intent(action, url);
    },

    shell: function(cmd) {
        avdctl.shell(cmd);
    },

    get_sdk_version: function() {
        return _sdk_version;
    }
}
