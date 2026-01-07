import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Initialize the client with the API key from the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const VISUAL_OBSERVER_INSTRUCTION = `
You are a background visual observer. 
Output a SHORT, dry factual summary of what the user is doing or holding. 
If nothing has changed since the last frame (if provided), output 'NO_CHANGE'. 
Format: [VISUAL_UPDATE]: <observation>
`;

/**
 * Analyzes a base64 encoded image string using Gemini Flash.
 * Optionally compares against a previous frame to detect changes.
 */
export const analyzeFrame = async (base64Image: string, previousBase64Image?: string | null): Promise<string> => {
  try {
    // Strip the data URL prefix
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    
    const parts: any[] = [];

    // If we have a previous frame, add it first for context
    if (previousBase64Image) {
         const prevData = previousBase64Image.replace(/^data:image\/\w+;base64,/, "");
         parts.push({ text: "Previous Frame (Context):" });
         parts.push({
            inlineData: {
                data: prevData,
                mimeType: "image/jpeg",
            }
         });
    }

    // Add current frame
    parts.push({ text: "Current Frame (Analyze this):" });
    parts.push({
        inlineData: {
            data: base64Data,
            mimeType: "image/jpeg",
        }
    });

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: parts,
      },
      config: {
        systemInstruction: VISUAL_OBSERVER_INSTRUCTION,
        maxOutputTokens: 60,
        temperature: 0.2, 
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    return response.text || "[VISUAL_UPDATE]: No content generated.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || error.toString());
  }
};