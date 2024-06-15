import Game from '../models/game.js';
import GameMaster from '../models/gameMaster.js';
import GameWinner from '../models/gameWinner.js';

export const createGameMaster = async (discordMessage) => {
  try {
    const gameMaster = await GameMaster.create({
      discordId: discordMessage.author.id,
      discordUsername: discordMessage.author.username,
      discordGlobalname: discordMessage.author.globalName,
    });
    return gameMaster;
  } catch (e) {
    console.log(e);
  }
};

export const getGameMaster = async (discordId) => {
  try {
    const gameMaster = await GameMaster.findOne({ discordId }).exec();
    return gameMaster;
  } catch (e) {
    console.log(e);
  }
};

export const createGameWinner = async (discordMessage) => {
  try {
    const gameWinner = await GameWinner.create({
      discordId: discordMessage.author.id,
      discordUsername: discordMessage.author.username,
      discordGlobalname: discordMessage.author.globalName,
      gamesWon: [],
    });
    return gameWinner;
  } catch (e) {
    console.log(e);
  }
};

export const getGameWinner = async (discordId) => {
  try {
    const gameWinner = await GameWinner.findOne({ discordId }).exec();
    return gameWinner;
  } catch (e) {
    console.log(e);
  }
};

export const createGame = async (activeGame, gameWinnerId) => {
  try {
    const game = await Game.create({
      gameMaster: activeGame.gameMasterId,
      location: activeGame.location,
      googleMapsLink: activeGame.googleMapsLink,
      imageUrl: activeGame.attachmentLink,
      winner: gameWinnerId,
      guesses: activeGame.guesses,
      guessCount: activeGame.guesses.length,
    });
    return game;
  } catch (e) {
    console.log(e);
  }
};

export const getStats = async (discordMessage) => {
  try {
    let winCount, gameCount, winPoints, gameMasterPoints;
    const gameMaster = await getGameMaster(discordMessage.author.id);
    const gameWinner = await getGameWinner(discordMessage.author.id);

    if (!gameMaster) {
      gameCount = 0;
      gameMasterPoints = 0;
    } else {
      gameCount = gameMaster.gameCount;
      gameMasterPoints = gameMaster.points;
    }

    if (!gameWinner) {
      winCount = 0;
      winPoints = 0;
    } else {
      winCount = gameWinner.winCount;
      winPoints = gameWinner.points;
    }

    const resultsEmbed = {
      color: 0x2563eb,
      title: discordMessage.author.globalName,
      thumbnail: {
        url: `https://cdn.discordapp.com/avatars/${discordMessage.author.id}/${discordMessage.author.avatar}.png`,
      },
      fields: [
        {
          name: 'Kazanılan Oyunlar',
          value: winCount,
          inline: true,
        },
        {
          name: 'Toplam Puan',
          value: winPoints,
          inline: true,
        },
        {
          name: '',
          value: '',
          inline: false,
        },
        {
          name: 'Başlatılan Oyunlar',
          value: gameCount,
          inline: true,
        },
        {
          name: 'Game Master Puanları',
          value: gameMasterPoints,
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
    };
    return resultsEmbed;
  } catch (e) {
    console.log(e);
  }
};

export const getGameMasterLeaderboard = async () => {
  try {
    const gameMasters = await GameMaster.find({}).limit(25).sort('-points');
    return gameMasters;
  } catch (e) {
    console.log(e);
  }
};

export const getPlayerLeaderboard = async () => {
  try {
    const players = await GameWinner.find({}).limit(25).sort('-points');
    return players;
  } catch (e) {
    console.log(e);
  }
};
