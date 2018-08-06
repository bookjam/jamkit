#!/usr/bin/env node
const commands = require('./commands'),
      fs       = require('fs-extra');

var options = require('yargs')
    .usage('Usage: $0 <command> [argument, ...] [--help]')
    .command('create', 'Create a new project.')
    .command('run', 'Run on iOS simulator.')
    .command('build', 'Build a package.')
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
                default:'io.jamkit.Sample',
                describe: 'Specify an app identifier.'
            })
            .option('version', { 
                default:'1.0',
                describe: 'Specify a version of app.'
            })
            .option('template', { 
                default:'hello-world',
                describe: 'Specify a template type. See https://github.com/bookjam/jamkit-templates.' 
            })
            .option('language', { 
                default:'en',
                describe: 'Specify a language.' 
            })
            .help('help')
            .argv

        commands.createApp(argv._[1], {
            app_id:   argv['app-id'],
            version:  argv['version'],
            template: argv['template'],
            language: argv['language']
        });

        return;
    }

    if (argv['type'] === 'book') {
        argv = options.reset()
            .usage('Usage: $0 create <name> [option, ...]')
            .example('$0 create HelloWorld', 'Create a book named HelloWorld')
            .demand(2, 'Name should be specified.')
            .option('version', { 
                default:'1.0',
                describe: 'Specify a version of book.'
            })
            .option('template', { 
                default:'hello-world',
                describe: 'Specify a template type. See https://github.com/bookjam/jamkit-templates.' 
            })
            .option('language', { 
                default:'en',
                describe: 'Specify a language.' 
            })
            .help('help')
            .argv

        commands.createBook(argv._[1], {
            version:  argv['version'],
            template: argv['template'],
            language: argv['language']
        });

        return;
    }

    return;
}

if (command === 'run') {
    if ((argv['type'] === 'auto' && fs.existsSync('./package.bon')) || argv['type'] === 'app') {
       argv = options.reset()
            .usage('Usage: $0 run')
            .example('$0 run', 'Run on iOS simulator. App must be in the current working directory.')
            .option('mode', { 
                default:'main',
                describe: 'Specify run mode, main or jam'
            })
            .help('help')
            .argv

        commands.runApp();
    
        return;
    }

    if ((argv['type'] === 'auto' && fs.existsSync('./book.bon')) || argv['type'] === 'book') {
       argv = options.reset()
            .usage('Usage: $0 run')
            .example('$0 run', 'Run on iOS simulator. Book must be in the current working directory.')
            .help('help')
            .argv

        commands.runBook();
    
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

options.showHelp();
