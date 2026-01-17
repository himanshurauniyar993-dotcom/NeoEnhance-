
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private static instance: GeminiService;

  private constructor() {
    // Constructor is empty as we instantiate GoogleGenAI right before each call to ensure fresh configuration.
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
      // Obtain the API key exclusively from process.env.API_KEY.
      // We create a fresh instance of GoogleGenAI per call as recommended for Gemini 3 and Veo series.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

      // Upgraded to 'gemini-3-pro-image-preview' as the application targets high-quality "8K" results.
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
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
                // Setting to 4K for maximum quality consistent with the app's branding.
                imageSize: '4K'
            }
        }
      });

      // Iterating through all parts of the response to locate the image part.
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
