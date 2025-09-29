import fs from "fs-extra";
import path from "path";
import { glob } from "glob";
import zipdir from "zip-dir";
import tmp from "tmp";
import { create as createIpfsClient, globSource as ipfsGlobSource } from "ipfs-http-client";
import urlencode from "urlencode";
import { v4 as uuid_v4 } from "uuid";
import qrcode from "qrcode-terminal";

import template from "./template.js";
import catalog from "./catalog.js";
import simulator from "./simulator.js";
import avdctl from "./avdctl.js";
import shell from "./shell.js";
import syncfolder from "./syncfolder.js";
import compiler from "./compiler.js";
import obfuscator from "./obfuscator.js";
import installer from "./installer.js";
import bon from "./bon.js";
import style from "./style.js";
import native from "./native.js";
import leafly from "./leafly.js";
import utils from "./utils.js";

// Type definitions
interface AppInfo {
    id: string;
    version?: string;
    title?: string;
    localization?: {
        [language: string]: {
            title?: string;
        };
    };
    [key: string]: any;
}

interface BookInfo {
    id: string;
    version?: string;
    title?: string;
    [key: string]: any;
}

interface ShellOptions {
    host: string;
    port: number;
}

interface CreateOptions {
    "app-id": string;
    version: string;
    template?: string;
    repository?: string;
    language?: string;
    theme?: string;
}

interface PublishOptions {
    "file-url"?: string;
    "image-url"?: string;
    "image-file"?: string;
    "shorten-url"?: boolean;
    title?: string;
    language?: string;
}

interface HostOptions {
    url?: string;
    scheme?: string;
}

interface InstallUrls {
    [platform: string]: string;
}

interface VsCodeLaunchConfig {
    name: string;
    type: string;
    request: string;
    port: number;
}

interface VsCodeLaunchJson {
    version: string;
    configurations: VsCodeLaunchConfig[];
}

interface IpfsOptions {
    [key: string]: any;
}

interface RunOptions {
    [key: string]: any;
}

type Platform = "ios" | "android";
type Mode = "jam" | "widget" | "app" | "main";

const CONNECT_BASE_URL = "https://jamkit.io";

const generateAppId = (wantedAppId: string, templateAppId: string): string => {
    if (wantedAppId === "auto") {
        return `com.yourdomain.${uuid_v4()}`;
    }

    if (wantedAppId === "manual") {
        return templateAppId;
    }

    return wantedAppId;
}

const compressFolder = (srcPath: string, zipPath: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        zipdir(srcPath, {
            saveTo: zipPath,
            filter(fullPath: string, stat: any): boolean {
                if (path.basename(fullPath).startsWith(".")) {
                    return false;
                }

                if ([ ".jam", ".bxp", ".ts" ].includes(path.extname(fullPath))) {
                    return false;
                }

                return true;
            }
         },
         (error: Error | null) => {
            if (!error) {
                resolve(zipPath);
            } else {
                reject(error)
            }
        });
    });
}

const getVscodeLaunchJsonPath = (): string => {
    // Starting from the current directory (where package.bon exists),
    // check up to 7 ancestors to see if they have the VSCode configs.
    let configDirPath = ".vscode";

    for (let i = 0; i < 7; ++i) {
        if (fs.existsSync(configDirPath)) {
            const isUserConfigDir = fs.existsSync(path.join(configDirPath, "argv.json")) ||
                                    fs.existsSync(path.join(configDirPath, "extensions"));

            if (isUserConfigDir) {
                // this is the user config directory. give up here.
                break;
            }

            return path.join(configDirPath, "launch.json");
        }

        configDirPath = path.join("..", configDirPath);
    }

    // If not found, fall back to the current directory.
    return path.join(".vscode", "launch.json");
}

const updateVscodeLaunchJson = (debuggerPort: number): void => {
    const jsonPath = getVscodeLaunchJsonPath();
    const configName = "Jamkit attach";
    const defaultLaunchConfig: VsCodeLaunchConfig = {
        name: configName,
        type: "node",
        request: "attach",
        port: debuggerPort
    };

    process.stdout.write(`Updating the debugger configuration in ${jsonPath}... `);

    let launchJson: VsCodeLaunchJson;
    let needsUpdate = false;

    try {
        launchJson = fs.readJsonSync(jsonPath) as VsCodeLaunchJson;
        const launchConfig = launchJson.configurations.find((config) => {
            return config.name === configName;
        });

        if (launchConfig) {
            if (launchConfig.port != debuggerPort) {
                launchConfig.port = debuggerPort;
                needsUpdate = true;
            }
        } else {
            launchJson.configurations.push(defaultLaunchConfig);
            needsUpdate = true;
        }
    } catch (error) {
        // launch.json not exist or the existing launch.json might have been corrupted.
        launchJson = {
            version: "0.2.0",
            configurations: [
                defaultLaunchConfig
            ]
        };
        needsUpdate = true;
    }

    if (needsUpdate) {
        fs.outputJsonSync(jsonPath, launchJson, { spaces: 4 });
    }

    console.log("Done");
}

