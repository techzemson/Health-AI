
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Utensils, ScanLine, Activity, MessageSquare, 
  User as UserIcon, Bell, Mic, MicOff,
  Sun, BedDouble, Smile, AlertTriangle, History, Camera, TrendingUp,
  Award, Zap, Calendar, Droplets, BookOpen, Heart, ChevronRight, Share2, Plus, X as XIcon, Trash2, ShoppingCart, Play, CheckCircle2, Wind, Scale, Calculator, Monitor, Timer, Flame, Info, Construction, HeartPulse, PieChart as PieChartIcon, Target, Ruler, Dumbbell, Baby, Percent, Send, VolumeX, Moon, Headphones, Bot, MessageCircle, Cigarette, Wine, CloudMoon, ChefHat, Edit2, Save, RefreshCw, Loader2, Music, ArrowLeft, UtensilsCrossed, Search, List, Stethoscope, Droplet, Sparkles, AlertOctagon,
  BarChart2, Shield, Menu, X, ArrowRight, Brain, Footprints, Wallet, Clock, ChevronDown, ChevronUp, Bike, Waves, SmilePlus
} from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';

// Components
import Scanner from './components/Scanner';
import { UserProfile, AppView, MealPlan, WorkoutPlan, Gender, ScanResult, ShoppingItem, ActivityLevel, CalculatorType, CalculatorResult, NutritionToolCategory, NutritionToolResponse } from './types';
import { generateDailyPlan, chatWithAgent, generateToolData } from './services/geminiService';

// --- MOCK DATA ---
const INITIAL_PROFILE: UserProfile = {
  name: "Guest",
  age: 33,
  gender: Gender.MALE,
  weight: 75,
  height: 175,
  primaryGoals: ["Lose Weight", "Reduce Acidity"],
  healthIssues: ["Acidity", "Eye Strain"],
  occupation: "Desk Job",
  dietaryPreference: "Vegetarian",
  allergies: [],
  xp: 1250,
  level: 5,
  badges: ["Early Bird", "Hydration Hero"],
  bloodType: "O+",
  emergencyContact: "+1-555-0123"
};

// --- MENTAL HEALTH MOCK DATA ---
const MOOD_HISTORY = [
    { day: 'Mon', mood: 7, sleep: 6.5, anxiety: 3 },
    { day: 'Tue', mood: 6, sleep: 7, anxiety: 4 },
    { day: 'Wed', mood: 8, sleep: 8, anxiety: 2 },
    { day: 'Thu', mood: 5, sleep: 5.5, anxiety: 6 },
    { day: 'Fri', mood: 7, sleep: 7, anxiety: 3 },
    { day: 'Sat', mood: 9, sleep: 8.5, anxiety: 1 },
    { day: 'Sun', mood: 8, sleep: 8, anxiety: 2 },
];

const CALCULATOR_TOOLS: { category: string, tools: { id: CalculatorType, label: string }[] }[] = [
    { category: "General Body", tools: [{ id: 'BMI', label: 'BMI Calculator' }, { id: 'BMR', label: 'BMR Calculator' }, { id: 'TDEE', label: 'TDEE Calculator' }, { id: 'BODY_FAT', label: 'Body Fat %' }, { id: 'LEAN_MASS', label: 'Lean Body Mass' }, { id: 'IBW', label: 'Ideal Weight' }, { id: 'FRAME_SIZE', label: 'Frame Size' }, { id: 'HEART_RATE_ZONE', label: 'Heart Rate Zones' }] },
    { category: "Nutrition", tools: [{ id: 'CALORIE_INTAKE', label: 'Daily Calorie Intake' }, { id: 'PROTEIN', label: 'Protein Calculator' }, { id: 'CARB', label: 'Carb Calculator' }, { id: 'FAT', label: 'Fat Calculator' }, { id: 'FIBER', label: 'Fiber Calculator' }, { id: 'SUGAR', label: 'Sugar Intake' }, { id: 'SODIUM', label: 'Sodium Intake' }, { id: 'VITAMIN', label: 'Vitamin Needs' }, { id: 'MINERAL', label: 'Mineral Needs' }] },
    { category: "Disease-Specific", tools: [{ id: 'DIABETES_RISK', label: 'Diabetes Risk' }, { id: 'BP_RISK', label: 'Blood Pressure Risk' }, { id: 'HEART_RISK', label: 'Heart Disease Risk' }, { id: 'KIDNEY_RISK', label: 'Kidney Health Risk' }, { id: 'LIVER_SCORE', label: 'Liver Health Score' }] },
    { category: "Fitness", tools: [{ id: 'STEPS_CALORIE', label: 'Steps to Calories' }, { id: 'WALKING', label: 'Walking Calories' }, { id: 'RUNNING', label: 'Running Calories' }, { id: 'CYCLING', label: 'Cycling Calories' }, { id: 'SWIMMING', label: 'Swimming Calories' }, { id: 'GYM_CALORIE', label: 'Gym Workout Calories' }, { id: 'VO2_MAX', label: 'VO2 Max' }, { id: 'STRENGTH_LEVEL', label: 'Strength Level' }] },
    { category: "Women's Health", tools: [{ id: 'DUE_DATE', label: 'Pregnancy Due Date' }, { id: 'OVULATION', label: 'Ovulation & Fertility' }, { id: 'PREGNANCY_CALORIE', label: 'Pregnancy Calories' }, { id: 'BREASTFEEDING', label: 'Breastfeeding Nutrition' }, { id: 'PCOS_WEIGHT', label: 'PCOS Weight Loss' }] },
    { category: "Other", tools: [{ id: 'METABOLIC_AGE', label: 'Metabolic Age' }, { id: 'HYDRATION_LEVEL', label: 'Hydration Level' }, { id: 'SLEEP_DURATION', label: 'Sleep Duration' }, { id: 'STRESS_LEVEL', label: 'Stress Level' }, { id: 'IMMUNITY_SCORE', label: 'Immunity Score' }] }
];

const DashboardCard = ({ title, value, unit, icon: Icon, color, subValue }: any) => (
  <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition">
    <div className="flex justify-between items-start">
      <div>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</h3>
        <p className="mt-1 text-2xl font-black text-gray-900">{value} <span className="text-sm text-gray-400 font-medium">{unit}</span></p>
      </div>
      <Icon size={20} className={color.replace('text-', 'text-opacity-80 ')} />
    </div>
    <div className="mt-2">{subValue}</div>
  </div>
);

