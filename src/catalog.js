const xlsx            = require('xlsx'),
      fs              = require('fs'),
      sqlite          = require('./sqlite'),
      vsprintf        = require('sprintf-js').vsprintf,
      is_object       = require('is-object'),
      is_empty_object = require('is-empty-object'),
      array           = require('array-extended')

const _SEPERATORS = [ '\n', '\\n', ',' ];
const _KEYS_IN_DATABASE = [ 
    'subviews', 'subcatalogs', 'categories', 
    'panes', 'banners', 'showcases', 'showcase', 'collections', 
    'purchases', 'promos', 'readings', 'auxiliary', 
    'series', 'items', 'products', 'memberships', 
    'points', 'events', 'ads', 'notifications', 'strings'
]

function _load_spreadsheet_data(path) {
    var sheets = xlsx.readFile(path).Sheets;
    var data = {};
    
    Object.keys(sheets || {}).forEach(function(name) {
        data[name] = xlsx.utils.sheet_to_json(sheets[name]);
    });

    return data;
}

function _rows_to_main_dict(rows, store) {
    var main_dict = {}, group = main_dict;

    (rows || []).forEach(function(row) {
        if (_should_skip_row(row, store)) {
            return;
        }

        if (row['category']) {
            group = {}, main_dict[row['category']] = group;
        }

        if (row['value']) {
            group[row['key']] = row['value'];
        }
    });

    return main_dict;
}

function _rows_to_dict(rows, store, skip_key) {
    var dict = {}, sortkeys = [];

    (rows || []).forEach(function(row) {
        if (_should_skip_row(row, store, skip_key)) {
            return;
        }

        var identifiers = [], data = {};

        Object.keys(row).forEach(function(header) {
			var value = row[header].toString();

            if (header.endsWith('-(o)')) { // sortkey notation
                header = header.replace(/\-\(o\)$/, '');
                sortkeys.push(header);
            }

            if (value && !header.endsWith('-(x)')) {
                var key = header.split('.');
                var target_store = (key.length > 1) ? key[1] : null;
    
                if (key[0] === 'id') {
                    identifiers.push(value);
                } else {
                    if (!target_store || target_store === store) {
                        data[key[0]] = value;
                    }
                }
            }
        });
    
        identifiers.forEach(function(identifier) {
            dict[identifier] = data;
        });
    });

    return [ dict, sortkeys ];
}

function _rows_to_raw_list(rows) {
    var raw_list = [];

    (rows || []).forEach(function(row) {
        var data = {};

        Object.keys(row).forEach(function(header) {
			var value = row[header].toString();

            if (value && !header.endsWith('-(x)')) {
                data[header] = value;
            }
        });

        raw_list.push(data);
    });

    return raw_list;
}

function _rows_to_list(rows, store, skip_key) {
    var list = [], sortkeys = [];

    (rows || []).forEach(function(row) {
        if (_should_skip_row(row, store, skip_key)) {
            return;
        }

        var identifiers = [], data = {};

        Object.keys(row).forEach(function(header) {
			var value = row[header].toString();

            if (header.endsWith('-(o)')) { // sortkey notation
                header = header.replace(/\-\(o\)$/, '');
                if (!sortkeys.includes(header)) {
                    sortkeys.push(header);
                }
            }

            if (value && !header.endsWith('-(x)')) {
                var key = header.split('.');
                var target_store = (key.length > 1) ? key[1] : null;
    
                if (key[0] === 'id') {
                    identifiers.push(value);
                } else {
                    if (!target_store || target_store === store) {
                        data[key[0]] = value;
                    }
                }
            }
        });

        identifiers.forEach(function(identifier) {
            list.push(Object.assign(JSON.parse(JSON.stringify(data)), {
                'id':identifier
            }));
        });
    });

    return [ list, sortkeys ];
}

function _should_skip_row(row, store, skip_key) {
    if (skip_key && skip_key in row && row[skip_key] == 'yes') {
        return true;
    }

    var available_stores = _unfold_value(row['available-stores-(x)']);
    if (available_stores.length && !(store in available_stores)) {
        return true;
    }

    var avoid_stores = _unfold_value(row['avoid-stores-(x)']);
    if (avoid_stores.length && (store in avoid_stores)) {
        return true;
    }

    return false;
}

