#!/usr/bin/env node
const commands = require('./commands'),
      fs       = require('fs-extra');

var options = require('yargs')
    .usage('Usage: $0 <command> [argument, ...] [--help]')
    .command('create', 'Create a new project.')
    .command('run', 'Run on simulator.')
    .command('build', 'Build a package.')
    .command('publish', 'Publish a package to IPFS.')
    .command('generate', 'Generate a database with a spreadsheet file.')
    .option('type', {
        default:'auto',
        describe: 'Specify a type of project: app or book.'
    })
    .demand(1, 'Command should be provided.')
    .help('help'),
    argv = options.argv,
    command = argv._[0]

if (command === 'create') {
    if (argv['type'] === 'auto' || argv['type'] === 'app') {
        argv = options.reset()
            .usage('Usage: $0 create <name> [option, ...]')
            .example('$0 create HelloWorld', 'Create an app named HelloWorld')
            .demand(2, 'Name should be specified.')
            .option('app-id', { 
                default:'auto',
                describe: 'Specify an app identifier.'
            })
            .option('version', { 
                default: '1.0',
                describe: 'Specify a version of app.'
            })
            .option('template', { 
                default: 'hello-world',
                describe: 'Specify a template type. See https://github.com/bookjam/jamkit-templates.' 
            })
            .option('repository', { 
                default: 'bookjam/jamkit-templates',
                describe: 'Specify a template repository.' 
            })
            .option('language', { 
                default: 'en',
                describe: 'Specify a language.' 
            })
            .help('help')
            .argv

        commands.createApp(argv._[1], {
            'app-id':     argv['app-id'],
            'version':    argv['version'],
            'template':   argv['template'],
            'repository': argv['repository'],
            'language':   argv['language']
        });

        return;
    }

    if (argv['type'] === 'book') {
        argv = options.reset()
            .usage('Usage: $0 create <name> [option, ...]')
            .example('$0 create HelloWorld', 'Create a book named HelloWorld')
            .demand(2, 'Name should be specified.')
            .option('version', { 
                default: '1.0',
                describe: 'Specify a version of book.'
            })
            .option('template', { 
                default: 'hello-world',
                describe: 'Specify a template type. See https://github.com/bookjam/jamkit-templates.' 
            })
            .option('repository', { 
                default: 'bookjam/jamkit-templates',
                describe: 'Specify a template repository.' 
            })
            .option('language', { 
                default: 'en',
                describe: 'Specify a language.' 
            })
            .help('help')
            .argv

        commands.createBook(argv._[1], {
            'version':    argv['version'],
            'template':   argv['template'],
            'repository': argv['repository'],
            'language':   argv['language']
        });

        return;
    }

    return;
}

if (command === 'run') {
    if ((argv['type'] === 'auto' && fs.existsSync('./package.bon')) || argv['type'] === 'app') {
       argv = options.reset()
            .usage('Usage: $0 run [option, ...]')
            .example('$0 run', 'Run on simulator. App must be in the current working directory.')
            .option('platform', {
                default: (process.platform === 'win32') ? 'android' : 'ios',
                describe: 'Specify the platform, ios or android'
            })
            .option('mode', { 
                default: 'main',
                describe: 'Specify the run mode, main or jam'
            })
            .option('shell-host', { 
                default: '127.0.0.1',
                describe: 'Specify the shell host.'
            })
            .option('shell-port', { 
                default: '8888',
                describe: 'Specify the shell port.'
            })
            .help('help')
            .argv

        commands.runApp(argv['platform'], argv['mode'], {
            'host': argv['shell-host'], 
            'port': argv['shell-port']
        });
    
        return;
    }

    if ((argv['type'] === 'auto' && fs.existsSync('./book.bon')) || argv['type'] === 'book') {
       argv = options.reset()
            .usage('Usage: $0 run [option, ...]')
            .example('$0 run', 'Run on simulator. Book must be in the current working directory.')
            .option('platform', {
                default: (process.platform === 'win32') ? 'android' : 'ios',
                describe: 'Specify the platform, ios or android'
            })
            .option('shell-host', { 
                default: '127.0.0.1',
                describe: 'Specify the shell host.'
            })
            .option('shell-port', { 
                default: '8888',
                describe: 'Specify the shell port.'
            })
            .help('help')
            .argv

        commands.runBook(argv['platform'], {
            'host': argv['shell-host'], 
            'port': argv['shell-port']
        });
    
        return;
    }

    if (argv['type'] === 'auto') {
        console.log('ERROR: package.bon or book.bon not found!');

        return;
    }

    return;
}

