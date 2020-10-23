const shell = require('shelljs')
    
module.exports = {
    copy : function(type, path, options) {
        var repository = options['repository'] || 'bookjam/jamkit-templates';
        var template = options['template'] || 'hello-world';
        var language = options['language'] || 'en';
        var github_url = 'https://github.com/' + repository + '.git';
        var github_path = type + '/' + template + '/' + language

        if (options['theme']) {
            github_path += '/' + options['theme'];
        }

        var svn_path = github_url + '/trunk/' + github_path;
        var svn_options = '--non-interactive --trust-server-cert';
        var command = 'svn export ' + svn_path + ' ' + path + ' ' + svn_options;

        shell.exec(command, { silent:true });
    }
}
