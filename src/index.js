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
  gameInfoMessage,
  validateGuess,
} from './lib/utils.js';
import {
  getGameMaster,
  createGameMaster,
  getGameWinner,
  createGameWinner,
  createGame,
  getStats,
  getPlayerLeaderboard,
  getGameMasterLeaderboard,
  getMostGames,
  getMostWins,
  updateGlobalStats,
  getGlobalStats,
} from './lib/services.js';
import connect from './lib/connect.js';
import { highlightCountries } from './lib/map.js';

const gameChannelId = process.env.CHANNEL_ID;

let activeGame = null;
const bannedUsers = [];

const adminRoles = ['Yönetici', 'Moderatör', 'testing', 'Verified'];
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

    const { iso1A2, iso1A3, iso1N3, nameEn } = validateGuess(
      possibleAnswers[0]
    );

    const location = {
      iso1A2,
      iso1A3,
      iso1N3,
      nameEn,
    };

    activeGame = {
      userId: msg.author.id,
      startedBy: msg.author.globalName,
      possibleAnswers,
      location,
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

    await dmChannel.send(gameInfoMessage(activeGame));

    let gameMaster = await getGameMaster(msg.author.id);
    if (!gameMaster) {
      gameMaster = await createGameMaster(msg);
    }

    activeGame.gameMasterId = gameMaster._id;

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
    }, 70000);
  } catch (e) {
    await dmChannel.send(`⚠️HATA: ${e.message}`);
    activeGame = null;
  }
};

const postImg = async (msg) => {
  try {
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
    await channel.send(
      `**${msg.author.globalName}** bir tahmin oyunu başlattı!`
    );
    await channel.send(
      'Tahminlerinizi `!t <tahmin>` ile yapabilirsiniz. Örneğin: `!t TR`, `!t USA`, `!t norveç`, `!t güney afrika`, `!t new zealand` gibi.'
    );
  } catch (e) {
    console.log(e);
  }
};

const handleDm = async (msg) => {
  try {
    if (msg.author.bot) return;
    if (!!bannedUsers.find((user) => user.id === msg.author.id)) return;

    // const channel = client.channels.cache.get(msg.channelId);
    const channel = client.channels.cache.get(gameChannelId);

    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    const member = await guild.members.fetch(msg.author.id);
    const isVerified = member.roles.cache.some(
      (role) => role.name === 'testing'
    );
    const isAdmin = member.roles.cache.some((role) =>
      adminRoles.includes(role.name)
    );

    if (!isVerified) {
      bannedUsers.push({
        username: msg.author.username,
        id: msg.author.id,
      });
      await msg.channel.send('Yetkiniz olmadığı için bu botu kullanamazsınız.');
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
  } catch (e) {
    console.log(e);
  }
};

const handleGuess = async (msg) => {
  try {
    if (!msg.content.startsWith('!t') || msg.content === '!tahminler') return;
    if (!activeGame) return;
    if (activeGame.winner) return;
    if (!msg.member.roles.cache.some((role) => role.name === 'testing')) return;

    const lastGuesses = activeGame.guesses
      .map((guess) => guess.madeBy.discordId)
      .slice(-3);

    if (
      lastGuesses.length >= 3 &&
      lastGuesses.every((guess) => guess === msg.author.id)
    ) {
      await msg.delete();
      await msg.channel.send(
        `<@${msg.author.id}> Art arda çok fazla tahmin yaptınız. Diğer oyuncuların tahmin yapmasını bekleyin.`
      );
      return;
    }

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
            title: `Doğru cevap! Lokasyon: :flag_${
              activeGame.flag.length === 2 ? activeGame.flag.toLowerCase() : ''
            }:`,
            description: activeGame.googleMapsLink,
            footer: {
              text: `${activeGame.guesses.length} yanlış tahminden sonra bulundu.`,
            },
          },
        ],
      });

      let gameWinner = await getGameWinner(msg.author.id);
      if (!gameWinner) {
        gameWinner = await createGameWinner(msg);
      }

      const game = await createGame(activeGame, gameWinner._id);
      const gameMaster = await getGameMaster(activeGame.userId);

      gameMaster.games.push(game._id);
      gameMaster.$inc('gameCount', 1);
      gameMaster.discordGlobalname = activeGame.startedBy;

      gameWinner.gamesWon.push(game._id);
      gameWinner.$inc('winCount', 1);
      gameWinner.discordGlobalname = msg.author.globalName;

      // calculate points for winner
      let winnerPoints = 1000;
      if (game.guessCount === 0) {
        winnerPoints += 1000;
      }
      if (game.guessCount < 20) {
        winnerPoints += 3000 - game.guessCount * 150;
      }
      gameWinner.$inc('points', winnerPoints);

      // calculate poinst for game master
      let gameMasterPoints = 250 * (game.guessCount + 1);

      if (gameMasterPoints > 5000) {
        gameMasterPoints = 5000;
      }
      gameMaster.$inc('points', gameMasterPoints);

      await gameMaster.save();
      await gameWinner.save();

      await msg.channel.send(
        `<@${msg.author.id}> ${winnerPoints} puan kazandı.`
      );
      await msg.channel.send(
        `<@${activeGame.userId}> ${gameMasterPoints} Game Master puanı kazandı.`
      );

      await updateGlobalStats(game.guessCount);

      activeGame = null;
      return;
    }

    if (activeGame.guesses.find((guess) => guess.guessId === validGuess.id)) {
      await msg.react('🔁');
      return;
    }

    activeGame.guesses.push({
      guessId: validGuess.id,
      location: {
        iso1N3: validGuess.iso1N3 ? validGuess.iso1N3 : '',
        iso1A2: validGuess.iso1A2 ? validGuess.iso1A2 : '',
        iso1A3: validGuess.iso1A3 ? validGuess.iso1A3 : '',
        nameEn: validGuess.nameEn,
      },
      madeBy: {
        discordId: msg.author.id,
        discordUsername: msg.author.username,
        discordGlobalname: msg.author.globalName,
      },
    });

    await msg.react('❌');
  } catch (e) {
    console.log(e);
  }
};

