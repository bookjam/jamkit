var utils = {
    bytesToString : function(bytes) {
        var string = "";

        for (var i = 0; i < bytes.length; i++) {
            string += String.fromCharCode(bytes[i]);
        }
          
        return string;
    },

    sleep : function(milliseconds) {
        var start = new Date().getTime();
        
        while (true) {
            if ((new Date().getTime() - start) > milliseconds) {
                break;
            }
        }    
    }
};

module.exports = utils;

