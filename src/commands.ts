import fs from "fs-extra";
import path from "path";
import { glob } from "glob";
import zipdir from "zip-dir";
import tmp from "tmp";
import { create as createIpfsClient, globSource as ipfsGlobSource } from "ipfs-http-client";
import urlencode from "urlencode";
import { v4 as uuid_v4 } from "uuid";
import qrcode from "qrcode-terminal";

import scaffold from "./scaffold.js";
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
    appId: string;
    version: string;
    template?: string;
    repository?: string;
    language?: string;
    theme?: string;
}

interface PublishOptions {
    fileUrl?: string;
    imageUrl?: string;
    imageFile?: string;
    shortenUrl?: boolean;
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
    skipSync?: boolean;
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
        zipdir(srcPath, { saveTo: zipPath }, (error: Error | null) => {
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

const buildApp = (appInfo: AppInfo, skipObfuscation: boolean = false): Promise<string> => {
    return new Promise((resolve, reject) => {
        const baseName = appInfo.id.split(".").slice(-1);
        const jamPath = path.join(".", `${baseName}.jam`);

        if (fs.existsSync(jamPath)) {
            fs.unlinkSync(jamPath);
        }

        const buildDir = tmp.dirSync({ unsafeCleanup: true });

        fs.copySync(".", buildDir.name, {
            filter: (src) => {
                const basename = path.basename(src);

                if (basename !== "." && basename.startsWith(".")) {
                    return false;
                }
                
                if ([ ".jam", ".bxp", ".ts" ].includes(path.extname(src))) {
                    return false;
                }

                return true;
            }
        });

        const buildCatalogsPath = path.join(buildDir.name, "catalogs");

        compiler.build("./catalogs", { sourceMap: false, removeComments: true }, buildCatalogsPath)
            .then(() => {
                if (skipObfuscation) {
                    console.log("Skipping JavaScript obfuscation...");
                    return Promise.resolve();
                } else {
                    return obfuscator.obfuscate(buildCatalogsPath);
                }
            })
            .then(() => {
                return compressFolder(buildDir.name, tmp.tmpNameSync());
            })
            .then((zipPath) => {
                fs.moveSync(zipPath, jamPath);
                console.log(`Package created: ${jamPath}`);

                buildDir.removeCallback();
                resolve(jamPath);
            })
            .catch((error) => {
                buildDir.removeCallback();
                reject(error);
            });
    });
};

const publishApp = (jamPath: string, options: PublishOptions, ipfsOptions: IpfsOptions): Promise<string> => {
    if (!options.fileUrl) {
        return publishFileToIpfs(jamPath, ipfsOptions)
            .then((hash: string) => {
                return `ipfs://hash/${hash}`;
            });
    } else {
        return Promise.resolve(options.fileUrl);
    }
}

const buildBook = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        const baseName = path.basename(path.resolve("."));
        const bxpPath = path.join(".", `${baseName}.bxp`);

        if (fs.existsSync(bxpPath)) {
            fs.unlinkSync(bxpPath);
        }

        const buildDir = tmp.dirSync({ unsafeCleanup: true });

        fs.copySync(".", buildDir.name, {
            filter: (src) => {
                const basename = path.basename(src);
                
                if (basename !== "." && basename.startsWith(".")) {
                    return false;
                }

                return true;
            }
        });

        compressFolder(buildDir.name, tmp.tmpNameSync())
            .then((zipPath) => {
                fs.moveSync(zipPath, bxpPath);
                console.log(`Package created: ${bxpPath}`);

                buildDir.removeCallback();
                resolve(bxpPath);
            })
            .catch((error) => {
                buildDir.removeCallback();
                reject(error);
            });
    });
};

const publishBook = (bxpPath: string, options: PublishOptions, ipfsOptions: IpfsOptions): Promise<string> => {
    if (!options.fileUrl) {
        return publishFileToIpfs(bxpPath, ipfsOptions)
            .then((hash: string) => {
                return "ipfs://hash/" + hash;
            });
    } else {
        return Promise.resolve(options.fileUrl)
    }
}

