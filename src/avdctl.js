import shell from "shelljs";
import { spawn } from "child_process";
import sleep from "./sleep.js";

const getEmulatorPath = () => {
    const command = (process.platform === "win32") ? "where emulator" : "which emulator";
    const result = shell.exec(command, { silent: true });
        
    if (result.code === 0) {
        return result.stdout.trim();
    }

    return "emulator";
}

export default {
    start(deviceName) {
        const args = [ "-avd", deviceName ];
        const subprocess = spawn(getEmulatorPath(), args, { 
            detached: true,
            stdio: "ignore"
        });

        subprocess.unref();

        return true;
    },

    list() {
        const command = getEmulatorPath() + " -list-avds";
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return result.stdout.trim().split(/\n/g);
        }

        return null;
    },

    install(path) {
        const command = `adb install ${path}`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    uninstall(appId) {
        const command = `adb uninstall ${appId}`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    launch(appId) {
        const command = `adb shell 'am start -n ${appId}/${appId}.LaunchScreenViewController'`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            if (!result.stderr) {
                sleep(3000);
            }

            return true;
        }

        return false;
    },

    open(url) {
        const command = `adb shell 'am start -a android.intent.action.VIEW -d "${url}"'`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    isRunning(appId) {
        const command = `adb shell ps | grep ${appId}`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return true;
        }

        return false;
    },
 
    getVersion(appId) {
        const command = `adb shell 'dumpsys package ${appId} | grep versionName'`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            var matched = result.stdout.match(/versionName=([0-9.]+)/);

            if (matched) {
                return matched[1];
            }
        }

        return null;
    },

    forward(src, dest) {
        const command = `adb forward ${src} ${dest}`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return true;
        }

        return false;
    }, 

    push(src, dest) {
        const command = `adb push '${src}' '${dest}'`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    intent(action, url) {
        const command = `adb shell am start -a ${action} -d ${url}`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return true;
        }
        
        return false;
    },

    getProperty(name) {
        const command = `adb shell getprop ${name}`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return result.stdout.trim();
        }

        return null;
    },
    
    shell(cmd) {
        const command = `adb shell '${cmd}'`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return true;
        }

        return false;
    }
}
