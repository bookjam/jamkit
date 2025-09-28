import * as ts from "typescript";
import * as fs from "fs-extra";
import * as path from "path";

export interface CompilerOptions {
    target?: ts.ScriptTarget;
    module?: ts.ModuleKind;
    sourceMap?: boolean;
    removeComments?: boolean;
}

export class TypescriptCompiler {
    private compilerOptions: ts.CompilerOptions;

    constructor(options: CompilerOptions = {}) {
        this.compilerOptions = {
            target: options.target || ts.ScriptTarget.ES2020,
            module: options.module || ts.ModuleKind.CommonJS,
            sourceMap: options.sourceMap !== false,
            removeComments: options.removeComments !== false,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
            moduleResolution: ts.ModuleResolutionKind.NodeJs,
        };
    }

    compile(tsFilePath: string, jsOutputPath?: string): { success: boolean; diagnostics?: string[] } {
        if (!fs.existsSync(tsFilePath)) {
            return {
                success: false,
                diagnostics: [`File not found: ${tsFilePath}`]
            };
        }

        const outputPath = jsOutputPath || tsFilePath.replace(/\.ts$/, ".js");
        const sourceCode = fs.readFileSync(tsFilePath, "utf-8");

        const result = ts.transpileModule(sourceCode, {
            compilerOptions: this.compilerOptions,
            fileName: path.basename(tsFilePath),
            reportDiagnostics: true
        });

        if (result.diagnostics && result.diagnostics.length > 0) {
            const diagnostics = result.diagnostics.map(diagnostic => {
                const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
                return `${diagnostic.file?.fileName || "unknown"}: ${message}`;
            });

            return {
                success: false,
                diagnostics
            };
        }

        fs.ensureDirSync(path.dirname(outputPath));
        fs.writeFileSync(outputPath, result.outputText);

        if (this.compilerOptions.sourceMap && result.sourceMapText) {
            fs.writeFileSync(`${outputPath}.map`, result.sourceMapText);
        }

        console.log(`Compiled: ${tsFilePath} -> ${outputPath}`);
        return { success: true };
    }

    compileMany(tsFiles: string[], outputDir?: string): Map<string, { success: boolean; diagnostics?: string[] }> {
        const results = new Map<string, { success: boolean; diagnostics?: string[] }>();

        for (const tsFile of tsFiles) {
            let outputPath: string | undefined;
            if (outputDir) {
                const relativePath = path.relative(process.cwd(), tsFile);
                outputPath = path.join(outputDir, relativePath.replace(/\.ts$/, ".js"));
            }

            results.set(tsFile, this.compile(tsFile, outputPath));
        }

        return results;
    }

    removeCompiledFile(tsFilePath: string, jsOutputPath?: string): boolean {
        const outputPath = jsOutputPath || tsFilePath.replace(/\.ts$/, ".js");
        const mapPath = `${outputPath}.map`;

        let removed = false;

        if (fs.existsSync(outputPath)) {
            fs.removeSync(outputPath);
            console.log(`Removed: ${outputPath}`);
            removed = true;
        }

        if (fs.existsSync(mapPath)) {
            fs.removeSync(mapPath);
            console.log(`Removed: ${mapPath}`);
        }

        return removed;
    }
}

export default TypescriptCompiler;