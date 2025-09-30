import chokidar from "chokidar";
import path from "path";
import fs from "fs-extra";
import avdctl from "./avdctl-helper.js";

type Platform = "ios" | "android";
type SyncOptions = { skipSync?: boolean };

abstract class FileHandlerBase {
    abstract sync(appId: string, src: string, dest: string): void;
    abstract copy(appId: string, src: string, dest: string): void;
    abstract remove(appId: string, path: string): void;
}

class IOSFileHandler extends FileHandlerBase {
    sync(_appId: string, srcDir: string, destDir: string): void {
        if (fs.existsSync(destDir)) {
            fs.removeSync(destDir);
        }

        fs.copySync(srcDir, destDir, {
            filter: (src) => !src.endsWith(".ts")
        });
    }

    copy(_appId: string, srcPath: string, destPath: string): void {
        if (!fs.lstatSync(srcPath).isDirectory()) {
            fs.writeFileSync(destPath, fs.readFileSync(srcPath));
        } else {
            fs.copySync(srcPath, destPath, {
                filter: (srcPath) => !srcPath.endsWith(".ts")
            });
        }
    }

    remove(_appId: string, path: string): void {
        fs.removeSync(path);
    }
}

class AndroidFileHandler extends FileHandlerBase {
    sync(appId: string, srcDir: string, destDir: string): void {
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
    }

    copy(appId: string, srcPath: string, destPath: string): void {
        const tmpRoot = "/data/local/tmp/jamkit";
        const tmpPath = `${tmpRoot}/${path.basename(srcPath)}`;

        avdctl.push(srcPath, tmpPath);

        if (avdctl.getSdkVersion() >= 30) {
            avdctl.shell(`cp -rf ${tmpPath} ${destPath}`);
        } else {
            avdctl.shell(`run-as ${appId} cp -rf ${tmpPath} ${destPath}`);
        }
    }

    remove(appId: string, path: string): void {
        if (avdctl.getSdkVersion() >= 30) {
            avdctl.shell(`rm -rf ${path.replace(/\\/g, "/")}`);
        } else {
            avdctl.shell(`run-as ${appId} rm -rf ${path.replace(/\\/g, "/")}`);
        }
    }
}

class FileHandlerFactory {
    private static instances: Map<Platform, FileHandlerBase> = new Map();

    static create(platform: Platform): FileHandlerBase {
        if (!this.instances.has(platform)) {
            switch (platform) {
                case "ios":
                    this.instances.set(platform, new IOSFileHandler());
                    break;

                case "android":
                    this.instances.set(platform, new AndroidFileHandler());
                    break;
            }
        }

        return this.instances.get(platform)!;
    }
}

interface SyncFolderModule {
    start(platform: Platform, appId: string, srcDir: string, destDir: string, options: SyncOptions, handler: (event: string, filePath: string) => void): void;
}

const syncfolder: SyncFolderModule = {
    start(platform: Platform, appId: string, srcDir: string, destDir: string, options: SyncOptions, handler: (event: string, filePath: string) => void): void {
        const fileHanderImpl = FileHandlerFactory.create(platform);
        const watcher = chokidar.watch(srcDir, {
            ignored: [
                /(^|[\/\\])\./,
                /\.ts$/
            ],
            persistent: true,
            ignoreInitial: true
        });

        watcher
            .on("ready", () => {
                if (!options.skipSync) {
                    fileHanderImpl.sync(appId, srcDir, destDir);
                }

                console.log("Done");

                handler("ready", srcDir);
            })
            .on("add", (file) => {
                const subPath = path.relative(srcDir, file).replace(/\\/g, "/");

                fileHanderImpl.copy(appId, file, `${destDir}/${subPath}`);

                handler("add", file);
            })
            .on("addDir", (dir) => {
                const subPath = path.relative(srcDir, dir).replace(/\\/g, "/");

                fileHanderImpl.copy(appId, dir, `${destDir}/${subPath}`);

                handler("addDir", dir);
            })
            .on("change", (file) => {
                const subPath = path.relative(srcDir, file).replace(/\\/g, "/");

                fileHanderImpl.copy(appId, file, `${destDir}/${subPath}`);

                handler("change", file);
            })
            .on("unlink", (file) => {
                const subPath = path.relative(srcDir, file).replace(/\\/g, "/");

                fileHanderImpl.remove(appId, `${destDir}/${subPath}`);

                handler("unlink", file);
            })
            .on("unlinkDir", (dir) => {
                const subPath = path.relative(srcDir, dir).replace(/\\/g, "/");

                fileHanderImpl.remove(appId, `${destDir}/${subPath}`);

                handler("unlinkDir", dir);
            });

        process.stdout.write("Copying files to the browser. It may takes several minutes... ");
    }
};

export default syncfolder;