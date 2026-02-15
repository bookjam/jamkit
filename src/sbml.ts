import { fileURLToPath } from "url";
import path from "path";
import type { SbmlModule } from "./@types/libsbml/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedModule: SbmlModule | null = null;

interface SbmlLoaderModule {
    load(): Promise<SbmlModule>;
}

const sbml: SbmlLoaderModule = {
    async load(): Promise<SbmlModule> {
        if (!cachedModule) {
            const sbmlPath = path.resolve(__dirname, "libsbml", "sbml.js");
            const { default: Module } = await import(sbmlPath);

            cachedModule = await Module({
                locateFile(file: string) {
                    return path.resolve(__dirname, "libsbml", file);
                }
            }) as SbmlModule;
        }

        return cachedModule;
    }
};

export default sbml;
