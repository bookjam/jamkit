import xlsx from "xlsx";
import fs from "fs";
import { vsprintf } from "sprintf-js";
import isObject from "is-object";
import isEmptyObject from "is-empty-object";
import array from "array-extended";
import sqlite from "./sqlite.js";

const SEPERATORS = [ "\n", "\\n", "," ];
const KEYS_IN_DATABASE = [ 
    "subviews", "subcatalogs", "categories", 
    "panes", "banners", "showcases", "showcase", "collections", 
    "purchases", "promos", "readings", "auxiliary", 
    "series", "items", "products", "memberships", 
    "points", "events", "ads", "notifications", "strings"
]

function _loadSpreadsheetData(path) {
    const sheets = xlsx.readFile(path).Sheets;
    const data = {};
    
    Object.keys(sheets || {}).forEach((name) => {
        data[name] = xlsx.utils.sheet_to_json(sheets[name]);
    });

    return data;
}

function _rowsToMainDict(rows, store) {
    const mainDict = {}, group = mainDict;

    (rows || []).forEach((row) => {
        if (_shouldSkipRow(row, store)) {
            return;
        }

        if (row["category"]) {
            group = {}, mainDict[row["category"]] = group;
        }

        if (row["value"]) {
            group[row["key"]] = row["value"];
        }
    });

    return mainDict;
}

function _rowsToDict(rows, store, skipKey) {
    const dict = {}, sortKeys = [];

    (rows || []).forEach((row) => {
        if (_shouldSkipRow(row, store, skipKey)) {
            return;
        }

        const identifiers = [], data = {};

        Object.keys(row).forEach((header) => {
			const value = row[header].toString();

            if (header.endsWith("-(o)")) { // sortkey notation
                header = header.replace(/\-\(o\)$/, "");
                sortKeys.push(header);
            }

            if (value && !header.endsWith("-(x)")) {
                const key = header.split(".");
                const targetStore = (key.length > 1) ? key[1] : null;
    
                if (key[0] === "id") {
                    identifiers.push(value);
                } else {
                    if (!targetStore || targetStore === store) {
                        data[key[0]] = value;
                    }
                }
            }
        });
    
        identifiers.forEach((identifier) => {
            dict[identifier] = data;
        });
    });

    return [ dict, sortKeys ];
}

function _rowsToRawList(rows) {
    const rawList = [];

    (rows || []).forEach((row) => {
        const data = {};

        Object.keys(row).forEach((header) => {
			const value = row[header].toString();

            if (value && !header.endsWith("-(x)")) {
                data[header] = value;
            }
        });

        rawList.push(data);
    });

    return rawList;
}

function _rowsToList(rows, store, skipKey) {
    const list = [], sortKeys = [];

    (rows || []).forEach((row) => {
        if (_shouldSkipRow(row, store, skipKey)) {
            return;
        }

        const identifiers = [], data = {};

        Object.keys(row).forEach((header) => {
			const value = row[header].toString();

            if (header.endsWith("-(o)")) { // sortkey notation
                header = header.replace(/\-\(o\)$/, "");
                if (!sortKeys.includes(header)) {
                    sortKeys.push(header);
                }
            }

            if (value && !header.endsWith("-(x)")) {
                const key = header.split(".");
                const targetStore = (key.length > 1) ? key[1] : null;
    
                if (key[0] === "id") {
                    identifiers.push(value);
                } else {
                    if (!targetStore || targetStore === store) {
                        data[key[0]] = value;
                    }
                }
            }
        });

        identifiers.forEach((identifier) => {
            list.push(Object.assign(JSON.parse(JSON.stringify(data)), {
                "id":identifier
            }));
        });
    });

    return [ list, sortKeys ];
}

function _shouldSkipRow(row, store, skipKey) {
    if (skipKey && skipKey in row && row[skipKey] == "yes") {
        return true;
    }

    const availableStores = _unfoldValue(row["available-stores-(x)"]);
    if (availableStores.length && !(store in availableStores)) {
        return true;
    }

    const avoidStores = _unfoldValue(row["avoid-stores-(x)"]);
    if (avoidStores.length && (store in avoidStores)) {
        return true;
    }

    return false;
}

