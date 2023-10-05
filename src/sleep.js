module.exports = (time) => {
    const start = new Date().getTime();
   
    while (true) {
        if (new Date().getTime() > start + time) {
            break;
        }
    }
}
