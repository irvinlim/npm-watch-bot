# Knex models

## Commands

###`node init_db` <br>
Default settings (trigger functions, tables, references, data).

###`node init_db --ops=*` or `--ops=triggers,tables,refs,data`
Selectively generates trigger functions, tables, references and/or populates data.

## Clone a database
Say we want to clone `dev` into `prod`.
1. Backup `dev` in pgAdmin into a backup file.
2. Create `prod`.
3. Make sure in `postgres.es6`, the field `DATABASE` is set to `prod`.
4. Run `node init_db --ops=triggers,tables`. <br/>
We can't create the foreign keys just yet, since that will interfere with data insert.
5. In pgAdmin, restore `prod` with the backup file created earlier. <br/>
This will insert `dev`'s data into `prod`.
6. Run `node init_db --ops=refs` to finally create the references.

## Sample Knex model definition

```
export default {
    name: "table_name_here", // optional, retrieves filename if missing

    columns: (t) => {
        t.increments("id").primary();
        t.string("some_unique_field").notNullable();
        t.text("extra");
    },

    // auto generates created_at and updated_at columns, default value is true.
    timestamps: true,

    constraints: (t) => {
        t.unique("some_unique_field");
    },

    // foreign keys defined here will have columns defined automatically
    // e.g. t.integer("foreign_key").unsigned().notNullable().index();
    references: {
        "foreign_key": "some_table.id", // onUpdate, onDelete = CASCADE

        "foreign_key_with_options": {
            target: "another_table.id",
            onUpdate: "NO ACTION",
            onDelete: "NO ACTION"
        },
    },

    data: [
        // {foreign_key: 1, foreign_key_with_options: 2, ...}
    ],

    // Bookshelf's model
    model: "ModelName",

    // Alternatively,
    model: [
       "ModelName",
       { instance methods },
       { class methods }
    ],
}
```
