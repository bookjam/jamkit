// Additional type overrides to resolve compilation issues

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

declare module 'fetch-repo-dir' {
    function fetchRepoDir(...args: any[]): Promise<void>;
    export = fetchRepoDir;
}

// Global any override for complex legacy modules
declare var __dirname: string;