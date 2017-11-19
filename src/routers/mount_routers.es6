'use strict';

import requireDir from 'require-dir';
const routers = requireDir('./impl');

export default (koa, ...services) => {
    // Merge all services together
    let serviceObject = {};
    for (let service of services) Object.assign(serviceObject, service);

    Object.keys(routers).forEach(filename => {
        let routerClass = routers[filename].default;
        let router = new routerClass(serviceObject).build('/' + filename);
        koa.use(router.routes(), router.allowedMethods());
    });
};
