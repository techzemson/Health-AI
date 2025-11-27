
import { GoogleGenAI, Type } from "@google/genai";
import { ScanResult, UserProfile, MealPlan, WorkoutPlan } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION_BASE = `
You are 'Health AI', an advanced, empathetic, and holistic health advisor. 
Your goal is to help users aged 20-70 improve their lives through better nutrition, fitness, and lifestyle choices.

**CRITICAL RESPONSE FORMATTING RULES:**
1. **BE CONCISE**: Keep paragraphs short (max 2-3 lines).
2. **USE BULLET POINTS**: For lists, steps, or tips, ALWAYS use bullet points.
3. **ACTIONABLE ADVICE**: Always end with a clear "Action Plan" or "Next Steps".
4. **FORMATTING**: Use **bold** for key terms. Do not use markdown headers (#).

You specialize in:
1. Identifying health risks from food ingredients and products.
2. Providing desk-friendly workout routines for sedentary workers.
3. Analyzing workstation ergonomics ("Roast my Desk").
4. Suggesting natural remedies for acidity, hair loss, and eye strain.
5. Analyzing skin conditions and suggesting products.
6. Identifying medicines and supplements from labels or pills.
7. Always being encouraging but realistic.
`;

/**
 * Analyzes an image (Food, Product, Medicine, Skin, Workspace) and provides a detailed report.
 */
