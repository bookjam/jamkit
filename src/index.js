#!/usr/bin/env node

const commands = require("./commands"),
      fs       = require("fs-extra");

const { Command } = require("commander");
const program = new Command();

program.name("jamkit")
    .usage("<command> [argument, ...] [options]")
    .helpOption("-h, --help", "Show help for command")
    .addHelpCommand(false)
    .on("command:*", ([ command ]) => {
        program.addHelpText("after", "\n" + "Command not found: " + command);
        program.help();
    });

program.command("create")
    .description("Create a new project.")
    .argument("<directory>", "Directory where the project will be created")
    .option("-t, --type <type>", "Type of project to create: `app` or `book`.", "app")
    .option("--app-id <identifier>", "Identifier of the app. Use `manual` to leave it blank", "auto")
    .option("--version <version>", "Version of the app or book", "1.0")
    .option("--template <template>", "Template to create from", "hello-world")
    .option("--repository <repository>", "Template repository", "bookjam/jamkit-templates")
    .option("--language <language>", "Language of the app or book", "global")
    .option("--theme <theme>", "Theme for the app or book")
    .action((directory, options) => {
        if (options.type === "app") {
            commands.create_app(directory, {
                "app-id":     options.appId,
                "version":    options.version,
                "template":   options.template,
                "repository": options.repository,
                "language":   options.language,
                "theme":      options.theme
            }); 

            return;
        }

        if (options.type === "book") {
            commands.create_book(directory, {
                "version":    options.version,
                "template":   options.template,
                "repository": options.repository,
                "language":   options.language,
                "theme":      options.theme
            }); 

            return;
        }

        console.log("ERROR: invalid type: " + options.type);
    });

program.command("run")
    .description("Run on simulator.")
    .option("-t, --type <type>", "Specify project type: `app`, `book`, or `auto`", "auto")
    .option("--platform <platform>", "Specify the platform to run the simulator: `ios` or `android`", (process.platform === "darwin") ? "ios" : "android")
    .option("--mode <mode>", "Specify the run mode: `main`, `jam`, or `widget`", "main")
    .option("--shell-host <host>", "Specify the host for the simulator shell", "127.0.0.1")
    .option("--shell-port <port>", "Specify the port for the simulator shell", "8888")
    .option("--skip-sync", "If set, do not copy files to the simulator", false)
    .action((options) => {
        if ((options.type === "auto" && fs.existsSync("./package.bon")) || options.type === "app") {
            commands.run_app(options.platform, options.mode, {
                "host": options.shellHost, 
                "port": options.shellPort
            }, {
                "skip-sync": options.skipSync
            });

            return;
        }

        if ((options.type === "auto" && fs.existsSync("./book.bon")) || options.type === "book") {
            commands.run_book(options.platform, {
                "host": options.shellHost, 
                "port": options.shellPort
            }, {
                "skip-sync": options.skipSync
            });

            return;
        }

        console.log("ERROR: package.bon or book.bon not found.");
    });

program.command("build")
    .description("Build a package.")
    .option("-t, --type <type>", "Specify the project type to build: `app`, `book`, or `auto`.", "auto")
    .action((options) => {
        if ((options.type === "auto" && fs.existsSync("./package.bon")) || options.type === "app") {
            commands.build_app();

            return;
        }

        if ((options.type === "auto" && fs.existsSync("./book.bon")) || options.type === "book") {
            commands.build_book();

            return;
        }

        console.log("ERROR: package.bon or book.bon not found.");
    });

program.command("install")
    .description("Install on simulator.")
    .option("-t, --type <type>", "Specify the project type to install: `app`, `book`, or `auto`", "auto")
    .option("--platform <platform>", "Specify the platform for the simulator: `ios` or `android`", (process.platform === "darwin") ? "ios" : "android")
    .action((options) => {
        if ((options.type === "auto" && fs.existsSync("./package.bon")) || options.type === "app") {
            commands.install_app(options.platform);

            return;
        }

        if ((options.type === "auto" && fs.existsSync("./book.bon")) || options.type === "book") {
            commands.install_book(options.platform);

            return;
        }

        console.log("ERROR: package.bon or book.bon not found.");
    });

