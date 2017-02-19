export default function(text) {
    const nullCommand = {
        command: null,
        value: text
    };

    if (!text || !text.length) {
        return nullCommand;
    }

    const tokens = text.split(" ");

    if (tokens[0].indexOf("/") !== 0) {
        return nullCommand;
    }

    const [ command, ...args ] = tokens;
    return {
        command: command.substr(1),
        value: args.join(" ")
    };
}
