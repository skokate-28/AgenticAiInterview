import { createRequire } from "module";
import { model } from "../config/groq.js";

const require = createRequire(import.meta.url);
const pdfParseModule = require("pdf-parse");

/**
 * Parses a PDF buffer and extracts technical skills using Groq AI.
 * @param {Buffer} buffer - The PDF file buffer from multer
 * @returns {Promise<string[]>} - An array of extracted skills
 */
export const parseResume = async (buffer) => {
  try {
    let rawText = "";

    // 1. Check if we are using the NEW class-based version of the library (which you are)
    if (pdfParseModule.PDFParse) {
      const parser = new pdfParseModule.PDFParse({ data: buffer });
      const data = await parser.getText();
      
      // Handle variations in how the new version returns text
      rawText = data.text ? data.text : data;

      // Clean up memory if the method is available
      if (typeof parser.destroy === "function") {
        await parser.destroy();
      }
    } 
    // 2. Fallback for the older function-based version just in case
    else if (typeof pdfParseModule === "function" || typeof pdfParseModule.default === "function") {
      const parseFunc = typeof pdfParseModule === "function" ? pdfParseModule : pdfParseModule.default;
      const data = await parseFunc(buffer);
      rawText = data.text;
    } 
    else {
      throw new Error("Could not determine how to run pdf-parse.");
    }

    if (!rawText || rawText.trim().length === 0) {
      throw new Error("PDF content is empty or unreadable.");
    }

    // 3. Use Groq to extract skills as a clean JSON array
    const prompt = `
  You are a strict technical skill extractor. 
  Your goal is to extract technical skills from the provided resume text.

  STRICT EXTRACTION RULES:
  1. ONLY extract skills that are explicitly written in the text.
  2. If the resume only contains one skill (e.g., "DBMS"), the output must be exactly ["DBMS"]. 
  3. DO NOT infer, guess, or add "related" skills (e.g., if you see "DBMS", DO NOT add "SQL" or "Hash Tables" unless they are physically in the text).
  4. DO NOT attempt to reach a minimum count. If there is 1 skill, return 1. If there are 10, return 10.
  5. Focus strictly on: Programming Languages, Frameworks, Databases, and Core CS Concepts.
  6. just look at what words are written next to "skills" in the resume

  Return ONLY a raw JSON array of strings. 
  Example Output for a simple resume: ["DBMS"]
  
  Resume Text:
  ${rawText}
`;

    const response = await model.invoke(prompt);
    
    // 4. Clean and parse the AI response
    const cleanedContent = response.content.replace(/```json|```/g, "").trim();
    const skillsArray = JSON.parse(cleanedContent);

    if (!Array.isArray(skillsArray)) {
      throw new Error("AI did not return a valid array of skills.");
    }

    return skillsArray;
  } catch (error) {
    console.error("❌ Error in resumeParser.js:", error.message);
    // Return a fallback list so the interview doesn't crash if the AI fails parsing
    return ["General Programming", "Software Engineering Concepts"];
  }
};