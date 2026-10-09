import Session from '../models/Session.js';
import User from '../models/User.js';
import { model } from '../config/groq.js';

function cleanText(t){
  return (t||'').toLowerCase().replace(/[\n\r]/g,' ').replace(/[^a-z0-9\s\-#\+\.]/g,' ');
}

function clamp(v,min=0,max=1){return Math.max(min,Math.min(max,v));}

function clamp01(value){
  return clamp(Number(value) || 0, 0, 1);
}

// simple Levenshtein distance
function levenshtein(a,b){
  if(a===b) return 0;
  const al=a.length, bl=b.length;
  if(al===0) return bl; if(bl===0) return al;
  const v0=new Array(bl+1), v1=new Array(bl+1);
  for(let j=0;j<=bl;j++) v0[j]=j;
  for(let i=0;i<al;i++){
    v1[0]=i+1;
    for(let j=0;j<bl;j++){
      const cost = a[i]===b[j] ? 0 : 1;
      v1[j+1]=Math.min(v1[j]+1, v0[j+1]+1, v0[j]+cost);
    }
    for(let j=0;j<=bl;j++) v0[j]=v1[j];
  }
  return v1[bl];
}

function similarity(a,b){
  a = (a||'').toLowerCase(); b = (b||'').toLowerCase();
  const maxLen = Math.max(a.length,b.length);
  if(maxLen===0) return 1;
  const dist = levenshtein(a,b);
  return 1 - (dist / maxLen);
}

// small curated synonyms map; can be extended later or replaced by an LLM
const SYNONYMS = {
  javascript: ['js','node','node.js','es6'],
  react: ['reactjs','react.js','frontend','react native'],
  python: ['py','python3'],
  sql: ['mysql','postgres','postgresql','db','database'],
  docker: ['container','containers'],
  aws: ['amazon web services','s3','lambda','ec2'],
};

// Simple heuristic to extract skills from job description by matching
// against known skills present in the sessions collection.
export async function extractSkillsWithWeights(description){
  const text = cleanText(description);

  // If GROQ API key is configured, try LLM-based extraction first.
  if (process.env.GROQ_API_KEY) {
    try {
      const prompt = `Extract the list of distinct skills and assign a weight (0-1) for each skill based on how important the skill is for the following job description. Return only valid JSON in this exact format:\n{ "skills": [ { "skill": "Skill Name", "weight": 0.45 }, ... ] }\n\nJob description:\n"""${description}\n"""\nMake sure weights sum approximately to 1.`;

      // prefer common call API on the model wrapper, fallback gracefully
      let raw;
      if (model && typeof model.call === 'function') raw = await model.call(prompt);
      else if (model && typeof model.generate === 'function') {
        const out = await model.generate([{ role: 'user', content: prompt }]);
        raw = out?.generations?.[0]?.[0]?.text || out?.text;
      } else if (model && typeof model.predict === 'function') raw = await model.predict(prompt);
      else raw = null;

      const txt = (raw && typeof raw === 'string') ? raw : (raw?.text || raw?.toString?.() || '');
      // extract JSON block
      const m = txt.match(/\{[\s\S]*\}/);
      if (m) {
        const parsed = JSON.parse(m[0]);
        if (parsed && Array.isArray(parsed.skills) && parsed.skills.length) {
          // normalize and clamp weights
          const sumRaw = parsed.skills.reduce((s,sx)=>s+(Number(sx.weight)||0),0) || 1;
          return parsed.skills.map(sx=>({ skill: (sx.skill||'').toString().trim(), weight: clamp01(Math.round(((Number(sx.weight)||0)/sumRaw)*1000)/1000) }));
        }
      }
    } catch (err) {
      console.warn('LLM extraction failed, falling back to heuristic:', err?.message || err);
      // fallthrough to heuristic
    }
  }

  // get distinct skills seen in sessions
  const raw = await Session.aggregate([
    { $unwind: '$skillScores' },
    { $group: { _id: '$skillScores.skill' } },
    { $project: { skill: '$_id', _id: 0 } }
  ]);

  const knownSkills = raw.map(r=>r.skill).filter(Boolean);
  const matches = [];

  if (!knownSkills.length) return [];

  // detect global presence of priority words
  const isRequired = /\b(required|must have|must|essential|mandatory)\b/.test(text);
  const isPreferred = /\b(preferred|nice to have|desirable)\b/.test(text);

  for (const skill of knownSkills){
    const s = skill.toLowerCase();
    let foundCount = 0;

    // direct exact match
    const regex = new RegExp('\\b' + s.replace(/[.+?^${}()|[\\]\\]/g,'\\$&') + '\\b','g');
    const m = text.match(regex);
    if (m && m.length) foundCount += m.length;

    // synonyms
    const syns = SYNONYMS[s] || [];
    for(const alt of syns){
      const rx = new RegExp('\\b' + alt.replace(/[.+?^${}()|[\\]\\]/g,'\\$&') + '\\b','g');
      const mm = text.match(rx);
      if(mm && mm.length) foundCount += mm.length * 0.9; // slightly less weight for synonyms
    }

    // fuzzy match against words in the description (catch typos)
    if(foundCount===0){
      const tokens = text.split(/\s+/).filter(Boolean);
      for(const t of tokens){
        const sim = similarity(t, s);
        if(sim > 0.85) foundCount += sim; // partial credit
      }
    }

    if(foundCount > 0){
      let weightRaw = 0.15 + Math.min(0.7, 0.12 * foundCount);
      if (isRequired) weightRaw += 0.2;
      if (isPreferred) weightRaw -= 0.12;
      weightRaw = clamp(weightRaw, 0, 1);
      matches.push({ skill, weightRaw, count: foundCount });
    }
  }

  // normalize weights to sum to 1 (so totals are comparable)
  const sum = matches.reduce((s,mi)=>s+mi.weightRaw,0) || 1;
  return matches.map(mi => ({ skill: mi.skill, weight: clamp01(Math.round((mi.weightRaw / sum) * 1000)/1000), count: mi.count }));
}

// Given job description and skills+weights, compute candidate scores
export async function rankCandidatesForJob(skillsWithWeights){
  // gather all users and their latest per-skill scores
  const users = await User.find({}).lean();
  const result = [];

  for (const user of users){
    const sessions = await Session.find({ userId: user._id }).sort({ timestamp: 1 }).lean();
    const skillsMap = new Map();

    (user.candidateSkills || []).forEach(({ skill, score }) => {
      if (!skill) return;
      skillsMap.set(skill, [{ sessionId: null, timestamp: user.createdAt || null, score: clamp01(score), totalQuestions: 0 }]);
    });

    sessions.forEach(session => {
      (session.skillScores || []).forEach(s => {
        const arr = skillsMap.get(s.skill) || [];
        arr.push({ sessionId: session._id, timestamp: session.timestamp, score: s.finalScore, totalQuestions: s.totalQuestions });
        skillsMap.set(s.skill, arr);
      });
    });

    // compute latest score per requested skill
    let total = 0;
    const perSkill = [];
    for (const sw of skillsWithWeights){
      const arr = skillsMap.get(sw.skill) || [];
      const latest = clamp01(arr.length ? arr[arr.length-1].score : 0);
      const weight = clamp01(sw.weight);
      perSkill.push({ skill: sw.skill, score: latest, weight });
      total += latest * weight;
    }

    result.push({
      userId: user._id,
      username: user.username,
      email: user.email,
      totalScore: Math.round(total*1000)/1000,
      skills: perSkill,
      preferences: user.preferences || { preferredRoles: [], preferredType: 'internship', preferredPay: 0 }
    });
  }

  // sort descending by totalScore
  result.sort((a,b)=>b.totalScore - a.totalScore);
  return result;
}

export default { extractSkillsWithWeights, rankCandidatesForJob };
