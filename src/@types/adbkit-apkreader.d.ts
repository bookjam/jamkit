declare module "adbkit-apkreader" {
    interface ApkReader {
        readFile(path: string): Promise<ApkManifestReader>;
        readBuffer(buffer: Buffer): Promise<ApkManifestReader>;
    }

    interface ApkManifestReader {
        readManifest(): Promise<{
            package: string;
            versionName: string;
            versionCode: number;
            [key: string]: any;
        }>;
    }

    function createApkReader(): ApkReader;
    export = createApkReader;
}