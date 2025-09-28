import chokidar from "chokidar";
import path from "path";
import TypescriptCompiler, { CompilerOptions } from "./compiler.js";

export interface WatcherOptions {
    outputDir?: string;
    compilerOptions?: CompilerOptions;
    onCompileSuccess?: (tsFile: string, jsFile: string) => void;
    onCompileError?: (tsFile: string, errors: string[]) => void;
    onRemove?: (tsFile: string, jsFile: string) => void;
}

export class TypescriptWatcher {
    private compiler: TypescriptCompiler;
    private watcher?: chokidar.FSWatcher;
    private options: WatcherOptions;
    private srcDir: string;

    constructor(options: WatcherOptions = {}) {
        this.options = options;
        this.compiler = new TypescriptCompiler(options.compilerOptions);
        this.srcDir = "";
    }

    start(srcDir: string, patterns?: string | string[]): void {
        const watchPatterns = patterns || path.join(srcDir, "**/*.ts");

        this.watcher = chokidar.watch(watchPatterns,  { 
            ignored: [
                /(^|[\/\\])\./,
                /\.d\.ts$/
            ], 
            persistent: true,
            ignoreInitial: true
        });

        this.watcher
            .on("ready", () => {
                console.log(`Typescript watcher ready. Watching: ${srcDir}`);
            })
            .on("add", (tsFilePath) => {
                this.handleFileAdded(tsFilePath);
            })
            .on("change", (tsFilePath) => {
                this.handleFileChanged(tsFilePath);
            })
            .on("unlink", (tsFilePath) => {
                this.handleFileRemoved(tsFilePath);
            })
            .on("error", (error) => {
                console.error("Watcher error:", error);
            });

        this.srcDir = srcDir;
    }

    private handleFileAdded(tsFilePath: string): void {
        console.log(`Typescript file added: ${tsFilePath}`);
        this.compileTsFile(tsFilePath);
    }

    private handleFileChanged(tsFilePath: string): void {
        console.log(`Typescript file changed: ${tsFilePath}`);
        this.compileTsFile(tsFilePath);
    }

    private handleFileRemoved(tsFilePath: string): void {
        console.log(`Typescript file removed: ${tsFilePath}`);

        const jsOutputPath = this.getJsOutputPath(tsFilePath);
        const removed = this.compiler.removeCompiledFile(tsFilePath, jsOutputPath);

        if (removed && this.options.onRemove) {
            this.options.onRemove(tsFilePath, jsOutputPath);
        }
    }

    private compileTsFile(tsFilePath: string): void {
        const jsOutputPath = this.getJsOutputPath(tsFilePath);
        const result = this.compiler.compile(tsFilePath, jsOutputPath);

        if (result.success) {
            if (this.options.onCompileSuccess) {
                this.options.onCompileSuccess(tsFilePath, jsOutputPath);
            }
        } else {
            console.error(`Compilation failed for ${tsFilePath}:`);
            if (result.diagnostics) {
                result.diagnostics.forEach(diagnostic => console.error(`  ${diagnostic}`));
            }

            if (this.options.onCompileError && result.diagnostics) {
                this.options.onCompileError(tsFilePath, result.diagnostics);
            }
        }
    }

    private getJsOutputPath(tsFilePath: string): string {
        if (this.options.outputDir) {
            const relativePath = path.relative(this.srcDir, tsFilePath);
            return path.join(this.options.outputDir, relativePath.replace(/\.ts$/, ".js"));
        }
        return tsFilePath.replace(/\.ts$/, ".js");
    }

    stop(): void {
        if (this.watcher) {
            this.watcher.close();
            console.log("Typescript watcher stopped");
        }
    }

    async compileAll(): Promise<Map<string, { success: boolean; diagnostics?: string[] }>> {
        const glob = await import("glob");
        const pattern = path.join(this.srcDir, "**/*.ts");
        const tsFiles = await glob.glob(pattern, {
            ignore: [
                "**/node_modules/**",
                "**/*.d.ts"
            ]
        });

        console.log(`Compiling ${tsFiles.length} Typescript files...`);
        return this.compiler.compileMany(tsFiles, this.options.outputDir);
    }
}

export default TypescriptWatcher;