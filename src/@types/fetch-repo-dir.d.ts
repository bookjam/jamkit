declare module "fetch-repo-dir" {
    interface FetchOptions {
        src: string;
        dir: string;
    }

    interface FetchConfig {
        replace?: boolean;
        [key: string]: any;
    }

    function fetchRepoDir(options: FetchOptions, config?: FetchConfig): Promise<void>;
    export = fetchRepoDir;
}