const publishApp = (appId: string, options: PublishOptions, ipfsOptions: IpfsOptions, callback: (url: string) => void): void => {
    if (!options["file-url"]) {
        const baseName = appId.split(".").slice(-1);
        const jamPath = path.join(".", `${baseName}.jam`);

        if (fs.existsSync(jamPath)) {
            fs.unlinkSync(jamPath);
        }

        compressFolder(".", tmp.tmpNameSync())
            .then((zipPath) => {
                fs.moveSync(zipPath, jamPath);

                publishFileToIpfs(jamPath, ipfsOptions)
                    .then((hash: string) => {
                        callback(`ipfs://hash/${hash}`);
                    })
                    .catch((error) => {
                        console.log("ERROR: could not publish to ipfs.");
                    });
            })
            .catch((error) => {
                console.log("ERROR: could not generate a package.");
            });
    } else {
        callback(options["file-url"]);
    }
}

const publishBook = (options: PublishOptions, ipfsOptions: IpfsOptions, callback: (url: string) => void): void => {
    if (!options["file-url"]) {
        const baseName = path.basename(path.resolve("."))
        const bxpPath = path.join(".", `${baseName}.bxp`);

        if (fs.existsSync(bxpPath)) {
            fs.unlinkSync(bxpPath);
        }

        compressFolder(".", tmp.tmpNameSync())
            .then((zipPath) => {
                fs.moveSync(zipPath, bxpPath);

                publishFileToIpfs(bxpPath, ipfsOptions)
                    .then((hash: string) => {
                        callback("ipfs://hash/" + hash);
                    })
                    .catch((error) => {
                        console.log("ERROR: could not publish to ipfs.");
                    });
            })
            .catch((error) => {
                console.log("ERROR: could not generate a package.");
            });
    } else {
        callback(options["file-url"]);
    }
}

const publishImage = (options: PublishOptions, ipfsOptions: IpfsOptions, callback: (url?: string) => void): void => {
    if (!options["image-url"]) {
        if (options["image-file"]) {
            publishFileToIpfs(options["image-file"], ipfsOptions)
                .then((hash: string) => {
                    callback(`https://ipfs.io/ipfs/${hash}`);
                })
                .catch((error) => {
                    console.log(error);
                });
        } else {
            callback();
        }
    } else {
        callback(options["image-url"]);
    }
}

const publishFileToIpfs = (filePath: string, options: IpfsOptions): Promise<string> => {
    return createIpfsClient(options)
        .then(async (client) => {
            const results = [];
            for await (const result of client.addAll(ipfsGlobSource("./", filePath))) {
                results.push(result);
            }
            return results;
        })
        .then((results) => {
            return results[results.length - 1].cid.toString();
        });
}

const shortenUrl = (url: string, callback: (url: string) => void): void => {
    leafly.createShortUrl(url)
        .then(({ url: shortUrl }: { url: string }) => {
            callback(shortUrl);
        })
        .catch((error) => {
            callback(url);
        });
}

interface CommandsModule {
    createApp(directory: string, options: CreateOptions): void;
    runApp(platform: Platform, mode: Mode, shellOptions: ShellOptions, options: RunOptions): void;
    buildApp(): void;
    installApp(platform: Platform): void;
    publishApp(host: HostOptions, options: PublishOptions, ipfsOptions: IpfsOptions, installUrls: InstallUrls): void;
    createBook(directory: string, options: CreateOptions): void;
    runBook(platform: Platform, shellOptions: ShellOptions, options: RunOptions): void;
    buildBook(): void;
    installBook(platform: Platform): void;
    publishBook(host: HostOptions, options: PublishOptions, ipfsOptions: IpfsOptions, installUrls: InstallUrls): void;
    openUrl(platform: Platform, url: string): void;
    generateDatabase(target: string, store: string, spreadsheetPath: string): void;
    migrateStyle(): void;
    composeNative(nativePath: string, platforms: Platform[]): void;
}

