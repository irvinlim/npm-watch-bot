export default {
    columns: (t) => {
        t.string("name").notNullable().primary();
        t.text("description");
        t.string("version");
        t.dateTime("date_published");
    },

    data: [],

    model: "Package"
}
