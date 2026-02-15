import path from "path";
import fs from "fs-extra";
import { glob } from "glob";
import sbml from "./sbml.js";
import type { SbmlParserDelegate } from "./@types/sbml/index.js";
import type { AppInfo, BookInfo } from "./types.js";

interface ValidateResult {
    errors: string[];
    warnings: string[];
    fileCount: number;
    document: boolean;
}

interface ValidatorModule {
    validateApp(appInfo: AppInfo, srcDir?: string): void;
    validateBook(bookInfo: BookInfo, srcDir?: string): void;
}

async function validateSbml(dir: string): Promise<ValidateResult> {
    const sbmlModule = await sbml.load();
    const sbmlFiles = await glob("**/*.sbml", { cwd: dir });

    if (sbmlFiles.length === 0) {
        return {
            errors: ["No .sbml files found."],
            warnings: [],
            fileCount: 0,
            document: false
        };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    const delegate: SbmlParserDelegate = {
        getTextWithContentsOfFileNamed(_parser: any, fileName: string): string | null {
            const filePath = path.resolve(dir, fileName);

            try {
                return fs.readFileSync(filePath, "utf8");
            } catch {
                errors.push(`File not found: ${fileName}`);
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
        const document = parser.parseFiles(sbmlFiles, {}, {});

        if (!document) {
            if (errors.length === 0) {
                errors.push("Failed to parse SBML files.");
            }

            return { errors, warnings, fileCount: sbmlFiles.length, document: false };
        }

        document.delete();

        return { errors, warnings, fileCount: sbmlFiles.length, document: true };
    } finally {
        parser.delete();
    }
}

const printResult = (result: ValidateResult): void => {
    if (result.fileCount === 0) {
        console.error("ERROR: " + result.errors[0]);
        process.exit(1);
    }

    console.log(`Validated ${result.fileCount} SBML file(s).`);

    result.warnings.forEach((warning) => {
        console.warn(`WARNING: ${warning}`);
    });

    result.errors.forEach((error) => {
        console.error(`ERROR: ${error}`);
    });

    if (result.errors.length > 0) {
        console.error(`\nValidation failed with ${result.errors.length} error(s).`);
        process.exit(1);
    }

    if (result.warnings.length > 0) {
        console.log(`\nValidation passed with ${result.warnings.length} warning(s).`);
    } else {
        console.log("\nValidation passed.");
    }
}

const validatorModule: ValidatorModule = {
    validateApp(appInfo: AppInfo, srcDir: string = "."): void {
        validateSbml(srcDir)
            .then((result) => {
                printResult(result);
            })
            .catch((error) => {
                console.error(`ERROR: ${error.message || error}`);
                process.exit(1);
            });
    },

    validateBook(bookInfo: BookInfo, srcDir: string = "."): void {
        validateSbml(srcDir)
            .then((result) => {
                printResult(result);
            })
            .catch((error) => {
                console.error(`ERROR: ${error.message || error}`);
                process.exit(1);
            });
    }
};

export default validatorModule;
