import { Schema, model } from 'mongoose';

const GameWinnerSchema = new Schema(
  {
    discordId: { type: String, required: true },
    discordUsername: { type: String, required: true },
    discordGlobalname: { type: String },
    gamesWon: [{ type: Schema.Types.ObjectId, ref: 'Game' }],
    winCount: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

const GameWinner = model('Gamewinner', GameWinnerSchema);

export default GameWinner;
