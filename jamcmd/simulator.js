const simctl = require('simctl'),
	  shell  = require('shelljs'),
	  path   = require('path')

var simulator = {

    start : function() {
		var device_id = this.findBootedDevice();

		if (device_id === null) {
			device_id = this.findAvailableDevice();
			
			if (device_id === null) {
				this.createAvailableDevice('iPhone');
				this.createAvailableDevice('iPad');

				device_id = this.findAvailableDevice();
			}	

			simctl.boot(device_id);
		}

		simctl.extensions.start(device_id);
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
			r = simctl.create('Simulator for jamkit', devtypes[0].id, runtimes[0].id);
			console.log(r);
		}
	},

	findBootedDevice : function() {
        var siminfo = simctl.list({ silent:true });
        var device_id = null;

        var devices = siminfo.json.devices.filter(function(devinfo) {
            return (devinfo.runtime.lastIndexOf('iOS', 0) === 0);
        });

        devices.every(function(devinfo, index) {
            devinfo.devices.every(function(device, index) {
                if (device.state === 'Booted') {
                    device_id = device.id;
                    return true;
                }
                return false;
            });
            return (device_id != null) ? false : true;
        });

		return device_id;
	},

	findAvailableDevice : function() {
        var siminfo = simctl.list({ silent:true });
        var device_id = null;

        var devices = siminfo.json.devices.filter(function(devinfo) {
            return (devinfo.runtime.lastIndexOf('iOS', 0) === 0);
        }).sort(function(devinfo1, devinfo2) {
            return devinfo2.runtime.localeCompare(devinfo1.runtime);
        });

        devices.every(function(devinfo, index) {
            devinfo.devices.every(function(device, index) {
                if (device.available) {
                    device_id = device.id;
                    return true;
                }
                return false;
            });
            return (device_id != null) ? false : true;
        });

		return device_id;
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

