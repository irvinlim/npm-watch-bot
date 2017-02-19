'use strict';

import Models from "../models/bookshelf";

import moment from 'moment';
import Npm from "./npm";
import { notifyWatchers } from './package_watchers';

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
        date_published: moment(npmPackage.date_published).format("YYYY-MM-DD HH:mm:ss"),
    };

    // Check if package exists in the db, and if it is up to date.
    let pkg;

    try {
        pkg = await Package.where("name", npmPackage.name).fetch();
    } catch (err) {
        console.error(err);
    }

    if (!pkg) {
        try {
            pkg = await Package.forge(npmPackage).save();
        } catch (err) {
            console.error(err);
        }
    } else if (moment(npmPackage.date_published).isAfter(pkg.get("date_published"))) {
        try {
            pkg = await Package.where("name", npmPackage.name).save(npmPackage, { patch: true });
            await notifyWatchers(pkg);
        } catch (err) {
            console.error(err);
        }
    }

    return pkg;
};
