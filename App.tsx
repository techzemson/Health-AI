
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Utensils, ScanLine, Activity, MessageSquare, 
  User as UserIcon, Bell, Mic, MicOff,
  Sun, BedDouble, Smile, AlertTriangle, History, Camera, TrendingUp,
  Award, Zap, Calendar, Droplets, BookOpen, Heart, ChevronRight, Share2, Plus, X as XIcon, Trash2, ShoppingCart, Play, CheckCircle2, Wind, Scale, Calculator, Monitor, Timer, Flame, Info, Construction, HeartPulse, PieChart as PieChartIcon, Target, Ruler, Dumbbell, Baby, Percent, Send, VolumeX, Moon, Headphones, Bot, MessageCircle, Cigarette, Wine, CloudMoon, ChefHat, Edit2, Save, RefreshCw, Loader2, Music, ArrowLeft, UtensilsCrossed, Search, List, Stethoscope, Droplet, Sparkles, AlertOctagon,
  BarChart2, Shield, Menu, X, ArrowRight
} from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';

// Components
import Scanner from './components/Scanner';
import { UserProfile, AppView, MealPlan, WorkoutPlan, Gender, ScanResult, ProgressPhoto, ShoppingItem, ActivityLevel, CalculatorType, CalculatorResult, UnitSystem, NutritionToolCategory, NutritionToolResponse } from './types';
import { generateDailyPlan, chatWithAgent, generateNutritionToolData } from './services/geminiService';

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

// --- NUTRITION TOOLS CONFIG ---
interface NutritionTool {
    id: string;
    category: NutritionToolCategory;
    title: string;
    desc: string;
    icon: any;
    color: string;
    placeholder: string;
}

