var utils = {
    bytesToString : function(bytes) {
        var string = "";

        for (var i = 0; i < bytes.length; i++) {
            string += String.fromCharCode(bytes[i]);
        }
          
        return string;
    }
};

module.exports = utils;

