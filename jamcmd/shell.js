const net   = require('net'),
      utils = require('./utils'),
      host  = '127.0.0.1',
      port  = 8888;

require('events').EventEmitter.defaultMaxListeners = Infinity;

var client, callbacks, lines;

var shell = {
    ready : function(timeout, callback) {
        __setup_connection(timeout, function() {
            callback();
        });
    },

    open : function(callback) {
        callbacks = new Array();
        lines = '';

        callbacks.push(callback||function(){});
        
        client.on('data', function(data) {
            lines += utils.bytesToString(data);

            if (lines.match(/(.|\n)*\$ $/)) {
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

__setup_connection = function(timeout, callback) {
    var started_time = new Date().getTime();

    client = net.connect({ host:host, port:port }, function() {
         callback();
    });

    client.on('error', function(error) {
        timeout = Math.max(timeout - (new Date().getTime() - started_time), 0);

        if (timeout > 0) {
            setTimeout(function() {
                __setup_connection(timeout - 100, callback);
            }, 100);
        } else {
            console.log("ERROR: Failed to establish connection!");
        }
    });
};

module.exports = shell;

