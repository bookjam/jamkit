// This makes `require()` to compile TypeScript files on-the-fly.
require('ts-node').register({
    project: `${__dirname}/../tsconfig.json`,
    transpileOnly: true,
});

const dp = require('./debug/DebuggingProxy');

module.exports = {
    start: function() {
        var debuggingProxy = new dp.DebuggingProxy();
        debuggingProxy.start();
    }
}
