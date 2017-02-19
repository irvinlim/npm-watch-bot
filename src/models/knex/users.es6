export default {
    columns: (t) => {
        t.integer("id").unsigned().notNullable().primary();
        t.string("first_name");
        t.string("last_name");
        t.string("username");
        t.datetime("last_message_time");
    },

    constraints: (t) => {

    },

    data: [],

    model: "User"
}
