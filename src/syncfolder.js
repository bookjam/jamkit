import chokidar from "chokidar";
import path from "path";
import fs from "fs-extra";
import avdctl from "./avdctl-helper.js";

const _impl = {
    "ios" : {
        sync: function(appId, src, dest) {
            if (fs.existsSync(dest)) {
                fs.removeSync(dest);
            }

            fs.copySync(src, dest);
        },

        copy: function(appId, src, dest) {
            if (!fs.lstatSync(src).isDirectory()) {
                fs.writeFileSync(dest, fs.readFileSync(src));
            } else {
                fs.copySync(src, dest);
            }
        },
    
        remove: function(appId, path) {
            fs.removeSync(path);
        }
    },

    "android" : {
        sync: function(appId, src, dest) {
            const tmpRoot = "/data/local/tmp/jamkit";

            avdctl.shell(`rm -rf ${tmpRoot}`);
            avdctl.push(src, tmpRoot);

            if (avdctl.getSdkVersion() >= 30) {
                avdctl.shell(`rm -rf ${dest}`);
                avdctl.shell(`mkdir ${dest}`);
                avdctl.shell(`cp -rf ${tmpRoot}/* ${dest}`);
            } else {
                avdctl.shell(`run-as ${appId} rm -rf ${dest}`);
                avdctl.shell(`run-as ${appId} mkdir ${dest}`);
                avdctl.shell(`run-as ${appId} cp -rf ${tmpRoot}/* ${dest}`);
            }
        },

        copy: function(appId, src, dest) {
            const tmpRoot = "/data/local/tmp/jamkit";
            const tmpPath = `${tmpRoot}/${path.basename(src)}`;

            avdctl.push(src, tmpPath);

            if (avdctl.getSdkVersion() >= 30) {
                avdctl.shell(`cp -rf ${tmpPath} ${dest}`);
            } else {
                avdctl.shell(`run-as ${appId} cp -rf ${tmpPath} ${dest}`);
            }
        },
        
        remove: function(appId, path) {
            if (avdctl.getSdkVersion() >= 30) {
                avdctl.shell(`rm -rf ${path.replace(/\\/g, "/")}`);
            } else {
                avdctl.shell(`run-as ${appId} rm -rf ${path.replace(/\\/g, "/")}`);
            }
        }
    }
}

export default {
    start(platform, appId, src, dest, options, handler) {
        const watcher = chokidar.watch(src, { ignored: /[\/\\]\./, persistent: true });
        let isReady = false;
        
        watcher
            .on("ready", () => {
                if (!options["skip-sync"]) {
                    _impl[platform].sync(appId, src, dest);
                }

                isReady = true;

                console.log("Done");

                handler();
            })
            .on("add", (file) => {
                if (isReady) {
					const subPath = path.relative(src, file).replace(/\\/g, "/");

                    _impl[platform].copy(appId, file, `${dest}/${subPath}`);

                    handler();
                }
            })
            .on("addDir", (dir) => {
                if (isReady) {
					const subPath = path.relative(src, dir).replace(/\\/g, "/");
					
                    _impl[platform].copy(appId, dir, `${dest}/${subPath}`);

                    handler();
                }
            })
            .on("change", (file, stats) => {
                if (isReady) {
					const subPath = path.relative(src, file).replace(/\\/g, "/");
					
                    _impl[platform].copy(appId, file, `${dest}/${subPath}`);

                    handler();
                }
            })
            .on("unlink", (file) => {
                if (isReady) {
					const subPath = path.relative(src, file).replace(/\\/g, "/");

                    _impl[platform].remove(appId, `${dest}/${subPath}`);

                    handler();
                }
            })
            .on("unlinkDir", (dir) => {
                if (isReady) {
					const subPath = path.relative(src, dir).replace(/\\/g, "/");

                    _impl[platform].remove(appId, `${dest}/${subPath}`);

                    handler();
                }
            });
        
        process.stdout.write("Copying files to the browser. It may takes several minutes... ");
    }
}
