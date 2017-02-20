'use strict';

import moment from 'moment';
import Npm from './npm';
import Telegram from './telegram';
import Models, { knex } from "../models/bookshelf";
import Config from '../config';

import { updatePackageFromNpm } from './package';
import { getState, setState } from './bot_state';
import { formatIsoDate } from './date';

export const getUsersWatching = (packageName) => {
    const User = Models.User;

    return User.query(qb => {
        return qb.innerJoin("packages_watching", "users.id", "packages_watching.user_id")
            .where("packages_watching.package_name", packageName);
    }).fetchAll();
};

export const notifyWatchers = async (pkg) => {
    const watchers = await getUsersWatching(pkg.get("name"));

    watchers.forEach(watcher => {
        Telegram.sendNewVersionMessage(watcher, pkg);
    });
};

export const checkForUpdates = async () => {
    const Package = Models.Package;

    try {
        const packages = await Package.fetchAll();

        packages.forEach(async pkg => {
            const npmPackage = await Npm.getPackage(pkg.get("name"));
            await updatePackageFromNpm(npmPackage);
        });
    } catch (err) {
        console.error(err);

        // Get the last error notify time
        const lastNotifiedTime = await getState("last_error_notified_time");
        const isPast24Hours = !lastNotifiedTime || moment(lastNotifiedTime).add(1, "d").isBefore(moment());

        if (Config.checkForUpdates.contactUserId && isPast24Hours) {
            // Notify the contact person
            Telegram.sendMessage(
                Config.checkForUpdates.contactUserId,
                `*ALERT!*\nAn error occurred while checking for updates:\n\`\`\`${ err }\`\`\``
            );

            // Update last error notify time
            await setState("last_error_notified_time", formatIsoDate());
        }

        return;
    }
};
