const sqlite          = require('./sqlite'),
      xlsx            = require('xlsx'),
      fs              = require('fs'),
      vsprintf        = require('sprintf-js').vsprintf,
      is_object       = require('is-object'),
      is_empty_object = require('is-empty-object'),
      array           = require('array-extended')

const __SEPERATORS = [ '\n', '\\n', ',' ];
const __KEYS_IN_DATABASE = [ 
    'subviews', 'subcatalogs', 'categories', 
    'panes', 'banners', 'showcases', 'showcase', 'collections', 
    'purchases', 'promos', 'readings', 'auxiliary', 
    'series', 'items', 'products', 'memberships', 
    'points', 'events', 'notifications'
]

function __load_spreadsheet_data(path) {
    var sheets = xlsx.readFile(path).Sheets;
    var data = {};
    
    Object.keys(sheets || {}).forEach(function(name) {
        data[name] = xlsx.utils.sheet_to_json(sheets[name]);
    });

    return data;
}

function __rows_to_main_dict(rows, store) {
    var main_dict = {}, group = main_dict;

    (rows || []).forEach(function(row) {
        if (__should_skip_row(row, store)) {
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

function __rows_to_dict(rows, store, skip_key) {
    var dict = {}, sortkeys = [];

    (rows || []).forEach(function(row) {
        if (__should_skip_row(row, store, skip_key)) {
            return;
        }

        var identifiers = [], data = {};

        Object.keys(row).forEach(function(header) {
            if (header.endsWith('-(o)')) { // sortkey notation
                header = header.replace(/\-\(o\)$/, '');
                sortkeys.push(header);
            }

            if (row[header] && !header.endsWith('-(x)')) {
                var key = header.split('.');
                var target_store = (key.length > 1) ? key[1] : null;
    
                if (key[0] === 'id') {
                    identifiers.push(row[header]);
                } else {
                    if (!target_store || target_store === store) {
                        data[key[0]] = row[header];
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

function __rows_to_list(rows, store, skip_key) {
    var list = [], sortkeys = [];

    (rows || []).forEach(function(row) {
        if (__should_skip_row(row, store, skip_key)) {
            return;
        }

        var identifiers = [], data = {};

        Object.keys(row).forEach(function(header) {
            if (header.endsWith('-(o)')) { // sortkey notation
                header = header.replace(/\-\(o\)$/, '');
                if (!sortkeys.includes(header)) {
                    sortkeys.push(header);
                }
            }

            if (row[header] && !header.endsWith('-(x)')) {
                var key = header.split('.');
                var target_store = (key.length > 1) ? key[1] : null;
    
                if (key[0] === 'id') {
                    identifiers.push(row[header]);
                } else {
                    if (!target_store || target_store === store) {
                        data[key[0]] = row[header];
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

function __should_skip_row(row, store, skip_key) {
    if (skip_key && skip_key in row && row[skip_key] == 'yes') {
        return true;
    }

    var available_stores = __unfold_value(row['available-stores-(x)']);
    if (available_stores.length && !(store in available_stores)) {
        return true;
    }

    var avoid_stores = __unfold_value(row['avoid-stores-(x)']);
    if (avoid_stores.length && (store in avoid_stores)) {
        return true;
    }

    return false;
}

function __unfold_list(list, key, unfold_func) {
    list.forEach(function(data) {
        if (key in data) {
            if (unfold_func) {
                data[key] = unfold_func(__unfold_value(data[key]));
            } else {
                data[key] = __unfold_value(data[key]);
            }
        }
    });
}

function __unfold_value(value) {
    var values = [];
    
    (value || '').split(new RegExp(__SEPERATORS.join('|'))).forEach(function(element) {
        if (element) {
            values.push(element.trim());
        }
    });

    return values;
}

function __unfold_items(values) {
    var unfolded_values = [];
    
    values.forEach(function(item) {
        var m = /([A-Z]{2}_[A-Z]{3}_[0-9]+)_([0-9]+)-([0-9]+)/.exec(item);

        if (m) {
            var prefix = m.group(1), first = m.group(2), last = m.group(3);

            for (var number = parseInt(first); number < parseInt(last) + 1; number++) {
                unfolded_values.push(vsprintf('%s_%06d', [ prefix, number ]))
            }
        } else {
            unfolded_values.push(item)
        }
    });

    return unfolded_values;
}

function __keys_starts_with(dict, prefix) {
    var keys = [];

    Object.keys(dict).forEach(function(key) {
        if (key.startsWith(prefix)) {
            keys.push(key);
        }
    });

    return keys;
}

function __save_table_to_database(table, columns, indexes, rows, path) {
    var database = sqlite.open_database(path);

    sqlite.create_table(database, table, columns);
    if (indexes) {
        sqlite.create_indexes_to_table(database, table, indexes);
    }    
    sqlite.insert_rows_to_table(database, table, rows);
    sqlite.close_database(database);
}

function __merge_sortkeys(sortkeys) {
    var merged_sortkeys = [];

    Object.keys(sortkeys).forEach(function(name) {
        array.union(merged_sortkeys, sortkeys[name]);
    });

    return array.unique(merged_sortkeys);
}

function __columns_for_sortkeys(sortkeys) {
    var columns = [];

    sortkeys.forEach(function(sortkey) {
        columns.push([sortkey,'TEXT']);
    });

    return columns;
}

function __indexes_for_sortkeys(dataset, sortkeys) {
    var indexes = [];

    sortkeys.forEach(function(sortkey) {
        indexes.push([dataset,sortkey]);
    });

    return indexes;
}

function __values_for_sortkeys(dict, sortkeys) {
    var values = {};

    sortkeys.forEach(function(sortkey) {
        values[sortkey.replace('-', '_')] = __value_for_key(dict, sortkey, '');
    });

    return values;
}

function __bool_for_key(dict, key) {
    var value = __value_for_key(dict, key);

    if (value === 'yes') {
        return true;
    }

    return false;
}

function __value_for_key(dict, key, default_value) {
    if (key in dict) {
        return dict[key];
    }

    return default_value;
}

function __stringify_value(value) {
    if (Array.isArray(value) || is_object(value)) {
        return JSON.stringify(value, null, 4);
    }

    return value;
}

module.exports = {
    load_from_spreadsheet : function(path, store) {
        var source = __load_spreadsheet_data(path);
        var data = {}, sortkeys = {};

        var main_dict = __rows_to_main_dict(source['main'], store);
        if (!is_empty_object(main_dict)) {
            [ 'related-catalogs' ].forEach(function(key) {
                __unfold_list([ main_dict ], key);
            });
            Object.assign(data, main_dict);
        }

        var subviews_list = __rows_to_list(source['subviews'], store, 'do-not-display-(x)');
        if (subviews_list[0].length) {
            data['subviews'] = subviews_list[0];
        }

        var subcatalogs_dict = __rows_to_dict(source['subcatalogs'], store, 'do-not-display-(x)');
        if (!is_empty_object(subcatalogs_dict[0])) {
            data['subcatalogs'] = subcatalogs_dict[0];
        }

        var categories_sheets = __keys_starts_with(source, 'categories.');
        if (categories_sheets.length) {
            var categories_dict = {};
            categories_sheets.forEach(function(sheet) {
                var category_list = __rows_to_list(source[sheet], store, 'do-not-display-(x)');

                if (categories_list[0].length) {
                    categories_dict[sheet.substring('categories.'.length)] = category_list[0];
                }
            });
            if (!is_empty_object(categories_dict)) {
                data['categories'] = categories_dict;
            }
        } else {
            var categories_list = __rows_to_list(source['categories'], store, 'do-not-display-(x)');
            if (categories_list[0].length) {
                data['categories'] = categories_list[0];
            }
        }

        [ 'panes', 'banners', 'showcases', 'collections' ].forEach(function(dataset) {
            var singular_keys = { 'banners': 'banner', 'showcases': 'showcase', 'collections': 'collection' };
            var dataset_prefix = ((dataset in singular_keys) ? singular_keys[dataset] : dataset) + '.';
            var dataset_sheets = __keys_starts_with(source, dataset_prefix);
            var datasets_dict = {}, datasets_sortkeys = {};

            dataset_sheets.forEach(function(sheet) {
                var dataset_list = __rows_to_list(source[sheet], store, 'do-not-display-(x)');

                if (dataset_list[0].length) {
                    [ 'categories', 'memberships' ].forEach(function(key) {
                        __unfold_list(dataset_list[0], key);
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
            var dataset_sheets = __keys_starts_with(source, dataset_prefix);
            var datasets_dict = {};

            dataset_sheets.forEach(function(sheet) {
                var dataset_dict = __rows_to_dict(source[sheet], store, 'do-not-display-(x)');

                if (!is_empty_object(dataset_dict[0])) {
                    datasets_dict[sheet.substring(dataset_prefix.length)] = dataset_dict[0];
                }
            });
            if (!is_empty_object(datasets_dict)) {
                data[dataset] = datasets_dict;
            }
        });

        var products_dict = __rows_to_dict(source['products'], store, 'not-for-sale-(x)');
        [ 'items', 'stores', 'points', 'required-products', 'required-events', 'required-memberships' ].forEach(function(key) {
            __unfold_list(Object.values(products_dict[0] || {}), key);
        });
        __unfold_list(Object.values(products_dict[0]), 'items', __unfold_items);
        if (!is_empty_object(products_dict[0])) {
            data['products'] = products_dict[0];
        }

        var items_dict = __rows_to_dict(source['items'], store, 'not-for-sale-(x)');
        [ 'series' ].forEach(function(key) {
            __unfold_list(Object.values(items_dict[0] || {}), key);
        });
        if (!is_empty_object(items_dict[0])) {
            data['items'] = items_dict[0];
        }

        [ 'series', 'memberships', 'points', 'events', 'notifications' ].forEach(function(dataset) {
            var dataset_dict = __rows_to_dict(source[dataset], store, 'not-for-sale-(x)');
            if (!is_empty_object(dataset_dict[0])) {
                data[dataset] = dataset_dict[0];
            }
        });
       
        return [ data, sortkeys ];
    },

    save_to_file : function(data, path, include_all_data) {
        var keys_to_skip = __bool_for_key(data, 'uses-database') ? __KEYS_IN_DATABASE : [];
        var catalog_dict = {};

        Object.keys(data).forEach(function(key) {
            if (include_all_data || !keys_to_skip.includes(key)) {
                catalog_dict[key] = data[key];
            }
        });

        fs.writeFileSync(path, JSON.stringify(catalog_dict, null, 4));
    },

    save_to_database : function(data, sortkeys, path) {
        if (fs.existsSync(path)) {
            fs.unlinkSync(path);
        }

        if ('subviews' in data) {
            var subviews_rows = [];

            (data['subviews']).forEach(function(subview_dict) {
                subviews_rows.push({
                    'id': subview_dict['id'],
                    'type': subview_dict['type'],
                    'attr': __stringify_value(subview_dict)
                });
            });

            __save_table_to_database(
                'subviews', 
                [['id','TEXT'],['type','TEXT'],['attr','TEXT']], 
                [['id'],['type']],
                subviews_rows, path
            );
        }

        if ('subcatalogs' in data) {
            var subcatalogs_rows = [];

            Object.keys(data['subcatalogs']).forEach(function(identifier) {
                var subcatalog_dict = data['subcatalogs'][identifier];
                subcatalogs_rows.push({
                    'id': identifier,
                    'attr': __stringify_value(subcatalog_dict)
                });
            });

            __save_table_to_database(
                'subcatalogs', 
                [['id','TEXT'],['attr','TEXT']], 
                [['id']],
                subcatalogs_rows, path
            );
        }

        if ('categories' in data) {
            var categories_rows = [];

            if (Array.isArray(data['categories'])) {
                data['categories'].forEach(function(category_dict) {
                    categories_rows.push({
                        'id': category_dict['id'],
                        'subcatalog': '__DEFAULT__',
                        'attr': __stringify_value(category_dict)
                    });
                });
            } else {
                Object.keys(data['categories']).forEach(function(name) {
                    var subcatalog_list = data['categories'][name];
                    subcatalog_list.forEach(function(category_dict) {
                        categories_rows.push({
                            'id': category_dict['id'],
                            'subcatalog': name,
                            'attr': __stringify_value(category_dict)
                        });
                    });
                });
            }

            __save_table_to_database(
                'categories', 
                [['id','TEXT'],['subcatalog','TEXT'],['attr','TEXT']], 
                [['id'],['subcatalog']],
                categories_rows, path
            );
        }  
        
        [ 'panes', 'banners', 'showcases', 'collections' ].forEach(function(dataset) {
            if (dataset in data) {
                var singular_keys = { 'banners': 'banner', 'showcases': 'showcase', 'collections': 'collection' };
                var singular_key = (dataset in singular_keys) ? singular_keys[dataset] : dataset;
                var datasets_rows = [], dataset_to_category = [], dataset_to_membership = [];
                var datasets_sortkeys = __merge_sortkeys((sortkeys[dataset] || {}));
    
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
                            'attr': __stringify_value(dataset_dict)
                        }, __values_for_sortkeys(dataset_dict, datasets_sortkeys)));
                    });
                });
    
                __save_table_to_database(
                    singular_key + '_to_category', 
                    [['id','TEXT'],[singular_key,'TEXT'],['category','TEXT']], 
                    [[singular_key,'category']],
                    dataset_to_category, path
                );
                __save_table_to_database(
                    singular_key + '_to_membership', 
                    [['id','TEXT'],[singular_key,'TEXT'],['membership','TEXT']], 
                    [[singular_key,'membership']],
                    dataset_to_membership, path
                );
    
                var columns = [['id','TEXT'],[singular_key,'TEXT'],['series','TEXT'],['item','TEXT'],['attr','TEXT']];
                var unique_sortkeys = datasets_sortkeys.filter(function(value, index, self) {
                    return !['id',singular_key,'series','item'].includes(value);
                });
                __save_table_to_database(
                    dataset, 
                    array.union(columns, __columns_for_sortkeys(unique_sortkeys)), 
                    array.union([['id'],[singular_key],['series'],['item']], __indexes_for_sortkeys(dataset, unique_sortkeys)),
                    datasets_rows, path
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
                            'attr': __stringify_value(datasets_dict[identifier])
                        });
                    });
                }); 
                
                __save_table_to_database(
                    dataset,
                    [['id','TEXT'],[dataset,'TEXT'],['attr','TEXT']],
                    [['id',dataset]],
                    datasets_rows, path
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
                    'attr': __stringify_value(item_dict)
                });
            });

            __save_table_to_database(
                'item_to_series',
                [['item','TEXT'],['series','TEXT']],
                [['item'],['series']],
                item_to_series, path
            );
            __save_table_to_database(
                'items',
                [['id','TEXT'],['attr','TEXT']],
                [['id']],
                items_rows, path
            );
        }

        if ('products' in data) {
            var products_rows = [];
            var product_to_item = [], product_to_store = [];

            Object.keys(data['products']).forEach(function(identifier) {
                var product_dict = data['products'][identifier];
                var free_of_charge = __bool_for_key(product_dict, 'free-of-charge');
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
                    'attr': __stringify_value(product_dict)
                });
            });

            __save_table_to_database(
                'product_to_item',
                [['product','TEXT'],['item','TEXT']],
                [['product'],['item']],
                product_to_item, path
            );
            __save_table_to_database(
                'product_to_store',
                [['product','TEXT'],['store','TEXT']],
                [['product'],['store']],
                product_to_store, path
            );
            __save_table_to_database(
                'products',
                [['id','TEXT'],['free_of_charge','INTEGER'],['attr','TEXT']],
                [['id'],['free_of_charge']],
                products_rows, path
            );
        }

        [ 'series', 'memberships', 'points', 'events', 'notifications' ].forEach(function(dataset) {
            if (dataset in data) {
                var datasets_rows = [];

                Object.keys(data[dataset]).forEach(function(identifier) {
                    var dataset_dict = data[dataset][identifier];
                    datasets_rows.push({
                        'id': identifier,
                        'attr': __stringify_value(dataset_dict)
                    });
                });
    
                __save_table_to_database(
                    dataset,
                    [['id','TEXT'],['attr','TEXT']],
                    [['id']],
                    datasets_rows, path
                );
            }
        });
    }
}
