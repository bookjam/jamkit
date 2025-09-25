// Type declarations for modules without TypeScript definitions

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

declare module 'is-object' {
    function isObject(value: any): value is object;
    export = isObject;
}

declare module 'is-empty-object' {
    function isEmptyObject(value: any): boolean;
    export = isEmptyObject;
}

declare module 'array-extended' {
    interface ArrayExtended {
        union<T>(arr1: T[], arr2: T[]): T[];
        unique<T>(arr: T[]): T[];
    }
    const array: ArrayExtended;
    export = array;
}

declare module 'fetch-repo-dir' {
    function fetchRepoDir(options: any, config?: any): Promise<void>;
    export = fetchRepoDir;
}

declare module 'simctl' {
    const simctl: any;
    export = simctl;
}

declare module 'adbkit-apkreader' {
    function createApkReader(): any;
    export = createApkReader;
}

declare module '@raydeck/xcode' {
    const xcode: any;
    export = xcode;
}