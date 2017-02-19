"use strict";

export default function (...whitelist) {
    let required = whitelist.filter(k => k.startsWith("*")).map(k => k.slice(1));
    whitelist = whitelist.map(k => k.replace("*", ""));

    let checkObject = (object) => {
        Object.keys(object).forEach(key => {
            if (!whitelist.includes(key)) throw Exception(
                StatusCodes.BadRequest,
                "InvalidBody",
                `Unrecognized field: ${key}.`
            );
        });

        if (required) {
            required.forEach(key => {
                if (!object.hasOwnProperty(key)) throw Exception(
                    StatusCodes.BadRequest,
                    "InvalidBody",
                    `Missing required field: ${key}.`
                );
            });
        }
    };

    return async(context, next) => {
        let body = context.request.body;

        if (Array.isArray(body)) {
            body.forEach(checkObject);
        } else {
            checkObject(body);
        }

        await next();
    }
}
