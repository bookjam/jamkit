const _WHITESPACES = [ ' ', '\t', '\n', '\r', '\f', '\v' ],
      _SYNTAXCHARS = [ '[', ']', '{', '}', ',', ':' ]

const _ESCAPE_TABLE = {
    '"': '"', '\\': '\\', '/': '/',
    'b': '\b', 'f': '\f', 'n': '\n',
    'r': '\r', 't': '\t', 'v': '\v'
}

const _REVERSE_ESCAPE_TABLE = {
    '"': '\\"', '\\': '\\\\', '/': '\\/',
    '\b': '\\b', '\f': '\\f', '\n': '\\n',
    '\r': '\\r', '\t': '\\t', '\v': '\\v'
}

// BonParser class

function BonParser() {
    this._text = "";
    this._index = 0;
}

BonParser.prototype.parse = function(text) {
    this._text = text;
    this._index = 0;

    this._skip_spaces();

    try {
        const value = this._read_value();

        this._skip_spaces();
        
        if (!this._peek_char()) {
            return value;
        }
    } catch (e) {
        console.log(e);
    }
}

BonParser.prototype._read_value = function() {
    var value = this._read_array();

    if (!value) {
        value = this._read_object();

        if (!value) {
            value = this._read_string();
        }
    }

    return value;
}

BonParser.prototype._read_array = function() {
    if (this._match_char("[")) {
        this._skip_spaces();

        var array = [];

        while (true) {
            if (this._match_char("]")) {
                return array;
            }

            var value = this._read_value();

            if (!value) {
                break;
            }
            
            array.push(value);

            this._skip_spaces();

            if (this._match_char(",")) {
                this._skip_spaces();
            } else if (this._match_char("]")) {
                return array;
            } else {
                break;
            }
        }

        throw "BonParser: " + "malformed array";
    }
}

BonParser.prototype._read_object = function() {
    if (this._match_char("{")) {
        this._skip_spaces();

        var object = {}

        while (true) {
            if (this._match_char("}")) {
                return object;
            }

            var key = this._read_string();

            if (!key) {
                break;
            }

            this._skip_spaces();

            if (!this._match_char(":")) {
                break;
            }

            this._skip_spaces();

            object[key] = this._read_value();

            this._skip_spaces();

            if (this._match_char(",")) {
                this._skip_spaces();
            } else if (this._match_char("}")) {
                return object;
            } else {
                break;
            }
        }

        throw "BonParser: " + "malformed object";
    }
}

BonParser.prototype._read_string = function() {
    var ch = this._peek_char();

    if (!_SYNTAXCHARS.includes(ch)) {
        var string = "";

        if (ch === '"') {
            this._consume_char();

            while (true) {
                ch = this._peek_char();

                if (!ch) {
                    break;
                }

                this._consume_char();

                if (ch === '"') {
                    return string;
                }

                if (ch === '\\') {
                    ch = this._peek_char();

                    if (!ch) {
                        break;
                    }

                    if (_ESCAPE_TABLE.hasOwnProperty(ch)) {
                        ch = _ESCAPE_TABLE[ch];
                    }

                    this._consume_char();
                }

                string = string + ch;
            }

            throw "BonParser: " + "wrong quoted string";
        } else {
            while (true) {
                var ch = this._peek_char();

                if (!ch) {
                    break;
                }

                if (_WHITESPACES.includes(ch) || _SYNTAXCHARS.includes(ch)) {
                    break;
                }

                string = string + ch;

                this._consume_char();
            }

            return string;
        }
    }
}

BonParser.prototype._peek_char = function() {
    if (this._index < this._text.length) {
        return this._text.charAt(this._index);
    }
}

BonParser.prototype._consume_char = function() {
    this._index += 1;
}

BonParser.prototype._match_char = function(ch) {
    if (this._peek_char() == ch) {
        this._consume_char();

        return true;
    }

    return false;
}

BonParser.prototype._skip_spaces = function() {
    while (true) {
        var ch = this._peek_char();

        if (!_WHITESPACES.includes(ch)) {
            break;
        }

        this._consume_char();
    }
}

// BonStringifier class

function BonStringifier(use_indent) {
    this._use_indent = use_indent;
    this._indent = 0;
}

BonStringifier.prototype.stringify = function(value) {
    this._indent = 0;

    try {
        return this._stringify_value(value);
    } catch (e) {
        console.log(e);
    }
}

BonStringifier.prototype._stringify_value = function(value) {
    if (Array.isArray(value)) {
        return this._stringify_array(value);
    }

    if (typeof(value) === "object") {
        return this._stringify_object(value);
    }

    if (typeof(value) === "string") {
        return this._stringify_string(value);
    }

    console.log(typeof(value));

    throw "BonStringifier: " + "Unsupported type"
}

BonStringifier.prototype._stringify_array = function(array) {
    var text = "[";

    text += this._append_newline();
    this._increment_indent();

    var once = true;
    for (var v in array) {
        if (once) {
            once = false;
        } else {
            text += ",";
            text += this._append_newline();
        }

        text += this._append_indent();
        text += this._stringify_value(v);
    }

    text += this._append_newline();
    this._decrement_indent();
    text += this._append_indent();
    
    text += "]";

    return text;
}

BonStringifier.prototype._stringify_object = function(object) {
    var text = "{";

    text += this._append_newline();
    this._increment_indent();

    var once = true;
    for (var [ k, v ] of Object.entries(object)) {
        if (once) {
            once = false;
        } else {
            text += ",";
            text += this._append_newline();
        }

        text += this._append_indent();
        text += k + ":" + (this._use_indent ? " " : "");
        text += this._stringify_value(v);
    }

    text += this._append_newline();
    this._decrement_indent();
    text += this._append_indent();

    text += "}";

    return text;
}

BonStringifier.prototype._stringify_string = function(string) {
    var text = "";
    var quote_str = false;

    for (let ch of string) {
        if (_SYNTAXCHARS.includes(ch) || 
            _WHITESPACES.includes(ch) || 
            _REVERSE_ESCAPE_TABLE.hasOwnProperty(ch)) {
            quote_str = true;
            break;
        }
    }

    if (string.length == 0) {
        quote_str = true;
    }

    if (quote_str) {
        text += "\"";

        for (let ch of string) {
            if (_REVERSE_ESCAPE_TABLE.hasOwnProperty(ch)) {
                text += _REVERSE_ESCAPE_TABLE[ch];
            } else {
                text += ch;
            }
        }

        text += "\"";
    } else {
        text += string;
    }

    return text;
}

BonStringifier.prototype._increment_indent = function() {
    if (this._use_indent) {
        this._indent += 4;
    }
}

BonStringifier.prototype._decrement_indent = function() {
    if (this._use_indent) {
        this._indent -= 4;
    }
}

BonStringifier.prototype._append_indent = function() {
    var text = "";

    if (this._use_indent) {
        for (let i = 0; i < this._indent; ++i) {
            text += " ";
        }
    }

    return text;
}

BonStringifier.prototype._append_newline = function() {
    if (this._use_indent) {
        return "\n";
    }

    return "";
}

module.exports = {
    parse: function(text) {
        return new BonParser().parse(text);
    },

    stringify: function(value) {
        return new BonStringifier(true).stringify(value);
    }
}
