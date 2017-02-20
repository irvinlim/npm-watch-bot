'use strict';

import Models from "../models/bookshelf";

import moment from 'moment';
import Npm from "./npm";

import { notifyWatchers } from './package_watchers';
import { formatIsoDate } from './date';

export const retrieveAndUpdateFromNpm = async (packageName) => {
    let npmPackage, pkg;

    try {
        npmPackage = await Npm.getPackage(packageName);
        pkg = await updatePackageFromNpm(npmPackage);
    } catch (err) {
        console.error(err);
    }

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
        pkg = await Package.forge(npmPackage).save(null, { method: 'insert' });
    } else if (moment(npmPackage.date_published).isAfter(pkg.get("date_published"))) {
        pkg = await Package.forge({ name: npmPackage.name }).save(npmPackage, { patch: true });
        await notifyWatchers(pkg);
    }

    return pkg;
};
