const fs         = require("fs-extra"),
      path       = require("path"),
      glob       = require("glob"),
      zipdir     = require("zip-dir"),
      tmp        = require("tmp"),
      ipfs       = require("ipfs-http-client"),
      urlencode  = require("urlencode"),
      uuid       = require("uuid"),
      template   = require("./template"),
      catalog    = require("./catalog"),
      simulator  = require("./simulator"),
      avdctl     = require("./avdctl"),
      shell      = require("./shell"),
      syncfolder = require("./syncfolder"),
      installer  = require("./installer"),
      bon        = require("./bon"),
      style      = require("./style"),
      native     = require("./native"),
      leafly     = require("./leafly"),
      utils      = require("./utils");

const CONNECT_BASE_URL = "https://jamkit.io";

function _generate_app_id(wanted_app_id, template_app_id) {
    if (wanted_app_id === "auto") {
        return "com.yourdomain." + uuid.v4();
    }

    if (wanted_app_id === "manual") {
        return template_app_id;
    }

    return wanted_app_id;
}

function _compress_folder(src_path, zip_path) {
    return new Promise(function(resolve, reject) {
        zipdir(src_path, { 
            saveTo: zip_path,
            filter: function(full_path, stat) {
                if (path.basename(full_path).startsWith(".")) {
                    return false;
                }
    
                if ([ ".jam", ".bxp" ].includes(path.extname(full_path))) {
                    return false;
                }
    
                return true;
            }
         }, 
         (error) => {
            if (!error) {
                resolve(zip_path);
            } else {
                reject(error)
            }
        });
    });
}

function _get_vscode_launch_json_path() {
    // Starting from the current directory (where package.bon exists),
    // check up to 7 ancestors to see if they have the VSCode configs.
    var config_dir_path = ".vscode";
    
    for (let i = 0; i < 7; ++i) {
        if (fs.existsSync(config_dir_path)) {
            const is_user_config_dir = fs.existsSync(config_dir_path + "/argv.json") ||
                                       fs.existsSync(config_dir_path + "/extensions");

            if (is_user_config_dir) {
                // this is the user config directory. give up here.
                break;
            }

            return config_dir_path + "/launch.json";
        }

        config_dir_path = "../" + config_dir_path;
    }

    // If not found, fall back to the current directory.
    return ".vscode/launch.json";
}

function _update_vscode_launch_json(debugger_port) {
    const json_path = _get_vscode_launch_json_path();
    const config_name = "Jamkit attach";
    const default_launch_config = {
        name: config_name,
        type: "node",
        request: "attach",
        port: debugger_port
    };

    process.stdout.write(`Updating the debugger configuration in ${json_path}... `);
    
    try {
        const launch_json = fs.readJsonSync(json_path);
        const launch_config = launch_json.configurations.find(function(config) {
            return config.name === config_name;
        });
        var needs_update = false;

        if (launch_config) {
            if (launch_config.port != debugger_port) {
                launch_config.port = debugger_port;
                needs_update = true;
            }
        } else {
            launch_json.configurations.push(default_launch_config);
            needs_update = true;
        }
    } catch (error) {
        // launch.json not exist or the existing launch.json might have been corrupted.
        launch_json = {
            version: "0.2.0",
            configurations: [
                default_launch_config
            ]
        };
        needs_update = true;
    }

    if (needs_update) {
        fs.outputJsonSync(json_path, launch_json, { spaces: 4 });
    }

    console.log("Done");
}

