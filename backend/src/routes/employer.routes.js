import express from 'express';
import Company from '../models/Company.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import { extractSkillsWithWeights, rankCandidatesForJob } from '../utils/jobAnalyzer.js';
import jdQueue from '../queues/jdProcessing.queue.js';
import redis from '../config/redis.js';

function clamp01(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(1, numeric));
}

function buildFallbackSkillsFromKnownCandidates(description, users) {
  const text = `${description || ''}`.toLowerCase();
  const knownSkills = [...new Set((users || []).flatMap((user) => (user.candidateSkills || []).map((entry) => entry.skill)).filter(Boolean))];
  const matched = knownSkills.filter((skill) => {
    const normalized = skill.toLowerCase().replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${normalized}\\b`, 'i').test(text);
  });

  if (!matched.length) return [];

  const weight = clamp01(1 / matched.length);
  return matched.map((skill) => ({ skill, weight }));
}

async function verifyCompanyAccess(req, res, next){
  try{
    const { companyId } = req.params;
    const provided = req.headers['x-company-uid'] || req.query.uid;
    if (!provided) return res.status(401).json({ error: 'Missing company UID' });
    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    if (String(company.uid) !== String(provided)) return res.status(403).json({ error: 'Invalid company UID' });
    req.company = company;
    next();
  }catch(err){
    console.error('verifyCompanyAccess error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

const router = express.Router();

/**
 * @swagger
 * /api/employer/register:
 *   post:
 *     summary: Register a company
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               uid: { type: string }
 *     responses:
 *       200:
 *         description: Company registered
 */
router.post('/register', async (req, res) => {
  try {
    const { name, uid } = req.body;
    if (!name || !uid) return res.status(400).json({ error: 'Name and UID are required' });

    const exists = await Company.findOne({ uid });
    if (exists) return res.status(409).json({ error: 'UID already registered' });

    const company = await Company.create({ name, uid });
    res.json({ companyId: company._id, name: company.name, uid: company.uid });
  } catch (err) {
    console.error('Company register error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/employer/{companyId}/jobs:
 *   post:
 *     summary: Create a job posting
 *     parameters:
 *       - in: header
 *         name: x-company-uid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job created and queued for ranking
 */
router.post('/:companyId/jobs', verifyCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { title, description, type, pay } = req.body;
    if (!title || !description || !type || !pay) return res.status(400).json({ error: 'Missing job fields' });

    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const job = await Job.create({ companyId, title, description, type, pay, topCandidates: [] });
    await jdQueue.add('process-jd', { jobId: job._id, jobDescription: job.description, companyId: job.companyId });

    res.json({ success: true, message: 'Job posted. Candidate matching is processing in the background.', job });
  } catch (err) {
    console.error('Create job error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:companyId/jobs', verifyCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;
    const jobs = await Job.find({ companyId }).sort({ createdAt: -1 }).lean();
    res.json({ jobs });
  } catch (err) {
    console.error('List jobs error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:companyId/jobs/:jobId/candidates', verifyCompanyAccess, async (req, res) => {
  try {
    if (process.env.COMPANY_API_DISABLED === 'true') {
      return res.status(403).json({ error: 'Company API is disabled.' });
    }

    const { companyId, jobId } = req.params;
    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const cached = await redis.get(`ranking:${jobId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return res.json({ jobId, skills: [], candidates: parsed });
      }
    }

    const job = await Job.findOne({ _id: jobId, companyId }).lean();
    if (!job) return res.status(404).json({ error: 'Job not found for this company' });

    const users = await User.find({}).lean();
    let skills = await extractSkillsWithWeights(job.description || '');
    if (!skills || skills.length === 0) {
      skills = buildFallbackSkillsFromKnownCandidates(`${job.title || ''}\n${job.description || ''}`, users);
    }
    if (!skills || skills.length === 0) return res.json({ jobId, skills: [], candidates: [] });

    let candidates = await rankCandidatesForJob(skills);
    candidates = candidates.slice(0, 10);
    if (candidates.length > 0) {
      await redis.set(`ranking:${jobId}`, JSON.stringify(candidates), 'EX', 600);
    }

    res.json({ jobId, skills, candidates });
  } catch (err) {
    console.error('Job candidates error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
