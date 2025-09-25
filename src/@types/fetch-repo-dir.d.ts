declare module "fetch-repo-dir" {
    function fetchRepoDir(options: any, config?: any): Promise<void>;
    export = fetchRepoDir;
}