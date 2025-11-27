import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Utensils, ScanLine, Activity, MessageSquare, 
  User as UserIcon, Bell, Mic, MicOff,
  Sun, BedDouble, Smile, AlertTriangle, History, Camera, TrendingUp,
  Award, Zap, Calendar, Droplets, BookOpen, Heart, ChevronRight, Share2, Plus, X as XIcon, Trash2, ShoppingCart, Play, CheckCircle2, Wind, Scale, Calculator, Monitor, Timer, Flame, Info, Construction, HeartPulse, PieChart as PieChartIcon, Target, Ruler, Dumbbell, Baby, Percent, Send, VolumeX, Moon, Headphones, Bot, MessageCircle, Cigarette, Wine, CloudMoon, Stethoscope, ChefHat, FileHeart, Edit2, Save, RefreshCw, Loader2, Music, ArrowLeft
} from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

// Components
import Scanner from './components/Scanner';
import { UserProfile, AppView, MealPlan, WorkoutPlan, Gender, ScanResult, ProgressPhoto, ShoppingItem, ActivityLevel, CalculatorType, CalculatorResult, UnitSystem } from './types';
import { generateDailyPlan, chatWithAgent } from './services/geminiService';

// --- MOCK DATA FOR ONBOARDING ---
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

// --- HELPER COMPONENTS ---

interface DashboardCardProps {
  title: string;
  children?: React.ReactNode;
  className?: string;
  icon?: any;
}

