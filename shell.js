const net   = require('net'),
      utils = require('./utils'),
      host  = '127.0.0.1',
      port  = 8888;

var client, callbacks, lines;

function __connect_to_host(timeout, callback) {
    var started_time = new Date().getTime();

    client = net.connect({ host:host, port:port }, function() {
         callback();
    });

    client.on('error', function(error) {
        timeout = Math.max(timeout - (new Date().getTime() - started_time), 0);

        if (timeout > 0) {
            setTimeout(function() {
                __connect_to_host(timeout - 100, callback);
            }, 100);
        } else {
            console.log("ERROR: Failed to establish connection!");
        }
    });
};

module.exports = {
    ready : function(timeout) {
        return new Promise(function(resolve, reject) {
            __connect_to_host(timeout, function() {
                resolve();
            });
        });
    },

    open : function() {
        return new Promise(function(resolve, reject) {
            callbacks = new Array();
            lines = '';

            callbacks.push(resolve);

            client.on('data', function(data) {
                lines += utils.bytesToString(data);

                if (lines.match(/(.|\n)*\$ $/)) {
                    (lines.match(/(.|\n)*\$ ?/g)||[]).forEach(function(line) {
                        callbacks.shift()(line.replace('$ ', '').trimEnd());
                    });

                    lines = '';

                    return;
                }

                if (lines.match(/(DEBUG: .*\n)+/)) {
                    (lines.match(/DEBUG: .*\n/g)||[]).forEach(function(line) {
                        console.log(line.replace('DEBUG: ', '').trimEnd());
                    });

                    lines = '';

                    return;
                }
            });
        });
    },

    execute : function(command) {
        return new Promise(function(resolve, reject) {
            callbacks.push(resolve);

            client.write(command);
            client.write('\r\n');
        });
    },

    close : function() {
        client.end();
    }, 

    port : function() {
        return port;
    }
}