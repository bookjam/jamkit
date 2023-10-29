const net   = require("net"),
      utils = require("./utils");

const callbacks = new Array();
var client;

function _connect_to_host(host, port, timeout, callback) {
    const started_time = new Date().getTime();

    client = net.connect({ host:host, port:port }, () => {
         callback();
    });

    client.on("error", (error) => {
        timeout = Math.max(timeout - (new Date().getTime() - started_time), 0);

        if (timeout > 0) {
            setTimeout(() => {
                _connect_to_host(host, port, timeout - 100, callback);
            }, 100);
        } else {
            console.log("ERROR: Failed to establish connection!");
        }
    });

    client.on("close", (error) => {
        console.log("Connection to the app has been closed.");
        process.exit();
    });
};

module.exports = {
    ready: function(host, port, timeout) {
        return new Promise((resolve, reject) => {
            _connect_to_host(host, port, timeout, () => {
                resolve();
            });
        });
    },

    open: function() {
        return new Promise((resolve, reject) => {
            var lines = "";

            callbacks.push(resolve);

            client.on("data", (data) => {
                lines += data.toString("utf-8");

                if (lines.match(/(.|\n)*\$ $/)) {
                    (lines.match(/(.|\n)*\$ ?/g)||[]).forEach((line) => {
                        callbacks.shift()(line.replace("$ ", "").trimEnd());
                    });

                    lines = "";

                    return;
                }

                if (lines.match(/(DEBUG: .*\n)+/)) {
                    (lines.match(/DEBUG: .*\n/g)||[]).forEach((line) => {
                        console.log(line.replace("DEBUG: ", "").trimEnd());
                    });

                    lines = "";

                    return;
                }
            });
        });
    },

    execute: function(command) {
        return new Promise((resolve, reject) => {
            callbacks.push(resolve);

            client.write(command);
            client.write("\r\n");
        });
    },

    close: function() {
        client.end();
    }
}