const publishImage = (options: PublishOptions, ipfsOptions: IpfsOptions): Promise<string | void> => {
    if (!options.imageUrl) {
        if (options.imageFile) {
            return publishFileToIpfs(options.imageFile, ipfsOptions)
                .then((hash: string) => {
                    return `https://ipfs.io/ipfs/${hash}`;
                });
        } else {
            return Promise.resolve();
        }
    } else {
        return Promise.resolve(options.imageUrl);
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
    buildApp(skipObfuscation?: boolean): void;
    cleanApp(): void;
    installApp(platform: Platform): void;
    publishApp(host: HostOptions, options: PublishOptions, ipfsOptions: IpfsOptions, installUrls: InstallUrls): void;
    createBook(directory: string, options: CreateOptions): void;
    runBook(platform: Platform, shellOptions: ShellOptions, options: RunOptions): void;
    buildBook(): void;
    cleanBook(): void;
    installBook(platform: Platform): void;
    publishBook(host: HostOptions, options: PublishOptions, ipfsOptions: IpfsOptions, installUrls: InstallUrls): void;
    openUrl(platform: Platform, url: string): void;
    generateDatabase(target: string, store: string, spreadsheetPath: string): void;
    migrateStyle(): void;
    composeNative(nativePath: string, platforms: Platform[]): void;
    checkTypes(): void;
}

const commands: CommandsModule = {
    createApp(directory: string, options: CreateOptions): void {
        if (fs.existsSync(path.join(directory, "package.bon"))) {
            console.error("ERROR: directory already exists.");
            process.exit(1);
        }

        scaffold.generate("app", directory, options)
            .then(() => {
                const bonPath = path.resolve(directory, "package.bon");
                const appInfo = bon.parse(fs.readFileSync(bonPath, "utf8")) as AppInfo;

                appInfo.id = generateAppId(options.appId, appInfo.id);
                appInfo.version = options.version;

                fs.writeFileSync(bonPath, bon.stringify(appInfo) || "");
            })
            .catch(() => {
                console.error("ERROR: template may not exists.");
                process.exit(1);
            });
    },

    runApp(platform: Platform, mode: Mode, shellOptions: ShellOptions, options: RunOptions): void {
        if (!fs.existsSync("./package.bon")) {
            console.error("ERROR: package.bon not found.");
            process.exit(1);
        }

        const appInfo = bon.parse(fs.readFileSync("./package.bon", "utf8")) as AppInfo;

        if (!appInfo || !appInfo.id) {
            console.error("ERROR: package.bon is malformed.");
            process.exit(1);
        }

        simulator.start(platform, shellOptions.port)
            .then((appId) => {
                shell.ready(shellOptions.host, shellOptions.port, 60 * 1000) // 1 minute
                    .then(() => {
                        return shell.open();
                    })
                    .then(() => {
                        if ([ "jam", "widget" ].includes(mode)) {
                            return Promise.resolve(""); // nothing to do
                        } else {
                            return shell.execute("app id " + appInfo.id);
                        }
                    })
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
                                console.warn(`failed to start debugger - ${error}`);

                                return Promise.resolve();
                            });
                    })
                    .then(() => {
                        if ([ "jam", "widget" ].includes(mode)) {
                            return shell.execute(`catalog path resource ${appInfo.id}`);
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
                                                shell.execute("catalog reset " + appInfo.id);
                                            } else {
                                                shell.execute("catalog reload");
                                            }
                                        } else {
                                            shell.execute("catalog reset");
                                        }

                                        needsReset = false;
                                    } else {
                                        if ([ "jam" ].includes(mode)) {
                                            shell.execute("catalog reload " + appInfo.id);
                                        } else {
                                            shell.execute("catalog reload");
                                        }
                                    }
                                });
                            }
                        });
                });
            })
            .catch(() => {
                console.error("ERROR: could not start a simulator.");
                process.exit(1);
            });
    },

    buildApp(skipObfuscation: boolean = false): void {
        if (!fs.existsSync("./package.bon")) {
            console.error("ERROR: package.bon not found.");
            process.exit(1);
        }

        const appInfo = bon.parse(fs.readFileSync("./package.bon", "utf8")) as AppInfo;

        if (!appInfo || !appInfo.id) {
            console.error("ERROR: package.bon is malformed.");
            process.exit(1);
        }

        buildApp(appInfo, skipObfuscation)
            .catch((error) => {
                console.error(`ERROR: could not generate a package. ${error.message || error}`);
                process.exit(1);
            });
    },

    cleanApp(): void {
        if (!fs.existsSync("./package.bon")) {
            console.error("ERROR: package.bon not found.");
            process.exit(1);
        }

        compiler.clean("./catalogs")
            .catch((error) => {
                console.error(`ERROR: could not clean build artifacts. ${error.message || error}`);
                process.exit(1);
            });
    },

    installApp(platform: Platform): void {
        if (!fs.existsSync("./package.bon")) {
            console.error("ERROR: package.bon not found.");
            process.exit(1);
        }

        const appInfo = bon.parse(fs.readFileSync("./package.bon", "utf8")) as AppInfo;

        if (!appInfo || !appInfo.id) {
            console.error("ERROR: package.bon is malformed.");
            process.exit(1);
        }

        buildApp(appInfo)
            .then((jamPath) => {
                installer.install(platform, jamPath);
            })
            .catch((error) => {
                console.error(`ERROR: could not generate a package. ${error.message || error}`);
                process.exit(1);
            });
    },

    publishApp(host: HostOptions, options: PublishOptions, ipfsOptions: IpfsOptions, installUrls: InstallUrls): void {
        if (!options.fileUrl && !fs.existsSync("./package.bon")) {
            console.error("ERROR: package.bon not found.");
            process.exit(1);
        }

        const appInfo = bon.parse(fs.readFileSync("./package.bon", "utf8")) as AppInfo;

        if (!options.fileUrl && (!appInfo || !appInfo.id)) {
            console.error("ERROR: package.bon is malformed.");
            process.exit(1);
        }

        if (options.language && appInfo.localization) {
            const localization = appInfo.localization[options.language] || {};

            if (localization.title) {
                appInfo.title = localization.title;
            }
        }

        buildApp(appInfo)
            .then((jamPath) => {
                return Promise.all([
                    publishApp(jamPath, options, ipfsOptions),
                    publishImage(options, ipfsOptions)
                ]);
            })
            .then(([ appUrl, imageUrl ]) => {
                const title = options.title || appInfo.title || "";
                let url = `${host.url || CONNECT_BASE_URL}/connect/app/?`
                        + `app=${appInfo.id}` + "&" + `url=${urlencode(appUrl)}`
                        + (title ? "&" + `title=${urlencode(title)}` : "")
                        + (appInfo.version ? "&" + `version=${appInfo.version}` : "")
                        + (imageUrl ? "&" + `image=${urlencode(imageUrl)}` : "")
                        + (host.url ? "" : "&" + `host-scheme=${host.scheme}`);

                Object.keys(installUrls).forEach((platform) => {
                    if (installUrls[platform] !== "auto") {
                        url = url + "&" + `${platform}-install-url=${urlencode(installUrls[platform])}`;
                    }
                });

                if (options.shortenUrl) {
                    shortenUrl(url, (url) => {
                        qrcode.generate(url);
                        console.log(url);
                    });
                } else {
                    qrcode.generate(url);
                    console.log(url);
                }
            })
            .catch((error) => {
                console.error(`ERROR: could not publish app. ${error.message || error}`);
                process.exit(1);
            });
    },

    createBook(directory: string, options: CreateOptions): void {
        if (fs.existsSync(path.join(directory, "book.bon"))) {
            console.error("ERROR: directory already exists.");
            process.exit(1);
        }

        scaffold.generate("book", directory, options)
            .then(() => {
                const bonPath = path.resolve(directory, "book.bon");
                const bookInfo = bon.parse(fs.readFileSync(bonPath, "utf8")) as BookInfo;

                bookInfo.version = options.version;

                fs.writeFileSync(bonPath, bon.stringify(bookInfo) || "");
            })
            .catch(() => {
                console.error("ERROR: template may not exists.");
                process.exit(1);
            });
    },

    runBook(platform: Platform, shellOptions: ShellOptions, options: RunOptions): void {
        if (!fs.existsSync("./book.bon")) {
            console.error("ERROR: book.bon not found.");
            process.exit(1);
        }

        simulator.start(platform, shellOptions.port)
            .then((appId) => {
                shell.ready(shellOptions.host, shellOptions.port, 60 * 1000) // 1 minute
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
        .catch(() => {
            console.error("ERROR: could not start a simulator.");
            process.exit(1);
        });
    },

    buildBook(): void {
        if (!fs.existsSync("./book.bon")) {
            console.error("ERROR: book.bon not found.");
            process.exit(1);
        }

        buildBook()
            .catch((error) => {
                console.error(`ERROR: could not generate a package. ${error.message || error}`);
                process.exit(1);
            });
    },

    cleanBook(): void {
        if (!fs.existsSync("./book.bon")) {
            console.error("ERROR: book.bon not found.");
            process.exit(1);
        }

        compiler.clean(".")
            .catch((error) => {
                console.error(`ERROR: could not clean build artifacts. ${error.message || error}`);
                process.exit(1);
            });
    },

    installBook(platform: Platform): void {
        if (!fs.existsSync("./book.bon")) {
            console.error("ERROR: book.bon not found.");
            process.exit(1);
        }

        buildBook()
            .then((bxpPath) => {
                // TBD: What to do with the built book package?
                console.log(`Book package ready: ${bxpPath}`);
            })
            .catch((error) => {
                console.error(`ERROR: could not generate a package. ${error.message || error}`);
                process.exit(1);
            });
    },

    publishBook(host: HostOptions, options: PublishOptions, ipfsOptions: IpfsOptions, installUrls: InstallUrls): void {
        if (!options.fileUrl && !fs.existsSync("./book.bon")) {
            console.error("ERROR: book.bon not found.");
            process.exit(1);
        }

        const bookInfo = bon.parse(fs.readFileSync("./book.bon", "utf8")) as BookInfo;

        if (!options.fileUrl && !bookInfo) {
            console.error("ERROR: book.bon is malformed.");
            process.exit(1);
        }

        buildBook()
            .then((bxpPath) => {
                return Promise.all([
                    publishBook(bxpPath, options, ipfsOptions),
                    publishImage(options, ipfsOptions)
                ]);
            })
            .then(([bookUrl, imageUrl]) => {
                const title = options.title || bookInfo.title || "";
                let url = `${host.url || CONNECT_BASE_URL}/connect/book/?`
                        + `book=${bookInfo.id}` + "&" + `url=${urlencode(bookUrl)}`
                        + (title ? "&" + `title=${urlencode(title)}` : "")
                        + (bookInfo.version ? "&" + `version=${bookInfo.version}` : "")
                        + (imageUrl ? "&" + `image=${urlencode(imageUrl)}` : "")
                        + (host.url ? "" : "&" + `host-scheme=${host.scheme}`);

                Object.keys(installUrls).forEach((platform) => {
                    if (installUrls[platform] !== "auto") {
                        url = url + "&" + `${platform}-install-url=${urlencode(installUrls[platform])}`;
                    }
                });

                if (options.shortenUrl) {
                    shortenUrl(url, (url) => {
                        qrcode.generate(url);
                        console.log(url);
                    });
                } else {
                    qrcode.generate(url);
                    console.log(url);
                }
            })
            .catch((error) => {
                console.error(`ERROR: could not publish book. ${error.message || error}`);
                process.exit(1);
            });
    },

    openUrl(platform: Platform, url: string): void {
        if (!simulator.openUrl(platform, url)) {
            console.error(`ERROR: Failed to open the url: ${url}`);
            process.exit(1);
        }
    },

    generateDatabase(target: string, store: string, spreadsheetPath: string): void {
        if (!fs.existsSync("./package.bon")) {
            console.error("ERROR: package.bon not found.");
            process.exit(1);
        }

        const data = catalog.loadFromSpreadsheet(spreadsheetPath, store);
        const baseDir = path.join("catalogs", target);

        catalog.saveToFile(data[0], path.join(baseDir, "catalog.bon"));
        catalog.saveToDatabase(data[0], data[1], path.join(baseDir, "catalog.sqlite"));
    },

    migrateStyle(): void {
        if (!fs.existsSync("./package.bon")) {
            console.error("ERROR: package.bon not found.");
            process.exit(1);
        }

        glob("catalogs" + "/**/*.sbss", {})
            .then((files) => {
                files.forEach((file) => {
                    style.migrate(file);
                });
            })
            .catch((error) => {
                console.error(`ERROR: failed to search for style files. ${error.message || error}`);
                process.exit(1);
            });
    },

    composeNative(nativePath: string, platforms: Platform[]): void {
        if (!fs.existsSync("./package.bon")) {
            console.error("ERROR: package.bon not found.");
            process.exit(1);
        }

        const appInfo = bon.parse(fs.readFileSync("./package.bon", "utf8")) as AppInfo;

        platforms.forEach((platform) => {
            native.compose(nativePath, platform, appInfo);
        });
    },

    checkTypes(): void {
        if (!fs.existsSync("./package.bon")) {
            console.error("ERROR: package.bon not found.");
            process.exit(1);
        }

        compiler.typecheck("catalogs")
            .catch((error) => {
                console.error(`ERROR: type checking failed. ${error.message || error}`);
                process.exit(1);
            });
    }
};

export default commands;