function _unfoldList(list, key, unfoldFunc) {
    list.forEach((data) => {
        if (key in data) {
            if (unfoldFunc) {
                data[key] = unfoldFunc(_unfoldValue(data[key]));
            } else {
                data[key] = _unfoldValue(data[key]);
            }
        }
    });
}

function _unfoldValue(value) {
    const values = [];
    
    (value || "").split(new RegExp(SEPERATORS.join("|"))).forEach((element) => {
        if (element) {
            values.push(element.trim());
        }
    });

    return values;
}

function _unfoldItems(values) {
    const unfoldedValues = [];
    
    values.forEach((item) => {
        const match = /([A-Z]{2}_[A-Z]{3}_[0-9]+)_([0-9]+)-([0-9]+)/.exec(item);

        if (match) {
            const prefix = match[1], first = match[2], last = match[3];

            for (const number = parseInt(first); number < parseInt(last) + 1; number++) {
                unfoldedValues.push(vsprintf("%s_%06d", [ prefix, number ]))
            }
        } else {
            unfoldedValues.push(item)
        }
    });

    return unfoldedValues;
}

function _keysStartsWith(dict, prefix) {
    const keys = [];

    Object.keys(dict).forEach((key) => {
        if (key.startsWith(prefix)) {
            keys.push(key);
        }
    });

    return keys;
}

function _saveTableToDatabase(database, table, columns, indexes, rows) {
    sqlite.createTable(database, table, columns);

    if (indexes) {
        sqlite.createIndexesToTable(database, table, indexes);
    }    
    
    sqlite.insertRowsToTable(database, table, rows);
}

function _mergeSortKeys(sortKeys) {
    let mergedSortKeys = [];

    Object.keys(sortKeys).forEach((sortkey) => {
        mergedSortKeys = array.union(mergedSortKeys, sortKeys[sortkey]);
    });

    return array.unique(mergedSortKeys);
}

function _columnsForHeaders(headers) {
    const columns = [];

    headers.forEach((header) => {
        columns.push([header,"TEXT"]);
    });

    return columns;
}

function _indexesForHeaders(dataset, headers) {
    const indexes = [];

    headers.forEach((header) => {
        indexes.push([dataset,header]);
    });

    return indexes;
}

function _valuesForHeaders(dict, headers) {
    const values = {};

    headers.forEach((header) => {
        values[header.replace("-", "_")] = _valueForKey(dict, header, "");
    });

    return values;
}

function _boolForKey(dict, key) {
    const value = _valueForKey(dict, key);

    if (value === "yes") {
        return true;
    }

    return false;
}

function _valueForKey(dict, key, defaultValue) {
    if (key in dict) {
        return dict[key];
    }

    return defaultValue;
}

function _stringifyValue(value) {
    if (Array.isArray(value) || isObject(value)) {
        return JSON.stringify(value, null, 4);
    }

    return value;
}

