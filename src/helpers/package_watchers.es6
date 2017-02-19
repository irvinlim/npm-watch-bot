'use strict';

import Telegram from './telegram';

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
