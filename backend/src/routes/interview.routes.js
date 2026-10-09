import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { parseResume } from '../utils/resumeParser.js';
import { interviewGraph } from '../agents/graph.js';
import User from '../models/User.js';
import Session from '../models/Session.js';
import redis from '../config/redis.js';

const ACTIVE_SESSION_TTL_SECONDS = 60 * 60 * 2;

const router = express.Router();
const upload = multer();

/**
 * Endpoint to start a new interview session.
 */
router.post('/start', upload.single('resume'), async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID is required.' });
    if (!req.file) return res.status(400).json({ error: "Resume file is required." });

    const activeSessionKey = `session:active:${userId}`;
    const hasActiveSession = await redis.exists(activeSessionKey);
    if (hasActiveSession) {
      return res.status(409).json({ error: 'You already have an active interview session. Please complete or wait for it to expire.' });
    }

    await redis.set(activeSessionKey, '1', 'EX', ACTIVE_SESSION_TTL_SECONDS);

    const skills = await parseResume(req.file.buffer);
    const thread_id = uuidv4();

    const initialState = { 
      userId, 
      skillsList: skills, 
      currentSkillIndex: -1, 
      messages: [], 
      sessionResults: [], 
      weakAreas: [],
      activeWeakArea: null,
      lastQuestionWasWeakArea: false,
      lastQuestionWeakAreaComment: "",
      resolvedWeakArea: null,
      askedQuestions: [],
      ct: 0.5, 
      wt: 1.0,
      nt: 0,
      avgScore: 0,
      lastComment: ""
    };

    const result = await interviewGraph.invoke(initialState, { configurable: { thread_id } });

    await Session.create({
      userId,
      threadId: thread_id,
      timestamp: new Date(),
      skillScores: [],
      history: [],
      finished: false
    });

    res.json({
      threadId: thread_id,
      skills: skills,
      currentSkill: result.currentSkill,
      question: result.messages[result.messages.length - 1].content,
      questionMeta: {
        weakAreaTargeted: Boolean(result.activeWeakArea),
        weakAreaTargetComment: result.activeWeakArea?.comment || ""
      }
    });
  } catch (err) {
    console.error("Start Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Endpoint to process a candidate's answer.
 * Updated to ensure lastComment is explicitly captured for the UI.
 */
router.post('/answer', async (req, res) => {
  try {
    const { threadId, answer, userId, question } = req.body;

    const result = await interviewGraph.invoke(
      { messages: [{ role: "user", content: answer }] },
      { configurable: { thread_id: threadId } }
    );

    const isFinished = result.wt < 0.35 && result.currentSkillIndex >= result.skillsList.length - 1;

    let session = await Session.findOne({ threadId });
    if (!session) {
      session = await Session.create({
        userId,
        threadId,
        timestamp: new Date(),
        skillScores: [],
        history: [],
        finished: false
      });
    }

    const hasValidMetrics = Number.isFinite(result.lastQuestionScore)
      && Number.isFinite(result.ct)
      && Number.isFinite(result.wt)
      && Boolean(result.currentDifficulty)
      && Boolean(result.currentSkill);

    if (question && answer && hasValidMetrics) {
      session.history.push({
        question,
        answer,
        score: result.lastQuestionScore,
        ct: result.ct,
        wt: result.wt,
        difficulty: result.currentDifficulty,
        skill: result.currentSkill,
        weakAreaTargeted: Boolean(result.lastQuestionWasWeakArea),
        weakAreaTargetComment: result.lastQuestionWeakAreaComment || "",
        weakAreaDetected: result.lastQuestionScore < 0.75 && Boolean(result.lastComment),
        weakAreaComment: result.lastComment || ""
      });
    }

    // Save session results if the interview is over
    if (isFinished) {
      const finalSessionResults = [
        ...result.sessionResults,
        { skill: result.currentSkill, finalScore: result.ct, totalQuestions: result.nt }
      ];

      session.skillScores = finalSessionResults;
      session.finished = true;

      if (userId) {
        await redis.del(`session:active:${userId}`);
      }
    }

    await session.save();
    
    const needsUserUpdate = (result.weakAreas && result.weakAreas.length > 0) || result.resolvedWeakArea;
    if (needsUserUpdate) {
      const user = await User.findById(userId);
      let shouldSave = false;

      const isValidWeakArea = (wa) => Boolean(wa && wa.skill && wa.difficulty && wa.comment);
      if (user) {
        const beforeCount = user.weakAreas.length;
        user.weakAreas = user.weakAreas.filter(isValidWeakArea);
        if (user.weakAreas.length !== beforeCount) {
          shouldSave = true;
        }
      }

      if (user && result.resolvedWeakArea) {
        user.weakAreas = user.weakAreas.filter(wa => !(
          wa.skill === result.resolvedWeakArea.skill &&
          wa.difficulty === result.resolvedWeakArea.difficulty
        ));
        shouldSave = true;
      }

      if (user && result.weakAreas && result.weakAreas.length > 0) {
        result.weakAreas.filter(isValidWeakArea).forEach(newWa => {
          user.weakAreas = user.weakAreas.filter(wa => !(
            wa.skill === newWa.skill && wa.difficulty === newWa.difficulty
          ));
          user.weakAreas.push(newWa);
          shouldSave = true;
        });
      }

      if (user && shouldSave) {
        await user.save();
      }
    }

    // FINAL DATA PACKET SENT TO FRONTEND
    res.json({
      success: true,
      isFinished,
      currentSkill: result.currentSkill,
      question: isFinished ? null : result.messages[result.messages.length - 1].content,
      questionMeta: isFinished ? null : {
        weakAreaTargeted: Boolean(result.activeWeakArea),
        weakAreaTargetComment: result.activeWeakArea?.comment || ""
      },
      metrics: { 
        score: result.lastQuestionScore,
        ct: result.ct, 
        wt: result.wt,
        difficulty: result.currentDifficulty,
        type: result.currentType,
        // This is the specific "Weak Area" comment that the UI needs to display
        comment: result.lastComment || "",
        weakAreaDetected: result.lastQuestionScore < 0.75 && Boolean(result.lastComment),
        weakAreaTargeted: Boolean(result.lastQuestionWasWeakArea),
        weakAreaTargetComment: result.lastQuestionWeakAreaComment || ""
      }
    });
  } catch (err) {
    console.error("Answer Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Endpoint for dashboard statistics.
 */
router.get('/dashboard/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const sessions = await Session.find({ userId }).sort({ timestamp: 1 });
    const user = await User.findById(userId);
    const weakAreas = (user?.weakAreas || []).reduce((acc, area) => {
      const key = `${area.skill}::${area.difficulty}`;
      const existing = acc.get(key);
      if (!existing || new Date(area.createdAt) > new Date(existing.createdAt)) {
        acc.set(key, area);
      }
      return acc;
    }, new Map());

    res.json({ sessions, weakAreas: Array.from(weakAreas.values()) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;