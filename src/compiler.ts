import chokidar from "chokidar";
import path from "path";
import fs from "fs-extra";
import * as ts from "typescript";
import logger from "./logger.js";

interface CompilerOptions {
    target?: ts.ScriptTarget;
    module?: ts.ModuleKind;
    sourceMap?: boolean;
    removeComments?: boolean;
}

class TypeScriptCompiler {
    private compilerOptions: ts.CompilerOptions;
    private basePath?: string;
    private outputDir?: string;

    constructor(options: CompilerOptions = {}, basePath?: string, outputDir?: string) {
        this.compilerOptions = {
            target: options.target || ts.ScriptTarget.ES2020,
            module: options.module || ts.ModuleKind.CommonJS,
            sourceMap: options.sourceMap !== false,
            removeComments: options.removeComments !== false,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
            moduleResolution: ts.ModuleResolutionKind.Node10,
        };
        this.basePath = basePath;
        this.outputDir = outputDir;
    }

    compileTsFile(tsFilePath: string, force: boolean = false): string | null {
        const jsOutputPath = this._getOutputPath(tsFilePath, this.basePath || path.dirname(tsFilePath), this.outputDir);

        // Check if compilation is needed (ts file is newer than js file)
        if (!force && fs.existsSync(jsOutputPath)) {
            const tsStats = fs.statSync(tsFilePath);
            const jsStats = fs.statSync(jsOutputPath);

            if (tsStats.mtime <= jsStats.mtime) {
                // JS file is up to date, no need to compile
                return jsOutputPath;
            }
        }

        const sourceCode = fs.readFileSync(tsFilePath, "utf-8");

        // Create a temporary program for type checking
        const host = ts.createCompilerHost(this.compilerOptions);
        const program = ts.createProgram([tsFilePath], this.compilerOptions, host);
        const diagnostics = ts.getPreEmitDiagnostics(program);

        if (diagnostics.length > 0) {
            logger.warn(`Compilation failed for ${tsFilePath}:`);

            diagnostics.forEach(diagnostic => {
                if (diagnostic.file) {
                    const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
                    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
                    logger.warn(`  Line ${line + 1}, Column ${character + 1}: ${message}`);
                } else {
                    logger.warn(`  ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`);
                }
            });

            return null;
        }

        // If no errors, transpile the code
        const result = ts.transpileModule(sourceCode, {
            compilerOptions: this.compilerOptions,
            fileName: path.basename(tsFilePath)
        });

        fs.ensureDirSync(path.dirname(jsOutputPath));
        fs.writeFileSync(jsOutputPath, result.outputText);

        if (this.compilerOptions.sourceMap && result.sourceMapText) {
            fs.writeFileSync(`${jsOutputPath}.map`, result.sourceMapText);
        }

        logger.info(`Compiled: ${this._getDisplayPath(tsFilePath, this.basePath)} -> ${this._getDisplayPath(jsOutputPath, this.outputDir || this.basePath)}`);

        return jsOutputPath;
    }

    removeCompiledFiles(tsFilePath: string): string[] {
        const jsOutputPath = tsFilePath.replace(/\.ts$/, ".js");
        const mapPath = `${jsOutputPath}.map`;

        const removedFiles: string[] = [];

        if (fs.existsSync(jsOutputPath)) {
            fs.removeSync(jsOutputPath);
            logger.info(`Removed: ${this._getDisplayPath(jsOutputPath, this.outputDir || this.basePath)}`);
            removedFiles.push(jsOutputPath);
        }

        if (fs.existsSync(mapPath)) {
            fs.removeSync(mapPath);
            logger.info(`Removed: ${this._getDisplayPath(mapPath, this.outputDir || this.basePath)}`);
            removedFiles.push(mapPath);
        }

        return removedFiles;
    }

    typecheckTsFiles(tsFiles: string[]): number {
        const host = ts.createCompilerHost(this.compilerOptions);
        const program = ts.createProgram(tsFiles, this.compilerOptions, host);
        const diagnostics = ts.getPreEmitDiagnostics(program);

        if (diagnostics.length > 0) {
            diagnostics.forEach(diagnostic => {
                if (diagnostic.file) {
                    const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
                    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
                    logger.error(`${diagnostic.file.fileName}(${line + 1},${character + 1}): ${message}`);
                } else {
                    logger.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
                }
            });
        }

        return diagnostics.length;
    }

    private _getOutputPath(tsFilePath: string, basePath: string, outputDir?: string): string {
        if (outputDir) {
            return path.join(outputDir, path.relative(basePath, tsFilePath).replace(/\.ts$/, ".js"));
        }

        return tsFilePath.replace(/\.ts$/, ".js");
    }

