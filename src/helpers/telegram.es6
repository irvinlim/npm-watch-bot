'use strict';

import moment from 'moment';
import rp from 'request-promise';
import Config from '../config';

const TELEGRAM_API_BASE = `https://api.telegram.org/bot${
    Config.telegram.token
}`;

const f = {
    sendMessage: (chat_id, text) => {
        return rp.post({
            url: `${TELEGRAM_API_BASE}/sendMessage`,
            json: {
                chat_id,
                text,
                parse_mode: 'Markdown',
            },
        });
    },

    sendMessageToUser: (user, text) => {
        return f.sendMessage(user.get('id'), text);
    },

    sendNoSuchPackageMessage: (user, packageName) => {
        return f.sendMessageToUser(
            user,
            `No such package on npm: ${packageName}`
        );
    },

    sendLatestVersionMessage: (user, pkg) => {
        return f.sendMessageToUser(
            user,
            `Latest version of ${pkg.get(
                'name'
            )} (https://www.npmjs.com/package/${pkg.get('name')}) is v${pkg.get(
                'version'
            )}, ` + `published ${moment(pkg.get('date_published')).fromNow()}.`
        );
    },

    sendNewVersionMessage: (user, pkg) => {
        return f.sendMessageToUser(
            user,
            `There is a new version of ${pkg.get(
                'name'
            )} (https://www.npmjs.com/package/${pkg.get(
                'name'
            )}) available (v${pkg.get('version')}), ` +
                `published ${moment(pkg.get('date_published')).fromNow()}.`
        );
    },
};

export default f;
