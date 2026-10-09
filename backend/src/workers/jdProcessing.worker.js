import { Worker } from 'bullmq';
import redis from '../config/redis.js';
import Job from '../models/Job.js';
import { extractSkillsWithWeights, rankCandidatesForJob } from '../utils/jobAnalyzer.js';

const worker = new Worker('jd-processing', async (job) => {
  const { jobId, jobDescription, companyId } = job.data;

  const skills = await extractSkillsWithWeights(jobDescription || '');
  const ranked = skills.length ? await rankCandidatesForJob(skills) : [];
  const top10 = ranked.slice(0, 10);

  await Job.findByIdAndUpdate(jobId, { $set: { topCandidates: top10 } });
  await redis.set(`ranking:${jobId}`, JSON.stringify(top10), 'EX', 600);

  const io = globalThis.__smartInterviewIO;
  if (io && companyId) {
    io.to(`company:${companyId}`).emit('ranking:ready', { jobId });
  }

  console.log(`JD processing complete for job ${jobId}`);
  return top10;
}, { connection: redis });

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.log(`Job ${job.id} failed:`, err.message);
});

export default worker;
