import path from "path";
import fs from "fs-extra";
import xcode, { XcodeProject } from "xcode";

import { XMLParser } from "fast-xml-parser";
import { globSync } from "glob";
import walkSync from "walk-sync";

type Platform = "ios" | "android";

interface AppInfo {
    id: string;
    title: string;
    localization?: { [language: string]: { title?: string } };
}

abstract class PlatformBase {
    abstract compose(rootDir: string, appInfo: AppInfo, languages: string[]): void;

    protected _getAppTitle(appInfo: AppInfo, language?: string): string {
        if (language) {
            const localization = appInfo.localization || {};
            const localizedAppInfo = localization[language] || {};

            if (localizedAppInfo.title) {
                return localizedAppInfo.title;
            }
        }

        return appInfo.title;
    }

    protected _getProjectName(appInfo: AppInfo): string {
        return appInfo.id.split(".").pop()!;
    }

    protected _getCustomUrlScheme(appInfo: AppInfo): string {
        return appInfo.id.split(".").pop()!.toLowerCase();
    }

    protected _replaceWordInFile(filePath: string, oldWord: string, newWord: string): void {
        const oldText = fs.readFileSync(filePath, { encoding: "utf8" });
        const newText = oldText.replaceAll(oldWord, newWord);

        if (oldText !== newText) {
            fs.writeFileSync(filePath, newText);
        }
    }
}

class IOSPlatform extends PlatformBase {
    compose(rootDir: string, appInfo: AppInfo, _languages: string[]): void {
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
    }

    private _loadXcodeProject(rootDir: string): XcodeProject {
        const [projectPath] = globSync(`${rootDir}/*.xcodeproj/project.pbxproj`);
        const project = xcode.project(projectPath) as XcodeProject;

        return project.parseSync();
    }

    private _getBundleIdentifier(project: XcodeProject): string {
        return project.getBuildProperty("PRODUCT_BUNDLE_IDENTIFIER", '"Distribution Production"')
                    .replace("${PRODUCT_NAME}", project.productName)
                    .replaceAll('"', "");
    }

    private _parseBundleIdentifier(bundleIdentifier: string): [string, string] {
        const bundleIdentifierParts = bundleIdentifier.split(".");
        const productName = bundleIdentifierParts.pop()!;

        return [bundleIdentifierParts.join("."), productName];
    }

    private _getProductName(bundleIdentifier: string): string {
        return bundleIdentifier.split(".").pop()!;
    }

    private _replaceBundleIdentifierInProject(project: XcodeProject, oldBundleIdentifier: string, newBundleIdentifier: string): void {
        const [, oldProductName] = this._parseBundleIdentifier(oldBundleIdentifier);
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
    }

    private _replaceBundleIdentifierInScheme(rootDir: string, oldBundleIdentifier: string, newBundleIdentifier: string): void {
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
    }

    private _renameProjectSources(rootDir: string, newBundleIdentifier: string): void {
        const newProductName = this._getProductName(newBundleIdentifier);
        const [xcschemePath] = globSync(`${rootDir}/*.xcodeproj/xcshareddata/xcschemes/*.xcscheme`);

        if (path.basename(xcschemePath) !== `${newProductName}.xcscheme`) {
            fs.renameSync(xcschemePath, path.join(path.dirname(xcschemePath), `${newProductName}.xcscheme`));
        }

        const [prefixPath] = globSync(`${rootDir}/*_Prefix.pch`);

        if (path.basename(prefixPath) !== `${newProductName}_Prefix.pch`) {
            fs.renameSync(prefixPath, path.join(path.dirname(prefixPath), `${newProductName}_Prefix.pch`));
        }

        const [xcodeprojPath] = globSync(`${rootDir}/*.xcodeproj`);

        if (path.basename(prefixPath) !== `${newProductName}.xcodeproj`) {
            fs.copySync(xcodeprojPath, path.join(path.dirname(xcodeprojPath), `${newProductName}.xcodeproj`));
            fs.removeSync(xcodeprojPath);
        }
    }

    private _updateInfoPlist(rootDir: string, appInfo: AppInfo): void {
        const plistPath = path.join(rootDir, "Info.plist");
        const oldText = fs.readFileSync(plistPath, { encoding: "utf-8" });
        const newText = oldText.replace(
            /<key>CFBundleName<\/key>([\n\s]*)<string>[^<]*<\/string>/,
            `<key>CFBundleName</key>$1<string>${this._getProjectName(appInfo)}</string>`
        ).replace(
            /<key>CFBundleDisplayName<\/key>([\n\s]*)<string>[^<]*<\/string>/,
            `<key>CFBundleDisplayName</key>$1<string>${appInfo.title}</string>`
        ).replace(
            /<string>x-jamkit-\$\(PRODUCT_BUNDLE_IDENTIFIER\)<\/string>([\n\s]*)<string>[^<]*<\/string>/,
            `<string>x-jamkit-$(PRODUCT_BUNDLE_IDENTIFIER)</string>$1<string>${this._getCustomUrlScheme(appInfo)}</string>`
        );

        if (newText !== oldText) {
            fs.writeFileSync(plistPath, newText);
        }
    }

