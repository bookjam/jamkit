import fs from "fs-extra";
import path from "path";
import sbml from "./sbml.js";

const bonModule = {
    async parse(filePath: string): Promise<any> {
        const sbmlModule = await sbml.load();
        const text = await fs.readFile(path.resolve(filePath), "utf8");
        const bonValue = sbmlModule.BonParser.parse(text);

        if (!bonValue) {
            return null;
        }

        const result = bonValue.toObject();
        bonValue.delete();

        return result;
    },

    async write(filePath: string, value: Record<string, any>): Promise<boolean> {
        const sbmlModule = await sbml.load();
        const bonValue = sbmlModule.BonMap.fromObject(value);

        if (!bonValue) {
            return false;
        }

        const text = sbmlModule.BonWriter.write(bonValue);
        bonValue.delete();

        if (text) {
            await fs.writeFile(path.resolve(filePath), text, "utf8");
        }

        return !!text;
    }
};

export default bonModule;
