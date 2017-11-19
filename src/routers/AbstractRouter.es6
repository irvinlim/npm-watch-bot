'use strict';

import Router from 'koa-router';

export default class AbstractRouter {
    constructor(services) {
        this.services = services;
    }

    initialize(objects) {}

    get useJwt() {
        return true;
    }

    // e.g. "/test"
    get prefix() {
        return null;
    }

    build(filename) {
        let prefix = this.prefix !== null ? this.prefix : filename;
        const router = new Router({ prefix });

        this.initialize(Object.assign({ router }, this.services));

        return router;
    }
}
