'use strict';

import moment from 'moment';
import Npm from './npm';
import Telegram from './telegram';
import Models from "../models/bookshelf";

import { updatePackageFromNpm } from './package';

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

export const checkForUpdates = () => {
    const Package = Models.Package;

    let packages = Package.fetchAll();

    packages.forEach(async pkg => {
        const npmPackage = Npm.getPackage(packageName);
        await updatePackageFromNpm(npmPackage);
    });
};
