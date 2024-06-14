import { Schema, model } from 'mongoose';

const GameMasterSchema = new Schema(
  {
    discordId: { type: String, required: true },
    discordUsername: { type: String, required: true },
    discordGlobalname: { type: String },
    games: [{ type: Schema.Types.ObjectId, ref: 'Game' }],
    gameCount: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

const GameMaster = model('Gamemaster', GameMasterSchema);

export default GameMaster;
