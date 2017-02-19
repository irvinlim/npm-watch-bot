"use strict";

import CheckBody from "./middleware/check_body";
import {camelize} from "humps";

export default async(knex, bookshelfModels) => {
    for (let modelName of Object.keys(bookshelfModels)) {
        let model = bookshelfModels[modelName];

        let columnMap = await knex(model.prototype.tableName).columnInfo();

        Reflect.deleteProperty(columnMap, model.prototype.idAttribute);
        Reflect.deleteProperty(columnMap, "created_at");
        Reflect.deleteProperty(columnMap, "updated_at");

        let columns = [];

        // Creates an array of {key, isRequired} for each column
        Object.keys(columnMap).forEach(key => {
            let attrs = columnMap[key];
            let isRequired = !(attrs.defaultValue || attrs.nullable);

            key = camelize(key);
            columns.push({ key, isRequired });
        });

        // mode is either "insert" or "update". For "update", all required fields become optional.
        // opt accepts "include" and "exclude", each is an array of columns to add/exclude from the default list
        model["CheckBody"] = (mode, opts = {}) => {
            let { include, exclude } = opts;
            let clonedColumns = columns.slice(); // clone the columns so we don't modify the original list

            if (include) {
                clonedColumns = clonedColumns.concat(include.map(key => {
                    return {
                        key: key.replace("*", ""),
                        isRequired: key.startsWith("*")
                    }
                }));
            }

            if (exclude) {
                clonedColumns = clonedColumns.filter(
                    col => !exclude.includes(col.key)
                );
            }

            if (mode === "insert") {
                let insertingColumns = clonedColumns.map(col => (col.isRequired ? "*" : "") + col.key);
                return CheckBody(...insertingColumns);
            } else if (mode === "update") {
                let updatingColumns = clonedColumns.map(col => col.key);
                return CheckBody(...updatingColumns);
            } else {
                throw new Error("Unknown CheckBody mode.")
            }
        }
    }
}
