module.exports = {
    dataToDataURL: function(data) {
        const buffer = Buffer.from(JSON.stringify(data), "utf-8");
        const base64 = buffer.toString("base64");
        
        return "data:application/json;base64," + base64;
    }
};
