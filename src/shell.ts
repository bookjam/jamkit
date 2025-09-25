import net from "net";

type ShellCallback = (data: string) => void;

const callbacks: ShellCallback[] = [];
let client: net.Socket | undefined;

const _connectToHost = (host: string, port: number, timeout: number, callback: () => void): void => {
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

interface ShellModule {
    ready(host: string, port: number, timeout: number): Promise<void>;
    open(): Promise<string>;
    execute(command: string): Promise<string>;
    close(): void;
}

const shell: ShellModule = {
    ready(host: string, port: number, timeout: number): Promise<void> {
        return new Promise((resolve, reject) => {
            _connectToHost(host, port, timeout, () => {
                resolve();
            });
        });
    },

    open(): Promise<string> {
        return new Promise((resolve, reject) => {
            let lines = "";

            callbacks.push(resolve);

            if (!client) {
                reject(new Error("Client not connected"));
                return;
            }

            client.on("data", (data) => {
                lines += data.toString("utf-8");

                if (lines.match(/(.|\n)*\$ $/)) {
                    (lines.match(/(.|\n)*\$ ?/g) || []).forEach((line) => {
                        const callback = callbacks.shift();
                        if (callback) {
                            callback(line.replace("$ ", "").trimEnd());
                        }
                    });

                    lines = "";
                    return;
                }

                if (lines.match(/(DEBUG: .*\n)+/)) {
                    (lines.match(/DEBUG: .*\n/g) || []).forEach((line) => {
                        console.log(line.replace("DEBUG: ", "").trimEnd());
                    });

                    lines = "";
                    return;
                }
            });
        });
    },

    execute(command: string): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!client) {
                reject(new Error("Client not connected"));
                return;
            }

            callbacks.push(resolve);

            client.write(command);
            client.write("\r\n");
        });
    },

    close(): void {
        if (client) {
            client.end();
        }
    }
};

export default shell;