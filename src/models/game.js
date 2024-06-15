import { Schema, model } from 'mongoose';

const GameSchema = new Schema(
  {
    gameMaster: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Gamemaster',
    },
    location: {
      iso1A2: { type: String },
      iso1A3: { type: String },
      iso1N3: { type: String },
      nameEn: { type: String },
    },
    googleMapsLink: { type: String, required: true },
    imageUrl: { type: String },
    winner: { type: Schema.Types.ObjectId, ref: 'Gamewinner' },
    guesses: {
      type: [
        {
          guessId: { type: String },
          location: {
            iso1N3: { type: String },
            iso1A2: { type: String },
            iso1A3: { type: String },
            nameEn: { type: String },
          },
          madeBy: {
            discordId: { type: String },
            discordUsername: { type: String },
            discordGlobalname: { type: String },
          },
        },
      ],
      default: [],
    },
    guessCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

const Game = model('Game', GameSchema);

export default Game;
