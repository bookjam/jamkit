// Type declarations for mobile development tools

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