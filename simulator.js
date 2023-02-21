const simctl = require('./simctl'),
      avdctl = require('./avdctl'),
      shell  = require('./shell'),
      path   = require('path'),
      fs     = require('fs-extra'),
      plist  = require('simple-plist'),
      apk    = require('adbkit-apkreader'),
      sleep  = require('system-sleep')

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
            
                if (device === null) {
                    this._create_available_device('iPhone');
                    this._create_available_device('iPad');

                    device = this._find_available_device();
                }    
        
                if (device && device.id) {
                    simctl.start(device.id);
                }
            }

            return device;
        },

        _launch_app: function(handler) {
            var app_path = path.resolve(__dirname, 'jamkit.app');
            var app_info = plist.readFileSync(path.resolve(app_path, 'Info.plist'))
            var app_id = app_info.CFBundleIdentifier;
            var app_version = app_info.CFBundleVersion;
            var container = simctl.container('booted', app_id);

            if (container != null && fs.existsSync(container)) {
                var installed_info = plist.readFileSync(path.resolve(container, 'Info.plist'));
                var installed_version = installed_info.CFBundleVersion;

                if (installed_version !== app_version) {
                    simctl.uninstall('booted', app_id);
                    container = null;
                }
            }

            if (container == null || !fs.existsSync(container)) {
                simctl.install('booted', app_path);
            }

            if (simctl.launch('booted', app_id)) {
                handler(app_id);
            } else {
                handler();
            }
        },

        _create_available_device: function(type) {
            var siminfo = simctl.list();

            var devtypes = siminfo.devicetypes.filter(function(devtype) {
                if (devtype.name.startsWith(type)) {
                    return true;
                }
                return false;
            }).sort(function(devtype1, devtype2) {
                var version1 = parseFloat(devtype1.name.replace(type, ''));
                var version2 = parseFloat(devtype2.name.replace(type, ''));
            
                return version2 - version1;
            });

            var runtimes = siminfo.runtimes.filter(function(runtime) {
                if (runtime.name.startsWith('iOS')) {
                    return true;
                }
                return false;
            }).sort(function(runtime1, runtime2) {
                var version1 = parseFloat(runtime1.name.replace('iOS', ''));
                var version2 = parseFloat(runtime2.name.replace('iOS', ''));

                return version2 - version1;
            });

            if (devtypes.length > 0 && runtimes.length > 0) {
                simctl.create('Simulator for jamkit - ' + type, devtypes[0].id, runtimes[0].id);
            }
        },

        _find_booted_device: function() {
            var siminfo = simctl.list();
            var device = null;

            var devices = siminfo.devices.filter(function(devinfo) {
                if (devinfo.runtime.startsWith('iOS')) {
                    return true;
                }
                return false;
            });

            devices.every(function(devinfo, index) {
                devinfo.devices.every(function(candidate, index) {
                    if (candidate.state === 'Booted') {
                        device = candidate;
                        return false;
                    }
                    return true;
                });
                return (device != null) ? false : true;
            });

            return device;
        },

        _find_available_device: function() {
            var siminfo = simctl.list();
            var device = null;

            var runtimes = siminfo.devices.filter(function(devinfo) {
                if (devinfo.runtime.startsWith('iOS')) {
                    return true;
                }
                return false;
            }).sort(function(devinfo1, devinfo2) {
                var version1 = parseFloat(devinfo1.runtime.replace('iOS', ''));
                var version2 = parseFloat(devinfo2.runtime.replace('iOS', ''));

                return version2 - version1;
            });

            runtimes[0].devices.every(function(candidate, index) {
                if (candidate.available && candidate.name.indexOf('iPhone') != -1) {
                    if (device != null) {
                        var candidate_version = parseFloat(candidate.name.replace('iPhone', ''));
                        var device_version = parseFloat(device.name.replace('iPhone', ''));

                        if (candidate_version > device_version) {
                            device = candidate;
                        }
                    } else {
                        device = candidate;
                    }
                }
                return true;
            });

            return device;
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
            return new Promise(function(resolve, reject) {
                apk.open(app_path)
                    .then(function(reader) {
                        return reader.readManifest();
                    })
                    .then(function(manifest) {
                        resolve(manifest);
                    })
                    .catch(function() {
                        reject();
                    });       
            });
        },

        _wait_until_device_booted: function() {
            var timeout = 3000, sleeptime = 200;

            while (!avdctl.property('sys.boot_completed')) {
                sleep(sleeptime);

                if (timeout < sleeptime) {
                    return false;
                }

                timeout = timeout - sleeptime;
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
