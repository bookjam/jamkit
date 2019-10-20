const sqlite3 = require('sqlite3'),
      vsprintf = require('sprintf-js').vsprintf

function QueryBuilder() {};

QueryBuilder.prototype.create_table = function(table, columns) {
    var defines = [];
    columns.forEach(function(column) {
        defines.push(vsprintf('%s %s', column));
    });
    return vsprintf('CREATE TABLE %s (%s)', [ table, defines.join(',') ]);
};

QueryBuilder.prototype.create_index_to_table = function(table, columns) {
    var index = vsprintf('index_%s_%s', [ table, columns.join('_') ]);
    return vsprintf('CREATE INDEX %s ON %s (%s)', [ index, table, columns.join(',') ]);
};

QueryBuilder.prototype.drop_table_if_exists = function(table) {
    return vsprintf('DROP TABLE IF EXISTS %s', [ table ]);
};

QueryBuilder.prototype.insert_row_to_table = function(table, row) {
    var columns = [], values = [];
    var self = this;
    Object.keys(row).forEach(function(column) {
        columns.push(column);
        values.push(self.__value_for_query(row[column]));
    });
    return vsprintf('INSERT INTO %s (%s) VALUES (%s)', [ table, columns.join(','), values.join(',') ]);
};

QueryBuilder.prototype.__value_for_query = function(value) {
    if (!value) {
        return 'NULL';
    }

    if (typeof value === 'string') {
        return vsprintf('\'%s\'', [ this.__escape_special_characters(value) ]);
    }

    if (typeof value === 'number' && parseInt(value) === value) {
        return vsprintf('%d', [ value ]);
    }

    if (typeof value === 'number') {
        return vsprintf('%f', [ value ]);
    }
}

QueryBuilder.prototype.__escape_special_characters = function(value) {
    value = value.replace(/\'/g, '\'\'');

    return value;
}

module.exports = {
    open_database: function(path) {
        return new sqlite3.Database(path);
    },

    close_database: function(database) {
        database.close();
    },

    create_table: function(database, table, columns) {
        database.run(new QueryBuilder().create_table(table, columns));
    },

    create_indexes_to_table: function(database, table, indexes) {
        indexes.forEach(function(columns) {
            database.run(new QueryBuilder().create_index_to_table(table, columns));
        });
    },

    drop_table_if_exists: function(database, table) {
        database.run(new QueryBuilder().drop_table_if_exists(table));
    }, 

    insert_rows_to_table: function(database, table, rows) {
        rows.forEach(function(row) {
            database.run(new QueryBuilder().insert_row_to_table(table, row));
        });
    }
}
