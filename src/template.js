const download = require('fetch-repo-dir');

module.exports = {
    copy: function(type, destdir, options) {
        return new Promise(function(resolve, reject) {
            var repository = options['repository'] || 'bookjam/jamkit-templates';
            var template = options['template'] || 'hello-world';
            var language = options['language'] || 'global';
            var path = type + '/' + template + '/' + language;

            download({
                src: repository + '/' + path,
                dir: destdir
            })
                .then(function() {
                    resolve();
                })
                .catch(function(error) {
                    reject(error);
                }) 
        });
    }
}
