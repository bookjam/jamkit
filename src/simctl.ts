import simctl from "simctl";
import shell from "shelljs";
import type { SimInfo as SimctlSimInfo } from "simctl";

interface SimctlModule {
    start(deviceId: string): boolean;
    list(): SimctlSimInfo | null;
    install(device: string, path: string): boolean;
    uninstall(device: string, appId: string): boolean;
    launch(device: string, appId: string): boolean;
    container(device: string, appId: string): string | null;
}

const simctlModule: SimctlModule = {
    start(deviceId: string): boolean {
        const result = simctl.extensions.start(deviceId);

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    list(): SimctlSimInfo | null {
        const siminfo = simctl.list({ silent: true });

        if (siminfo) {
            return siminfo.json;
        }

        return null;
    },

    install(device: string, path: string): boolean {
        const result = simctl.install(device, path);

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    uninstall(device: string, appId: string): boolean {
        const result = simctl.uninstall(device, appId);

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
    }
};

export default simctlModule;