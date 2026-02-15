import path from "path";
import fs from "fs-extra";
import { glob } from "glob";
import sbml from "./sbml.js";
import type { SbmlParserDelegate } from "./@types/sbml/index.js";
import type { AppInfo, BookInfo } from "./types.js";

interface SbmlValidationResult {
    errors: string[];
    warnings: string[];
    fileCount: number;
}

interface ValidatorModule {
    validateApp(appInfo: AppInfo, srcDir?: string): void;
    validateBook(bookInfo: BookInfo, srcDir?: string): void;
}

async function validateSbml(dir: string, filesList: string[][]): Promise<SbmlValidationResult> {
    const sbmlModule = await sbml.load();

    const errors: string[] = [];
    const warnings: string[] = [];

    const delegate: SbmlParserDelegate = {
        getTextWithContentsOfFileNamed(_parser: any, fileName: string): string | null {
            const filePath = path.resolve(dir, fileName);

            try {
                return fs.readFileSync(filePath, "utf8");
            } catch {
                return null;
            }
        },

        writeLogMessage(_logger: any, message: string, level: string): void {
            if (level === "error") {
                errors.push(message);
            } else if (level === "warning") {
                warnings.push(message);
            }
        }
    };

    const parser = new sbmlModule.SbmlParser(2.0, delegate);

    try {
        for (const fileNames of filesList) {
            try {
                const document = parser.parseFiles(fileNames, {}, {});

                if (!document) {
                    if (errors.length === 0) {
                        errors.push(`Failed to parse: ${fileNames.join(", ")}`);
                    }
                } else {
                    document.delete();
                }
            } catch {
                errors.push(`Failed to parse: ${fileNames.join(", ")}`);
            }
        }

        return { errors, warnings, fileCount: filesList.length };
    } finally {
        parser.delete();
    }
}

const reportSbmlValidation = (result: SbmlValidationResult): void => {
    if (result.fileCount === 0) {
        console.error("ERROR: No SBML files found.");
        process.exit(1);
    }

    result.warnings.forEach((warning) => {
        console.warn(`WARNING: ${warning}`);
    });

    result.errors.forEach((error) => {
        console.error(`ERROR: ${error}`);
    });

    if (result.errors.length > 0) {
        if (result.warnings.length > 0) {
            console.error(`\n${result.errors.length} error(s), ${result.warnings.length} warning(s) in ${result.fileCount} SBML file(s).`);
        } else {
            console.error(`\n${result.errors.length} error(s) in ${result.fileCount} SBML file(s).`);
        }
        process.exit(1);
    }

    if (result.warnings.length > 0) {
        console.log(`\n${result.warnings.length} warning(s) in ${result.fileCount} SBML file(s).`);
    } else {
        console.log(`Validated ${result.fileCount} SBML file(s) successfully.`);
    }
}

const validatorModule: ValidatorModule = {
    validateApp(appInfo: AppInfo, srcDir: string = "."): void {
        glob("**/*.sbml", { cwd: srcDir })
            .then((sbmlFiles) => {
                const filesList: string[][] = [];

                for (const sbmlFile of sbmlFiles) {
                    filesList.push([
                        sbmlFile.replace(/\.sbml$/, ".sbss"),
                        sbmlFile
                    ]);
                }

                return validateSbml(srcDir, filesList);
            })
            .then((result) => {
                reportSbmlValidation(result);
            })
            .catch((error) => {
                console.error(`ERROR: ${error.message || error}`);
                process.exit(1);
            });
    },

    validateBook(bookInfo: BookInfo, srcDir: string = "."): void {
        const filesList: string[][] = [];

        for (const key of Object.keys(bookInfo)) {
            if (key.endsWith("-files")) {
                const value = bookInfo[key];

                if (Array.isArray(value)) {
                    filesList.push(value);
                }
            }
        }

        validateSbml(srcDir, filesList)
            .then((result) => {
                reportSbmlValidation(result);
            })
            .catch((error) => {
                console.error(`ERROR: ${error.message || error}`);
                process.exit(1);
            });
    }
};

export default validatorModule;
