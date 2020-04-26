const __WHITESPACES = [ ' ', '\t', '\n', '\r', '\f', '\v' ],
      __SYNTAXCHARS = [ '[', ']', '{', '}', ',', ':' ]

const __ESCAPE_TABLE = {
    '"': '"', '\\': '\\', '/': '/',
    'b': '\b', 'f': '\f', 'n': '\n',
    'r': '\r', 't': '\t', 'v': '\v'
}

const __REVERSE_ESCAPE_TABLE = {
    '"': '\\"', '\\': '\\\\', '/': '\\/',
    '\b': '\\b', '\f': '\\f', '\n': '\\n',
    '\r': '\\r', '\t': '\\t', '\v': '\\v'
}

// BonParser class

function BonParser() {
    this.__text = '';
    this.__index = 0;
}

BonParser.prototype.parse = function(text) {
    this.__text = text;
    this.__index = 0;

    this.__skip_spaces();

    try {
        var value = this.__read_value();

        this.__skip_spaces();
        
        if (!this.__peek_char()) {
            return value;
        }
    } catch (e) {
        console.log(e);
    }
}

BonParser.prototype.__read_value = function() {
    var value = this.__read_array();

    if (!value) {
        value = this.__read_object();

        if (!value) {
            value = this.__read_string();
        }
    }

    return value;
}

BonParser.prototype.__read_array = function() {
    if (this.__match_char('[')) {
        this.__skip_spaces();

        var array = [];

        while (true) {
            if (this.__match_char(']')) {
                return array;
            }

            var value = this.__read_value();

            if (!value) {
                break;
            }
            
            array.push(value);

            this.__skip_spaces();

            if (this.__match_char(',')) {
                this.__skip_spaces();
            } else if (this.__match_char(']')) {
                return array;
            } else {
                break;
            }
        }

        throw 'BonParser: ' + 'malformed array';
    }
}

BonParser.prototype.__read_object = function() {
    if (this.__match_char('{')) {
        this.__skip_spaces();

        var object = {}

        while (true) {
            if (this.__match_char('}')) {
                return object;
            }

            var key = this.__read_string();

            if (!key) {
                break;
            }

            this.__skip_spaces();

            if (!this.__match_char(':')) {
                break;
            }

            this.__skip_spaces();

            object[key] = this.__read_value();

            this.__skip_spaces();

            if (this.__match_char(',')) {
                this.__skip_spaces();
            } else if (this.__match_char('}')) {
                return object;
            } else {
                break;
            }
        }

        throw 'BonParser: ' + 'malformed object';
    }
}

BonParser.prototype.__read_string = function() {
    var ch = this.__peek_char();

    if (!__SYNTAXCHARS.includes(ch)) {
        var string = '';

        if (ch === '"') {
            this.__consume_char();

            while (true) {
                ch = this.__peek_char();

                if (!ch) {
                    break;
                }

                this.__consume_char();

                if (ch === '"') {
                    return string;
                }

                if (ch === '\\') {
                    ch = this.__peek_char();

                    if (!ch) {
                        break;
                    }

                    if (__ESCAPE_TABLE.hasOwnProperty(ch)) {
                        ch = __ESCAPE_TABLE[ch];
                    }

                    this.__consume_char();
                }

                string = string + ch;
            }

            throw 'BonParser: ' + 'wrong quoted string';
        } else {
            while (true) {
                var ch = this.__peek_char();

                if (!ch) {
                    break;
                }

                if (__WHITESPACES.includes(ch) || __SYNTAXCHARS.includes(ch)) {
                    break;
                }

                string = string + ch;

                this.__consume_char();
            }

            return string;
        }
    }
}

BonParser.prototype.__peek_char = function() {
    if (this.__index < this.__text.length) {
        return this.__text.charAt(this.__index);
    }
}

BonParser.prototype.__consume_char = function() {
    this.__index += 1;
}

BonParser.prototype.__match_char = function(ch) {
    if (this.__peek_char() == ch) {
        this.__consume_char();

        return true;
    }

    return false;
}

BonParser.prototype.__skip_spaces = function() {
    while (true) {
        var ch = this.__peek_char();

        if (!__WHITESPACES.includes(ch)) {
            break;
        }

        this.__consume_char();
    }
}

// BonStringifier class

function BonStringifier(use_indent) {
    this.__use_indent = use_indent;
    this.__indent = 0;
}

BonStringifier.prototype.stringify = function(value) {
    this.__indent = 0;

    try {
        return this.__stringify_value(value);
    } catch (e) {
        console.log(e);
    }
}

BonStringifier.prototype.__stringify_value = function(value) {
    if (Array.isArray(value)) {
        return this.__stringify_array(value);
    }

    if (typeof(value) === 'object') {
        return this.__stringify_object(value);
    }

    if (typeof(value) === 'string') {
        return this.__stringify_string(value);
    }

    throw 'BonStringifier: ' + 'Unsupported type'
}

BonStringifier.prototype.__stringify_array = function(array) {
    var text = '[';

    text += this.__append_newline();
    this.__increment_indent();

    var once = true;
    for (var v in array) {
        if (once) {
            once = false;
        } else {
            text += ',';
            text += this.__append_newline();
        }

        text += this.__append_indent();
        text += this.__stringify_value(v);
    }

    text += this.__append_newline();
    this.__decrement_indent();
    text += this.__append_indent();
    
    text += ']';

    return text;
}

BonStringifier.prototype.__stringify_object = function(object) {
    var text = '{';

    text += this.__append_newline();
    this.__increment_indent();

    var once = true;
    for (var [ k, v ] of Object.entries(object)) {
        if (once) {
            once = false;
        } else {
            text += ',';
            text += this.__append_newline();
        }

        text += this.__append_indent();
        text += k + ':' + (this.__use_indent ? ' ' : '');
        text += this.__stringify_value(v);
    }

    text += this.__append_newline();
    this.__decrement_indent();
    text += this.__append_indent();

    text += '}';

    return text;
}

BonStringifier.prototype.__stringify_string = function(string) {
    var text = '';
    var quote_str = false;

    for (var ch of string) {
        if (__SYNTAXCHARS.includes(ch) || 
            __WHITESPACES.includes(ch) || 
            __REVERSE_ESCAPE_TABLE.hasOwnProperty(ch)) {
            quote_str = true;
            break;
        }
    }

    if (string.length == 0) {
        quote_str = true;
    }

    if (quote_str) {
        text += '"';

        for (var ch of string) {
            if (__REVERSE_ESCAPE_TABLE.hasOwnProperty(ch)) {
                text += __REVERSE_ESCAPE_TABLE[ch];
            } else {
                text += ch;
            }
        }

        text += '"';
    } else {
        text += string;
    }

    return text;
}

BonStringifier.prototype.__increment_indent = function() {
    if (this.__use_indent) {
        this.__indent += 4;
    }
}

BonStringifier.prototype.__decrement_indent = function() {
    if (this.__use_indent) {
        this.__indent -= 4;
    }
}

BonStringifier.prototype.__append_indent = function() {
    var text = '';

    if (this.__use_indent) {
        for (var i = 0; i < this.__indent; ++i) {
            text += ' ';
        }
    }

    return text;
}

BonStringifier.prototype.__append_newline = function() {
    if (this.__use_indent) {
        return '\n';
    }

    return '';
}

module.exports = {
    parse : function(text) {
        return new BonParser().parse(text);
    },

    stringify : function(value) {
        return new BonStringifier(true).stringify(value);
    }
}
