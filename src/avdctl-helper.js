import fs from "fs";
import path from "path";
import avdctl from "./avdctl.js";

const SDK_VERSION = Number.parseInt(avdctl.getProperty("ro.build.version.sdk"), 10);

const walkDir = (root, dir, handler) => {
    const basePath = path.join(root, dir);

    for (const file of fs.readdirSync(basePath)) {
        const subPath = path.join(dir, file);
        const stat = fs.statSync(path.join(root, subPath));

        handler(subPath, stat);

        if (stat.isDirectory()) {
            walkDir(root, subPath, handler);
        }
    }
}

export default {
    push(src, dest) {
        const stats = fs.statSync(src);

        if (stats.isDirectory()) {
            avdctl.shell(`mkdir ${dest}`);

            walkDir(src, ".", (file, stats) => {
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

    intent(action, url) {
        avdctl.intent(action, url);
    },

    shell(cmd) {
        avdctl.shell(cmd);
    },

    getSdkVersion() {
        return SDK_VERSION;
    }
}
