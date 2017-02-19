export default {
    columns: (t) => {

    },

    constraints: (t) => {
        t.primary(["package_name", "user_id"]);
    },

    references: {
        "package_name": {
            target: "packages.name",
            type: "string"
        },
        "user_id": "users.id"
    },

    data: [],

    model: "PackagesWatching"
}