    private _updateAppInfoPlist(rootDir: string, appInfo: AppInfo): void {
        const templatePath = path.join(rootDir, "Resources", ".AppInfo.plist.tmpl");
        let text = fs.readFileSync(templatePath, { encoding: "utf-8" });

        text = text.replace("${APP_ID}", appInfo.id);
        text = text.replace("${APP_TITLE}", appInfo.title);
        text = text.replace("${APP_URL}", ""); // TBD
        text = text.replace("${APP_SHORTURL}", ""); // TBD

        const plistPath = path.join(rootDir, "Resources", "AppInfo.plist");
        fs.writeFileSync(plistPath, text);
    }

    private _updateAppIcon(rootDir: string): void {
        const targetDir = path.join(rootDir, "Resources", "Images.xcassets", "AppIcon.appiconset");
        const contentsJsonPath = path.join(targetDir, "Contents.json");
        const contents = JSON.parse(fs.readFileSync(contentsJsonPath, { encoding: "utf-8" }));
        const contentsImages = contents["images"].map(({ filename }: { filename: string }) => filename);
        const images = globSync(`${rootDir}/Resources/Images/AppIcon/*.{png,jpg}`);

        images.forEach((image) => {
            const imageName = path.basename(image);

            if (contentsImages.includes(imageName)) {
                fs.copySync(image, path.join(targetDir, imageName));
            }
        });
    }

    private _updateLaunchScreen(_rootDir: string): void {
        /* Do nothing */
    }

    private _copyAppSources(rootDir: string): void {
        const targetDir = path.join(rootDir, "Resources", "Catalogs.bundle");

        if (fs.existsSync(targetDir)) {
            fs.removeSync(targetDir);
        }

        fs.copySync("catalogs", targetDir);

        for (const entry of walkSync.entries(targetDir)) {
            if ([ ".git" ].includes(path.basename(entry.relativePath))) {
                fs.removeSync(path.join(targetDir, entry.relativePath));
            }
        }
    }
}

