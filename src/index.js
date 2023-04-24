#!/usr/bin/env node

const commands = require('./commands'),
      fs       = require('fs-extra');

const { Command } = require('commander');
const program = new Command();

program
    .usage('<command> [argument, ...] [options]')
    .helpOption('-h, --help', 'Show help for command')
    .addHelpCommand(false)
    .on('command:*', ([ command ]) => {
        program.addHelpText('after', "\n" + "Command not found: " + command);
        program.help();
    });

program
    .command('create')
    .description('Create a new project.')
    .argument('<directory>', 'Directory to create a project in')
    .option('-t, --type <type>', 'Type of project to create. `app` or `book`.', 'app')
    .option('--app-id <identifier>', 'Identifier of the app. Specify `manual` to leave blank', 'auto')
    .option('--version <version>', 'Version of the app or book', '1.0')
    .option('--template <template>', 'Template to create from', 'hello-world')
    .option('--repository <repository>', 'Template repository', 'bookjam/jamkit-templates')
    .option('--language <language>', 'Language of the app or book', 'global')
    .option('--theme <theme>', 'Theme for the app or book')
    .action((directory, options) => {
        if (options.type === 'app') {
            commands.create_app(directory, {
                'app-id':     options.appId,
                'version':    options.version,
                'template':   options.template,
                'repository': options.repository,
                'language':   options.language,
                'theme':      options.theme
            }); 

            return;
        }

        if (options.type === 'book') {
            commands.create_book(directory, {
                'version':    options.version,
                'template':   options.template,
                'repository': options.repository,
                'language':   options.language,
                'theme':      options.theme
            }); 

            return;
        }

        console.log('ERROR: invalid type: ' + options.type);
    });

program
    .command('run')
    .description('Run on simulator.')
    .option('-t, --type <type>', 'Type of project to run. `app`, `book` or `auto`.', 'auto')
    .option('--platform <platform>', 'Platform on which to run the simulator. `ios` or `android`', (process.platform === 'darwin') ? 'ios' : 'android')
    .option('--mode <mode>', 'Run mode. `main`, `jam` or `widget`', 'main')
    .option('--shell-host <host>', 'Host for the simulator shell', '127.0.0.1')
    .option('--shell-port <port>', 'Port for the simulator shell', '8888')
    .option('--skip-sync', 'If set, do not copy files to the simulator', false)
    .action((options) => {
        if ((options.type === 'auto' && fs.existsSync('./package.bon')) || options.type === 'app') {
            commands.run_app(options.platform, options.mode, {
                'host': options.shellHost, 
                'port': options.shellPort
            }, {
                'skip-sync': options.skipSync
            });

            return;
        }

        if ((options.type === 'auto' && fs.existsSync('./book.bon')) || options.type === 'book') {
            commands.run_book(options.platform, {
                'host': options.shellHost, 
                'port': options.shellPort
            }, {
                'skip-sync': options.skipSync
            });

            return;
        }

        console.log('ERROR: package.bon or book.bon not found.');
    });

program
    .command('build')
    .description('Build a package.')
    .option('-t, --type <type>', 'Type of project to build. `app`, `book` or `auto`.', 'auto')
    .action((options) => {
        if ((options.type === 'auto' && fs.existsSync('./package.bon')) || options.type === 'app') {
            commands.build_app();

            return;
        }

        if ((options.type === 'auto' && fs.existsSync('./book.bon')) || options.type === 'book') {
            commands.build_book();

            return;
        }

        console.log('ERROR: package.bon or book.bon not found.');
    });

program
    .command('install')
    .description('Install on simulator.')
    .option('-t, --type <type>', 'Type of project to build. `app`, `book` or `auto`.', 'auto')
    .option('--platform <platform>', 'Platform on which to run the simulator. `ios` or `android`', (process.platform === 'darwin') ? 'ios' : 'android')
    .action((options) => {
        if ((options.type === 'auto' && fs.existsSync('./package.bon')) || options.type === 'app') {
            commands.install_app(options.platform);

            return;
        }

        if ((options.type === 'auto' && fs.existsSync('./book.bon')) || options.type === 'book') {
            commands.install_book(options.platform);

            return;
        }

        console.log('ERROR: package.bon or book.bon not found.');
    });

program
    .command('publish')
    .description('Publish a package to IPFS.')
    .option('-t, --type <type>', 'Type of project to run. `app`, `book` or `auto`.', 'auto')
    .option('--host-scheme <scheme>', 'Custom scheme that the host app uses', 'jamkit')
    .option('--host-url <url>', 'URL that run the host app automatically', '')
    .option('--file-url <url>', 'File URL of the app or book', '')
    .option('--image-url <url>', 'Image URL of the app or book', '')
    .option('--image-file <path>', 'File path of the image', '')
    .option('--title <title>', 'Title of the app or book', '')
    .option('--language <language>', 'Language to use', '')
    .option('--ipfs-host <host>', 'IPFS host to connect', 'ipfs.infura.io')
    .option('--ipfs-port <port>', 'IPFS port to connect', '5001')
    .option('--ipfs-protocol <scheme>', 'IPFS protocol to connect. , `https` or `http`', 'https')
    .option('--shorten-url', 'If set, the url will be shortened', '')
    .option('--apple-install-url <url>', 'Installation URL of the host app for iOS', 'auto')
    .option('--google-install-url <url>', 'Installation URL of the host app for Android', 'auto')
    .action((options) => {
        if ((options.type === 'auto' && fs.existsSync('./package.bon')) || options.type === 'app') {
            commands.publish_app({
                'scheme': options.hostScheme,
                'url': options.hostUrl
            }, {
                'title': options.title,
                'file-url': options.fileUrl,
                'image-url': options.imageUrl,
                'image-file': options.imageFile,
                'language': options.language,
                'shorten-url': options.shortenUrl
            }, {
                'host': options.ipfsHost, 
                'port': options.ipfsPort, 
                'protocol': options.ipfsProtocol
            }, {
                'apple': options.appleInstallUrl,
                'google': options.googleInstallUrl
            });

            return;
        }
        
        if ((options.type === 'auto' && fs.existsSync('./book.bon')) || options.type === 'book') {
            commands.publish_book({
                'scheme': options.hostScheme,
                'url': options.hostUrl
            }, {
                'title': options.title,
                'file-url': options.fileUrl,
                'image-url': options.imageUrl,
                'image-file': options.imageFile,
                'shorten-url': options.shortenUrl
            }, {
                'host': options.ipfsHost, 
                'port': options.ipfsPort, 
                'protocol': options.ipfsProtocol
            }, {
                'apple': options.appleInstallUrl,
                'google': options.googleInstallUrl
            });

            return;
        }

        console.log('ERROR: package.bon or book.bon not found.');
    });

program
    .command('database')
    .description('Manage databases.')
        .command('generate')
        .description('Generate a database from an excel file.')
        .argument('<path>', 'Path for an excel file')
        .action((path, options) => {
            if (fs.existsSync('./package.bon')) {
                commands.generate_database("MainApp", "", path);

                return;
            }

            console.log('ERROR: package.bon not found.');
        });

program
    .command('style')
    .description('Manage sbss files.')
        .command('migrate')
        .description('Migrate old style sbss to new style.')
        .action((options) => {
            if (fs.existsSync('./package.bon')) {
                commands.migrate_style();

                return;
            }

            console.log('ERROR: package.bon not found.');
        });

program.parse();
