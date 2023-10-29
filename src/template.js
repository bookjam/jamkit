const download = require("fetch-repo-dir");

module.exports = {
    copy: function(type, destdir, options) {
        return new Promise((resolve, reject) => {
            const repository = options["repository"] || "bookjam/jamkit-templates";
            const template = options["template"] || "hello-world";
            const language = options["language"] || "global";
            const path = type + "/" + template + "/" + language;

            download({
                src: repository + "/" + path,
                dir: destdir
            }, {
                replace: true
            })
                .then(() => {
                    resolve();
                })
                .catch((error) => {
                    reject(error);
                }) 
        });
    }
}
