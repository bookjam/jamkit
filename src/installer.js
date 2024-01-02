const path   = require("path"),
      avdctl = require("./avdctl-helper");

const _impl = {
    "ios" : {
        install: function(file) {
            
        }
    },

    "android" : {
        install: function(file) {
            const tmproot = '/data/local/tmp/';
            const tmpfile = tmproot + path.basename(file);

            avdctl.shell('rm -f ' + tmpfile);
            avdctl.push(file, tmproot);
            avdctl.intent('android.intent.action.VIEW', 'file://' + tmpfile);
        }
    }
}

module.exports = {
    install: function(platform, file) {
        _impl[platform].install(file);
    }
}
