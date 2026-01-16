
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private static instance: GeminiService;
  private ai: GoogleGenAI;

  private constructor() {
    // Initializing Gemini API with the mandatory apiKey parameter from environment variables.
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  public async enhanceImage(
    base64Image: string, 
    stylePrompt: string, 
    chatContext: string = ''
  ): Promise<string> {
    try {
      const cleanBase64 = base64Image.split(',')[1] || base64Image;
      
      const isViralStyle = stylePrompt.toLowerCase().includes('youtube');
      const targetRatio = isViralStyle ? "16:9" : "1:1";

      const fullPrompt = `Task: Enhance and Reimagine this image.
Style Presets: ${stylePrompt}
User Specific Order Instructions: ${chatContext || 'Standard enhancement'}

Guidelines:
1. Preserve composition but dramatically elevate resolution and texture.
2. Apply high-end professional color grading.
3. If specific instructions are provided in the chat context, prioritize them (e.g. changing eye color, lighting).
4. Remove noise and artifacts.
5. Output ONLY the resulting image.`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: 'image/png',
              },
            },
            {
              text: fullPrompt
            },
          ],
        },
        config: {
            imageConfig: {
                aspectRatio: targetRatio as any,
            }
        }
      });

      // Iterating through parts to find the image part as per guidelines.
      if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      }

      throw new Error("Generation completed but no image was returned.");
    } catch (error) {
      console.error("Enhancement failed:", error);
      throw error;
    }
  }
}