client.on('ready', (client) => {
  console.log(`${client.user.tag} is ready!`);
});

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
  try {
    if (!msg.channel.id === gameChannelId) return;
    if (!msg.content.startsWith('!map')) return;
    if (!activeGame) return;
    if (activeGame.winner) return;
    if (!msg.member.roles.cache.some((role) => role.name === 'testing')) return;
    if (!activeGame.guesses.some((guess) => guess.iso1N3 !== '')) return;

    const iso1N3Guesses = activeGame.guesses
      .map((guess) => guess.location.iso1N3)
      .filter((guess) => guess !== '');
    const attachment = new AttachmentBuilder(
      highlightCountries(iso1N3Guesses),
      {
        name: 'highlighted.png',
      }
    );

    await msg.channel.send({ files: [attachment] });
  } catch (e) {
    console.log(e);
  }
});

// !tahminler
client.on('messageCreate', async (msg) => {
  try {
    if (!msg.channel.id === gameChannelId) return;
    if (!msg.content.startsWith('!tahminler')) return;
    if (!activeGame) return;
    if (activeGame.winner) return;
    if (!msg.member.roles.cache.some((role) => role.name === 'testing')) return;
    if (activeGame.guesses.length <= 0) return;

    const guesses = activeGame.guesses.map((guess) => {
      const { iso1A2, iso1A3, nameEn } = guess.location;
      const flag = iso1A2 ? `:flag_${iso1A2.toLowerCase()}:` : '';
      return `${flag} ${iso1A2}\n`;
    });

    const guessesWithHeading = ['**TAHMİNLER**\n', ...guesses];

    if (guessesWithHeading.join('').length >= 1995) {
      await msg.channel.send(
        'Tahminler discord karakter sınırını aştığı için gösterilemiyor.'
      );
      return;
    }

    await msg.channel.send(guessesWithHeading.join(''));
  } catch (e) {
    console.log(e);
  }
});

// !ss
client.on('messageCreate', async (msg) => {
  try {
    if (!msg.channel.id === gameChannelId) return;
    if (!msg.content.startsWith('!ss')) return;
    if (!activeGame) return;
    if (activeGame.winner) return;
    if (!msg.member.roles.cache.some((role) => role.name === 'testing')) return;
    if (!activeGame.attachmentLink) return;

    await msg.channel.send(activeGame.attachmentLink);
  } catch (e) {
    console.log(e);
  }
});

// !stats
client.on('messageCreate', async (msg) => {
  try {
    if (!msg.channel.id === gameChannelId) return;
    if (!msg.content.startsWith('!stats')) return;
    if (!msg.member.roles.cache.some((role) => role.name === 'testing')) return;

    const statsEmbed = await getStats(msg);

    await msg.reply({ embeds: [statsEmbed] });
  } catch (e) {
    console.log(e);
  }
});

// !lidertablosu
client.on('messageCreate', async (msg) => {
  try {
    if (!msg.channel.id === gameChannelId) return;
    if (!msg.content.startsWith('!lidertablosu')) return;
    if (!msg.member.roles.cache.some((role) => role.name === 'testing')) return;

    const leaderboard = await getPlayerLeaderboard();

    if (leaderboard.length === 0) {
      await msg.channel.send('Henüz lider tablosunda kimse yok.');
      return;
    }

    const leaderboardArray = ['**TOP 25**\n'];

    leaderboard.forEach((player, i) => {
      const { discordGlobalname, points } = player;

      let medal = '';

      if (i === 0) {
        medal = '🥇';
      } else if (i === 1) {
        medal = '🥈';
      } else if (i === 2) {
        medal = '🥉';
      }

      const markdown = `${i + 1}. ${discordGlobalname} • ${Intl.NumberFormat(
        'de-DE'
      ).format(points)}p ${medal}\n`;

      leaderboardArray.push(markdown);
    });

    await msg.channel.send(leaderboardArray.join(''));
  } catch (e) {
    console.log(e);
  }
});

