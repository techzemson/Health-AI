
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Utensils, ScanLine, Activity, MessageSquare, 
  User as UserIcon, Bell, Mic, MicOff,
  Sun, BedDouble, Smile, AlertTriangle, History, Camera, TrendingUp,
  Award, Zap, Calendar, Droplets, BookOpen, Heart, ChevronRight, Share2, Plus, X as XIcon, Trash2, ShoppingCart, Play, CheckCircle2, Wind, Scale, Calculator, Monitor, Timer, Flame, Info, Construction, HeartPulse, PieChart, Target, Ruler, Dumbbell, Baby, Percent, Send, VolumeX, Moon, Headphones, Bot
} from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Components
import Scanner from './components/Scanner';
import { UserProfile, AppView, MealPlan, WorkoutPlan, Gender, ScanResult, ProgressPhoto, ShoppingItem, ActivityLevel, CalculatorType } from './types';
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
  badges: ["Early Bird", "Hydration Hero"]
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
  const [fastingStartTime, setFastingStartTime] = useState<Date | null>(null);

  // Sleep Sound Audio Context
  const audioCtxRef = useRef<AudioContext | null>(null);
  const brownNoiseNodeRef = useRef<AudioNode | null>(null);
  const [isPlayingNoise, setIsPlayingNoise] = useState(false);

  // Calculator Suite State
  const [activeCalculator, setActiveCalculator] = useState<CalculatorType>('BMI');
  const [calcActivity, setCalcActivity] = useState<ActivityLevel>(ActivityLevel.SEDENTARY);
  const [bodyStats, setBodyStats] = useState({ waist: 90, neck: 38, hip: 100, age: 33, weight: 75, height: 175 }); 
  
  // New Calculator States
  const [orm, setOrm] = useState({ weight: 60, reps: 5 });
  const [lmpDate, setLmpDate] = useState("");
  const [breathTimer, setBreathTimer] = useState(0);
  const [isBreathHolding, setIsBreathHolding] = useState(false);
  const [calculatedResult, setCalculatedResult] = useState<string | number | null>(null);

  // Missing state for Tracker View tabs
  const [trackerTab, setTrackerTab] = useState<'TOOLS' | 'FUTURE'>('TOOLS');

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
    try {
      const plan = await generateDailyPlan(profile);
      setDailyPlan({ meal: plan.mealPlan, workout: plan.workoutPlan });
      if (plan.mealPlan.shoppingList) {
          setShoppingList(plan.mealPlan.shoppingList.map(item => ({ name: item, checked: false })));
      }
    } catch (e) {
      console.error(e);
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

  const logSymptom = () => {
      if (!symptomText.trim()) return;
      setShowLogSuccess(true);
      setSymptomText("");
      setTimeout(() => setShowLogSuccess(false), 2000);
      setProfile(p => ({ ...p, xp: p.xp + 10 }));
  };

  const addSymptomTag = (sym: string) => {
      setSymptomText(prev => prev ? `${prev}, ${sym}` : sym);
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
  };

  // --- CALCULATOR LOGIC ---

  const runCalculation = () => {
      let res: string | number | null = null;
      const { weight, height, age, waist, hip, neck } = bodyStats;
      const hM = height / 100;

      switch (activeCalculator) {
          case 'BMI':
              res = (weight / (hM * hM)).toFixed(1);
              break;
          case 'BMR':
              // Mifflin-St Jeor
              const s = profile.gender === Gender.MALE ? 5 : -161;
              res = Math.round((10 * weight) + (6.25 * height) - (5 * age) + s);
              break;
          case 'TDEE':
              const bmr = (profile.gender === Gender.MALE ? 5 : -161) + (10 * weight) + (6.25 * height) - (5 * age);
              res = Math.round(bmr * calcActivity);
              break;
          case 'BODY_FAT':
               if (profile.gender === Gender.MALE) {
                   res = (495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450).toFixed(1);
               } else {
                   res = (495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.22100 * Math.log10(height)) - 450).toFixed(1);
               }
               if (parseFloat(res as string) < 0) res = 0;
               break;
          case 'PROTEIN':
               res = Math.round(weight * (calcActivity > 1.5 ? 1.8 : 1.2));
               break;
          case 'WATER':
               res = (weight * 0.033).toFixed(1);
               break;
          case 'IBW':
               // Devine
               const base = profile.gender === Gender.MALE ? 50 : 45.5;
               const inches = height / 2.54;
               res = Math.round(base + 2.3 * (inches - 60));
               break;
          case 'WHR':
               res = (waist / hip).toFixed(2);
               break;
          case 'ORM':
               res = Math.round(orm.weight * (1 + orm.reps / 30));
               break;
          case 'PREGNANCY':
               if (lmpDate) {
                   const d = new Date(lmpDate);
                   d.setDate(d.getDate() + 280);
                   res = d.toLocaleDateString();
               }
               break;
          default:
              res = null;
      }
      setCalculatedResult(res);
  };

  // Calculator Metadata
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
  };


  // Render Logic
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
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Hero Section */}
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
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-orange-100 relative overflow-hidden group">
                <div className="flex justify-between items-start mb-2 relative z-10">
                    <span className="text-gray-400 text-xs uppercase font-extrabold tracking-wider">Weight</span>
                    <Activity size={18} className="text-orange-500" />
                </div>
                <div className="text-3xl font-black text-gray-900 relative z-10">{profile.weight} <span className="text-sm font-medium text-gray-400">kg</span></div>
                <div className="mt-2 flex items-center text-xs font-bold text-green-600 relative z-10 bg-green-50 w-max px-2 py-1 rounded-lg">
                    <TrendingUp size={12} className="mr-1 rotate-180"/> 0.5kg
                </div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-orange-50 rounded-full group-hover:scale-125 transition duration-500"></div>
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
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-125 transition duration-500"></div>
              </div>

              <div 
                 onClick={navigateToCalculators}
                 className="bg-white p-5 rounded-2xl shadow-sm border border-teal-100 relative overflow-hidden group cursor-pointer hover:border-teal-300 transition"
              >
                <div className="flex justify-between items-start mb-2 relative z-10">
                    <span className="text-gray-400 text-xs uppercase font-extrabold tracking-wider">Calculators</span>
                    <Calculator size={18} className="text-teal-500" />
                </div>
                <div className="text-xl font-black text-gray-900 relative z-10">Health Tools</div>
                <div className="mt-2 text-xs text-teal-600 font-bold relative z-10">BMI, TDEE, Body Fat</div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-teal-50 rounded-full group-hover:scale-125 transition duration-500"></div>
              </div>

               <div className="bg-white p-5 rounded-2xl shadow-sm border border-green-100 relative overflow-hidden group">
                <div className="flex justify-between items-start mb-2 relative z-10">
                    <span className="text-gray-400 text-xs uppercase font-extrabold tracking-wider">Mood</span>
                    <Smile size={18} className="text-green-500" />
                </div>
                <div className="text-3xl font-black text-gray-900 relative z-10">Good</div>
                <div className="mt-2 text-xs text-green-600 font-bold relative z-10">Acidity: Low</div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-green-50 rounded-full group-hover:scale-125 transition duration-500"></div>
              </div>
            </div>

            {/* Main Dashboard Content */}
            <div className="grid md:grid-cols-3 gap-6">
              
              {/* Daily Focus (Left 2 cols) */}
              <div className="md:col-span-2 space-y-6">
                 {/* Spine Health Alert (Redesigned Desk Warrior) */}
                 <div className="bg-brand-700 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl shadow-brand-100 flex flex-col md:flex-row items-center gap-6">
                    <div className="relative z-10 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center gap-1.5 bg-yellow-400 text-brand-900 px-3 py-1 rounded-full text-xs font-bold border border-yellow-200 shadow-sm">
                                <AlertTriangle size={14} fill="currentColor" /> High Sedentary Risk
                            </span>
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Spine Health Alert</h3>
                        <p className="opacity-90 text-sm mb-4 leading-relaxed">You've been sitting for 4 hours. Stiffness risk is increasing.</p>
                        
                        {/* Visual Stiffness Meter */}
                        <div className="mb-6">
                             <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">
                                 <span>Relaxed</span>
                                 <span>Stiff</span>
                             </div>
                             <div className="h-3 bg-brand-900/50 rounded-full overflow-hidden w-full max-w-sm relative">
                                 <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 w-[80%] rounded-full"></div>
                                 <div className="absolute top-0 bottom-0 w-1 bg-white shadow-lg left-[80%] scale-y-125"></div>
                             </div>
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={startWorkout}
                                className="bg-white text-brand-700 px-6 py-3 rounded-xl text-sm font-bold hover:bg-gray-50 transition shadow-lg flex items-center gap-2"
                            >
                                <Play size={16} fill="currentColor"/> Start 5-min Stretch
                            </button>
                            <button className="px-5 py-3 rounded-xl text-sm font-bold border border-white/20 hover:bg-white/10 transition text-white">
                                Snooze
                            </button>
                        </div>
                    </div>
                    {/* Illustration / Graphic */}
                    <div className="relative z-10 w-32 h-32 md:w-40 md:h-40 flex-shrink-0 bg-brand-600 rounded-full flex items-center justify-center shadow-inner border-4 border-brand-500/30">
                         <div className="animate-pulse-fast">
                            <Activity size={64} className="text-brand-300"/>
                         </div>
                    </div>
                    
                    {/* Abstract Background */}
                    <div className="absolute right-0 top-0 w-64 h-64 bg-brand-500 opacity-20 rounded-full translate-x-10 -translate-y-10 blur-3xl"></div>
                 </div>

                 {/* Charts Section */}
                 <div className="grid md:grid-cols-2 gap-4">
                    <DashboardCard title="Wellness Trends" icon={TrendingUp}>
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={[
                                    {name: 'M', score: 60}, {name: 'T', score: 70}, {name: 'W', score: 65}, 
                                    {name: 'T', score: 85}, {name: 'F', score: 80}, {name: 'S', score: 90}, {name: 'S', score: 88}
                                ]}>
                                    <defs>
                                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                                    <Area type="monotone" dataKey="score" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </DashboardCard>
                    
                    <DashboardCard title="Recent Activity" icon={History}>
                        <div className="space-y-4">
                            {scanHistory.length > 0 ? scanHistory.slice(0, 3).map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100" onClick={() => handleViewScan(item)}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">{item.productName || 'Scan'}</p>
                                            <p className="text-xs text-gray-400">{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-brand-600 bg-brand-100 px-2 py-1 rounded">{item.score} pts</span>
                                </div>
                            )) : (
                                <div className="text-center py-8 text-gray-400 text-sm">No recent scans.</div>
                            )}
                        </div>
                    </DashboardCard>
                 </div>
              </div>

              {/* Sidebar Right (Suggestions) */}
              <div className="space-y-6">
                  <DashboardCard title="Smart Insights" className="h-auto" icon={MessageSquare}>
                      <div className="space-y-4">
                          <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                              <div className="flex items-center gap-2 mb-2 text-yellow-800 font-bold text-sm">
                                  <AlertTriangle size={16} /> Acidity Alert
                              </div>
                              <p className="text-xs text-yellow-700 leading-relaxed font-medium">
                                  Spicy food detected in yesterday's dinner.
                              </p>
                              <p className="text-xs text-yellow-600 mt-2">Recommended: <span className="underline cursor-pointer">Curd Rice</span> for lunch.</p>
                          </div>

                          <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                              <div className="flex items-center gap-2 mb-2 text-purple-800 font-bold text-sm">
                                  <Sun size={16} /> Skin Care
                              </div>
                              <p className="text-xs text-purple-700 leading-relaxed font-medium">
                                  UV Index is very high (9/10).
                              </p>
                              <button onClick={() => { setSelectedScan(null); setShowScanner(true); }} className="mt-3 w-full bg-white text-purple-700 text-xs font-bold py-2 rounded-lg border border-purple-200 hover:bg-purple-100 transition">
                                  Scan Sunscreen
                              </button>
                          </div>
                      </div>
                  </DashboardCard>

                  <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl p-6 text-white text-center">
                      <h4 className="font-bold text-lg mb-2">Scan & Win</h4>
                      <p className="text-sm opacity-90 mb-4">Scan your lunch to earn 50 XP and get nutrition insights.</p>
                      <button 
                        onClick={() => { setSelectedScan(null); setShowScanner(true); }}
                        className="w-full bg-white text-brand-600 font-bold py-3 rounded-xl shadow-lg hover:scale-105 transition flex items-center justify-center gap-2"
                      >
                          <Camera size={18} /> Universal Scan
                      </button>
                  </div>
              </div>

            </div>
          </div>
        )}

        {/* --- VIEW: CHAT ASSISTANT (NEW FULL PAGE) --- */}
        {view === AppView.CHAT && (
            <div className="flex flex-col h-[calc(100vh-140px)] md:h-full bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in">
                {/* Chat Header */}
                <div className="p-4 border-b bg-white flex justify-between items-center z-10 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white">
                            <Bot size={24} />
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-800">Health AI Assistant</h2>
                            <p className="text-xs text-green-600 flex items-center gap-1 font-medium">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Online
                            </p>
                        </div>
                    </div>
                    <button onClick={stopAudio} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full" title="Stop Audio">
                        <VolumeX size={20} />
                    </button>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                    {chatHistory.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                            <Bot size={48} className="mb-4 text-brand-300"/>
                            <h3 className="text-lg font-bold text-gray-700">How can I help you today?</h3>
                            <p className="text-sm text-gray-500 mb-8 max-w-xs">Ask about nutrition, workouts, symptoms, or mental health.</p>
                            
                            <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                                {['Remedy for acidity?', 'Healthy desk snacks?', 'Exercises for back pain', 'High protein veg food'].map(q => (
                                    <button 
                                        key={q} 
                                        onClick={() => handleVoiceInput(q)} 
                                        className="text-xs bg-white border border-gray-200 px-4 py-3 rounded-xl text-gray-600 hover:border-brand-300 hover:text-brand-600 transition shadow-sm"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {chatHistory.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs ${msg.role === 'user' ? 'bg-gray-900' : 'bg-brand-600'}`}>
                                    {msg.role === 'user' ? 'Me' : <Bot size={16}/>}
                                </div>
                                <div className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                    msg.role === 'user' 
                                    ? 'bg-gray-900 text-white rounded-tr-none' 
                                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                                }`}>
                                    {msg.text}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start">
                             <div className="flex gap-2 max-w-[85%]">
                                <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white">
                                    <Bot size={16}/>
                                </div>
                                <div className="p-4 bg-white border border-gray-200 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></span>
                                </div>
                             </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-4 bg-white border-t">
                    <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-2xl border border-transparent focus-within:border-brand-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-100 transition">
                         <VoiceAgent onSpeechResult={handleVoiceInput} />
                         <input 
                            type="text" 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                            placeholder="Type a message..."
                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-2 outline-none"
                         />
                         <button 
                            onClick={handleSendChat}
                            disabled={!chatInput.trim()}
                            className="p-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                             <Send size={18}/>
                         </button>
                    </div>
                </div>
            </div>
        )}
        
        {/* --- VIEW: HISTORY --- */}
        {view === AppView.HISTORY && (
            <div className="space-y-8 animate-in fade-in">
                 <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold">Activity History</h2>
                        <p className="text-gray-500">Your past scans and logs.</p>
                    </div>
                 </div>

                 <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                     {scanHistory.length === 0 ? (
                         <div className="text-center py-12 text-gray-400">
                             <History size={48} className="mx-auto mb-4 opacity-20"/>
                             <p>No history yet. Start scanning!</p>
                         </div>
                     ) : (
                         <div className="grid md:grid-cols-2 gap-4">
                             {scanHistory.map((scan) => (
                                 <div key={scan.id} className="flex gap-4 p-4 border border-gray-100 rounded-xl hover:shadow-md transition cursor-pointer" onClick={() => handleViewScan(scan)}>
                                     <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                         <img src={scan.imagePreview} alt="scan" className="w-full h-full object-cover" />
                                     </div>
                                     <div className="flex-1">
                                         <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-gray-800">{scan.productName || scan.type}</h4>
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                                                scan.recommendation === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>{scan.recommendation}</span>
                                         </div>
                                         <p className="text-xs text-gray-500 mt-1 line-clamp-2">{scan.analysis}</p>
                                         <p className="text-[10px] text-gray-400 mt-2">{new Date(scan.timestamp).toLocaleString()}</p>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     )}
                 </div>
            </div>
        )}

        {/* --- VIEW: CALCULATORS (INTERACTIVE REDESIGN) --- */}
        {view === AppView.CALCULATORS && (
            <div className="space-y-8 animate-in fade-in flex flex-col md:flex-row gap-6 h-[calc(100vh-140px)]">
                 {/* Sidebar List */}
                 <div className="md:w-72 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-y-auto no-scrollbar">
                     <div className="p-4 border-b bg-gray-50">
                         <h3 className="font-bold text-gray-800">Select Tool</h3>
                     </div>
                     <div className="p-2 space-y-1">
                         {(Object.keys(CALCULATOR_DATA) as CalculatorType[]).map((type) => (
                             <button
                                key={type}
                                onClick={() => { setActiveCalculator(type); setCalculatedResult(null); }}
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

                 {/* Main Calculator Panel */}
                 <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row">
                     {/* Input Form */}
                     <div className="flex-1 p-8 overflow-y-auto">
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
                             {/* Common Inputs */}
                             <div className="grid grid-cols-2 gap-4">
                                 <div>
                                     <label className="text-xs font-bold text-gray-400 uppercase">Weight (kg)</label>
                                     <input type="number" value={bodyStats.weight} onChange={e => setBodyStats({...bodyStats, weight: parseFloat(e.target.value)})} className="w-full p-3 bg-gray-50 rounded-xl mt-1 font-bold border-2 border-transparent focus:border-brand-300 focus:bg-white transition" />
                                 </div>
                                 <div>
                                     <label className="text-xs font-bold text-gray-400 uppercase">Height (cm)</label>
                                     <input type="number" value={bodyStats.height} onChange={e => setBodyStats({...bodyStats, height: parseFloat(e.target.value)})} className="w-full p-3 bg-gray-50 rounded-xl mt-1 font-bold border-2 border-transparent focus:border-brand-300 focus:bg-white transition" />
                                 </div>
                             </div>

                             {['BMR', 'TDEE', 'PROTEIN'].includes(activeCalculator) && (
                                 <div>
                                     <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Activity Level</label>
                                     <div className="flex gap-2 overflow-x-auto pb-2">
                                         {[ActivityLevel.SEDENTARY, ActivityLevel.MODERATE, ActivityLevel.VERY_ACTIVE].map((lvl) => (
                                             <button 
                                                key={lvl}
                                                onClick={() => setCalcActivity(lvl)}
                                                className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap border-2 ${calcActivity === lvl ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-100 text-gray-500'}`}
                                             >
                                                 {lvl === 1.2 ? 'Sedentary' : lvl === 1.55 ? 'Moderate' : 'Active'}
                                             </button>
                                         ))}
                                     </div>
                                 </div>
                             )}

                             {['BODY_FAT', 'WHR'].includes(activeCalculator) && (
                                 <div className="bg-gray-50 p-4 rounded-xl space-y-4">
                                     <h4 className="font-bold text-sm text-gray-700">Measurements</h4>
                                     <div className="grid grid-cols-3 gap-3">
                                         <div>
                                             <label className="text-[10px] font-bold text-gray-400 uppercase">Waist</label>
                                             <input type="number" value={bodyStats.waist} onChange={e => setBodyStats({...bodyStats, waist: parseFloat(e.target.value)})} className="w-full p-2 rounded-lg border text-center" />
                                         </div>
                                         <div>
                                             <label className="text-[10px] font-bold text-gray-400 uppercase">Neck</label>
                                             <input type="number" value={bodyStats.neck} onChange={e => setBodyStats({...bodyStats, neck: parseFloat(e.target.value)})} className="w-full p-2 rounded-lg border text-center" />
                                         </div>
                                         <div>
                                             <label className="text-[10px] font-bold text-gray-400 uppercase">Hip</label>
                                             <input type="number" value={bodyStats.hip} onChange={e => setBodyStats({...bodyStats, hip: parseFloat(e.target.value)})} className="w-full p-2 rounded-lg border text-center" />
                                         </div>
                                     </div>
                                 </div>
                             )}
                             
                             {activeCalculator === 'ORM' && (
                                  <div className="grid grid-cols-2 gap-4">
                                      <div><label className="text-xs font-bold text-gray-400 uppercase">Lift Weight (kg)</label><input type="number" value={orm.weight} onChange={e => setOrm({...orm, weight: parseFloat(e.target.value)})} className="w-full p-3 bg-gray-50 rounded-xl mt-1 font-bold" /></div>
                                      <div><label className="text-xs font-bold text-gray-400 uppercase">Reps Performed</label><input type="number" value={orm.reps} onChange={e => setOrm({...orm, reps: parseFloat(e.target.value)})} className="w-full p-3 bg-gray-50 rounded-xl mt-1 font-bold" /></div>
                                  </div>
                             )}

                             {activeCalculator === 'PREGNANCY' && (
                                 <div><label className="text-xs font-bold text-gray-400 uppercase">First Day of Last Period</label><input type="date" value={lmpDate} onChange={e => setLmpDate(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl mt-1 font-bold" /></div>
                             )}

                             {/* Action Button */}
                             <button 
                                onClick={runCalculation}
                                className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] transition active:scale-95 flex items-center justify-center gap-2"
                             >
                                 <Calculator size={20}/> Calculate
                             </button>
                         </div>
                     </div>

                     {/* Result Panel */}
                     <div className="md:w-80 bg-slate-50 border-l border-gray-100 p-8 flex flex-col justify-center">
                         {calculatedResult !== null ? (
                             <div className="text-center animate-in zoom-in duration-300">
                                 <p className="text-sm font-bold text-gray-500 uppercase mb-4">Your Result</p>
                                 <div className="text-5xl font-black text-brand-600 mb-2">
                                     {calculatedResult}
                                     <span className="text-lg text-gray-400 font-medium ml-1">
                                         {['BMI', 'WHR'].includes(activeCalculator) ? '' : 
                                          ['BODY_FAT'].includes(activeCalculator) ? '%' :
                                          ['PROTEIN'].includes(activeCalculator) ? 'g' :
                                          ['WATER'].includes(activeCalculator) ? 'L' :
                                          ['ORM', 'IBW'].includes(activeCalculator) ? 'kg' : ''}
                                     </span>
                                 </div>
                                 <div className="inline-block px-4 py-2 bg-white rounded-lg shadow-sm text-sm font-bold text-gray-700 mt-4 border border-gray-200">
                                     {/* Simple interpretation logic */}
                                     {activeCalculator === 'BMI' && (parseFloat(calculatedResult as string) < 18.5 ? 'Underweight' : parseFloat(calculatedResult as string) < 25 ? 'Normal Weight' : 'Overweight')}
                                     {activeCalculator === 'BODY_FAT' && 'Estimated Fat %'}
                                     {activeCalculator === 'BMR' && 'Calories/day'}
                                     {activeCalculator === 'ORM' && 'Max Potential'}
                                 </div>
                                 
                                 <p className="text-xs text-gray-400 mt-8 leading-relaxed">
                                     *This is an estimate. Consult a professional for medical advice.
                                 </p>
                             </div>
                         ) : (
                             <div className="text-center text-gray-400">
                                 <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                                     <Calculator size={32} className="opacity-50"/>
                                 </div>
                                 <p className="text-sm">Enter your details and hit calculate.</p>
                             </div>
                         )}
                     </div>
                 </div>
            </div>
        )}

         {/* --- VIEW: TRACKER (WELLNESS TOOLS) --- */}
         {view === AppView.TRACKER && (
             <div className="space-y-8 animate-in fade-in">
                 <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Wellness Tools</h2>
                    {/* Tools Tab Switcher */}
                    <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 inline-flex">
                        <button 
                            onClick={() => setTrackerTab('TOOLS')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${trackerTab === 'TOOLS' ? 'bg-brand-100 text-brand-700' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            Trackers
                        </button>
                         <button 
                            onClick={() => setTrackerTab('FUTURE')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${trackerTab === 'FUTURE' ? 'bg-brand-100 text-brand-700' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            Roadmap
                        </button>
                    </div>
                 </div>

                 {/* TAB: TOOLS (Existing) */}
                 {trackerTab === 'TOOLS' && (
                     <div className="grid md:grid-cols-2 gap-6">
                        
                        {/* Sleep Aid */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
                             <div className="flex justify-between items-start mb-4">
                                 <div>
                                     <h3 className="font-bold text-indigo-900 flex items-center gap-2"><Moon size={20}/> Deep Sleep Aid</h3>
                                     <p className="text-xs text-indigo-500">Brown Noise Generator</p>
                                 </div>
                                 <button onClick={toggleBrownNoise} className={`p-3 rounded-full transition ${isPlayingNoise ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                     {isPlayingNoise ? <VolumeX size={24}/> : <Headphones size={24}/>}
                                 </button>
                             </div>
                             <div className="h-12 w-full flex items-end gap-1 opacity-50">
                                 {[...Array(20)].map((_, i) => (
                                     <div key={i} className={`flex-1 rounded-t-sm transition-all duration-300 ${isPlayingNoise ? 'bg-indigo-400 animate-pulse' : 'bg-gray-200'}`} style={{height: `${Math.random() * 100}%`}}></div>
                                 ))}
                             </div>
                        </div>

                        {/* Fasting Timer */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
                            <div className="flex items-center gap-2 mb-4 text-orange-600">
                                <Timer size={20} /> <h3 className="font-bold text-gray-800">Intermittent Fasting (16:8)</h3>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="relative w-24 h-24 rounded-full border-4 border-orange-100 flex items-center justify-center">
                                    {fastingStartTime ? (
                                        <span className="text-lg font-bold text-orange-600">Active</span>
                                    ) : (
                                        <span className="text-sm font-bold text-gray-400">Off</span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    {fastingStartTime ? (
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-bold">Started at</p>
                                            <p className="text-xl font-bold text-gray-900">{fastingStartTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                            <button onClick={() => setFastingStartTime(null)} className="mt-2 text-xs text-red-500 font-bold hover:underline">Stop Fast</button>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-sm text-gray-600 mb-2">Start your fasting window now.</p>
                                            <button onClick={() => setFastingStartTime(new Date())} className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-orange-600 transition">Start Fast</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Breathing Tool */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center relative overflow-hidden">
                            <h3 className="font-bold text-gray-800 mb-2 relative z-10 flex items-center gap-2"><Wind size={18}/> Stress Relief Breathing</h3>
                            <p className="text-gray-500 text-sm mb-8 relative z-10">Follow the circle to relax.</p>
                            
                            <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center animate-[pulse_4s_ease-in-out_infinite] relative z-10">
                                <div className="w-16 h-16 bg-blue-200 rounded-full flex items-center justify-center animate-[pulse_4s_ease-in-out_infinite_reverse]">
                                    <span className="text-xs font-bold text-blue-600">Breathe</span>
                                </div>
                            </div>
                        </div>

                        {/* Symptom Logger */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><Activity size={18}/> Symptom Logger</h3>
                            <div className="flex flex-wrap gap-2 mb-6">
                                {['Headache', 'Eye Strain', 'Acidity', 'Back Pain', 'Bloating'].map(sym => (
                                    <button 
                                        key={sym} 
                                        onClick={() => addSymptomTag(sym)}
                                        className="px-4 py-2 rounded-full border border-gray-200 text-gray-600 hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 transition text-sm font-medium"
                                    >
                                        + {sym}
                                    </button>
                                ))}
                            </div>
                            <textarea 
                                value={symptomText}
                                onChange={(e) => setSymptomText(e.target.value)}
                                className="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-brand-200 resize-none h-24 text-sm" 
                                placeholder="Describe how you feel today..."
                            ></textarea>
                            <button 
                                onClick={logSymptom}
                                className={`mt-4 w-full py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${showLogSuccess ? 'bg-green-600 text-white' : 'bg-gray-900 text-white hover:bg-black'}`}
                            >
                                {showLogSuccess ? <CheckCircle2 size={18}/> : 'Log Entry'}
                                {showLogSuccess && ' Logged!'}
                            </button>
                        </div>
                     </div>
                 )}

                 {/* TAB: FUTURE ROADMAP */}
                 {trackerTab === 'FUTURE' && (
                     <div className="space-y-6">
                         <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 text-white text-center">
                             <Construction size={48} className="mx-auto mb-4 text-brand-400" />
                             <h3 className="text-2xl font-bold mb-2">Coming Soon</h3>
                             <p className="text-gray-400 mb-8">We are building advanced AI features to beat the competition.</p>
                             
                             <div className="grid md:grid-cols-3 gap-4 text-left">
                                 <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                                     <h4 className="font-bold text-brand-300 mb-1">AI Doctor Report</h4>
                                     <p className="text-xs text-gray-300">Export your monthly logs as a PDF for your GP.</p>
                                 </div>
                                 <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                                     <h4 className="font-bold text-brand-300 mb-1">Period Tracker</h4>
                                     <p className="text-xs text-gray-300">Cycle sync your workouts & nutrition.</p>
                                 </div>
                             </div>
                         </div>
                     </div>
                 )}

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
                className="w-16 h-16 bg-gradient-to-tr from-brand-500 to-brand-400 rounded-full shadow-lg shadow-brand-200 flex items-center justify-center text-white transform active:scale-95 transition border-4 border-slate-50"
              >
                  <ScanLine size={28} />
              </button>
          </div>
          <button onClick={() => setView(AppView.CALCULATORS)} className={`p-2 rounded-xl flex flex-col items-center ${view === AppView.CALCULATORS ? 'text-brand-600' : 'text-gray-400'}`}>
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

      {/* Workout Modal */}
      {showWorkoutModal && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden relative">
                  <div className="p-6 text-center">
                      <h3 className="text-2xl font-bold mb-1">Desk Warrior Session</h3>
                      <p className="text-gray-500 mb-8">Follow the exercises</p>
                      
                      <div className="w-48 h-48 rounded-full border-8 border-brand-100 border-t-brand-600 mx-auto flex items-center justify-center mb-8 relative">
                          <span className="text-4xl font-black text-brand-600">
                              {Math.floor(workoutTimer / 60)}:{(workoutTimer % 60).toString().padStart(2, '0')}
                          </span>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-xl mb-6">
                          <p className="font-bold text-lg">Next: Neck Stretches</p>
                          <p className="text-gray-500 text-sm">Tilt head left and right slowly.</p>
                      </div>

                      <button onClick={() => setShowWorkoutModal(false)} className="w-full py-4 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition">
                          End Session
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default App;
