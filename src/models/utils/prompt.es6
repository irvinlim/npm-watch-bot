'use strict';

import Readline from "readline";

const rl = Readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

export default (question) => {
    return new Promise(resolve => rl.question(question, resolve));
}
