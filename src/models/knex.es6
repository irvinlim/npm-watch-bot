'use strict';

import Knex from 'knex';
import config from '../config';

export default Knex({
    client: 'mysql',
    connection: config.mysql,
});
