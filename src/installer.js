const path   = require('path'),
      fs     = require('fs-extra'),
      avdctl = require('./avdctl-helper')

var _impl = {
    "ios" : {
        install: function(file) {
            
        }
    },

    "android" : {
        install: function(file) {
            var tmproot = '/data/local/tmp/';
            var tmpfile = tmproot + path.basename(file);

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
