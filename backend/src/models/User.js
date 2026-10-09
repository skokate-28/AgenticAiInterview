import mongoose from 'mongoose';

const weakAreaSchema = new mongoose.Schema({
  skill: { type: String, required: true },
  comment: { type: String, required: true },
  difficulty: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['candidate', 'employer', 'admin'], default: 'candidate' },
  candidateSkills: [{
    skill: { type: String, required: true },
    score: { type: Number, required: true }
  }],
  weakAreas: [weakAreaSchema], // Persists across interviews
  preferences: {
    preferredRoles: [{ type: String }],
    preferredType: { type: String, enum: ['internship','full-time'], default: 'internship' },
    preferredPay: { type: Number, default: 0 } // thousands for internship, LPA for full-time
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', userSchema);