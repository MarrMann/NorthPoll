//Import libraries and make a discord client
const fs = require('fs'); //File system
const Discord = require('discord.js');
const { prefix, token } = require('./config.json')

const client = new Discord.Client();
client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles){
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
    console.log(`Added command ${command.name}`);
}
const cooldowns = new Discord.Collection();

//Event listener when a user connected to the server
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

//Event listenever when a user sends a message in chat
client.on("message", message => {
    //Check if the message is for the bot
    if(!message.content.startsWith(prefix) || message.author.bot) return;

    //Get the args and command
    let args = message.content.slice(prefix.length).split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

    //Custom slicing for commands
    if (command.argSlice) {
        args = message.content.slice(prefix.length).split(command.argSlice);
        args[0] = args[0].slice(commandName.length);
    }

    //If the command requires args, check that there are args.
    if (command.args && !args.length){
        let reply = `You didn't provide any arguments, ${message.author}!`;

        //Reply with the usage if one is defined.
        if (command.usage) {
            reply += `\nThe proper usage would be: "${prefix}${command.name} ${command.usage}"`;
        }
        return message.channel.send(reply);
    }

    //Check if the command can only run in channels
    if (command.guildOnly && message.channel.type !== 'text') {
        return message.reply('I can\'t execute that command inside DMs');
    }

    //Add a cooldown to the command
    if (!cooldowns.has(command.name)) {
        cooldowns.set(command.name, new Discord.Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.name);
    const cooldownAmount = (command.cooldown || 3) * 1000; //Convert from millis to seconds

    if (timestamps.has(message.author.id)) {
        const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

        if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            return message.reply(`please wait ${timeLeft.toFixed(1)} more second(s) before reusing the "${command.name}" command.`);
        }
    }
    else {
        timestamps.set(message.author.id, now);
        setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
    }

    //Execute the command.
    try {
        command.execute(message, args);
    } catch (error) {
        console.error(error);
        message.reply('There was an error trying to execute that command.');
    }

    //Log the message recieved
    console.log(`Received message \"${message.content}\" from user ${message.author.tag} in channel ${message.channel.name} on server ${message.guild ? message.guild.name : 'dm'}`);
});

//Initialize the bot by connecting to the server with its token
console.log("Attempting to log in...");
client.login(token);