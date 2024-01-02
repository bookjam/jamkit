const path  = require("path"),
      fs    = require("fs-extra"),
      xcode = require("@raydeck/xcode");

const { XMLParser } = require("fast-xml-parser");
const { globSync } = require("glob");
const walkSync = require("walk-sync");

function _get_app_title(appinfo, language) {
    if (language) {
        const localization = appinfo.localization || {};
        const localized_appinfo = localization[language] || {};

        if (localized_appinfo.title) {
            return localized_appinfo.title;
        }
    }

    return appinfo.title;
}

function _replace_word_in_file(file_path, old_word, new_word) {
    const old_text = fs.readFileSync(file_path, { encoding: "utf8" });
    const new_text = old_text.replaceAll(old_word, new_word);
    
    if (old_text !== new_text) {
        fs.writeFileSync(file_path, new_text);
    }
}

const _impl = {
    "ios": {
        compose: function(rootdir, appinfo, languages) {
            const project = this._load_xcode_project(rootdir);
            const old_bundle_identifier = this._get_bundle_identifier(project);
            const new_bundle_identifier = appinfo.id;

            if (new_bundle_identifier !== old_bundle_identifier) {
                this._replace_bundle_identifier_in_project(project, old_bundle_identifier, new_bundle_identifier);
                this._replace_bundle_identifier_in_scheme(rootdir, old_bundle_identifier, new_bundle_identifier);
                this._rename_project_sources(rootdir, new_bundle_identifier);
            }

            this._update_info_plist(rootdir, appinfo);
            this._update_app_info_plist(rootdir, appinfo);
            this._update_app_icon(rootdir);
            this._update_launch_screen(rootdir);

            this._copy_app_sources(rootdir);
        },

        _load_xcode_project: function(rootdir) {
            const [ project_path ] = globSync(`${rootdir}/*.xcodeproj/project.pbxproj`);
            const project = xcode.project(project_path);
            
            return project.parseSync();
        },

        _get_bundle_identifier: function(project) {
            return project.getBuildProperty("PRODUCT_BUNDLE_IDENTIFIER", '"Distribution Production"')
                        .replace("${PRODUCT_NAME}", project.productName)
                        .replaceAll('"', "");
        },
        
        _parse_bundle_identifier: function(bundle_identifier) {
            const bundle_identifier_parts = bundle_identifier.split(".");
            const product_name = bundle_identifier_parts.pop();

            return [ bundle_identifier_parts.join("."), product_name ];
        },

        _get_product_name: function(bundle_identifier) {
            return bundle_identifier.split(".").pop();
        },

        _get_custom_url_scheme: function(bundle_identifier) {
            return bundle_identifier.split(".").pop().toLowerCase();
        },

        _replace_bundle_identifier_in_project: function(project, old_bundle_identifier, new_bundle_identifier) {
            const [ old_bundle_domain, old_product_name ] = this._parse_bundle_identifier(old_bundle_identifier);
            const [ new_bundle_domain, new_product_name ] = this._parse_bundle_identifier(new_bundle_identifier);

            project.updateBuildProperty("PRODUCT_BUNDLE_IDENTIFIER", `"${new_bundle_domain}.\${PRODUCT_NAME}"`);
            project.updateProductName(new_product_name);

            const old_text = fs.readFileSync(project.filepath, { encoding: "utf-8" });
            const new_text = project.writeSync().replace(
                new RegExp(`(\s*)name = ${old_product_name};`),
                `$1name = ${new_product_name};`
            ).replaceAll(
                `${old_product_name}.app`,
                `${new_product_name}.app`
            );

            if (old_text !== new_text) {
                fs.writeFileSync(project.filepath, new_text);
            }
        },

        _replace_bundle_identifier_in_scheme: function(rootdir, old_bundle_identifier, new_bundle_identifier) {
            const old_product_name = this._get_product_name(old_bundle_identifier);
            const new_product_name = this._get_product_name(new_bundle_identifier);
            const [ xcscheme_path ] = globSync(`${rootdir}/*.xcodeproj/xcshareddata/xcschemes/*.xcscheme`);
            const old_text = fs.readFileSync(xcscheme_path, { encoding: "utf-8" });
            const new_text = old_text.replaceAll(
                `"${old_product_name}"`,
                `"${new_product_name}"`
            ).replaceAll(
                `"${old_product_name}.app"`,
                `"${new_product_name}.app"`
            ).replaceAll(
                `container:${old_product_name}.xcodeproj`,
                `container:${new_product_name}.xcodeproj`
            );
            
            if (old_text !== new_text) {
                fs.writeFileSync(xcscheme_path, new_text);
            }
        },

        _rename_project_sources: function(rootdir, new_bundle_identifier) {
            const new_product_name = this._get_product_name(new_bundle_identifier);
            const [ xcscheme_path ] = globSync(`${rootdir}/*.xcodeproj/xcshareddata/xcschemes/*.xcscheme`);

            if (path.basename(xcscheme_path) !== `${new_product_name}.xcscheme`) {
                fs.renameSync(xcscheme_path, path.join(path.dirname(xcscheme_path), `${new_product_name}.xcscheme`));
            }

            const [ prefix_path ] = globSync(`${rootdir}/*_Prefix.pch`);

            if (path.basename(prefix_path) !== `${new_product_name}_Prefix.pch`) {
                fs.renameSync(prefix_path, path.join(path.dirname(prefix_path), `${new_product_name}_Prefix.pch`));
            }

            const [ xcodeproj_path ] = globSync(`${rootdir}/*.xcodeproj`);

            if (path.basename(prefix_path) !== `${new_product_name}.xcodeproj`) {
                fs.copySync(xcodeproj_path, path.join(path.dirname(xcodeproj_path), `${new_product_name}.xcodeproj`));
                fs.removeSync(xcodeproj_path);
            }
        },

        _update_info_plist: function(rootdir, appinfo) {
            const plist_path = path.join(rootdir, "Info.plist");
            const old_text = fs.readFileSync(plist_path, { encoding: "utf-8" });
            const new_text = old_text.replace(
                /<key>CFBundleName<\/key>([\n\s]*)<string>[^<]*<\/string>/,
                `<key>CFBundleName</key>$1<string>${this._get_product_name(appinfo.id)}</string>`
            ).replace(
                /<key>CFBundleDisplayName<\/key>([\n\s]*)<string>[^<]*<\/string>/,
                `<key>CFBundleDisplayName</key>$1<string>${appinfo.title}</string>`
            ).replace(
                /<string>x-jamkit-\$\(PRODUCT_BUNDLE_IDENTIFIER\)<\/string>([\n\s]*)<string>[^<]*<\/string>/,
                `<string>x-jamkit-$(PRODUCT_BUNDLE_IDENTIFIER)</string>$1<string>${this._get_custom_url_scheme(appinfo.id)}</string>`
            );

            if (new_text !== old_text) {
                fs.writeFileSync(plist_path, new_text);
            }
        },

        _update_app_info_plist: function(rootdir, appinfo) {
            const template_path = path.join(rootdir, "Resources", ".AppInfo.plist.tmpl");
            var text = fs.readFileSync(template_path, { encoding: "utf-8" });

            text = text.replace("${APP_ID}", appinfo.id);
            text = text.replace("${APP_TITLE}", appinfo.title);
            text = text.replace("${APP_URL}", ""); // TBD
            text = text.replace("${APP_SHORTURL}", ""); // TBD

            const plist_path = path.join(rootdir, "Resources", "AppInfo.plist");
            fs.writeFileSync(plist_path, text);
        },

        _update_app_icon: function(rootdir) {
            const target_dir = path.join(rootdir, "Resources", "Images.xcassets", "AppIcon.appiconset");
            const images = globSync(`${rootdir}/Resources/Images/AppIcon/*.{png,jpg}`);

            images.forEach((image) => {
                fs.copySync(image, path.join(target_dir, path.basename(image)));
            });
        },

        _update_launch_screen: function(rootdir) {
            /* Do nothing */
        },

        _copy_app_sources: function(rootdir) {
            const target_dir = path.join(rootdir, "Resources", "Catalogs.bundle");

            if (fs.existsSync(target_dir)) {
                fs.removeSync(target_dir);
            }

            fs.copySync("catalogs", target_dir);

            for (const entry of walkSync.entries(target_dir)) {
                if ([ ".git" ].includes(path.basename(entry.relativePath))) {
                    fs.removeSync(path.join(target_dir, entry.relativePath));
                }
            }
        }
    },

    "android": {
        compose: function(rootdir, appinfo, languages) {
            const old_package_name = this._get_package_name(rootdir);
            const new_package_name = appinfo.id.toLowerCase();

            if (new_package_name !== old_package_name) {
                const source_dirs = [
                    path.join(rootdir, "src"),
                    path.join(rootdir, "res", "layout")
                ];

                for (const source_dir of source_dirs) {
                    this._replace_package_name_in_sources(source_dir, old_package_name, new_package_name);    
                }

                this._replace_package_name_in_manifest(rootdir, old_package_name, new_package_name);
                this._rename_package_sources(rootdir, old_package_name, new_package_name);
            }

            this._update_settings_gradle(rootdir, appinfo.id.split(".").pop());
            this._update_gradle_properties(rootdir, appinfo);

            this._update_string_resources(rootdir, appinfo);
            for (const language of languages) {
                this._update_string_resources(rootdir, appinfo, language);
            }
            
            this._update_app_info_json(rootdir, appinfo);
            this._update_app_icon(rootdir);
            this._update_launch_screen(rootdir);

            this._copy_app_sources(rootdir);
        },

        _get_package_name: function(rootdir) {
            const manifest_path = path.join(rootdir, "AndroidManifest.xml");
            const text = fs.readFileSync(manifest_path, { encoding: "utf8" });
            const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
            const { manifest } = parser.parse(text);

            return manifest.package;
        },

        _replace_package_name_in_sources: function(source_dir, old_package_name, new_package_name) {
            for (const entry of walkSync.entries(source_dir)) {
                if (!entry.isDirectory()) {
                    const source_path = path.join(source_dir, entry.relativePath);

                    _replace_word_in_file(source_path, old_package_name, new_package_name);
                }
            }
        },

        _replace_package_name_in_manifest: function(rootdir, old_package_name, new_package_name) {
            const manifest_path = path.join(rootdir, "AndroidManifest.xml");

            _replace_word_in_file(manifest_path, old_package_name, new_package_name);
        },

        _rename_package_sources: function(rootdir, old_package_name, new_package_name) {
            const old_source_parts = old_package_name.split(".");
            const new_source_parts = new_package_name.split(".");

            var source_root_to_remove = path.join(rootdir, "src", old_source_parts[0]);
            for (let i = 0; i < old_source_parts.length; ++i) {
                if (old_source_parts[i] === new_source_parts[i]) {
                    source_root_to_remove = path.join(source_root_to_remove, old_source_parts[i + 1]);
                } else {
                    break;
                }
            }

            const old_source_path = path.join(rootdir, "src", ...old_source_parts);
            const new_source_path = path.join(rootdir, "src", ...new_source_parts);

            if (old_source_path !== new_source_path) {
                fs.copySync(old_source_path, new_source_path);
                fs.removeSync(source_root_to_remove);
            }
        },

        _update_settings_gradle: function(rootdir, project_name) {
            const gradle_path = path.join(rootdir, "settings.gradle");
            const old_text = fs.readFileSync(gradle_path, { encoding: "utf8" });
            const new_text = old_text.replace(
                /rootProject\.name\s*=\s*"[^"]*"/, 
                `rootProject.name = "${project_name}"`
            );

            if (old_text !== new_text) {
                fs.writeFileSync(gradle_path, new_text);
            }
        },

        _update_gradle_properties: function(rootdir, appinfo) {
            const properties_path = path.join(rootdir, "gradle.properties");
            const old_text = fs.readFileSync(properties_path, { encoding: "utf8" });
            const new_text = old_text.replace(
                /ProductName\s*=\s*[^\n]*/, 
                `ProductName=${appinfo.title}`
            );
            
            if (old_text !== new_text) {
                fs.writeFileSync(properties_path, new_text);
            }
        },

        _update_string_resources: function(rootdir, appinfo, language) {
            const xml_path = path.join(rootdir, "res", "values" + (language ? `-${language}` : ""), "strings.xml");

            if (fs.existsSync(xml_path)) {
                const old_text = fs.readFileSync(xml_path, { encoding: "utf8" });
                const new_text = old_text.replace(
                    /name="app_name">[^<]*</, 
                    `name="app_name">${_get_app_title(appinfo, language)}<`
                );

                if (old_text !== new_text) {
                    fs.writeFileSync(xml_path, new_text);
                }
            }
        },

        _update_app_info_json: function(rootdir, appinfo) {
            const template_path = path.join(rootdir, "assets", ".AppInfo.json.tmpl");
            var text = fs.readFileSync(template_path, { encoding: "utf-8" });

            text = text.replace("${APP_ID}", appinfo.id);
            text = text.replace("${APP_TITLE}", appinfo.title);
            text = text.replace("${APP_URL}", ""); // TBD
            text = text.replace("${APP_SHORTURL}", ""); // TBD

            const json_path = path.join(rootdir, "assets", "AppInfo.json");
            fs.writeFileSync(json_path, text);
        },

        _update_app_icon: function(rootdir) {
            const images = globSync(`${rootdir}/images/AppIcon/*.{png,jpg}`);

            this._copy_images_to_drawable(rootdir, images);
        },

        _update_launch_screen: function(rootdir) {
            const images = globSync(`${rootdir}/images/LaunchScreen/*.{png,jpg}`);

            this._copy_images_to_drawable(rootdir, images);
        },

        _copy_images_to_drawable(rootdir, images) {
            const drawable_dirs = {
                "@m": "drawable-mdpi",
                "@h": "drawable-hdpi",
                "@x": "drawable-xdpi",
                "@u": "drawable-xxdpi"
            }

            images.forEach((image) => {
                const m = path.basename(image).match(/(.+)(@[mhxu])(\.(png|jpg))/);
                const target_dir = path.join(rootdir, "res", drawable_dirs[m[2]]);

                fs.copySync(image, path.join(target_dir, `${m[1]}${m[3]}`));
            });
        },

        _copy_app_sources: function(rootdir) {
            const target_dir = path.join(rootdir, "assets", "catalogs");

            if (fs.existsSync(target_dir)) {
                fs.removeSync(target_dir);
            }

            fs.copySync("catalogs", target_dir);

            for (const entry of walkSync.entries(target_dir)) {
                if ([ ".git" ].includes(path.basename(entry.relativePath))) {
                    fs.removeSync(path.join(target_dir, entry.relativePath));
                }
            }
        }
    }
}

module.exports = {
    compose: function(rootdir, platform, appinfo) {
        const platform_rootdir = path.join(rootdir, "src", platform);
        const languages = [ "ko", "ja" ];

        _impl[platform].compose(platform_rootdir, appinfo, languages);
    }
}