if (command === 'build') {
    if ((argv['type'] === 'auto' && fs.existsSync('./package.bon')) || argv['type'] === 'app') {
        argv = options.reset()
            .usage('Usage: $0 build')
            .example('$0 build', 'Build a package. App must be in the current working directory.')
            .help('help')
            .argv

        commands.buildApp();

        return;
    }

    if ((argv['type'] === 'auto' && fs.existsSync('./book.bon')) || argv['type'] === 'book') {
        argv = options.reset()
            .usage('Usage: $0 build')
            .example('$0 build', 'Build a package. Book must be in the current working directory.')
            .help('help')
            .argv

        commands.buildBook();

        return;
    }

    if (argv['type'] === 'auto') {
        console.log('ERROR: package.bon or book.bon not found!');

        return;
    }

    return;
}

if (command === 'publish') {
    if ((argv['type'] === 'auto' && fs.existsSync('./package.bon')) || argv['type'] === 'app') {
        argv = options.reset()
            .usage('Usage: $0 publish [option, ...]')
            .example('$0 publish', 'Publish a package to IPFS. App must be in the current working directory.')
            .option('host-scheme', {
                default: 'jamkit',
                describe: 'Specify the custom scheme that the host app uses.'
            })
            .option('host-url', {
                default: '',
                describe: 'Specify the url that run the host app automatically.'
            })
            .option('title', {
                default: '',
                describe: 'Specify the title of the app.'
            })
            .option('image-url', {
                default: '',
                describe: 'Specify the image url of the app.'
            })
            .option('app-url', {
                default: '',
                describe: 'Specify the url of the app.'
            })
            .option('ipfs-host', { 
                default: 'ipfs.infura.io',
                describe: 'Specify the ipfs host.'
            })
            .option('ipfs-port', { 
                default: '5001',
                describe: 'Specify the ipfs port.'
            })
            .option('ipfs-protocol', { 
                default: 'https',
                describe: 'Specify the ipfs protocol, https or http.'
            })
            .option('apple-install-url', {
                default: 'auto',
                describe: 'Specify the install url for iOS.'
            })
            .option('google-install-url', {
                default: 'auto',
                describe: 'Specify the install url for Android.'
            })
            .help('help')
            .argv

        commands.publishApp({
            'scheme':argv['host-scheme'],
            'url':argv['host-url']
        }, {
            'title':argv['title'],
            'image-url':argv['image-url'],
            'app-url':argv['app-url']
        }, {
            'host': argv['ipfs-host'], 
            'port': argv['ipfs-port'], 
            'protocol': argv['ipfs-protocol']
        }, {
            'apple': argv['apple-install-url'],
            'google': argv['google-install-url']
        });

        return;
    }

    if ((argv['type'] === 'auto' && fs.existsSync('./book.bon')) || argv['type'] === 'book') {
        argv = options.reset()
            .usage('Usage: $0 publish [option, ...]')
            .example('$0 publish', 'Publish a package to IPFS. Book must be in the current working directory.')
            .option('host-scheme', {
                default: 'jamkit',
                describe: 'Specify the custom scheme that the host app uses.'
            })
            .option('host-url', {
                default: '',
                describe: 'Specify the url that run the host app automatically.'
            })
            .option('title', {
                default: '',
                describe: 'Specify the title of the book.'
            })
            .option('image-url', {
                default: '',
                describe: 'Specify the image url of the book.'
            })
            .option('app-url', {
                default: '',
                describe: 'Specify the url of the app.'
            })
            .option('ipfs-host', { 
                default: 'ipfs.infura.io',
                describe: 'Specify the ipfs host.'
            })
            .option('ipfs-port', { 
                default: '5001',
                describe: 'Specify the ipfs port.'
            })
            .option('ipfs-protocol', { 
                default: 'https',
                describe: 'Specify the ipfs protocol, https or http.'
            })
            .option('apple-install-url', {
                default: 'auto',
                describe: 'Specify the install url for iOS.'
            })
            .option('google-install-url', {
                default: 'auto',
                describe: 'Specify the install url for Android.'
            })
            .help('help')
            .argv

        commands.publishBook({
            'scheme':argv['host-scheme'],
            'url':argv['host-url']
        }, {
            'title':argv['title'],
            'image-url':argv['image-url'],
            'app-url':argv['app-url']
        }, {
            'host': argv['ipfs-host'], 
            'port': argv['ipfs-port'], 
            'protocol': argv['ipfs-protocol']
        }, {
            'apple': argv['apple-install-url'],
            'google': argv['google-install-url']
        });

        return;
    }

    if (argv['type'] === 'auto') {
        console.log('ERROR: package.bon or book.bon not found!');

        return;
    }

    return;
}

if (command === 'generate') {
    argv = options.reset()
        .usage('Usage: $0 generate <file> [option, ...]')
        .example('$0 generate data.xlsx', 'Generate a database with a file named data.xlsx.')
        .demand(2, 'File should be specified.')
        .option('catalog', { 
            default: 'MainApp',
            describe: 'Specify the catalog in which the database will be generated.'
        })
        .option('store', { 
            default: 'apple',
            describe: 'Specify the target store.'
        })
        .help('help')
        .argv

    commands.generateDatabase(argv['catalog'], argv['store'], argv._[1]);

    return;
}

options.showHelp();
