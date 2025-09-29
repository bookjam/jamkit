import chokidar from "chokidar";
import path from "path";
import fs from "fs-extra";
import * as ts from "typescript";

interface CompilerOptions {
    target?: ts.ScriptTarget;
    module?: ts.ModuleKind;
    sourceMap?: boolean;
    removeComments?: boolean;
}

class TypescriptCompiler {
    private compilerOptions: ts.CompilerOptions;
    private basePath?: string;

    constructor(options: CompilerOptions = {}, basePath?: string) {
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
    }

    compileTsFile(tsFilePath: string, force: boolean = false): string | null {
        const jsOutputPath = tsFilePath.replace(/\.ts$/, ".js");

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
            console.warn(`Compilation failed for ${tsFilePath}:`);

            diagnostics.forEach(diagnostic => {
                if (diagnostic.file) {
                    const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
                    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
                    console.warn(`  Line ${line + 1}, Column ${character + 1}: ${message}`);
                } else {
                    console.warn(`  ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`);
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

        console.log(`Compiled: ${this._getDisplayPath(tsFilePath)} -> ${this._getDisplayPath(jsOutputPath)}`);

        return jsOutputPath;
    }

    removeCompiledFile(tsFilePath: string): boolean {
        const jsOutputPath = tsFilePath.replace(/\.ts$/, ".js");
        const mapPath = `${jsOutputPath}.map`;

        let removed = false;

        if (fs.existsSync(jsOutputPath)) {
            fs.removeSync(jsOutputPath);
            console.log(`Removed: ${this._getDisplayPath(jsOutputPath)}`);
            removed = true;
        }

        if (fs.existsSync(mapPath)) {
            fs.removeSync(mapPath);
            console.log(`Removed: ${this._getDisplayPath(mapPath)}`);
        }

        return removed;
    }

    private _getDisplayPath(filePath: string): string {
        if (this.basePath) {
            return path.join(path.basename(this.basePath), path.relative(this.basePath, filePath));
        }

        return filePath;
    }
}

interface CompilerModule {
    start(srcDir: string, options: CompilerOptions, handler: (event: string, filePath: string) => void): void;
    build(srcDir: string, options?: CompilerOptions): Promise<void>;
    clean(srcDir: string): Promise<void>;
}

const compiler: CompilerModule = {
    start(srcDir: string, options: CompilerOptions = {}, handler: (event: string, filePath: string) => void): void {
        const tsCompiler = new TypescriptCompiler(options);

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
                    console.log(`Compiling Typescript files...`);

                    for (const tsFile of tsFiles) {
                        const jsOutputPath = tsCompiler.compileTsFile(tsFile);

                        if (jsOutputPath) {
                            handler("compiled", jsOutputPath);
                        }
                    }

                    console.log("Initial Typescript compilation complete.");
                }

                handler("ready", srcDir);
            })
            .on("add", (tsFilePath) => {
                const jsOutputPath = tsCompiler.compileTsFile(tsFilePath);

                if (jsOutputPath) {
                    handler("compiled", jsOutputPath);
                }
            })
            .on("change", (tsFilePath) => {
                const jsOutputPath = tsCompiler.compileTsFile(tsFilePath);

                if (jsOutputPath) {
                    handler("compiled", jsOutputPath);
                }
            })
            .on("unlink", (tsFilePath) => {
                const removed = tsCompiler.removeCompiledFile(tsFilePath);

                if (removed) {
                    handler("removed", tsFilePath.replace(/\.ts$/, ".js"));
                }
            })
            .on("error", (error) => {
                console.error("Typescript Watcher error:", error);
            });
    },

    async build(srcDir: string, options: CompilerOptions = {}): Promise<void> {
        const tsCompiler = new TypescriptCompiler(options, srcDir);

        const glob = await import("glob");
        const pattern = path.join(srcDir, "**/*.ts");
        const tsFiles = await glob.glob(pattern, {
            ignore: [ "**/*.d.ts" ]
        });

        if (tsFiles.length > 0) {
            console.log(`Compiling ${tsFiles.length} TypeScript files...`);

            for (const tsFile of tsFiles) {
                tsCompiler.compileTsFile(tsFile, true);
            }

            console.log("TypeScript compilation complete.");
        } else {
            console.log("No TypeScript files found to compile.");
        }
    },

    async clean(srcDir: string): Promise<void> {
        const tsCompiler = new TypescriptCompiler();

        const glob = await import("glob");
        const pattern = path.join(srcDir, "**/*.ts");
        const tsFiles = await glob.glob(pattern, {
            ignore: [ "**/*.d.ts" ]
        });

        if (tsFiles.length > 0) {
            console.log(`Cleaning compiled files for ${tsFiles.length} TypeScript files...`);

            let removedCount = 0;
            for (const tsFile of tsFiles) {
                if (tsCompiler.removeCompiledFile(tsFile)) {
                    removedCount++;
                }
            }

            console.log(`Cleaned ${removedCount} compiled files.`);
        } else {
            console.log("No TypeScript files found to clean.");
        }
    }
};

export default compiler;