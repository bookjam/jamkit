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

class BonParser {
    constructor() {
        this._text = "";
        this._index = 0;
    }

    parse(text) {
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

    _readValue() {
        let value = this._readArray();

        if (!value) {
            value = this._readObject();

            if (!value) {
                value = this._readString();
            }
        }

        return value;
    }

    _readArray() {
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

            throw "BonParser: malformed array";
        }
    }

    _readObject() {
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

            throw "BonParser: malformed object";
        }
    }

    _readString() {
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

                throw "BonParser: wrong quoted string";
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

    _peekChar() {
        if (this._index < this._text.length) {
            return this._text.charAt(this._index);
        }
    }

    _consumeChar() {
        this._index += 1;
    }

    _matchChar(ch) {
        if (this._peekChar() == ch) {
            this._consumeChar();
            return true;
        }
        return false;
    }

    _skipSpaces() {
        while (true) {
            const ch = this._peekChar();

            if (!WHITESPACES.includes(ch)) {
                break;
            }

            this._consumeChar();
        }
    }
}

class BonStringifier {
    constructor(useIndent) {
        this._useIndent = useIndent;
        this._indent = 0;
    }

    stringify(value) {
        this._indent = 0;

        try {
            return this._stringifyValue(value);
        } catch (e) {
            console.log(e);
        }
    }

    _stringifyValue(value) {
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

        throw "BonStringifier: Unsupported type"
    }

    _stringifyArray(array) {
        let text = "[";

        text += this._appendNewline();
        this._incrementIndent();

        let once = true;
        for (let v of array) {
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

    _stringifyObject(object) {
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
            text += k + ":" + (this._useIndent ? " " : "");
            text += this._stringifyValue(v);
        }

        text += this._appendNewline();
        this._decrementIndent();
        text += this._appendIndent();

        text += "}";

        return text;
    }

    _stringifyString(string) {
        let text = "";
        let quote_str = false;

        for (const ch of string) {
            if (SYNTAXCHARS.includes(ch) || WHITESPACES.includes(ch) || REVERSE_ESCAPE_TABLE.hasOwnProperty(ch)) {
                quote_str = true;
                break;
            }
        }

        if (string.length == 0) {
            quote_str = true;
        }

        if (quote_str) {
            text += "\"";

            for (const ch of string) {
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

    _incrementIndent() {
        if (this._useIndent) {
            this._indent += 4;
        }
    }

    _decrementIndent() {
        if (this._useIndent) {
            this._indent -= 4;
        }
    }

    _appendIndent() {
        let text = "";

        if (this._useIndent) {
            for (let i = 0; i < this._indent; ++i) {
                text += " ";
            }
        }

        return text;
    }

    _appendNewline() {
        if (this._useIndent) {
            return "\n";
        }

        return "";
    }
}

export default {
    parse(text) {
        return new BonParser().parse(text);
    },

    stringify(value) {
        return new BonStringifier(true).stringify(value);
    }
}
