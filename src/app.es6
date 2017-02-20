'use strict';

import Koa from 'koa';
import BodyParser from 'koa-bodyparser';
import KoaMount from 'koa-mount';

import isNull from "./helpers/is_null";

import MountRouters from "./routers/mount_routers";

import Config from "./config";
import Models, {bookshelf, knex} from "./models/bookshelf";
import PatchCheckBody from "./helpers/patch_check_body";
import { checkForUpdates } from './helpers/package_watchers';

const version = "v1";

//region Koa App

const koa = new Koa()
    .use(BodyParser());

const rootEndpoint = `${Config.api.endpoint}${Config.telegram.token}/${version}`;

PatchCheckBody(knex, Models)
    .then(() => {
        MountRouters(
            koa,
            { bookshelf, knex },
            { isNull },
            Models
        ); // mount all routers in the ./routers folder

        if (rootEndpoint === "/") {
            koa.listen(Config.api.port);
        } else {
            const app = new Koa();
            app.use(KoaMount(rootEndpoint, koa));
            app.listen(Config.api.port);
        }

        console.log(`API running at "localhost:${Config.api.port}${rootEndpoint}".`);
    });

//endregion


// Poll for updates
const intervalSeconds = Config.checkForUpdates.pollRate;
setInterval(checkForUpdates, intervalSeconds * 1000);
