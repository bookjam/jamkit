module.exports = function(time) {
    var start = new Date().getTime();
   
    while (true) {
        if (new Date().getTime() > start + time) {
            break;
        }
    }
}
