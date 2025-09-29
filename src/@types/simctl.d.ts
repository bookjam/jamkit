declare module "simctl" {
    interface SimInfo {
        devices: {
            [runtime: string]: DeviceInfo[];
        };
    }

    interface DeviceInfo {
        udid: string;
        name: string;
        state: string;
        isAvailable?: boolean;
    }

    interface SimctlExtensions {
        start(deviceId: string): { code: number; stdout?: string };
    }

    interface SimctlModule {
        extensions: SimctlExtensions;
        list(options?: { silent?: boolean }): SimInfo;
        install(device: string, path: string): { code: number; stdout?: string };
        uninstall(device: string, appId: string): { code: number; stdout?: string };
        launch(waitForDebugger: boolean, device: string, appId: string, options?: any): { code: number; stdout?: string };
        container(device: string, appId: string): string | null;
    }

    const simctl: SimctlModule;
    export = simctl;
}