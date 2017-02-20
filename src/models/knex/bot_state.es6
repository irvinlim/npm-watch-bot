export default {
    columns: (t) => {
        t.string("key").primary();
        t.string("value");
    },

    data: [
        { key: "last_error_notified_time", value: "" },
    ],

    model: "BotState"
}
