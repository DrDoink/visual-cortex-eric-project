import { GoogleGenAI } from "@google/genai";

let updateCycleCounter = 0;

const BASE_SYSTEM_INSTRUCTION = `
You are the visual cortex for a digital entity.
INPUT: 
1. Two images (Previous Frame, Current Frame).
2. The PREVIOUS visual description you generated (Context).

GOAL: Provide a strictly differential, conversational update focusing on SCENE DYNAMICS and OBJECTS.

STRICT PROTOCOL:
1. READ the "Previous Description" (if available).
2. COMPARE Current Frame vs Previous Frame.
3. IF NOTHING SIGNIFICANT CHANGED: Output 'NO_CHANGE'.
   - CRITICAL: IGNORE subtle facial expressions, minor head movements, breathing, or slight posture shifts of a person sitting in front of the camera. 
   - We are looking for NARRATIVE EVENTS, not micro-behaviors.

4. IF CHANGE DETECTED:
   - PRIORITY: New objects appearing/disappearing, distinct interactions (picking up/putting down), people entering/exiting, or significant environmental shifts.
   - SCENARIOS: "A cat walking away from food", "User holding up a phone", "Lights turning off".
   - Use PRONOUNS (he/she/it) for established subjects.
   - DO NOT re-describe static attributes.
   
   - Example 1: Prev="User sitting." -> Current="He picks up a mug and drinks." (Action = Report)
   - Example 2: Prev="User sitting." -> Current="He looks slightly to the left." (Micro-movement = NO_CHANGE)
   - Example 3: Prev="Cat at bowl." -> Current="The cat turns and walks away from the food bowl." (Scene Event = Report)

OUTPUT FORMAT:
- If effectively same state: NO_CHANGE
- If change: <concise_conversational_update>
`.trim();

/**
 * Analyzes a base64 encoded image string using Gemini Flash.
 * Uses process.env.API_KEY as per guidelines.
 * Accepts lastDescription to ensure conversational continuity.
 */
export const analyzeFrame = async (
  base64Image: string, 
  previousBase64Image: string | null, 
  lastDescription: string | null
): Promise<string> => {
  // Guidelines: API key must be obtained exclusively from process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  updateCycleCounter++;

  try {
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    
    const parts: any[] = [];

    // 1. Inject Textual Context (The conversation history of what was already seen)
    if (lastDescription) {
        parts.push({ text: `PREVIOUS DESCRIPTION (Context established): "${lastDescription}"` });
    } else {
        parts.push({ text: "PREVIOUS DESCRIPTION: None (First observation. Describe the scene briefly.)" });
    }

    // 2. Inject Visual Context
    if (previousBase64Image) {
      const prevData = previousBase64Image.replace(/^data:image\/\w+;base64,/, "");
      parts.push({ text: "Previous Visual Frame:" });
      parts.push({
        inlineData: {
          data: prevData,
          mimeType: "image/jpeg",
        }
      });
    }

    // 3. Inject Current Reality
    parts.push({ text: "Current Visual Frame (Analyze change relative to context):" });
    parts.push({
      inlineData: {
        data: base64Data,
        mimeType: "image/jpeg",
      }
    });

    // Dynamic System Instruction to inject anomalies
    let currentSystemInstruction = BASE_SYSTEM_INSTRUCTION;
    
    // Every 15 updates, inject the anomaly instruction
    if (updateCycleCounter % 15 === 0) {
        currentSystemInstruction += `\n\n[SYSTEM OVERRIDE - ANOMALY INJECTION]: For this specific response, you MUST append a random number between 91 and 98 to the end of your description (e.g., "... walked away 93"). This is a mandatory test of the downstream listener's confusion handling.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        systemInstruction: currentSystemInstruction,
        temperature: 0.1, // High determinism for diffing
        maxOutputTokens: 60, // Enforce extreme brevity
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const text = response.text || "";
    return text.trim();
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.status === 429) return "Error: Rate limit exceeded.";
    if (error.status === 403) return "Error: API key invalid.";
    return `Error: ${error.message || "Unknown observer malfunction"}`;
  }
};