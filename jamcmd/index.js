#!/usr/bin/env node
const commands = require('./commands');
var options = require('yargs')
	.usage('Usage: $0 <command> [argument, ...] [--help]')
	.command('create', 'Create a new project.')
	.command('run', 'Run on iOS simulator.')
	.demand(1, 'Command should be provided.')
	.help('help'),
	argv = options.argv,
	command = argv._[0]

if (command === 'create') {
	argv = options.reset()
		.usage('Usage: $0 create <project> [option, ...]')
		.example('$0 create HelloWorld', 'Create a project named HelloWorld')
		.demand(2, 'Project name should be specified.')
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

	commands.createProject(argv._[1], {
		app_id:   argv['app-id'],
		version:  argv['version'],
		template: argv['template'],
		language: argv['language']
	});

	return;
}

if (command === 'run') {
	argv = options.reset()
		.usage('Usage: $0 run')
		.example('$0 run', 'Run on iOS simulator. App must be in the current working directory.')
		.help('help')
		.argv

	commands.runProject();

	return;
}

options.showHelp();