const VoiceAgent = ({ onSpeechResult }: { onSpeechResult: (text: string) => void }) => {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onSpeechResult(transcript);
        setListening(false);
      };

      recognitionRef.current.onerror = () => setListening(false);
      recognitionRef.current.onend = () => setListening(false);
    }
  }, [onSpeechResult]);

  const toggleListen = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    } else {
      recognitionRef.current?.start();
      setListening(true);
    }
  };

  return (
    <button 
      onClick={toggleListen}
      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 ${listening ? 'bg-red-500 animate-pulse' : 'bg-brand-600'}`}
    >
      {listening ? <MicOff className="text-white" size={20} /> : <Mic className="text-white" size={20} />}
    </button>
  );
};


const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [showScanner, setShowScanner] = useState(false);
  const [dailyPlan, setDailyPlan] = useState<{meal: MealPlan | null, workout: WorkoutPlan | null}>({meal: null, workout: null});
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // New State Features
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [selectedScan, setSelectedScan] = useState<ScanResult | null>(null);
  const [water, setWater] = useState(4);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [workoutTimer, setWorkoutTimer] = useState(0);

  // Interaction States
  const [showBreathingModal, setShowBreathingModal] = useState(false);
  const [isBreathHolding, setIsBreathHolding] = useState(false);
  
  // Sleep Sound
  const audioCtxRef = useRef<AudioContext | null>(null);
  const brownNoiseNodeRef = useRef<AudioNode | null>(null);
  const [isPlayingNoise, setIsPlayingNoise] = useState(false);

  // Calculator Suite State
  const [activeCalculator, setActiveCalculator] = useState<CalculatorType>('BMI');
  const [activeCalcCategory, setActiveCalcCategory] = useState<string>("General Body");
  const [calcActivity, setCalcActivity] = useState<ActivityLevel>(ActivityLevel.SEDENTARY);
  const [calculatorInputs, setCalculatorInputs] = useState({ 
    weight: 75, height: 175, age: 33, gender: Gender.MALE,
    waist: 90, hip: 100, neck: 38, wrist: 17,
    steps: 5000, distance: 3, duration: 30, heartRate: 70,
    systolic: 120, diastolic: 80, glucose: 90,
    lastPeriod: '2023-01-01', cycleLength: 28,
    sleepHours: 7, stressLevel: 5,
    smoker: false, diabetesHistory: false, alcoholDrinks: 2,
    benchPress: 60, squat: 80, deadlift: 100,
    bedTime: '23:00', wakeTime: '07:00'
  });
  const [calculatedResult, setCalculatedResult] = useState<CalculatorResult | null>(null);
  const [isMobileCalcView, setIsMobileCalcView] = useState(false);

  // Mental Health State
  const [currentMood, setCurrentMood] = useState(5);
  const [moodTags, setMoodTags] = useState<string[]>([]);
  const [moodJournal, setMoodJournal] = useState("");
  const [moodSleep, setMoodSleep] = useState(7);
  const [moodAnalysis, setMoodAnalysis] = useState<NutritionToolResponse | null>(null); // Reusing type
  const [isAnalyzingMood, setIsAnalyzingMood] = useState(false);

  // Initialize Data
  useEffect(() => {
    if (!dailyPlan.meal) handleGeneratePlan();
  }, []);

  useEffect(() => {
    let interval: any;
    if (workoutTimer > 0) {
      interval = setInterval(() => setWorkoutTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [workoutTimer]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory, isTyping]);
  
  const toggleBrownNoise = () => {
      if (isPlayingNoise) {
          audioCtxRef.current?.close();
          setIsPlayingNoise(false);
      } else {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioContext();
          const bufferSize = 2 * ctx.sampleRate;
          const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const output = noiseBuffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
              const white = Math.random() * 2 - 1;
              output[i] = (0 + (0.02 * white)) / 1.02;
              output[i] *= 3.5; 
          }
          const noise = ctx.createBufferSource();
          noise.buffer = noiseBuffer;
          noise.loop = true;
          noise.connect(ctx.destination);
          noise.start(0);
          
          audioCtxRef.current = ctx;
          brownNoiseNodeRef.current = noise;
          setIsPlayingNoise(true);
      }
  };

  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true);
    try {
      const plan = await generateDailyPlan(profile);
      setDailyPlan(plan);
      if (plan.mealPlan.shoppingList) {
        setShoppingList(plan.mealPlan.shoppingList.map(name => ({ name, checked: false })));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleSaveScan = (result: ScanResult) => { setScanHistory(prev => [result, ...prev]); };

  const handleAnalyzeMood = async () => {
      setIsAnalyzingMood(true);
      setMoodAnalysis(null);
      const moodInputStr = `Current Mood: ${currentMood}/10. Tags: ${moodTags.join(', ')}. Sleep: ${moodSleep}hrs. Notes: ${moodJournal}. History: Last 7 days avg mood 7/10.`;
      try {
          // Reusing the generic tool generator but with specific context
          const result = await generateToolData("Advanced Mood Tracker", "ANALYZER", moodInputStr, profile);
          setMoodAnalysis(result);
      } catch (e) { console.error(e); } finally { setIsAnalyzingMood(false); }
  };

  const runCalculation = () => {
    let result: CalculatorResult = { value: 0, unit: '', color: '#000' };
    const hM = calculatorInputs.height / 100;
    const wKg = calculatorInputs.weight;
    const age = calculatorInputs.age;
    const gender = calculatorInputs.gender;

    // Helper for BMR (Mifflin-St Jeor)
    const calculateBMR = () => gender === Gender.MALE 
        ? (10 * wKg) + (6.25 * calculatorInputs.height) - (5 * age) + 5
        : (10 * wKg) + (6.25 * calculatorInputs.height) - (5 * age) - 161;

    switch (activeCalculator) {
        // --- GENERAL BODY ---
        case 'BMI':
            const bmi = wKg / (hM * hM);
            result = {
                value: bmi.toFixed(1), unit: 'BMI',
                category: bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese',
                color: bmi < 18.5 ? '#3b82f6' : bmi < 25 ? '#22c55e' : bmi < 30 ? '#eab308' : '#ef4444',
                chartData: [{ name: 'BMI', value: bmi, fill: '#0284c7' }, { name: 'Max', value: 40 - bmi, fill: '#e5e7eb' }],
                actionPoints: bmi > 25 ? ['Reduce daily calories by 300', 'Walk 30 mins daily', 'Reduce sugar intake'] : ['Maintain balanced diet', 'Strength training 3x week'],
                detailedStats: [
                    { label: 'Healthy Range', value: '18.5 - 24.9' },
                    { label: 'Ideal Weight', value: `${(18.5 * hM * hM).toFixed(1)} - ${(24.9 * hM * hM).toFixed(1)} kg` },
                    { label: 'Prime Score', value: (bmi / 25).toFixed(2) }
                ]
            };
            break;
        case 'BMR':
            const bmr = calculateBMR();
            result = {
                value: Math.round(bmr), unit: 'kcal/day',
                category: 'Resting Metabolic Rate',
                color: '#8b5cf6',
                chartData: [{ name: 'BMR', value: bmr, fill: '#8b5cf6' }, { name: 'Other', value: 1000, fill: '#e5e7eb' }],
                actionPoints: ['This is calories burned if you slept all day', 'Do not eat below this number'],
                detailedStats: [{ label: 'Hourly Burn', value: `${Math.round(bmr/24)} kcal` }]
            };
            break;
        case 'TDEE':
            const tdee = calculateBMR() * calcActivity;
            result = {
                value: Math.round(tdee), unit: 'kcal/day',
                category: 'Maintenance Calories',
                color: '#f59e0b',
                chartData: [{ name: 'TDEE', value: tdee, fill: '#f59e0b' }, { name: 'Rest', value: 3500-tdee, fill: '#f3f4f6' }],
                actionPoints: ['Eat this amount to maintain weight', 'Subtract 500 to lose 0.5kg/week'],
                detailedStats: [
                    { label: 'Weight Loss', value: `${Math.round(tdee - 500)} kcal` },
                    { label: 'Weight Gain', value: `${Math.round(tdee + 500)} kcal` }
                ]
            };
            break;
        case 'BODY_FAT':
             // US Navy Method (Estimate)
             const log = Math.log10;
             let bodyFat = 0;
             if (gender === Gender.MALE) {
                bodyFat = 86.010 * log(calculatorInputs.waist - calculatorInputs.neck) - 70.041 * log(calculatorInputs.height) + 36.76;
             } else {
                bodyFat = 163.205 * log(calculatorInputs.waist + calculatorInputs.hip - calculatorInputs.neck) - 97.684 * log(calculatorInputs.height) - 78.387;
             }
             result = {
                 value: bodyFat.toFixed(1), unit: '%',
                 category: bodyFat < 14 ? 'Athletic' : bodyFat < 24 ? 'Fitness' : 'Average',
                 color: bodyFat < 24 ? '#10b981' : '#f43f5e',
                 chartData: [{ name: 'Fat', value: bodyFat, fill: '#f43f5e' }, { name: 'Lean', value: 100-bodyFat, fill: '#10b981' }],
                 actionPoints: ['Prioritize protein intake', 'Include resistance training'],
                 detailedStats: [
                     { label: 'Fat Mass', value: `${((bodyFat/100)*wKg).toFixed(1)} kg` },
                     { label: 'Lean Mass', value: `${(wKg - (bodyFat/100)*wKg).toFixed(1)} kg` }
                 ]
             }
             break;
        case 'LEAN_MASS': // Boer Formula
             let lbm = gender === Gender.MALE ? (0.407 * wKg) + (0.267 * calculatorInputs.height) - 19.2 : (0.252 * wKg) + (0.473 * calculatorInputs.height) - 48.3;
             result = { value: lbm.toFixed(1), unit: 'kg', category: 'Lean Mass', color: '#10b981', detailedStats: [{label: 'Body Fat Mass', value: `${(wKg - lbm).toFixed(1)} kg`}] };
             break;
        case 'IBW': // Robinson Formula
             let ibw = gender === Gender.MALE ? 52 + 1.9 * ((calculatorInputs.height/2.54) - 60) : 49 + 1.7 * ((calculatorInputs.height/2.54) - 60);
             result = { value: ibw.toFixed(1), unit: 'kg', category: 'Ideal Weight', color: '#3b82f6', detailedStats: [{label: 'Healthy Range', value: '± 5kg'}] };
             break;
        case 'FRAME_SIZE': 
             const ratio = calculatorInputs.height / calculatorInputs.wrist;
             let frame = '';
             if (gender === Gender.MALE) frame = ratio > 10.4 ? 'Small' : ratio < 9.6 ? 'Large' : 'Medium';
             else frame = ratio > 11 ? 'Small' : ratio < 10.1 ? 'Large' : 'Medium';
             result = { value: frame, unit: 'Frame', category: 'Body Structure', color: '#8b5cf6' };
             break;
        case 'HEART_RATE_ZONE':
             const maxHR = 220 - age;
             result = { value: `${Math.round(maxHR * 0.6)} - ${Math.round(maxHR * 0.8)}`, unit: 'bpm', category: 'Fat Burn Zone', color: '#ef4444', detailedStats: [{label: 'Max HR', value: `${maxHR} bpm`}, {label: 'Cardio Zone', value: `${Math.round(maxHR * 0.7)} - ${Math.round(maxHR * 0.85)} bpm`}] };
             break;

        // --- NUTRITION ---
        case 'CALORIE_INTAKE':
        case 'PROTEIN':
        case 'CARB':
        case 'FAT':
        case 'SUGAR':
        case 'SODIUM':
        case 'FIBER':
             const tdeeVal = calculateBMR() * calcActivity;
             const protein = wKg * (calcActivity > 1.5 ? 2.0 : 1.2);
             const fats = (tdeeVal * 0.25) / 9;
             const carbs = (tdeeVal - (protein * 4) - (fats * 9)) / 4;
             if (activeCalculator === 'PROTEIN') result = { value: Math.round(protein), unit: 'g/day', color: '#3b82f6', detailedStats: [{label: 'Min', value: `${Math.round(wKg * 0.8)}g`}, {label: 'High Athlete', value: `${Math.round(wKg * 2.2)}g`}] };
             else if (activeCalculator === 'CARB') result = { value: Math.round(carbs), unit: 'g/day', color: '#eab308' };
             else if (activeCalculator === 'FAT') result = { value: Math.round(fats), unit: 'g/day', color: '#ef4444' };
             else if (activeCalculator === 'FIBER') result = { value: Math.round(tdeeVal / 1000 * 14), unit: 'g/day', color: '#22c55e', category: 'Digestive Health' };
             else if (activeCalculator === 'SUGAR') result = { value: Math.round((tdeeVal * 0.05) / 4), unit: 'g/day', color: '#f97316', category: 'Max Added Sugar' };
             else if (activeCalculator === 'SODIUM') result = { value: 2300, unit: 'mg/day', color: '#64748b', category: 'Max Limit' };
             else result = { value: Math.round(tdeeVal), unit: 'kcal/day', color: '#f59e0b', chartData: [{name: 'Protein', value: protein*4, fill: '#3b82f6'}, {name: 'Carbs', value: carbs*4, fill: '#eab308'}, {name: 'Fats', value: fats*9, fill: '#ef4444'}] };
             break;
        case 'VITAMIN':
        case 'MINERAL':
             result = { value: 'Varied', unit: 'Diet', category: 'Eat the Rainbow', actionPoints: ['Consult AI Nutritionist', 'Eat 5 fruits/veg daily'] }; // Simplified
             break;

        // --- DISEASE RISK ---
        case 'DIABETES_RISK':
             let dScore = 0;
             if (age > 45) dScore += 2;
             if (wKg / (hM * hM) > 25) dScore += 2;
             if (calculatorInputs.waist > (gender === Gender.MALE ? 102 : 88)) dScore += 2;
             if (calculatorInputs.diabetesHistory) dScore += 3;
             result = { value: dScore > 4 ? 'High Risk' : 'Low Risk', unit: 'Score', color: dScore > 4 ? '#ef4444' : '#22c55e', category: 'Screening Suggestion', actionPoints: ['Check fasting glucose', 'Reduce sugar'] };
             break;
        case 'BP_RISK':
             const sys = calculatorInputs.systolic;
             const dia = calculatorInputs.diastolic;
             let bpCat = 'Normal';
             if (sys > 180 || dia > 120) bpCat = 'Hypertensive Crisis';
             else if (sys >= 140 || dia >= 90) bpCat = 'High BP (Stage 2)';
             else if (sys >= 130 || dia >= 80) bpCat = 'High BP (Stage 1)';
             else if (sys >= 120 && sys < 130 && dia < 80) bpCat = 'Elevated';
             result = { value: bpCat, unit: 'Category', color: bpCat === 'Normal' ? '#22c55e' : '#ef4444', detailedStats: [{label: 'Sys', value: sys.toString()}, {label: 'Dia', value: dia.toString()}] };
             break;
        case 'HEART_RISK':
             let hScore = 0;
             if (age > 50) hScore += 2;
             if (calculatorInputs.smoker) hScore += 4;
             if (calculatorInputs.systolic > 140) hScore += 2;
             if (calculatorInputs.diabetesHistory) hScore += 3;
             result = { value: hScore > 5 ? 'Elevated' : 'Low', unit: 'Risk', color: hScore > 5 ? '#f97316' : '#22c55e', category: 'Framingham Estimate' };
             break;
        case 'KIDNEY_RISK':
             // Simple observation
             result = { value: 'Consult Doc', unit: 'Check', category: 'Clinical Test Needed', actionPoints: ['Monitor BP', 'Hydrate well'] };
             break;
        case 'LIVER_SCORE':
             let lScore = 0;
             if (calculatorInputs.alcoholDrinks > 14) lScore += 3;
             if (wKg / (hM * hM) > 30) lScore += 2;
             result = { value: lScore > 3 ? 'Monitor' : 'Healthy', unit: 'Status', color: lScore > 3 ? '#eab308' : '#22c55e' };
             break;
        
        // --- FITNESS ---
        case 'STEPS_CALORIE': // Approx 0.04 kcal per step
             result = { value: Math.round(calculatorInputs.steps * 0.04), unit: 'kcal', category: 'Walking Burn', color: '#10b981' };
             break;
        case 'RUNNING': // MET ~ 9.8 for 6mph
             result = { value: Math.round(9.8 * wKg * (calculatorInputs.duration / 60)), unit: 'kcal', category: 'Running Burn', color: '#f59e0b' };
             break;
        case 'CYCLING': // MET ~ 7.5
             result = { value: Math.round(7.5 * wKg * (calculatorInputs.duration / 60)), unit: 'kcal', category: 'Cycling Burn', color: '#0ea5e9' };
             break;
        case 'SWIMMING': // MET ~ 6
             result = { value: Math.round(6 * wKg * (calculatorInputs.duration / 60)), unit: 'kcal', category: 'Swimming Burn', color: '#3b82f6' };
             break;
        case 'WALKING': // MET ~ 3.5
             result = { value: Math.round(3.5 * wKg * (calculatorInputs.duration / 60)), unit: 'kcal', category: 'Walking Burn', color: '#10b981' };
             break;
        case 'GYM_CALORIE': // MET ~ 5
             result = { value: Math.round(5 * wKg * (calculatorInputs.duration / 60)), unit: 'kcal', category: 'Weights Burn', color: '#6366f1' };
             break;
        case 'VO2_MAX': // Estimate from RHR
             const vo2 = 15.3 * (220 - age) / calculatorInputs.heartRate;
             result = { value: vo2.toFixed(1), unit: 'ml/kg/min', category: 'Cardio Fitness', color: '#8b5cf6' };
             break;
        case 'STRENGTH_LEVEL':
             const totalLift = calculatorInputs.benchPress + calculatorInputs.squat + calculatorInputs.deadlift;
             const ratioLift = totalLift / wKg;
             result = { value: totalLift, unit: 'kg Total', category: ratioLift > 4 ? 'Elite' : ratioLift > 3 ? 'Advanced' : 'Novice', color: '#ec4899', detailedStats: [{label: 'Ratio', value: ratioLift.toFixed(2)}] };
             break;

        // --- WOMEN'S ---
        case 'DUE_DATE':
             const lmp = new Date(calculatorInputs.lastPeriod);
             lmp.setDate(lmp.getDate() + 280);
             result = { value: lmp.toLocaleDateString(), unit: 'Date', category: 'Estimated Delivery', color: '#db2777', detailedStats: [{label: 'Trimester', value: 'First'}] };
             break;
        case 'OVULATION':
             const ov = new Date(calculatorInputs.lastPeriod);
             ov.setDate(ov.getDate() + 14);
             result = { value: ov.toLocaleDateString(), unit: 'Date', category: 'Peak Fertility', color: '#ec4899', actionPoints: ['Fertile window is 5 days before this'] };
             break;
        case 'PREGNANCY_CALORIE':
             result = { value: Math.round(calculateBMR() * calcActivity + 300), unit: 'kcal/day', category: '2nd Trimester', color: '#f472b6', detailedStats: [{label: '3rd Trimester', value: '+450 kcal'}] };
             break;
        case 'BREASTFEEDING':
             result = { value: Math.round(calculateBMR() * calcActivity + 500), unit: 'kcal/day', category: 'Nursing Needs', color: '#d946ef' };
             break;
        case 'PCOS_WEIGHT':
             result = { value: Math.round(calculateBMR() * 0.9 * calcActivity), unit: 'kcal/day', category: 'PCOS Adjusted', color: '#8b5cf6', actionPoints: ['Low GI Diet', 'Inositol Supplement'] };
             break;

        // --- OTHER ---
        case 'METABOLIC_AGE':
             const metAge = age + (25 - (wKg / (hM * hM))); // Very rough estimate
             result = { value: Math.round(metAge), unit: 'Years', category: metAge < age ? 'Excellent' : 'Needs Work', color: metAge < age ? '#22c55e' : '#f97316' };
             break;
        case 'HYDRATION_LEVEL':
             // Simple check
             result = { value: 'Check Urine', unit: 'Color', category: 'Pale Yellow is Goal', actionPoints: ['Drink if thirsty', 'Check skin elasticity'] };
             break;
        case 'SLEEP_DURATION':
             // Simple diff
             result = { value: '8h 0m', unit: 'Time', category: 'Recommended', detailedStats: [{label: 'Cycles', value: '5-6'}] };
             break;
        case 'STRESS_LEVEL':
             result = { value: calculatorInputs.stressLevel, unit: '/ 10', category: calculatorInputs.stressLevel > 7 ? 'High' : 'Managed', color: calculatorInputs.stressLevel > 7 ? '#ef4444' : '#22c55e' };
             break;
        case 'IMMUNITY_SCORE':
             result = { value: 'Good', unit: 'Status', category: 'Baseline', actionPoints: ['Vitamin C', 'Zinc', 'Sleep 8h'] };
             break;

        default:
            result = { value: 'N/A', unit: '', category: 'Select a tool' };
    }
    setCalculatedResult(result);
  };
  
  const handleSendMessage = async () => {
      if (!chatInput.trim()) return;
      const userMsg = { role: 'user' as const, text: chatInput, id: Date.now().toString(), timestamp: Date.now() };
      setChatHistory(prev => [...prev, userMsg]);
      setChatInput("");
      setIsTyping(true);
      try {
          const apiHistory = chatHistory.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
          const response = await chatWithAgent(apiHistory, userMsg.text);
          const botMsg = { role: 'model' as const, text: response, id: (Date.now() + 1).toString(), timestamp: Date.now() };
          setChatHistory(prev => [...prev, botMsg]);
      } catch (e) {
          console.error(e);
      } finally {
          setIsTyping(false);
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex text-gray-900 font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen fixed z-20">
         <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand-200">H</div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-brand-teal">Health AI</span>
        </div>
        <nav className="flex-1 px-4 space-y-1.5 mt-4">
          {[
            { id: AppView.DASHBOARD, icon: LayoutDashboard, label: 'Dashboard' },
            { id: AppView.MENTAL_HEALTH, icon: Brain, label: 'Mental Health' },
            { id: AppView.CALCULATORS, icon: Calculator, label: 'Calculators' },
            { id: AppView.CHAT, icon: MessageSquare, label: 'AI Assistant' },
            { id: AppView.HISTORY, icon: History, label: 'History' },
          ].map((item) => (
            <button key={item.id} onClick={() => { setView(item.id); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${view === item.id ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:bg-gray-50'}`}>
              <item.icon size={18} /> {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto w-full">
        
        {/* --- VIEW: MENTAL HEALTH (MOOD TRACKER) --- */}
        {view === AppView.MENTAL_HEALTH && (
            <div className="space-y-6 animate-in fade-in h-full">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Brain className="text-purple-600"/> Mental Wellness</h2>
                        <p className="text-gray-500">Track mood, identify triggers, and find balance.</p>
                    </div>
                    <button onClick={handleAnalyzeMood} disabled={isAnalyzingMood} className="flex items-center gap-2 bg-purple-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-purple-700 transition shadow-lg shadow-purple-200 disabled:opacity-50">
                        {isAnalyzingMood ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18}/>} Analyze Patterns
                    </button>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* LEFT COLUMN: LOGGER */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2"><SmilePlus className="text-purple-500" size={20}/> Daily Check-in</h3>
                            
                            {/* Mood Slider */}
                            <div className="mb-8 text-center">
                                <span className="text-4xl mb-2 block">{currentMood <= 3 ? '😔' : currentMood <= 6 ? '😐' : '😄'}</span>
                                <input type="range" min="1" max="10" value={currentMood} onChange={(e) => setCurrentMood(+e.target.value)} className="w-full accent-purple-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"/>
                                <div className="flex justify-between text-xs font-bold text-gray-400 mt-2"><span>Low</span><span>Okay</span><span>Great</span></div>
                                <p className="text-purple-600 font-bold mt-2 text-lg">{currentMood}/10</p>
                            </div>

                            {/* Tags */}
                            <div className="mb-6">
                                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">I'm feeling...</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Anxious', 'Tired', 'Motivated', 'Stressed', 'Grateful', 'Angry', 'Calm', 'Lonely'].map(tag => (
                                        <button key={tag} onClick={() => setMoodTags(p => p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag])} className={`px-3 py-1.5 rounded-full text-xs font-bold transition border ${moodTags.includes(tag) ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-white text-gray-500 border-gray-200 hover:border-purple-200'}`}>
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Sleep (Hours)</label>
                                <input type="number" value={moodSleep} onChange={(e) => setMoodSleep(+e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900"/>
                            </div>

                            <textarea value={moodJournal} onChange={(e) => setMoodJournal(e.target.value)} placeholder="What's on your mind?" className="w-full h-24 p-3 bg-gray-50 border border-gray-200 rounded-xl resize-none text-sm mb-4 focus:ring-2 focus:ring-purple-200 outline-none"></textarea>
                            
                            <button className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition">Log Entry</button>
                        </div>
                    </div>

                    {/* MIDDLE/RIGHT: DASHBOARD */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* CHART SECTION */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-4">Weekly Mood Flow</h4>
                                <div className="h-40 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={MOOD_HISTORY}>
                                            <defs>
                                                <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10}}/>
                                            <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
                                            <Area type="monotone" dataKey="mood" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorMood)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-4">Sleep vs Anxiety</h4>
                                <div className="h-40 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={MOOD_HISTORY}>
                                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10}}/>
                                            <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '12px'}}/>
                                            <Bar dataKey="sleep" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="anxiety" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* AI ANALYSIS RESULT */}
                        {moodAnalysis ? (
                            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center shrink-0"><Brain size={24}/></div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">{moodAnalysis.title}</h3>
                                        <p className="text-gray-500 text-sm leading-relaxed mt-1">{moodAnalysis.summary}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                    {moodAnalysis.stats.map((stat, i) => (
                                        <div key={i} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                                            <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">{stat.label}</p>
                                            <p className="text-lg font-black" style={{color: stat.color}}>{stat.value}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid md:grid-cols-2 gap-8">
                                    {moodAnalysis.actionPlan && (
                                        <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
                                            <h4 className="font-bold text-purple-900 mb-4 flex items-center gap-2"><Target size={18}/> Suggested Actions</h4>
                                            <ul className="space-y-3">
                                                {moodAnalysis.actionPlan.map((action, i) => (
                                                    <li key={i} className="flex items-start gap-3 text-sm text-purple-800">
                                                        <span className="w-5 h-5 bg-purple-200 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{i+1}</span>
                                                        {action}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {moodAnalysis.checklist && (
                                        <div>
                                            <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><List size={18}/> Insights</h4>
                                            {moodAnalysis.checklist.map((group, i) => (
                                                <div key={i} className="mb-4">
                                                    <h5 className="text-xs font-bold text-gray-400 uppercase mb-2">{group.category}</h5>
                                                    <div className="flex flex-wrap gap-2">
                                                        {group.items.map((item, j) => (
                                                            <span key={j} className="px-3 py-1 bg-gray-100 rounded-lg text-xs font-medium text-gray-600 border border-gray-200">{item}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-50 rounded-3xl border border-dashed border-gray-200 p-10 text-center flex flex-col items-center justify-center">
                                <Sparkles className="text-gray-300 mb-4" size={48} />
                                <h3 className="font-bold text-gray-400 text-lg">AI Insights Ready</h3>
                                <p className="text-gray-400 text-sm max-w-xs mt-2">Log your data and click "Analyze Patterns" to reveal hidden correlations, burnout risks, and personalized mental health advice.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* --- VIEW: DASHBOARD --- */}
        {view === AppView.DASHBOARD && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-black text-gray-900">Hello, {profile.name} 👋</h1>
                <p className="text-gray-500 mt-1">You're on a <span className="text-brand-600 font-bold">5-day streak!</span> Keep the momentum going.</p>
              </div>
              <button className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 relative"><Bell size={20} className="text-gray-600" /><span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span></button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setShowWorkoutModal(true); setWorkoutTimer(300); }} className="p-3 bg-orange-50 rounded-2xl border border-orange-100 flex items-center justify-center gap-2 text-orange-700 font-bold hover:bg-orange-100 transition"><Zap size={18} /> Quick Workout</button>
              <button onClick={() => setWater(w => Math.min(w + 1, 8))} className="p-3 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-center gap-2 text-blue-700 font-bold hover:bg-blue-100 transition"><Droplets size={18} /> Log Water</button>
            </div>
            <button onClick={() => setShowScanner(true)} className="w-full py-4 bg-gradient-to-r from-brand-600 to-brand-500 rounded-2xl shadow-lg shadow-brand-200 flex items-center justify-center gap-3 text-white font-bold text-lg transform transition active:scale-95 hover:shadow-xl">
                <ScanLine size={24} className="animate-pulse" /> Universal Health Scan
            </button>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <DashboardCard title="WEIGHT" value={`${profile.weight}`} unit="kg" icon={Scale} color="text-gray-900" subValue={<span className="text-green-500 text-xs font-bold flex items-center">📉 0.5kg</span>} />
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden">
                <div className="flex justify-between items-start z-10"><div><h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Hydration</h3><div className="mt-1 flex items-baseline gap-1"><span className="text-3xl font-black text-gray-900">{water}</span><span className="text-sm font-medium text-gray-400">/ 8</span></div></div><Droplets size={20} className="text-blue-500" /></div>
                <div className="w-full bg-gray-100 h-2 rounded-full mt-4 z-10 overflow-hidden"><div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${(water / 8) * 100}%` }}></div></div>
              </div>
              <button onClick={() => setView(AppView.CALCULATORS)} className="bg-brand-50 p-5 rounded-3xl shadow-sm border border-brand-100 flex flex-col justify-between text-left hover:shadow-md transition group">
                 <div className="flex justify-between items-start w-full"><div><h3 className="text-xs font-bold text-brand-400 uppercase tracking-wider">Calculators</h3><p className="mt-1 text-lg font-black text-brand-900">Health Tools</p></div><Calculator size={20} className="text-brand-500" /></div>
                 <p className="text-xs text-brand-600 font-bold mt-2 group-hover:underline">BMI, TDEE, Body Fat</p>
              </button>
              <div className="bg-green-50 p-5 rounded-3xl shadow-sm border border-green-100 flex flex-col justify-between"><div className="flex justify-between items-start"><div><h3 className="text-xs font-bold text-green-600 uppercase tracking-wider">Mood</h3><p className="mt-1 text-2xl font-black text-green-900">Good</p></div><Smile size={20} className="text-green-600" /></div><p className="text-xs text-green-700 font-bold mt-2">Acidity: Low</p></div>
            </div>
            <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl">
               <div className="absolute top-0 right-0 p-8 opacity-10"><Activity size={120} /></div>
               <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 bg-yellow-400/20 backdrop-blur-md px-3 py-1 rounded-full border border-yellow-400/30 mb-4"><AlertTriangle size={14} className="text-yellow-300" /><span className="text-xs font-bold text-yellow-100">High Sedentary Risk</span></div>
                  <h3 className="text-2xl font-bold mb-2">Spine Health Alert</h3>
                  <p className="text-brand-100 max-w-md mb-6">You've been sedentary for 4 hours. Start the active timer to improve spine health and reduce back pain.</p>
                  <div className="flex items-center gap-4">
                      <button onClick={() => { setShowWorkoutModal(true); setWorkoutTimer(300); }} className="px-6 py-3 bg-white text-brand-700 font-bold rounded-xl hover:bg-brand-50 transition shadow-lg flex items-center gap-2"><Play size={20} className="fill-current" /> Start 5-min Stretch</button>
                  </div>
               </div>
            </div>
            <div className="bg-indigo-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl flex items-center justify-between">
                <div className="relative z-10">
                    <h3 className="text-xl font-bold mb-1 flex items-center gap-2"><Moon size={20} className="text-indigo-300"/> Sleep Aid</h3>
                    <p className="text-indigo-200 text-sm mb-4">Brown noise for deep focus or sleep.</p>
                    <button onClick={toggleBrownNoise} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition ${isPlayingNoise ? 'bg-indigo-500 text-white' : 'bg-white text-indigo-900'}`}>{isPlayingNoise ? <VolumeX size={16}/> : <Headphones size={16}/>}{isPlayingNoise ? 'Stop Noise' : 'Play Brown Noise'}</button>
                </div>
            </div>
          </div>
        )}

        {/* --- VIEW: CHAT --- */}
        {view === AppView.CHAT && (
            <div className="flex flex-col h-[calc(100vh-6rem)] bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-600 rounded-full flex items-center justify-center text-white"><Bot size={20}/></div>
                        <div><h3 className="font-bold text-gray-900">Health AI Assistant</h3><p className="text-xs text-green-600 font-bold flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Online</p></div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatHistory.length === 0 && (
                        <div className="text-center py-10">
                            <Bot size={48} className="mx-auto text-gray-200 mb-4"/>
                            <p className="text-gray-400 font-medium">Ask me anything about your health!</p>
                            <div className="flex flex-wrap gap-2 justify-center mt-6">
                                {['Lose 5kg', 'Cure Acidity', 'High Protein Veg', 'Eye Strain Relief', 'Fix Posture'].map(t => (
                                    <button key={t} onClick={() => setChatInput(t)} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs font-bold text-gray-600 hover:bg-brand-50 hover:border-brand-200 transition">{t}</button>
                                ))}
                            </div>
                        </div>
                    )}
                    {chatHistory.map(msg => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-brand-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}>
                                {msg.role === 'model' ? (
                                    <div className="markdown-body space-y-2">
                                        {msg.text.split('\n').map((line, i) => {
                                            if (line.startsWith('•')) return <li key={i} className="ml-4">{line.replace('•', '')}</li>
                                            if (line.includes('**')) return <p key={i} dangerouslySetInnerHTML={{__html: line.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')}}></p>
                                            return <p key={i}>{line}</p>
                                        })}
                                    </div>
                                ) : msg.text}
                            </div>
                        </div>
                    ))}
                    {isTyping && <div className="flex justify-start"><div className="bg-gray-100 p-4 rounded-2xl rounded-bl-none"><Loader2 size={16} className="animate-spin text-gray-400"/></div></div>}
                    <div ref={chatEndRef}></div>
                </div>
                <div className="p-4 border-t bg-white flex gap-2">
                    <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendMessage()} placeholder="Type a message..." className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 focus:ring-2 focus:ring-brand-200 outline-none" />
                    <button onClick={handleSendMessage} disabled={!chatInput.trim()} className="p-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50"><Send size={20}/></button>
                </div>
            </div>
        )}

        {/* --- VIEW: CALCULATORS --- */}
        {view === AppView.CALCULATORS && (
            <div className="h-full flex flex-col md:flex-row gap-6">
                <div className={`w-full md:w-64 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col ${isMobileCalcView ? 'hidden md:flex' : 'flex'}`}>
                     <div className="p-4 bg-gray-50 border-b font-bold text-gray-500 text-xs uppercase tracking-wider">Select Tool</div>
                     <div className="flex-1 overflow-y-auto">
                        {CALCULATOR_TOOLS.map((cat, i) => (
                            <div key={i} className="border-b border-gray-50 last:border-0">
                                <button onClick={() => setActiveCalcCategory(activeCalcCategory === cat.category ? "" : cat.category)} className="w-full px-4 py-3 text-xs font-bold text-gray-400 bg-gray-50 flex items-center justify-between hover:bg-gray-100">
                                    {cat.category} {activeCalcCategory === cat.category ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                                </button>
                                {activeCalcCategory === cat.category && (
                                    <div className="bg-white">
                                        {cat.tools.map(t => (
                                            <button key={t.id} onClick={() => { setActiveCalculator(t.id); setIsMobileCalcView(true); setCalculatedResult(null); }} className={`w-full text-left p-3 pl-6 text-sm font-medium border-l-4 hover:bg-gray-50 transition flex items-center gap-2 ${activeCalculator === t.id ? 'border-brand-600 text-brand-700 bg-brand-50' : 'border-transparent text-gray-600'}`}>
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                     </div>
                </div>
                <div className={`flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 ${!isMobileCalcView ? 'hidden md:block' : 'block'}`}>
                     <button onClick={() => setIsMobileCalcView(false)} className="md:hidden mb-4 flex items-center gap-2 text-gray-500 font-bold"><ArrowLeft size={18}/> Back to Tools</button>
                     <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3"><Calculator className="text-brand-600"/> {activeCalculator.replace(/_/g, ' ')}</h2>
                     
                     <div className="grid lg:grid-cols-2 gap-8">
                         {/* Input Section */}
                         <div className="space-y-4">
                             <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-4">
                                {/* Basic Inputs - Always show unless tool specific logic excludes */}
                                {['BMI', 'BMR', 'TDEE', 'BODY_FAT', 'LEAN_MASS', 'IBW', 'CALORIE_INTAKE', 'PROTEIN', 'CARB', 'FAT', 'DIABETES_RISK', 'HEART_RISK', 'METABOLIC_AGE', 'FIBER', 'SUGAR', 'SODIUM'].includes(activeCalculator) && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="text-xs font-bold text-gray-500 uppercase">Weight (kg)</label><input type="number" value={calculatorInputs.weight} onChange={e => setCalculatorInputs({...calculatorInputs, weight: +e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 mt-1"/></div>
                                            <div><label className="text-xs font-bold text-gray-500 uppercase">Height (cm)</label><input type="number" value={calculatorInputs.height} onChange={e => setCalculatorInputs({...calculatorInputs, height: +e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 mt-1"/></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="text-xs font-bold text-gray-500 uppercase">Age</label><input type="number" value={calculatorInputs.age} onChange={e => setCalculatorInputs({...calculatorInputs, age: +e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 mt-1"/></div>
                                            <div><label className="text-xs font-bold text-gray-500 uppercase">Gender</label><select value={calculatorInputs.gender} onChange={e => setCalculatorInputs({...calculatorInputs, gender: e.target.value as Gender})} className="w-full p-3 rounded-xl border border-gray-200 mt-1 bg-white"><option value={Gender.MALE}>Male</option><option value={Gender.FEMALE}>Female</option></select></div>
                                        </div>
                                    </>
                                )}

                                {/* Specific Inputs */}
                                {['BODY_FAT', 'DIABETES_RISK'].includes(activeCalculator) && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="text-xs font-bold text-gray-500 uppercase">Waist (cm)</label><input type="number" value={calculatorInputs.waist} onChange={e => setCalculatorInputs({...calculatorInputs, waist: +e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 mt-1"/></div>
                                        <div><label className="text-xs font-bold text-gray-500 uppercase">Neck (cm)</label><input type="number" value={calculatorInputs.neck} onChange={e => setCalculatorInputs({...calculatorInputs, neck: +e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 mt-1"/></div>
                                        <div><label className="text-xs font-bold text-gray-500 uppercase">Hip (cm)</label><input type="number" value={calculatorInputs.hip} onChange={e => setCalculatorInputs({...calculatorInputs, hip: +e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 mt-1"/></div>
                                    </div>
                                )}

                                {['FRAME_SIZE'].includes(activeCalculator) && (
                                    <div><label className="text-xs font-bold text-gray-500 uppercase">Wrist Circumference (cm)</label><input type="number" value={calculatorInputs.wrist} onChange={e => setCalculatorInputs({...calculatorInputs, wrist: +e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 mt-1"/></div>
                                )}

                                {['BP_RISK', 'HEART_RISK'].includes(activeCalculator) && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="text-xs font-bold text-gray-500 uppercase">Systolic (Top)</label><input type="number" value={calculatorInputs.systolic} onChange={e => setCalculatorInputs({...calculatorInputs, systolic: +e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 mt-1"/></div>
                                        <div><label className="text-xs font-bold text-gray-500 uppercase">Diastolic (Bottom)</label><input type="number" value={calculatorInputs.diastolic} onChange={e => setCalculatorInputs({...calculatorInputs, diastolic: +e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 mt-1"/></div>
                                    </div>
                                )}

                                {['RUNNING', 'CYCLING', 'SWIMMING', 'WALKING', 'GYM_CALORIE'].includes(activeCalculator) && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="text-xs font-bold text-gray-500 uppercase">Duration (mins)</label><input type="number" value={calculatorInputs.duration} onChange={e => setCalculatorInputs({...calculatorInputs, duration: +e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 mt-1"/></div>
                                        <div><label className="text-xs font-bold text-gray-500 uppercase">Intensity</label><select className="w-full p-3 rounded-xl border border-gray-200 mt-1 bg-white"><option>Moderate</option><option>Vigorous</option></select></div>
                                    </div>
                                )}

                                {['STEPS_CALORIE'].includes(activeCalculator) && (
                                    <div><label className="text-xs font-bold text-gray-500 uppercase">Daily Steps</label><input type="number" value={calculatorInputs.steps} onChange={e => setCalculatorInputs({...calculatorInputs, steps: +e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 mt-1"/></div>
                                )}

                                {['DUE_DATE', 'OVULATION'].includes(activeCalculator) && (
                                    <div><label className="text-xs font-bold text-gray-500 uppercase">First Day of Last Period</label><input type="date" value={calculatorInputs.lastPeriod} onChange={e => setCalculatorInputs({...calculatorInputs, lastPeriod: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 mt-1"/></div>
                                )}

                                {['STRESS_LEVEL'].includes(activeCalculator) && (
                                    <div><label className="text-xs font-bold text-gray-500 uppercase">Stress Level (1-10)</label><input type="range" min="1" max="10" value={calculatorInputs.stressLevel} onChange={e => setCalculatorInputs({...calculatorInputs, stressLevel: +e.target.value})} className="w-full mt-2"/></div>
                                )}

                                {['STRENGTH_LEVEL'].includes(activeCalculator) && (
                                    <div className="grid grid-cols-3 gap-2">
                                        <div><label className="text-xs font-bold text-gray-500 uppercase">Bench (kg)</label><input type="number" value={calculatorInputs.benchPress} onChange={e => setCalculatorInputs({...calculatorInputs, benchPress: +e.target.value})} className="w-full p-2 rounded-lg border border-gray-200 mt-1"/></div>
                                        <div><label className="text-xs font-bold text-gray-500 uppercase">Squat (kg)</label><input type="number" value={calculatorInputs.squat} onChange={e => setCalculatorInputs({...calculatorInputs, squat: +e.target.value})} className="w-full p-2 rounded-lg border border-gray-200 mt-1"/></div>
                                        <div><label className="text-xs font-bold text-gray-500 uppercase">Deadlift (kg)</label><input type="number" value={calculatorInputs.deadlift} onChange={e => setCalculatorInputs({...calculatorInputs, deadlift: +e.target.value})} className="w-full p-2 rounded-lg border border-gray-200 mt-1"/></div>
                                    </div>
                                )}

                                {['LIVER_SCORE'].includes(activeCalculator) && (
                                    <div><label className="text-xs font-bold text-gray-500 uppercase">Drinks per Week</label><input type="number" value={calculatorInputs.alcoholDrinks} onChange={e => setCalculatorInputs({...calculatorInputs, alcoholDrinks: +e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 mt-1"/></div>
                                )}

                                {['DIABETES_RISK', 'HEART_RISK'].includes(activeCalculator) && (
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 text-sm font-bold text-gray-600"><input type="checkbox" checked={calculatorInputs.diabetesHistory} onChange={e => setCalculatorInputs({...calculatorInputs, diabetesHistory: e.target.checked})} /> Diabetes History</label>
                                        {activeCalculator === 'HEART_RISK' && <label className="flex items-center gap-2 text-sm font-bold text-gray-600"><input type="checkbox" checked={calculatorInputs.smoker} onChange={e => setCalculatorInputs({...calculatorInputs, smoker: e.target.checked})} /> Smoker</label>}
                                    </div>
                                )}

                                 <button onClick={runCalculation} className="w-full py-4 bg-brand-600 text-white font-black rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-700 transition active:scale-95 flex items-center justify-center gap-2"><Calculator size={20}/> CALCULATE NOW</button>
                             </div>
                         </div>

                         {/* Results Section */}
                         <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                             {calculatedResult ? (
                                 <div className="p-6 animate-in zoom-in h-full flex flex-col">
                                     <div className="text-center mb-6">
                                         <span className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-gray-100 text-gray-500 mb-2">{calculatedResult.category}</span>
                                         <h3 className="text-6xl font-black mb-2" style={{color: calculatedResult.color}}>{calculatedResult.value}</h3>
                                         <p className="text-gray-400 font-bold">{calculatedResult.unit}</p>
                                     </div>

                                     {/* Gauge / Chart Area */}
                                     {calculatedResult.chartData && (
                                         <div className="h-40 w-full -my-4">
                                             <ResponsiveContainer width="100%" height="100%">
                                                 <PieChart>
                                                     <Pie data={calculatedResult.chartData} innerRadius={60} outerRadius={80} startAngle={180} endAngle={0} dataKey="value">
                                                         {calculatedResult.chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                                     </Pie>
                                                 </PieChart>
                                             </ResponsiveContainer>
                                         </div>
                                     )}

                                     {/* Detailed Stats Grid */}
                                     {calculatedResult.detailedStats && (
                                         <div className="grid grid-cols-2 gap-3 mb-6">
                                             {calculatedResult.detailedStats.map((stat, i) => (
                                                 <div key={i} className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                                                     <p className="text-[10px] font-bold text-gray-400 uppercase">{stat.label}</p>
                                                     <p className="text-sm font-bold text-gray-800">{stat.value}</p>
                                                 </div>
                                             ))}
                                         </div>
                                     )}

                                     {/* Action Plan */}
                                     <div className="bg-brand-50 p-5 rounded-2xl mt-auto">
                                         <h4 className="text-xs font-bold text-brand-800 uppercase mb-3 flex items-center gap-2"><Target size={14}/> AI Recommendations</h4>
                                         <ul className="space-y-2">
                                             {calculatedResult.actionPoints?.map((p, i) => (
                                                 <li key={i} className="text-sm font-medium text-brand-900 flex items-start gap-2">
                                                     <CheckCircle2 size={16} className="text-brand-500 shrink-0 mt-0.5"/> {p}
                                                 </li>
                                             ))}
                                         </ul>
                                     </div>
                                 </div>
                             ) : (
                                 <div className="h-full flex flex-col items-center justify-center opacity-30 p-10">
                                     <Calculator size={80} className="mb-4 text-gray-400"/>
                                     <p className="font-black text-xl text-gray-400">Ready to Calculate</p>
                                     <p className="text-sm text-center mt-2 max-w-xs">Enter your details to get professional-grade health insights.</p>
                                 </div>
                             )}
                         </div>
                     </div>
                </div>
            </div>
        )}

        {/* --- VIEW: HISTORY --- */}
        {view === AppView.HISTORY && (
            <div className="space-y-6 animate-in fade-in">
                 <h2 className="text-2xl font-bold text-gray-900">Scan History</h2>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     {scanHistory.length === 0 ? (
                         <div className="col-span-3 text-center py-20 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200"><History size={48} className="mx-auto mb-4 opacity-30"/><p>No scans yet.</p></div>
                     ) : scanHistory.map(scan => (
                         <div key={scan.id} onClick={() => { setSelectedScan(scan); setShowScanner(true); }} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4 cursor-pointer hover:shadow-md transition">
                             <img src={scan.imagePreview} className="w-20 h-20 rounded-xl object-cover bg-gray-100"/>
                             <div>
                                 <h4 className="font-bold text-gray-900">{scan.productName || 'Unknown Scan'}</h4>
                                 <p className="text-xs text-gray-500 mb-2">{new Date(scan.timestamp).toLocaleDateString()}</p>
                                 <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${scan.recommendation === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{scan.recommendation}</span>
                             </div>
                         </div>
                     ))}
                 </div>
            </div>
        )}

      </main>
      
      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 p-2 flex justify-around items-center z-40 pb-safe shadow-xl">
          <button onClick={() => setView(AppView.DASHBOARD)} className={`p-2 rounded-xl flex flex-col items-center ${view === AppView.DASHBOARD ? 'text-brand-600' : 'text-gray-400'}`}><LayoutDashboard size={22} /><span className="text-[10px] font-bold mt-1">Home</span></button>
          <button onClick={() => setView(AppView.CALCULATORS)} className={`p-2 rounded-xl flex flex-col items-center ${view === AppView.CALCULATORS ? 'text-brand-600' : 'text-gray-400'}`}><Calculator size={22} /><span className="text-[10px] font-bold mt-1">Calc</span></button>
          <div className="relative -top-6"><button onClick={() => setShowScanner(true)} className="w-16 h-16 bg-brand-600 rounded-full shadow-xl shadow-brand-300 flex items-center justify-center text-white ring-4 ring-slate-50 transform active:scale-95 transition"><ScanLine size={28} /></button></div>
          <button onClick={() => setView(AppView.MENTAL_HEALTH)} className={`p-2 rounded-xl flex flex-col items-center ${view === AppView.MENTAL_HEALTH ? 'text-brand-600' : 'text-gray-400'}`}><Brain size={22} /><span className="text-[10px] font-bold mt-1">Mind</span></button>
          <button onClick={() => setView(AppView.CHAT)} className={`p-2 rounded-xl flex flex-col items-center ${view === AppView.CHAT ? 'text-brand-600' : 'text-gray-400'}`}><MessageSquare size={22} /><span className="text-[10px] font-bold mt-1">Chat</span></button>
      </nav>

      {/* Floating Chat & Voice Buttons */}
      <div className="fixed bottom-24 right-6 flex flex-col gap-4 z-40">
        <button onClick={() => setView(AppView.CHAT)} className="w-12 h-12 bg-white rounded-full shadow-lg border border-gray-100 flex items-center justify-center text-brand-600 hover:scale-110 transition"><MessageCircle size={24}/></button>
        <VoiceAgent onSpeechResult={(text) => { setChatInput(text); setView(AppView.CHAT); handleSendMessage(); }} />
      </div>

      {/* Modals */}
      {showScanner && <Scanner userProfile={profile} onClose={() => { setShowScanner(false); setSelectedScan(null); }} onSave={handleSaveScan} initialData={selectedScan} />}
      
      {showWorkoutModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-3xl p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gray-100"><div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${(workoutTimer / 300) * 100}%` }}></div></div>
                <h3 className="text-2xl font-black text-gray-900 mt-4 mb-2">Desk Stretch</h3>
                <div className="text-6xl font-black text-orange-500 mb-8 font-mono">{Math.floor(workoutTimer / 60)}:{(workoutTimer % 60).toString().padStart(2, '0')}</div>
                <div className="space-y-4 mb-8">
                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-left flex items-center gap-4"><div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-bold text-orange-500 border border-orange-200">1</div><div><h4 className="font-bold text-gray-900">Neck Rolls</h4><p className="text-xs text-gray-500">30 seconds clockwise</p></div></div>
                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-left flex items-center gap-4"><div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-bold text-orange-500 border border-orange-200">2</div><div><h4 className="font-bold text-gray-900">Shoulder Shrugs</h4><p className="text-xs text-gray-500">Release tension</p></div></div>
                </div>
                <button onClick={() => setShowWorkoutModal(false)} className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition">End Session</button>
            </div>
        </div>
      )}

       {showBreathingModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-3xl p-8 text-center">
                <h3 className="text-xl font-bold mb-8">Box Breathing</h3>
                <div className="relative w-48 h-48 mx-auto mb-8 flex items-center justify-center">
                    <div className={`absolute inset-0 bg-blue-100 rounded-full ${isBreathHolding ? 'animate-[ping_4s_ease-in-out_infinite]' : ''}`}></div>
                    <div className={`w-32 h-32 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-xl shadow-blue-200 relative z-10 transition-all duration-[4000ms] ${isBreathHolding ? 'scale-110' : 'scale-90'}`}>
                        {isBreathHolding ? 'Inhale...' : 'Exhale...'}
                    </div>
                </div>
                <button onClick={() => setIsBreathHolding(!isBreathHolding)} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl">{isBreathHolding ? 'Stop' : 'Start'}</button>
                <button onClick={() => setShowBreathingModal(false)} className="mt-4 text-gray-400 font-bold text-sm">Close</button>
            </div>
        </div>
      )}
    </div>
  );
};

// Helper for Apple Icon missing in Lucide (Mock)
function Apple(props: any) { return <Utensils {...props} /> }

export default App;
