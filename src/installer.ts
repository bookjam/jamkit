import path from "path";
import avdctl from "./avdctl-helper.js";

type Platform = "ios" | "android";

interface PlatformImplementation {
    install(file: string): void;
}

const _impl: Record<Platform, PlatformImplementation> = {
    "ios": {
        install(file: string): void {
            // iOS installation implementation (currently empty)
        }
    },

    "android": {
        install(file: string): void {
            const tmpRoot = "/data/local/tmp";
            const tmpPath = `${tmpRoot}/${path.basename(file)}`;

            avdctl.shell(`rm -f ${tmpPath}`);
            avdctl.push(file, tmpRoot);
            avdctl.intent("android.intent.action.VIEW", `file://${tmpPath}`);
        }
    }
};

interface InstallerModule {
    install(platform: Platform, file: string): void;
}

const installer: InstallerModule = {
    install(platform: Platform, file: string): void {
        _impl[platform].install(file);
    }
};

export default installer;