import shell from "shelljs";
import { spawn } from "child_process";
import sleep from "./sleep.js";

const getEmulatorPath = (): string => {
    const command = (process.platform === "win32") ? "where emulator" : "which emulator";
    const result = shell.exec(command, { silent: true });

    if (result.code === 0) {
        return result.stdout.trim();
    }

    return "emulator";
};

interface AvdctlModule {
    start(deviceName: string): boolean;
    list(): string[] | null;
    install(path: string): boolean;
    uninstall(appId: string): boolean;
    launch(appId: string): boolean;
    open(url: string): boolean;
    isRunning(appId: string): boolean;
    getVersion(appId: string): string | null;
    forward(src: string, dest: string): boolean;
    push(src: string, dest: string): boolean;
    intent(action: string, url: string): boolean;
    getProperty(name: string): string | null;
    shell(cmd: string): boolean;
}

const avdctl: AvdctlModule = {
    start(deviceName: string): boolean {
        const args = ["-avd", deviceName];
        const subprocess = spawn(getEmulatorPath(), args, {
            detached: true,
            stdio: "ignore"
        });

        subprocess.unref();

        return true;
    },

    list(): string[] | null {
        const command = getEmulatorPath() + " -list-avds";
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return result.stdout.trim().split(/\n/g);
        }

        return null;
    },

    install(path: string): boolean {
        const command = `adb install ${path}`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    uninstall(appId: string): boolean {
        const command = `adb uninstall ${appId}`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    launch(appId: string): boolean {
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

    open(url: string): boolean {
        const command = `adb shell 'am start -a android.intent.action.VIEW -d "${url}"'`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    isRunning(appId: string): boolean {
        const command = `adb shell ps | grep ${appId}`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    getVersion(appId: string): string | null {
        const command = `adb shell 'dumpsys package ${appId} | grep versionName'`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            const matched = result.stdout.match(/versionName=([0-9.]+)/);

            if (matched) {
                return matched[1];
            }
        }

        return null;
    },

    forward(src: string, dest: string): boolean {
        const command = `adb forward ${src} ${dest}`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    push(src: string, dest: string): boolean {
        const command = `adb push '${src}' '${dest}'`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    intent(action: string, url: string): boolean {
        const command = `adb shell am start -a ${action} -d ${url}`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    getProperty(name: string): string | null {
        const command = `adb shell getprop ${name}`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return result.stdout.trim();
        }

        return null;
    },

    shell(cmd: string): boolean {
        const command = `adb shell '${cmd}'`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return true;
        }

        return false;
    }
};

export default avdctl;