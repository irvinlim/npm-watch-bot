'use strict';

/**
 * Environment-specific configs
 *
 * The config object exported by ENV_NAME.es6 is merged with objects defined in the folder `private`.
 *
 * This file checks the NODE_ENV variable and the .apirc file (in that order) to determine the current environment.
 *
 * The current environment is exported as default. Other configs can be accessed in the exported CONFIG object.
 */

import requireDir from 'require-dir';
import Rc from 'rc';
import deepAssign from 'deep-assign';

let CURRENT_ENV = process.env.NODE_ENV;

if (!CURRENT_ENV) {
    // If env unspecified, get it from "~/.apirc". Format: "{env: ENV_NAME}"
    try {
        let apiRc = Rc('api');
        CURRENT_ENV = apiRc.env || 'local';
    } catch (e) {
        CURRENT_ENV = 'local';
    }
}

const nonSensitiveConfig = require('./env/' + CURRENT_ENV);
if (!nonSensitiveConfig)
    throw new Error(`Current environment not found in config: ${CURRENT_ENV}`);

const sensitiveConfig = requireDir('./env/private');
const defaultExtractor = x => (x && x.default) || x; // If x has default (ES6 export default), get x.default

let CONFIG = deepAssign({}, defaultExtractor(nonSensitiveConfig));

for (let key of Object.keys(sensitiveConfig)) {
    let config = defaultExtractor(sensitiveConfig[key]);
    deepAssign(CONFIG, { [key]: config });
}

export { CURRENT_ENV };
export default new Proxy(CONFIG, {
    get: function(target, property) {
        if (property === 'toJSON') return JSON.stringify(target);

        let ret = target[property];
        if (ret == undefined)
            throw new Error(
                `Cannot find config "${property}" in current environment (${
                    CURRENT_ENV
                }).`
            );
        return ret;
    },
});
