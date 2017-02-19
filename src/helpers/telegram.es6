'use strict';

import rp from 'request-promise';
import Config from "../config";

const TELEGRAM_API_BASE = `https://api.telegram.org/bot${ Config.telegram.token }`;

export default {
    sendMessage: (chat_id, text) => {
        return rp.post({
            url: `${ TELEGRAM_API_BASE }/sendMessage`,
            json: {
                chat_id,
                text,
            },
        });
    },
};
