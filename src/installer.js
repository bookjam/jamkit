import path from "path";
import avdctl from "./avdctl-helper.js";

const _impl = {
    "ios" : {
        install(file) {
            
        }
    },

    "android" : {
        install(file) {
            const tmproot = "/data/local/tmp";
            const tmpfile = `${tmproot}/${path.basename(file)}`;

            avdctl.shell(`rm -f ${tmpfile}`);
            avdctl.push(file, tmproot);
            avdctl.intent("android.intent.action.VIEW", `file://${tmpfile}`);
        }
    }
}

export default {
    install(platform, file) {
        _impl[platform].install(file);
    }
}
