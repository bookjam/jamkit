import path from "path";
import fs from "fs-extra";
import xcode from "@raydeck/xcode";

import { XMLParser } from "fast-xml-parser";
import { globSync } from "glob";
import walkSync from "walk-sync";

type Platform = "ios" | "android";

interface AppInfo {
    id: string;
    title: string;
    localization?: { [language: string]: { title?: string } };
}

interface XcodeProject {
    filepath: string;
    productName: string;
    parseSync(): XcodeProject;
    getBuildProperty(key: string, config: string): string;
    updateBuildProperty(key: string, value: string): void;
    updateProductName(name: string): void;
    writeSync(): string;
}

const _getAppTitle = (appInfo: AppInfo, language?: string): string => {
    if (language) {
        const localization = appInfo.localization || {};
        const localizedAppInfo = localization[language] || {};

        if (localizedAppInfo.title) {
            return localizedAppInfo.title;
        }
    }

    return appInfo.title;
};

const _getProjectName = (appInfo: AppInfo): string => {
    return appInfo.id.split(".").pop()!;
};

const _getCustomUrlScheme = (appInfo: AppInfo): string => {
    return appInfo.id.split(".").pop()!.toLowerCase();
};

const _replaceWordInFile = (filePath: string, oldWord: string, newWord: string): void => {
    const oldText = fs.readFileSync(filePath, { encoding: "utf8" });
    const newText = oldText.replaceAll(oldWord, newWord);

    if (oldText !== newText) {
        fs.writeFileSync(filePath, newText);
    }
};

interface PlatformImplementation {
    compose(rootDir: string, appInfo: AppInfo, languages: string[]): void;
}

