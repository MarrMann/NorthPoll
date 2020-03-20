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
        embed.addField(poll.emotes[i] + " " + poll.answers[i] + ` \`${votes.length}\``, voteString);
    }
    return embed;
}

module.exports = {
    name: 'poll',
    description: 'Creates a poll',
    args: true,
    argSlice: / +"/,
    guildOnly: true,
    aliases: ['northpoll', 'npoll'],
    cooldown: 30,
    usage: '[\"question\"] [\"answer1\":optional_emote:] [\"answer2\":optional_emote:] [more answers] [optional: \"anonymous\"]',
    execute(message, args) {
        //Seperate arguments, need to have things in quotation not separated
        let lastArg = args[args.length - 1];
        let extraArgs = lastArg.split(/"/);
        args[args.length - 1] = extraArgs.shift();
        if (extraArgs.length){
            if (!extraArgs[0].startsWith(" ")){
                extraArgs = extraArgs[0].split(/ +/);
                args[args.length - 1] += "\"" + extraArgs[0];
                extraArgs.shift();
            }
            else{
                extraArgs = extraArgs[0].split(/ +/);
                extraArgs.shift();
            }
        }

        //Split arguments into variables. Question, isSecret, limit, and answers[]
        const selectedEmotes = emotes.slice(0, args.length - 1);
        args[0] = args[0].slice(1); //Remove the first "
        const question = args.shift().replace("\"", ""); //Remove the first arg - that's the question

        for (let i = 0; i < args.length; i++) {
            let split = args[i].split("\"");
            args[i] = split[0];
            if (split.length > 1 && split[1].length > 0){
                selectedEmotes[i] = split[1];
            }
        }

        const answers = args;
        const anonymous = extraArgs.includes("anonymous") || extraArgs.includes("anon");
        let limit = 0;
        if (extraArgs.includes("limit")){
            let index = extraArgs.findIndex((arg) => arg == "limit");
            if (extraArgs.length > index + 1){
                let num = parseInt(extraArgs[index + 1]);
                if (num != NaN){
                    limit = num;
                }
            }
        }
        let timeLimit = 900000; //15 mins default
        if (extraArgs.includes("time") || extraArgs.includes("timelimit")){
            let index = extraArgs.findIndex((arg) => arg == "time" || arg == "timelimit");
            timeLimit = 0;
            if (extraArgs.length > index + 1){
                let timeArr = extraArgs[index + 1].split(":");
                timeLimit += parseInt(timeArr.pop()) * 60 * 1000; //Minutes to millis
                if (timeArr.length){
                    timeLimit += parseInt(timeArr.pop()) * 60 * 60 * 1000; //Hours to millis
                }
                if (timeArr.length){
                    timeLimit += parseInt(timeArr.pop()) * 24 * 60 * 60 * 1000; //Days to millis
                }
                if (timeLimit == NaN){
                    timeLimit = 900000;
                }
                if (timeLimit > 604800000){
                    timeLimit = 604800000; //7 days
                    message.channel.send("The maximum time limit is 7 days, setting the poll to that.");
                }
            }
        }

        if (answers.length > 10){
            return message.reply(`the maximum number of answers is 10, please make sure you don't exceed this limit.`);
        }
        
        //Set up reaction filter for the message
        const filter = (reaction, user) => {
            return !user.bot;
        }

        //Create a poll contianing data of the... Well, poll!
        let poll = new Poll(question, message.author, selectedEmotes, answers, anonymous);
        pollMap.set(poll.question + message.author);

        //Set up the message with the poll
        embed = createEmbed(poll);

        message.channel.send(embed).then(async function (message) {
            //React to the message with each possible vote
            for (let i = 0; i < poll.answers.length; i++) {
                try{
                    await message.react(poll.emotes[i]);
                }
                catch (error){
                    try{
                        let emoteArr = poll.emotes[i].split(":");
                        let emote = emoteArr[emoteArr.length - 1].slice(0, emoteArr[emoteArr.length - 1].length - 1);
                        poll.emotes[i] = emote;
                        await message.react(poll.emotes[i]);
                    }
                    catch{
                        message.channel.send(`The emote ${poll.emotes[i]} failed to react, replacing with ${emotes[i]}.`);
                        try {
                            poll.emotes[i] = emotes[i];
                            await message.react(poll.emotes[i]);
                        }
                        catch (error) {
                            message.channel.send(`Okay boyo something's messed up. That emote failed too, here's the error:\n${error}`);
                        }
                    }
                }
            }

            try{
                //Set up a collector for the message
                const collector = message.createReactionCollector(filter, { time: timeLimit });

                collector.on('collect', (reaction, user) => {
                    if (poll.emotes.includes(reaction.emoji.name)){
                        let index = poll.emotes.findIndex(a => a === reaction.emoji.name);
                        if (poll.votes[index].has(`<@${user.id}>`)){
                            poll.votes[index].delete(`<@${user.id}>`);
                        }
                        else{
                            if (limit > 0){
                                let count = 0;
                                poll.votes.forEach(vote => {
                                    if (vote.has(`<@${user.id}>`)){
                                        count++;
                                    }
                                });
                                if (count >= limit){
                                    return reaction.users.remove(user);
                                }
                            }
                            poll.votes[index].set(`<@${user.id}>`, true);
                        }
                        embed = createEmbed(poll);
                        message.edit(embed);
                    }
                    reaction.users.remove(user);
                });
                
                collector.on('end', collected => {
                    //Find the highest voted answers
                    let highestVotes = [];
                    let maxVotes = -1;
                    for (let i = 0; i < poll.votes.length; i++) {
                        if (poll.votes[i].size >= maxVotes){
                            maxVotes = poll.votes[i].size;
                            highestVotes.push(poll.answers[i]);
                        }
                    }
                    let highestVotesStr = highestVotes.join(`" ${maxVotes}\n\t"`);

                    message.channel.send(`Poll "${poll.question}" is over, the highest voted answers were:\n\t"${highestVotesStr}" ${maxVotes}`);
                    pollMap.delete(poll.question + poll.author);
                });
            }
            catch (error){
                console.error("Error during collection of poll " + poll.question + ":\n" + error);
            }
        });
    },
};