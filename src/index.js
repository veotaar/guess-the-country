import {
  Client,
  IntentsBitField,
  Partials,
  AttachmentBuilder,
} from 'discord.js';
import {
  getPossibleAnswersFromShortGoogleUrl,
  normalizeAnswer,
  extractAfterCommand,
} from './lib/utils.js';
import connect from './lib/connect.js';
import { validateGuess } from './lib/utils.js';
import { highlightCountries } from './lib/map.js';

const gameChannelId = process.env.CHANNEL_ID;

let activeGame = null;
const bannedUsers = [];

const adminRoles = ['Yönetici', 'Moderatör', 'testing'];
let timeout;

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember],
});

client.login(process.env.TOKEN);

await connect();

const startGame = async (msg, googleMapsLink) => {
  const dmChannel = client.channels.cache.get(msg.channelId);

  if (activeGame) {
    await dmChannel.send('Devam eden bir oyun var. Bitmesini bekleyin.');
    return;
  }

  try {
    const possibleAnswers = await getPossibleAnswersFromShortGoogleUrl(
      googleMapsLink
    );

    if (possibleAnswers.length === 0) {
      throw new Error(
        'Bu loksayonu bulamıyorum. Hangi ülkeye ait olduğu tartışmalı olan veya Antarktika gibi hiçbir ülkeye ait olmayan lokasyonlar atmayın.'
      );
    }

    activeGame = {
      userId: msg.author.id,
      startedBy: msg.author.globalName,
      possibleAnswers,
      googleMapsLink,
      attachmentLink: null,
      winner: null,
      winnerDiscordUsername: '',
      winnerDiscordGlobalName: '',
      flag: '',
      guesses: [],
      guessCount: 0,
    };

    const flag = activeGame.possibleAnswers.find(
      (answer) => answer.length === 2
    );

    activeGame.flag = flag;

    const channel = client.channels.cache.get(gameChannelId);
    await channel.send(
      `${msg.author.globalName} yeni bir oyun başlatıyor. Ekran görüntüsü atması için 60 saniye bekliyorum.`
    );

    // await dmChannel.send('Yeni bir oyun başlattınız.');
    // await dmChannel.send(
    //   '**BURAYA** 60 saniye içinde ekran görüntüsünü atın. Oyun kanalına **DEĞİL**. Oraya ben atacağım.'
    // );
    // await dmChannel.send(`Bulduğum ülke: ${activeGame.possibleAnswers[0]} :flag_${activeGame.possibleAnswers[0].toLowerCase()}`);
    // await dmChannel.send('Bulduğum ülke yanlışsa sürenin dolmasını bekleyin, ya da oyunu iptal edin. Oyunu iptal etmek için `!iptal` mesajı gönderin.');

    await dmChannel.send(`
      ✅ YENİ BİR OYUN BAŞLATMAK ÜZERESİNİZ ✅

      ⚠️**BURAYA** 60 saniye içinde **EKRAN GÖRÜNTÜSÜNÜ** atın.⚠️
      ⚠️Oyun kanalına **DEĞİL**. Oraya ben atacağım.⚠️

      Bulduğum yer: **${activeGame.possibleAnswers[0]}** ${
      flag ? `:flag_${flag.toLowerCase()}:` : '(bayrak emojisi bulunamadı)'
    }
      Bulduğum yer yanlışsa sürenin dolmasını bekleyin ya da oyunu iptal edin. Oyunu iptal etmek için bana \`!iptal\` mesajı gönderin.

      **Şu cevapları doğru kabul edeceğim:**
      \`\`\`
      ${activeGame.possibleAnswers.join(', ')}
      \`\`\`

      Cevaplar büyük / küçük harflere, noktalama işaretlerine ve diyakritiklere (á, é, ş, ç gibi) duyarlı değildir.
      Örneğin "Côte d'Ivoire" cevabı "COTE DIVOIRE" olarak alınır.

      Sınırlara çok yakın yerlerde yanlış ülkeyi buluyor olabilirim.
      Hangi ülkeye ait olduğu tartışmalı olan lokasyonlarda da hata yapabilirim.
      `);

    timeout = setTimeout(() => {
      if (
        activeGame &&
        activeGame.userId === msg.author.id &&
        !activeGame.attachmentLink
      ) {
        activeGame = null;
        dmChannel.send('Ekran görüntüsü yollamak için süreniz doldu.');
        channel.send(
          `${msg.author.globalName} 60 saniye içinde ekran görüntüsü yükleyemedi. Yeni oyun başlatılabilir.`
        );
      }
    }, 62000);
  } catch (e) {
    await dmChannel.send(`⚠️HATA: ${e.message}`);
    activeGame = null;
  }
};

