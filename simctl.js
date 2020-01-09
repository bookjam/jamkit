const simctl = require('simctl'),
      shell  = require('shelljs')

module.exports = {
    start : function(device_id) {
        var result = simctl.extensions.start(device_id);

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    list : function() {
        var siminfo = simctl.list({ silent:true });

        if (siminfo) {
            return siminfo.json;
        }

        return null;
    },

    install : function(device, path) {
        var result = simctl.install(device, path);

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    uninstall : function(device, app_id) {
        var result = simctl.uninstall(device, app_id);

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    launch : function(device, app_id) {
        var result = simctl.launch(false, device, app_id, {});

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    container : function(device, app_id) {
        var command = 'xcrun simctl get_app_container ' + device + ' ' + app_id;
        var result = shell.exec(command, { silent:true });

        if (result.code === 0) {
            return result.stdout.trim();
        }

        return null;
    }
};
