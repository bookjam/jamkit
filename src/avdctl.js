const shell         = require("shelljs"),
      child_process = require("child_process"),
      sleep         = require("./sleep");

function _emulator_path() {
    const command = (process.platform === "win32") ? "where emulator" : "which emulator";
    const result = shell.exec(command, { silent: true });
        
    if (result.code === 0) {
        return result.stdout.trim();
    }

    return "emulator";
}

module.exports = {
    start: (device_name) => {
        const args = [ "-avd", device_name ];
        const subprocess = child_process.spawn(_emulator_path(), args, { 
            detached: true,
            stdio: "ignore"
        });

        subprocess.unref();

        return true;
    },

    list: () => {
        const command = _emulator_path() + " -list-avds";
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return result.stdout.trim().split(/\n/g);
        }

        return null;
    },

    install: (path) => {
        const command = `adb install ${path}`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    uninstall: (app_id) => {
        const command = `adb uninstall ${app_id}`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    launch: (app_id) => {
        const command = `adb shell am start -n ${app_id}/${app_id}.LaunchScreenViewController`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            if (!result.stderr) {
                sleep(3000);
            }

            return true;
        }

        return false;
    },

    running: (app_id) => {
        const command = `adb shell ps | grep ${app_id}`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return true;
        }

        return false;
    },
 
    version: (app_id) => {
        const command = `adb shell 'dumpsys package ${app_id} | grep versionName'`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            var matched = result.stdout.match(/versionName=([0-9.]+)/);

            if (matched) {
                return matched[1];
            }
        }

        return null;
    },

    forward: (src, dest) => {
        const command = `adb forward ${src} ${dest}`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return true;
        }

        return false;
    }, 

    push: (src, dest) => {
        const command = `adb push '${src}' '${dest}'`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    intent: (action, url) => {
        const command = `adb shell am start -a ${action} -d ${url}`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return true;
        }
        
        return false;
    },

    property: (name) => {
        const command = `adb shell getprop ${name}`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return result.stdout.trim();
        }

        return null;
    },
    
    shell: (cmd) => {
        const command = `adb shell '${cmd}'`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return true;
        }

        return false;
    }
}
