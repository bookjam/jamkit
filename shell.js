const net   = require('net'),
      utils = require('./utils');

var client, callbacks, lines;

function _connect_to_host(host, port, timeout, callback) {
    var started_time = new Date().getTime();

    client = net.connect({ host:host, port:port }, function() {
         callback();
    });

    client.on('error', function(error) {
        timeout = Math.max(timeout - (new Date().getTime() - started_time), 0);

        if (timeout > 0) {
            setTimeout(function() {
                _connect_to_host(host, port, timeout - 100, callback);
            }, 100);
        } else {
            console.log("ERROR: Failed to establish connection!");
        }
    });
};

module.exports = {
    ready : function(host, port, timeout) {
        return new Promise(function(resolve, reject) {
            _connect_to_host(host, port, timeout, function() {
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
    }
}
