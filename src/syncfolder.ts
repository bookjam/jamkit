import chokidar from "chokidar";
import path from "path";
import fs from "fs-extra";
import avdctl from "./avdctl-helper.js";
import TypescriptWatcher from "./typescript/watcher.js";

type Platform = "ios" | "android";
type SyncOptions = { "skip-sync"?: boolean };

interface PlatformImplementation {
    sync(appId: string, src: string, dest: string): void;
    copy(appId: string, src: string, dest: string): void;
    remove(appId: string, path: string): void;
}

const _impl: Record<Platform, PlatformImplementation> = {
    "ios": {
        sync: function(appId: string, srcDir: string, destDir: string): void {
            if (fs.existsSync(destDir)) {
                fs.removeSync(destDir);
            }

            fs.copySync(srcDir, destDir, {
                filter: (src) => !src.endsWith(".ts")
            });
        },

        copy: function(appId: string, srcPath: string, destPath: string): void {
            if (!fs.lstatSync(srcPath).isDirectory()) {
                fs.writeFileSync(destPath, fs.readFileSync(srcPath));
            } else {
                fs.copySync(srcPath, destPath, {
                    filter: (srcPath) => !srcPath.endsWith(".ts")
                });
            }
        },

        remove: function(appId: string, path: string): void {
            fs.removeSync(path);
        }
    },

    "android": {
        sync: function(appId: string, srcDir: string, destDir: string): void {
            const tmpRoot = "/data/local/tmp/jamkit";

            avdctl.shell(`rm -rf ${tmpRoot}`);
            avdctl.push(srcDir, tmpRoot);

            if (avdctl.getSdkVersion() >= 30) {
                avdctl.shell(`rm -rf ${destDir}`);
                avdctl.shell(`mkdir ${destDir}`);
                avdctl.shell(`cp -rf ${tmpRoot}/* ${destDir}`);
            } else {
                avdctl.shell(`run-as ${appId} rm -rf ${destDir}`);
                avdctl.shell(`run-as ${appId} mkdir ${destDir}`);
                avdctl.shell(`run-as ${appId} cp -rf ${tmpRoot}/* ${destDir}`);
            }
        },

        copy: function(appId: string, srcPath: string, destPath: string): void {
            const tmpRoot = "/data/local/tmp/jamkit";
            const tmpPath = `${tmpRoot}/${path.basename(srcPath)}`;

            avdctl.push(srcPath, tmpPath);

            if (avdctl.getSdkVersion() >= 30) {
                avdctl.shell(`cp -rf ${tmpPath} ${destPath}`);
            } else {
                avdctl.shell(`run-as ${appId} cp -rf ${tmpPath} ${destPath}`);
            }
        },

        remove: function(appId: string, path: string): void {
            if (avdctl.getSdkVersion() >= 30) {
                avdctl.shell(`rm -rf ${path.replace(/\\/g, "/")}`);
            } else {
                avdctl.shell(`run-as ${appId} rm -rf ${path.replace(/\\/g, "/")}`);
            }
        }
    }
};

interface SyncFolderModule {
    start(platform: Platform, appId: string, srcDir: string, destDir: string, options: SyncOptions, handler: () => void): void;
}

const syncfolder: SyncFolderModule = {
    start(platform: Platform, appId: string, srcDir: string, destDir: string, options: SyncOptions, handler: () => void): void {
        const watcher = chokidar.watch(srcDir, { 
            ignored: [ 
                /(^|[\/\\])\./,
                /\.ts$/
            ],
            persistent: true,
            ignoreInitial: true
        });
        let isReady = false;

        const tsWatcher = new TypescriptWatcher({
            outputDir: srcDir,
            compilerOptions: {
                target: undefined,
                module: undefined,
                sourceMap: true,
                removeComments: true
            },
            onCompileSuccess: (tsFile, jsFile) => {
                if (isReady) {
                    const subPath = path.relative(srcDir, jsFile).replace(/\\/g, "/");
                    _impl[platform].copy(appId, jsFile, `${destDir}/${subPath}`);
                    handler();
                }
            },
            onCompileError: (tsFile, errors) => {
                console.error(`Typescript compilation failed for ${tsFile}:`, errors);
            },
            onRemove: (tsFile, jsFile) => {
                if (isReady) {
                    const subPath = path.relative(srcDir, jsFile).replace(/\\/g, "/");
                    _impl[platform].remove(appId, `${destDir}/${subPath}`);
                    handler();
                }
            }
        });

        tsWatcher.start(srcDir);

        watcher
            .on("ready", async () => {
                if (!options["skip-sync"]) {
                    _impl[platform].sync(appId, srcDir, destDir);

                    await tsWatcher.compileAll();
                }

                isReady = true;

                console.log("Done");

                handler();
            })
            .on("add", (file) => {
                if (isReady) {
                    const subPath = path.relative(srcDir, file).replace(/\\/g, "/");

                    _impl[platform].copy(appId, file, `${destDir}/${subPath}`);

                    handler();
                }
            })
            .on("addDir", (dir) => {
                if (isReady) {
                    const subPath = path.relative(srcDir, dir).replace(/\\/g, "/");

                    _impl[platform].copy(appId, dir, `${destDir}/${subPath}`);

                    handler();
                }
            })
            .on("change", (file, stats) => {
                if (isReady) {
                    const subPath = path.relative(srcDir, file).replace(/\\/g, "/");

                    _impl[platform].copy(appId, file, `${destDir}/${subPath}`);

                    handler();
                }
            })
            .on("unlink", (file) => {
                if (isReady) {
                    const subPath = path.relative(srcDir, file).replace(/\\/g, "/");

                    _impl[platform].remove(appId, `${destDir}/${subPath}`);

                    handler();
                }
            })
            .on("unlinkDir", (dir) => {
                if (isReady) {
                    const subPath = path.relative(srcDir, dir).replace(/\\/g, "/");

                    _impl[platform].remove(appId, `${destDir}/${subPath}`);

                    handler();
                }
            });

        process.stdout.write("Copying files to the browser. It may takes several minutes... ");
    }
};

export default syncfolder;