export default {
    loadFromSpreadsheet(path, store) {
        const source = _loadSpreadsheetData(path);
        const data = {}, sortKeys = {};

        const mainDict = _rowsToMainDict(source["main"], store);
        if (!isEmptyObject(mainDict)) {
            [ "related-catalogs" ].forEach((key) => {
                _unfoldList([ mainDict ], key);
            });
            Object.assign(data, mainDict);
        }

        const subviewsList = _rowsToList(source["subviews"], store, "do-not-display-(x)");
        if (subviewsList[0].length) {
            data["subviews"] = subviewsList[0];
        }

        const subcatalogsDict = _rowsToDict(source["subcatalogs"], store, "do-not-display-(x)");
        if (!isEmptyObject(subcatalogsDict[0])) {
            data["subcatalogs"] = subcatalogsDict[0];
        }

        const categoriesSheets = _keysStartsWith(source, "categories.");
        if (categoriesSheets.length) {
            const categoriesDict = {};
            categoriesSheets.forEach((sheet) => {
                const categoriesList = _rowsToList(source[sheet], store, "do-not-display-(x)");

                if (categoriesList[0].length) {
                    categoriesDict[sheet.substring("categories.".length)] = categoriesList[0];
                }
            });
            if (!isEmptyObject(categoriesDict)) {
                data["categories"] = categoriesDict;
            }
        } else {
            const categoriesList = _rowsToList(source["categories"], store, "do-not-display-(x)");
            if (categoriesList[0].length) {
                data["categories"] = categoriesList[0];
            }
        }

        [ "panes", "banners", "showcases", "collections" ].forEach((dataset) => {
            const singularKeys = { "banners": "banner", "showcases": "showcase", "collections": "collection" };
            const datasetPrefix = ((dataset in singularKeys) ? singularKeys[dataset] : dataset) + ".";
            const datasetSheets = _keysStartsWith(source, datasetPrefix);
            const datasetsDict = {}, datasetsSortKeys = {};

            datasetSheets.forEach((sheet) => {
                const datasetLlist = _rowsToList(source[sheet], store, "do-not-display-(x)");

                if (datasetLlist[0].length) {
                    [ "categories", "memberships" ].forEach((key) => {
                        _unfoldList(datasetLlist[0], key);
                    });
                    datasetsDict[sheet.substring(datasetPrefix.length)] = datasetLlist[0];
                    datasetsSortKeys[sheet.substring(datasetPrefix.length)] = datasetLlist[1];
                }
            });
            if (!isEmptyObject(datasetsDict)) {
                data[dataset] = datasetsDict, sortKeys[dataset] = datasetsSortKeys;
            }
        });

        [ "purchases", "promos", "readings", "auxiliary" ].forEach((dataset) => {
            const datasetPrefix = dataset + ".";
            const datasetSheets = _keysStartsWith(source, datasetPrefix);
            const datasetsDict = {};

            datasetSheets.forEach((sheet) => {
                const datasetDict = _rowsToDict(source[sheet], store, "do-not-display-(x)");

                if (!isEmptyObject(datasetDict[0])) {
                    datasetsDict[sheet.substring(datasetPrefix.length)] = datasetDict[0];
                }
            });
            if (!isEmptyObject(datasetsDict)) {
                data[dataset] = datasetsDict;
            }
        });

        const productsDict = _rowsToDict(source["products"], store, "not-for-sale-(x)");
        [ "stores", "points", "required-products", "required-events", "required-memberships" ].forEach((key) => {
            _unfoldList(Object.values(productsDict[0] || {}), key);
        });
        _unfoldList(Object.values(productsDict[0] || {}), "items", _unfoldItems);
        if (!isEmptyObject(productsDict[0])) {
            data["products"] = productsDict[0];
        }

        const itemsDict = _rowsToDict(source["items"], store, "not-for-sale-(x)");
        [ "series" ].forEach((key) => {
            _unfoldList(Object.values(itemsDict[0] || {}), key);
        });
        if (!isEmptyObject(itemsDict[0])) {
            data["items"] = itemsDict[0];
        }

        [ "series", "memberships", "points", "events", "ads", "notifications" ].forEach((dataset) => {
            const datasetDict = _rowsToDict(source[dataset], store, "not-for-sale-(x)");
            if (!isEmptyObject(datasetDict[0])) {
                data[dataset] = datasetDict[0];
            }
        });
       
        const stringsList = _rowsToRawList(source["strings"]);
        if (!isEmptyObject(stringsList)) {
            data["strings"] = stringsList;
        }

        return [ data, sortKeys ];
    },

    saveToFile(data, path, includeAllData) {
        const keysToSkip = _boolForKey(data, "uses-database") ? KEYS_IN_DATABASE : [];
        const catalogDict = {};

        Object.keys(data).forEach((key) => {
            if (includeAllData || !keysToSkip.includes(key)) {
                catalogDict[key] = data[key];
            }
        });

        fs.writeFileSync(path, JSON.stringify(catalogDict, null, 4));
    },

    saveToDatabase(data, sortKeys, path) {
        if (fs.existsSync(path)) {
            fs.unlinkSync(path);
        }

        const database = sqlite.openDatabase(path);

        if ("subviews" in data) {
            const subviewsRows = [];

            (data["subviews"]).forEach((subviewDict) => {
                subviewsRows.push({
                    "id": subviewDict["id"],
                    "type": subviewDict["type"],
                    "attr": _stringifyValue(subviewDict)
                });
            });

            _saveTableToDatabase(
                database,
                "subviews", 
                [["id","TEXT"],["type","TEXT"],["attr","TEXT"]], 
                [["id"],["type"]],
                subviewsRows
            );
        }

        if ("subcatalogs" in data) {
            const subcatalogsRows = [];

            Object.keys(data["subcatalogs"]).forEach((identifier) => {
                var subcatalogDict = data["subcatalogs"][identifier];
                subcatalogsRows.push({
                    "id": identifier,
                    "attr": _stringifyValue(subcatalogDict)
                });
            });

            _saveTableToDatabase(
                database,
                "subcatalogs", 
                [["id","TEXT"],["attr","TEXT"]], 
                [["id"]],
                subcatalogsRows
            );
        }

        if ("categories" in data) {
            const categoriesRows = [];

            if (Array.isArray(data["categories"])) {
                data["categories"].forEach((categoryDict) => {
                    categoriesRows.push({
                        "id": categoryDict["id"],
                        "subcatalog": "__DEFAULT__",
                        "attr": _stringifyValue(categoryDict)
                    });
                });
            } else {
                Object.keys(data["categories"]).forEach((name) => {
                    const subcatalog_list = data["categories"][name];
                    subcatalog_list.forEach((categoryDict) => {
                        categoriesRows.push({
                            "id": categoryDict["id"],
                            "subcatalog": name,
                            "attr": _stringifyValue(categoryDict)
                        });
                    });
                });
            }

            _saveTableToDatabase(
                database,
                "categories", 
                [["id","TEXT"],["subcatalog","TEXT"],["attr","TEXT"]], 
                [["id"],["subcatalog"]],
                categoriesRows
            );
        }  
        
        [ "panes", "banners", "showcases", "collections" ].forEach((dataset) => {
            if (dataset in data) {
                const singularKeys = { "banners": "banner", "showcases": "showcase", "collections": "collection" };
                const singularKey = (dataset in singularKeys) ? singularKeys[dataset] : dataset;
                const datasetsRows = [], datasetToCategory = [], datasetToMembership = [];
                const datasetsSortKeys = _mergeSortKeys(sortKeys[dataset] || {});
    
                Object.keys(data[dataset]).forEach((name) => {
                    const datasetLlist = data[dataset][name];
                    datasetLlist.forEach((datasetDict) => {
                        if ("categories" in datasetDict) {
                            datasetDict["categories"].forEach((category) => {
                                datasetToCategory.push({
                                    "id": datasetDict["id"],
                                    [singularKey]: name, 
                                    "category": category
                                });
                            });
                            delete datasetDict["categories"];
                        }
    
                        if ("memberships" in datasetDict) {
                            datasetDict["memberships"].forEach((membership) => {
                                datasetToMembership.push({
                                    "id": datasetDict["id"],
                                    [singularKey]: name, 
                                    "membership": membership
                                });
                            });
                            delete datasetDict["memberships"];
                        }
                        
                        datasetsRows.push(Object.assign({
                            "id": datasetDict["id"],
                            [singularKey]: name,
                            "attr": _stringifyValue(datasetDict)
                        }, _valuesForHeaders(datasetDict, datasetsSortKeys)));
                    });
                });
    
                _saveTableToDatabase(
                    database,
                    singularKey + "_to_category", 
                    [["id","TEXT"],[singularKey,"TEXT"],["category","TEXT"]], 
                    [[singularKey,"category"]],
                    datasetToCategory
                );
                _saveTableToDatabase(
                    database,
                    singularKey + "_to_membership", 
                    [["id","TEXT"],[singularKey,"TEXT"],["membership","TEXT"]], 
                    [[singularKey,"membership"]],
                    datasetToMembership
                );

                const columns = [["id","TEXT"],[singularKey,"TEXT"],["series","TEXT"],["item","TEXT"],["attr","TEXT"]];
                const uniqueSortKeys = datasetsSortKeys.filter((value, index, self) => {
                    return !["id",singularKey,"series","item"].includes(value);
                });
                _saveTableToDatabase(
                    database,
                    dataset, 
                    array.union(columns, _columnsForHeaders(uniqueSortKeys)), 
                    array.union([["id"],[singularKey],["series"],["item"]], _indexesForHeaders(singularKey, uniqueSortKeys)),
                    datasetsRows
                );
            }
        });
        
        [ "purchases", "promos", "readings", "auxiliary" ].forEach((dataset) => {
            if (dataset in data) {
                const datasetsRows = [];

                Object.keys(data[dataset]).forEach((name) => {
                    const datasetsDict = data[dataset][name];
                    Object.keys(datasetsDict).forEach((identifier) => {
                        datasetsRows.push({
                            "id": identifier,
                            [dataset]: name,
                            "attr": _stringifyValue(datasetsDict[identifier])
                        });
                    });
                }); 
                
                _saveTableToDatabase(
                    database,
                    dataset,
                    [["id","TEXT"],[dataset,"TEXT"],["attr","TEXT"]],
                    [["id",dataset]],
                    datasetsRows
                );
            }
        });

        if ("items" in data) {
            const itemsRows = [];
            const itemToSeries = [];

            Object.keys(data["items"]).forEach((identifier) => {
                var itemDict = data["items"][identifier];
                if ("series" in itemDict) {
                    itemDict["series"].forEach((series) => {
                        itemToSeries.push({
                            "item": identifier,
                            "series": series
                        });
                    });
                    delete itemDict["series"]
                }
                itemsRows.push({
                    "id": identifier,
                    "attr": _stringifyValue(itemDict)
                });
            });

            _saveTableToDatabase(
                database,
                "itemToSeries",
                [["item","TEXT"],["series","TEXT"]],
                [["item"],["series"]],
                itemToSeries
            );
            _saveTableToDatabase(
                database,
                "items",
                [["id","TEXT"],["attr","TEXT"]],
                [["id"]],
                itemsRows
            );
        }

        if ("products" in data) {
            const productsRows = [];
            const productToItem = [], productToStore = [];

            Object.keys(data["products"]).forEach((identifier) => {
                const productDict = data["products"][identifier];
                const freeOfCharge = _boolForKey(productDict, "free-of-charge");
                if ("items" in productDict) {
                    productDict["items"].forEach((item) => {
                        productToItem.push({
                            "product": identifier,
                            "item": item
                        });
                    });
                    delete productDict["items"]
                }
                if ("stores" in productDict) {
                    productDict["stores"].forEach((store) => {
                        productToStore.push({
                            "product": identifier,
                            "store": store
                        });
                    });
                    delete productDict["stores"]
                }
                productsRows.push({
                    "id": identifier,
                    "free_of_charge": freeOfCharge ? 1 : 0,
                    "attr": _stringifyValue(productDict)
                });
            });

            _saveTableToDatabase(
                database,
                "productToItem",
                [["product","TEXT"],["item","TEXT"]],
                [["product"],["item"]],
                productToItem
            );
            _saveTableToDatabase(
                database,
                "productToStore",
                [["product","TEXT"],["store","TEXT"]],
                [["product"],["store"]],
                productToStore
            );
            _saveTableToDatabase(
                database,
                "products",
                [["id","TEXT"],["free_of_charge","INTEGER"],["attr","TEXT"]],
                [["id"],["free_of_charge"]],
                productsRows
            );
        }

        [ "series", "memberships", "points", "events", "ads", "notifications" ].forEach((dataset) => {
            if (dataset in data) {
                const datasetsRows = [];

                Object.keys(data[dataset]).forEach((identifier) => {
                    var datasetDict = data[dataset][identifier];
                    datasetsRows.push({
                        "id": identifier,
                        "attr": _stringifyValue(datasetDict)
                    });
                });
    
                _saveTableToDatabase(
                    database,
                    dataset,
                    [["id","TEXT"],["attr","TEXT"]],
                    [["id"]],
                    datasetsRows
                );
            }
        });

        if ("strings" in data) {
            const stringsRows = [], languages = [];

            data["strings"].forEach((dataset) => {
                Object.keys(dataset).forEach((header) => {
                    if (header !== "key" && !languages.includes(header)) {
                        languages.push(header);
                    }
                });

                stringsRows.push(dataset);
            }); 
            
            _saveTableToDatabase(
                database,
                "strings",
                array.union([["key","TEXT"]], _columnsForHeaders(languages)),
                [["key"]],
                stringsRows
            );
        }

        sqlite.closeDatabase(database);
    }
}
