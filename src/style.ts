import fs from "fs-extra";

const RE_OLD_STYLE = /(\s*)([#%\/][^:]+):(.*)/;
const RE_PROP = /(([\w\d-]+)\s*=\s*("(\\"|[^"])+"|'(\\'|[^'])+'|[^,]+))(,|$)/g;

const migrateNewStyle = (line: string, trailing: string): string | undefined => {
    const m = RE_OLD_STYLE.exec(line);

    if (m) {
        const props = [...m[3].trim().matchAll(RE_PROP)];
        const style = buildNewStyle(m[1], m[2], props.map((prop) => {
            const name = prop[2].trim();
            const value = prop[3].trim().replace(/^["']|["']$/g, "");

            return [name, value];
        }));

        return style + trailing;
    }
};

const buildNewStyle = (leading: string, selector: string, props: [string, string][]): string => {
    let style = `${leading}${selector} {\n`;

    props.forEach(([name, value]) => {
        style += `${leading}    ${name}: ${value};\n`;
    });

    style += `${leading}}`;

    return style;
};

interface StyleModule {
    migrate(path: string): void;
}

const style: StyleModule = {
    migrate(path: string): void {
        const source = fs.readFileSync(path, { encoding: "utf8" });
        let text = "";
        let multiline = false;
        const lines: string[] = [];

        source.split(/\r\n|\n|\r/).forEach((line) => {
            if (multiline) {
                lines[lines.length - 1] += line.replace(/^\s+|\\$/g, "");
            } else {
                lines.push(line.replace(/\\$/, ""));
            }

            multiline = line.endsWith("\\");
        });

        let lastMigrated = false;
        lines.forEach((line) => {
            const style = migrateNewStyle(line, "\n\n");

            if (!style) {
                if (lastMigrated) {
                    text = text.replace(/\n\n$/, "");
                }
                text += line + "\n";
                lastMigrated = false;
            } else {
                text += style + "\n";
                lastMigrated = true;
            }
        });

        text = text.replace(/\n{2,}$/, "\n");
        text = text.replace(/\n{3,}/g, "\n\n");

        fs.writeFileSync(path, text);
    }
};

export default style;