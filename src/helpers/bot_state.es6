'use strict';

import Models from '../models/bookshelf';

export const getState = async key => {
    const state = await Models.BotState.where('key', key).fetch();
    return state.get('value');
};

export const setState = (key, value) => {
    return Models.BotState.where({ key }).save({ value }, { patch: true });
};
