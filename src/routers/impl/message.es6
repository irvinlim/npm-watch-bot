"use strict";

import moment from "moment";
import AbstractRouter from "../AbstractRouter";

import extractCommand from "../../helpers/extract_command";
import Npm from "../../helpers/npm";
import Telegram from "../../helpers/telegram";

import Models from "../../models/bookshelf";

export default class extends AbstractRouter {

    constructor(services) {
        super(services);

        this.getNpmPackage = this.getNpmPackage.bind(this);
        this.updateNpmPackage = this.updateNpmPackage.bind(this);

        this.handleCommand = this.handleCommand.bind(this);
        this.receiveCheck = this.receiveCheck.bind(this);
        this.receiveMessage = this.receiveMessage.bind(this);
        this.receiveAdd = this.receiveAdd.bind(this);
        this.sendMessage = this.sendMessage.bind(this);
        this.sendNoSuchPackageMessage = this.sendNoSuchPackageMessage.bind(this);
        this.sendLatestVersionMessage = this.sendLatestVersionMessage.bind(this);
    }

    initialize({ router, User }) {
        router.post('/', async (context) => {
            const { message: { from: userFrom, text, date: timestamp } } = context.request.body;
            const messageDate = moment.unix(timestamp);

            // User identification
            let user = await User.where("id", userFrom.id).fetch();
            if (!user) {
                user = await User.forge(userFrom).save(null, { method: 'insert' });
            }

            // Ignore old messages
            if (messageDate.isSameOrBefore(user.get("last_message_time"))) {
                return;
            }

            // Update last message date
            user = await User.forge({ id: user.id }).save({ last_message_time: messageDate.toDate() }, { patch: true });

            // Routing to specific methods
            await this.handleCommand({
                user,
                ...extractCommand(text)
            });
        });
    }

    handleCommand({ user, command, value }) {
        switch (command) {
            case "add":
                return this.receiveAdd({ user, packageName: value });
            case "check":
                return this.receiveCheck({ user, packageName: value });
            default:
                return this.receiveMessage({ user, text: value });
        }
    }

    async receiveMessage({ user, text }) {
        console.log(text);
    }

    async receiveAdd({ user, packageName }) {
    }

    async receiveCheck({ user, packageName }) {
        let npmPackage = await this.getNpmPackage({ user, packageName });

        if (!npmPackage) {
            return this.sendNoSuchPackageMessage({ user, packageName });
        }

        const pkg = await this.updateNpmPackage(npmPackage);

        return this.sendLatestVersionMessage({ user, pkg });
    }

    sendMessage({ user, text }) {
        return Telegram.sendMessage(user.get("id"), text);
    }

    sendNoSuchPackageMessage({ user, packageName }) {
        return this.sendMessage({
            user,
            text: `No such package on npm: ${ packageName }`
        });
    }

    sendLatestVersionMessage({ user, pkg }) {
        return this.sendMessage({
            user,
            text: `Latest version of ${ pkg.get("name") } (https://www.npmjs.com/package/${ pkg.get("name") }) is v${ pkg.get("version") }, `
                + `published ${ moment(pkg.get("date_published")).fromNow() }.`
        });
    }

    sendNewVersionMessage({ user, pkg }) {
        return this.sendMessage({
            user,
            text: `There is a new version of ${ pkg.get("name") } (https://www.npmjs.com/package/${ pkg.get("name") }) available (v${ pkg.get("version") }), `
                + `published ${ moment(pkg.get("date_published")).fromNow() }.`
        });
    }

    async getNpmPackage({ user, packageName }) {
        const npmPackage = await Npm.getPackage(packageName);

        if (!npmPackage) {
            this.sendMessage({ user, text: "No such package." });
        }

        return npmPackage;
    }

    async updateNpmPackage(npmPackage) {
        const Package = Models.Package;

        // Convert date into proper format for knex.
        npmPackage = {
            ...npmPackage,
            date_published: moment(npmPackage.date_published).format("YYYY-MM-DD HH:mm:ss"),
        };

        // Check if package exists in the db, and if it is up to date.
        let pkg = await Package.where("name", npmPackage.name).fetch();

        if (!pkg) {
            pkg = await Package.forge(npmPackage).save();
        } else if (moment(npmPackage.date_published).isAfter(pkg.get("date_published"))) {
            // Package update
            pkg = await Package.forge({ name: npmPackage.name }).save(npmPackage, { patch: true });

        }

        return pkg;
    }

}
