import { fileURLToPath } from "url";
import path from "path";
import type { SbmlModule } from "./@types/sbml/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedModule: SbmlModule | null = null;

interface SbmlWrapperModule {
    load(): Promise<SbmlModule>;
}

const sbmlModule: SbmlWrapperModule = {
    async load(): Promise<SbmlModule> {
        if (!cachedModule) {
            const sbmlPath = path.resolve(__dirname, "lib", "sbml", "sbml.js");
            const { default: Module } = await import(sbmlPath);

            cachedModule = await Module({
                locateFile(file: string) {
                    return path.resolve(__dirname, "lib", "sbml", file);
                }
            }) as SbmlModule;
        }

        return cachedModule;
    }
};

export default sbmlModule;
