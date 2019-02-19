const shell = require('shelljs'),
      github_url = 'https://github.com/bookjam/jamkit-templates.git';
    
module.exports = {
    copy : function(type, template, language, path) {
        var svn_path = github_url + '/trunk/' + type + '/' + template + '/' + language;
        var options = '--non-interactive --trust-server-cert';
        var command = 'svn export ' + svn_path + ' ' + path + ' ' + options;

        shell.exec(command, { silent:true });
    }
};
