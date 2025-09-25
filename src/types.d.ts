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
    function fetchRepoDir(options: {
        repository: string;
        directory: string;
        out: string;
        filter?: (file: string) => boolean;
    }): Promise<void>;
    export = fetchRepoDir;
}

declare module 'simctl' {
    interface SimctlResult {
        success: boolean;
        output?: string;
        error?: string;
    }

    interface Simctl {
        list(): Promise<any>;
        install(udid: string, path: string): Promise<SimctlResult>;
        uninstall(udid: string, bundleId: string): Promise<SimctlResult>;
        launch(udid: string, bundleId: string, options?: any): Promise<SimctlResult>;
        terminate(udid: string, bundleId: string): Promise<SimctlResult>;
        openurl(udid: string, url: string): Promise<SimctlResult>;
        create(name: string, deviceType: string, runtime: string): Promise<SimctlResult>;
        delete(udid: string): Promise<SimctlResult>;
        boot(udid: string): Promise<SimctlResult>;
        shutdown(udid: string): Promise<SimctlResult>;
    }

    const simctl: Simctl;
    export = simctl;
}

declare module 'adbkit-apkreader' {
    interface ApkReader {
        readFile(path: string): Promise<any>;
        readBuffer(buffer: Buffer): Promise<any>;
    }

    function createApkReader(): ApkReader;
    export = createApkReader;
}

declare module '@raydeck/xcode' {
    interface XcodeProject {
        parse(callback: (error: Error | null, project?: any) => void): void;
        writeSync(): void;
        addBuildPhase(filePathsArray: string[], type: string, comment?: string): any;
        addSourceFile(path: string, options?: any): any;
        addFramework(fpath: string): any;
        addPbxGroup(options: any, key: string): any;
        pbxProjectSection(): any;
        [key: string]: any;
    }

    interface XcodeModule {
        project(path: string): XcodeProject;
    }

    const xcode: XcodeModule;
    export = xcode;
}