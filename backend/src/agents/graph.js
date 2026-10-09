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