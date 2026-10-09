import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Session from '../models/Session.js';

dotenv.config();

const password = 'Candidate@123';

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

const candidates = [
  {
    username: 'Rahul',
    email: 'rahul.candidate@demo.local',
    skillScores: {
      Python: 0.94,
      DBMS: 0.88,
      React: 0.74,
      Java: 0.69,
      'Node.js': 0.81
    },
    preferences: { preferredRoles: ['Backend Engineer'], preferredType: 'full-time', preferredPay: 14 }
  },
  {
    username: 'Vignesh',
    email: 'vignesh.candidate@demo.local',
    skillScores: {
      Python: 0.79,
      DBMS: 0.96,
      React: 0.71,
      Java: 0.86,
      'Node.js': 0.77
    },
    preferences: { preferredRoles: ['Database Engineer'], preferredType: 'full-time', preferredPay: 16 }
  },
  {
    username: 'Prasad',
    email: 'prasad.candidate@demo.local',
    skillScores: {
      Python: 0.83,
      DBMS: 0.75,
      React: 0.92,
      Java: 0.68,
      'Node.js': 0.95
    },
    preferences: { preferredRoles: ['Full Stack Engineer'], preferredType: 'full-time', preferredPay: 18 }
  },
  {
    username: 'Mayank',
    email: 'mayank.candidate@demo.local',
    skillScores: {
      Python: 0.68,
      DBMS: 0.72,
      React: 0.89,
      Java: 0.84,
      'Node.js': 0.78
    },
    preferences: { preferredRoles: ['Frontend Engineer'], preferredType: 'internship', preferredPay: 8 }
  },
  {
    username: 'Jay',
    email: 'jay.candidate@demo.local',
    skillScores: {
      Python: 0.81,
      DBMS: 0.87,
      React: 0.76,
      Java: 0.93,
      'Node.js': 0.7
    },
    preferences: { preferredRoles: ['Java Engineer'], preferredType: 'full-time', preferredPay: 15 }
  }
];

export async function seedCandidates({ connectIfNeeded = true } = {}) {
  if (connectIfNeeded && mongoose.connection.readyState === 0) {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is required to seed candidates.');
    }

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      retryWrites: true
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  for (const candidate of candidates) {
    const existing = await User.findOne({
      $or: [{ username: candidate.username }, { email: candidate.email }]
    });

    if (existing) {
      await Session.deleteMany({ userId: existing._id });
      await User.deleteOne({ _id: existing._id });
    }

    const candidateSkills = Object.entries(candidate.skillScores).map(([skill, score]) => ({ skill, score: clamp01(score) }));
    const user = await User.create({
      username: candidate.username,
      email: candidate.email,
      password: hashedPassword,
      role: 'candidate',
      candidateSkills,
      preferences: candidate.preferences
    });

    await Session.create({
      userId: user._id,
      threadId: `seed-${candidate.username.toLowerCase()}`,
      timestamp: new Date(),
      finished: true,
      skillScores: candidateSkills.map(({ skill, score }) => ({
        skill,
        finalScore: clamp01(score),
        totalQuestions: 6
      })),
      history: []
    });
  }

  console.log('Seeded candidates: Rahul, Vignesh, Prasad, Mayank, Jay');
  console.log(`Password used for all seeded candidates: ${password}`);
}

async function main() {
  try {
    await seedCandidates({ connectIfNeeded: true });
    await mongoose.disconnect();
  } catch (error) {
    console.error('Candidate seed failed:', error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}