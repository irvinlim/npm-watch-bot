'use strict';

import config from "../config";
import Knex from "knex";
import Minimist from "minimist";
import prompt from "./utils/prompt";
import {getTables} from "./utils/tables";

const mysql = config.mysql;
const DB_NAME = mysql.database;

(async() => {
    await prepareDatabase();
    readArguments();
    await initDatabase();
})();


async function prepareDatabase() {

    // We don't want to carelessly operate on dev/prod database
    if (["dev", "prod"].some(s => DB_NAME.includes(s))) {
        if (await prompt(`Are you sure you want to operate on database "${DB_NAME}"? (y/n) ` !== "y")) {
            return process.exit(0);
        }
    }

    const mysqlNoDb = JSON.parse(JSON.stringify(mysql));
    Reflect.deleteProperty(mysqlNoDb, "database");

    const knex = Knex({
        client: 'mysql',
        connection: mysqlNoDb
    });

    // checks whether our database has already been created.
    let schemas = await knex.select("SCHEMA_NAME")
        .from("INFORMATION_SCHEMA.SCHEMATA")
        .where("SCHEMA_NAME", DB_NAME);

    if (schemas.length > 0) {
        if (await prompt(`Database "${DB_NAME}" already exists. Drop the database? (y/n) `) === 'y') {
            await knex.raw(`DROP DATABASE ??`, [DB_NAME]);
        } else {
            return process.exit(0);
        }
    }

    await knex.raw(`CREATE DATABASE ??`, [DB_NAME]);
    knex.destroy();
}

let tables = [];
let shouldCreateTables = true;
let shouldCreateRefs = true;
let shouldPopulateData = true;

function shouldPerformOperation(ops, operation) {
    return ops.includes(operation) && !ops.includes('!' + operation);
}

function readArguments() {
    const ARGV = Minimist(process.argv.slice(2));

    let workingTableNames = ARGV.tables ? ARGV.tables.split(",") : null;
    tables = getTables(workingTableNames);

    if (ARGV.ops && ARGS.ops !== "*") {
        let ops = ARGV.ops.split(",");
        shouldCreateTables = shouldPerformOperation(ops, "tables");
        shouldCreateRefs = shouldPerformOperation(ops, "refs");
        shouldPopulateData = shouldPerformOperation(ops, "data");
    }
}

async function initDatabase() {
    console.log(`Initializing database: ${DB_NAME}\n`);

    try {
        const knex = Knex({
            client: 'mysql',
            connection: mysql
        });

        await knex.transaction(async function (tx) {

            if (shouldCreateTables) {
                console.log(`Creating tables:`);
                await operate(tx, tables, createTable);
            }

            if (shouldPopulateData) await operate(tx, tables, populateData);

            // We can only initiate the references after all tables have been created.
            if (shouldCreateRefs) await operate(tx, tables, createReferences);

        });

        console.log(`\nFinished initializing database!`);
        process.exit(0);

    } catch (err) {
        console.log("\nError while initializing database.");
        console.error(err);
        process.exit(1);
    }
}

async function operate(tx, tables, fn) {
    for (let table of tables) await fn(tx, table);
}

async function createTable(tx, table) {
    console.log(`   ${table.name}`);

    await tx.schema.createTable(table.name, t => {
        if (table.columns) table.columns(t, tx); // call model's init function

        // auto generates model's foreign keys
        if (table.references) {
            for (let fromColumn of Object.keys(table.references)) {
                let toColumn = table.references[fromColumn];
                let knexColumn;

                if (typeof toColumn === "object" && toColumn.type === "string") {
                    knexColumn = t.string(fromColumn);
                } else {
                    knexColumn = t.integer(fromColumn).unsigned();
                }

                knexColumn.notNullable().index();
            }
        }

        if (table.constraints) table.constraints(t);

        if (table.timestamps === undefined || table.timestamps === true) {
            t.timestamp('created_at').notNullable().defaultTo(tx.fn.now());
            t.timestamp('updated_at').notNullable().defaultTo(tx.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
        }
    });
}

async function createReferences(tx, table) {
    if (!table.references) return;

    console.log(`\nAdding references for "${table.name}"...`);

    await tx.schema.table(table.name, t => {
        for (let fromColumn of Object.keys(table.references)) {
            let toColumn = table.references[fromColumn];
            let onUpdateStm = "CASCADE", onDeleteStm = "CASCADE";

            // only logs out customized onUpdate and onDelete
            let log = `   ${fromColumn} -> `;

            if (typeof toColumn === 'object') {
                log += toColumn.target;

                if (toColumn.onUpdate) {
                    onUpdateStm = toColumn.onUpdate;
                    log += `, onUpdate = ${onUpdateStm}`;
                }

                if (toColumn.onDelete) {
                    onDeleteStm = toColumn.onDelete;
                    log += `, onDelete = ${onDeleteStm}`;
                }

                toColumn = toColumn.target;
            } else {
                log += toColumn;
            }

            console.log(log);

            t.foreign(fromColumn).references(toColumn).onUpdate(onUpdateStm).onDelete(onDeleteStm);
        }
    });

}

async function populateData(tx, table) {
    if (!table.data) return;

    console.log(`\nInserting initial data to table "${table.name}"...`);

    if (table.name === "knex_migrations" && table.data === "auto") {
        console.log(`   Retrieving migration files...`);
        table.data = await getMigrationRows(tx);
    }

    // MySQL doesn't support RETURNING statements, so we don't really know how many rows have been inserted
    await tx.insert(table.data).into(table.name);
    console.log(`   Inserted ${table.data.length} rows.`);

}

async function getMigrationRows(tx) {
    let migrations = await tx.migrate._listAll({ directory: __dirname + '/../../database/migrations' });
    return migrations.map(file => ({
        name: file,
        batch: 1
    }));
}
