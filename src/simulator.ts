import path from "path";
import fs from "fs-extra";
import plist from "simple-plist";
import apk from "adbkit-apkreader";
import { fileURLToPath } from "url";
import simctl from "./simctl.js";
import avdctl from "./avdctl.js";
import sleep from "./sleep.js";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

type Platform = "ios" | "android";

interface DeviceInfo {
    udid: string;
    state: string;
    name: string;
    isAvailable?: boolean;
}

interface InfoPlist {
    CFBundleIdentifier: string;
    CFBundleVersion: string;
}

interface AndroidManifest {
    package: string;
    versionName: string;
}

interface PlatformImplementation {
    start(port?: number): Promise<string>;
    openUrl(url: string): boolean | void;
    _startDevice?(): boolean;
    _launchApp?(handler: (appId?: string) => void): void;
    _findBootedDevice?(): DeviceInfo | null;
    _findAvailableDevice?(): DeviceInfo | string | null;
    _readInfoPlist?(appPath: string): Promise<InfoPlist>;
    _waitUntilDeviceBooted?(): boolean;
    _forwardPort?(port: number): boolean;
    _readManifest?(appPath: string): Promise<AndroidManifest>;
}

const _impl: Record<Platform, PlatformImplementation> = {
    "ios": {
        start: function(): Promise<string> {
            return new Promise((resolve, reject) => {
                if (this._startDevice()) {
                    this._launchApp((appId: string | undefined) => {
                        if (appId) {
                            resolve(appId);
                        } else {
                            reject(new Error("Failed to launch app"));
                        }
                    });
                } else {
                    reject(new Error("Failed to start device"));
                }
            });
        },

        openUrl: function(url: string): void {
            // iOS URL opening implementation
        },

        _startDevice: function(): boolean {
            let device = this._findBootedDevice();

            if (device === null) {
                device = this._findAvailableDevice() as any;

                if (device) {
                    process.stdout.write("Starting an simulator... ");

                    simctl.start(device.udid);

                    if (this._waitUntilDeviceBooted()) {
                        console.log("Done");

                        return true;
                    }
                }
            } else {
                return true;
            }

            return false;
        },

        _launchApp: function(handler: (appId?: string) => void): void {
            const appPath = path.resolve(moduleDir, "..", "browsers", "jamkit.app");

            this._readInfoPlist!(appPath)
                .then((info: InfoPlist) => {
                    const appId = info.CFBundleIdentifier;
                    const appVersion = info.CFBundleVersion;
                    let container = simctl.container("booted", appId);

                    if (container) {
                        return this._readInfoPlist!(container)
                            .then((info: InfoPlist) => {
                                const installedVersion = info.CFBundleVersion;

                                if (installedVersion !== appVersion) {
                                    simctl.uninstall("booted", appId);
                                    container = null;
                                }

                                return [appId, container] as const;
                            });
                    } else {
                        return [appId] as const;
                    }
                })
                .then(([appId, container]: readonly [string, string | null]) => {
                    if (!container || !fs.existsSync(container)) {
                        simctl.install("booted", appPath);
                    }

                    if (simctl.launch("booted", appId)) {
                        console.log("Done");

                        handler(appId);
                    } else {
                        handler();
                    }
                })
                .catch((error: Error) => {
                    handler();
                });

            process.stdout.write("Launching the browser... ");
        },

        _findBootedDevice: function(): DeviceInfo | null {
            const siminfo = simctl.list();
            let device: DeviceInfo | null = null;

            const devices = Object.keys(siminfo?.devices || {}).reduce<DeviceInfo[]>((devices, runtime) => {
                if (runtime.includes("SimRuntime.iOS")) {
                    siminfo!.devices[runtime].forEach((devinfo: DeviceInfo) => {
                        devices.push(devinfo);
                    });
                }
                return devices;
            }, []);

            devices.every((devinfo) => {
                if (devinfo.state === "Booted") {
                    device = devinfo;
                    return false;
                }
                return true;
            });

            return device;
        },

        _findAvailableDevice: function(): DeviceInfo | null {
            const siminfo = simctl.list();
            let device: DeviceInfo | null = null;

            const runtimes = Object.keys(siminfo?.devices || {}).filter((runtime) => {
                if (runtime.includes("SimRuntime.iOS")) {
                    return true;
                }
                return false;
            }).sort((runtime1, runtime2) => {
                return runtime2.localeCompare(runtime1);
            });

            if (runtimes.length > 0 && siminfo) {
                siminfo.devices[runtimes[0]].every((devinfo: DeviceInfo) => {
                    if (devinfo.isAvailable && devinfo.name.includes("iPhone")) {
                        device = devinfo;
                        return false;
                    }
                    return true;
                });
            }

            return device;
        },

        _readInfoPlist: function(appPath: string): Promise<InfoPlist> {
            return new Promise((resolve, reject) => {
                try {
                    const info = plist.readFileSync(path.resolve(appPath, "Info.plist")) as InfoPlist;

                    if (info.CFBundleIdentifier) {
                        resolve(info);
                    } else {
                        reject(new Error("Missing CFBundleIdentifier"));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        },

        _waitUntilDeviceBooted: function(): boolean {
            sleep(3000);

            return true;
        }
    },

    "android": {
        start: function(port?: number): Promise<string> {
            return new Promise((resolve, reject) => {
                if (this._startDevice() && this._forwardPort(port || 8888)) {
                    this._launchApp((appId: string | undefined) => {
                        if (appId) {
                            resolve(appId);
                        } else {
                            reject(new Error("Failed to launch app"));
                        }
                    });
                } else {
                    reject(new Error("Failed to start device or forward port"));
                }
            });
        },

        openUrl: function(url: string): boolean {
            if (avdctl.open(url)) {
                return true;
            }

            return false;
        },

        _startDevice: function(): boolean {
            if (!avdctl.getProperty("sys.boot_completed")) {
                const device = this._findAvailableDevice();

                if (device) {
                    process.stdout.write("Starting an emulator... ");

                    if (avdctl.start(device)) {
                        if (this._waitUntilDeviceBooted()) {
                            console.log("Done");

                            return true;
                        }
                    }
                }
            } else {
                return true;
            }

            return false;
        },

        _forwardPort: function(port: number): boolean {
            if (avdctl.forward("tcp:" + port, "tcp:" + port)) {
                return true;
            }

            return false;
        },

        _launchApp: function(handler: (appId?: string) => void): void {
            const appPath = path.resolve(moduleDir, "..", "browsers", "jamkit.apk");

            this._readManifest!(appPath)
                .then((manifest: AndroidManifest) => {
                    const appId = manifest.package;
                    const appVersion = manifest.versionName;
                    const installedVersion = avdctl.getVersion(appId);

                    if (!installedVersion || installedVersion !== appVersion) {
                        if (installedVersion) {
                            avdctl.uninstall(appId);
                        }

                        avdctl.install(appPath);
                    }

                    if (avdctl.isRunning(appId) || avdctl.launch(appId)) {
                        console.log("Done");

                        handler(appId);
                    } else {
                        handler();
                    }
                })
                .catch((error: Error) => {
                    handler();
                });

            process.stdout.write("Launching the browser... ");
        },

        _findAvailableDevice: function(): string | null {
            const devices = avdctl.list();

            if (devices && devices.length > 0) {
                return devices[0];
            }

            return null;
        },

        _readManifest: function(appPath: string): Promise<AndroidManifest> {
            return apk.open(appPath)
                .then((reader: any) => {
                    return reader.readManifest();
                });
        },

        _waitUntilDeviceBooted: function(): boolean {
            let timeout = 10000;
            const interval = 200;

            while (!avdctl.getProperty("sys.boot_completed")) {
                sleep(interval);

                if (timeout < interval) {
                    return false;
                }

                timeout = timeout - interval;
            }

            return true;
        }
    }
};

interface SimulatorModule {
    start(platform: Platform, port?: number): Promise<string>;
    openUrl(platform: Platform, url: string): boolean | void;
}

const simulator: SimulatorModule = {
    start(platform: Platform, port?: number): Promise<string> {
        return _impl[platform].start(port);
    },

    openUrl(platform: Platform, url: string): boolean | void {
        return _impl[platform].openUrl(url);
    }
};

export default simulator;