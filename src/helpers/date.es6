'use strict';

import moment from 'moment';

export const formatIsoDate = (date) => {
    if (!date) {
        date = moment();
    }

    return moment(date).format("YYYY-MM-DD HH:mm:ss");
};
