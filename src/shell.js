import net from "net";

const callbacks = new Array();
let client;

const _connectToHost = (host, port, timeout, callback) => {
    const startedTime = new Date().getTime();

    client = net.connect({ host, port }, () => {
         callback();
    });

    client.on("error", (error) => {
        timeout = Math.max(timeout - (new Date().getTime() - startedTime), 0);

        if (timeout > 0) {
            setTimeout(() => {
                _connectToHost(host, port, timeout - 100, callback);
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

export default {
    ready(host, port, timeout) {
        return new Promise((resolve, reject) => {
            _connectToHost(host, port, timeout, () => {
                resolve();
            });
        });
    },

    open() {
        return new Promise((resolve, reject) => {
            let lines = "";

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

    execute(command) {
        return new Promise((resolve, reject) => {
            callbacks.push(resolve);

            client.write(command);
            client.write("\r\n");
        });
    },

    close() {
        client.end();
    }
}