const commands: CommandsModule = {
    createApp(directory: string, options: CreateOptions): void {
        if (fs.existsSync(path.join(directory, "package.bon"))) {
            console.log("ERROR: directory already exists.");

            return;
        }

        template.copy("apps" as any, directory, options)
            .then(() => {
                const bonPath = path.resolve(directory, "package.bon");
                const appInfo = bon.parse(fs.readFileSync(bonPath, "utf8")) as AppInfo;

                appInfo["id"] = generateAppId(options["app-id"], appInfo["id"]);
                appInfo["version"] = options["version"];

                fs.writeFileSync(bonPath, bon.stringify(appInfo) || "");
            })
            .catch((error) => {
                console.log("ERROR: template may not exists.");
            });
    },

    runApp(platform: Platform, mode: Mode, shellOptions: ShellOptions, options: RunOptions): void {
        if (!fs.existsSync("./package.bon")) {
            console.log("ERROR: package.bon not found.");

            return;
        }

        const appInfo = bon.parse(fs.readFileSync("./package.bon", "utf8")) as AppInfo;

        if (!appInfo || !appInfo["id"]) {
            console.log("ERROR: package.bon is malformed.");

            return;
        }

        simulator.start(platform, shellOptions["port"])
            .then((appId) => {
                shell.ready(shellOptions["host"], shellOptions["port"], 60 * 1000) // 1 minute
                    .then(() => {
                        return shell.open();
                    })
                    .then((() => {
                        if ([ "jam", "widget" ].includes(mode)) {
                            return Promise.resolve(); // nothing to do
                        } else {
                            return shell.execute("app id " + appInfo["id"]);
                        }
                    }) as any)
                    .then(() => {
                        return shell.execute("app source " + path.join(process.cwd(), "catalogs"));
                    })
                    .then(() => {
                        if (platform !== "android") {
                            // debugging is supported only on android
                            return Promise.resolve();
                        }

                        return shell.execute("debugger start")
                            .then((result) => {
                                const devicePort = parseInt(result as string);
                                let localPort = devicePort;

                                while (true) {
                                    if (avdctl.forward(`tcp:${localPort}`, `tcp:${devicePort}`)) {
                                        break;
                                    }

                                    if (localPort > devicePort + 100) {
                                        return Promise.reject("too many `adb forward` failures");
                                    }

                                    localPort += 1;
                                }

                                updateVscodeLaunchJson(localPort);

                                return Promise.resolve();
                            })
                            .catch((error) => {
                                console.log(`WARNING: failed to start debugger - ${error}`);

                                return Promise.resolve();
                            });
                    })
                    .then(() => {
                        if ([ "jam", "widget" ].includes(mode)) {
                            return shell.execute(`catalog path resource ${appInfo["id"]}`);
                        } else {
                            return shell.execute("catalog path resource");
                        }
                    })
                    .then((resourcePath) => {
                        let needsReset = true;

                        compiler.start("./catalogs", { sourceMap: false, removeComments: true }, (event, filePath) => {
                            if (event === "ready") {
                                syncfolder.start(platform, appId as string, "./catalogs", resourcePath as string, options, (event, filePath) => {
                                    if (needsReset) {
                                        if ([ "jam", "widget" ].includes(mode)) {
                                            shell.execute("app install " + utils.dataToDataURL(appInfo));

                                            if ([ "jam" ].includes(mode)) {
                                                shell.execute("catalog reset " + appInfo["id"]);
                                            } else {
                                                shell.execute("catalog reload");
                                            }
                                        } else {
                                            shell.execute("catalog reset");
                                        }
                                        needsReset = false;
                                    } else {
                                        if ([ "jam" ].includes(mode)) {
                                            shell.execute("catalog reload " + appInfo["id"]);
                                        } else {
                                            shell.execute("catalog reload");
                                        }
                                    }
                                });
                            }
                        });
                });
            })
            .catch((error) => {
                console.log("ERROR: could not start a simulator.");
            });
    },

    buildApp(): void {
        if (!fs.existsSync("./package.bon")) {
            console.log("ERROR: package.bon not found.");

            return;
        }

        const appInfo = bon.parse(fs.readFileSync("./package.bon", "utf8")) as AppInfo;

        if (!appInfo || !appInfo["id"]) {
            console.log("ERROR: package.bon is malformed.");

            return;
        }

        const baseName = appInfo["id"].split(".").slice(-1);
        const jamPath = path.join(".", `${baseName}.jam`);

        if (fs.existsSync(jamPath)) {
            fs.unlinkSync(jamPath);
        }

        compressFolder(".", tmp.tmpNameSync())
            .then((zipPath) => {
                fs.moveSync(zipPath, jamPath);
                console.log(`Package created: ${jamPath}`);
            })
            .catch((error) => {
                console.log("ERROR: could not generate a package.");
            });
    },

    installApp(platform: Platform): void {
        if (!fs.existsSync("./package.bon")) {
            console.log("ERROR: package.bon not found.");

            return;
        }

        const appInfo = bon.parse(fs.readFileSync("./package.bon", "utf8")) as AppInfo;

        if (!appInfo || !appInfo["id"]) {
            console.log("ERROR: package.bon is malformed.");

            return;
        }

        const baseName = appInfo["id"].split(".").slice(-1);
        const jamPath = path.join(".", `${baseName}.jam`);

        if (fs.existsSync(jamPath)) {
            fs.unlinkSync(jamPath);
        }

       compressFolder(".", tmp.tmpNameSync())
            .then((zipPath) => {
                fs.moveSync(zipPath, jamPath);

                installer.install(platform, jamPath);
            })
            .catch((error) => {
                console.log("ERROR: could not generate a package.");
            });
    },

    publishApp(host: HostOptions, options: PublishOptions, ipfsOptions: IpfsOptions, installUrls: InstallUrls): void {
        if (!options["file-url"] && !fs.existsSync("./package.bon")) {
            console.log("ERROR: package.bon not found.");

            return;
        }

        const appInfo = bon.parse(fs.readFileSync("./package.bon", "utf8")) as AppInfo || {};

        if (!options["file-url"] && !appInfo) {
            console.log("ERROR: package.bon is malformed.");

            return;
        }

        if (options["language"] && appInfo["localization"]) {
            const localization = appInfo["localization"][options["language"]] || {};

            if (localization["title"]) {
                appInfo["title"] = localization["title"];
            }
        }

        publishApp(appInfo["id"], options, ipfsOptions, (app_url) => {
            publishImage(options, ipfsOptions, (imageUrl?: string) => {
                const title = options["title"] || appInfo["title"] || "";
                let url = `${host["url"] || CONNECT_BASE_URL}/connect/app/?`
                        + `app=${appInfo["id"]}` + "&" + `url=${urlencode(app_url)}`
                        + (title ? "&" + `title=${urlencode(title)}` : "")
                        + (appInfo["version"] ? "&" + `version=${appInfo["version"]}` : "")
                        + (imageUrl ? "&" + `image=${urlencode(imageUrl)}` : "")
                        + (host["url"] ? "" : "&" + `host-scheme=${host["scheme"]}`);

                Object.keys(installUrls).forEach((platform) => {
                    if (installUrls[platform] !== "auto") {
                        url = url + "&" + `${platform}-install-url=${urlencode(installUrls[platform])}`;
                    }
                });

                if (options["shorten-url"]) {
                    shortenUrl(url, (url) => {
                        qrcode.generate(url);
                        console.log(url);
                    });
                } else {
                    qrcode.generate(url);
                    console.log(url);
                }
            });
        });
    },

    createBook(directory: string, options: CreateOptions): void {
        if (fs.existsSync(path.join(directory, "book.bon"))) {
            console.log("ERROR: directory already exists.");

            return;
        }

        template.copy("books" as any, directory, options)
            .then(() => {
                const bonPath = path.resolve(directory, "book.bon");
                const bookInfo = bon.parse(fs.readFileSync(bonPath, "utf8")) as BookInfo;

                bookInfo["version"] = options["version"];

                fs.writeFileSync(bonPath, bon.stringify(bookInfo) || "");
            })
            .catch((error) => {
                console.log("ERROR: template may not exists.");
            });
    },

    runBook(platform: Platform, shellOptions: ShellOptions, options: RunOptions): void {
        if (!fs.existsSync("./book.bon")) {
            console.log("ERROR: book.bon not found.");

            return;
        }

        simulator.start(platform, shellOptions["port"])
            .then((appId) => {
                shell.ready(shellOptions["host"], shellOptions["port"], 60 * 1000) // 1 minute
                    .then(() => {
                        return shell.open();
                    })
                    .then(() => {
                        return shell.execute("book path resource");
                    })
                    .then((resourcePath) => {
                        let needsOpen = true;

                        syncfolder.start(platform, appId as string, ".", resourcePath as string, options, () => {
                            if (needsOpen) {
                                shell.execute("book open");
                                needsOpen = false;
                            } else {
                                shell.execute("book reload");
                            }
                        });
                    });
        })
        .catch((error) => {
            console.log("ERROR: could not start a simulator.");
        });
    },

    buildBook(): void {
        if (!fs.existsSync("./book.bon")) {
            console.log("ERROR: book.bon not found.");

            return;
        }

        const baseName = path.basename(path.resolve("."))
        const bxpPath = path.join(".", `${baseName}.bxp`);

        if (fs.existsSync(bxpPath)) {
            fs.unlinkSync(bxpPath);
        }

        compressFolder(".", tmp.tmpNameSync())
            .then((zipPath) => {
                fs.moveSync(zipPath, bxpPath);
                console.log(`Package created: ${bxpPath}`);
            })
            .catch((error) => {
                console.log("ERROR: could not generate a package.");
            });
    },

    installBook(platform: Platform): void {
        if (!fs.existsSync("./book.bon")) {
            console.log("ERROR: book.bon not found.");

            return;
        }

        const baseName = path.basename(path.resolve("."))
        const bxpPath = path.join(".", `${baseName}.bxp`);

        if (fs.existsSync(bxpPath)) {
            fs.unlinkSync(bxpPath);
        }

        compressFolder(".", tmp.tmpNameSync())
            .then((zipPath) => {
                fs.moveSync(zipPath, bxpPath);

                // TBD: What to do?
            })
            .catch((error) => {
                console.log("ERROR: could not generate a package.");
            });
    },

    publishBook(host: HostOptions, options: PublishOptions, ipfsOptions: IpfsOptions, installUrls: InstallUrls): void {
        if (!options["file-url"] && !fs.existsSync("./book.bon")) {
            console.log("ERROR: book.bon not found.");

            return;
        }

        const bookInfo = bon.parse(fs.readFileSync("./book.bon", "utf8")) as BookInfo;

        if (!options["file-url"] && !bookInfo) {
            console.log("ERROR: book.bon is malformed.");

            return;
        }

        publishBook(options, ipfsOptions, (bookUrl) => {
            publishImage(options, ipfsOptions, (imageUrl?: string) => {
                const title = options["title"] || bookInfo["title"] || "";
                let url = `${host["url"] || CONNECT_BASE_URL}/connect/book/?`
                        + `book=${bookInfo["id"]}` + "&" + `url=${urlencode(bookUrl)}`
                        + (title ? "&" + `title=${urlencode(title)}` : "")
                        + (bookInfo["version"] ? "&" + `version=${bookInfo["version"]}` : "")
                        + (imageUrl ? "&" + `image=${urlencode(imageUrl)}` : "")
                        + (host["url"] ? "" : "&" + `host-scheme=${host["scheme"]}`);

                Object.keys(installUrls).forEach((platform) => {
                    if (installUrls[platform] !== "auto") {
                        url = url + "&" + `${platform}-install-url=${urlencode(installUrls[platform])}`;
                    }
                });

                if (options["shorten-url"]) {
                    shortenUrl(url, (url) => {
                        qrcode.generate(url);
                        console.log(url);
                    });
                } else {
                    qrcode.generate(url);
                    console.log(url);
                }
            });
        });
    },

    openUrl(platform: Platform, url: string): void {
        if (!simulator.openUrl(platform, url)) {
            console.log(`ERROR: Failed to open the url: ${url}`);
        }
    },

    generateDatabase(target: string, store: string, spreadsheetPath: string): void {
        const data = catalog.loadFromSpreadsheet(spreadsheetPath, store);
        const baseDir = path.join("catalogs", target);

        catalog.saveToFile(data[0], path.join(baseDir, "catalog.bon"));
        catalog.saveToDatabase(data[0], data[1], path.join(baseDir, "catalog.sqlite"));
    },

    migrateStyle(): void {
        if (!fs.existsSync("./package.bon")) {
            console.log("ERROR: package.bon not found.");

            return;
        }

        const baseDir = "catalogs";

        glob(baseDir + "/**/*.sbss", {})
            .then((files) => {
                files.forEach((file) => {
                    style.migrate(file);
                });
            })
            .catch((error) => {
                console.log("ERROR: could not find style files.");
            });
    },

    composeNative(nativePath: string, platforms: Platform[]): void {
        if (!fs.existsSync("./package.bon")) {
            console.log("ERROR: package.bon not found.");

            return;
        }

        const appInfo = bon.parse(fs.readFileSync("./package.bon", "utf8")) as AppInfo;

        platforms.forEach((platform) => {
            native.compose(nativePath, platform, appInfo as any);
        });
    }
};

export default commands;