import path from "path";
import fs from "fs-extra";
import plist from "simple-plist";
import apk from "adbkit-apkreader";
import simctl from "./simctl.js";
import avdctl from "./avdctl.js";
import sleep from "./sleep.js";

const _impl = {
    "ios": {
        start: function() {
            return new Promise((resolve, reject) => {
                if (this._startDevice()) {
                    this._launchApp((appId) => {
                        if (appId) {
                            resolve(appId);
                        } else {
                            reject();
                        }
                    });
                } else {
                    reject();
                }
            });
        },

        openUrl: function(url) {

        },

        _startDevice: function() {
            let device = this._findBootedDevice();

            if (device === null) {
                device = this._findAvailableDevice();
        
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

        _launchApp: function(handler) {
            const appPath = path.resolve(__dirname, "..", "browsers", "jamkit.app");

            this._readInfoPlist(appPath)
                .then((info) => {
                    const appId = info.CFBundleIdentifier;
                    const appVersion = info.CFBundleVersion;
                    const container = simctl.container("booted", appId);
                    
                    if (container) {
                        return this._readInfoPlist(container)
                            .then((info) => {
                                const installedVersion = info.CFBundleVersion;
                                
                                if (installedVersion !== appVersion) {
                                    simctl.uninstall("booted", appId);
                                    container = null;
                                }

                                return [ appId, container ];
                            });
                    } else {
                        return [ appId ];
                    }
                })
                .then(([ appId, container ]) => {
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
                .catch((error) => {
                    handler();
                });

            process.stdout.write("Launching the browser... ");
        },

        _findBootedDevice: function() {
            const siminfo = simctl.list();
            let device = null;

            const devices = Object.keys(siminfo.devices).reduce((devices, runtime) => {
                if (runtime.includes("SimRuntime.iOS")) {
                    siminfo.devices[runtime].forEach((devinfo) => {
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

        _findAvailableDevice: function() {
            const siminfo = simctl.list();
            let device = null;

            const runtimes = Object.keys(siminfo.devices).filter((runtime) => {
                if (runtime.includes("SimRuntime.iOS")) {
                    return true;
                }
                return false;
            }).sort((runtime1, runtime2) => {
                return runtime2.localeCompare(runtime1);
            });

            siminfo.devices[runtimes[0]].every((devinfo) => {
                if (devinfo.isAvailable && devinfo.name.includes("iPhone")) {
                    device = devinfo;
                    return true;
                }
                return true;
            });

            return device;
        },

        _readInfoPlist: function(appPath) {
            return new Promise((resolve, reject) => {
                const info = plist.readFileSync(path.resolve(appPath, "Info.plist"));

                if (info.CFBundleIdentifier) {
                    resolve(info);
                } else {
                    reject();
                }
            });
        },

        _waitUntilDeviceBooted: function() {
            sleep(3000);

            return true;
        }
    },

    "android": {
        start: function(port) {
            return new Promise((resolve, reject) => {
                if (this._startDevice() && this._forwardPort(port)) {
                    this._launchApp((appId) => {
                        if (appId) {
                            resolve(appId);
                        } else {
                            reject();
                        }
                    });
                } else {
                    reject();
                }
            });
        },

        openUrl: function(url) {
            if (avdctl.open(url)) {
                return true;
            }

            return false;
        },

        _startDevice: function() {
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

        _forwardPort: function(port) {
            if (avdctl.forward("tcp:" + port, "tcp:" + port)) {
                return true;
            }

            return false;
        },

        _launchApp: function(handler) {
            const appPath = path.resolve(__dirname, "..", "browsers", "jamkit.apk");

            this._readManifest(appPath)
                .then((manifest) => {
                    const appId = manifest["package"];
                    const appVersion = manifest["versionName"];
                    const installedVersion = avdctl.getVersion(appId);

                    if (!installedVersion || installedVersion != appVersion) {
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
                .catch((error) => {
                    handler();
                });

            process.stdout.write("Launching the browser... ");
        }, 

        _findAvailableDevice: function() {
            const devices = avdctl.list();

            if (devices) {
                return devices[0];
            }

            return null;
        }, 

        _readManifest: function(appPath) {
            return apk.open(appPath)
                .then((reader) => {
                    return reader.readManifest();
                });
        },

        _waitUntilDeviceBooted: function() {
            const timeout = 10000, interval = 200;

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

export default {
    start(platform, port) {
        return _impl[platform].start(port);
    },

    openUrl(platform, url) {
        return _impl[platform].openUrl(url);
    }
}
