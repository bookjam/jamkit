import path from "path";
import avdctl from "./avdctl-helper.js";

type Platform = "ios" | "android";

abstract class Installer {
    abstract install(file: string): void;
}

class IOSInstaller extends Installer {
    install(_file: string): void {
        // iOS installation implementation (currently empty)
    }
}

class AndroidInstaller extends Installer {
    install(file: string): void {
        const tmpRoot = "/data/local/tmp";
        const tmpPath = `${tmpRoot}/${path.basename(file)}`;

        avdctl.shell(`rm -f ${tmpPath}`);
        avdctl.push(file, tmpRoot);
        avdctl.intent("android.intent.action.VIEW", `file://${tmpPath}`);
    }
}

class InstallerFactory {
    private static instances: Map<Platform, Installer> = new Map();

    static create(platform: Platform): Installer {
        if (!this.instances.has(platform)) {
            switch (platform) {
                case "ios":
                    this.instances.set(platform, new IOSInstaller());
                    break;

                case "android":
                    this.instances.set(platform, new AndroidInstaller());
                    break;
            }
        }

        return this.instances.get(platform)!;
    }
}

interface InstallerModule {
    install(platform: Platform, file: string): void;
}

const installer: InstallerModule = {
    install(platform: Platform, file: string): void {
        const installerImpl = InstallerFactory.create(platform);
        installerImpl.install(file);
    }
};

export default installer;