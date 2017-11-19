'use strict';

import moment from 'moment';
import AbstractRouter from '../AbstractRouter';

import extractCommand from '../../helpers/extract_command';
import Telegram from '../../helpers/telegram';
import { notifyWatchers } from '../../helpers/package_watchers';
import { retrieveAndUpdateFromNpm, updatePackageFromNpm } from '../../helpers/package';

import Models, { knex } from '../../models/bookshelf';

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
        router.post('/', async context => {
            const { message: { from: userFrom, text, date: timestamp } } = context.request.body;
            const messageDate = moment.unix(timestamp);

            // User identification
            let user = await User.where('id', userFrom.id).fetch();
            if (!user) {
                user = await User.forge(userFrom).save(null, { method: 'insert' });
            }

            // Ignore old messages
            if (messageDate.isSameOrBefore(user.get('last_message_time'))) {
                context.body = { status: 'success' };
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

            context.body = { status: 'success' };
        });
    }

    handleCommand({ user, text }) {
        const { command, value } = extractCommand(text);

        switch (command) {
            case 'list':
                return this.receiveList({ user });
            case 'add':
                return this.receiveAdd({ user, packageName: value });
            case 'remove':
                return this.receiveRemove({ user, packageName: value });
            case 'check':
                return this.receiveCheck({ user, packageName: value });
            default:
                return this.receiveMessage({ user, text });
        }
    }

    async receiveMessage({ user, text }) {
        Telegram.sendMessageToUser(
            user,
            'Hello, I am NpmWatchBot! I help watch repositories on the *npm* repository for updates, so that you will be notified when a package updates, as it updates!\n\n' +
                'Commands:\n' +
                '`/list`: Lists your currently watched packages..\n' +
                '`/add package_name`: Adds a package to your watch list.\n' +
                '`/remove package_name`: Removes a package from your watch list.\n' +
                '`/check package_name`: Immediately checks a package from npm for updates.\n\n' +
                'For questions or bug reports, you may find my source code at https://github.com/irvinlim/npm-watch-bot. Or you can bug my maker Irvin Lim (@irvinlim) at https://irvinlim.com.'
        );
    }

    async receiveAdd({ user, packageName }) {
        const PackagesWatching = Models.PackagesWatching;

        if (!packageName || !packageName.length) {
            return Telegram.sendMessageToUser(user, 'Usage: `/add package_name`');
        }

        // Retrieve package from npm.
        try {
            await retrieveAndUpdateFromNpm(packageName);
        } catch (err) {
            return Telegram.sendNoSuchPackageMessage(user, packageName);
        }

        // Add package to watch list.
        try {
            await PackagesWatching.forge({ package_name: packageName, user_id: user.get('id') }).save();
        } catch (err) {
            if (err.code == 'ER_DUP_ENTRY') {
                Telegram.sendMessageToUser(
                    user,
                    `You have already added ${packageName} to your watch list. Use /remove ${packageName} to remove it from your watch list.`
                );
            } else {
                Telegram.sendMessageToUser(user, `An error occured while trying to add ${packageName} to your watch list.`);
            }

            return;
        }

        // Notify user.
        return Telegram.sendMessageToUser(
            user,
            `Hooray! ${packageName} is now added to your watch list. NpmWatchBot will notify you whenever there is an update to the package!`
        );
    }

    async receiveRemove({ user, packageName }) {
        const PackagesWatching = Models.PackagesWatching;

        if (!packageName || !packageName.length) {
            return Telegram.sendMessageToUser(user, 'Usage: `/remove package_name`');
        }

        // Remove package from watch list.
        try {
            await PackagesWatching.where({ package_name: packageName, user_id: user.get('id') }).destroy({ require: true });
        } catch (err) {
            Telegram.sendMessageToUser(user, `An error occured while trying to remove ${packageName} from your watch list.`);
            return;
        }

        // Notify user.
        return Telegram.sendMessageToUser(
            user,
            `Alright, you are no longer watching updates to ${packageName}. Use /add ${packageName} to add it back to your watch list.`
        );
    }

    async receiveCheck({ user, packageName }) {
        let pkg;

        if (!packageName || !packageName.length) {
            return Telegram.sendMessageToUser(user, 'Usage: `/check package_name`');
        }

        // Retrieve package from npm.
        try {
            pkg = await retrieveAndUpdateFromNpm(packageName);
        } catch (err) {
            return Telegram.sendNoSuchPackageMessage(user, packageName);
        }

        // Notify user.
        return Telegram.sendLatestVersionMessage(user, pkg);
    }

    async receiveList({ user }) {
        let pkgList = [];
        const PackagesWatching = Models.PackagesWatching;

        // Remove package from watch list.
        try {
            pkgList = await PackagesWatching.where({ user_id: user.get('id') })
                .orderBy('package_name', 'ASC')
                .fetchAll();
        } catch (err) {
            Telegram.sendMessageToUser(user, `An error occured while trying to remove ${packageName} from your watch list.`);
            return;
        }

        // Check if there are no packages for the current user.
        if (!pkgList.length) {
            return Telegram.sendMessageToUser(
                user,
                'Looks like you have no packages currently being watched! Use `/add package_name` to start watching a package.'
            );
        }

        // Create message.
        let msg = 'Here are your currently watched packages.\n\n';
        pkgList.models.forEach(pkg => {
            msg += `${pkg.get('package_name')} (https://www.npmjs.com/package/)${pkg.get('package_name')}\n`;
        });

        return Telegram.sendMessageToUser(user, msg);
    }
}
