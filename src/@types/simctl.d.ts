declare module "simctl" {
    export interface SimctlResult {
        code: number;
        stdout?: string;
    }

    export interface SimulatorInfo {
        devices: {
            [runtime: string]: DeviceInfo[];
        };
    }

    export interface DeviceInfo {
        udid: string;
        name: string;
        state: string;
        isAvailable?: boolean;
    }

    interface SimctlExtensions {
        start(deviceId: string): SimctlResult;
    }

    interface SimctlModule {
        extensions: SimctlExtensions;
        list(options?: { silent?: boolean }): { json: SimulatorInfo } | null;
        install(device: string, path: string): SimctlResult;
        uninstall(device: string, appId: string): SimctlResult;
        launch(waitForDebugger: boolean, device: string, appId: string, options?: any): SimctlResult;
        container(device: string, appId: string): string | null;
    }

    const simctl: SimctlModule;
    export = simctl;
}