const DashboardCard = ({ title, children, className = "", icon: Icon }: DashboardCardProps) => (
  <div className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition duration-300 ${className}`}>
    <div className="flex items-center gap-2 mb-4">
        {Icon && <div className="p-2 bg-brand-50 rounded-lg text-brand-600"><Icon size={18} /></div>}
        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
    </div>
    {children}
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

// --- MAIN APP COMPONENT ---

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
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [water, setWater] = useState(4);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [workoutTimer, setWorkoutTimer] = useState(0);

  // Interaction States
  const [symptomText, setSymptomText] = useState("");
  const [showLogSuccess, setShowLogSuccess] = useState(false);
  const [eyeTimerActive, setEyeTimerActive] = useState(false);
  const [eyeTimerCount, setEyeTimerCount] = useState(20 * 60); // 20 minutes in seconds
  const [isEditingMedicalID, setIsEditingMedicalID] = useState(false);
  const [tempMedicalID, setTempMedicalID] = useState<Partial<UserProfile>>({});

  // Pantry Chef State
  const [pantryInput, setPantryInput] = useState("");
  const [pantryRecipe, setPantryRecipe] = useState("");
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);

  // Sleep Sound Audio Context
  const audioCtxRef = useRef<AudioContext | null>(null);
  const brownNoiseNodeRef = useRef<AudioNode | null>(null);
  const [isPlayingNoise, setIsPlayingNoise] = useState(false);

  // Calculator Suite State
  const [activeCalculator, setActiveCalculator] = useState<CalculatorType>('BMI');
  const [calcActivity, setCalcActivity] = useState<ActivityLevel>(ActivityLevel.SEDENTARY);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('METRIC');
  const [bodyStats, setBodyStats] = useState({ 
    waist: 90, neck: 38, hip: 100, 
    age: 33, weight: 75, height: 175,
    gender: Gender.MALE 
  }); 
  const [isMobileCalcView, setIsMobileCalcView] = useState(false); // Mobile view toggle
  
  // New Calculator States
  const [orm, setOrm] = useState({ weight: 60, reps: 5 });
  const [lmpDate, setLmpDate] = useState("");
  const [breathTimer, setBreathTimer] = useState(0);
  const [isBreathHolding, setIsBreathHolding] = useState(false);
  const [showBreathingModal, setShowBreathingModal] = useState(false);
  const [smokingStats, setSmokingStats] = useState({ cigsPerDay: 10, costPerPack: 10, yearsSmoked: 5 });
  const [alcoholStats, setAlcoholStats] = useState({ drinksPerWeek: 5, abv: 5, volume: 330 }); // beer defaults
  const [sleepStats, setSleepStats] = useState({ actualSleep: 6, neededSleep: 8 });

  const [calculatedResult, setCalculatedResult] = useState<CalculatorResult | null>(null);

  // Tracker View tabs
  const [trackerTab, setTrackerTab] = useState<'MENU' | 'CYCLE' | 'PANTRY'>('MENU');

  // Initialize Data
  useEffect(() => {
    if (!dailyPlan.meal) handleGeneratePlan();
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping]);

  // Workout Timer Effect
  useEffect(() => {
    let interval: any;
    if (showWorkoutModal && workoutTimer > 0) {
      interval = setInterval(() => setWorkoutTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [showWorkoutModal, workoutTimer]);

  // Eye Care Timer Effect
  useEffect(() => {
      let interval: any;
      if (eyeTimerActive && eyeTimerCount > 0) {
          interval = setInterval(() => setEyeTimerCount(c => c - 1), 1000);
      } else if (eyeTimerCount === 0 && eyeTimerActive) {
          setEyeTimerActive(false);
          alert("Time to look away! 20-20-20 Rule complete.");
          setEyeTimerCount(20 * 60);
      }
      return () => clearInterval(interval);
  }, [eyeTimerActive, eyeTimerCount]);

  // Breath Hold Timer
  useEffect(() => {
      let interval: any;
      if (isBreathHolding) {
          interval = setInterval(() => setBreathTimer(t => t + 1), 1000);
      }
      return () => clearInterval(interval);
  }, [isBreathHolding]);

  // Brown Noise Generator
  const toggleBrownNoise = () => {
      if (isPlayingNoise) {
          brownNoiseNodeRef.current?.disconnect();
          audioCtxRef.current?.close();
          audioCtxRef.current = null;
          setIsPlayingNoise(false);
          return;
      }

      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const bufferSize = 4096;
      const brownNoise = ctx.createScriptProcessor(bufferSize, 1, 1);
      
      let lastOut = 0;
      brownNoise.onaudioprocess = function(e) {
          const output = e.outputBuffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
              const white = Math.random() * 2 - 1;
              output[i] = (lastOut + (0.02 * white)) / 1.02;
              lastOut = output[i];
              output[i] *= 3.5; // (roughly) compensate for gain
          }
      };
      
      brownNoise.connect(ctx.destination);
      
      audioCtxRef.current = ctx;
      brownNoiseNodeRef.current = brownNoise;
      setIsPlayingNoise(true);
  };

  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true);
    try {
      const plan = await generateDailyPlan(profile);
      setDailyPlan({ meal: plan.mealPlan, workout: plan.workoutPlan });
      if (plan.mealPlan.shoppingList) {
          setShoppingList(plan.mealPlan.shoppingList.map(item => ({ name: item, checked: false })));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleSaveScan = (result: ScanResult) => {
    setScanHistory(prev => [result, ...prev]);
    setProfile(p => ({ ...p, xp: p.xp + 50 }));
  };

  const processChatResponse = async (text: string) => {
    const newHistory = [...chatHistory, { role: 'user' as const, text }];
    setChatHistory(newHistory);
    setIsTyping(true);
    
    const apiHistory = newHistory.slice(0, -1).map(h => ({
      role: h.role,
      parts: [{ text: h.text }]
    }));

    try {
      const response = await chatWithAgent(apiHistory, text);
      setIsTyping(false);
      setChatHistory([...newHistory, { role: 'model', text: response }]);
      
      // Stop previous audio if any
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(response);
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      setIsTyping(false);
      setChatHistory([...newHistory, { role: 'model', text: "Sorry, I couldn't process that right now. Please try again." }]);
    }
  };

  const handleVoiceInput = async (text: string) => {
    processChatResponse(text);
  };

  const handleSendChat = () => {
      if (!chatInput.trim()) return;
      processChatResponse(chatInput);
      setChatInput("");
  };

  const stopAudio = () => {
      window.speechSynthesis.cancel();
  };

  const startWorkout = () => {
      setShowWorkoutModal(true);
      setWorkoutTimer(300); // 5 mins default
  };

  const handleViewScan = (scan: ScanResult) => {
      setSelectedScan(scan);
      setShowScanner(true);
  };

  const toggleShoppingItem = (idx: number) => {
      setShoppingList(prev => prev.map((item, i) => i === idx ? { ...item, checked: !item.checked } : item));
  };

  const incrementWater = () => {
      setWater(w => {
          const next = Math.min(w + 1, 8);
          if (next === 8) alert("Hydration Goal Reached! 🎉");
          return next;
      });
  };

  const navigateToCalculators = () => {
      setView(AppView.CALCULATORS);
      setIsMobileCalcView(false);
  };
  
  const generatePantryRecipe = async () => {
      if (!pantryInput) return;
      setIsGeneratingRecipe(true);
      setPantryRecipe("");
      
      try {
          const prompt = `Create a healthy, simple recipe using these ingredients: ${pantryInput}. Be concise. Format with bullet points.`;
          const recipe = await chatWithAgent([], prompt);
          setPantryRecipe(recipe);
      } catch (e) {
          setPantryRecipe("Could not generate recipe. Please try again.");
      } finally {
          setIsGeneratingRecipe(false);
      }
  };

  const handleSaveMedicalID = () => {
      setProfile(prev => ({ ...prev, ...tempMedicalID }));
      setIsEditingMedicalID(false);
  };

  // --- CALCULATOR LOGIC ---

  const runCalculation = () => {
      let resultData: CalculatorResult | null = null;
      
      // Convert inputs to metric for calculation
      let weight = bodyStats.weight;
      let height = bodyStats.height;
      let waist = bodyStats.waist;
      let neck = bodyStats.neck;
      let hip = bodyStats.hip;

      const hM = height / 100;
      const gender = bodyStats.gender;

      switch (activeCalculator) {
          case 'BMI':
              const bmi = parseFloat((weight / (hM * hM)).toFixed(1));
              let cat = 'Normal Weight';
              let color = '#22c55e'; // Green
              let actions = ['Maintain balanced diet', 'Regular moderate exercise'];
              
              if (bmi < 18.5) { cat = 'Underweight'; color = '#3b82f6'; actions = ['Increase calorie intake', 'Focus on nutrient density']; }
              else if (bmi >= 25 && bmi < 30) { cat = 'Overweight'; color = '#eab308'; actions = ['Create calorie deficit', 'Increase cardio']; }
              else if (bmi >= 30) { cat = 'Obese'; color = '#ef4444'; actions = ['Consult specialist', 'Structured weight loss plan']; }

              resultData = {
                  value: bmi,
                  unit: '',
                  category: cat,
                  color: color,
                  verdict: cat,
                  chartData: [
                      { name: 'Your BMI', value: bmi, fill: color },
                      { name: 'Max Healthy', value: 25, fill: '#e5e7eb' }
                  ],
                  actionPoints: actions
              };
              break;

          case 'BMR':
              // Mifflin-St Jeor
              const s = gender === Gender.MALE ? 5 : -161;
              const bmr = Math.round((10 * weight) + (6.25 * height) - (5 * bodyStats.age) + s);
              resultData = {
                  value: bmr,
                  unit: 'kcal/day',
                  verdict: 'Metabolic Baseline',
                  color: '#f97316',
                  actionPoints: [
                      'This is what you burn at complete rest.',
                      'Do not eat below this number.'
                  ],
                  chartData: [
                      { name: 'BMR', value: bmr, fill: '#f97316' },
                      { name: 'Burn', value: Math.round(bmr * 0.4), fill: '#fed7aa' } // Visual filler
                  ]
              };
              break;
              
          case 'SLEEP_DEBT':
              const debt = Math.max(0, (sleepStats.neededSleep - sleepStats.actualSleep) * 7); // weekly debt
              resultData = {
                  value: debt,
                  unit: 'hours/week',
                  verdict: debt > 5 ? 'High Sleep Debt' : 'Managed',
                  color: debt > 5 ? '#ef4444' : '#22c55e',
                  actionPoints: [
                      'Add 30 mins to nightly sleep',
                      'Avoid weekend oversleeping (jetlag)'
                  ],
                  chartData: [
                       { name: 'Debt', value: debt, fill: '#ef4444' },
                       { name: 'Slept', value: sleepStats.actualSleep * 7, fill: '#3b82f6' }
                  ]
              };
              break;
              
          case 'SMOKING':
              const costYear = smokingStats.cigsPerDay / 20 * smokingStats.costPerPack * 365;
              resultData = {
                  value: `$${Math.round(costYear)}`,
                  unit: 'per year',
                  verdict: 'Financial Cost',
                  color: '#ef4444',
                  actionPoints: [
                      'Quitting saves this immediately',
                      'Lung function improves in 2 weeks'
                  ],
                  chartData: [
                      { name: 'Cost', value: costYear, fill: '#ef4444' }
                  ]
              };
              break;
              
           case 'ALCOHOL':
              // Rough units: (Vol (ml) x ABV) / 1000
              const units = Math.round((alcoholStats.volume * alcoholStats.abv / 1000) * alcoholStats.drinksPerWeek);
              resultData = {
                  value: units,
                  unit: 'Units/week',
                  verdict: units > 14 ? 'Above Guidelines' : 'Within Guidelines',
                  color: units > 14 ? '#ef4444' : '#22c55e',
                  actionPoints: [
                      'Max recommended is 14 units/week',
                      'Have 2 alcohol-free days'
                  ],
                  chartData: [
                       { name: 'Your Units', value: units, fill: units > 14 ? '#ef4444' : '#22c55e' },
                       { name: 'Limit', value: 14, fill: '#e5e7eb' }
                  ]
              };
              break;

          case 'TDEE':
              const bmrVal = (gender === Gender.MALE ? 5 : -161) + (10 * weight) + (6.25 * height) - (5 * bodyStats.age);
              const tdee = Math.round(bmrVal * calcActivity);
              const proteinCals = tdee * 0.3;
              const carbCals = tdee * 0.35;
              const fatCals = tdee * 0.35;

              resultData = {
                  value: tdee,
                  unit: 'kcal/day',
                  verdict: 'Maintenance Calories',
                  color: '#eab308',
                  actionPoints: [
                      `Eat ${tdee - 500} kcal to lose ~0.5kg/week`,
                      `Eat ${tdee + 300} kcal to gain muscle`
                  ],
                  chartData: [
                      { name: 'Protein', value: Math.round(proteinCals/4), fill: '#8884d8' },
                      { name: 'Carbs', value: Math.round(carbCals/4), fill: '#82ca9d' },
                      { name: 'Fats', value: Math.round(fatCals/9), fill: '#ffc658' }
                  ]
              };
              break;

          case 'BODY_FAT':
               let bf = 0;
               if (gender === Gender.MALE) {
                   bf = parseFloat((495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450).toFixed(1));
               } else {
                   bf = parseFloat((495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.22100 * Math.log10(height)) - 450).toFixed(1));
               }
               if (bf < 0) bf = 0;
               
               let bfCat = 'Average';
               let bfColor = '#eab308';
               if (gender === Gender.MALE) {
                   if (bf < 6) { bfCat = 'Essential Fat'; bfColor = '#ef4444'; }
                   else if (bf < 14) { bfCat = 'Athlete'; bfColor = '#22c55e'; }
                   else if (bf < 18) { bfCat = 'Fitness'; bfColor = '#3b82f6'; }
                   else if (bf >= 25) { bfCat = 'Obese'; bfColor = '#ef4444'; }
               } else {
                   if (bf < 14) { bfCat = 'Essential Fat'; bfColor = '#ef4444'; }
                   else if (bf < 21) { bfCat = 'Athlete'; bfColor = '#22c55e'; }
                   else if (bf < 25) { bfCat = 'Fitness'; bfColor = '#3b82f6'; }
                   else if (bf >= 32) { bfCat = 'Obese'; bfColor = '#ef4444'; }
               }

               resultData = {
                   value: bf,
                   unit: '%',
                   category: bfCat,
                   color: bfColor,
                   verdict: bfCat,
                   actionPoints: [
                       bf > 25 ? 'Prioritize protein intake' : 'Maintain strength training',
                       'Reduce processed sugars'
                   ],
                   chartData: [
                       { name: 'Fat Mass', value: bf, fill: bfColor },
                       { name: 'Lean Mass', value: 100 - bf, fill: '#e5e7eb' }
                   ]
               };
               break;

          case 'PROTEIN':
               const protein = Math.round(weight * (calcActivity > 1.5 ? 1.8 : 1.2));
               resultData = {
                   value: protein,
                   unit: 'g/day',
                   verdict: 'Optimal Intake',
                   color: '#16a34a',
                   actionPoints: [
                       'Split into 3-4 meals',
                       'Eat ~30g post-workout'
                   ],
                   chartData: [
                       { name: 'Protein', value: protein, fill: '#16a34a' }
                   ]
               };
               break;
               
          case 'PREGNANCY':
               if (lmpDate) {
                   const d = new Date(lmpDate);
                   d.setDate(d.getDate() + 280);
                   const today = new Date();
                   const diff = Math.floor((today.getTime() - new Date(lmpDate).getTime()) / (1000 * 60 * 60 * 24 * 7));
                   
                   resultData = {
                       value: d.toLocaleDateString(),
                       unit: 'Due Date',
                       verdict: `Week ${diff}`,
                       color: '#e11d48',
                       category: diff < 13 ? 'First Trimester' : diff < 27 ? 'Second Trimester' : 'Third Trimester',
                       chartData: [
                           { name: 'Completed', value: diff, fill: '#e11d48' },
                           { name: 'Remaining', value: 40 - diff, fill: '#fecdd3' }
                       ],
                       actionPoints: [
                           'Take prenatal vitamins',
                           'Schedule next scan'
                       ]
                   };
               }
               break;

          default:
               resultData = { value: 0, unit: '', verdict: 'Result' };
      }
      setCalculatedResult(resultData);
  };

  const CALCULATOR_DATA: Record<CalculatorType, { title: string, desc: string, icon: any, color: string }> = {
      BMI: { title: "BMI Calculator", desc: "Body Mass Index determines if you are in a healthy weight range.", icon: Scale, color: "text-blue-600 bg-blue-50" },
      BODY_FAT: { title: "Body Fat %", desc: "US Navy method uses measurements to estimate fat percentage.", icon: Percent, color: "text-red-600 bg-red-50" },
      BMR: { title: "BMR Calculator", desc: "Basal Metabolic Rate is calories burned at complete rest.", icon: Flame, color: "text-orange-600 bg-orange-50" },
      TDEE: { title: "TDEE Calculator", desc: "Total Daily Energy Expenditure for maintenance calories.", icon: Zap, color: "text-yellow-600 bg-yellow-50" },
      PROTEIN: { title: "Protein Calculator", desc: "Optimal daily protein intake for muscle repair.", icon: Utensils, color: "text-green-600 bg-green-50" },
      WATER: { title: "Hydration", desc: "Daily water intake based on body weight.", icon: Droplets, color: "text-cyan-600 bg-cyan-50" },
      IBW: { title: "Ideal Weight", desc: "Estimated healthy weight based on height.", icon: Target, color: "text-purple-600 bg-purple-50" },
      HEART_RATE: { title: "Heart Rate", desc: "Target zones for cardio training.", icon: HeartPulse, color: "text-pink-600 bg-pink-50" },
      WHR: { title: "WHR Ratio", desc: "Waist-to-Hip ratio assesses metabolic risk.", icon: Ruler, color: "text-indigo-600 bg-indigo-50" },
      ORM: { title: "One Rep Max", desc: "Maximum weight you can lift for one rep.", icon: Dumbbell, color: "text-gray-600 bg-gray-50" },
      PREGNANCY: { title: "Due Date", desc: "Estimated delivery date from LMP.", icon: Baby, color: "text-rose-600 bg-rose-50" },
      BREATH: { title: "Lung Test", desc: "Simple breath hold timer for lung capacity.", icon: Wind, color: "text-teal-600 bg-teal-50" },
      SLEEP_DEBT: { title: "Sleep Debt", desc: "Calculate lost sleep over time.", icon: CloudMoon, color: "text-indigo-600 bg-indigo-50" },
      SMOKING: { title: "Smoking Cost", desc: "Financial cost of smoking cigarettes.", icon: Cigarette, color: "text-gray-700 bg-gray-100" },
      ALCOHOL: { title: "Alcohol Units", desc: "Track units against safe weekly limits.", icon: Wine, color: "text-purple-600 bg-purple-50" }
  };

  // Chat message rendering helper
  const renderMessageText = (text: string) => {
      // Very basic bold and bullet parsing
      return text.split('\n').map((line, i) => {
          if (line.trim().startsWith('* ') || line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
              return <li key={i} className="ml-4 list-disc pl-1 mb-1">{line.replace(/^[\*\-\•] /, '')}</li>
          }
          const parts = line.split(/(\*\*.*?\*\*)/g);
          return (
              <p key={i} className="mb-2">
                  {parts.map((part, j) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                          return <strong key={j}>{part.slice(2, -2)}</strong>
                      }
                      return part;
                  })}
              </p>
          );
      });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex text-gray-900 font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen fixed z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand-200">
            H
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-brand-teal">
            Health AI
          </span>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 mt-4">
          {[
            { id: AppView.DASHBOARD, icon: LayoutDashboard, label: 'Dashboard' },
            { id: AppView.CHAT, icon: MessageSquare, label: 'AI Assistant' },
            { id: AppView.PLANNER, icon: Utensils, label: 'Day Planner' },
            { id: AppView.TRACKER, icon: Activity, label: 'Wellness Tools' },
            { id: AppView.CALCULATORS, icon: Calculator, label: 'Calculators' },
            { id: AppView.MEDICAL_ID, icon: FileHeart, label: 'Medical ID' },
            { id: AppView.HISTORY, icon: History, label: 'History' },
            { id: AppView.PROFILE, icon: UserIcon, label: 'My Profile' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                view === item.id 
                  ? 'bg-brand-50 text-brand-700' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
          
          <div className="pt-6 mt-6 border-t border-gray-100 px-2">
            <button 
              onClick={() => { setSelectedScan(null); setShowScanner(true); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-teal text-white shadow-lg shadow-brand-200 hover:shadow-xl transition font-bold"
            >
              <ScanLine size={18} />
              <span>Universal Scan</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto w-full">
        {/* Top Header Mobile */}
        <header className="md:hidden flex justify-between items-center mb-6 sticky top-0 bg-slate-50 z-10 py-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded flex items-center justify-center text-white font-bold">H</div>
            <span className="font-bold text-lg text-brand-800">Health AI</span>
          </div>
          <div className="flex items-center gap-3">
             <button className="p-2 bg-white rounded-full shadow-sm"><Bell size={20} className="text-gray-600"/></button>
          </div>
        </header>

        {/* --- VIEW: DASHBOARD --- */}
        {view === AppView.DASHBOARD && (
          <div className="space-y-8 animate-in fade-in duration-500 relative">
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Hello, {profile.name} <span className="inline-block animate-wave">👋</span></h1>
                <p className="text-gray-500 mt-2 text-lg">You're on a <span className="font-bold text-brand-600">5-day streak!</span> Keep the momentum going.</p>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  <button onClick={() => setView(AppView.CHAT)} className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition hover:opacity-80 bg-blue-100 text-blue-600">
                      <Bot size={16} /> Ask AI
                  </button>
                  <button onClick={() => startWorkout()} className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition hover:opacity-80 bg-orange-100 text-orange-600">
                      <Zap size={16} /> Quick Workout
                  </button>
                  <button onClick={toggleBrownNoise} className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition hover:opacity-80 ${isPlayingNoise ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-indigo-100 text-indigo-600'}`}>
                      {isPlayingNoise ? <VolumeX size={16}/> : <Headphones size={16}/>} {isPlayingNoise ? 'Stop Audio' : 'Sleep Aid'}
                  </button>
                  <button onClick={() => setView(AppView.MEDICAL_ID)} className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition hover:opacity-80 bg-red-100 text-red-600">
                      <Stethoscope size={16} /> Medical ID
                  </button>
              </div>
            </div>
            {/* ... (Existing Dashboard Cards) ... */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Existing Stats Code... */}
               <div className="bg-white p-5 rounded-2xl shadow-sm border border-orange-100 relative overflow-hidden group">
                <div className="flex justify-between items-start mb-2 relative z-10">
                    <span className="text-gray-400 text-xs uppercase font-extrabold tracking-wider">Weight</span>
                    <Activity size={18} className="text-orange-500" />
                </div>
                <div className="text-3xl font-black text-gray-900 relative z-10">{profile.weight} <span className="text-sm font-medium text-gray-400">kg</span></div>
                <div className="mt-2 flex items-center text-xs font-bold text-green-600 relative z-10 bg-green-50 w-max px-2 py-1 rounded-lg">
                    <TrendingUp size={12} className="mr-1 rotate-180"/> 0.5kg
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-100 relative overflow-hidden group">
                <div className="flex justify-between items-start mb-2 relative z-10">
                    <span className="text-gray-400 text-xs uppercase font-extrabold tracking-wider">Hydration</span>
                    <Droplets size={18} className="text-blue-500" />
                </div>
                <div className="text-3xl font-black text-gray-900 relative z-10">{water} <span className="text-sm font-medium text-gray-400">/ 8</span></div>
                <div className="mt-2 w-full bg-gray-100 rounded-full h-2 relative z-10 overflow-hidden">
                    <div className="bg-blue-500 h-full transition-all duration-500" style={{width: `${(water/8)*100}%`}}></div>
                </div>
                <button onClick={incrementWater} className="absolute inset-0 z-20 cursor-pointer"></button>
              </div>
              <div onClick={navigateToCalculators} className="bg-white p-5 rounded-2xl shadow-sm border border-teal-100 relative overflow-hidden group cursor-pointer hover:border-teal-300 transition">
                <div className="flex justify-between items-start mb-2 relative z-10">
                    <span className="text-gray-400 text-xs uppercase font-extrabold tracking-wider">Calculators</span>
                    <Calculator size={18} className="text-teal-500" />
                </div>
                <div className="text-xl font-black text-gray-900 relative z-10">Health Tools</div>
                <div className="mt-2 text-xs text-teal-600 font-bold relative z-10">15+ Advanced Tools</div>
              </div>
               <div className="bg-white p-5 rounded-2xl shadow-sm border border-green-100 relative overflow-hidden group">
                <div className="flex justify-between items-start mb-2 relative z-10">
                    <span className="text-gray-400 text-xs uppercase font-extrabold tracking-wider">Mood</span>
                    <Smile size={18} className="text-green-500" />
                </div>
                <div className="text-3xl font-black text-gray-900 relative z-10">Good</div>
                <div className="mt-2 text-xs text-green-600 font-bold relative z-10">Acidity: Low</div>
              </div>
            </div>
            
             <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                     <div className="bg-brand-700 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl shadow-brand-100 flex flex-col md:flex-row items-center gap-6">
                        <div className="relative z-10 flex-1">
                             <h3 className="text-2xl font-bold mb-2">Daily Challenge</h3>
                             <p className="opacity-90 text-sm mb-4">Complete 10,000 steps to unlock the "Trailblazer" badge.</p>
                             <div className="w-full bg-black/20 rounded-full h-3 mb-4 overflow-hidden">
                                 <div className="bg-yellow-400 h-full w-[45%]"></div>
                             </div>
                             <p className="text-xs font-bold mb-0">4,500 / 10,000 steps</p>
                        </div>
                         <div className="relative z-10 w-24 h-24 bg-brand-600 rounded-full flex items-center justify-center border-4 border-yellow-400">
                             <Award size={40} className="text-yellow-400"/>
                         </div>
                     </div>
                </div>
                 <div className="space-y-6">
                      <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl p-6 text-white text-center">
                          <h4 className="font-bold text-lg mb-2">Scan & Win</h4>
                          <button 
                            onClick={() => { setSelectedScan(null); setShowScanner(true); }}
                            className="w-full bg-white text-brand-600 font-bold py-3 rounded-xl shadow-lg hover:scale-105 transition flex items-center justify-center gap-2"
                          >
                              <Camera size={18} /> Universal Scan
                          </button>
                      </div>
                 </div>
             </div>

             {/* Chat FAB (Persistent) */}
             <button 
                onClick={() => setView(AppView.CHAT)}
                className="fixed bottom-24 right-4 md:bottom-8 md:right-8 w-14 h-14 bg-brand-600 hover:bg-brand-700 text-white rounded-full shadow-xl flex items-center justify-center z-40 transition-transform hover:scale-110 active:scale-95"
            >
                <MessageCircle size={28} />
            </button>
          </div>
        )}

        {/* --- VIEW: DAY PLANNER --- */}
        {view === AppView.PLANNER && (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-2xl font-bold">Daily Planner</h2>
                        <p className="text-gray-500 text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <button 
                        onClick={handleGeneratePlan}
                        disabled={isGeneratingPlan}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-600 rounded-lg hover:bg-brand-100 font-bold transition text-sm"
                    >
                        {isGeneratingPlan ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        Regenerate Plan
                    </button>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {/* Meal Timeline */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                             <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><Utensils size={20} className="text-orange-500"/> Meal Schedule</h3>
                             {dailyPlan.meal ? (
                                 <div className="space-y-8 relative before:absolute before:inset-y-0 before:left-[15px] before:w-0.5 before:bg-gray-100">
                                     {[
                                         { label: 'Breakfast', time: '8:00 AM', color: 'bg-yellow-100 text-yellow-700', content: dailyPlan.meal.breakfast },
                                         { label: 'Lunch', time: '1:00 PM', color: 'bg-green-100 text-green-700', content: dailyPlan.meal.lunch },
                                         { label: 'Snack', time: '4:00 PM', color: 'bg-purple-100 text-purple-700', content: dailyPlan.meal.snacks },
                                         { label: 'Dinner', time: '8:00 PM', color: 'bg-blue-100 text-blue-700', content: dailyPlan.meal.dinner },
                                     ].map((meal, idx) => (
                                         <div key={idx} className="relative pl-10">
                                             <div className={`absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 ${meal.color.split(' ')[0]}`}>
                                                 {idx + 1}
                                             </div>
                                             <div className="flex justify-between items-start mb-1">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${meal.color}`}>{meal.label}</span>
                                                <span className="text-xs text-gray-400 font-medium">{meal.time}</span>
                                             </div>
                                             <p className="text-gray-800 text-sm leading-relaxed">{meal.content}</p>
                                         </div>
                                     ))}
                                 </div>
                             ) : (
                                 <div className="text-center py-12 text-gray-400">Generatin plan...</div>
                             )}
                        </div>

                        {/* Workout Card */}
                        {dailyPlan.workout && (
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-lg flex items-center gap-2"><Zap size={20} className="text-yellow-500"/> Workout Plan</h3>
                                    <span className="text-sm font-bold bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full">{dailyPlan.workout.duration} mins</span>
                                </div>
                                <h4 className="font-bold text-gray-900 mb-2">{dailyPlan.workout.type}</h4>
                                <div className="space-y-3">
                                    {dailyPlan.workout.exercises.map((ex, i) => (
                                        <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
                                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold text-gray-500 text-xs shadow-sm">{i+1}</div>
                                            <div className="flex-1">
                                                <p className="font-bold text-sm text-gray-800">{ex.name}</p>
                                                <p className="text-xs text-gray-500">{ex.description}</p>
                                            </div>
                                            <span className="text-xs font-bold text-gray-400 whitespace-nowrap">{ex.duration}</span>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={startWorkout} className="mt-6 w-full py-3 bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-700 transition flex items-center justify-center gap-2">
                                    <Play size={18} /> Start Workout
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Shopping List */}
                    <div>
                         <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 h-full">
                             <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><ShoppingCart size={20} className="text-teal-500"/> Shopping List</h3>
                             <div className="space-y-2">
                                 {shoppingList.map((item, idx) => (
                                     <div 
                                        key={idx} 
                                        onClick={() => toggleShoppingItem(idx)}
                                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition ${item.checked ? 'bg-gray-50 opacity-50' : 'hover:bg-gray-50'}`}
                                     >
                                         <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${item.checked ? 'bg-teal-500 border-teal-500' : 'border-gray-300'}`}>
                                             {item.checked && <CheckCircle2 size={12} className="text-white" />}
                                         </div>
                                         <span className={`text-sm font-medium ${item.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>{item.name}</span>
                                     </div>
                                 ))}
                                 {shoppingList.length === 0 && <p className="text-gray-400 text-sm text-center py-4">List empty</p>}
                             </div>
                         </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- VIEW: MEDICAL ID (UPGRADED) --- */}
        {view === AppView.MEDICAL_ID && (
            <div className="max-w-md mx-auto animate-in zoom-in-95">
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden relative">
                    {/* Header Strip */}
                    <div className="h-4 bg-red-500 w-full"></div>
                    
                    <div className="p-8">
                        <div className="flex justify-between items-start mb-6">
                             <div>
                                 <h2 className="text-2xl font-black text-gray-900">Medical ID</h2>
                                 <p className="text-red-500 font-bold text-xs uppercase tracking-wider">Emergency Card</p>
                             </div>
                             <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                                <Stethoscope size={24} />
                             </div>
                        </div>

                        {isEditingMedicalID ? (
                             <div className="space-y-4">
                                 <div>
                                     <label className="text-xs font-bold text-gray-500">Full Name</label>
                                     <input className="w-full p-2 bg-gray-50 rounded-lg text-sm font-bold" defaultValue={profile.name} onChange={e => setTempMedicalID({...tempMedicalID, name: e.target.value})} />
                                 </div>
                                 <div className="grid grid-cols-2 gap-4">
                                     <div>
                                         <label className="text-xs font-bold text-gray-500">Blood Type</label>
                                         <input className="w-full p-2 bg-gray-50 rounded-lg text-sm font-bold" defaultValue={profile.bloodType} onChange={e => setTempMedicalID({...tempMedicalID, bloodType: e.target.value})} />
                                     </div>
                                     <div>
                                         <label className="text-xs font-bold text-gray-500">Age</label>
                                         <input className="w-full p-2 bg-gray-50 rounded-lg text-sm font-bold" type="number" defaultValue={profile.age} onChange={e => setTempMedicalID({...tempMedicalID, age: parseInt(e.target.value)})} />
                                     </div>
                                 </div>
                                 <div>
                                     <label className="text-xs font-bold text-gray-500">Allergies (comma separated)</label>
                                     <input className="w-full p-2 bg-gray-50 rounded-lg text-sm font-bold" defaultValue={profile.allergies.join(', ')} onChange={e => setTempMedicalID({...tempMedicalID, allergies: e.target.value.split(',').map(s => s.trim())})} />
                                 </div>
                                 <div>
                                     <label className="text-xs font-bold text-gray-500">Emergency Contact</label>
                                     <input className="w-full p-2 bg-gray-50 rounded-lg text-sm font-bold" defaultValue={profile.emergencyContact} onChange={e => setTempMedicalID({...tempMedicalID, emergencyContact: e.target.value})} />
                                 </div>
                                 <button onClick={handleSaveMedicalID} className="w-full py-3 bg-red-500 text-white font-bold rounded-xl shadow-lg mt-2 flex items-center justify-center gap-2">
                                     <Save size={18} /> Save Card
                                 </button>
                             </div>
                        ) : (
                             <div className="space-y-5">
                                <div className="flex justify-between border-b pb-3 border-gray-100">
                                    <span className="text-gray-400 font-bold text-xs uppercase">Name</span>
                                    <span className="font-bold text-gray-900 text-lg">{profile.name}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pb-3 border-b border-gray-100">
                                    <div>
                                        <span className="text-gray-400 font-bold text-xs uppercase block mb-1">Blood Type</span>
                                        <span className="font-black text-white bg-red-500 px-3 py-1 rounded-lg text-sm">{profile.bloodType}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 font-bold text-xs uppercase block mb-1">DOB / Age</span>
                                        <span className="font-bold text-gray-900">{profile.age} yrs</span>
                                    </div>
                                </div>
                                <div className="pb-3 border-b border-gray-100">
                                    <span className="text-gray-400 font-bold text-xs uppercase block mb-1">Allergies & Conditions</span>
                                    <div className="flex flex-wrap gap-2">
                                        {profile.allergies.length > 0 ? profile.allergies.map(a => (
                                            <span key={a} className="bg-red-50 text-red-600 px-2 py-1 rounded text-xs font-bold border border-red-100">{a}</span>
                                        )) : <span className="text-gray-500 italic text-sm">None listed</span>}
                                        {profile.healthIssues.map(h => (
                                             <span key={h} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">{h}</span>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-gray-400 font-bold text-xs uppercase block mb-1">Emergency Contact</span>
                                    <a href={`tel:${profile.emergencyContact}`} className="font-bold text-red-600 text-lg hover:underline flex items-center gap-2">
                                        {profile.emergencyContact}
                                    </a>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button onClick={() => { setTempMedicalID(profile); setIsEditingMedicalID(true); }} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition flex items-center justify-center gap-2">
                                        <Edit2 size={16} /> Edit
                                    </button>
                                    <button className="flex-1 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition flex items-center justify-center gap-2">
                                        <Share2 size={16} /> Share
                                    </button>
                                </div>
                             </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* --- VIEW: CALCULATORS (UPDATED) --- */}
        {view === AppView.CALCULATORS && (
            <div className="space-y-8 animate-in fade-in flex flex-col md:flex-row gap-6 h-[calc(100vh-140px)]">
                 {/* Sidebar List - Visible on Desktop OR if not in mobile detail view */}
                 <div className={`w-full md:w-72 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-y-auto no-scrollbar shrink-0 ${isMobileCalcView ? 'hidden md:block' : 'block'}`}>
                     <div className="p-2 space-y-1">
                         {(Object.keys(CALCULATOR_DATA) as CalculatorType[]).map((type) => (
                             <button
                                key={type}
                                onClick={() => { 
                                  setActiveCalculator(type); 
                                  setCalculatedResult(null); 
                                  setIsMobileCalcView(true);
                                }}
                                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 transition ${
                                    activeCalculator === type 
                                    ? 'bg-brand-50 text-brand-700 border-l-4 border-brand-600' 
                                    : 'text-gray-600 hover:bg-gray-50 border-l-4 border-transparent'
                                }`}
                             >
                                 <div className={`p-1.5 rounded-lg ${CALCULATOR_DATA[type].color.replace('text-', 'text-opacity-100 ')} bg-opacity-20`}>
                                     {React.createElement(CALCULATOR_DATA[type].icon, { size: 16 })}
                                 </div>
                                 {CALCULATOR_DATA[type].title}
                             </button>
                         ))}
                     </div>
                 </div>

                 {/* Main Calculator Panel - Hidden on mobile if viewing list */}
                 <div className={`flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row ${!isMobileCalcView ? 'hidden md:flex' : 'flex'}`}>
                     
                     {/* Mobile Back Button Header */}
                     <div className="md:hidden p-4 border-b border-gray-100 flex items-center gap-2">
                        <button onClick={() => setIsMobileCalcView(false)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                          <ArrowLeft size={20} />
                        </button>
                        <span className="font-bold text-gray-700">Back to Tools</span>
                     </div>

                     {/* Input Form */}
                     <div className="flex-1 p-6 md:p-8 overflow-y-auto">
                         <div className="flex items-center gap-3 mb-2">
                             <div className={`p-2 rounded-xl ${CALCULATOR_DATA[activeCalculator].color}`}>
                                 {React.createElement(CALCULATOR_DATA[activeCalculator].icon, { size: 24 })}
                             </div>
                             <div>
                                 <h2 className="text-2xl font-black text-gray-900">{CALCULATOR_DATA[activeCalculator].title}</h2>
                                 <p className="text-sm text-gray-500">{CALCULATOR_DATA[activeCalculator].desc}</p>
                             </div>
                         </div>
                         
                         <div className="mt-8 space-y-6">
                             {/* Inputs based on type */}
                             {(['SMOKING', 'ALCOHOL', 'SLEEP_DEBT'].includes(activeCalculator)) ? (
                                <div className="space-y-4">
                                   {activeCalculator === 'SMOKING' && (
                                       <>
                                        <div><label className="text-xs font-bold text-gray-400 uppercase">Cigarettes per Day</label><input type="number" value={smokingStats.cigsPerDay} onChange={e => setSmokingStats({...smokingStats, cigsPerDay: parseFloat(e.target.value)})} className="w-full p-3 bg-gray-50 rounded-xl mt-1 font-bold" /></div>
                                        <div><label className="text-xs font-bold text-gray-400 uppercase">Cost per Pack ($)</label><input type="number" value={smokingStats.costPerPack} onChange={e => setSmokingStats({...smokingStats, costPerPack: parseFloat(e.target.value)})} className="w-full p-3 bg-gray-50 rounded-xl mt-1 font-bold" /></div>
                                       </>
                                   )}
                                   {activeCalculator === 'ALCOHOL' && (
                                       <>
                                        <div><label className="text-xs font-bold text-gray-400 uppercase">Drinks per Week</label><input type="number" value={alcoholStats.drinksPerWeek} onChange={e => setAlcoholStats({...alcoholStats, drinksPerWeek: parseFloat(e.target.value)})} className="w-full p-3 bg-gray-50 rounded-xl mt-1 font-bold" /></div>
                                        <div><label className="text-xs font-bold text-gray-400 uppercase">Volume (ml)</label><input type="number" value={alcoholStats.volume} onChange={e => setAlcoholStats({...alcoholStats, volume: parseFloat(e.target.value)})} className="w-full p-3 bg-gray-50 rounded-xl mt-1 font-bold" /></div>
                                        <div><label className="text-xs font-bold text-gray-400 uppercase">ABV %</label><input type="number" value={alcoholStats.abv} onChange={e => setAlcoholStats({...alcoholStats, abv: parseFloat(e.target.value)})} className="w-full p-3 bg-gray-50 rounded-xl mt-1 font-bold" /></div>
                                       </>
                                   )}
                                   {activeCalculator === 'SLEEP_DEBT' && (
                                       <>
                                        <div><label className="text-xs font-bold text-gray-400 uppercase">Avg Sleep (Hours/Night)</label><input type="number" value={sleepStats.actualSleep} onChange={e => setSleepStats({...sleepStats, actualSleep: parseFloat(e.target.value)})} className="w-full p-3 bg-gray-50 rounded-xl mt-1 font-bold" /></div>
                                        <div><label className="text-xs font-bold text-gray-400 uppercase">Ideal Sleep Need</label><input type="number" value={sleepStats.neededSleep} onChange={e => setSleepStats({...sleepStats, neededSleep: parseFloat(e.target.value)})} className="w-full p-3 bg-gray-50 rounded-xl mt-1 font-bold" /></div>
                                       </>
                                   )}
                                </div>
                             ) : (
                                 // Standard body inputs
                                 <div className="grid grid-cols-2 gap-4">
                                     <div><label className="text-xs font-bold text-gray-400 uppercase">Weight (kg)</label><input type="number" value={bodyStats.weight} onChange={e => setBodyStats({...bodyStats, weight: parseFloat(e.target.value)})} className="w-full p-3 bg-gray-50 rounded-xl mt-1 font-bold" /></div>
                                     <div><label className="text-xs font-bold text-gray-400 uppercase">Height (cm)</label><input type="number" value={bodyStats.height} onChange={e => setBodyStats({...bodyStats, height: parseFloat(e.target.value)})} className="w-full p-3 bg-gray-50 rounded-xl mt-1 font-bold" /></div>
                                     <div><label className="text-xs font-bold text-gray-400 uppercase">Age</label><input type="number" value={bodyStats.age} onChange={e => setBodyStats({...bodyStats, age: parseFloat(e.target.value)})} className="w-full p-3 bg-gray-50 rounded-xl mt-1 font-bold" /></div>
                                 </div>
                             )}

                             <button onClick={runCalculation} className="w-full py-4 bg-brand-600 text-white font-bold rounded-xl shadow-lg hover:bg-brand-700 transition active:scale-95 flex items-center justify-center gap-2">
                                 <Calculator size={20}/> Calculate
                             </button>
                         </div>
                     </div>

                     {/* Result Panel (Same as before but showing results) */}
                     <div className="md:w-96 bg-slate-50 border-l border-gray-100 p-8 flex flex-col">
                         {calculatedResult ? (
                             <div className="h-full flex flex-col animate-in slide-in-from-right duration-500">
                                 <div className="mb-6 text-center">
                                     <div className="text-5xl font-black mb-1" style={{color: calculatedResult.color}}>{calculatedResult.value}<span className="text-lg text-gray-400 ml-1">{calculatedResult.unit}</span></div>
                                     <div className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-white border border-gray-200 shadow-sm" style={{color: calculatedResult.color}}>{calculatedResult.verdict}</div>
                                 </div>
                                 {/* Chart */}
                                 {calculatedResult.chartData && (
                                     <div className="flex-1 min-h-[200px] mb-6 relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={calculatedResult.chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                    {calculatedResult.chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                                </Pie>
                                                <Legend verticalAlign="bottom" height={36}/>
                                            </PieChart>
                                        </ResponsiveContainer>
                                     </div>
                                 )}
                             </div>
                         ) : (
                             <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-8">
                                 <Calculator size={40} className="opacity-50 mb-4"/>
                                 <h3 className="text-lg font-bold text-gray-600">Enter Details</h3>
                             </div>
                         )}
                     </div>
                 </div>
            </div>
        )}

         {/* --- VIEW: WELLNESS TOOLS (REDESIGNED) --- */}
         {view === AppView.TRACKER && (
             <div className="space-y-8 animate-in fade-in">
                 
                 {/* NAVIGATION / BREADCRUMBS */}
                 {trackerTab !== 'MENU' && (
                     <button onClick={() => setTrackerTab('MENU')} className="flex items-center gap-2 text-gray-500 font-bold hover:text-brand-600 mb-4">
                         <ChevronRight className="rotate-180" size={20}/> Back to Tools
                     </button>
                 )}

                 {/* GRID MENU */}
                 {trackerTab === 'MENU' && (
                     <>
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Wellness App Store</h2>
                            <p className="text-gray-500">Launch specialized tools for holistic health.</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {[
                                { id: 'CYCLE', label: 'Cycle Sync', icon: HeartPulse, color: 'text-pink-500 bg-pink-50', desc: 'Menstrual tracking & nutrition' },
                                { id: 'PANTRY', label: 'Pantry Chef', icon: ChefHat, color: 'text-orange-500 bg-orange-50', desc: 'AI recipes from ingredients' },
                                { id: 'SLEEP', label: 'Sleep Aid', icon: Moon, color: 'text-indigo-500 bg-indigo-50', desc: 'Brown noise generator' },
                                { id: 'BREATH', label: 'Breathing Box', icon: Wind, color: 'text-teal-500 bg-teal-50', desc: 'Stress relief timer' },
                                { id: 'SYMPTOM', label: 'Symptom Log', icon: Activity, color: 'text-blue-500 bg-blue-50', desc: 'Track daily health issues' },
                                { id: 'FASTING', label: 'Fasting Timer', icon: Timer, color: 'text-purple-500 bg-purple-50', desc: '16:8 Intermittent Fasting' },
                            ].map(tool => (
                                <button 
                                    key={tool.id}
                                    onClick={() => {
                                        if (tool.id === 'BREATH') setShowBreathingModal(true);
                                        else if (tool.id === 'SLEEP') toggleBrownNoise();
                                        else setTrackerTab(tool.id as any);
                                    }}
                                    className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition text-left group"
                                >
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${tool.color} group-hover:scale-110 transition`}>
                                        <tool.icon size={24} />
                                    </div>
                                    <h3 className="font-bold text-gray-900 mb-1">{tool.label}</h3>
                                    <p className="text-xs text-gray-500 leading-relaxed">{tool.desc}</p>
                                    {tool.id === 'SLEEP' && isPlayingNoise && (
                                        <div className="mt-3 flex items-center gap-2 text-xs font-bold text-indigo-500 animate-pulse">
                                            <VolumeX size={12}/> Playing...
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                     </>
                 )}
                 
                 {/* TAB: CYCLE TRACKER */}
                 {trackerTab === 'CYCLE' && (
                     <div className="bg-white p-8 rounded-3xl shadow-sm border border-pink-100 max-w-2xl mx-auto text-center">
                         <div className="inline-block p-4 bg-pink-50 rounded-full mb-6 text-pink-500"><HeartPulse size={40}/></div>
                         <h3 className="text-2xl font-bold text-gray-900 mb-2">Cycle Syncing</h3>
                         <p className="text-gray-500 mb-8">Track your menstrual cycle to sync nutrition and workouts.</p>
                         
                         <div className="flex justify-center gap-2 mb-8">
                             {[...Array(28)].map((_, i) => (
                                 <div key={i} className={`w-2 h-8 rounded-full ${i >= 0 && i < 5 ? 'bg-pink-400' : i === 13 ? 'bg-purple-400' : 'bg-gray-200'}`} title={`Day ${i+1}`}></div>
                             ))}
                         </div>
                         <div className="flex justify-center gap-8 text-left max-w-md mx-auto">
                             <div>
                                 <p className="font-bold text-pink-500 text-sm mb-1">Menstrual Phase</p>
                                 <p className="text-xs text-gray-500">Focus on iron-rich foods and gentle movement.</p>
                             </div>
                             <div>
                                 <p className="font-bold text-purple-500 text-sm mb-1">Ovulation (Day 14)</p>
                                 <p className="text-xs text-gray-500">High energy. Best time for HIIT workouts.</p>
                             </div>
                         </div>
                         <button className="mt-8 bg-pink-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-pink-200">Log Period Start</button>
                     </div>
                 )}
                 
                 {/* TAB: PANTRY CHEF */}
                 {trackerTab === 'PANTRY' && (
                     <div className="bg-white p-8 rounded-3xl shadow-sm border border-orange-100 max-w-2xl mx-auto">
                         <div className="text-center mb-8">
                             <div className="inline-block p-3 bg-orange-50 rounded-full mb-4 text-orange-500"><ChefHat size={32}/></div>
                             <h3 className="text-2xl font-bold text-gray-900">AI Pantry Chef</h3>
                             <p className="text-gray-500">Enter ingredients you have, get a healthy recipe.</p>
                         </div>
                         <div className="flex gap-2 mb-6">
                             <input 
                                type="text" 
                                value={pantryInput} 
                                onChange={(e) => setPantryInput(e.target.value)} 
                                placeholder="e.g. Eggs, Spinach, Tomato" 
                                className="flex-1 p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-brand-200"
                             />
                             <button onClick={generatePantryRecipe} className="bg-orange-500 text-white px-6 rounded-xl font-bold hover:bg-orange-600 transition">Create</button>
                         </div>
                         {isGeneratingRecipe && <div className="text-center text-orange-500 animate-pulse">Consulting the Chef...</div>}
                         {pantryRecipe && (
                             <div className="bg-orange-50 p-6 rounded-xl border border-orange-100 animate-in fade-in text-left">
                                 <h4 className="font-bold text-orange-800 mb-2">Chef Suggests:</h4>
                                 <div className="text-orange-900 text-sm leading-relaxed">
                                     {renderMessageText(pantryRecipe)}
                                 </div>
                             </div>
                         )}
                     </div>
                 )}
             </div>
         )}
         
         {/* --- VIEW: CHAT --- */}
         {view === AppView.CHAT && (
             <div className="h-[calc(100vh-80px)] md:h-[calc(100vh-40px)] flex flex-col bg-white md:rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">
                 {/* Header */}
                 <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                     <div className="flex items-center gap-3">
                         <div className="p-2 bg-brand-100 text-brand-600 rounded-lg"><Bot size={20}/></div>
                         <div>
                             <h2 className="font-bold text-gray-900">Health Assistant</h2>
                             <p className="text-xs text-gray-500 flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Online</p>
                         </div>
                     </div>
                     <button onClick={stopAudio} className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition">Stop Audio</button>
                 </div>
                 
                 {/* Messages */}
                 <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                     {chatHistory.length === 0 && (
                         <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
                             <Bot size={48} className="text-gray-300 mb-4"/>
                             <h3 className="text-lg font-bold text-gray-500">How can I help you today?</h3>
                             <div className="flex flex-wrap justify-center gap-2 mt-6">
                                 {["Lose Weight Plan", "Cure Acidity", "Eye Strain Tips", "High Protein Veg Food"].map((prompt, i) => (
                                     <button key={i} onClick={() => handleVoiceInput(prompt)} className="bg-white border border-gray-200 px-4 py-2 rounded-full text-sm hover:border-brand-300 hover:text-brand-600 transition shadow-sm">
                                         {prompt}
                                     </button>
                                 ))}
                             </div>
                         </div>
                     )}
                     
                     {chatHistory.map((msg, idx) => (
                         <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                             <div className={`max-w-[85%] md:max-w-[70%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                 msg.role === 'user' 
                                 ? 'bg-brand-600 text-white rounded-br-none' 
                                 : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                             }`}>
                                 {msg.role === 'model' ? (
                                     <div className="space-y-1">{renderMessageText(msg.text)}</div>
                                 ) : (
                                     msg.text
                                 )}
                             </div>
                         </div>
                     ))}
                     {isTyping && (
                         <div className="flex justify-start">
                             <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-bl-none shadow-sm flex gap-1">
                                 <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                                 <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                                 <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></span>
                             </div>
                         </div>
                     )}
                     <div ref={chatEndRef} />
                 </div>
                 
                 {/* Input Area */}
                 <div className="p-4 bg-white border-t border-gray-100">
                     <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-200 focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-100 transition">
                         <VoiceAgent onSpeechResult={handleVoiceInput} />
                         <input 
                            type="text" 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                            placeholder="Type your health question..."
                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-2"
                         />
                         <button 
                            onClick={handleSendChat}
                            disabled={!chatInput.trim()}
                            className="p-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                         >
                             <Send size={18} />
                         </button>
                     </div>
                 </div>
             </div>
         )}

      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 p-2 flex justify-around items-center z-40 pb-safe shadow-xl">
          <button onClick={() => setView(AppView.DASHBOARD)} className={`p-2 rounded-xl flex flex-col items-center ${view === AppView.DASHBOARD ? 'text-brand-600' : 'text-gray-400'}`}>
              <LayoutDashboard size={22} />
              <span className="text-[10px] font-bold mt-1">Home</span>
          </button>
          <button onClick={() => setView(AppView.CHAT)} className={`p-2 rounded-xl flex flex-col items-center ${view === AppView.CHAT ? 'text-brand-600' : 'text-gray-400'}`}>
              <MessageSquare size={22} />
              <span className="text-[10px] font-bold mt-1">Chat</span>
          </button>
          <div className="relative -top-8 z-50">
              <button 
                onClick={() => { setSelectedScan(null); setShowScanner(true); }}
                className="w-16 h-16 bg-gradient-to-tr from-brand-500 to-brand-400 rounded-full shadow-lg shadow-brand-200 flex items-center justify-center text-white transform active:scale-95 transition ring-4 ring-slate-50"
              >
                  <ScanLine size={28} />
              </button>
          </div>
          <button onClick={() => { setView(AppView.CALCULATORS); setIsMobileCalcView(false); }} className={`p-2 rounded-xl flex flex-col items-center ${view === AppView.CALCULATORS ? 'text-brand-600' : 'text-gray-400'}`}>
              <Calculator size={22} />
              <span className="text-[10px] font-bold mt-1">Calc</span>
          </button>
          <button onClick={() => setView(AppView.TRACKER)} className={`p-2 rounded-xl flex flex-col items-center ${view === AppView.TRACKER ? 'text-brand-600' : 'text-gray-400'}`}>
              <Activity size={22} />
              <span className="text-[10px] font-bold mt-1">Tools</span>
          </button>
      </nav>

      {/* Overlays */}
      {showScanner && (
        <Scanner 
            userProfile={profile} 
            onClose={() => setShowScanner(false)} 
            onSave={handleSaveScan} 
            initialData={selectedScan}
        />
      )}

      {/* Breathing Modal */}
      {showBreathingModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center relative">
                   <button onClick={() => { setShowBreathingModal(false); setIsBreathHolding(false); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><XIcon size={24}/></button>
                   <h3 className="text-xl font-bold text-teal-800 mb-2">4-7-8 Breathing</h3>
                   <p className="text-gray-500 text-sm mb-8">Inhale for 4s, Hold for 7s, Exhale for 8s.</p>
                   
                   <div className="relative w-48 h-48 mx-auto mb-8 flex items-center justify-center">
                       <div className={`absolute inset-0 bg-teal-100 rounded-full ${isBreathHolding ? 'animate-ping opacity-20' : ''}`}></div>
                       <div className={`w-32 h-32 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-teal-200 transition-all duration-[4000ms] ${isBreathHolding ? 'scale-125' : 'scale-100'}`}>
                           {isBreathHolding ? '...' : 'Start'}
                       </div>
                   </div>
                   
                   <button 
                    onClick={() => setIsBreathHolding(!isBreathHolding)}
                    className="w-full py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition"
                   >
                       {isBreathHolding ? 'Stop' : 'Begin Exercise'}
                   </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;