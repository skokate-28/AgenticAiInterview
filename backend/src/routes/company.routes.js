import express from 'express';
import User from '../models/User.js';
import Session from '../models/Session.js';

const router = express.Router();

/**
 * Internal endpoint to list all candidates and their per-skill scores.
 * This endpoint is intended for internal/administrative use only and is NOT
 * queried by the public frontend. To disable it, set `COMPANY_API_DISABLED=true`.
 */
router.get('/candidates', async (req, res) => {
  try {
    if (process.env.COMPANY_API_DISABLED === 'true') {
      return res.status(403).json({ error: 'Company API is disabled.' });
    }

    const users = await User.find({}).lean();
    const result = [];

    for (const user of users) {
      const sessions = await Session.find({ userId: user._id }).sort({ timestamp: 1 }).lean();

      const skillsMap = new Map();
      sessions.forEach(session => {
        (session.skillScores || []).forEach(s => {
          const arr = skillsMap.get(s.skill) || [];
          arr.push({ sessionId: session._id, timestamp: session.timestamp, score: s.finalScore, totalQuestions: s.totalQuestions });
          skillsMap.set(s.skill, arr);
        });
      });

      const skills = Array.from(skillsMap.entries()).map(([skill, scores]) => ({
        skill,
        scores,
        latest: scores.length > 0 ? scores[scores.length - 1].score : null
      }));

      result.push({
        userId: user._id,
        username: user.username,
        email: user.email,
        sessionsCount: sessions.length,
        skills
      });
    }

    res.json({ candidates: result });
  } catch (err) {
    console.error('Company candidates error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
