// This makes `require()` to compile TypeScript files on-the-fly.
require('ts-node').register({
    project: `${__dirname}/../tsconfig.json`,
    transpileOnly: true,
});

const DEBUG_PROXY_PORT = 9010;
const dp = require('./debug/debugProxy');

module.exports = {
    start: function() {
        var debugProxy = new dp.DebugProxy();
        debugProxy.run(DEBUG_PROXY_PORT).then((port) => {
            console.log(`Debugging Proxy is listening on ${port}...`)
        });
    }
}
