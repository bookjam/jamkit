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

interface CompilerModule {
    start(srcDir: string, options: CompilerOptions, handler: (event: string, filePath: string) => void): void;
}

const compiler: CompilerModule = {
    start(srcDir: string, options: CompilerOptions = {}, handler: (event: string, filePath: string) => void): void {
        const compilerOptions: ts.CompilerOptions = {
            target: options.target || ts.ScriptTarget.ES2020,
            module: options.module || ts.ModuleKind.CommonJS,
            sourceMap: options.sourceMap !== false,
            removeComments: options.removeComments !== false,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
            moduleResolution: ts.ModuleResolutionKind.Node10,
        };

        const compileTsFile = (tsFilePath: string): string | null => {
            const jsOutputPath = tsFilePath.replace(/\.ts$/, ".js");
            const sourceCode = fs.readFileSync(tsFilePath, "utf-8");

            // Create a temporary program for type checking
            const host = ts.createCompilerHost(compilerOptions);
            const program = ts.createProgram([tsFilePath], compilerOptions, host);
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
                compilerOptions: compilerOptions,
                fileName: path.basename(tsFilePath)
            });

            fs.ensureDirSync(path.dirname(jsOutputPath));
            fs.writeFileSync(jsOutputPath, result.outputText);

            if (compilerOptions.sourceMap && result.sourceMapText) {
                fs.writeFileSync(`${jsOutputPath}.map`, result.sourceMapText);
            }

            console.log(`Compiled: ${tsFilePath} -> ${jsOutputPath}`);

            return jsOutputPath;
        };

        const removeCompiledFile = (tsFilePath: string): boolean => {
            const jsOutputPath = tsFilePath.replace(/\.ts$/, ".js");
            const mapPath = `${jsOutputPath}.map`;

            let removed = false;

            if (fs.existsSync(jsOutputPath)) {
                fs.removeSync(jsOutputPath);
                console.log(`Removed: ${jsOutputPath}`);
                removed = true;
            }

            if (fs.existsSync(mapPath)) {
                fs.removeSync(mapPath);
                console.log(`Removed: ${mapPath}`);
            }

            return removed;
        };

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
                    console.log(`Compiling ${tsFiles.length} Typescript files...`);

                    for (const tsFile of tsFiles) {
                        const jsOutputPath = compileTsFile(tsFile);

                        if (jsOutputPath) {
                            handler("compiled", jsOutputPath);
                        }
                    }

                    console.log("Initial Typescript compilation complete.");
                }

                handler("ready", srcDir);
            })
            .on("add", (tsFilePath) => {
                const jsOutputPath = compileTsFile(tsFilePath);

                if (jsOutputPath) {
                    handler("compiled", jsOutputPath);
                }
            })
            .on("change", (tsFilePath) => {
                const jsOutputPath = compileTsFile(tsFilePath);

                if (jsOutputPath) {
                    handler("compiled", jsOutputPath);
                }
            })
            .on("unlink", (tsFilePath) => {
                const removed = removeCompiledFile(tsFilePath);

                if (removed) {
                    handler("removed", tsFilePath.replace(/\.ts$/, ".js"));
                }
            })
            .on("error", (error) => {
                console.error("Typescript Watcher error:", error);
            });
    }
};

export default compiler;