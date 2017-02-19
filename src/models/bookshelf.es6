'use strict';

import Bookshelf from "bookshelf";
import Tables from "./utils/tables";
import knex from "./knex";

import {camelize, decamelize} from "humps";
import isNull from "../helpers/is_null";

const bookshelf = Bookshelf(knex);

// enables circular relationship between models, also references to other models by names
bookshelf.plugin('registry');

const Models = {};

for (let tableName of Object.keys(Tables)) {
    let knexModel = Tables[tableName].model;
    if (!knexModel) continue;
    let modelName, modelInstanceMethods = {}, modelClassMethods = {};

    if (typeof(knexModel) === "string") {
        modelName = knexModel;
    } else if (typeof(knexModel) === "object") {
        modelName = knexModel[0];
        modelInstanceMethods = knexModel[1];
        modelClassMethods = knexModel[2];
    }

    if (Models[modelName]) throw new Error(`Model "${modelName}" has already been defined, but encountered again in table "${tableName}".`);

    modelInstanceMethods.tableName = tableName;

    /*// camelize db output
    modelInstanceMethods.parse = (object) => {
        if (isNull(object)) return object;
        return Object.keys(object).reduce((memo, key) => {
            let value = object[key];
            if (key.startsWith("is_")) value = !!value; // cast to boolean
            memo[camelize(key)] = value;
            return memo;
        }, {});
    };

    // decamelize (snake_case) db input
    modelInstanceMethods.format = (object) => {
        if (isNull(object)) return object;
        return Object.keys(object).reduce((memo, key) => {
            memo[decamelize(key)] = object[key];
            return memo;
        }, {});
    };*/

    // omit the pivot columns after JOIN queries
    if (!modelInstanceMethods.serialize) {
        modelInstanceMethods.serialize = function (options) {
            options = Object.assign({ omitPivot: true }, options);
            return bookshelf.Model.prototype.serialize.call(this, options);
        }
    }

    // using plugin registry's "model" method to register the model
    Models[modelName] = bookshelf.model(
        modelName,
        modelInstanceMethods,
        modelClassMethods
    );

}

export default Models;
export {knex, bookshelf};
