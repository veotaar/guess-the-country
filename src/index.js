import { Client, IntentsBitField, Partials } from "discord.js";
import { getPossibleAnswersFromShortGoogleUrl, normalizeAnswer, extractAfterCommand } from "./lib/utils.js";
import connect from "./lib/connect.js";

const gameChannelId = process.env.CHANNEL_ID;

let activeGame = null;
const bannedUsers = [];

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.DirectMessages
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
});

client.login(process.env.TOKEN);

await connect();

const startGame = async (msg, googleMapsLink) => {
  if(activeGame) {
    msg.reply('There is an ongoing game. Wait for the game to finish.')
    return;
  }

  try {
    const possibleAnswers = await getPossibleAnswersFromShortGoogleUrl(googleMapsLink);
    activeGame = {
      userId: msg.author.id,
      startedBy: msg.author.globalName,
      possibleAnswers,
      googleMapsLink,
      attachmentLink: null,
      winner: null,
      guesses: [],
      guessCount: 0
    };

    const channel = client.channels.cache.get(gameChannelId);
    await channel.send(`${msg.author.globalName} is starting a new game.`);
    await channel.send(`${msg.author.globalName} has 60 seconds to post an image.`);

    msg.reply(`You have started a game! Please send an image within 60 seconds.`);
    setTimeout(() => {
      if (activeGame && activeGame.userId === msg.author.id && !activeGame.attachmentLink) {
        activeGame = null;
        msg.reply('The time to send an image has expired.');
        channel.send(`${msg.author.globalName} failed to send an image. New game possible.`);
      }
    }, 2000);
  } catch (e) {
    console.log(e.message);
    msg.reply("ERROR: Invalid google maps link.");
    activeGame = null;
  }
}

const postImg = async (msg) => {
  const attachment = msg.attachments.first();

  if(activeGame.attachmentLink) {
    msg.reply('Game is running and already has an image.');
    return;
  }

  if(!attachment || !attachment.height) {
    msg.reply('Please post a valid image.');
    return;
  }

  activeGame.attachmentLink = attachment.url;

  const channel = client.channels.cache.get(gameChannelId);
  if(!channel) return;

  await channel.send(attachment.url);
  await channel.send('Game started! Make your guesses with !t XX');
}

const handleDm = async (msg) => {

  if(msg.author.bot) return;
  if(!!bannedUsers.find(user => user.id === msg.author.id)) return;

  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  const member = await guild.members.fetch(msg.author.id);
  const isVerified = member.roles.cache.some(role => role.name === 'testing');

  if(!isVerified) {
    bannedUsers.push({
      username: msg.author.username,
      id: msg.author.id
    });
    msg.reply('You are permanently banned from using this bot. Reason: You are not verified.');
    return;
  }

  const content = msg.content;

  if (activeGame && activeGame.userId === msg.author.id && msg.attachments.size > 0) {
    await postImg(msg)
    return;
  }

  if(activeGame) {
    msg.reply('There is an ongoing game. Wait for the game to finish.')
    return;
  }

  if(content.startsWith('!new')) {
    startGame(msg, content.split(' ')[1])
    return;
  }

  msg.reply('ERROR: unknown command');
}

const handleGuess = async (msg) => {
  if(!msg.content.startsWith('!t')) return;
  if(!activeGame) return;
  if(activeGame.winner) return;
  if(!msg.member.roles.cache.some(role => role.name === 'testing')) return;

  // !t XX, there is an active game, there is no winner yet, user has specific role
  // const guess = msg.content.split(' ')[1].toUpperCase();
  const guess = normalizeAnswer(extractAfterCommand(msg.content));
  console.log('Raw Guess: ' + extractAfterCommand(msg.content));
  console.log('Normalized Guess: ' + guess);

  if(activeGame.possibleAnswers.includes(guess)) {
    activeGame.winner = msg.author.globalName; // TODO change to id
    await msg.react('✅');
    msg.channel.send(`Congratulations, ${msg.author.globalName}! You guessed the country correctly.`);
    msg.channel.send(`Location: ${activeGame.googleMapsLink}`);

    activeGame = null;
  } else {
    await msg.react('❌');
  }
}

client.on('ready', (client) => {
  console.log(`${client.user.tag} is ready!`);
});

// client.on('messageCreate', (msg) => {
//   const hasTestingRole = msg.member.roles.cache.some(role => role.name === 'verified')
//   console.log(`'testing' role: ${hasTestingRole}`);
// })

client.on('messageCreate', async (msg) => {

  if(!msg.guildId) {
    await handleDm(msg);
    return;
  }

  if(msg.channel.id === gameChannelId) {
    await handleGuess(msg);
    return;
  }
}
);

