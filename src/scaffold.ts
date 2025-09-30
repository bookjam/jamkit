import fetchRepoDir from "fetch-repo-dir";

type ProjectType = "app" | "book";

interface ScaffoldOptions {
    repository?: string;
    template?: string;
    language?: string;
}

interface FetchRepoDirOptions {
    src: string;
    dir: string;
}

interface FetchRepoDirConfig {
    replace: boolean;
}

interface ScaffoldModule {
    generate(type: ProjectType, destdir: string, options: ScaffoldOptions): Promise<void>;
}

const scaffold: ScaffoldModule = {
    async generate(type: ProjectType, destdir: string, options: ScaffoldOptions): Promise<void> {
        const repository = options.repository || "bookjam/jamkit-templates";
        const template = options.template || "hello-world";
        const language = options.language || "global";
        const path = `${type}/${template}/${language}`;

        await fetchRepoDir({
            src: `${repository}/${path}`,
            dir: destdir
        } as FetchRepoDirOptions, {
            replace: true
        } as FetchRepoDirConfig);
    }
};

export default scaffold;