const postImg = async (msg) => {
  const dmChannel = client.channels.cache.get(msg.channelId);

  const attachment = msg.attachments.first();

  if (activeGame.attachmentLink) {
    await dmChannel.send(
      'Aktif bir oyun var ve oyunun ekran görüntüsü zaten var.'
    );
    return;
  }

  if (!attachment || !attachment.height) {
    await dmChannel.send('Uygun bir ekran görüntüsü yollayın.');
    return;
  }

  activeGame.attachmentLink = attachment.url;

  const channel = client.channels.cache.get(gameChannelId);
  if (!channel) return;

  await channel.send(attachment.url);
  await channel.send(`**${msg.author.globalName}** bir tahmin oyunu başlattı!`);
  await channel.send(
    'Tahminlerinizi `!t <tahmin>` ile yapabilirsiniz. Örneğin: `!t TR`, `!t USA`, `!t norveç`, `!t güney afrika`, `!t new zealand` gibi.'
  );
};

const handleDm = async (msg) => {
  if (msg.author.bot) return;
  if (!!bannedUsers.find((user) => user.id === msg.author.id)) return;

  // const channel = client.channels.cache.get(msg.channelId);
  const channel = client.channels.cache.get(gameChannelId);

  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  const member = await guild.members.fetch(msg.author.id);
  const isVerified = member.roles.cache.some((role) => role.name === 'testing');
  const isAdmin = member.roles.cache.some((role) =>
    adminRoles.includes(role.name)
  );

  if (!isVerified) {
    bannedUsers.push({
      username: msg.author.username,
      id: msg.author.id,
    });
    await msg.channel.send(
      '`Verified` rolünüz olmadığı için bu botu kullanamazsınız.'
    );
    return;
  }

  const content = msg.content;

  if (content === '!iptal' && isAdmin) {
    clearTimeout(timeout);
    await channel.send('❌Oyun iptal edildi. Yeni oyun başlatılabilir.❌');
    activeGame = null;
    await msg.channel.send('Oyun iptal edildi.');
    return;
  }

  if (content === '!iptal' && msg.author.id === activeGame.userId) {
    clearTimeout(timeout);
    await channel.send(
      `❌**${msg.author.globalName}** oyunu iptal etti. Yeni oyun başlatılabilir.❌`
    );
    activeGame = null;
    await msg.channel.send('Oyun iptal edildi.');
    return;
  }

  if (
    activeGame &&
    activeGame.userId === msg.author.id &&
    msg.attachments.size > 0
  ) {
    await postImg(msg);
    return;
  }

  if (activeGame) {
    await msg.channel.send('Devam eden bir oyun var. Bitmesini bekleyin.');
    return;
  }

  if (content.startsWith('!yeni')) {
    startGame(msg, content.split(' ')[1]);
    return;
  }

  await msg.channel.send(
    'Yeni oyun başlatmak için `!yeni <google street view linki>` gönderin (<> olmadan). Link kısa formatta olmalıdır.'
  );
};

