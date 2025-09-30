declare module "xcode" {
    export interface XcodeProject {
        filepath: string;
        productName: string;
        parseSync(): XcodeProject;
        getBuildProperty(key: string, config: string): string;
        updateBuildProperty(key: string, value: string): void;
        updateProductName(name: string): void;
        writeSync(): string;
    }

    function project(path: string): XcodeProject;

    export default { project };
}