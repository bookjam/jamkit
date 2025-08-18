import path from "path";
import avdctl from "./avdctl-helper.js";

const _impl = {
    "ios" : {
        install(file) {
            
        }
    },

    "android" : {
        install(file) {
            const tmpRoot = "/data/local/tmp";
            const tmpPath = `${tmpRoot}/${path.basename(file)}`;

            avdctl.shell(`rm -f ${tmpPath}`);
            avdctl.push(file, tmpRoot);
            avdctl.intent("android.intent.action.VIEW", `file://${tmpPath}`);
        }
    }
}

export default {
    install(platform, file) {
        _impl[platform].install(file);
    }
}
