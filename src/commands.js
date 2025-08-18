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
import obfuscator from "./obfuscator.js";
import installer from "./installer.js";
import bon from "./bon.js";
import style from "./style.js";
import native from "./native.js";
import leafly from "./leafly.js";
import utils from "./utils.js";

const CONNECT_BASE_URL = "https://jamkit.io";

const generateAppId = (wantedAppId, templateAppId) => {
    if (wantedAppId === "auto") {
        return `com.yourdomain.${uuid_v4()}`;
    }

    if (wantedAppId === "manual") {
        return templateAppId;
    }

    return wantedAppId;
}

const compressFolder = (srcPath, zipPath) => {
    return new Promise((resolve, reject) => {
        zipdir(srcPath, { 
            saveTo: zipPath,
            filter(fullPath, stat) {
                if (path.basename(fullPath).startsWith(".")) {
                    return false;
                }
    
                if ([ ".jam", ".bxp" ].includes(path.extname(fullPath))) {
                    return false;
                }
    
                return true;
            }
         }, 
         (error) => {
            if (!error) {
                resolve(zipPath);
            } else {
                reject(error)
            }
        });
    });
}

const getVscodeLaunchJsonPath = () => {
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

const updateVscodeLaunchJson = (debuggerPort) => {
    const jsonPath = getVscodeLaunchJsonPath();
    const configName = "Jamkit attach";
    const defaultLaunchConfig = {
        name: configName,
        type: "node",
        request: "attach",
        port: debuggerPort
    };

    process.stdout.write(`Updating the debugger configuration in ${jsonPath}... `);
    
    try {
        const launchJson = fs.readJsonSync(jsonPath);
        const launchConfig = launchJson.configurations.find((config) => {
            return config.name === configName;
        });
        let needsUpdate = false;

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

const publishApp = (appId, options, ipfsOptions, callback) => {
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
                    .then((hash) => {
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

const publishBook = (options, ipfsOptions, callback) => {
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
                    .then((hash) => {
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

const publishImage = (options, ipfsOptions, callback) => {
    if (!options["image-url"]) {
        if (options["image-file"]) {
            publishFileToIpfs(options["image-file"], ipfsOptions)
                .then((hash) => {
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

const publishFileToIpfs = (path, options) => {
    return createIpfsClient(options)
        .then((client) => {
            return Promise.all(client.addAll(ipfsGlobSource("./", path)));
        });
}

const shortenUrl = (url, callback) => {
    leafly.createShortUrl(url)
        .then(({ url }) => {
            callback(url);
        })
        .catch((error) => {
            callback(url);
        });
}

export default {
    createApp(directory, options) {
        if (fs.existsSync(path.join(directory, "package.bon"))) {
            console.log("ERROR: directory already exists.");

            return;
        }

        template.copy("apps", directory, options)
            .then(() => {
                const bonPath = path.resolve(directory, "package.bon");
                const appInfo = bon.parse(fs.readFileSync(bonPath, "utf8"));
        
                appInfo["id"] = generateAppId(options["app-id"], appInfo["id"]);
                appInfo["version"] = options["version"];
                
                fs.writeFileSync(bonPath, bon.stringify(appInfo));
            })
            .catch((error) => {
                console.log("ERROR: template may not exists.");
            });
    },

    runApp(platform, mode, shellOptions, options) {
        if (!fs.existsSync("./package.bon")) {
            console.log("ERROR: package.bon not found.");

            return;
        }
        
        const appInfo = bon.parse(fs.readFileSync("./package.bon", "utf8"));

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
                    .then(() => {
                        if ([ "jam", "widget" ].includes(mode)) {
                            return Promise.resolve(); // nothing to do
                        } else {
                            return shell.execute("app id " + appInfo["id"]);
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
                                const devicePort = parseInt(result);
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

                        syncfolder.start(platform, appId, "./catalogs", resourcePath, options, () => {
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
                });
            })
            .catch((error) => {
                console.log("ERROR: could not start a simulator.");
            });
    },

    buildApp() {
        if (!fs.existsSync("./package.bon")) {
            console.log("ERROR: package.bon not found.");

            return;
        }

        const appInfo = bon.parse(fs.readFileSync("./package.bon", "utf8"));

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
            })
            .catch((error) => {
                console.log("ERROR: could not generate a package.");
            });
    },

    installApp(platform) {
        if (!fs.existsSync("./package.bon")) {
            console.log("ERROR: package.bon not found.");

            return;
        }

        const appInfo = bon.parse(fs.readFileSync("./package.bon", "utf8"));

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

    publishApp(host, options, ipfsOptions, installUrls) {
        if (!options["file-url"] && !fs.existsSync("./package.bon")) {
            console.log("ERROR: package.bon not found.");

            return;
        }

        const appInfo = bon.parse(fs.readFileSync("./package.bon", "utf8")) || {};

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
            publishImage(options, ipfsOptions, (imageUrl) => {
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

    createBook(directory, options) {
        if (fs.existsSync(path.join(directory, "book.bon"))) {
            console.log("ERROR: directory already exists.");

            return;
        }

        template.copy("books", directory, options)
            .then(() => {
                const bonPath = path.resolve(directory, "book.bon");
                const bookInfo = bon.parse(fs.readFileSync(bonPath, "utf8"));
        
                bookInfo["version"] = options["version"];
        
                fs.writeFileSync(bonPath, bon.stringify(bookInfo));        
            })
            .catch((error) => {
                console.log("ERROR: template may not exists.");
            });
    },

    runBook(platform, shellOptions, options) {
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

                        syncfolder.start(platform, appId, ".", resourcePath, options, () => {
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

    buildBook() {
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
            .then((zipPath, bxpPath) => {
                fs.moveSync(zipPath, bxpPath);
            })
            .catch((error) => {
                console.log("ERROR: could not generate a package.");
            });
    },

    installBook(platform) {
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
            .then((zipPath, bxpPath) => {
                fs.moveSync(zipPath, bxpPath);

                // TBD: What to do?
            })
            .catch((error) => {
                console.log("ERROR: could not generate a package.");
            });
    },

    publishBook(host, options, ipfsOptions, installUrls) {
        if (!options["file-url"] && !fs.existsSync("./book.bon")) {
            console.log("ERROR: book.bon not found.");

            return;
        }

        const bookInfo = bon.parse(fs.readFileSync("./book.bon", "utf8"));

        if (!options["file-url"] && !bookInfo) {
            console.log("ERROR: book.bon is malformed.");

            return;
        }

        publishBook(options, (bookUrl) => {
            publishImage(options, ipfsOptions, (imageUrl) => {
                const title = options["title"] || appInfo["title"] || "";
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

    openUrl(platform, url) {
        if (!simulator.openUrl(platform, url)) {
            console.log(`ERROR: Failed to open the url: ${url}`);
        }
    },

    generateDatabase(target, store, spreadsheetPath) {
        const data = catalog.loadFromSpreadsheet(spreadsheetPath, store);
        const baseDir = path.join("catalogs", target);

        catalog.saveToFile(data[0], path.join(baseDir, "catalog.bon"));
        catalog.saveToDatabase(data[0], data[1], path.join(baseDir, "catalog.sqlite"));
    },

    migrateStyle() {
        if (!fs.existsSync("./package.bon")) {
            console.log("ERROR: package.bon not found.");

            return;
        }

        const baseDir = "catalogs";

        glob(baseDir + "/**/*.sbss", {}, (error, files) => {
            files.forEach((file) => {
                style.migrate(file);
            });
        });
    },

    composeNative(nativePath, platforms) {
        if (!fs.existsSync("./package.bon")) {
            console.log("ERROR: package.bon not found.");
            
            return;
        }

        const appInfo = bon.parse(fs.readFileSync("./package.bon", "utf8"));

        platforms.forEach((platform) => {
            native.compose(nativePath, platform, appInfo);
        });
    }
}
