const WHITESPACES = [ ' ', '\t', '\n', '\r', '\f', '\v' ],
      SYNTAXCHARS = [ '[', ']', '{', '}', ',', ':' ]

const ESCAPE_TABLE = {
    '"': '"', '\\': '\\', '/': '/',
    'b': '\b', 'f': '\f', 'n': '\n',
    'r': '\r', 't': '\t', 'v': '\v'
}

const REVERSE_ESCAPE_TABLE = {
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

    this._skipSpaces();

    try {
        const value = this._readValue();

        this._skipSpaces();
        
        if (!this._peekChar()) {
            return value;
        }
    } catch (e) {
        console.log(e);
    }
}

BonParser.prototype._readValue = function() {
    let value = this._readArray();

    if (!value) {
        value = this._readObject();

        if (!value) {
            value = this._readString();
        }
    }

    return value;
}

BonParser.prototype._readArray = function() {
    if (this._matchChar("[")) {
        this._skipSpaces();

        const array = [];

        while (true) {
            if (this._matchChar("]")) {
                return array;
            }

            var value = this._readValue();

            if (!value) {
                break;
            }
            
            array.push(value);

            this._skipSpaces();

            if (this._matchChar(",")) {
                this._skipSpaces();
            } else if (this._matchChar("]")) {
                return array;
            } else {
                break;
            }
        }

        throw "BonParser: " + "malformed array";
    }
}

BonParser.prototype._readObject = function() {
    if (this._matchChar("{")) {
        this._skipSpaces();

        var object = {}

        while (true) {
            if (this._matchChar("}")) {
                return object;
            }

            var key = this._readString();

            if (!key) {
                break;
            }

            this._skipSpaces();

            if (!this._matchChar(":")) {
                break;
            }

            this._skipSpaces();

            object[key] = this._readValue();

            this._skipSpaces();

            if (this._matchChar(",")) {
                this._skipSpaces();
            } else if (this._matchChar("}")) {
                return object;
            } else {
                break;
            }
        }

        throw "BonParser: " + "malformed object";
    }
}

BonParser.prototype._readString = function() {
    let ch = this._peekChar();

    if (!SYNTAXCHARS.includes(ch)) {
        let string = "";

        if (ch === '"') {
            this._consumeChar();

            while (true) {
                ch = this._peekChar();

                if (!ch) {
                    break;
                }

                this._consumeChar();

                if (ch === '"') {
                    return string;
                }

                if (ch === '\\') {
                    ch = this._peekChar();

                    if (!ch) {
                        break;
                    }

                    if (ESCAPE_TABLE.hasOwnProperty(ch)) {
                        ch = ESCAPE_TABLE[ch];
                    }

                    this._consumeChar();
                }

                string = string + ch;
            }

            throw "BonParser: " + "wrong quoted string";
        } else {
            while (true) {
                const ch = this._peekChar();

                if (!ch) {
                    break;
                }

                if (WHITESPACES.includes(ch) || SYNTAXCHARS.includes(ch)) {
                    break;
                }

                string = string + ch;

                this._consumeChar();
            }

            return string;
        }
    }
}

BonParser.prototype._peekChar = function() {
    if (this._index < this._text.length) {
        return this._text.charAt(this._index);
    }
}

BonParser.prototype._consumeChar = function() {
    this._index += 1;
}

BonParser.prototype._matchChar = function(ch) {
    if (this._peekChar() == ch) {
        this._consumeChar();

        return true;
    }

    return false;
}

BonParser.prototype._skipSpaces = function() {
    while (true) {
        const ch = this._peekChar();

        if (!WHITESPACES.includes(ch)) {
            break;
        }

        this._consumeChar();
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
        return this._stringifyValue(value);
    } catch (e) {
        console.log(e);
    }
}

BonStringifier.prototype._stringifyValue = function(value) {
    if (Array.isArray(value)) {
        return this._stringifyArray(value);
    }

    if (typeof(value) === "object") {
        return this._stringifyObject(value);
    }

    if (typeof(value) === "string") {
        return this._stringifyString(value);
    }

    console.log(typeof(value));

    throw "BonStringifier: " + "Unsupported type"
}

BonStringifier.prototype._stringifyArray = function(array) {
    let text = "[";

    text += this._appendNewline();
    this._incrementIndent();

    let once = true;
    for (let v in array) {
        if (once) {
            once = false;
        } else {
            text += ",";
            text += this._appendNewline();
        }

        text += this._appendIndent();
        text += this._stringifyValue(v);
    }

    text += this._appendNewline();
    this._decrementIndent();
    text += this._appendIndent();
    
    text += "]";

    return text;
}

BonStringifier.prototype._stringifyObject = function(object) {
    let text = "{";

    text += this._appendNewline();
    this._incrementIndent();

    let once = true;
    for (var [ k, v ] of Object.entries(object)) {
        if (once) {
            once = false;
        } else {
            text += ",";
            text += this._appendNewline();
        }

        text += this._appendIndent();
        text += k + ":" + (this._use_indent ? " " : "");
        text += this._stringifyValue(v);
    }

    text += this._appendNewline();
    this._decrementIndent();
    text += this._appendIndent();

    text += "}";

    return text;
}

BonStringifier.prototype._stringifyString = function(string) {
    let text = "";
    let quote_str = false;

    for (let ch of string) {
        if (SYNTAXCHARS.includes(ch) || 
            WHITESPACES.includes(ch) || 
            REVERSE_ESCAPE_TABLE.hasOwnProperty(ch)) {
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
            if (REVERSE_ESCAPE_TABLE.hasOwnProperty(ch)) {
                text += REVERSE_ESCAPE_TABLE[ch];
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

BonStringifier.prototype._incrementIndent = function() {
    if (this._use_indent) {
        this._indent += 4;
    }
}

BonStringifier.prototype._decrementIndent = function() {
    if (this._use_indent) {
        this._indent -= 4;
    }
}

BonStringifier.prototype._appendIndent = function() {
    let text = "";

    if (this._use_indent) {
        for (let i = 0; i < this._indent; ++i) {
            text += " ";
        }
    }

    return text;
}

BonStringifier.prototype._appendNewline = function() {
    if (this._use_indent) {
        return "\n";
    }

    return "";
}

export default {
    parse(text) {
        return new BonParser().parse(text);
    },

    stringify(value) {
        return new BonStringifier(true).stringify(value);
    }
}
