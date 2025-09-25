// Type declarations for build and packaging tools

declare module 'zip-dir' {
    interface Options {
        saveTo: string;
        filter?: (path: string, stat: any) => boolean;
    }

    function zipdir(srcPath: string, options: Options, callback: (error: Error | null) => void): void;
    export = zipdir;
}

declare module 'ipfs-http-client' {
    export function create(options?: any): Promise<any>;
    export function globSource(basePath: string, pattern: string): any;
}

declare module 'fetch-repo-dir' {
    function fetchRepoDir(options: any, config?: any): Promise<void>;
    export = fetchRepoDir;
}