import path from "path";
import fs from "fs-extra";
import xcode from "@raydeck/xcode";

import { XMLParser } from "fast-xml-parser";
import { globSync } from "glob";
import walkSync from "walk-sync";

const _getAppTitle = (appInfo, language) => {
    if (language) {
        const localization = appInfo.localization || {};
        const localizedAppInfo = localization[language] || {};

        if (localizedAppInfo.title) {
            return localizedAppInfo.title;
        }
    }

    return appInfo.title;
}

const _getProjectName = (appInfo) => {
    return appInfo.id.split(".").pop();
}

const _getCustomUrlScheme = (appInfo) => {
    return appInfo.id.split(".").pop().toLowerCase();
}

const _replaceWordInFile = (filePath, oldWord, newWord) => {
    const oldText = fs.readFileSync(filePath, { encoding: "utf8" });
    const newText = oldText.replaceAll(oldWord, newWord);
    
    if (oldText !== newText) {
        fs.writeFileSync(filePath, newText);
    }
}

const _impl = {
    "ios": {
        compose(rootDir, appInfo, languages) {
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

        _loadXcodeProject(rootDir) {
            const [ projectPath ] = globSync(`${rootDir}/*.xcodeproj/project.pbxproj`);
            const project = xcode.project(projectPath);
            
            return project.parseSync();
        },

        _getBundleIdentifier(project) {
            return project.getBuildProperty("PRODUCT_BUNDLE_IDENTIFIER", '"Distribution Production"')
                        .replace("${PRODUCT_NAME}", project.productName)
                        .replaceAll('"', "");
        },
        
        _parseBundleIdentifier(bundleIdentifier) {
            const bundleIdentifierParts = bundleIdentifier.split(".");
            const productName = bundleIdentifierParts.pop();

            return [ bundleIdentifierParts.join("."), productName ];
        },

        _getProductName(bundleIdentifier) {
            return bundleIdentifier.split(".").pop();
        },

        _replaceBundleIdentifierInProject(project, oldBundleIdentifier, newBundleIdentifier) {
            const [ oldBundleDomain, oldProductName ] = this._parseBundleIdentifier(oldBundleIdentifier);
            const [ newBundleDomain, newProductName ] = this._parseBundleIdentifier(newBundleIdentifier);

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

        _replaceBundleIdentifierInScheme(rootDir, oldBundleIdentifier, newBundleIdentifier) {
            const oldProductName = this._getProductName(oldBundleIdentifier);
            const newProductName = this._getProductName(newBundleIdentifier);
            const [ xcschemePath ] = globSync(`${rootDir}/*.xcodeproj/xcshareddata/xcschemes/*.xcscheme`);
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

        _renameProjectSources(rootDir, newBundleIdentifier) {
            const newProductName = this._getProductName(newBundleIdentifier);
            const [ xcschemePath ] = globSync(`${rootDir}/*.xcodeproj/xcshareddata/xcschemes/*.xcscheme`);

            if (path.basename(xcschemePath) !== `${newProductName}.xcscheme`) {
                fs.renameSync(xcschemePath, path.join(path.dirname(xcschemePath), `${newProductName}.xcscheme`));
            }

            const [ prefixPath ] = globSync(`${rootDir}/*_Prefix.pch`);

            if (path.basename(prefixPath) !== `${newProductName}_Prefix.pch`) {
                fs.renameSync(prefixPath, path.join(path.dirname(prefixPath), `${newProductName}_Prefix.pch`));
            }

            const [ xcodeprojPath ] = globSync(`${rootDir}/*.xcodeproj`);

            if (path.basename(prefixPath) !== `${newProductName}.xcodeproj`) {
                fs.copySync(xcodeprojPath, path.join(path.dirname(xcodeprojPath), `${newProductName}.xcodeproj`));
                fs.removeSync(xcodeprojPath);
            }
        },

        _updateInfoPlist(rootDir, appInfo) {
            const plistPath = path.join(rootDir, "Info.plist");
            const oldText = fs.readFileSync(plistPath, { encoding: "utf-8" });
            const newText = oldText.replace(
                /<key>CFBundleName<\/key>([\n\s]*)<string>[^<]*<\/string>/,
                `<key>CFBundleName</key>$1<string>${_getProjectName(appInfo)}</string>`
            ).replace(
                /<key>CFBundleDisplayName<\/key>([\n\s]*)<string>[^<]*<\/string>/,
                `<key>CFBundleDisplayName</key>$1<string>${appInfo.title}</string>`
            ).replace(
                /<string>x-jamkit-\$\(PRODUCT_BUNDLE_IDENTIFIER\)<\/string>([\n\s]*)<string>[^<]*<\/string>/,
                `<string>x-jamkit-$(PRODUCT_BUNDLE_IDENTIFIER)</string>$1<string>${_getCustomUrlScheme(appInfo)}</string>`
            );

            if (newText !== oldText) {
                fs.writeFileSync(plistPath, newText);
            }
        },

        _updateAppInfoPlist(rootDir, appInfo) {
            const templatePath = path.join(rootDir, "Resources", ".AppInfo.plist.tmpl");
            let text = fs.readFileSync(templatePath, { encoding: "utf-8" });

            text = text.replace("${APP_ID}", appInfo.id);
            text = text.replace("${APP_TITLE}", appInfo.title);
            text = text.replace("${APP_URL}", ""); // TBD
            text = text.replace("${APP_SHORTURL}", ""); // TBD

            const plistPath = path.join(rootDir, "Resources", "AppInfo.plist");
            fs.writeFileSync(plistPath, text);
        },

        _updateAppIcon(rootDir) {
            const targetDir = path.join(rootDir, "Resources", "Images.xcassets", "AppIcon.appiconset");
            const contentsJsonPath = path.join(targetDir, "Contents.json");
            const contents = JSON.parse(fs.readFileSync(contentsJsonPath, { encoding: "utf-8" }));
            const contentsImages = contents["images"].map(({ filename }) => filename);
            const images = globSync(`${rootDir}/Resources/Images/AppIcon/*.{png,jpg}`);

            images.forEach((image) => {
                const imageName = path.basename(image);

                if (contentsImages.includes(imageName)) {
                    fs.copySync(image, path.join(targetDir, imageName));
                }
            });
        },

        _updateLaunchScreen(rootDir) {
            /* Do nothing */
        },

        _copyAppSources(rootDir) {
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
    },

    "android": {
        compose(rootDir, appInfo, languages) {
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

        _getPackageName(rootDir) {
            const manifestPath = path.join(rootDir, "AndroidManifest.xml");
            const text = fs.readFileSync(manifestPath, { encoding: "utf8" });
            const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
            const { manifest } = parser.parse(text);

            return manifest.package;
        },

        _replacePackageNameInSources(sourceDir, oldPackageName, newPackageName) {
            for (const entry of walkSync.entries(sourceDir)) {
                if (!entry.isDirectory()) {
                    const sourcePath = path.join(sourceDir, entry.relativePath);

                    _replaceWordInFile(sourcePath, oldPackageName, newPackageName);
                }
            }
        },

        _replacePackageNameInManifest(rootDir, oldPackageName, newPackageName) {
            const manifestPath = path.join(rootDir, "AndroidManifest.xml");

            _replaceWordInFile(manifestPath, oldPackageName, newPackageName);
        },

        _renamePackageSources(rootDir, oldPackageName, newPackageName) {
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
        },

        _updateSettingsGradle(rootDir, appInfo) {
            const gradlePath = path.join(rootDir, "settings.gradle");
            const oldText = fs.readFileSync(gradlePath, { encoding: "utf8" });
            const newText = oldText.replace(
                /rootProject\.name\s*=\s*"[^"]*"/, 
                `rootProject.name = "${_getProjectName(appInfo)}"`
            );

            if (oldText !== newText) {
                fs.writeFileSync(gradlePath, newText);
            }
        },

        _update_gradle_properties(rootDir, appInfo) {
            const propertiesPath = path.join(rootDir, "gradle.properties");
            const oldText = fs.readFileSync(propertiesPath, { encoding: "utf8" });
            const newText = oldText.replace(
                /ProductName\s*=\s*[^\n]*/, 
                `ProductName=${_getProjectName(appInfo)}`
            );
            
            if (oldText !== newText) {
                fs.writeFileSync(propertiesPath, newText);
            }
        },

        _updateStringResources(rootDir, appInfo, language) {
            const xmlPath = path.join(rootDir, "res", "values" + (language ? `-${language}` : ""), "strings.xml");

            if (fs.existsSync(xmlPath)) {
                const oldText = fs.readFileSync(xmlPath, { encoding: "utf8" });
                const newText = oldText.replace(
                    /name="app_name">[^<]*</, 
                    `name="app_name">${_getAppTitle(appInfo, language)}<`
                );

                if (oldText !== newText) {
                    fs.writeFileSync(xmlPath, newText);
                }
            }
        },

        _updateAppInfoJson(rootDir, appInfo) {
            const templatePath = path.join(rootDir, "assets", ".AppInfo.json.tmpl");
            let text = fs.readFileSync(templatePath, { encoding: "utf-8" });

            text = text.replace("${APP_ID}", appInfo.id);
            text = text.replace("${APP_TITLE}", appInfo.title);
            text = text.replace("${APP_URL}", ""); // TBD
            text = text.replace("${APP_SHORTURL}", ""); // TBD

            const jsonPath = path.join(rootDir, "assets", "AppInfo.json");
            fs.writeFileSync(jsonPath, text);
        },

        _updateAppIcon(rootDir) {
            const images = globSync(`${rootDir}/images/AppIcon/*.{png,jpg}`);

            this._copyImagesToDrawable(rootDir, images);
        },

        _updateLaunchScreen(rootDir) {
            const images = globSync(`${rootDir}/images/LaunchScreen/*.{png,jpg}`);

            this._copyImagesToDrawable(rootDir, images);
        },

        _copyImagesToDrawable(rootDir, images) {
            const drawableDirs = {
                "@m": "drawable-mdpi",
                "@h": "drawable-hdpi",
                "@x": "drawable-xhdpi",
                "@u": "drawable-xxhdpi"
            }

            images.forEach((image) => {
                const m = path.basename(image).match(/(.+)(@[mhxu])(\.(png|jpg))/);
                const targetDir = path.join(rootDir, "res", drawableDirs[m[2]]);

                fs.copySync(image, path.join(targetDir, `${m[1]}${m[3]}`.replaceAll("-", "_")));
            });
        },

        _copyAppSources(rootDir) {
            const targetDir = path.join(rootDir, "assets", "catalogs");

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
}

export default {
    compose(rootDir, platform, appInfo) {
        const platformRootDir = path.join(rootDir, "src", platform);
        const languages = [ "ko", "ja" ];

        _impl[platform].compose(platformRootDir, appInfo, languages);
    }
}
