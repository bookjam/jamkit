const fs = require('fs');

function _migrate_new_style(line, trailing) {
    var m = /(\s*)([#%\/][^:]+):(.*)/.exec(line);

    if (m) {
        var props = [...m[3].trim().matchAll(/(([\w\d-]+)\s*=\s*("(\\"|[^"])+"|'(\\'|[^'])+'|[^,]+))(,|$)/g)];
        var style = _build_new_style(m[1], m[2], props.map(function(prop) {
            var name  = prop[2].trim();
            var value = prop[3].trim().replace(/^["']|["']$/g, "");
        
            return [ name, value ];
        }));

        return style + trailing;
    }
}

function _build_new_style(leading, selector, props) {
    var style = leading + selector + " {" + "\n";

    props.forEach(function([ name, value ]) {
        style += leading + "    " + name + ": " + value + ";" + "\n";
    });

    style += leading + "}";

    return style;
}

module.exports = {
    migrate: function(path) {
        var source = fs.readFileSync(path, { encoding: 'utf8' });
        var lines = [], multiline = false;
        var text = "";
        
        source.split(/\r\n|\n|\r/).forEach(function(line) {
            if (multiline) {
                lines[lines.length - 1] += line.replace(/^\s+|\\$/g, '');
            } else {
                lines.push(line.replace(/\\$/, ''));
            }

            multiline = line.endsWith('\\') ? true : false;
        });

        var last_migrated = false;
        lines.forEach(function(line) {
            var style = _migrate_new_style(line, "\n\n");

            if (!style) {
                if (last_migrated) {
                    text = text.replace(/\n\n$/, "");
                }
                text += line + "\n";
                last_migrated = false;
            } else {
                text += style + "\n";
                last_migrated = true;
            }
        });

        text = text.replace(/\n{2,}$/, "\n");
        text = text.replace(/\n{3,}/g, "\n\n");

        fs.writeFileSync(path, text);
    }
}
