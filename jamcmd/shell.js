const net   = require('net'),
      utils = require('./utils'),
      host  = '127.0.0.1',
      port  = 8888;

var client, callbacks, lines;

var shell = {
    ready : function(timeout) {
        client = net.connect({ host:host, port:port }, function() {
            timeout = 0;
        });

        client.on('error', function(error) {
            if (error.code === 'ECONNREFUSED') {
                client.setTimeout(100, function() {
                    client.connect({ host:host, port:port }, function() {
                        timeout = 0;
                    });
                });
            }
        });

        while (timeout > 0) {
            timeout = timeout - 100;
            utils.sleep(100);
        }

        client.end();
    },

    open : function(callback) {
        client = net.connect({ host:host, port:port });
        callbacks = new Array();
        lines = '';

        callbacks.push(callback||function(){});
        
        client.on('data', function(data) {
            lines += utils.bytesToString(data);

            if (lines.match(/\$ $/)) {
                (lines.match(/(.|\n)*\$ ?/g)||[]).forEach(function(line) {
                    callbacks.shift()(line.replace('$ ', '').trim());
                });

                lines = '';
            }
        });
    },

    execute : function(command, callback) {
        callbacks.push(callback||function(){});

        client.write(command);
        client.write('\r\n');
    },

    close : function() {
        client.end();
    }
};

module.exports = shell;

