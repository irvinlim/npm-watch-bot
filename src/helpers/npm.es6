'use strict';

import rp from 'request-promise';

export default {
    getPackage: (packageName) => {
        return rp.get({
            url: `https://api.npms.io/v2/package/${ packageName }`,
            json: true,
        }).then(body => {
            const { collected: { metadata: { name, description, version, date: date_published } } } = body;

            return {
                name,
                description,
                version,
                date_published,
            };
        });
    },
};