program.command("publish")
    .description("Publish a package to IPFS.")
    .option("-t, --type <type>", "Specify the project type to publish: `app`, `book`, or `auto`", "auto")
    .option("--host-scheme <scheme>", "Custom scheme used by the host app", "jamkit")
    .option("--host-url <url>", "URL to automatically run the host app", "")
    .option("--file-url <url>", "File URL of the app or book", "")
    .option("--image-url <url>", "Image URL of the app or book", "")
    .option("--image-file <path>", "File path of the image", "")
    .option("--title <title>", "Title of the app or book", "")
    .option("--language <language>", "Language to use", "")
    .option("--ipfs-host <host>", "IPFS host to connect", "ipfs.infura.io")
    .option("--ipfs-port <port>", "IPFS port to connect", "5001")
    .option("--ipfs-protocol <scheme>", "IPFS protocol to use: `https` or `http`", "https")
    .option("--shorten-url", "If set, the url will be shortened", "")
    .option("--apple-install-url <url>", "Installation URL of the host app for iOS", "auto")
    .option("--google-install-url <url>", "Installation URL of the host app for Android", "auto")
    .action((options) => {
        if ((options.type === "auto" && fs.existsSync("./package.bon")) || options.type === "app") {
            commands.publish_app({
                "scheme": options.hostScheme,
                "url": options.hostUrl
            }, {
                "title": options.title,
                "file-url": options.fileUrl,
                "image-url": options.imageUrl,
                "image-file": options.imageFile,
                "language": options.language,
                "shorten-url": options.shortenUrl
            }, {
                "host": options.ipfsHost, 
                "port": options.ipfsPort, 
                "protocol": options.ipfsProtocol
            }, {
                "apple": options.appleInstallUrl,
                "google": options.googleInstallUrl
            });

            return;
        }
        
        if ((options.type === "auto" && fs.existsSync("./book.bon")) || options.type === "book") {
            commands.publish_book({
                "scheme": options.hostScheme,
                "url": options.hostUrl
            }, {
                "title": options.title,
                "file-url": options.fileUrl,
                "image-url": options.imageUrl,
                "image-file": options.imageFile,
                "shorten-url": options.shortenUrl
            }, {
                "host": options.ipfsHost, 
                "port": options.ipfsPort, 
                "protocol": options.ipfsProtocol
            }, {
                "apple": options.appleInstallUrl,
                "google": options.googleInstallUrl
            });

            return;
        }

        console.log("ERROR: package.bon or book.bon not found.");
    });


const database = program.command("database")
                        .description("Manage databases.")
                        .on("command:*", ([ command ]) => {
                            database.addHelpText("after", "\n" + "Command not found: " + command);
                            database.help();
                        });
            
database.command("generate")
    .description("Generate a database using data from an Excel file.")
    .argument("<path>", "Specify the file path of the Excel document")
    .action((path, options) => {
        if (fs.existsSync("./package.bon")) {
            commands.generate_database("MainApp", "", path);

            return;
        }

        console.log("ERROR: package.bon not found.");
    });


const style = program.command("style")
                    .description("Manage sbss files.")
                    .on("command:*", ([ command ]) => {
                        style.addHelpText("after", "\n" + "Command not found: " + command);
                        style.help();
                    });

style.command("migrate")
    .description("Migrate old style sbss to new style.")
    .action((options) => {
        commands.migrate_style();
    });


const native = program.command("native")
                    .description("Manage native apps.")
                    .on("command:*", ([ command ]) => {
                        style.addHelpText("after", "\n" + "Command not found: " + command);
                        style.help();
                    });

native.command("compose")
    .description("Combine native code with your app's codebase.")
    .argument("<path>", "Specify the path for the native code")
    .option("--platform <platform>", "Specify the platform for the native code: `ios`, `android` or `all`", "all")
    .action((path, options) => {
        const platforms = options.platform === "all" ? [ "ios", "android"] : [ options.platform ];

        commands.compose_native(path, platforms);
    });

program.parse();