    private _getDisplayPath(filePath: string, basePath?: string): string {
        if (basePath) {
            return path.join(path.basename(basePath), path.relative(basePath, filePath));
        }

        return filePath;
    }
}

interface CompilerModule {
    start(srcDir: string, options: CompilerOptions, handler: (event: string, filePath: string) => void): void;
    build(srcDir: string, options?: CompilerOptions, outputDir?: string): Promise<void>;
    clean(srcDir: string): Promise<void>;
    typecheck(srcDir: string): Promise<void>;
}

const compiler: CompilerModule = {
    start(srcDir: string, options: CompilerOptions = {}, handler: (event: string, filePath: string) => void): void {
        const tsCompiler = new TypeScriptCompiler(options);

        const watcher = chokidar.watch(path.join(srcDir, "**/*.ts"), {
            ignored: [
                /(^|[\/\\])\./,
                /\.d\.ts$/
            ],
            persistent: true,
            ignoreInitial: true
        });

        watcher
            .on("ready", async () => {
                const glob = await import("glob");
                const pattern = path.join(srcDir, "**/*.ts");
                const tsFiles = await glob.glob(pattern, {
                    ignore: [
                        "**/node_modules/**",
                        "**/*.d.ts"
                    ]
                });

                if (tsFiles.length > 0) {
                    logger.info(`Compiling TypeScript files...`);

                    for (const tsFile of tsFiles) {
                        const jsOutputPath = tsCompiler.compileTsFile(tsFile, false);

                        if (jsOutputPath) {
                            handler("compiled", jsOutputPath);
                        }
                    }

                    logger.info("Initial TypeScript compilation complete.");
                }

                handler("ready", srcDir);
            })
            .on("add", (tsFilePath) => {
                const jsOutputPath = tsCompiler.compileTsFile(tsFilePath, false);

                if (jsOutputPath) {
                    handler("compiled", jsOutputPath);
                }
            })
            .on("change", (tsFilePath) => {
                const jsOutputPath = tsCompiler.compileTsFile(tsFilePath, false);

                if (jsOutputPath) {
                    handler("compiled", jsOutputPath);
                }
            })
            .on("unlink", (tsFilePath) => {
                const removedFiles = tsCompiler.removeCompiledFiles(tsFilePath);

                for (const removedFile in removedFiles) {
                   handler("removed", removedFile);
                }
            })
            .on("error", (error) => {
                logger.error(`TypeScript Watcher error: ${error}`);
            });
    },

    async build(srcDir: string, options: CompilerOptions = {}, outputDir?: string): Promise<void> {
        const tsCompiler = new TypeScriptCompiler(options, srcDir, outputDir);

        const glob = await import("glob");
        const pattern = path.join(srcDir, "**/*.ts");
        const tsFiles = await glob.glob(pattern, {
            ignore: [ "**/*.d.ts" ]
        });

        if (tsFiles.length === 0) {
            logger.info("No TypeScript files found to compile.");
            return;
        }

        logger.info(`Compiling ${tsFiles.length} TypeScript files...`);

        for (const tsFile of tsFiles) {
            tsCompiler.compileTsFile(tsFile, true);
        }

        logger.info("TypeScript compilation complete.");
    },

    async clean(srcDir: string): Promise<void> {
        const tsCompiler = new TypeScriptCompiler();

        const glob = await import("glob");
        const pattern = path.join(srcDir, "**/*.ts");
        const tsFiles = await glob.glob(pattern, {
            ignore: [ "**/*.d.ts" ]
        });

        if (tsFiles.length === 0) {
            logger.info("No TypeScript files found to clean.");
            return;
        }

        logger.info(`Cleaning compiled files for ${tsFiles.length} TypeScript files...`);

        for (const tsFile of tsFiles) {
            tsCompiler.removeCompiledFiles(tsFile)
        }
    },

    async typecheck(srcDir: string): Promise<void> {
        const tsCompiler = new TypeScriptCompiler({}, srcDir);

        const glob = await import("glob");
        const pattern = path.join(srcDir, "**/*.ts");
        const tsFiles = await glob.glob(pattern, {
            ignore: [ "**/*.d.ts" ]
        });

        if (tsFiles.length === 0) {
            logger.info("No TypeScript files found to check.");
            return;
        }

        logger.info(`Type checking ${tsFiles.length} TypeScript files...`);

        const errorCount = tsCompiler.typecheckTsFiles(tsFiles);

        if (errorCount > 0) {
            throw new Error(`Found ${errorCount} type error(s)`);
        }

        logger.info("No type errors found.");
    }
};

export default compiler;