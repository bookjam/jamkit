const shell = require('shelljs'),
      child_process = require('child_process'),
      sleep = require('sleep')

module.exports = {
    start : function(device_name) {
        var args = [ '-avd', device_name ];
        var subprocess = child_process.spawn(this.__emulator_path(), args, { 
            detached: true,
            stdio: 'ignore'
        });

        subprocess.unref();

        return true;
    },

    list : function() {
        var command = this.__emulator_path() + ' -list-avds';
        var result = shell.exec(command, { silent:true });

        if (result.code === 0) {
            return result.stdout.trim().split(/\n/g);
        }

        return null;
    },

    launch : function(app_id) {
        var command = 'adb shell am start -n ' + app_id + '/' + app_id + '.SplashActivity';
        var result = shell.exec(command, { silent:true });

        if (result.code === 0) {
            if (!result.stderr) {
                sleep.msleep(1000);
            }

            return true;
        }

        return false;
    },

    forward : function(src, dest) {
        var command = 'adb forward ' + src + ' ' + dest;
        var result = shell.exec(command, { silent:true });

        if (result.code === 0) {
            return true;
        }

        return false;
    }, 

    property : function(name) {
        var command = 'adb shell getprop ' + name;
        var result = shell.exec(command, { silent:true });

        if (result.code === 0) {
            return result.stdout.trim();
        }

        return null;
    },

    push : function(src, dest) {
        var command = 'adb push \"' + src + '\" \"' + dest + '\"';
        var result = shell.exec(command, { silent:true });

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    shell : function(cmd) {
        var command = 'adb shell \"' + cmd + '\"';
        var result = shell.exec(command, { silent:true });

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    __emulator_path : function() {
        var command = 'which emulator';
        var result = shell.exec(command, { silent:true });
        
        if (result.code === 0) {
            return result.stdout.trim();
        }

        return 'emulator';
    }
};
