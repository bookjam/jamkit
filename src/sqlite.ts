import sqlite3 from "node-sqlite3-wasm";
import { vsprintf } from "sprintf-js";

const { Database } = sqlite3;

type DatabaseValue = string | number | null | undefined;
type DatabaseRow = { [column: string]: DatabaseValue };
type ColumnDefinition = [string, string]; // [column_name, column_type]

interface DatabaseInstance {
    exec(query: string): void;
    close(): void;
}

class QueryBuilder {
    createTable(table: string, columns: ColumnDefinition[]): string {
        const defines: string[] = [];

        columns.forEach((column) => {
            defines.push(vsprintf("%s %s", column));
        });

        return vsprintf("CREATE TABLE %s (%s)", [table, defines.join(",")]);
    }

    createIndexToTable(table: string, columns: string[]): string {
        const index = vsprintf("index_%s_%s", [table, columns.join("_")]);

        return vsprintf("CREATE INDEX %s ON %s (%s)", [index, table, columns.join(",")]);
    }

    dropTableIfExists(table: string): string {
        return vsprintf("DROP TABLE IF EXISTS %s", [table]);
    }

    insertRowToTable(table: string, row: DatabaseRow): string {
        const columns: string[] = [];
        const values: string[] = [];

        Object.keys(row).forEach((column) => {
            columns.push(column);
            values.push(this._getValueForQuery(row[column]));
        });

        return vsprintf("INSERT INTO %s (%s) VALUES (%s)", [table, columns.join(","), values.join(",")]);
    }

    private _getValueForQuery(value: DatabaseValue): string {
        if (value == null) {
            return "NULL";
        }

        if (typeof value === "string") {
            return vsprintf("'%s'", [this._escapeString(value)]);
        }

        if (Number.isInteger(value)) {
            return vsprintf("%d", [value]);
        }

        if (Number.isFinite(value)) {
            return vsprintf("%f", [value]);
        }

        return String(value);
    }

    private _escapeString(value: string): string {
        return value.replace(/\'/g, "''");
    }
}

interface SqliteModule {
    openDatabase(path: string): DatabaseInstance;
    closeDatabase(database: DatabaseInstance): void;
    createTable(database: DatabaseInstance, table: string, columns: ColumnDefinition[]): void;
    createIndexesToTable(database: DatabaseInstance, table: string, indexes: string[][]): void;
    dropTableIfExists(database: DatabaseInstance, table: string): void;
    insertRowsToTable(database: DatabaseInstance, table: string, rows: DatabaseRow[]): void;
}

const sqlite: SqliteModule = {
    openDatabase(path: string): DatabaseInstance {
        return new Database(path);
    },

    closeDatabase(database: DatabaseInstance): void {
        database.close();
    },

    createTable(database: DatabaseInstance, table: string, columns: ColumnDefinition[]): void {
        database.exec(new QueryBuilder().createTable(table, columns));
    },

    createIndexesToTable(database: DatabaseInstance, table: string, indexes: string[][]): void {
        indexes.forEach((columns) => {
            database.exec(new QueryBuilder().createIndexToTable(table, columns));
        });
    },

    dropTableIfExists(database: DatabaseInstance, table: string): void {
        database.exec(new QueryBuilder().dropTableIfExists(table));
    },

    insertRowsToTable(database: DatabaseInstance, table: string, rows: DatabaseRow[]): void {
        rows.forEach((row) => {
            database.exec(new QueryBuilder().insertRowToTable(table, row));
        });
    }
};

export default sqlite;