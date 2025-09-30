import simctlLib from "simctl";
import shell from "shelljs";
import type { SimulatorInfo } from "simctl";

interface SimctlModule {
    start(deviceId: string): boolean;
    list(): SimulatorInfo | null;
    install(device: string, path: string): boolean;
    uninstall(device: string, appId: string): boolean;
    launch(device: string, appId: string): boolean;
    container(device: string, appId: string): string | null;
    openUrl(device: string, url: string): boolean;
}

const simctl: SimctlModule = {
    start(deviceId: string): boolean {
        const result = simctlLib.extensions.start(deviceId);

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    list(): SimulatorInfo | null {
        const siminfo = simctlLib.list({ silent: true });

        if (siminfo) {
            return siminfo.json;
        }

        return null;
    },

    install(device: string, path: string): boolean {
        const result = simctlLib.install(device, path);

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    uninstall(device: string, appId: string): boolean {
        const result = simctlLib.uninstall(device, appId);

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    launch(device: string, appId: string): boolean {
        const command = `xcrun simctl launch "${device}" "${appId}"`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    container(device: string, appId: string): string | null {
        const command = `xcrun simctl get_app_container ${device} ${appId}`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return result.stdout.trim();
        }

        return null;
    },

    openUrl(device: string, url: string): boolean {
        const command = `xcrun simctl openurl "${device}" "${url}"`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return true;
        }

        return false;
    }
};

export default simctl;