import { Schema, model } from 'mongoose';

const GlobalStatsSchema = new Schema(
  {
    gameCount: { type: Number, default: 0 },
    guessCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

const GlobalStats = model('Globalstats', GlobalStatsSchema);

export default GlobalStats;
