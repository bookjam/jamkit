import simctl from "simctl";
import shell from "shelljs";

interface SimctlResult {
    code: number;
    stdout?: string;
}

interface SimInfo {
    json: {
        devices: { [runtime: string]: DeviceInfo[] };
    };
}

interface DeviceInfo {
    udid: string;
    state: string;
    name: string;
    isAvailable?: boolean;
}

interface SimctlModule {
    start(device_id: string): boolean;
    list(): SimInfo["json"] | null;
    install(device: string, path: string): boolean;
    uninstall(device: string, appId: string): boolean;
    launch(device: string, appId: string): boolean;
    container(device: string, appId: string): string | null;
}

const simctlModule: SimctlModule = {
    start(device_id: string): boolean {
        const result = simctl.extensions.start(device_id) as SimctlResult;

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    list(): SimInfo["json"] | null {
        const siminfo = simctl.list({ silent: true }) as SimInfo | null;

        if (siminfo) {
            return siminfo.json;
        }

        return null;
    },

    install(device: string, path: string): boolean {
        const result = simctl.install(device, path) as SimctlResult;

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    uninstall(device: string, appId: string): boolean {
        const result = simctl.uninstall(device, appId) as SimctlResult;

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    launch(device: string, appId: string): boolean {
        const result = simctl.launch(false, device, appId, {}) as SimctlResult;

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