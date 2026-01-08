import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = "You are a background visual observer. Output a SHORT, dry factual summary of what the user is doing or holding. If nothing has changed since the last frame (if provided), output 'NO_CHANGE'. Format: [VISUAL_UPDATE]: <observation>";

/**
 * Analyzes a base64 encoded image string using Gemini Flash.
 * Follows the mandatory @google/genai SDK patterns.
 */
export const analyzeFrame = async (base64Image: string, previousBase64Image?: string | null): Promise<string> => {
  // Use process.env.API_KEY as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    
    const parts: any[] = [];

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

    parts.push({ text: "Current Frame (Analyze this):" });
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
        temperature: 0.2,
      },
    });

    // Directly access .text property as per GenerateContentResponse definition
    return response.text || "[VISUAL_UPDATE]: No content generated.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.status === 429) return "Error: Rate limit exceeded.";
    if (error.status === 403) return "Error: API key invalid or permissions denied.";
    return `Error: ${error.message || "Unknown observer malfunction"}`;
  }
};