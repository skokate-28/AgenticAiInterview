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