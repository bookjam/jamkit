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
            return (devtype.name.lastIndexOf(type, 0) === 0);
        }).sort(function(devtype1, devtype2) {
            return devtype2.name.localeCompare(devtype1.name);
        });

        var runtimes = siminfo.json.runtimes.filter(function(runtime) {
            return (runtime.name.lastIndexOf('iOS', 0) === 0);
        }).sort(function(runtime1, runtime2) {
            return runtime2.name.localeCompare(runtime1.name);
        });

        if (devtypes.length > 0 && runtimes.length > 0) {
            simctl.create('Simulator for jamkit - ' + type, devtypes[0].id, runtimes[0].id);
        }
    },

    findBootedDevice : function() {
        var siminfo = simctl.list({ silent:true });
        var device = null;

        var devices = siminfo.json.devices.filter(function(devinfo) {
            return (devinfo.runtime.lastIndexOf('iOS', 0) === 0);
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

        var devices = siminfo.json.devices.filter(function(devinfo) {
            return (devinfo.runtime.lastIndexOf('iOS', 0) === 0);
        }).sort(function(devinfo1, devinfo2) {
            if (devinfo1.runtime == devinfo2.runtime) {
                return devinfo1.name.localeCompare(devinfo2.name);
            }
            return devinfo2.runtime.localeCompare(devinfo1.runtime);
        });

        devices.every(function(devinfo, index) {
            devinfo.devices.every(function(candidate, index) {
                if (candidate.available) {
                    device = candidate;
                    return false;
                }
                return true;
            });
            return (device != null) ? false : true;
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

