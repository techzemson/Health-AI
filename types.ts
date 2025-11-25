export enum AppView {
  ONBOARDING = 'ONBOARDING',
  DASHBOARD = 'DASHBOARD',
  PLANNER = 'PLANNER',
  SCANNER = 'SCANNER',
  TRACKER = 'TRACKER',
  COMMUNITY = 'COMMUNITY',
  PROFILE = 'PROFILE'
}

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other'
}

export interface UserProfile {
  name: string;
  age: number;
  gender: Gender;
  weight: number; // kg
  height: number; // cm
  primaryGoals: string[];
  healthIssues: string[]; // e.g., "Acidity", "Back Pain", "Eye Strain"
  occupation: string; // e.g., "Desk Job"
  dietaryPreference: string;
  allergies: string[];
  skinType?: string;
  hairCondition?: string;
}

export interface DailyLog {
  date: string;
  mood: number; // 1-5
  sleepHours: number;
  waterIntake: number; // glasses
  symptoms: string[];
  steps: number;
}

export interface ScanResult {
  id: string;
  timestamp: number;
  type: 'FOOD' | 'PRODUCT' | 'SKIN' | 'OTHER';
  imagePreview: string;
  productName?: string;
  analysis: string;
  isHarmful: boolean;
  score: number; // 0-100
  recommendation: 'BUY' | 'AVOID' | 'CONSULT_DOCTOR';
  affiliateLinks?: {
    name: string;
    url: string;
    price?: string;
  }[];
}

export interface MealPlan {
  breakfast: string;
  lunch: string;
  dinner: string;
  snacks: string;
  nutritionalHighlights: string[];
}

export interface WorkoutPlan {
  duration: number; // minutes
  type: string;
  exercises: { name: string; description: string; duration: string }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
