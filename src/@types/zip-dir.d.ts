declare module "zip-dir" {
    interface Options {
        saveTo: string;
        filter?: (path: string, stat: any) => boolean;
    }

    function zipdir(srcPath: string, options: Options, callback: (error: Error | null) => void): void;
    export = zipdir;
}