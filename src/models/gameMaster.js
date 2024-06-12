import { Schema, model } from 'mongoose';

const GameMasterSchema = new Schema(
  {
    discordId: { type: String, required: true },
    discordUsername: { type: String, required: true },
    discordGlobalname: { type: String },
    games: [{ type: Schema.Types.ObjectId, ref: 'Game' }],
    points: { type: Number },
  },
  {
    timestamps: true,
  }
);

const GameMaster = model('Gamemaster', GameMasterSchema);

export default GameMaster;
