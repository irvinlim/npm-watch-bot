"use strict";

import moment from "moment";
import AbstractRouter from "../AbstractRouter";

import extractCommand from "../../helpers/extract_command";
import Telegram from "../../helpers/telegram";
import { notifyWatchers } from "../../helpers/package_watchers";
import { retrieveAndUpdateFromNpm, updatePackageFromNpm } from '../../helpers/package';

import Models, { knex } from "../../models/bookshelf";

export default class extends AbstractRouter {

    constructor(services) {
        super(services);

        this.handleCommand = this.handleCommand.bind(this);
        this.receiveCheck = this.receiveCheck.bind(this);
        this.receiveMessage = this.receiveMessage.bind(this);
        this.receiveAdd = this.receiveAdd.bind(this);
        this.receiveRemove = this.receiveRemove.bind(this);
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
                context.body = { status: "success" };
                return;
            }

            // Update last message date
            user = await User.forge({ id: user.id }).save({ last_message_time: messageDate.toDate() }, { patch: true });

            // Routing to specific methods
            try {
                await this.handleCommand({ user, text });
            } catch (err) {
                console.error(err);
            }

            context.body = { status: "success" };
        });
    }

    handleCommand({ user, text }) {
        const { command, value } = extractCommand(text);

        switch (command) {
            case "add":
                return this.receiveAdd({ user, packageName: value });
            case "remove":
                return this.receiveRemove({ user, packageName: value });
            case "check":
                return this.receiveCheck({ user, packageName: value });
            default:
                return this.receiveMessage({ user, text });
        }
    }

    async receiveMessage({ user, text }) {
        console.log(text);
    }

    async receiveAdd({ user, packageName }) {
        const PackagesWatching = Models.PackagesWatching;

        // Retrieve package from npm.
        try {
            await retrieveAndUpdateFromNpm(packageName);
        } catch (err) {
            return Telegram.sendNoSuchPackageMessage(user, packageName);
        }

        // Add package to watch list.
        try {
            await PackagesWatching.forge({ package_name: packageName, user_id: user.get("id") }).save();
        } catch (err) {
            if (err.code == "ER_DUP_ENTRY") {
                Telegram.sendMessageToUser(user, `You have already added ${ packageName } to your watch list. Use /remove ${ packageName } to remove it from your watch list.`);
            } else {
                Telegram.sendMessageToUser(user, `An error occured while trying to add ${ packageName } to your watch list.`);
            }

            return;
        }

        // Notify user.
        return Telegram.sendMessageToUser(user, `Hooray! ${ packageName } is now added to your watch list. NpmWatchBot will notify you whenever there is an update to the package!`);
    }

    async receiveRemove({ user, packageName }) {
        const PackagesWatching = Models.PackagesWatching;

        // Remove package from watch list.
        try {
            await PackagesWatching.where({ package_name: packageName, user_id: user.get("id") }).destroy({ require: true });
        } catch (err) {
            Telegram.sendMessageToUser(user, `An error occured while trying to remove ${ packageName } from your watch list.`);
            return;
        }

        // Notify user.
        return Telegram.sendMessageToUser(user, `Alright, you are no longer watching updates to ${ packageName }. Use /add ${ packageName } to add it back to your watch list.`);
    }

    async receiveCheck({ user, packageName }) {
        let pkg;

        // Retrieve package from npm.
        try {
            pkg = await retrieveAndUpdateFromNpm(packageName);
        } catch (err) {
            return Telegram.sendNoSuchPackageMessage(user, packageName);
        }

        // Notify user.
        return Telegram.sendLatestVersionMessage(user, pkg);
    }

}
