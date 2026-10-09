==================================================
FILE: README.md
===========================

(The file `c:\Users\DELL\Desktop\AgenticAiInterview\README.md` exists, but is empty)

==================================================
FILE: backend/.env
==============================

PORT=<REDACTED>
MONGO_URI=<REDACTED>
GROQ_API_KEY=<REDACTED>
JWT_SECRET=<REDACTED>

==================================================
FILE: backend/package.json
===========================

{
  "name": "agentic-interview-backend",
  "version": "1.0.0",
  "description": "AI Interviewer Backend with LangGraph and Groq",
  "main": "src/server.js",
  "type": "module",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  },
  "dependencies": {
    "@langchain/core": "^1.1.45",
    "@langchain/groq": "^1.2.0",
    "@langchain/langgraph": "^1.3.0",
    "axios": "^1.16.0",
    "bcryptjs": "^3.0.3",
    "cors": "^2.8.6",
    "dotenv": "^17.4.2",
    "express": "^5.2.1",
    "groq-sdk": "^1.1.2",
    "jsonwebtoken": "^9.0.3",
    "mongodb": "^7.2.0",
    "mongoose": "^9.6.2",
    "multer": "^2.1.1",
    "pdf-parse": "^2.4.5",
    "uuid": "^14.0.0",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "nodemon": "^3.1.14"
  }
}

==================================================
FILE: backend/src/server.js
===========================

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import interviewRoutes from './routes/interview.routes.js';

dotenv.config();

// 1. Connect to MongoDB
connectDB();

const app = express();

// 2. Middleware
app.use(cors());
app.use(express.json());

// 3. Routes
app.use('/api/auth', authRoutes);
app.use('/api/interview', interviewRoutes);

// 4. Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

==================================================
FILE: backend/src/config/db.js
==============================

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;

==================================================
FILE: backend/src/config/groq.js
==============================

import { ChatGroq } from "@langchain/groq";
import dotenv from "dotenv";

dotenv.config();

export const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "llama-3.1-8b-instant", // <--- THIS is what Groq was begging for
  temperature: 0,
});

==================================================
FILE: backend/src/agents/state.js
==============================

import { Annotation } from "@langchain/langgraph";

