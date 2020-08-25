const shell = require('shelljs')
    
module.exports = {
    copy : function(type, path, options) {
        var github_url = 'https://github.com/' + (options['repository'] || 'bookjam/jamkit-templates') + '.git';
        var github_path = type + '/' + (options['template'] || 'hello-world') + '/' + (options['language'] || 'en')

        if (options['theme']) {
            github_path += '/' + options['theme'];
        }

        var svn_path = github_url + '/trunk/' + github_path;
        var svn_options = '--non-interactive --trust-server-cert';
        var command = 'svn export ' + svn_path + ' ' + path + ' ' + svn_options;

        shell.exec(command, { silent:true });
    }
}
