type BonValue = string | number | boolean | BonObject | BonArray;
type BonObject = { [key: string]: BonValue };
type BonArray = BonValue[];

interface EscapeTable {
    [key: string]: string;
}

const WHITESPACES: string[] = [' ', '\t', '\n', '\r', '\f', '\v'];
const SYNTAXCHARS: string[] = ['[', ']', '{', '}', ',', ':'];

const ESCAPE_TABLE: EscapeTable = {
    '"': '"', '\\': '\\', '/': '/',
    'b': '\b', 'f': '\f', 'n': '\n',
    'r': '\r', 't': '\t', 'v': '\v'
};

const REVERSE_ESCAPE_TABLE: EscapeTable = {
    '"': '\\"', '\\': '\\\\', '/': '\\/',
    '\b': '\\b', '\f': '\\f', '\n': '\\n',
    '\r': '\\r', '\t': '\\t', '\v': '\\v'
};

class BonParser {
    private _text: string = "";
    private _index: number = 0;

    parse(text: string): BonValue | undefined {
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

    private _readValue(): BonValue | undefined {
        let value: BonValue | undefined = this._readArray();

        if (!value) {
            value = this._readObject();

            if (!value) {
                value = this._readString();
            }
        }

        return value;
    }

    private _readArray(): BonArray | undefined {
        if (this._matchChar("[")) {
            this._skipSpaces();

            const array: BonArray = [];

            while (true) {
                if (this._matchChar("]")) {
                    return array;
                }

                const value = this._readValue();

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

            throw new Error("BonParser: malformed array");
        }
    }

    private _readObject(): BonObject | undefined {
        if (this._matchChar("{")) {
            this._skipSpaces();

            const object: BonObject = {};

            while (true) {
                if (this._matchChar("}")) {
                    return object;
                }

                const key = this._readString();

                if (!key) {
                    break;
                }

                this._skipSpaces();

                if (!this._matchChar(":")) {
                    break;
                }

                this._skipSpaces();

                const value = this._readValue();
                if (value !== undefined) {
                    object[key] = value;
                }

                this._skipSpaces();

                if (this._matchChar(",")) {
                    this._skipSpaces();
                } else if (this._matchChar("}")) {
                    return object;
                } else {
                    break;
                }
            }

            throw new Error("BonParser: malformed object");
        }
    }

    private _readString(): string | undefined {
        let ch = this._peekChar();

        if (ch && !SYNTAXCHARS.includes(ch)) {
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

                throw new Error("BonParser: wrong quoted string");
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

    private _peekChar(): string | undefined {
        if (this._index < this._text.length) {
            return this._text.charAt(this._index);
        }
    }

    private _consumeChar(): void {
        this._index += 1;
    }

    private _matchChar(ch: string): boolean {
        if (this._peekChar() === ch) {
            this._consumeChar();
            return true;
        }
        return false;
    }

    private _skipSpaces(): void {
        while (true) {
            const ch = this._peekChar();

            if (!ch || !WHITESPACES.includes(ch)) {
                break;
            }

            this._consumeChar();
        }
    }
}

class BonStringifier {
    private _useIndent: boolean;
    private _indent: number = 0;

    constructor(useIndent: boolean) {
        this._useIndent = useIndent;
    }

    stringify(value: BonValue): string | undefined {
        this._indent = 0;

        try {
            return this._stringifyValue(value);
        } catch (e) {
            console.log(e);
        }
    }

    private _stringifyValue(value: BonValue): string {
        if (Array.isArray(value)) {
            return this._stringifyArray(value);
        }

        if (typeof value === "object" && value !== null) {
            return this._stringifyObject(value as BonObject);
        }

        if (typeof value === "string") {
            return this._stringifyString(value);
        }

        console.log(typeof value);

        throw new Error("BonStringifier: Unsupported type");
    }

    private _stringifyArray(array: BonArray): string {
        let text = "[";

        text += this._appendNewline();
        this._incrementIndent();

        let once = true;
        for (const v of array) {
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

    private _stringifyObject(object: BonObject): string {
        let text = "{";

        text += this._appendNewline();
        this._incrementIndent();

        let once = true;
        for (const [k, v] of Object.entries(object)) {
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

    private _stringifyString(string: string): string {
        let text = "";
        let quote_str = false;

        for (const ch of string) {
            if (SYNTAXCHARS.includes(ch) || WHITESPACES.includes(ch) || REVERSE_ESCAPE_TABLE.hasOwnProperty(ch)) {
                quote_str = true;
                break;
            }
        }

        if (string.length === 0) {
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

    private _incrementIndent(): void {
        if (this._useIndent) {
            this._indent += 4;
        }
    }

    private _decrementIndent(): void {
        if (this._useIndent) {
            this._indent -= 4;
        }
    }

    private _appendIndent(): string {
        let text = "";

        if (this._useIndent) {
            for (let i = 0; i < this._indent; ++i) {
                text += " ";
            }
        }

        return text;
    }

    private _appendNewline(): string {
        if (this._useIndent) {
            return "\n";
        }

        return "";
    }
}

interface BonModule {
    parse(text: string): BonValue | undefined;
    stringify(value: BonValue): string | undefined;
}

const bon: BonModule = {
    parse(text: string): BonValue | undefined {
        return new BonParser().parse(text);
    },

    stringify(value: BonValue): string | undefined {
        return new BonStringifier(true).stringify(value);
    }
};

export default bon;