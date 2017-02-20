'use strict';

import Models from "../models/bookshelf";

import moment from 'moment';
import Npm from "./npm";

import { notifyWatchers } from './package_watchers';
import { formatIsoDate } from './date';

export const retrieveAndUpdateFromNpm = async (packageName) => {
    const npmPackage = await Npm.getPackage(packageName);
    const pkg = await updatePackageFromNpm(npmPackage);

    return pkg;
};

export const updatePackageFromNpm = async (npmPackage) => {
    const Package = Models.Package;

    // Convert date into proper format for knex.
    npmPackage = {
        ...npmPackage,
        date_published: formatIsoDate(npmPackage.date_published),
    };

    // Check if package exists in the db, and if it is up to date.
    let pkg = await Package.where("name", npmPackage.name).fetch();

    if (!pkg) {
        pkg = await Package.forge(npmPackage).save();
    } else if (moment(npmPackage.date_published).isAfter(pkg.get("date_published"))) {
        pkg = await Package.where("name", npmPackage.name).save(npmPackage, { patch: true });
        await notifyWatchers(pkg);
    }

    return pkg;
};