const handleGuess = async (msg) => {
  if (!msg.content.startsWith('!t') || msg.content === '!tahminler') return;
  if (!activeGame) return;
  if (activeGame.winner) return;
  if (!msg.member.roles.cache.some((role) => role.name === 'testing')) return;

  // !t XX, there is an active game, there is no winner yet, user has specific role
  // const guess = msg.content.split(' ')[1].toUpperCase();
  const guess = normalizeAnswer(extractAfterCommand(msg.content));

  const validGuess = validateGuess(guess);

  if (!validGuess) {
    await msg.react('❓');
    return;
  }

  if (activeGame.possibleAnswers.includes(guess)) {
    activeGame.winner = msg.author.id;
    activeGame.winnerDiscordUsername = msg.author.username;
    activeGame.winnerDiscordGlobalName = msg.author.globalName;
    await msg.react('✅');

    await msg.channel.send({
      embeds: [
        {
          color: 0x22c55e,
          title: `Tebrikler **${msg.author.globalName}**! :flag_${
            activeGame.flag.length === 2 ? activeGame.flag.toLowerCase() : ''
          }: Lokasyon linki:`,
          description: activeGame.googleMapsLink,
          footer: {
            text: `${activeGame.guesses.length} tahminden sonra bulundu.`,
          },
        },
      ],
    });

    // await msg.channel.send(`Tebrikler ${msg.author.globalName}!`);
    // await msg.channel.send(`Lokasyon: ${activeGame.googleMapsLink}`);
    activeGame = null;
    return;
  }

  if (activeGame.guesses.find((guess) => guess.id === validGuess.id)) {
    await msg.react('🔁');
    return;
  }

  activeGame.guesses.push({
    guessById: msg.author.id,
    madeBy: msg.author.globalName,
    ...validGuess,
  });
  await msg.react('❌');
};

client.on('ready', (client) => {
  console.log(`${client.user.tag} is ready!`);
});

// client.on('messageCreate', (msg) => {
//   const hasTestingRole = msg.member.roles.cache.some(role => role.name === 'verified')
//   console.log(`'testing' role: ${hasTestingRole}`);
// })

client.on('messageCreate', async (msg) => {
  if (!msg.guildId) {
    await handleDm(msg);
    return;
  }

  if (msg.channel.id === gameChannelId) {
    await handleGuess(msg);
    return;
  }
});

// !map
client.on('messageCreate', async (msg) => {
  if (!msg.channel.id === gameChannelId) return;
  if (!msg.content.startsWith('!map')) return;
  if (!activeGame) return;
  if (activeGame.winner) return;
  if (!msg.member.roles.cache.some((role) => role.name === 'testing')) return;
  if (!activeGame.guesses.some((guess) => guess.iso1N3 !== '')) return;

  const iso1N3Guesses = activeGame.guesses
    .map((guess) => guess.iso1N3)
    .filter((guess) => guess !== '');
  const attachment = new AttachmentBuilder(highlightCountries(iso1N3Guesses), {
    name: 'highlighted.png',
  });

  await msg.channel.send({ files: [attachment] });
});

// !tahminler
client.on('messageCreate', async (msg) => {
  if (!msg.channel.id === gameChannelId) return;
  if (!msg.content.startsWith('!tahminler')) return;
  if (!activeGame) return;
  if (activeGame.winner) return;
  if (!msg.member.roles.cache.some((role) => role.name === 'testing')) return;
  if (activeGame.guesses.length <= 0) return;

  const guesses = activeGame.guesses.map((guess) => {
    const { iso1A2, iso1A3, location } = guess;
    const flag = iso1A2 ? `:flag_${iso1A2.toLowerCase()}:` : '';
    return `${flag} ${iso1A2} ${iso1A3} ${location}\n`;
  });

  const guessesWithHeading = ['**TAHMİNLER**\n', ...guesses];

  await msg.channel.send(guessesWithHeading.join(''));
});

// !ss
client.on('messageCreate', async (msg) => {
  if (!msg.channel.id === gameChannelId) return;
  if (!msg.content.startsWith('!ss')) return;
  if (!activeGame) return;
  if (activeGame.winner) return;
  if (!msg.member.roles.cache.some((role) => role.name === 'testing')) return;
  if (!activeGame.attachmentLink) return;

  await msg.channel.send(activeGame.attachmentLink);
});