class AndroidPlatform extends PlatformBase {
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
    }

    private _getPackageName(rootDir: string): string {
        const manifestPath = path.join(rootDir, "AndroidManifest.xml");
        const text = fs.readFileSync(manifestPath, { encoding: "utf8" });
        const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
        const { manifest } = parser.parse(text);

        return manifest.package;
    }

    private _replacePackageNameInSources(sourceDir: string, oldPackageName: string, newPackageName: string): void {
        for (const entry of walkSync.entries(sourceDir)) {
            if (!entry.isDirectory()) {
                const sourcePath = path.join(sourceDir, entry.relativePath);

                this._replaceWordInFile(sourcePath, oldPackageName, newPackageName);
            }
        }
    }

    private _replacePackageNameInManifest(rootDir: string, oldPackageName: string, newPackageName: string): void {
        const manifestPath = path.join(rootDir, "AndroidManifest.xml");

        this._replaceWordInFile(manifestPath, oldPackageName, newPackageName);
    }

    private _renamePackageSources(rootDir: string, oldPackageName: string, newPackageName: string): void {
        const oldSourceParts = oldPackageName.split(".");
        const newSourceParts = newPackageName.split(".");

        let sourceRootToRemove = path.join(rootDir, "src", oldSourceParts[0]);
        for (let i = 0; i < oldSourceParts.length; ++i) {
            if (oldSourceParts[i] === newSourceParts[i]) {
                sourceRootToRemove = path.join(sourceRootToRemove, oldSourceParts[i + 1]);
            } else {
                break;
            }
        }

        const oldSourcePath = path.join(rootDir, "src", ...oldSourceParts);
        const newSourcePath = path.join(rootDir, "src", ...newSourceParts);

        if (oldSourcePath !== newSourcePath) {
            fs.copySync(oldSourcePath, newSourcePath);
            fs.removeSync(sourceRootToRemove);
        }
    }

    private _updateSettingsGradle(rootDir: string, appInfo: AppInfo): void {
        const gradlePath = path.join(rootDir, "settings.gradle");
        const oldText = fs.readFileSync(gradlePath, { encoding: "utf8" });
        const newText = oldText.replace(
            /rootProject\.name\s*=\s*"[^"]*"/,
            `rootProject.name = "${this._getProjectName(appInfo)}"`
        );

        if (oldText !== newText) {
            fs.writeFileSync(gradlePath, newText);
        }
    }

    private _update_gradle_properties(rootDir: string, appInfo: AppInfo): void {
        const propertiesPath = path.join(rootDir, "gradle.properties");
        const oldText = fs.readFileSync(propertiesPath, { encoding: "utf8" });
        const newText = oldText.replace(
            /ProductName\s*=\s*[^\n]*/,
            `ProductName=${this._getProjectName(appInfo)}`
        );

        if (oldText !== newText) {
            fs.writeFileSync(propertiesPath, newText);
        }
    }

    private _updateStringResources(rootDir: string, appInfo: AppInfo, language?: string): void {
        const xmlPath = path.join(rootDir, "res", "values" + (language ? `-${language}` : ""), "strings.xml");

        if (fs.existsSync(xmlPath)) {
            const oldText = fs.readFileSync(xmlPath, { encoding: "utf8" });
            const newText = oldText.replace(
                /name="app_name">[^<]*</,
                `name="app_name">${this._getAppTitle(appInfo, language)}<`
            );

            if (oldText !== newText) {
                fs.writeFileSync(xmlPath, newText);
            }
        }
    }

    private _updateAppInfoJson(rootDir: string, appInfo: AppInfo): void {
        const templatePath = path.join(rootDir, "assets", ".AppInfo.json.tmpl");
        let text = fs.readFileSync(templatePath, { encoding: "utf-8" });

        text = text.replace("${APP_ID}", appInfo.id);
        text = text.replace("${APP_TITLE}", appInfo.title);
        text = text.replace("${APP_URL}", ""); // TBD
        text = text.replace("${APP_SHORTURL}", ""); // TBD

        const jsonPath = path.join(rootDir, "assets", "AppInfo.json");
        fs.writeFileSync(jsonPath, text);
    }

    private _updateAppIcon(rootDir: string): void {
        const images = globSync(`${rootDir}/images/AppIcon/*.{png,jpg}`);

        this._copyImagesToDrawable(rootDir, images);
    }

    private _updateLaunchScreen(rootDir: string): void {
        const images = globSync(`${rootDir}/images/LaunchScreen/*.{png,jpg}`);

        this._copyImagesToDrawable(rootDir, images);
    }

    private _copyImagesToDrawable(rootDir: string, images: string[]): void {
        const drawableDirs: Record<string, string> = {
            "@m": "drawable-mdpi",
            "@h": "drawable-hdpi",
            "@x": "drawable-xhdpi",
            "@u": "drawable-xxhdpi"
        }

        images.forEach((image) => {
            const m = path.basename(image).match(/(.+)(@[mhxu])(\.(png|jpg))/);
            if (m) {
                const targetDir = path.join(rootDir, "res", drawableDirs[m[2]]);

                fs.copySync(image, path.join(targetDir, `${m[1]}${m[3]}`.replaceAll("-", "_")));
            }
        });
    }

    private _copyAppSources(rootDir: string): void {
        const targetDir = path.join(rootDir, "assets", "catalogs");

        if (fs.existsSync(targetDir)) {
            fs.removeSync(targetDir);
        }

        fs.copySync("catalogs", targetDir);

        for (const entry of walkSync.entries(targetDir)) {
            if ([".git"].includes(path.basename(entry.relativePath))) {
                fs.removeSync(path.join(targetDir, entry.relativePath));
            }
        }
    }
}

class PlatformFactory {
    private static instances: Map<Platform, PlatformBase> = new Map();

    static create(platform: Platform): PlatformBase {
        if (!this.instances.has(platform)) {
            switch (platform) {
                case "ios":
                    this.instances.set(platform, new IOSPlatform());
                    break;

                case "android":
                    this.instances.set(platform, new AndroidPlatform());
                    break;
            }
        }

        return this.instances.get(platform)!;
    }
}

interface NativeModule {
    compose(rootDir: string, platform: Platform, appInfo: AppInfo): void;
}

const native: NativeModule = {
    compose(rootDir: string, platform: Platform, appInfo: AppInfo): void {
        const platformImpl = PlatformFactory.create(platform);
        const platformRootDir = path.join(rootDir, "src", platform);
        const languages = [ "ko", "ja" ];
        
        platformImpl.compose(platformRootDir, appInfo, languages);
    }
};

export default native;