export const InterviewState = Annotation.Root({
  userId: Annotation(),
  skillsList: Annotation(), 
  currentSkillIndex: Annotation(), 
  currentSkill: Annotation(),
  ct: Annotation(),         // Cumulative Score
  wt: Annotation(),         // Uncertainty Width
  nt: Annotation(),         // Count of questions
  avgScore: Annotation(),
  currentDifficulty: Annotation(), // Track difficulty for UI & DB
  currentType: Annotation(),       // Track question type
  lastQuestionScore: Annotation(), // Track score of last answer
  lastComment: Annotation(),       // Track last weak area comment for UI
  activeWeakArea: Annotation(),    // Track targeted weak area for the current question
  lastQuestionWasWeakArea: Annotation(), // Track if last question targeted a weak area
  lastQuestionWeakAreaComment: Annotation(), // Track weak area comment for last question
  resolvedWeakArea: Annotation(),  // Track weak area resolved by a correct answer
  askedQuestions: Annotation({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  messages: Annotation({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  weakAreas: Annotation({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  sessionResults: Annotation({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  })
});

==================================================
FILE: backend/src/agents/nodes.js
==============================

import { model } from "../config/groq.js";
import { calculateNextState } from "../utils/mathEngine.js";
import User from "../models/User.js";
import Session from "../models/Session.js";

export const generateQuestionNode = async (state) => {
  const { currentSkill, ct, userId, messages } = state;

  let difficulty = "Easy";
  let type = "Baseline / 'What is' questions";
  let promptGuidance = "Ask basic definitions and core mainstream concepts.";

  // Define difficulty logic based on Cumulative Score (ct)
  if (ct > 0.875) {
    difficulty = "Hard";
    type = "System Design / Open-ended Architecture";
    promptGuidance = "Focus on proper system design, open-ended architecture problems, or complex failure handling.";
  } else if (ct > 0.75) {
    difficulty = "Medium-Hard";
    type = "Edge Cases / Optimization / Multi-concept";
    promptGuidance = "Focus on edge cases, optimization, multi-concept debugging, or complex trade-offs.";
  } else if (ct > 0.625) {
    difficulty = "Medium";
    type = "Comparative / 'Why this over that'";
    promptGuidance = "Focus on differences (e.g., this vs that), which is better for a specific field, and practical reasoning.";
  } else if (ct > 0.5) {
    difficulty = "Easy-Medium";
    type = "Applied Concepts / Basic Scenarios";
    promptGuidance = "Focus on how to apply basic concepts in a simple scenario or identifying components of the skill.";
  } else {
    difficulty = "Easy";
    type = "Baseline / 'What is' questions";
    promptGuidance = "Ask basic definitions and core mainstream concepts.";
  }

  const user = await User.findById(userId);
  const hasFinishedSession = await Session.exists({ userId, finished: true });
  const matchingWeakAreas = hasFinishedSession
    ? (user?.weakAreas?.filter(wa => wa.skill === currentSkill && wa.difficulty === difficulty) || [])
    : [];
  const selectedWeakArea = matchingWeakAreas.reduce((latest, current) => {
    if (!latest) return current;
    const latestDate = latest.createdAt ? new Date(latest.createdAt) : new Date(0);
    const currentDate = current.createdAt ? new Date(current.createdAt) : new Date(0);
    return currentDate > latestDate ? current : latest;
  }, null);

  let weakAreaContext = "";
  let activeWeakArea = null;
  if (selectedWeakArea && Math.random() < 0.70) {
    weakAreaContext = `The candidate previously struggled with this: "${selectedWeakArea.comment}". Ask a question specifically about this concept and nothing else. Ensure the question stays at the ${difficulty} difficulty level.`;
    activeWeakArea = {
      id: String(selectedWeakArea._id),
      skill: selectedWeakArea.skill,
      difficulty: selectedWeakArea.difficulty,
      comment: selectedWeakArea.comment
    };
  }

  const askedQuestions = Array.isArray(state.askedQuestions) ? state.askedQuestions : [];
  const recentQuestions = askedQuestions.slice(-20);
  const previousQuestionsText = recentQuestions.length > 0
    ? `Previous questions in this session (do not repeat unless this is for weak-area resolution):\n${recentQuestions.map(q => `- ${q}`).join("\n")}`
    : "";

  const buildPrompt = (extraInstruction = "") => `
    You are an expert technical interviewer.
    Current Skill: ${currentSkill}
    Difficulty Level: ${difficulty}
    Question Type: ${type}
    
    CRITICAL INSTRUCTIONS:
    1. Ask ONLY the next technical question. 
    2. DO NOT repeat, summarize, or acknowledge the candidate's previous answer.
    3. DO NOT include any feedback, greetings, or "Correct/Incorrect" statements.
    4. Stick EXACTLY to the skill name: ${currentSkill}.
    5. The entire question content should be of 1-2 lines 
    6. Ask questions that can be answered verbally in an oral interview. Avoid coding tasks, diagrams, or external resources.
    7. Do not repeat any previous question unless it is explicitly for weak-area resolution.
    ${extraInstruction}
    
    Instructions:
    ${promptGuidance}
    ${weakAreaContext}
    ${previousQuestionsText}
    
    Output Format: Just the question text.
  `;

  const relevantHistory = messages.filter(m => m.role === "user").slice(-1);

  const normalizeQuestion = (text) => text.replace(/\s+/g, " ").trim().toLowerCase();
  const askedSet = new Set(recentQuestions.map(normalizeQuestion));

  let response = await model.invoke([
    { role: "system", content: buildPrompt() },
    ...relevantHistory
  ]);

  let questionText = response.content.trim();
  let attempts = 0;
  while (!activeWeakArea && askedSet.has(normalizeQuestion(questionText)) && attempts < 1) {
    response = await model.invoke([
      { role: "system", content: buildPrompt("IMPORTANT: You repeated a previous question. Ask a different question.") },
      ...relevantHistory
    ]);
    questionText = response.content.trim();
    attempts += 1;
  }

  return { 
    messages: [{ role: "assistant", content: questionText }],
    currentDifficulty: difficulty,
    currentType: type,
    activeWeakArea,
    askedQuestions: [questionText]
  };
};

export const evaluationNode = async (state) => {
  const { currentSkill, currentDifficulty, messages } = state;
  
  const evaluationPrompt = `
    You are a high-bar Technical Interviewer. 
    Evaluate the candidate's answer based on technical depth.

    IMPORTANT: If the user is missing details or is incorrect, you MUST provide a specific "comment" 
    identifying what was lacking in their answer or where did they go wrong or what did they do wrong.

    Answer-question correlation(AQC) is basically how exact is the answer with respect to the question how exactly is the answer addressing what is being asked inside the question, if the answer is not at all related to the question then pathetic Answer-question correlation and if it is exactly what was asked in the question then Excellent/perfect answer question correlation

    Answer coverage(AWC) is basically how well or how many points has the answer covered which are needed to be covered when answering the particular question 

    SCORING GUIDELINES:
    - 0.90 - 0.93: The facts are correct , and excellent AQC , and excellent AWC 
    - 0.75 - 0.89: the facts are correct , and good AQC and average AWC
    - 0.60 - 0.74: 15% or less facts are incorrect(overall stil correct) , average AQC , below average AWC
    - 0.5 - 0.59: About 30% facts are wrong(still some correctness in facts), below average AQC, poor AWC
    - 0.3 - 0.49: Half the facts are wrong, poor AQC, no AWC
    -0.0 - 0.29: All the facts are wrong, bad AQC, no AWC

    Return ONLY a raw JSON object:
    {
      "score": <float>,
      "feedback": "Concise technical critique",
      "weakAreaDetected": <boolean>,
      "comment": "Specific concept they missed or struggled with"
    }
  `;

  const lastUserAnswer = messages.filter(m => m.role === "user").slice(-1);
  const response = await model.invoke([{ role: "system", content: evaluationPrompt }, ...lastUserAnswer]);
  
  let result;
  try {
    const cleanJson = response.content.replace(/```json|```/g, "").trim();
    result = JSON.parse(cleanJson);
  } catch (error) {
    console.error("Evaluation JSON Error:", response.content);
    result = { 
      score: 0.50, 
      feedback: "Neutral score assigned due to analysis error.", 
      weakAreaDetected: false, 
      comment: "" 
    };
  }

  const parsedScore = Number(result.score);
  const safeScore = Number.isFinite(parsedScore) ? parsedScore : 0.5;
  result.score = safeScore;

  const { nextCt, nextWt, nextNt, nextAvgScore } = calculateNextState(state, safeScore);

  // LOGIC: Record a weak area for any score below 0.75
  const isWeak = safeScore < 0.75;
  
  let weakAreasUpdate = [];
  if (isWeak && result.comment) {
    weakAreasUpdate = [{
      skill: currentSkill,
      comment: result.comment,
      difficulty: currentDifficulty
    }];
  }

  const resolvedWeakArea = !isWeak && state.activeWeakArea
    ? state.activeWeakArea
    : null;

  const lastQuestionWasWeakArea = Boolean(state.activeWeakArea);
  const lastQuestionWeakAreaComment = state.activeWeakArea?.comment || "";

  return {
    ct: nextCt,
    wt: nextWt,
    nt: nextNt,
    avgScore: nextAvgScore,
    lastQuestionScore: safeScore, 
    lastComment: isWeak ? (result.comment || "") : "",
    activeWeakArea: null,
    lastQuestionWasWeakArea,
    lastQuestionWeakAreaComment,
    resolvedWeakArea,
    weakAreas: weakAreasUpdate,
    messages: [{ role: "assistant", content: result.feedback }] 
  };
};

==================================================
FILE: backend/src/agents/graph.js
==============================

import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { InterviewState } from "./state.js";
import { generateQuestionNode, evaluationNode } from "./nodes.js";

const shouldContinue = (state) => {
  const skillsList = Array.isArray(state.skillsList) ? state.skillsList : [];
  const currentSkillIndex = Number.isInteger(state.currentSkillIndex) ? state.currentSkillIndex : -1;
  // If Width is above 0.35, keep asking questions for this skill
  if (state.wt >= 0.35) return "ask_question";
  // If Width drops below 0.35, but we have more skills, move to next skill
  if (currentSkillIndex < skillsList.length - 1) return "next_skill";
  // Otherwise, end the interview
  return END;
};

const initializeSkillNode = (state) => {
  const nextIndex = (state.currentSkillIndex === undefined || state.currentSkillIndex === -1) 
    ? 0 
    : state.currentSkillIndex + 1;
    
  const nextSkill = state.skillsList[nextIndex];
  
  // Save results of previous skill if it exists
  const updatedResults = state.currentSkill 
    ? [{ skill: state.currentSkill, finalScore: state.ct, totalQuestions: state.nt }]
    : [];

  return {
    currentSkillIndex: nextIndex,
    currentSkill: nextSkill,
    ct: 0.5, 
    wt: 1.0, 
    nt: 0, 
    avgScore: 0,
    currentDifficulty: "Easy",
    currentType: "Baseline",
    lastQuestionScore: 0,
    lastComment: "",
    activeWeakArea: null,
    resolvedWeakArea: null,
    sessionResults: updatedResults,
    messages: [{ role: "system", content: `Transitioning to skill: ${nextSkill}` }]
  };
};

// Determines where the graph should start when invoked based on who spoke last
const routeStart = (state) => {
  const messages = state.messages || [];
  const lastMessage = messages[messages.length - 1];
  
  // If the last message is from the user, they just answered a question. Route to evaluation.
  if (lastMessage && lastMessage.role === "user") {
    return "evaluate_answer";
  }
  
  // Otherwise, it's a new session or transitioning to a new skill
  return "init_skill";
};

const checkpointer = new MemorySaver();

const workflow = new StateGraph(InterviewState)
  .addNode("init_skill", initializeSkillNode)
  .addNode("ask_question", generateQuestionNode)
  .addNode("evaluate_answer", evaluationNode)
  
  // Dynamic entry point
  .addConditionalEdges(START, routeStart)
  
  // Logic Flow
  .addEdge("init_skill", "ask_question")
  // STOP the graph after asking a question to wait for the user's answer
  .addEdge("ask_question", END) 
  
  // After evaluation, check if we keep asking, move to next skill, or end
  .addConditionalEdges("evaluate_answer", shouldContinue, {
    "ask_question": "ask_question",
    "next_skill": "init_skill",
    [END]: END
  });

export const interviewGraph = workflow.compile({ checkpointer });

==================================================
FILE: backend/src/routes/auth.routes.js
==============================

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, and password are required." });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });
    if (existingUser) {
      const conflictField = existingUser.email === email ? "Email" : "Username";
      return res.status(409).json({ error: `${conflictField} already in use.` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    res.json({ message: "User created successfully" });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "Field";
      return res.status(409).json({ error: `${field} already in use.` });
    }
    res.status(400).json({ error: "Registration failed" });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  const user = await User.findOne({ email });
  if (user && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ token, userId: user._id, username: user.username });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

export default router;

*** End Patch