function _publish_app(app_id, options, ipfs_options, callback) {
    if (!options["file-url"]) {
        const basename = app_id.split(".").slice(-1);
        const jam_path = path.join(".", basename + ".jam");

        if (fs.existsSync(jam_path)) {
            fs.unlinkSync(jam_path);
        }

        _compress_folder(".", tmp.tmpNameSync())
            .then(function(zip_path) {
                fs.moveSync(zip_path, jam_path);

                _publish_file(jam_path, ipfs_options)
                    .then(function(hash) {
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

function _publish_book(options, ipfs_options, callback) {
    if (!options["file-url"]) {
        const basename = path.basename(path.resolve("."))
        const bxp_path = path.join(".", basename + ".bxp");

        if (fs.existsSync(bxp_path)) {
            fs.unlinkSync(bxp_path);
        }

        _compress_folder(".", tmp.tmpNameSync())
            .then((zip_path) => {
                fs.moveSync(zip_path, bxp_path);

                _publish_file(bxp_path, ipfs_options)
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

function _publish_image(options, ipfs_options, callback) {
    if (!options["image-url"]) {
        if (options["image-file"]) {
            _publish_file(options["image-file"], ipfs_options)
                .then(function(hash) {
                    callback("https://ipfs.io/ipfs/" + hash);
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

function _publish_file(path, options) {
    return ipfs.create(options)
        .then((client) => {
            return Promise.all(client.addAll(ipfs.globSource("./", path)));
        });
}

function _shorten_url(url, callback) {
    leafly.create_short_url(url)
        .then(function({ url }) {
            callback(url);
        })
        .catch((error) => {
            callback(url);
        });
}

module.exports = {
    create_app: (directory, options) => {
        if (fs.existsSync(path.join(directory, "package.bon"))) {
            console.log("ERROR: directory already exists.");

            return;
        }

        template.copy("apps", directory, options)
            .then(() => {
                const bon_path = path.resolve(directory, "package.bon");
                const appinfo = bon.parse(fs.readFileSync(bon_path, "utf8"));
        
                appinfo["id"] = _generate_app_id(options["app-id"], appinfo["id"]);
                appinfo["version"] = options["version"];
                
                fs.writeFileSync(bon_path, bon.stringify(appinfo));
            })
            .catch((error) => {
                console.log("ERROR: template may not exists.");
            });
    },

    run_app: (platform, mode, shell_options, options) => {
        if (!fs.existsSync("./package.bon")) {
            console.log("ERROR: package.bon not found.");

            return;
        }
        
        const appinfo = bon.parse(fs.readFileSync("./package.bon", "utf8"));

        if (!appinfo || !appinfo["id"]) {
            console.log("ERROR: package.bon is malformed.");

            return;
        }

        simulator.start(platform, shell_options["port"])
            .then((app_id) => {
                shell.ready(shell_options["host"], shell_options["port"], 60 * 1000) // 1 minute
                    .then(() => {
                        return shell.open();
                    })
                    .then(() => {
                        if ([ "jam", "widget" ].includes(mode)) {
                            return Promise.resolve(); // nothing to do
                        } else {
                            return shell.execute("app id " + appinfo["id"]);
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
                                const device_port = parseInt(result);
                                var local_port = device_port;
                                
                                while (true) {
                                    if (avdctl.forward(`tcp:${local_port}`, `tcp:${device_port}`)) {
                                        break;
                                    }
                                
                                    if (local_port > device_port + 100) {
                                        return Promise.reject("too many `adb forward` failures");
                                    }
                                
                                    local_port += 1;
                                }
                                
                                _update_vscode_launch_json(local_port);
                                
                                return Promise.resolve();
                            })
                            .catch((error) => {
                                console.log(`WARNING: failed to start debugger - ${error}`);
                                
                                return Promise.resolve();
                            });
                    })
                    .then(() => {
                        if ([ "jam", "widget" ].includes(mode)) {
                            return shell.execute("catalog path resource " + appinfo["id"]);
                        } else {
                            return shell.execute("catalog path resource");
                        }
                    })
                    .then(function(resource_path) {
                        var needs_reset = true;

                        syncfolder.start(platform, app_id, "./catalogs", resource_path, options, () => {
                            if (needs_reset) {
                                if ([ "jam", "widget" ].includes(mode)) {
                                    shell.execute("app install " + utils.dataToDataURL(appinfo));

                                    if ([ "jam" ].includes(mode)) {
                                        shell.execute("catalog reset " + appinfo["id"]);
                                    } else {
                                        shell.execute("catalog reload");
                                    }
                                } else {
                                    shell.execute("catalog reset");
                                }
                                needs_reset = false;
                            } else {
                                if ([ "jam" ].includes(mode)) {
                                    shell.execute("catalog reload " + appinfo["id"]);
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

    build_app: () => {
        if (!fs.existsSync("./package.bon")) {
            console.log("ERROR: package.bon not found.");

            return;
        }

        const appinfo = bon.parse(fs.readFileSync("./package.bon", "utf8"));

        if (!appinfo || !appinfo["id"]) {
            console.log("ERROR: package.bon is malformed.");

            return;
        }

        const basename = appinfo["id"].split(".").slice(-1);
        const jam_path = path.join(".", basename + ".jam");

        if (fs.existsSync(jam_path)) {
            fs.unlinkSync(jam_path);
        }

        _compress_folder(".", tmp.tmpNameSync())
            .then((zip_path) => {
                fs.moveSync(zip_path, jam_path);
            })
            .catch((error) => {
                console.log("ERROR: could not generate a package.");
            });
    },

    install_app: (platform) => {
        if (!fs.existsSync("./package.bon")) {
            console.log("ERROR: package.bon not found.");

            return;
        }

        const appinfo = bon.parse(fs.readFileSync("./package.bon", "utf8"));

        if (!appinfo || !appinfo["id"]) {
            console.log("ERROR: package.bon is malformed.");

            return;
        }

        const basename = appinfo["id"].split(".").slice(-1);
        const jam_path = path.join(".", basename + ".jam");

        if (fs.existsSync(jam_path)) {
            fs.unlinkSync(jam_path);
        }

       _compress_folder(".", tmp.tmpNameSync())
            .then((zip_path) => {
                fs.moveSync(zip_path, jam_path);

                installer.install(platform, jam_path);
            })
            .catch((error) => {
                console.log("ERROR: could not generate a package.");
            });
    },

    publish_app: (host, options, ipfs_options, install_urls) => {
        if (!options["file-url"] && !fs.existsSync("./package.bon")) {
            console.log("ERROR: package.bon not found.");

            return;
        }

        const appinfo = bon.parse(fs.readFileSync("./package.bon", "utf8")) || {};

        if (!options["file-url"] && !appinfo) {
            console.log("ERROR: package.bon is malformed.");

            return;
        }

        if (options["language"] && appinfo["localization"]) {
            const localization = appinfo["localization"][options["language"]] || {};

            if (localization["title"]) {
                appinfo["title"] = localization["title"];
            }
        }

        _publish_app(appinfo["id"], options, ipfs_options, (app_url) => {
            _publish_image(options, ipfs_options, (image_url) => {
                const title = options["title"] || appinfo["title"] || "";
                var url = (host["url"] || CONNECT_BASE_URL) + "/connect/app/?"
                        + "app=" + appinfo["id"] + "&" + "url=" + urlencode(app_url)
                        + (title ? "&" + "title=" + urlencode(title) : "")
                        + (appinfo["version"] ? "&" + "version=" + appinfo["version"] : "")
                        + (image_url ? "&" + "image=" + urlencode(image_url) : "")
                        + (host["url"] ? "" : "&" + "host-scheme=" + host["scheme"]);
    
                Object.keys(install_urls).forEach(function(platform) {
                    if (install_urls[platform] !== "auto") {
                        url = url + "&" + platform + "-install-url=" + urlencode(install_urls[platform]);
                    }
                });
    
                if (options["shorten-url"]) {
                    _shorten_url(url, (url) => {
                        console.log(url);
                    });
                } else {
                    console.log(url);
                }
            });
        });
    },

    create_book: (directory, options) => {
        if (fs.existsSync(path.join(directory, "book.bon"))) {
            console.log("ERROR: directory already exists.");

            return;
        }

        template.copy("books", directory, options)
            .then(() => {
                const bon_path = path.resolve(directory, "book.bon");
                const bookinfo = bon.parse(fs.readFileSync(bon_path, "utf8"));
        
                bookinfo["version"] = options["version"];
        
                fs.writeFileSync(bon_path, bon.stringify(bookinfo));        
            })
            .catch((error) => {
                console.log("ERROR: template may not exists.");
            });
    },

    run_book: (platform, shell_options, options) => {
        if (!fs.existsSync("./book.bon")) {
            console.log("ERROR: book.bon not found.");

            return;
        }

        simulator.start(platform, shell_options["port"])
            .then((app_id) => {
                shell.ready(shell_options["host"], shell_options["port"], 60 * 1000) // 1 minute
                    .then(() => { 
                        return shell.open();
                    })
                    .then(() => {
                        return shell.execute("book path resource");
                    })
                    .then((resource_path) => {
                        var needs_open = true;

                        syncfolder.start(platform, app_id, ".", resource_path, options, () => {
                            if (needs_open) {
                                shell.execute("book open");
                                needs_open = false;
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

    build_book: () => {
        if (!fs.existsSync("./book.bon")) {
            console.log("ERROR: book.bon not found.");

            return;
        }

        const basename = path.basename(path.resolve("."))
        const bxp_path = path.join(".", basename + ".bxp");

        if (fs.existsSync(bxp_path)) {
            fs.unlinkSync(bxp_path);
        }

        _compress_folder(".", tmp.tmpNameSync())
            .then((zip_path, bxp_path) => {
                fs.moveSync(zip_path, bxp_path);
            })
            .catch((error) => {
                console.log("ERROR: could not generate a package.");
            });
    },

    install_book: (platform) => {
        if (!fs.existsSync("./book.bon")) {
            console.log("ERROR: book.bon not found.");

            return;
        }

        const basename = path.basename(path.resolve("."))
        const bxp_path = path.join(".", basename + ".bxp");

        if (fs.existsSync(bxp_path)) {
            fs.unlinkSync(bxp_path);
        }

        _compress_folder(".", tmp.tmpNameSync())
            .then((zip_path, bxp_path) => {
                fs.moveSync(zip_path, bxp_path);

                // TBD: What to do?
            })
            .catch((error) => {
                console.log("ERROR: could not generate a package.");
            });
    },

    publish_book: (host, options, ipfs_options, install_urls) => {
        if (!options["file-url"] && !fs.existsSync("./book.bon")) {
            console.log("ERROR: book.bon not found.");

            return;
        }

        const bookinfo = bon.parse(fs.readFileSync("./book.bon", "utf8"));

        if (!options["file-url"] && !bookinfo) {
            console.log("ERROR: book.bon is malformed.");

            return;
        }

        _publish_book(options, (book_url) => {
            _publish_image(options, ipfs_options, (image_url) => {
                const title = options["title"] || appinfo["title"] || "";
                var url = (host["url"] || CONNECT_BASE_URL) + "/connect/book/?"
                        + "book=" + basename + "&" + "url=" + urlencode(book_url)
                        + (title ? "&" + "title=" + urlencode(title) : "")
                        + (bookinfo["version"] ? "&" + "version=" + bookinfo["version"] : "")
                        + (image_url ? "&" + "image=" + urlencode(image_url) : "")
                        + (host["url"] ? "" : "&" + "host-scheme=" + host["scheme"]);
    
                Object.keys(install_urls).forEach((platform) => {
                    if (install_urls[platform] !== "auto") {
                        url = url + "&" + platform + "-install-url=" + urlencode(install_urls[platform]);
                    }
                });
    
                if (options["shorten-url"]) {
                    _shorten_url(url, (url) => {
                        console.log(url);
                    });
                } else {
                    console.log(url);
                }
            });
        });
    },

    generate_database: (target, store, file) => {
        const data = catalog.load_from_spreadsheet(file, store);
        const basedir = path.join("catalogs", target);

        catalog.save_to_file(data[0], path.join(basedir, "catalog.bon"));
        catalog.save_to_database(data[0], data[1], path.join(basedir, "catalog.sqlite"));
    },

    migrate_style: () => {
        if (!fs.existsSync("./package.bon")) {
            console.log("ERROR: package.bon not found.");

            return;
        }

        const basedir = "catalogs";

        glob(basedir + "/**/*.sbss", {}, (error, files) => {
            files.forEach((file) => {
                style.migrate(file);
            });
        });
    },

    compose_native: () => {
        if (!fs.existsSync("./package.bon")) {
            console.log("ERROR: package.bon not found.");
            
            return;
        }

        
    }
}
