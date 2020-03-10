module.exports = {
    name: 'reload',
    description: 'Reloads a command',
    args: true,
    execute(message, args) {
        const commandName = args[0].toLowerCase();
        const command = message.client.commands.get(commandName) || message.client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
        if (!command){
            return message.channel.send(`There is no command with name or alias '${commandName}', ${message.author}!`);
        }

        delete require.cache[require.resolve(`./${commandName}.js`)];

        try{
            const newCommand = require(`./${commandName}.js`);
            message.client.commands.set(newCommand.name, newCommand);
            message.channel.send(`Command '${commandName}' reloaded.`);
        }
        catch (error){
            console.log(error);
            message.channel.send(`There was an error reloading the command '${commandName}':\n'${error.message}'`);
        }
    },
};