module.exports = {
    dataToDataURL: function(data) {
        var buffer = Buffer.from(JSON.stringify(data), 'utf-8');
        var base64 = buffer.toString('base64');
        
        return "data:application/json;base64," + base64;
    }
};
