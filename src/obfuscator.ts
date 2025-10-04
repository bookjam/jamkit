import obfuscator from "javascript-obfuscator";
import fs from "fs-extra";
import path from "path";
import { glob } from "glob";
import logger from "./logger.js";

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

class JavaScriptObfuscator {
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
            const obfuscation = obfuscator.obfuscate(sourceCode, this.options);
            fs.writeFileSync(jsFilePath, obfuscation.getObfuscatedCode());

            logger.debug(`Obfuscated: ${this._getDisplayPath(jsFilePath, this.basePath)}`);
            
            return true;
        } catch (error) {
            logger.warn(`WARNING: Could not obfuscate ${this._getDisplayPath(jsFilePath, this.basePath)}: ${error}`);
            
            return false;
        }
    }

    private _getDisplayPath(filePath: string, basePath?: string): string {
        if (basePath) {
            return path.join(path.basename(basePath), path.relative(basePath, filePath));
        }
    
        return filePath;
    }
}

interface ObfuscatorModule {
    obfuscate(srcDir: string, options?: ObfuscatorOptions): Promise<void>;
}

const obfuscatorModule: ObfuscatorModule = {
    async obfuscate(srcDir: string, options: ObfuscatorOptions = {}): Promise<void> {
        const jsObfuscator = new JavaScriptObfuscator(options, srcDir);

        const pattern = path.join(srcDir, "**/*.js");
        const jsFiles = await glob(pattern, {
            ignore: [
                "**/*.min.js"
            ]
        });

        if (jsFiles.length > 0) {
            logger.info(`Obfuscating ${jsFiles.length} JavaScript files...`);

            for (const jsFile of jsFiles) {
                jsObfuscator.obfuscateFile(jsFile);
            }

            logger.info("JavaScript obfuscation complete.");
        } else {
            logger.info("No JavaScript files found to obfuscate.");
        }
    }
};

export default obfuscatorModule;