const _impl: Record<Platform, PlatformImplementation> = {
    "ios": {
        compose(rootDir: string, appInfo: AppInfo, languages: string[]): void {
            const project = this._loadXcodeProject(rootDir);
            const oldBundleIdentifier = this._getBundleIdentifier(project);
            const newBundleIdentifier = appInfo.id;

            if (newBundleIdentifier !== oldBundleIdentifier) {
                this._replaceBundleIdentifierInProject(project, oldBundleIdentifier, newBundleIdentifier);
                this._replaceBundleIdentifierInScheme(rootDir, oldBundleIdentifier, newBundleIdentifier);
                this._renameProjectSources(rootDir, newBundleIdentifier);
            }

            this._updateInfoPlist(rootDir, appInfo);
            this._updateAppInfoPlist(rootDir, appInfo);
            this._updateAppIcon(rootDir);
            this._updateLaunchScreen(rootDir);
            this._copyAppSources(rootDir);
        },

        _loadXcodeProject(rootDir: string): XcodeProject {
            const [projectPath] = globSync(`${rootDir}/*.xcodeproj/project.pbxproj`);
            const project = xcode.project(projectPath) as XcodeProject;

            return project.parseSync();
        },

        _getBundleIdentifier(project: XcodeProject): string {
            return project.getBuildProperty("PRODUCT_BUNDLE_IDENTIFIER", '"Distribution Production"')
                .replace("${PRODUCT_NAME}", project.productName)
                .replaceAll('"', "");
        },

        _parseBundleIdentifier(bundleIdentifier: string): [string, string] {
            const bundleIdentifierParts = bundleIdentifier.split(".");
            const productName = bundleIdentifierParts.pop()!;

            return [bundleIdentifierParts.join("."), productName];
        },

        _getProductName(bundleIdentifier: string): string {
            return bundleIdentifier.split(".").pop()!;
        },

        _replaceBundleIdentifierInProject(project: XcodeProject, oldBundleIdentifier: string, newBundleIdentifier: string): void {
            const [oldBundleDomain, oldProductName] = this._parseBundleIdentifier(oldBundleIdentifier);
            const [newBundleDomain, newProductName] = this._parseBundleIdentifier(newBundleIdentifier);

            project.updateBuildProperty("PRODUCT_BUNDLE_IDENTIFIER", `"${newBundleDomain}.\${PRODUCT_NAME}"`);
            project.updateProductName(newProductName);

            const oldText = fs.readFileSync(project.filepath, { encoding: "utf-8" });
            const newText = project.writeSync().replace(
                new RegExp(`(\s*)name = ${oldProductName};`),
                `$1name = ${newProductName};`
            ).replaceAll(
                `${oldProductName}.app`,
                `${newProductName}.app`
            );

            if (oldText !== newText) {
                fs.writeFileSync(project.filepath, newText);
            }
        },

        _replaceBundleIdentifierInScheme(rootDir: string, oldBundleIdentifier: string, newBundleIdentifier: string): void {
            const oldProductName = this._getProductName(oldBundleIdentifier);
            const newProductName = this._getProductName(newBundleIdentifier);
            const [xcschemePath] = globSync(`${rootDir}/*.xcodeproj/xcshareddata/xcschemes/*.xcscheme`);
            const oldText = fs.readFileSync(xcschemePath, { encoding: "utf-8" });
            const newText = oldText.replaceAll(
                `"${oldProductName}"`,
                `"${newProductName}"`
            ).replaceAll(
                `"${oldProductName}.app"`,
                `"${newProductName}.app"`
            ).replaceAll(
                `container:${oldProductName}.xcodeproj`,
                `container:${newProductName}.xcodeproj`
            );

            if (oldText !== newText) {
                fs.writeFileSync(xcschemePath, newText);
            }
        },

        _renameProjectSources(rootDir: string, newBundleIdentifier: string): void {
            // Implementation for renaming project sources
        },

        _updateInfoPlist(rootDir: string, appInfo: AppInfo): void {
            // Implementation for updating Info.plist
        },

        _updateAppInfoPlist(rootDir: string, appInfo: AppInfo): void {
            // Implementation for updating AppInfo.plist
        },

        _updateAppIcon(rootDir: string): void {
            // Implementation for updating app icon
        },

        _updateLaunchScreen(rootDir: string): void {
            // Implementation for updating launch screen
        },

        _copyAppSources(rootDir: string): void {
            // Implementation for copying app sources
        }
    } as any, // Using 'any' to avoid defining all private methods

    "android": {
        compose(rootDir: string, appInfo: AppInfo, languages: string[]): void {
            const oldPackageName = this._getPackageName(rootDir);
            const newPackageName = appInfo.id.toLowerCase();

            if (newPackageName !== oldPackageName) {
                const sourceDirs = [
                    path.join(rootDir, "src"),
                    path.join(rootDir, "res", "layout")
                ];

                for (const sourceDir of sourceDirs) {
                    this._replacePackageNameInSources(sourceDir, oldPackageName, newPackageName);
                }

                this._replacePackageNameInManifest(rootDir, oldPackageName, newPackageName);
                this._renamePackageSources(rootDir, oldPackageName, newPackageName);
            }

            this._updateSettingsGradle(rootDir, appInfo);
            this._update_gradle_properties(rootDir, appInfo);

            this._updateStringResources(rootDir, appInfo);
            for (const language of languages) {
                this._updateStringResources(rootDir, appInfo, language);
            }

            this._updateAppInfoJson(rootDir, appInfo);
            this._updateAppIcon(rootDir);
            this._updateLaunchScreen(rootDir);

            this._copyAppSources(rootDir);
        },

        _getPackageName(rootDir: string): string {
            const manifestPath = path.join(rootDir, "AndroidManifest.xml");
            const text = fs.readFileSync(manifestPath, { encoding: "utf8" });
            const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
            const { manifest } = parser.parse(text);

            return manifest.package;
        },

        // Other Android methods implementation would go here
        // Using 'any' for brevity
    } as any
};

interface NativeModule {
    compose(rootDir: string, platform: Platform, appInfo: AppInfo): void;
}

const native: NativeModule = {
    compose(rootDir: string, platform: Platform, appInfo: AppInfo): void {
        const platformRootDir = path.join(rootDir, "src", platform);
        const languages = ["ko", "ja"];

        _impl[platform].compose(platformRootDir, appInfo, languages);
    }
};

export default native;