class Poll{
    constructor(question, author, emotes, answers, anonymous, voteLimit){
        this.question = question;
        this.author = author;
        this.emotes = emotes;
        this.answers = answers;
        this.votes.length = answers.length;
        this.anonymous = anonymous || false;
        this.voteLimit = voteLimit || 0;

        for (let i = 0; i < this.votes.length; i++) {
            this.votes[i] = new Discord.Collection();
        }
    }

    question = ``;
    author;
    anonymous = false;
    voteLimit = 0;
    emotes = [];
    answers = [];
    votes = [];
}

const Discord = require('discord.js');
const numbers = [
    ':one:',
    ':two:',
    ':three:',
    ':four:',
    ':five:',
    ':six:',
    ':seven:',
    ':eight:',
    ':nine:',
    ':keycap_ten:'
]
const emotes = [
    '1️⃣',
    '2️⃣',
    '3️⃣',
    '4️⃣',
    '5️⃣',
    '6️⃣',
    '7️⃣',
    '8️⃣',
    '9️⃣',
    '🔟'
]
const pollMap = new Discord.Collection();

function createEmbed(poll){
    let embed = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setTitle(poll.question)
        .setAuthor(poll.author.username, poll.author.avatarURL());
    for (let i = 0; i < poll.answers.length; i++) {
        votes = Array.from(poll.votes[i].keys());
        let voteString = "";
        if (!poll.anonymous){
            voteString = votes.length ? votes.join(", ") : '\u200b';
        }
        else{
            votes.forEach(vote => {
                voteString += poll.emotes[i];  
            });
            if (!voteString.length){
                voteString = '\u200b';
            }
        }
        embed.addField(poll.emotes[i] + poll.answers[i] + ` \`${votes.length}\``, voteString, true);
    }
    return embed;
}

module.exports = {
    name: 'poll',
    description: 'Creates a poll',
    args: true,
    argSlice: /" +"/,
    guildOnly: true,
    usage: '[\"question\"] [optional: secret] [optional: limit n] [\"answer1\":optional_emote:] [\"answer2\":optional_emote:] [...]',
    execute(message, args) {
        //Seperate arguments, need to have things in quotation not separated
        let lastArg = args[args.length - 1];
        let extraArgs = lastArg.split(/" +/);
        args[args.length - 1] = extraArgs.shift();
        if (extraArgs.length){
            extraArgs = extraArgs[0].split(/ +/);
        }

        //Split arguments into variables. Questioni, isSecret, limit, and answers[]
        for (let index = 0; index < args.length; index++) {
            args[index] = args[index].replace('\"', '');
        }

        const question = args.shift();
        const answers = args;
        const anonymous = extraArgs.includes("anonymous");

        if (answers.length > 10){
            return message.reply(`the maximum number of answers is 10, please make sure you don't exceed this limit.`);
        }
        
        //Set up reaction filter for the message
        const selectedEmotes = emotes.slice(0, answers.length);
        const filter = (reaction, user) => {
            return !user.bot;
        }

        //Create a poll contianing data of the... Well, poll!
        let poll = new Poll(question, message.author, selectedEmotes, answers, anonymous);
        pollMap.set(poll.question + message.author);

        //Set up the message with the poll
        embed = createEmbed(poll);

        message.channel.send(embed).then(async function (message) {
            try {
                for (let i = 0; i < answers.length; i++) {
                    await message.react(emotes[i]);
                }

                //Set up a collector for the message
                const collector = message.createReactionCollector(filter, { time: 900000 /*15 mins*/ });

                collector.on('collect', (reaction, user) => {
                    console.log(`User ${user.username} voted on answer ${reaction.emoji.name}`);

                    if (poll.emotes.includes(reaction.emoji.name)){
                        let index = poll.emotes.findIndex(a => a === reaction.emoji.name);
                        if (poll.votes[index].has(`<@${user.id}>`)){
                            poll.votes[index].delete(`<@${user.id}>`);
                        }
                        else{
                            poll.votes[index].set(`<@${user.id}>`, true);
                        }
                        embed = createEmbed(poll);
                        message.edit(embed);
                    }
                    reaction.users.remove(user);
                });
                
                collector.on('end', collected => {
                    pollMap.delete(poll.question + poll.author);
                    console.log(`Collected ${collected.size} items`);
                });
            }
            catch (error){
                console.error('One of the emotes failed to react.');
            }
        });
    },
};