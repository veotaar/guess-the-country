import Game from '../models/game.js';
import GameMaster from '../models/gameMaster.js';
import GameWinner from '../models/gameWinner.js';

export const createGameMaster = async (discordMessage) => {
  try {
    await GameMaster.create({
      discordId: discordMessage.author.id,
      discordUsername: discordMessage.author.username,
      discordGlobalname: discordMessage.author.globalName,
      games: [],
    });
  } catch (e) {
    console.log(e);
  }
};

export const getGameMaster = async (discordId) => {
  try {
    const gameMaster = await GameMaster.find({ discordId }).exec();
    return gameMaster;
  } catch (e) {
    console.log(e);
  }
};

export const createGameWinner = async (discordMessage) => {
  try {
    await GameWinner.create({
      discordId: discordMessage.author.id,
      discordUsername: discordMessage.author.username,
      discordGlobalname: discordMessage.author.globalName,
      gamesWon: [],
    });
  } catch (e) {
    console.log(e);
  }
};

export const getGameWinner = async (discordId) => {
  try {
    const gameWinner = await GameWinner.find({ discordId }).exec();
    return gameWinner;
  } catch (e) {
    console.log(e);
  }
};

export const createGame = async (activeGame, gameWinnerId) => {
  try {
    await Game.create({
      gameMaster: activeGame.gameMasterId,
      location: activeGame.location,
      googleMapsLink: activeGame.googleMapsLink,
      imageUrl: activeGame.attachmentLink,
      winner: gameWinnerId,
      guesses: activeGame.guesses,
      guessCount: activeGame.guesses.length,
    });
  } catch (e) {
    console.log(e);
  }
};
