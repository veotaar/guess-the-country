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
    console.log(game, game._id, 1);
    return game;
  } catch (e) {
    console.log(e);
  }
};