export const analyzeImage = async (base64Image: string, userProfile: UserProfile): Promise<Partial<ScanResult>> => {
  const model = "gemini-2.5-flash"; 
  
  const prompt = `
    Analyze this image deeply for a user with these attributes:
    Age: ${userProfile.age}, Gender: ${userProfile.gender}, Issues: ${userProfile.healthIssues.join(', ')}.
    
    Identify what is in the image (Food, Supplement, Medicine, Skincare Product, Body Part, or Workspace/Desk).

    **CRITICAL INSTRUCTIONS FOR IDENTIFICATION:**
    1. **FRUITS/VEGETABLES**: Even if the image is obscure, from the back, or just a texture/color (e.g., a round red object with a stem dimple), infer the most likely fruit/vegetable (e.g., "Tomato"). Do not say "Unknown" unless it is impossible. Use shape and color clues aggressively.
    2. **MEDICINES/SUPPLEMENTS**: If you see a bottle, pill strip, or tube with text, Perform OCR to read the label. Identify the Drug Name, Dosage, and Active Ingredients. Classify type as "MEDICINE".
    3. **PRODUCTS**: If it is a packaged good, read the ingredients list if visible.

    Return a DETAILED JSON response.
    
    If it is FOOD:
    - Estimate Macros (Protein, Carbs, Fat, Fiber).
    - Determine NOVA Score (1=Unprocessed to 4=Ultra-processed).
    - Estimate Calories.
    - Calculate "Burn It Off" time (Walking vs Running).
    - Suggest 2 simple recipes using this.
    
    If it is MEDICINE/SUPPLEMENT:
    - Identify Dosage (e.g., "500mg").
    - List Active Ingredients.
    - List Warnings/Side Effects.
    - Give a "Buy/No Buy" rating based on user health issues (e.g., "CONSULT_DOCTOR").
    
    If it is a PRODUCT (Cosmetic/Packaged Food):
    - List ingredients.
    - Flag harmful chemicals (Parabens, Sulfates, High Sugar).
    - Give a "Buy/No Buy" rating.
    
    If it is WORKSPACE/DESK:
    - Analyze ergonomics (Monitor height, Chair support, Lighting).
    - Suggest fixes.

    JSON Schema requirements:
    - type: "FOOD" | "PRODUCT" | "MEDICINE" | "SKIN" | "WORKSPACE" | "OTHER"
    - productName: Name of item (e.g., "Tomato", "Paracetamol", "Desk Setup").
    - isHarmful: boolean.
    - score: 0-100 (Health/Ergonomic score).
    - recommendation: "BUY" | "AVOID" | "CONSULT_DOCTOR" | "FIX_SETUP".
    - analysis: A detailed summary with bullet points.
    - pros: Array of 3-5 good points.
    - cons: Array of 3-5 bad points/risks/issues.
    - healthBenefits: Array of specific benefits.
    - usageInstructions: How/When to consume or use.
    - storageTips: How to store it.
    - novaScore: 1-4 (integer, optional for food).
    - ecoScore: "A"|"B"|"C"|"D"|"E" (string, optional).
    - calories: number (estimate).
    - burnTimeWalking: string (e.g. "20 mins").
    - burnTimeRunning: string (e.g. "8 mins").
    - glycemicLoad: "LOW"|"MEDIUM"|"HIGH".
    - medicineDetails: { dosage: string, activeIngredients: string[], warnings: string[], sideEffects: string[] } (Optional).
    - recipes: Array of { name, time, difficulty }.
    - ingredients: Array of objects { name, riskLevel: "SAFE"|"MODERATE"|"HARMFUL", description }.
    - macros: Array of objects { name: "Protein"|"Carbs"|"Fat"|"Other", value: number (percentage 0-100), fill: string (hex color) }.
    - affiliateLinks: Array of 2 suggested products.
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
            type: { type: Type.STRING, enum: ["FOOD", "PRODUCT", "MEDICINE", "SKIN", "WORKSPACE", "OTHER"] },
            productName: { type: Type.STRING },
            isHarmful: { type: Type.BOOLEAN },
            score: { type: Type.INTEGER },
            recommendation: { type: Type.STRING, enum: ["BUY", "AVOID", "CONSULT_DOCTOR", "FIX_SETUP"] },
            analysis: { type: Type.STRING },
            pros: { type: Type.ARRAY, items: { type: Type.STRING } },
            cons: { type: Type.ARRAY, items: { type: Type.STRING } },
            healthBenefits: { type: Type.ARRAY, items: { type: Type.STRING } },
            usageInstructions: { type: Type.STRING },
            storageTips: { type: Type.STRING },
            novaScore: { type: Type.INTEGER },
            ecoScore: { type: Type.STRING },
            calories: { type: Type.INTEGER },
            burnTimeWalking: { type: Type.STRING },
            burnTimeRunning: { type: Type.STRING },
            glycemicLoad: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH"] },
            medicineDetails: {
                type: Type.OBJECT,
                properties: {
                    dosage: { type: Type.STRING },
                    activeIngredients: { type: Type.ARRAY, items: { type: Type.STRING } },
                    warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
                    sideEffects: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            },
            recipes: {
              type: Type.ARRAY,
              items: {
                 type: Type.OBJECT,
                 properties: {
                    name: { type: Type.STRING },
                    time: { type: Type.STRING },
                    difficulty: { type: Type.STRING }
                 }
              }
            },
            ingredients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  riskLevel: { type: Type.STRING, enum: ["SAFE", "MODERATE", "HARMFUL"] },
                  description: { type: Type.STRING }
                }
              }
            },
            macros: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  value: { type: Type.NUMBER },
                  fill: { type: Type.STRING }
                }
              }
            },
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
 * Generates a personalized daily plan with Shopping List.
 */
export const generateDailyPlan = async (userProfile: UserProfile): Promise<{ mealPlan: MealPlan, workoutPlan: WorkoutPlan }> => {
  const model = "gemini-2.5-flash";
  
  const prompt = `
    Create a 1-day holistic health plan for:
    ${JSON.stringify(userProfile)}
    
    Focus on:
    1. Anti-acidity and weight management.
    2. Eye care and posture for desk workers.
    
    Include a Shopping List based on the meals.
    
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
              nutritionalHighlights: { type: Type.ARRAY, items: { type: Type.STRING } },
              shoppingList: { type: Type.ARRAY, items: { type: Type.STRING } }
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
