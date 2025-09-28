declare module "adbkit-apkreader" {
    class ApkReader {
        static open(path: string): Promise<ApkReader>;
        readManifest(): Promise<{
            package: string;
            versionName: string;
            versionCode: number;
            [key: string]: any;
        }>;
    }

    const apkReader: typeof ApkReader;
    export default apkReader;
}