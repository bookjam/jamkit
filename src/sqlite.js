import sqlite3 from "node-sqlite3-wasm";
import { vsprintf } from "sprintf-js";

const { Database } = sqlite3;

class QueryBuilder {
    createTable(table, columns) {
        const defines = [];

        columns.forEach((column) => {
            defines.push(vsprintf("%s %s", column));
        });
        
        return vsprintf("CREATE TABLE %s (%s)", [ table, defines.join(",") ]);
    }

    createIndexToTable(table, columns) {
        const index = vsprintf("index_%s_%s", [ table, columns.join("_") ]);

        return vsprintf("CREATE INDEX %s ON %s (%s)", [ index, table, columns.join(",") ]);
    }

    dropTableIfExists(table) {
        return vsprintf("DROP TABLE IF EXISTS %s", [ table ]);
    }

    insertRowToTable(table, row) {
        const columns = [], values = [];

        Object.keys(row).forEach((column) => {
            columns.push(column);
            values.push(this._getValueForQuery(row[column]));
        });

        return vsprintf("INSERT INTO %s (%s) VALUES (%s)", [ table, columns.join(","), values.join(",") ]);
    }

    _getValueForQuery(value) {
        if (value == null) {
            return "NULL";
        }

        if (typeof value === "string") {
            return vsprintf("'%s'", [ this._escapeString(value) ]);
        }

        if (Number.isInteger(value)) {
            return vsprintf("%d", [ value ]);
        }

        if (Number.isFinite(value)) {
            return vsprintf("%f", [ value ]);
        }

        return String(value);
    }

    _escapeString(value) {
        return value.replace(/\'/g, "''");
    }
}

export default {
    openDatabase(path) {
        return new Database(path);
    },

    closeDatabase(database) {
        database.close();
    },

    createTable(database, table, columns) {
        database.exec(new QueryBuilder().createTable(table, columns));
    },

    createIndexesToTable(database, table, indexes) {
        indexes.forEach((columns) => {
            database.exec(new QueryBuilder().createIndexToTable(table, columns));
        });
    },

    dropTableIfExists(database, table) {
        database.exec(new QueryBuilder().dropTableIfExists(table));
    }, 

    insertRowsToTable(database, table, rows) {
        rows.forEach((row) => {
            database.exec(new QueryBuilder().insertRowToTable(table, row));
        });
    }
}