const NUTRITION_TOOLS: NutritionTool[] = [
    { id: 'DIET_PLAN', category: 'PLANNER', title: 'Personalized Diet Plan', desc: 'Full custom diet plan based on your body goals.', icon: Calendar, color: 'text-blue-500 bg-blue-50', placeholder: 'Enter your specific goal (e.g., "Lose 5kg in 2 months")...' },
    { id: 'MEAL_PLANNER', category: 'PLANNER', title: 'Meal Planner', desc: 'Plan breakfast, lunch, and dinner for specific days.', icon: Utensils, color: 'text-green-500 bg-green-50', placeholder: 'Enter specific preferences (e.g., "High protein, no dairy")...' },
    { id: 'WEEKLY_PLAN', category: 'PLANNER', title: 'Weekly Diet Planner', desc: '7-day structured meal schedule.', icon: Calendar, color: 'text-purple-500 bg-purple-50', placeholder: 'Any restrictions for the week? (e.g., "Cheats allowed on Sunday")...' },
    { id: 'NEEDS_ANALYZER', category: 'ANALYZER', title: 'Nutrition Needs', desc: 'Analyze your daily macro and micro needs.', icon: Activity, color: 'text-orange-500 bg-orange-50', placeholder: 'Describe your daily activity and eating habits...' },
    { id: 'FACTS_FINDER', category: 'ANALYZER', title: 'Nutrition Facts', desc: 'Get detailed macros for any food item.', icon: Search, color: 'text-teal-500 bg-teal-50', placeholder: 'Enter food name (e.g., "Avocado toast")...' },
    { id: 'MEAL_TRACKER', category: 'LIST', title: 'Daily Meal Tracker', desc: 'Log and analyze your daily intake.', icon: List, color: 'text-indigo-500 bg-indigo-50', placeholder: 'List what you ate today...' },
    { id: 'RECIPE_GEN', category: 'LIST', title: 'Healthy Recipes', desc: 'Generate delicious healthy recipes.', icon: ChefHat, color: 'text-red-500 bg-red-50', placeholder: 'Enter ingredients or dish type...' },
    { id: 'GROCERY_GEN', category: 'LIST', title: 'Grocery Generator', desc: 'Smart shopping list for your diet.', icon: ShoppingCart, color: 'text-yellow-500 bg-yellow-50', placeholder: 'For how many days/people are you shopping?' },
    { id: 'FASTING', category: 'PLANNER', title: 'Intermittent Fasting', desc: 'Fasting schedules (16:8, OMAD, etc.).', icon: Timer, color: 'text-cyan-500 bg-cyan-50', placeholder: 'Select style (16:8, 5:2) or ask for recommendation...' },
    { id: 'PORTION_CALC', category: 'ANALYZER', title: 'Portion Calculator', desc: 'Visual portion sizes for your goals.', icon: PieChartIcon, color: 'text-pink-500 bg-pink-50', placeholder: 'Enter the food item...' },
    { id: 'DEFICIT_MAKER', category: 'PLANNER', title: 'Calorie Deficit Maker', desc: 'Meals designed to keep you in deficit.', icon: TrendingUp, color: 'text-emerald-500 bg-emerald-50', placeholder: 'Enter your target calorie limit (e.g., 1500 kcal)...' },
    { id: 'DIABETES_PLAN', category: 'PLANNER', title: 'Diabetes-Friendly', desc: 'Low GI/GL meal plans for blood sugar.', icon: Stethoscope, color: 'text-blue-600 bg-blue-100', placeholder: 'Enter insulin details or dietary restrictions...' },
    { id: 'HEART_PLAN', category: 'PLANNER', title: 'Heart Health Diet', desc: 'Low sodium/cholesterol meals.', icon: Heart, color: 'text-red-600 bg-red-100', placeholder: 'Any specific heart conditions?' },
    { id: 'PCOS_TOOL', category: 'PLANNER', title: 'PCOS/PCOD Diet', desc: 'Hormone balancing nutrition plan.', icon: Sparkles, color: 'text-purple-600 bg-purple-100', placeholder: 'Describe your symptoms...' },
    { id: 'THYROID_PLAN', category: 'PLANNER', title: 'Thyroid-Friendly', desc: 'Nutrition for Hypo/Hyperthyroidism.', icon: Activity, color: 'text-yellow-600 bg-yellow-100', placeholder: 'Hypo or Hyper? Meds?' },
    { id: 'CHOLESTEROL', category: 'PLANNER', title: 'Cholesterol Manager', desc: 'Foods to lower LDL and raise HDL.', icon: Droplet, color: 'text-orange-600 bg-orange-100', placeholder: 'Current cholesterol levels (if known)...' },
    { id: 'LIVER_DETOX', category: 'PLANNER', title: 'Liver Detox Diet', desc: 'Cleanse foods for liver health.', icon: RefreshCw, color: 'text-green-600 bg-green-100', placeholder: 'Reason for detox?' },
    { id: 'GUT_HEALTH', category: 'PLANNER', title: 'Gut Health Tool', desc: 'Probiotic/Prebiotic foods for digestion.', icon: Activity, color: 'text-lime-600 bg-lime-100', placeholder: 'Digestion issues (bloating, gas)?' },
    { id: 'WEIGHT_LOSS', category: 'PLANNER', title: 'Weight Loss Maker', desc: 'Fat burning meal combinations.', icon: Scale, color: 'text-blue-500 bg-blue-50', placeholder: 'Target weight loss per week...' },
    { id: 'SMOOTHIE', category: 'LIST', title: 'Smoothie Generator', desc: 'Nutrient dense smoothie recipes.', icon: Droplet, color: 'text-pink-500 bg-pink-50', placeholder: 'Preferred flavor (Fruity, Green, Choc)?' },
    { id: 'SKIN_GLOW', category: 'PLANNER', title: 'Skin Glow Diet', desc: 'Anti-inflammatory foods for skin.', icon: Sparkles, color: 'text-rose-500 bg-rose-50', placeholder: 'Skin type (Oily, Dry, Acne)?' },
    { id: 'HAIR_FALL', category: 'PLANNER', title: 'Hair Fall Diet', desc: 'Biotin & Protein rich foods.', icon: BookOpen, color: 'text-amber-500 bg-amber-50', placeholder: 'Hair type / severity of fall...' },
    { id: 'IMMUNITY', category: 'PLANNER', title: 'Immunity Booster', desc: 'Vitamin C & Zinc rich diet plan.', icon: CheckCircle2, color: 'text-teal-500 bg-teal-50', placeholder: 'Frequent sickness?' },
    { id: 'ALLERGY', category: 'ANALYZER', title: 'Food Allergy Checker', desc: 'Check ingredients for allergens.', icon: AlertOctagon, color: 'text-red-500 bg-red-50', placeholder: 'Enter food and your allergies...' },
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
  const [calcActivity, setCalcActivity] = useState<ActivityLevel>(ActivityLevel.SEDENTARY);
  const [bodyStats, setBodyStats] = useState({ 
    waist: 90, neck: 38, hip: 100, 
    age: 33, weight: 75, height: 175,
    gender: Gender.MALE 
  }); 
  const [smokingStats, setSmokingStats] = useState({ cigsPerDay: 10, costPerPack: 10, yearsSmoked: 5 });
  const [alcoholStats, setAlcoholStats] = useState({ drinksPerWeek: 5, abv: 5, volume: 330 }); 
  const [sleepStats, setSleepStats] = useState({ actualSleep: 6, neededSleep: 8 });
  const [calculatedResult, setCalculatedResult] = useState<CalculatorResult | null>(null);
  const [isMobileCalcView, setIsMobileCalcView] = useState(false);

  // Nutrition View States
  const [activeNutritionTool, setActiveNutritionTool] = useState<string | null>(null);
  const [nutritionInput, setNutritionInput] = useState("");
  const [nutritionResult, setNutritionResult] = useState<NutritionToolResponse | null>(null);
  const [isGeneratingNutrition, setIsGeneratingNutrition] = useState(false);
  const [nutritionSearch, setNutritionSearch] = useState("");

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

  const handleGenerateNutrition = async () => {
      if (!nutritionInput.trim() || !activeNutritionTool) return;
      setIsGeneratingNutrition(true);
      setNutritionResult(null);
      const tool = NUTRITION_TOOLS.find(t => t.id === activeNutritionTool);
      try {
          const result = await generateNutritionToolData(tool?.title || 'Tool', tool?.category || 'PLANNER', nutritionInput, profile);
          setNutritionResult(result);
      } catch (e) {
          console.error(e);
      } finally {
          setIsGeneratingNutrition(false);
      }
  };

  const runCalculation = () => {
    let result: CalculatorResult = { value: 0, unit: '', color: '#000' };
    const hM = bodyStats.height / 100;
    const wKg = bodyStats.weight;

    switch (activeCalculator) {
        case 'BMI':
            const bmi = wKg / (hM * hM);
            result = {
                value: bmi.toFixed(1), unit: 'BMI',
                category: bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese',
                color: bmi < 18.5 ? '#3b82f6' : bmi < 25 ? '#22c55e' : bmi < 30 ? '#eab308' : '#ef4444',
                chartData: [{ name: 'BMI', value: bmi, fill: '#0284c7' }, { name: 'Max', value: 40 - bmi, fill: '#e5e7eb' }],
                actionPoints: bmi > 25 ? ['Reduce daily calories by 300', 'Walk 30 mins daily', 'Reduce sugar intake'] : ['Maintain balanced diet', 'Strength training 3x week']
            };
            break;
        case 'BMR':
            // Mifflin-St Jeor Equation
            const bmr = bodyStats.gender === Gender.MALE 
                ? (10 * wKg) + (6.25 * bodyStats.height) - (5 * bodyStats.age) + 5
                : (10 * wKg) + (6.25 * bodyStats.height) - (5 * bodyStats.age) - 161;
            result = {
                value: Math.round(bmr), unit: 'kcal/day',
                category: 'Resting Metabolic Rate',
                color: '#8b5cf6',
                chartData: [{ name: 'BMR', value: bmr, fill: '#8b5cf6' }, { name: 'Other', value: 1000, fill: '#e5e7eb' }],
                actionPoints: ['This is calories burned if you slept all day', 'Do not eat below this number']
            };
            break;
        case 'TDEE':
            // Simple TDEE calc based on activity
            const bmr2 = bodyStats.gender === Gender.MALE 
                ? (10 * wKg) + (6.25 * bodyStats.height) - (5 * bodyStats.age) + 5
                : (10 * wKg) + (6.25 * bodyStats.height) - (5 * bodyStats.age) - 161;
            const tdee = bmr2 * calcActivity;
            result = {
                value: Math.round(tdee), unit: 'kcal/day',
                category: 'Maintenance Calories',
                color: '#f59e0b',
                chartData: [{ name: 'TDEE', value: tdee, fill: '#f59e0b' }, { name: 'Rest', value: 2500-tdee, fill: '#f3f4f6' }],
                actionPoints: ['Eat this amount to maintain weight', 'Subtract 500 to lose 0.5kg/week']
            };
            break;
        case 'BODY_FAT':
             // US Navy Method (Estimate)
             const log = Math.log10;
             let bodyFat = 0;
             if (bodyStats.gender === Gender.MALE) {
                bodyFat = 86.010 * log(bodyStats.waist - bodyStats.neck) - 70.041 * log(bodyStats.height) + 36.76;
             } else {
                bodyFat = 163.205 * log(bodyStats.waist + bodyStats.hip - bodyStats.neck) - 97.684 * log(bodyStats.height) - 78.387;
             }
             result = {
                 value: bodyFat.toFixed(1), unit: '%',
                 category: bodyFat < 14 ? 'Athletic' : bodyFat < 24 ? 'Fitness' : 'Average',
                 color: bodyFat < 24 ? '#10b981' : '#f43f5e',
                 chartData: [{ name: 'Fat', value: bodyFat, fill: '#f43f5e' }, { name: 'Lean', value: 100-bodyFat, fill: '#10b981' }],
                 actionPoints: ['Prioritize protein intake', 'Include resistance training']
             }
             break;
        case 'PROTEIN':
             const protein = wKg * (calcActivity > 1.5 ? 2.0 : 1.2);
             result = {
                 value: Math.round(protein), unit: 'g/day',
                 category: 'Recommended Intake',
                 color: '#3b82f6',
                 chartData: [{name: 'Protein', value: protein, fill: '#3b82f6'}, {name: 'Other', value: 200, fill: '#e5e7eb'}],
                 actionPoints: ['Split into 4 meals', 'Eat 20-30g post-workout']
             }
             break;
        case 'WATER':
             const water = wKg * 0.033;
             result = {
                 value: water.toFixed(1), unit: 'Liters/day',
                 category: 'Hydration Goal',
                 color: '#0ea5e9',
                 chartData: [{name: 'Water', value: water, fill: '#0ea5e9'}, {name: 'Max', value: 5, fill: '#e5e7eb'}],
                 actionPoints: ['Drink 500ml upon waking', 'Drink before every meal']
             }
             break;
        case 'SLEEP_DEBT':
             const debt = (sleepStats.neededSleep - sleepStats.actualSleep) * 7;
             result = {
                 value: debt > 0 ? debt.toFixed(1) : '0', unit: 'hrs/week',
                 category: debt > 5 ? 'High Debt' : 'Managed',
                 color: debt > 5 ? '#ef4444' : '#22c55e',
                 chartData: [{name: 'Debt', value: debt > 0 ? debt : 0, fill: '#ef4444'}, {name: 'Slept', value: sleepStats.actualSleep*7, fill: '#3b82f6'}],
                 actionPoints: ['Add 30 mins sleep daily', 'No screens 1hr before bed']
             }
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
            { id: AppView.CHAT, icon: MessageSquare, label: 'AI Assistant' },
            { id: AppView.NUTRITION, icon: UtensilsCrossed, label: 'Nutrition Essentials' },
            { id: AppView.CALCULATORS, icon: Calculator, label: 'Calculators' },
            { id: AppView.HISTORY, icon: History, label: 'History' },
          ].map((item) => (
            <button key={item.id} onClick={() => setView(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${view === item.id ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:bg-gray-50'}`}>
              <item.icon size={18} /> {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto w-full">
        
        {/* --- VIEW: NUTRITION ESSENTIALS --- */}
        {view === AppView.NUTRITION && (
            <div className="space-y-6 animate-in fade-in h-full">
                {!activeNutritionTool && (
                    <>
                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Nutrition Essentials</h2>
                                <p className="text-gray-500">24+ Specialized AI tools for your diet & health goals.</p>
                            </div>
                            <div className="relative">
                                <Search size={18} className="absolute left-3 top-3.5 text-gray-400"/>
                                <input type="text" placeholder="Search tools..." value={nutritionSearch} onChange={(e) => setNutritionSearch(e.target.value)} className="pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl w-full md:w-64 focus:ring-2 focus:ring-brand-100 outline-none" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                            {NUTRITION_TOOLS.filter(t => t.title.toLowerCase().includes(nutritionSearch.toLowerCase())).map(tool => (
                                <button key={tool.id} onClick={() => { setActiveNutritionTool(tool.id); setNutritionResult(null); setNutritionInput(""); }} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-brand-200 hover:-translate-y-1 transition text-left flex flex-col h-full group">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${tool.color} group-hover:scale-110 transition`}><tool.icon size={24} /></div>
                                    <h3 className="font-bold text-gray-900 mb-1">{tool.title}</h3>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase w-fit mb-2 ${tool.category === 'PLANNER' ? 'bg-blue-100 text-blue-700' : tool.category === 'ANALYZER' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{tool.category}</span>
                                    <p className="text-xs text-gray-500 leading-relaxed flex-1">{tool.desc}</p>
                                    <div className="mt-4 flex items-center text-xs font-bold text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity">Launch Tool <ChevronRight size={14} /></div>
                                </button>
                            ))}
                        </div>
                    </>
                )}
                {activeNutritionTool && (
                    <div className="h-full flex flex-col md:flex-row gap-6">
                        {(() => {
                            const tool = NUTRITION_TOOLS.find(t => t.id === activeNutritionTool)!;
                            return (
                                <>
                                    <div className="w-full md:w-1/3 flex flex-col gap-4">
                                        <button onClick={() => setActiveNutritionTool(null)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold mb-2"><ArrowLeft size={18} /> Back to Tools</button>
                                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${tool.color}`}><tool.icon size={28} /></div>
                                            <h2 className="text-xl font-bold text-gray-900 mb-1">{tool.title}</h2>
                                            <p className="text-sm text-gray-500 mb-6">{tool.desc}</p>
                                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Your Requirements</label>
                                            <textarea value={nutritionInput} onChange={(e) => setNutritionInput(e.target.value)} placeholder={tool.placeholder} className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-200 outline-none resize-none mb-4 text-sm"></textarea>
                                            <button onClick={handleGenerateNutrition} disabled={isGeneratingNutrition || !nutritionInput.trim()} className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl shadow-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2">{isGeneratingNutrition ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />} Generate Analysis</button>
                                        </div>
                                    </div>
                                    <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 overflow-y-auto">
                                        {nutritionResult ? (
                                            <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8">
                                                <div>
                                                    <h3 className="text-2xl font-black text-gray-900 mb-2">{nutritionResult.title}</h3>
                                                    <p className="text-gray-600 leading-relaxed mb-6">{nutritionResult.summary}</p>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                        {nutritionResult.stats.map((stat, i) => (
                                                            <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                                                <p className="text-xs font-bold uppercase text-gray-400 mb-1">{stat.label}</p>
                                                                <p className="text-lg font-bold" style={{color: stat.color}}>{stat.value}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="grid md:grid-cols-2 gap-8">
                                                    {nutritionResult.chartData && nutritionResult.chartData.length > 0 && (
                                                        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                                                            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><PieChartIcon size={18}/> Breakdown</h4>
                                                            <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={nutritionResult.chartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{nutritionResult.chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}</Pie><Tooltip /><Legend verticalAlign="bottom" /></PieChart></ResponsiveContainer></div>
                                                        </div>
                                                    )}
                                                    <div className="space-y-6">
                                                        {nutritionResult.timeline && (
                                                            <div>
                                                                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Calendar size={18}/> Schedule</h4>
                                                                <div className="space-y-0 relative before:absolute before:inset-y-0 before:left-3 before:w-0.5 before:bg-gray-100">
                                                                    {nutritionResult.timeline.map((item, i) => (
                                                                        <div key={i} className="relative pl-8 pb-6 last:pb-0">
                                                                            <div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-white border-4 border-brand-200"></div>
                                                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${item.color} mb-1 block w-fit`}>{item.time}</span>
                                                                            <p className="font-bold text-sm text-gray-900">{item.title}</p>
                                                                            <p className="text-xs text-gray-500">{item.desc}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {nutritionResult.checklist && (
                                                            <div>
                                                                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><List size={18}/> Checklist</h4>
                                                                {nutritionResult.checklist.map((group, i) => (
                                                                    <div key={i} className="mb-4">
                                                                        <h5 className="text-sm font-bold text-brand-600 mb-2 uppercase">{group.category}</h5>
                                                                        <div className="space-y-2">{group.items.map((item, j) => (<div key={j} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50"><div className="w-4 h-4 border-2 border-gray-300 rounded-sm"></div><span className="text-sm text-gray-700">{item}</span></div>))}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {nutritionResult.actionPlan && (
                                                    <div className="bg-brand-50 p-6 rounded-2xl border border-brand-100">
                                                        <h4 className="font-bold text-brand-800 mb-4 flex items-center gap-2"><Target size={18}/> Immediate Actions</h4>
                                                        <div className="grid md:grid-cols-2 gap-3">{nutritionResult.actionPlan.map((action, i) => (<div key={i} className="flex items-start gap-3"><div className="w-6 h-6 rounded-full bg-brand-200 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0">{i+1}</div><p className="text-sm text-brand-900">{action}</p></div>))}</div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-8 opacity-50">
                                                <tool.icon size={64} className="mb-4 text-gray-200" />
                                                <h3 className="text-lg font-bold text-gray-500">Ready to Generate</h3>
                                                <p className="max-w-xs mx-auto text-sm mt-2">Enter your details to generate a comprehensive <b>{tool.category}</b> dashboard.</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                )}
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
            <div className="bg-gradient-to-r from-brand-700 to-brand-900 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl">
               <div className="absolute top-0 right-0 p-8 opacity-10"><Activity size={120} /></div>
               <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 bg-yellow-400/20 backdrop-blur-md px-3 py-1 rounded-full border border-yellow-400/30 mb-4"><AlertTriangle size={14} className="text-yellow-300" /><span className="text-xs font-bold text-yellow-100">High Sedentary Risk</span></div>
                  <h3 className="text-2xl font-bold mb-2">Spine Health Alert</h3>
                  <p className="text-brand-100 max-w-md mb-6">You've been sedentary for 4 hours. Start the active timer to improve spine health and reduce back pain.</p>
                  <div className="flex items-center gap-4">
                      <button onClick={() => { setShowWorkoutModal(true); setWorkoutTimer(300); }} className="px-6 py-3 bg-white text-brand-900 font-bold rounded-xl hover:bg-brand-50 transition shadow-lg">Start 5-min Stretch</button>
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
                        {['BMI', 'BMR', 'TDEE', 'BODY_FAT', 'PROTEIN', 'WATER', 'HEART_RATE', 'PREGNANCY', 'SMOKING', 'ALCOHOL', 'SLEEP_DEBT'].map(t => (
                            <button key={t} onClick={() => { setActiveCalculator(t as CalculatorType); setIsMobileCalcView(true); setCalculatedResult(null); }} className={`w-full text-left p-4 text-sm font-bold border-b border-gray-50 hover:bg-gray-50 flex items-center gap-3 ${activeCalculator === t ? 'bg-brand-50 text-brand-700 border-l-4 border-l-brand-600' : 'text-gray-600 border-l-4 border-l-transparent'}`}>
                                <Calculator size={16}/> {t.replace('_', ' ')}
                            </button>
                        ))}
                     </div>
                </div>
                <div className={`flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 ${!isMobileCalcView ? 'hidden md:block' : 'block'}`}>
                     <button onClick={() => setIsMobileCalcView(false)} className="md:hidden mb-4 flex items-center gap-2 text-gray-500 font-bold"><ArrowLeft size={18}/> Back to Tools</button>
                     <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3"><Calculator className="text-brand-600"/> {activeCalculator.replace('_', ' ')} Calculator</h2>
                     <div className="grid md:grid-cols-2 gap-8">
                         <div className="space-y-4">
                             <div className="grid grid-cols-2 gap-4">
                                 <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Weight (kg)</label><input type="number" value={bodyStats.weight} onChange={e => setBodyStats({...bodyStats, weight: +e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 font-bold"/></div>
                                 <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Height (cm)</label><input type="number" value={bodyStats.height} onChange={e => setBodyStats({...bodyStats, height: +e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 font-bold"/></div>
                             </div>
                             <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Age</label><input type="number" value={bodyStats.age} onChange={e => setBodyStats({...bodyStats, age: +e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 font-bold"/></div>
                             <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gender</label><div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200"><button onClick={() => setBodyStats({...bodyStats, gender: Gender.MALE})} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${bodyStats.gender === Gender.MALE ? 'bg-white shadow-sm text-brand-600' : 'text-gray-400'}`}>Male</button><button onClick={() => setBodyStats({...bodyStats, gender: Gender.FEMALE})} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${bodyStats.gender === Gender.FEMALE ? 'bg-white shadow-sm text-pink-600' : 'text-gray-400'}`}>Female</button></div></div>
                             <button onClick={runCalculation} className="w-full py-4 bg-brand-600 text-white font-black rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-700 transition active:scale-95">CALCULATE</button>
                         </div>
                         <div className="bg-gray-50 rounded-2xl p-6 flex flex-col items-center justify-center text-center border border-gray-100">
                             {calculatedResult ? (
                                 <div className="animate-in zoom-in">
                                     <p className="text-xs font-bold uppercase text-gray-400 mb-2">{calculatedResult.category}</p>
                                     <h3 className="text-5xl font-black mb-2" style={{color: calculatedResult.color}}>{calculatedResult.value}</h3>
                                     <p className="text-gray-500 font-medium mb-6">{calculatedResult.unit}</p>
                                     {calculatedResult.chartData && (
                                         <div className="h-40 w-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={calculatedResult.chartData} innerRadius={40} outerRadius={60} dataKey="value"><Cell fill={calculatedResult.color} /><Cell fill="#e5e7eb" /></Pie></PieChart></ResponsiveContainer></div>
                                     )}
                                     <div className="mt-4 text-left w-full bg-white p-4 rounded-xl border border-gray-200">
                                         <p className="text-xs font-bold text-gray-400 uppercase mb-2">Action Plan</p>
                                         <ul className="space-y-2">{calculatedResult.actionPoints?.map((p, i) => <li key={i} className="text-sm font-medium flex items-start gap-2"><CheckCircle2 size={16} className="text-green-500 shrink-0"/> {p}</li>)}</ul>
                                     </div>
                                 </div>
                             ) : (
                                 <div className="opacity-40"><Calculator size={64} className="mx-auto mb-4 text-gray-300"/><p className="font-bold text-gray-400">Enter details to calculate</p></div>
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
          <button onClick={() => setView(AppView.NUTRITION)} className={`p-2 rounded-xl flex flex-col items-center ${view === AppView.NUTRITION ? 'text-brand-600' : 'text-gray-400'}`}><UtensilsCrossed size={22} /><span className="text-[10px] font-bold mt-1">Diet</span></button>
          <div className="relative -top-6"><button onClick={() => setShowScanner(true)} className="w-16 h-16 bg-brand-600 rounded-full shadow-xl shadow-brand-300 flex items-center justify-center text-white ring-4 ring-slate-50 transform active:scale-95 transition"><ScanLine size={28} /></button></div>
          <button onClick={() => setView(AppView.CALCULATORS)} className={`p-2 rounded-xl flex flex-col items-center ${view === AppView.CALCULATORS ? 'text-brand-600' : 'text-gray-400'}`}><Calculator size={22} /><span className="text-[10px] font-bold mt-1">Calc</span></button>
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
