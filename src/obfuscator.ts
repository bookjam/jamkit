import obfuscator from "javascript-obfuscator";
import fs from "fs-extra";
import path from "path";
import { glob } from "glob";

interface ObfuscatorOptions {
    compact?: boolean;
    controlFlowFlattening?: boolean;
    deadCodeInjection?: boolean;
    debugProtection?: boolean;
    identifierNamesGenerator?: string;
    renameGlobals?: boolean;
    selfDefending?: boolean;
    simplify?: boolean;
    stringArray?: boolean;
    stringArrayThreshold?: number;
}

class JavascriptObfuscator {
    private options: any;
    private basePath?: string;

    constructor(options: ObfuscatorOptions = {}, basePath?: string) {
        this.options = {
            compact: options.compact !== false,
            controlFlowFlattening: options.controlFlowFlattening || false,
            deadCodeInjection: options.deadCodeInjection || false,
            debugProtection: options.debugProtection || false,
            debugProtectionInterval: 0,
            disableConsoleOutput: false,
            identifierNamesGenerator: options.identifierNamesGenerator || "hexadecimal",
            log: false,
            numbersToExpressions: false,
            renameGlobals: options.renameGlobals || false,
            selfDefending: options.selfDefending || false,
            simplify: options.simplify !== false,
            splitStrings: false,
            stringArray: options.stringArray !== false,
            stringArrayCallsTransform: false,
            stringArrayEncoding: [],
            stringArrayIndexShift: true,
            stringArrayRotate: true,
            stringArrayShuffle: true,
            stringArrayWrappersCount: 1,
            stringArrayWrappersChainedCalls: true,
            stringArrayWrappersParametersMaxCount: 2,
            stringArrayWrappersType: "variable",
            stringArrayThreshold: options.stringArrayThreshold || 0.75,
            unicodeEscapeSequence: false
        };
        this.basePath = basePath;
    }

    obfuscateFile(jsFilePath: string): boolean {
        try {
            const sourceCode = fs.readFileSync(jsFilePath, "utf-8");

            const obfuscationResult = obfuscator.obfuscate(sourceCode, this.options);

            fs.writeFileSync(jsFilePath, obfuscationResult.getObfuscatedCode());
            console.log(`Obfuscated: ${this._getDisplayPath(jsFilePath)}`);
            return true;
        } catch (error) {
            console.warn(`Warning: Could not obfuscate ${this._getDisplayPath(jsFilePath)}: ${error}`);
            return false;
        }
    }

    private _getDisplayPath(filePath: string): string {
        if (this.basePath) {
            return path.join(path.basename(this.basePath), path.relative(this.basePath, filePath));
        }
    
        return filePath;
    }
}

interface ObfuscatorModule {
    obfuscate(srcDir: string, options?: ObfuscatorOptions): Promise<void>;
}

const obfuscatorModule: ObfuscatorModule = {
    async obfuscate(srcDir: string, options: ObfuscatorOptions = {}): Promise<void> {
        const jsObfuscator = new JavascriptObfuscator(options, srcDir);

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
                jsObfuscator.obfuscateFile(jsFile);
            }

            console.log("JavaScript obfuscation complete.");
        } else {
            console.log("No JavaScript files found to obfuscate.");
        }
    }
};

export default obfuscatorModule;
