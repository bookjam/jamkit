const shell = require('shelljs'),
      child_process = require('child_process'),
      sleep = require('system-sleep');

function _emulator_path() {
    var command = (process.platform === 'win32') ? 'where emulator' : 'which emulator';
    var result = shell.exec(command, { silent: true });
        
    if (result.code === 0) {
        return result.stdout.trim();
    }

    return 'emulator';
}

module.exports = {
    start: function(device_name) {
        var args = [ '-avd', device_name ];
        var subprocess = child_process.spawn(_emulator_path(), args, { 
            detached: true,
            stdio: 'ignore'
        });

        subprocess.unref();

        return true;
    },

    list: function() {
        var command = _emulator_path() + ' -list-avds';
        var result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return result.stdout.trim().split(/\n/g);
        }

        return null;
    },

    install: function(path) {
        var command = 'adb install ' + path;
        var result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    uninstall: function(app_id) {
        var command = 'adb uninstall ' + app_id;
        var result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    launch: function(app_id) {
        var command = 'adb shell am start -n ' + app_id + '/' + app_id + '.SplashActivity';
        var result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            if (!result.stderr) {
                sleep(3000);
            }

            return true;
        }

        return false;
    },

    version: function(app_id) {
        var command = 'adb shell "dumpsys package ' + app_id + ' | grep versionName"';
        var result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            var matched = result.stdout.match(/versionName=([0-9.]+)/);

            if (matched) {
                return matched[1];
            }
        }

        return null;
    },

    forward: function(src, dest) {
        var command = 'adb forward ' + src + ' ' + dest;
        var result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return true;
        }

        return false;
    }, 

    push: function(src, dest) {
        var command = 'adb push \"' + src + '\" \"' + dest + '\"';
        var result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    intent: function(action, url) {
        var command = 'adb shell am start -a ' + action + ' -d ' + url;
        var result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return true;
        }
        
        return false;
    },

    property: function(name) {
        var command = 'adb shell getprop ' + name;
        var result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return result.stdout.trim();
        }

        return null;
    },
    
    shell: function(cmd) {
        var command = 'adb shell \"' + cmd + '\"';
        var result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return true;
        }

        return false;
    }
}
