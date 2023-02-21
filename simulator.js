const path   = require('path'),
      fs     = require('fs-extra'),
      plist  = require('simple-plist'),
      apk    = require('adbkit-apkreader'),
      simctl = require('./simctl'),
      avdctl = require('./avdctl'),
      sleep  = require('./sleep')

const _impl = {
    "ios": {
        start: function() {
            var self = this;

            return new Promise(function(resolve, reject) {
                if (self._start_device()) {
                    self._launch_app(function(app_id) {
                        if (app_id) {
                            resolve(app_id);
                        } else {
                            reject();
                        }
                    });
                } else {
                    reject();
                }
            });
        },

        _start_device: function() {
            var device = this._find_booted_device();

            if (device === null) {
                device = this._find_available_device();
        
                if (device) {
                    process.stdout.write("Starting an simulator... ");

                    simctl.start(device.udid);
                    
                    if (this._wait_until_device_booted()) {
                        console.log("Done");
                        
                        return true;
                    }
                }
            } else {
                return true;
            }

            return false;
        },

        _launch_app: function(handler) {
            var app_path = path.resolve(__dirname, 'jamkit.app');
            var self = this;

            this._read_info_plist(app_path)
                .then(function(info) {
                    var app_id = info.CFBundleIdentifier;
                    var app_version = info.CFBundleVersion;
                    var container = simctl.container('booted', app_id);
                    
                    if (container) {
                        return self._read_info_plist(container)
                            .then(function(info) {
                                var installed_version = info.CFBundleVersion;
                                
                                if (installed_version !== app_version) {
                                    simctl.uninstall('booted', app_id);
                                    container = null;
                                }

                                return Promise.resolve([ app_id, container ]);
                            });
                    } else {
                        return Promise.resolve([ app_id ]);
                    }
                })
                .then(function([ app_id, container ]) {
                    if (!container || !fs.existsSync(container)) {
                        simctl.install('booted', app_path);
                    }

                    if (simctl.launch('booted', app_id)) {
                        console.log("Done");
    
                        handler(app_id);
                    } else {
                        handler();
                    }
                })
                .catch(function() {
                    handler();
                });

            process.stdout.write("Launching the browser... ");
        },

        _find_booted_device: function() {
            var siminfo = simctl.list();
            var device = null;

            var devices = Object.keys(siminfo.devices).reduce(function(devices, runtime) {
                if (runtime.includes('SimRuntime.iOS')) {
                    siminfo.devices[runtime].forEach(function(devinfo) {
                        devices.push(devinfo);
                    });
                }
                return devices;
            }, []);

            devices.every(function(devinfo) {
                if (devinfo.state === 'Booted') {
                    device = devinfo;
                    return false;
                }
                return true;
            });

            return device;
        },

        _find_available_device: function() {
            var siminfo = simctl.list();
            var device = null;

            var runtimes = Object.keys(siminfo.devices).filter(function(runtime) {
                if (runtime.includes('SimRuntime.iOS')) {
                    return true;
                }
                return false;
            }).sort(function(runtime1, runtime2) {
                return runtime2.localeCompare(runtime1);
            });

            siminfo.devices[runtimes[0]].every(function(devinfo) {
                if (devinfo.isAvailable && devinfo.name.includes('iPhone')) {
                    device = devinfo;
                    return true;
                }
                return true;
            });

            return device;
        },

        _read_info_plist: function(app_path) {
            return new Promise(function(resolve, reject) {
                var info = plist.readFileSync(path.resolve(app_path, 'Info.plist'));

                if (info.CFBundleIdentifier) {
                    resolve(info);
                } else {
                    reject();
                }
            });
        },

        _wait_until_device_booted: function() {
            sleep(3000);

            return true;
        }
    },

    "android": {
        start: function(port) {
            var self = this;

            return new Promise(function(resolve, reject) {
                if (self._start_device() && self._forward_port(port)) {
                    self._launch_app(function(app_id) {
                        if (app_id) {
                            resolve(app_id);
                        } else {
                            reject();
                        }
                    });
                } else {
                    reject();
                }
            });
        },

        _start_device: function() {
            if (!avdctl.property('sys.boot_completed')) {
                var device = this._find_available_device();

                if (device) {
                    process.stdout.write("Starting an emulator... ");
                    
                    if (avdctl.start(device)) {
                        if (this._wait_until_device_booted()) {
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

        _forward_port: function(port) {
            if (avdctl.forward("tcp:" + port, "tcp:" + port)) {
                return true;
            }

            return false;
        },

        _launch_app: function(handler) {
            var app_path = path.resolve(__dirname, 'jamkit.apk');

            this._read_manifest(app_path)
                .then(function(manifest) {
                    var app_id = manifest['package'];
                    var app_version = manifest['versionName'];
                    var installed_version = avdctl.version(app_id);

                    if (!installed_version || installed_version != app_version) {
                        if (installed_version) {
                            avdctl.uninstall(app_id);
                        }
                    
                        avdctl.install(app_path);
                    }

                    if (avdctl.launch(app_id)) {
                        console.log("Done");

                        handler(app_id);
                    } else {
                        handler();
                    }
                })
                .catch(function() {
                    handler();
                });

            process.stdout.write("Launching the browser... ");
        }, 

        _find_available_device: function() {
            var devices = avdctl.list();

            if (devices) {
                return devices[0];
            }

            return null;
        }, 

        _read_manifest: function(app_path) {
            return apk.open(app_path)
                .then(function(reader) {
                    return reader.readManifest();
                });
        },

        _wait_until_device_booted: function() {
            var timeout = 3000, interval = 200;

            while (!avdctl.property('sys.boot_completed')) {
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

module.exports = {
    start: function(platform, port) {
        return _impl[platform].start(port);
    }
}
