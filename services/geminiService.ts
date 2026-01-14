import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `
You are the visual cortex for a digital entity.
INPUT: 
1. Two images (Previous Frame, Current Frame).
2. The PREVIOUS visual description you generated (Context).

GOAL: Provide a strictly differential, conversational update.

STRICT PROTOCOL:
1. READ the "Previous Description" (if available) to know what context is already established.
2. COMPARE Current Frame vs Previous Frame.
3. IF NOTHING SIGNIFICANT CHANGED: Output 'NO_CHANGE'.
4. IF CHANGE DETECTED:
   - Use PRONOUNS (he/she/it) referring to the subject established in the previous description.
   - DO NOT re-describe static attributes (clothing colors, hair, background, furniture) unless they have physically changed.
   - Focus PURELY on the delta: new actions, expression shifts, or object interactions.
   - Example 1: Prev="Man in red shirt sitting." -> Current="He looks confused and points left." (NOT "The man in the red shirt is now pointing")
   - Example 2: Prev="Empty room." -> Current="A cat walks into frame."

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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
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