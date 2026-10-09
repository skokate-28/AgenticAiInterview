import mongoose from 'mongoose';

const historyEntrySchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  score: { type: Number, required: true },
  ct: { type: Number, required: true },
  wt: { type: Number, required: true },
  difficulty: { type: String, required: true },
  skill: { type: String, required: true },
  weakAreaTargeted: { type: Boolean, default: false },
  weakAreaTargetComment: { type: String, default: "" },
  weakAreaDetected: { type: Boolean, default: false },
  weakAreaComment: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  threadId: { type: String, required: true, index: true },
  timestamp: { type: Date, default: Date.now },
  finished: { type: Boolean, default: false },
  skillScores: [{
    skill: String,
    finalScore: Number, // The final Ct when Wt dropped < 0.35
    totalQuestions: Number
  }],
  history: [historyEntrySchema]
});

export default mongoose.model('Session', sessionSchema);