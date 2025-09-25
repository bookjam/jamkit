import fs from "fs";
import path from "path";
import avdctl from "./avdctl.js";

const SDK_VERSION = Number.parseInt(avdctl.getProperty("ro.build.version.sdk") || "0", 10);

type WalkDirHandler = (file: string, stats: fs.Stats) => void;

const walkDir = (root: string, dir: string, handler: WalkDirHandler): void => {
    const basePath = path.join(root, dir);

    for (const file of fs.readdirSync(basePath)) {
        const subPath = path.join(dir, file);
        const stat = fs.statSync(path.join(root, subPath));

        handler(subPath, stat);

        if (stat.isDirectory()) {
            walkDir(root, subPath, handler);
        }
    }
};

interface AvdctlHelperModule {
    push(src: string, dest: string): void;
    intent(action: string, url: string): void;
    shell(cmd: string): void;
    getSdkVersion(): number;
}

const avdctlHelper: AvdctlHelperModule = {
    push(src: string, dest: string): void {
        const stats = fs.statSync(src);

        if (stats.isDirectory()) {
            avdctl.shell(`mkdir ${dest}`);

            walkDir(src, ".", (file: string, stats: fs.Stats) => {
                const subpath = file.replace(/\\/g, "/");

                if (stats.isDirectory()) {
                    avdctl.shell(`mkdir ${dest}/${subpath}`);
                } else {
                    avdctl.push(path.join(src, file), `${dest}/${subpath}`);
                }
            });
        } else {
            avdctl.push(src, dest);
        }
    },

    intent(action: string, url: string): void {
        avdctl.intent(action, url);
    },

    shell(cmd: string): void {
        avdctl.shell(cmd);
    },

    getSdkVersion(): number {
        return SDK_VERSION;
    }
};

export default avdctlHelper;