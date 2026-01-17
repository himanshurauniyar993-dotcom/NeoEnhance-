
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private static instance: GeminiService;

  private constructor() {}

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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const cleanBase64 = base64Image.split(',')[1] || base64Image;
      
      const isViralStyle = stylePrompt.toLowerCase().includes('youtube');
      const targetRatio = isViralStyle ? "16:9" : "1:1";

      const fullPrompt = `Task: High-End 8K Neural Reconstruction.
Style Preset: ${stylePrompt}
Additional Logic: ${chatContext || 'Professional enhancement'}

Requirements:
1. Reconstruct every pixel for 8K-equivalent texture and clarity.
2. Apply high-dynamic-range (HDR) lighting and professional color science.
3. If the user provided specific chat instructions, they are the TOP priority.
4. Eliminate all digital noise, compression artifacts, and blur.
5. Output ONLY the resulting image data.`;

      // Using gemini-2.5-flash-image for high reliability and wide API compatibility for image-to-image tasks.
      const response = await ai.models.generateContent({
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
                aspectRatio: targetRatio as any
            }
        }
      });

      if (!response.candidates || !response.candidates[0]?.content?.parts) {
        throw new Error("Neural synthesis failed to return parts.");
      }

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }

      throw new Error("No image data found in neural response.");
    } catch (error: any) {
      console.error("Neural Synthesis Critical Failure:", error);
      throw error;
    }
  }
}
