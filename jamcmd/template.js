const shell = require('shelljs')
    
module.exports = {
    copy : function(type, repository, template, language, path) {
        var github_url = 'https://github.com/' + repository + '.git';
        var svn_path = github_url + '/trunk/' + type + '/' + template + '/' + language;
        var options = '--non-interactive --trust-server-cert';
        var command = 'svn export ' + svn_path + ' ' + path + ' ' + options;

        shell.exec(command, { silent:true });
    }
};
