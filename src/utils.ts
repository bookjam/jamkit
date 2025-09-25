interface Utils {
    dataToDataURL(data: unknown): string;
}

const utils: Utils = {
    dataToDataURL(data: unknown): string {
        const buffer = Buffer.from(JSON.stringify(data), "utf-8");
        const base64 = buffer.toString("base64");

        return "data:application/json;base64," + base64;
    }
};

export default utils;