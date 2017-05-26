const simctl = require('simctl'),
      shell  = require('shelljs'),
      path   = require('path')

var simulator = {

    start : function() {
        var device = this.findBootedDevice();
 
        if (device === null) {
            device = this.findAvailableDevice();
            
            if (device === null) {
                this.createAvailableDevice('iPhone');
                this.createAvailableDevice('iPad');

                device = this.findAvailableDevice();
            }    
        
            simctl.extensions.start(device.id);
        }
    },

    install : function(path) {
        simctl.install('booted', path);
    },

    uninstall : function(app_id) {
        simctl.install('booted', app_id);
    },

    launch : function(app_id) {
        simctl.launch(false, 'booted', app_id, {});
    },

    createAvailableDevice : function(type) {
        var siminfo = simctl.list({ silent:true });

        var devtypes = siminfo.json.devicetypes.filter(function(devtype) {
            if (devtype.name.startsWith(type)) {
                return true;
            }
            return false;
        }).sort(function(devtype1, devtype2) {
            var version1 = parseFloat(devtype1.name.replace(type, ''));
            var version2 = parseFloat(devtype2.name.replace(type, ''));
            
            return version2 - version1;
        });

        var runtimes = siminfo.json.runtimes.filter(function(runtime) {
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

    findBootedDevice : function() {
        var siminfo = simctl.list({ silent:true });
        var device = null;

        var devices = siminfo.json.devices.filter(function(devinfo) {
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

    findAvailableDevice : function() {
        var siminfo = simctl.list({ silent:true });
        var device = null;

        var runtimes = siminfo.json.devices.filter(function(devinfo) {
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
    },

    getAppContainer : function(app_id) {
        var command = 'xcrun simctl get_app_container booted ' + app_id;
        var result = shell.exec(command, { silent:true });

        if (result.code === 0) {
            return result.stdout.trim();
        }

        return null;
    }
};

module.exports = simulator;

