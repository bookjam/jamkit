declare module "zip-dir" {
    interface ZipOptions {
        saveTo: string;
        filter?: (path: string, stat: import("fs").Stats) => boolean;
    }

    function zipdir(srcPath: string, options: ZipOptions, callback: (error: Error | null) => void): void;
    export = zipdir;
}