// !gmtablosu
client.on('messageCreate', async (msg) => {
  try {
    if (!msg.channel.id === gameChannelId) return;
    if (!msg.content.startsWith('!gmtablosu')) return;
    if (!msg.member.roles.cache.some((role) => role.name === 'testing')) return;

    const leaderboard = await getGameMasterLeaderboard();

    if (leaderboard.length === 0) {
      await msg.channel.send('Henüz lider tablosunda kimse yok.');
      return;
    }

    const leaderboardArray = ['**GAME MASTER TOP 25**\n'];

    leaderboard.forEach((player, i) => {
      const { discordGlobalname, points } = player;

      let medal = '';

      if (i === 0) {
        medal = '🥇';
      } else if (i === 1) {
        medal = '🥈';
      } else if (i === 2) {
        medal = '🥉';
      }

      const markdown = `${i + 1}. ${discordGlobalname} • ${Intl.NumberFormat(
        'de-DE'
      ).format(points)}p ${medal}\n`;

      leaderboardArray.push(markdown);
    });

    await msg.channel.send(leaderboardArray.join(''));
  } catch (e) {
    console.log(e);
  }
});

// !mostgames - !kazananlar
client.on('messageCreate', async (msg) => {
  try {
    if (!msg.channel.id === gameChannelId) return;
    if (!msg.content.startsWith('!mostgames')) return;
    if (!msg.member.roles.cache.some((role) => role.name === 'testing')) return;

    const leaderboard = await getMostGames();

    if (leaderboard.length === 0) {
      await msg.channel.send('Henüz lider tablosunda kimse yok.');
      return;
    }

    const leaderboardArray = ['**EN ÇOK OYUN BAŞLATANLAR**\n'];

    leaderboard.forEach((player, i) => {
      const { discordGlobalname, gameCount } = player;

      let medal = '';

      if (i === 0) {
        medal = '🥇';
      } else if (i === 1) {
        medal = '🥈';
      } else if (i === 2) {
        medal = '🥉';
      }

      const markdown = `**${
        i + 1
      }.** ${discordGlobalname} • ${Intl.NumberFormat('de-DE').format(
        gameCount
      )} ${medal}\n`;

      leaderboardArray.push(markdown);
    });

    await msg.channel.send(leaderboardArray.join(''));
  } catch (e) {
    console.log(e);
  }
});

// !mostwins
client.on('messageCreate', async (msg) => {
  try {
    if (!msg.channel.id === gameChannelId) return;
    if (!msg.content.startsWith('!mostwins')) return;
    if (!msg.member.roles.cache.some((role) => role.name === 'testing')) return;

    const leaderboard = await getMostWins();

    if (leaderboard.length === 0) {
      await msg.channel.send('Henüz lider tablosunda kimse yok.');
      return;
    }

    const leaderboardArray = ['**EN ÇOK OYUN KAZANANLAR**\n'];

    leaderboard.forEach((player, i) => {
      const { discordGlobalname, winCount } = player;

      let medal = '';

      if (i === 0) {
        medal = '🥇';
      } else if (i === 1) {
        medal = '🥈';
      } else if (i === 2) {
        medal = '🥉';
      }

      const markdown = `**${
        i + 1
      }.** ${discordGlobalname} • ${Intl.NumberFormat('de-DE').format(
        winCount
      )} ${medal}\n`;

      leaderboardArray.push(markdown);
    });

    await msg.channel.send(leaderboardArray.join(''));
  } catch (e) {
    console.log(e);
  }
});

// !globalstats
client.on('messageCreate', async (msg) => {
  try {
    if (!msg.channel.id === gameChannelId) return;
    if (!msg.content.startsWith('!globalstats')) return;
    if (!msg.member.roles.cache.some((role) => role.name === 'testing')) return;

    const globalStats = await getGlobalStats();

    if (!globalStats) {
      await msg.channel.send('Henüz hiç oyun oynanmadı.');
      return;
    }

    const markdownPost = [
      '### GENEL İSTATİSTİKLER\n',
      `Toplam oynanan oyun sayısı: **${globalStats.gameCount}**\n`,
      `Toplam yapılan tahmin sayısı sayısı: **${globalStats.guessCount}**\n`,
    ];

    await msg.channel.send(markdownPost.join(''));
  } catch (e) {
    console.log(e);
  }
});