function _unfold_list(list, key, unfold_func) {
    list.forEach(function(data) {
        if (key in data) {
            if (unfold_func) {
                data[key] = unfold_func(_unfold_value(data[key]));
            } else {
                data[key] = _unfold_value(data[key]);
            }
        }
    });
}

function _unfold_value(value) {
    var values = [];
    
    (value || '').split(new RegExp(_SEPERATORS.join('|'))).forEach(function(element) {
        if (element) {
            values.push(element.trim());
        }
    });

    return values;
}

function _unfold_items(values) {
    var unfolded_values = [];
    
    values.forEach(function(item) {
        var match = /([A-Z]{2}_[A-Z]{3}_[0-9]+)_([0-9]+)-([0-9]+)/.exec(item);

        if (match) {
            var prefix = match[1], first = match[2], last = match[3];

            for (var number = parseInt(first); number < parseInt(last) + 1; number++) {
                unfolded_values.push(vsprintf('%s_%06d', [ prefix, number ]))
            }
        } else {
            unfolded_values.push(item)
        }
    });

    return unfolded_values;
}

function _keys_starts_with(dict, prefix) {
    var keys = [];

    Object.keys(dict).forEach(function(key) {
        if (key.startsWith(prefix)) {
            keys.push(key);
        }
    });

    return keys;
}

function _save_table_to_database(database, table, columns, indexes, rows) {
    database.serialize(function() {
        sqlite.create_table(database, table, columns);
        if (indexes) {
            sqlite.create_indexes_to_table(database, table, indexes);
        }    
        sqlite.insert_rows_to_table(database, table, rows);    
    });
}

function _merge_sortkeys(sortkeys) {
    var merged_sortkeys = [];

    Object.keys(sortkeys).forEach(function(sortkey) {
        merged_sortkeys = array.union(merged_sortkeys, sortkeys[sortkey]);
    });

    return array.unique(merged_sortkeys);
}

function _columns_for_headers(headers) {
    var columns = [];

    headers.forEach(function(header) {
        columns.push([header,'TEXT']);
    });

    return columns;
}

function _indexes_for_headers(dataset, headers) {
    var indexes = [];

    headers.forEach(function(header) {
        indexes.push([dataset,header]);
    });

    return indexes;
}

function _values_for_headers(dict, headers) {
    var values = {};

    headers.forEach(function(header) {
        values[header.replace('-', '_')] = _value_for_key(dict, header, '');
    });

    return values;
}

function _bool_for_key(dict, key) {
    var value = _value_for_key(dict, key);

    if (value === 'yes') {
        return true;
    }

    return false;
}

function _value_for_key(dict, key, default_value) {
    if (key in dict) {
        return dict[key];
    }

    return default_value;
}

function _stringify_value(value) {
    if (Array.isArray(value) || is_object(value)) {
        return JSON.stringify(value, null, 4);
    }

    return value;
}

