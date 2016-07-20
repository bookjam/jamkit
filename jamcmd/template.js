const shell = require('shelljs'),
	  github_url = 'https://github.com/bookjam/jamkit-templates.git';
    
var template = {

    copy : function(template, language, path) {
		var svn_path = github_url + '/trunk/' + template + '/' + language;
		var command = 'svn export ' + svn_path + ' ' + path;

		shell.exec(command, { silent:true });
    }
};

module.exports = template;

