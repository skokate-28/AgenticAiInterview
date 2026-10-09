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