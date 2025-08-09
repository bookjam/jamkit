import fetchRepoDir from "fetch-repo-dir";

export default {
    async copy(type, destdir, options) {
        const repository = options["repository"] || "bookjam/jamkit-templates";
        const template = options["template"] || "hello-world";
        const language = options["language"] || "global";
        const path = `${type}/${template}/${language}`;

        await fetchRepoDir({
            src: `${repository}/${path}`,
            dir: destdir
        }, {
            replace: true
        });
    }
}
