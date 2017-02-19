'use strict';

import requireDir from 'require-dir';

const knexFolder = requireDir("../knex");
const Tables = {};

for (let filename of Object.keys(knexFolder)) {
    let table = knexFolder[filename];
    if (table.default) table = table.default;
    table.name = table.name || filename;
    Tables[table.name] = table;
}

// Retrieves an array of knex tables from a list of names. If `names` is null, returns all tables.
export function getTables(names) {
    let ret = [];

    if (!names) {
        Object.keys(Tables).forEach(key => ret.push(Tables[key]));
    } else {
        for (let name of names) {
            let table = Tables[name];
            if (table === null || table === undefined) throw new Error(`Table ${name} does not exist.`);
            ret.push(table);
        }
    }

    return ret;
}

export default Tables;
