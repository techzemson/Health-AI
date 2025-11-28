
export enum AppView {
  ONBOARDING = 'ONBOARDING',
  DASHBOARD = 'DASHBOARD',
  PLANNER = 'PLANNER',
  SCANNER = 'SCANNER',
  TRACKER = 'TRACKER',
  COMMUNITY = 'COMMUNITY',
  PROFILE = 'PROFILE',
  HISTORY = 'HISTORY',
  PROGRESS_PHOTOS = 'PROGRESS_PHOTOS',
  CALCULATORS = 'CALCULATORS',
  CHAT = 'CHAT',
  MENTAL_HEALTH = 'MENTAL_HEALTH'
}

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other'
}

export enum ActivityLevel {
  SEDENTARY = 1.2,
  LIGHT = 1.375,
  MODERATE = 1.55,
  ACTIVE = 1.725,
  VERY_ACTIVE = 1.9
}

export type UnitSystem = 'METRIC' | 'IMPERIAL';

export type CalculatorType = 
  // General Body
  | 'BMI' | 'BMR' | 'TDEE' | 'BODY_FAT' | 'LEAN_MASS' | 'IBW' | 'FRAME_SIZE' | 'HEART_RATE_ZONE'
  // Nutrition
  | 'CALORIE_INTAKE' | 'PROTEIN' | 'CARB' | 'FAT' | 'FIBER' | 'SUGAR' | 'SODIUM' | 'VITAMIN' | 'MINERAL'
  // Disease Risk
  | 'DIABETES_RISK' | 'BP_RISK' | 'HEART_RISK' | 'KIDNEY_RISK' | 'LIVER_SCORE'
  // Fitness
  | 'STEPS_CALORIE' | 'WALKING' | 'RUNNING' | 'CYCLING' | 'SWIMMING' | 'GYM_CALORIE' | 'VO2_MAX' | 'STRENGTH_LEVEL'
  // Women's Health
  | 'DUE_DATE' | 'OVULATION' | 'PREGNANCY_CALORIE' | 'BREASTFEEDING' | 'PCOS_WEIGHT'
  // Other
  | 'METABOLIC_AGE' | 'HYDRATION_LEVEL' | 'SLEEP_DURATION' | 'STRESS_LEVEL' | 'IMMUNITY_SCORE'
  // Legacy
  | 'WATER' | 'SLEEP_DEBT' | 'SMOKING' | 'ALCOHOL' | 'WHR' | 'ORM' | 'BREATH' | 'PREGNANCY';

export interface CalculatorResult {
  value: number | string;
  unit: string;
  category?: string;
  color?: string;
  chartData?: { name: string; value: number; fill: string }[];
  actionPoints?: string[];
  detailedStats?: { label: string; value: string }[];
  verdict?: string;
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
  xp: number;
  level: number;
  badges: string[];
  bloodType?: string;
  emergencyContact?: string;
}

export interface DailyLog {
  date: string;
  mood: number; // 1-5
  sleepHours: number;
  waterIntake: number; // glasses
  symptoms: string[];
  steps: number;
}

export interface Ingredient {
  name: string;
  riskLevel: 'SAFE' | 'MODERATE' | 'HARMFUL';
  description: string;
}

export interface MacroData {
  name: string;
  value: number; // grams or percentage
  fill: string; // Color hex for chart
}

export interface RecipeSuggestion {
  name: string;
  time: string;
  difficulty: string;
}

export interface MedicineDetails {
  dosage?: string;
  activeIngredients?: string[];
  warnings?: string[];
  sideEffects?: string[];
}

export interface ScanResult {
  id: string;
  timestamp: number;
  type: 'FOOD' | 'PRODUCT' | 'MEDICINE' | 'SKIN' | 'WORKSPACE' | 'OTHER';
  imagePreview: string; // Base64
  productName?: string;
  analysis: string; // General summary
  isHarmful: boolean;
  score: number; // 0-100
  recommendation: 'BUY' | 'AVOID' | 'CONSULT_DOCTOR' | 'FIX_SETUP';
  
  // Advanced Details
  ingredients: Ingredient[];
  macros: MacroData[]; // For pie chart
  pros: string[];
  cons: string[];
  healthBenefits: string[];
  usageInstructions: string;
  
  // New Advanced Features
  novaScore?: number; // 1 (Unprocessed) to 4 (Ultra-processed)
  ecoScore?: string; // A, B, C, D, E
  calories?: number;
  burnTimeWalking?: string; // e.g., "25 mins"
  burnTimeRunning?: string; // e.g., "10 mins"
  glycemicLoad?: 'LOW' | 'MEDIUM' | 'HIGH';
  storageTips?: string;
  recipes?: RecipeSuggestion[];
  
  // Medicine Specific
  medicineDetails?: MedicineDetails;
  
  affiliateLinks?: {
    name: string;
    url: string;
    price?: string;
  }[];
}

export interface ShoppingItem {
  name: string;
  checked: boolean;
}

export interface MealPlan {
  breakfast: string;
  lunch: string;
  dinner: string;
  snacks: string;
  nutritionalHighlights: string[];
  shoppingList?: string[];
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

export interface ProgressPhoto {
  id: string;
  date: string;
  image: string;
  note: string;
}

// Nutrition Tool Types
export type NutritionToolCategory = 'PLANNER' | 'ANALYZER' | 'LIST';

export interface NutritionToolResponse {
  title: string;
  summary: string;
  stats: { label: string; value: string; color: string; icon?: string }[];
  chartData?: { name: string; value: number; fill: string }[];
  timeline?: { time: string; title: string; desc: string; color: string }[];
  checklist?: { category: string; items: string[] }[];
  actionPlan?: string[];
}
