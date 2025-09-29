import obfuscator from "javascript-obfuscator";
import fs from "fs-extra";
import path from "path";
import { glob } from "glob";

interface ObfuscatorModule {
    obfuscate(srcDir: string): Promise<void>;
}

const obfuscatorModule: ObfuscatorModule = {
    async obfuscate(srcDir: string): Promise<void> {
        const pattern = path.join(srcDir, "**/*.js");
        const jsFiles = await glob(pattern, {
            ignore: [
                "**/node_modules/**",
                "**/*.min.js"
            ]
        });

        if (jsFiles.length > 0) {
            console.log(`Obfuscating ${jsFiles.length} JavaScript files...`);

            for (const jsFile of jsFiles) {
                try {
                    const sourceCode = fs.readFileSync(jsFile, "utf-8");

                    const obfuscationResult = obfuscator.obfuscate(sourceCode, {
                        compact: true,
                        controlFlowFlattening: false,
                        deadCodeInjection: false,
                        debugProtection: false,
                        debugProtectionInterval: 0,
                        disableConsoleOutput: false,
                        identifierNamesGenerator: "hexadecimal",
                        log: false,
                        numbersToExpressions: false,
                        renameGlobals: false,
                        selfDefending: false,
                        simplify: true,
                        splitStrings: false,
                        stringArray: true,
                        stringArrayCallsTransform: false,
                        stringArrayEncoding: [],
                        stringArrayIndexShift: true,
                        stringArrayRotate: true,
                        stringArrayShuffle: true,
                        stringArrayWrappersCount: 1,
                        stringArrayWrappersChainedCalls: true,
                        stringArrayWrappersParametersMaxCount: 2,
                        stringArrayWrappersType: "variable",
                        stringArrayThreshold: 0.75,
                        unicodeEscapeSequence: false
                    });

                    fs.writeFileSync(jsFile, obfuscationResult.getObfuscatedCode());
                    console.log(`Obfuscated: ${jsFile}`);
                } catch (error) {
                    console.warn(`Warning: Could not obfuscate ${jsFile}: ${error}`);
                }
            }

            console.log("JavaScript obfuscation complete.");
        } else {
            console.log("No JavaScript files found to obfuscate.");
        }
    }
};

export default obfuscatorModule;