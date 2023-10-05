const simctl = require("simctl"),
      shell  = require("shelljs"),
      sleep  = require("./sleep");

module.exports = {
    start: (device_id) => {
        const result = simctl.extensions.start(device_id);

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    list: () => {
        const siminfo = simctl.list({ silent: true });

        if (siminfo) {
            return siminfo.json;
        }

        return null;
    },

    install: (device, path) => {
        const result = simctl.install(device, path);

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    uninstall: (device, app_id) => {
        const result = simctl.uninstall(device, app_id);

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    launch: (device, app_id) => {
        const result = simctl.launch(false, device, app_id, {});

        if (result.code === 0) {
            return true;
        }

        return false;
    },

    container: (device, app_id) => {
        const command = `xcrun simctl get_app_container ${device} ${app_id}`;
        const result = shell.exec(command, { silent: true });

        if (result.code === 0) {
            return result.stdout.trim();
        }

        return null;
    }
}
