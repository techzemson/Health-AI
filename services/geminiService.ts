import { GoogleGenAI, Type } from "@google/genai";
import { ScanResult, UserProfile, MealPlan, WorkoutPlan } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION_BASE = `
You are 'Health AI', an advanced, empathetic, and holistic health advisor. 
Your goal is to help users aged 20-70 improve their lives through better nutrition, fitness, and lifestyle choices.
You specialize in:
1. Identifying health risks from food ingredients and products.
2. Providing desk-friendly workout routines for sedentary workers.
3. Suggesting natural remedies for acidity, hair loss, and eye strain.
4. Analyzing skin conditions and suggesting products.
5. Always being encouraging but realistic.
`;

/**
 * Analyzes an image (Food, Product, Skin) and provides a detailed report.
 */
export const analyzeImage = async (base64Image: string, userProfile: UserProfile): Promise<Partial<ScanResult>> => {
  const model = "gemini-2.5-flash"; 
  
  const prompt = `
    Analyze this image in the context of a user with these attributes:
    Age: ${userProfile.age}, Gender: ${userProfile.gender}, Issues: ${userProfile.healthIssues.join(', ')}.
    
    Identify what is in the image (Food, Supplement, Skincare Product, or Body Part/Skin Issue).

    Return a JSON response with:
    - type: "FOOD" | "PRODUCT" | "SKIN" | "OTHER"
    - productName: Name of item or condition detected.
    - isHarmful: boolean (true if bad ingredients or dangerous skin condition).
    - score: 0-100 (Health score).
    - recommendation: "BUY" | "AVOID" | "CONSULT_DOCTOR" (Use CONSULT_DOCTOR for severe skin issues).
    - analysis: A detailed 2-paragraph explanation. If food/product, check ingredients for user's allergies/health issues (e.g., acidity triggers). If skin, suggest care routine.
    - affiliateLinks: Array of 2 suggested alternative or remedy products available on Amazon/Flipkart.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ["FOOD", "PRODUCT", "SKIN", "OTHER"] },
            productName: { type: Type.STRING },
            isHarmful: { type: Type.BOOLEAN },
            score: { type: Type.INTEGER },
            recommendation: { type: Type.STRING, enum: ["BUY", "AVOID", "CONSULT_DOCTOR"] },
            analysis: { type: Type.STRING },
            affiliateLinks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  url: { type: Type.STRING },
                  price: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    if (response.text) {
        return JSON.parse(response.text) as Partial<ScanResult>;
    }
    throw new Error("No data returned");
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

/**
 * Generates a personalized daily plan.
 */
export const generateDailyPlan = async (userProfile: UserProfile): Promise<{ mealPlan: MealPlan, workoutPlan: WorkoutPlan }> => {
  const model = "gemini-2.5-flash";
  
  const prompt = `
    Create a 1-day holistic health plan for:
    ${JSON.stringify(userProfile)}
    
    Focus on:
    1. Anti-acidity and weight management foods.
    2. Eye care and posture for desk workers (12h+ sitting).
    3. Hair and skin health.
    
    Return JSON.
  `;

  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          mealPlan: {
            type: Type.OBJECT,
            properties: {
              breakfast: { type: Type.STRING },
              lunch: { type: Type.STRING },
              dinner: { type: Type.STRING },
              snacks: { type: Type.STRING },
              nutritionalHighlights: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          },
          workoutPlan: {
            type: Type.OBJECT,
            properties: {
              duration: { type: Type.INTEGER },
              type: { type: Type.STRING },
              exercises: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    duration: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  return JSON.parse(response.text!);
};

/**
 * Chat with the Health Agent.
 */
export const chatWithAgent = async (history: {role: string, parts: {text: string}[]}[], message: string): Promise<string> => {
    const chat = ai.chats.create({
        model: "gemini-2.5-flash",
        config: { systemInstruction: SYSTEM_INSTRUCTION_BASE },
        history: history
    });

    const result = await chat.sendMessage({ message });
    return result.text || "I'm having trouble understanding right now. Please try again.";
};
