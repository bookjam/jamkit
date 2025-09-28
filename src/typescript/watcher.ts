import chokidar from "chokidar";
import path from "path";
import TypescriptCompiler, { CompilerOptions } from "./compiler.js";

export interface WatcherOptions {
    compilerOptions?: CompilerOptions;
}

interface TypescriptWatcherModule {
    start(srcDir: string, options: WatcherOptions, handler: (event: string, filePath: string) => void): void;
}

const typescriptWatcher: TypescriptWatcherModule = {
    start(srcDir: string, options: WatcherOptions, handler: (event: string, filePath: string) => void): void {
        const compiler = new TypescriptCompiler(options.compilerOptions);
        const compileTsFile = (tsFilePath: string): string | null => {
            const jsOutputPath = getJsOutputPath(tsFilePath);
            const result = compiler.compile(tsFilePath, jsOutputPath);

            if (!result.success) {
                console.warn(`Compilation failed for ${tsFilePath}:`);
                if (result.diagnostics) {
                    result.diagnostics.forEach(diagnostic => console.warn(`  ${diagnostic}`));
                }
                return null;
            }

            return jsOutputPath;
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
                const jsOutputPath = getJsOutputPath(tsFilePath);
                const removed = compiler.removeCompiledFile(tsFilePath, jsOutputPath);

                if (removed) {
                    handler("removed", jsOutputPath);
                }
            })
            .on("error", (error) => {
                console.error("Watcher error:", error);
            });
    }
};

function getJsOutputPath(tsFilePath: string): string {
    return tsFilePath.replace(/\.ts$/, ".js");
}

export default typescriptWatcher;
