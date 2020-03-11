class Poll{
    constructor(question, author, answers, anonymous, voteLimit){
        this.question = question;
        this.author = author;
        this.answers = answers;
        this.anonymous = anonymous || false;
        this.voteLimit = voteLimit || 0;
        this.key = question + author.id;
    }

    key = ``
    question = ``;
    author;
    anonymous = false;
    voteLimit = 0;
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
const pollMap = {};

function createEmbed(poll){
    let embed = new Discord.RichEmbed()
        .setColor('#0099ff')
        .setTitle(poll.question)
        .setAuthor(poll.author.username, poll.author.displayAvatarURL);
    for (let i = 0; i < poll.answers.length; i++) {
        embed.addField(numbers[i] + poll.answers[i], '\u200b', true);
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
        
        //Split arguments into variables. Questioni, isSecret, limit, and answers[]
        for (let index = 0; index < args.length; index++) {
            args[index] = args[index].replace('\"', '');
        }

        const question = args.shift();
        const answers = args;

        if (answers.length > 10){
            return message.reply(`the maximum number of answers is 10, please make sure you don't exceed this limit.`);
        }

        //Create a poll contianing data of the... Well, poll!
        let poll = new Poll(question, message.author, answers);

        //Set up the message with the poll
        embed = createEmbed(poll);

        //Set up reaction filter for the message
        const selectedEmotes = emotes.slice(0, answers.length);
        const filter = (reaction, user) => {
            return true;
        }

        message.channel.send(embed).then(async function (message) {
            try {
                for (let i = 0; i < answers.length; i++) {
                    await message.react(emotes[i]);
                }

                //Set up a collector for the message
                const collector = message.createReactionCollector(filter, { time: 86400000 /*24 hours*/ });

                collector.on('collect', (reaction, reactionCollector) => {
                    for (let user of reaction.users.values()){
                        if (!user.bot){
                            reaction.remove(user);
                        }
                    }
                    message.edit(embed);
                    console.log(`Collected ${reaction.emoji.name}`);
                });
                
                collector.on('end', collected => {
                    console.log(`Collected ${collected.size} items`);
                });
            }
            catch (error){
                console.error('One of the emotes failed to react.');
            }
        });
    },
};