module.exports = {
    load_from_spreadsheet: function(path, store) {
        var source = _load_spreadsheet_data(path);
        var data = {}, sortkeys = {};

        var main_dict = _rows_to_main_dict(source['main'], store);
        if (!is_empty_object(main_dict)) {
            [ 'related-catalogs' ].forEach(function(key) {
                _unfold_list([ main_dict ], key);
            });
            Object.assign(data, main_dict);
        }

        var subviews_list = _rows_to_list(source['subviews'], store, 'do-not-display-(x)');
        if (subviews_list[0].length) {
            data['subviews'] = subviews_list[0];
        }

        var subcatalogs_dict = _rows_to_dict(source['subcatalogs'], store, 'do-not-display-(x)');
        if (!is_empty_object(subcatalogs_dict[0])) {
            data['subcatalogs'] = subcatalogs_dict[0];
        }

        var categories_sheets = _keys_starts_with(source, 'categories.');
        if (categories_sheets.length) {
            var categories_dict = {};
            categories_sheets.forEach(function(sheet) {
                var category_list = _rows_to_list(source[sheet], store, 'do-not-display-(x)');

                if (categories_list[0].length) {
                    categories_dict[sheet.substring('categories.'.length)] = category_list[0];
                }
            });
            if (!is_empty_object(categories_dict)) {
                data['categories'] = categories_dict;
            }
        } else {
            var categories_list = _rows_to_list(source['categories'], store, 'do-not-display-(x)');
            if (categories_list[0].length) {
                data['categories'] = categories_list[0];
            }
        }

        [ 'panes', 'banners', 'showcases', 'collections' ].forEach(function(dataset) {
            var singular_keys = { 'banners': 'banner', 'showcases': 'showcase', 'collections': 'collection' };
            var dataset_prefix = ((dataset in singular_keys) ? singular_keys[dataset] : dataset) + '.';
            var dataset_sheets = _keys_starts_with(source, dataset_prefix);
            var datasets_dict = {}, datasets_sortkeys = {};

            dataset_sheets.forEach(function(sheet) {
                var dataset_list = _rows_to_list(source[sheet], store, 'do-not-display-(x)');

                if (dataset_list[0].length) {
                    [ 'categories', 'memberships' ].forEach(function(key) {
                        _unfold_list(dataset_list[0], key);
                    });
                    datasets_dict[sheet.substring(dataset_prefix.length)] = dataset_list[0];
                    datasets_sortkeys[sheet.substring(dataset_prefix.length)] = dataset_list[1];
                }
            });
            if (!is_empty_object(datasets_dict)) {
                data[dataset] = datasets_dict, sortkeys[dataset] = datasets_sortkeys;
            }
        });

        [ 'purchases', 'promos', 'readings', 'auxiliary' ].forEach(function(dataset) {
            var dataset_prefix = dataset + '.';
            var dataset_sheets = _keys_starts_with(source, dataset_prefix);
            var datasets_dict = {};

            dataset_sheets.forEach(function(sheet) {
                var dataset_dict = _rows_to_dict(source[sheet], store, 'do-not-display-(x)');

                if (!is_empty_object(dataset_dict[0])) {
                    datasets_dict[sheet.substring(dataset_prefix.length)] = dataset_dict[0];
                }
            });
            if (!is_empty_object(datasets_dict)) {
                data[dataset] = datasets_dict;
            }
        });

        var products_dict = _rows_to_dict(source['products'], store, 'not-for-sale-(x)');
        [ 'stores', 'points', 'required-products', 'required-events', 'required-memberships' ].forEach(function(key) {
            _unfold_list(Object.values(products_dict[0] || {}), key);
        });
        _unfold_list(Object.values(products_dict[0] || {}), 'items', _unfold_items);
        if (!is_empty_object(products_dict[0])) {
            data['products'] = products_dict[0];
        }

        var items_dict = _rows_to_dict(source['items'], store, 'not-for-sale-(x)');
        [ 'series' ].forEach(function(key) {
            _unfold_list(Object.values(items_dict[0] || {}), key);
        });
        if (!is_empty_object(items_dict[0])) {
            data['items'] = items_dict[0];
        }

        [ 'series', 'memberships', 'points', 'events', 'ads', 'notifications' ].forEach(function(dataset) {
            var dataset_dict = _rows_to_dict(source[dataset], store, 'not-for-sale-(x)');
            if (!is_empty_object(dataset_dict[0])) {
                data[dataset] = dataset_dict[0];
            }
        });
       
        var strings_list = _rows_to_raw_list(source['strings']);
        if (!is_empty_object(strings_list)) {
            data['strings'] = strings_list;
        }

        return [ data, sortkeys ];
    },

    save_to_file: function(data, path, include_all_data) {
        var keys_to_skip = _bool_for_key(data, 'uses-database') ? _KEYS_IN_DATABASE : [];
        var catalog_dict = {};

        Object.keys(data).forEach(function(key) {
            if (include_all_data || !keys_to_skip.includes(key)) {
                catalog_dict[key] = data[key];
            }
        });

        fs.writeFileSync(path, JSON.stringify(catalog_dict, null, 4));
    },

    save_to_database: function(data, sortkeys, path) {
        if (fs.existsSync(path)) {
            fs.unlinkSync(path);
        }

        var database = sqlite.open_database(path);

        if ('subviews' in data) {
            var subviews_rows = [];

            (data['subviews']).forEach(function(subview_dict) {
                subviews_rows.push({
                    'id': subview_dict['id'],
                    'type': subview_dict['type'],
                    'attr': _stringify_value(subview_dict)
                });
            });

            _save_table_to_database(
                database,
                'subviews', 
                [['id','TEXT'],['type','TEXT'],['attr','TEXT']], 
                [['id'],['type']],
                subviews_rows
            );
        }

        if ('subcatalogs' in data) {
            var subcatalogs_rows = [];

            Object.keys(data['subcatalogs']).forEach(function(identifier) {
                var subcatalog_dict = data['subcatalogs'][identifier];
                subcatalogs_rows.push({
                    'id': identifier,
                    'attr': _stringify_value(subcatalog_dict)
                });
            });

            _save_table_to_database(
                database,
                'subcatalogs', 
                [['id','TEXT'],['attr','TEXT']], 
                [['id']],
                subcatalogs_rows
            );
        }

        if ('categories' in data) {
            var categories_rows = [];

            if (Array.isArray(data['categories'])) {
                data['categories'].forEach(function(category_dict) {
                    categories_rows.push({
                        'id': category_dict['id'],
                        'subcatalog': '__DEFAULT__',
                        'attr': _stringify_value(category_dict)
                    });
                });
            } else {
                Object.keys(data['categories']).forEach(function(name) {
                    var subcatalog_list = data['categories'][name];
                    subcatalog_list.forEach(function(category_dict) {
                        categories_rows.push({
                            'id': category_dict['id'],
                            'subcatalog': name,
                            'attr': _stringify_value(category_dict)
                        });
                    });
                });
            }

            _save_table_to_database(
                database,
                'categories', 
                [['id','TEXT'],['subcatalog','TEXT'],['attr','TEXT']], 
                [['id'],['subcatalog']],
                categories_rows
            );
        }  
        
        [ 'panes', 'banners', 'showcases', 'collections' ].forEach(function(dataset) {
            if (dataset in data) {
                var singular_keys = { 'banners': 'banner', 'showcases': 'showcase', 'collections': 'collection' };
                var singular_key = (dataset in singular_keys) ? singular_keys[dataset] : dataset;
                var datasets_rows = [], dataset_to_category = [], dataset_to_membership = [];
                var datasets_sortkeys = _merge_sortkeys(sortkeys[dataset] || {});
    
                Object.keys(data[dataset]).forEach(function(name) {
                    var dataset_list = data[dataset][name];
                    dataset_list.forEach(function(dataset_dict) {
                        if ('categories' in dataset_dict) {
                            dataset_dict['categories'].forEach(function(category) {
                                dataset_to_category.push({
                                    'id': dataset_dict['id'],
                                    [singular_key]: name, 
                                    'category': category
                                });
                            });
                            delete dataset_dict['categories'];
                        }
    
                        if ('memberships' in dataset_dict) {
                            dataset_dict['memberships'].forEach(function(membership) {
                                dataset_to_membership.push({
                                    'id': dataset_dict['id'],
                                    [singular_key]: name, 
                                    'membership': membership
                                });
                            });
                            delete dataset_dict['memberships'];
                        }
                        
                        datasets_rows.push(Object.assign({
                            'id': dataset_dict['id'],
                            [singular_key]: name,
                            'attr': _stringify_value(dataset_dict)
                        }, _values_for_headers(dataset_dict, datasets_sortkeys)));
                    });
                });
    
                _save_table_to_database(
                    database,
                    singular_key + '_to_category', 
                    [['id','TEXT'],[singular_key,'TEXT'],['category','TEXT']], 
                    [[singular_key,'category']],
                    dataset_to_category
                );
                _save_table_to_database(
                    database,
                    singular_key + '_to_membership', 
                    [['id','TEXT'],[singular_key,'TEXT'],['membership','TEXT']], 
                    [[singular_key,'membership']],
                    dataset_to_membership
                );

                var columns = [['id','TEXT'],[singular_key,'TEXT'],['series','TEXT'],['item','TEXT'],['attr','TEXT']];
                var unique_sortkeys = datasets_sortkeys.filter(function(value, index, self) {
                    return !['id',singular_key,'series','item'].includes(value);
                });
                _save_table_to_database(
                    database,
                    dataset, 
                    array.union(columns, _columns_for_headers(unique_sortkeys)), 
                    array.union([['id'],[singular_key],['series'],['item']], _indexes_for_headers(singular_key, unique_sortkeys)),
                    datasets_rows
                );
            }
        });
        
        [ 'purchases', 'promos', 'readings', 'auxiliary' ].forEach(function(dataset) {
            if (dataset in data) {
                var datasets_rows = [];

                Object.keys(data[dataset]).forEach(function(name) {
                    var datasets_dict = data[dataset][name];
                    Object.keys(datasets_dict).forEach(function(identifier) {
                        datasets_rows.push({
                            'id': identifier,
                            [dataset]: name,
                            'attr': _stringify_value(datasets_dict[identifier])
                        });
                    });
                }); 
                
                _save_table_to_database(
                    database,
                    dataset,
                    [['id','TEXT'],[dataset,'TEXT'],['attr','TEXT']],
                    [['id',dataset]],
                    datasets_rows
                );
            }
        });

        if ('items' in data) {
            var items_rows = [];
            var item_to_series = [];

            Object.keys(data['items']).forEach(function(identifier) {
                var item_dict = data['items'][identifier];
                if ('series' in item_dict) {
                    item_dict['series'].forEach(function(series) {
                        item_to_series.push({
                            'item': identifier,
                            'series': series
                        });
                    });
                    delete item_dict['series']
                }
                items_rows.push({
                    'id': identifier,
                    'attr': _stringify_value(item_dict)
                });
            });

            _save_table_to_database(
                database,
                'item_to_series',
                [['item','TEXT'],['series','TEXT']],
                [['item'],['series']],
                item_to_series
            );
            _save_table_to_database(
                database,
                'items',
                [['id','TEXT'],['attr','TEXT']],
                [['id']],
                items_rows
            );
        }

        if ('products' in data) {
            var products_rows = [];
            var product_to_item = [], product_to_store = [];

            Object.keys(data['products']).forEach(function(identifier) {
                var product_dict = data['products'][identifier];
                var free_of_charge = _bool_for_key(product_dict, 'free-of-charge');
                if ('items' in product_dict) {
                    product_dict['items'].forEach(function(item) {
                        product_to_item.push({
                            'product': identifier,
                            'item': item
                        });
                    });
                    delete product_dict['items']
                }
                if ('stores' in product_dict) {
                    product_dict['stores'].forEach(function(store) {
                        product_to_store.push({
                            'product': identifier,
                            'store': store
                        });
                    });
                    delete product_dict['stores']
                }
                products_rows.push({
                    'id': identifier,
                    'free_of_charge': free_of_charge ? 1 : 0,
                    'attr': _stringify_value(product_dict)
                });
            });

            _save_table_to_database(
                database,
                'product_to_item',
                [['product','TEXT'],['item','TEXT']],
                [['product'],['item']],
                product_to_item
            );
            _save_table_to_database(
                database,
                'product_to_store',
                [['product','TEXT'],['store','TEXT']],
                [['product'],['store']],
                product_to_store
            );
            _save_table_to_database(
                database,
                'products',
                [['id','TEXT'],['free_of_charge','INTEGER'],['attr','TEXT']],
                [['id'],['free_of_charge']],
                products_rows
            );
        }

        [ 'series', 'memberships', 'points', 'events', 'ads', 'notifications' ].forEach(function(dataset) {
            if (dataset in data) {
                var datasets_rows = [];

                Object.keys(data[dataset]).forEach(function(identifier) {
                    var dataset_dict = data[dataset][identifier];
                    datasets_rows.push({
                        'id': identifier,
                        'attr': _stringify_value(dataset_dict)
                    });
                });
    
                _save_table_to_database(
                    database,
                    dataset,
                    [['id','TEXT'],['attr','TEXT']],
                    [['id']],
                    datasets_rows
                );
            }
        });

        if ('strings' in data) {
            var strings_rows = [], languages = [];

            data['strings'].forEach(function(dataset) {
                Object.keys(dataset).forEach(function(header) {
                    if (header !== 'key' && !languages.includes(header)) {
                        languages.push(header);
                    }
                });

                strings_rows.push(dataset);
            }); 
            
            _save_table_to_database(
                database,
                'strings',
                array.union([['key','TEXT']], _columns_for_headers(languages)),
                [['key']],
                strings_rows
            );
        }

        sqlite.close_database(database);
    }
}
