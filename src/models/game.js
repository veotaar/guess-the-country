import { Schema, model } from "mongoose";

const GameSchema = new Schema({
  discordId: { type: String, required: true },
  startedBy: { type: String, required: true },
  countryCode: { type: String, required: true },
  googleMapsLink: { type: String, required: true },
  winner: { type: String },
  guesses: { type: [{
    countryCode: { type: String },
    madeBy: { type: String },
    guessOrder: { type: Number },
    isCorrect: { type: Boolean }
  }], default: [] },
  guessCount: { type: Number, default: 0 },
}, {
  timestamps: true
});

const Game = model('Game', GameSchema);

export default Game;