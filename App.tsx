
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Utensils, ScanLine, Activity, MessageSquare, 
  User as UserIcon, Bell, Mic, MicOff,
  Sun, BedDouble, Smile, AlertTriangle, History, Camera, TrendingUp,
  Award, Zap, Calendar, Droplets, BookOpen, Heart, ChevronRight, Share2, Plus, X as XIcon, Trash2, ShoppingCart, Play, CheckCircle2, Wind, Scale, Calculator, Monitor, Timer, Flame, Info, Construction, HeartPulse, PieChart, Target, Ruler, Dumbbell, Baby, Percent
} from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Components
import Scanner from './components/Scanner';
import { UserProfile, AppView, MealPlan, WorkoutPlan, Gender, ScanResult, ProgressPhoto, ShoppingItem, ActivityLevel } from './types';
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
      className={`fixed bottom-24 right-6 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all transform hover:scale-105 z-40 ${listening ? 'bg-red-500 animate-pulse' : 'bg-brand-600'}`}
    >
      {listening ? <MicOff className="text-white" /> : <Mic className="text-white" />}
    </button>
  );
};

// --- MAIN APP COMPONENT ---

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [showScanner, setShowScanner] = useState(false);
  const [dailyPlan, setDailyPlan] = useState<{meal: MealPlan | null, workout: WorkoutPlan | null}>({meal: null, workout: null});
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
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
  const [stoolType, setStoolType] = useState<number | null>(null);

  // Calculator Suite State
  const [trackerTab, setTrackerTab] = useState<'TOOLS' | 'FUTURE'>('TOOLS');
  const [calcActivity, setCalcActivity] = useState<ActivityLevel>(ActivityLevel.SEDENTARY);
  const [bodyStats, setBodyStats] = useState({ waist: 90, neck: 38, hip: 100 }); // cm
  
  // New Calculator States
  const [orm, setOrm] = useState({ weight: 60, reps: 5 });
  const [lmpDate, setLmpDate] = useState("");
  const [breathTimer, setBreathTimer] = useState(0);
  const [isBreathHolding, setIsBreathHolding] = useState(false);

  // Initialize Data
  useEffect(() => {
    if (!dailyPlan.meal) handleGeneratePlan();
  }, []);

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

  const handleGeneratePlan = async () => {
    setLoadingPlan(true);
    try {
      const plan = await generateDailyPlan(profile);
      setDailyPlan({ meal: plan.mealPlan, workout: plan.workoutPlan });
      if (plan.mealPlan.shoppingList) {
          setShoppingList(plan.mealPlan.shoppingList.map(item => ({ name: item, checked: false })));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPlan(false);
    }
  };

  const handleSaveScan = (result: ScanResult) => {
    setScanHistory(prev => [result, ...prev]);
    setProfile(p => ({ ...p, xp: p.xp + 50 }));
  };

  const handleAddProgressPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const newPhoto: ProgressPhoto = {
                  id: Date.now().toString(),
                  date: new Date().toLocaleDateString(),
                  image: reader.result as string,
                  note: `Weight: ${profile.weight}kg`
              };
              setProgressPhotos(prev => [newPhoto, ...prev]);
              setProfile(p => ({ ...p, xp: p.xp + 100 }));
          };
          reader.readAsDataURL(file);
      }
  };

  const handleVoiceInput = async (text: string) => {
    setIsChatOpen(true);
    const newHistory = [...chatHistory, { role: 'user' as const, text }];
    setChatHistory(newHistory);
    
    const apiHistory = newHistory.slice(0, -1).map(h => ({
      role: h.role,
      parts: [{ text: h.text }]
    }));

    try {
      const response = await chatWithAgent(apiHistory, text);
      setChatHistory([...newHistory, { role: 'model', text: response }]);
      
      const utterance = new SpeechSynthesisUtterance(response);
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      setChatHistory([...newHistory, { role: 'model', text: "Sorry, I couldn't process that right now. Please try again." }]);
    }
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

  // 1. BMR & TDEE
  const calculateBMR = () => {
      // Mifflin-St Jeor
      if (profile.gender === Gender.MALE) {
          return (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age) + 5;
      }
      return (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age) - 161;
  };
  const bmr = calculateBMR();
  const tdee = Math.round(bmr * calcActivity);

  // 2. Protein & Water
  const proteinNeeds = Math.round(profile.weight * (calcActivity > 1.5 ? 1.8 : 1.2)); // 1.2g to 1.8g per kg
  const waterNeeds = (profile.weight * 0.033).toFixed(1);

  // 3. Ideal Body Weight (Devine Formula)
  const calculateIBW = () => {
      const heightInInches = profile.height / 2.54;
      const base = profile.gender === Gender.MALE ? 50 : 45.5;
      const factor = 2.3 * (heightInInches - 60);
      return Math.round(base + factor);
  };
  const ibw = calculateIBW();

  // 4. Body Fat % (US Navy Method)
  const calculateBodyFat = () => {
      const h = profile.height;
      const n = bodyStats.neck;
      const w = bodyStats.waist;
      const hip = bodyStats.hip;

      if (profile.gender === Gender.MALE) {
          // 495 / (1.0324 - 0.19077 * log10(waist - neck) + 0.15456 * log10(height)) - 450
          if (w - n <= 0) return 0;
          const val = 495 / (1.0324 - 0.19077 * Math.log10(w - n) + 0.15456 * Math.log10(h)) - 450;
          return val > 0 ? val.toFixed(1) : 0;
      } else {
          // 495 / (1.29579 - 0.35004 * log10(waist + hip - neck) + 0.22100 * log10(height)) - 450
          if (w + hip - n <= 0) return 0;
          const val = 495 / (1.29579 - 0.35004 * Math.log10(w + hip - n) + 0.22100 * Math.log10(h)) - 450;
          return val > 0 ? val.toFixed(1) : 0;
      }
  };
  const bodyFat = calculateBodyFat();

  // 5. Heart Rate Zones
  const maxHR = 220 - profile.age;
  const zone2Min = Math.round(maxHR * 0.6);
  const zone2Max = Math.round(maxHR * 0.7);

  // 6. Waist to Hip Ratio
  const whr = (bodyStats.waist / bodyStats.hip).toFixed(2);
  const getWhrRisk = () => {
      const r = parseFloat(whr);
      if (profile.gender === Gender.MALE) {
          if (r <= 0.95) return 'Low Risk';
          if (r <= 1.0) return 'Moderate';
          return 'High Risk';
      } else {
          if (r <= 0.80) return 'Low Risk';
          if (r <= 0.85) return 'Moderate';
          return 'High Risk';
      }
  }

  // 7. One Rep Max
  const calculate1RM = () => {
      // Epley Formula
      return Math.round(orm.weight * (1 + orm.reps / 30));
  }
  const oneRepMax = calculate1RM();

  // 8. Pregnancy Due Date
  const calculateDueDate = () => {
      if (!lmpDate) return null;
      const date = new Date(lmpDate);
      date.setDate(date.getDate() + 280);
      return date.toLocaleDateString(undefined, {  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
  const dueDate = calculateDueDate();

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
            { id: AppView.PLANNER, icon: Utensils, label: 'Day Planner' },
            { id: AppView.TRACKER, icon: Activity, label: 'Wellness Tools' },
            { id: AppView.CALCULATORS, icon: Calculator, label: 'Calculators' },
            { id: AppView.HISTORY, icon: History, label: 'History' },
            { id: AppView.PROGRESS_PHOTOS, icon: Camera, label: 'Body Progress' },
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
                  <button onClick={() => startWorkout()} className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition hover:opacity-80 bg-orange-100 text-orange-600">
                      <Zap size={16} /> Quick Workout
                  </button>
                  <button onClick={incrementWater} className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition hover:opacity-80 bg-blue-100 text-blue-600">
                      <Droplets size={16} /> Log Water
                  </button>
                  <button onClick={() => { setSelectedScan(null); setShowScanner(true); }} className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition hover:opacity-80 bg-purple-100 text-purple-600">
                      <Monitor size={16} /> Roast My Desk
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
                            {[
                                { title: 'Scanned Apple', time: '2h ago', type: 'Food', score: 95 },
                                { title: 'Logged Sleep', time: '7h ago', type: 'Health', score: 80 },
                                { title: 'Drank Water', time: '8h ago', type: 'Hydration', score: 100 },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">{item.title}</p>
                                            <p className="text-xs text-gray-400">{item.time}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-brand-600 bg-brand-100 px-2 py-1 rounded">{item.score} pts</span>
                                </div>
                            ))}
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

        {/* --- VIEW: CALCULATORS (NEW) --- */}
        {view === AppView.CALCULATORS && (
            <div className="space-y-8 animate-in fade-in">
                 <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold">Health Calculators</h2>
                        <p className="text-gray-500">Comprehensive suite of medical & fitness tools.</p>
                    </div>
                 </div>

                 <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                     
                     {/* Global Input for Calc */}
                     <div className="mb-8">
                         <label className="block text-sm font-bold text-gray-700 mb-2">Your Activity Level</label>
                         <input 
                             type="range" 
                             min="1.2" 
                             max="1.9" 
                             step="0.175" 
                             value={calcActivity} 
                             onChange={(e) => setCalcActivity(parseFloat(e.target.value))}
                             className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                         />
                         <div className="flex justify-between text-xs text-gray-500 font-bold uppercase mt-2">
                             <span>Sedentary</span>
                             <span>Light</span>
                             <span>Moderate</span>
                             <span>Active</span>
                             <span>Athlete</span>
                         </div>
                         <p className="text-center text-brand-600 font-bold mt-2 text-lg">
                             {calcActivity === 1.2 ? 'Sedentary (Office Job)' : 
                              calcActivity === 1.375 ? 'Light Exercise (1-2 days)' :
                              calcActivity === 1.55 ? 'Moderate Exercise (3-5 days)' :
                              calcActivity === 1.725 ? 'Heavy Exercise (6-7 days)' : 'Athlete (2x per day)'}
                         </p>
                     </div>

                     {/* Body Stats Input for Advanced Calc */}
                     <div className="mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                         <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Ruler size={16}/> Body Measurements (for Body Fat, WHR)</h4>
                         <div className="grid grid-cols-3 gap-4">
                             <div>
                                 <label className="text-xs font-bold text-gray-500 uppercase">Neck (cm)</label>
                                 <input type="number" value={bodyStats.neck} onChange={e => setBodyStats({...bodyStats, neck: parseInt(e.target.value)})} className="w-full p-2 rounded-lg mt-1 border border-gray-200 font-bold text-center" />
                             </div>
                             <div>
                                 <label className="text-xs font-bold text-gray-500 uppercase">Waist (cm)</label>
                                 <input type="number" value={bodyStats.waist} onChange={e => setBodyStats({...bodyStats, waist: parseInt(e.target.value)})} className="w-full p-2 rounded-lg mt-1 border border-gray-200 font-bold text-center" />
                             </div>
                             <div>
                                 <label className="text-xs font-bold text-gray-500 uppercase">Hip (cm)</label>
                                 <input type="number" value={bodyStats.hip} onChange={e => setBodyStats({...bodyStats, hip: parseInt(e.target.value)})} className="w-full p-2 rounded-lg mt-1 border border-gray-200 font-bold text-center" />
                             </div>
                         </div>
                     </div>

                     {/* Grid of Calculators */}
                     <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                         
                         {/* --- SECTION: BODY COMPOSITION --- */}
                         
                         {/* BMI Card */}
                         <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:shadow-md transition">
                             <div className="flex justify-between items-start mb-4">
                                 <div><h4 className="font-bold text-slate-700">BMI Check</h4><p className="text-xs text-slate-500">Body Mass Index</p></div>
                                 <Scale size={20} className="text-slate-500" />
                             </div>
                             <div className="text-3xl font-black text-slate-800 mb-2">{(profile.weight / ((profile.height/100)**2)).toFixed(1)}</div>
                             <div className="w-full bg-slate-200 rounded-full h-2 mb-2"><div className="h-full bg-slate-600 rounded-full" style={{width: '60%'}}></div></div>
                             <p className="text-xs text-slate-600 font-bold">Normal Weight</p>
                         </div>

                         {/* Body Fat Card */}
                         <div className="bg-red-50 p-6 rounded-2xl border border-red-100 hover:shadow-md transition">
                             <div className="flex justify-between items-start mb-4">
                                 <div><h4 className="font-bold text-red-700">Body Fat %</h4><p className="text-xs text-red-500">US Navy Method</p></div>
                                 <Percent size={20} className="text-red-500" />
                             </div>
                             <div className="text-3xl font-black text-red-900 mb-2">{bodyFat}%</div>
                             <p className="text-xs text-red-700">Based on waist/neck/hip.</p>
                         </div>

                         {/* Waist to Hip Ratio */}
                         <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 hover:shadow-md transition">
                             <div className="flex justify-between items-start mb-4">
                                 <div><h4 className="font-bold text-orange-700">WHR Score</h4><p className="text-xs text-orange-500">Metabolic Risk</p></div>
                                 <Activity size={20} className="text-orange-500" />
                             </div>
                             <div className="text-3xl font-black text-orange-900 mb-2">{whr}</div>
                             <p className="text-xs font-bold text-orange-700">{getWhrRisk()}</p>
                         </div>

                         {/* Ideal Body Weight */}
                         <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 hover:shadow-md transition">
                             <div className="flex justify-between items-start mb-4">
                                 <div><h4 className="font-bold text-purple-700">Ideal Weight</h4><p className="text-xs text-purple-500">Devine Formula</p></div>
                                 <Target size={20} className="text-purple-500" />
                             </div>
                             <div className="text-3xl font-black text-purple-900 mb-2">{ibw} <span className="text-sm font-medium text-purple-500">kg</span></div>
                             <p className="text-xs text-purple-700">Estimated healthy goal.</p>
                         </div>

                         {/* --- SECTION: ENERGY & NUTRITION --- */}

                         {/* BMR Card */}
                         <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 hover:shadow-md transition">
                             <div className="flex justify-between items-start mb-4">
                                 <div><h4 className="font-bold text-blue-700">BMR</h4><p className="text-xs text-blue-500">Calories at Rest</p></div>
                                 <Flame size={20} className="text-blue-500" />
                             </div>
                             <div className="text-3xl font-black text-blue-800 mb-2">{Math.round(bmr)}</div>
                             <p className="text-xs text-blue-600">Base metabolic rate.</p>
                         </div>

                         {/* TDEE Card */}
                         <div className="bg-brand-50 p-6 rounded-2xl border border-brand-100 hover:shadow-md transition">
                             <div className="flex justify-between items-start mb-4">
                                 <div><h4 className="font-bold text-brand-700">TDEE</h4><p className="text-xs text-brand-500">Total Energy</p></div>
                                 <Zap size={20} className="text-brand-500" />
                             </div>
                             <div className="text-3xl font-black text-brand-900 mb-2">{tdee}</div>
                             <p className="text-xs text-brand-700">Maintenance calories.</p>
                         </div>
                         
                         {/* Protein Card */}
                         <div className="bg-green-50 p-6 rounded-2xl border border-green-100 hover:shadow-md transition">
                             <div className="flex justify-between items-start mb-4">
                                 <div><h4 className="font-bold text-green-700">Protein</h4><p className="text-xs text-green-500">Daily Target</p></div>
                                 <Utensils size={20} className="text-green-500" />
                             </div>
                             <div className="text-3xl font-black text-green-900 mb-2">{proteinNeeds}g</div>
                             <p className="text-xs text-green-700">For muscle repair.</p>
                         </div>

                         {/* --- SECTION: PERFORMANCE --- */}

                         {/* One Rep Max */}
                         <div className="bg-gray-800 text-white p-6 rounded-2xl border border-gray-700 hover:shadow-md transition">
                             <div className="flex justify-between items-start mb-4">
                                 <div><h4 className="font-bold">1 Rep Max</h4><p className="text-xs text-gray-400">Strength Potential</p></div>
                                 <Dumbbell size={20} className="text-gray-400" />
                             </div>
                             <div className="flex gap-2 mb-2">
                                 <input type="number" className="w-16 bg-gray-700 rounded p-1 text-center text-sm font-bold" value={orm.weight} onChange={e => setOrm({...orm, weight: parseInt(e.target.value)})} placeholder="Kg" />
                                 <input type="number" className="w-12 bg-gray-700 rounded p-1 text-center text-sm font-bold" value={orm.reps} onChange={e => setOrm({...orm, reps: parseInt(e.target.value)})} placeholder="Reps" />
                             </div>
                             <div className="text-3xl font-black text-brand-400 mb-1">{oneRepMax} <span className="text-sm text-gray-400">kg</span></div>
                             <p className="text-xs text-gray-400">Epley Formula</p>
                         </div>

                         {/* Breath Hold Test */}
                         <div className="bg-teal-50 p-6 rounded-2xl border border-teal-100 hover:shadow-md transition flex flex-col items-center text-center">
                             <h4 className="font-bold text-teal-800 mb-1">Lung Capacity</h4>
                             <p className="text-xs text-teal-600 mb-4">Breath Hold Test</p>
                             
                             <div className="w-20 h-20 rounded-full border-4 border-teal-200 flex items-center justify-center mb-4 bg-white relative">
                                 <span className="text-2xl font-black text-teal-600">{breathTimer}s</span>
                                 {isBreathHolding && <div className="absolute inset-0 border-4 border-teal-500 rounded-full animate-ping opacity-20"></div>}
                             </div>
                             
                             <button 
                                 onMouseDown={() => { setIsBreathHolding(true); setBreathTimer(0); }}
                                 onMouseUp={() => setIsBreathHolding(false)}
                                 onTouchStart={() => { setIsBreathHolding(true); setBreathTimer(0); }}
                                 onTouchEnd={() => setIsBreathHolding(false)}
                                 className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm active:scale-95 transition"
                             >
                                 Hold to Test
                             </button>
                         </div>

                         {/* Pregnancy Due Date */}
                         <div className="bg-pink-50 p-6 rounded-2xl border border-pink-100 hover:shadow-md transition">
                             <div className="flex justify-between items-start mb-4">
                                 <div><h4 className="font-bold text-pink-700">Due Date</h4><p className="text-xs text-pink-500">Pregnancy Calc</p></div>
                                 <Baby size={20} className="text-pink-500" />
                             </div>
                             <input type="date" className="w-full bg-white border border-pink-200 rounded-lg p-2 text-sm mb-3" onChange={(e) => setLmpDate(e.target.value)} />
                             <div className="text-lg font-black text-pink-900 mb-1 leading-tight">{dueDate || '--'}</div>
                             <p className="text-xs text-pink-700">Estimated Delivery</p>
                         </div>

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

                        {/* Gut Health Tracker */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">💩 Gut Health Tracker</h3>
                            <p className="text-xs text-gray-500 mb-4">Track digestion for acidity insights.</p>
                            <div className="flex justify-between gap-1 mb-4">
                                {[1,2,3,4,5].map(type => (
                                    <button 
                                        key={type}
                                        onClick={() => setStoolType(type)}
                                        className={`flex-1 h-12 rounded-lg flex items-center justify-center font-bold text-lg transition ${stoolType === type ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                            <p className="text-center text-xs text-gray-400 font-medium">Bristol Stool Scale (1: Hard - 5: Liquid)</p>
                        </div>

                        {/* Sleep Calc */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><BedDouble size={18}/> Sleep Cycle Calculator</h3>
                            <div className="flex gap-4 mb-4">
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-gray-400">Bedtime</label>
                                    <input type="time" className="w-full p-2 bg-gray-50 rounded-lg mt-1 font-bold" defaultValue="23:00" />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-gray-400">Wake Up</label>
                                    <input type="time" className="w-full p-2 bg-gray-50 rounded-lg mt-1 font-bold" defaultValue="07:00" />
                                </div>
                            </div>
                            <div className="p-4 bg-purple-50 rounded-xl text-center">
                                <p className="text-purple-900 font-bold text-lg">5 Cycles Recommended</p>
                                <p className="text-purple-600 text-xs">Wake up at 6:30 AM or 8:00 AM for best energy.</p>
                            </div>
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
                                     <h4 className="font-bold text-brand-300 mb-1">Sleep Sounds</h4>
                                     <p className="text-xs text-gray-300">AI-generated brown noise & binaural beats.</p>
                                 </div>
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
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 p-2 flex justify-around items-center z-40 pb-safe">
          <button onClick={() => setView(AppView.DASHBOARD)} className={`p-2 rounded-xl flex flex-col items-center ${view === AppView.DASHBOARD ? 'text-brand-600' : 'text-gray-400'}`}>
              <LayoutDashboard size={22} />
              <span className="text-[10px] font-bold mt-1">Home</span>
          </button>
          <button onClick={() => setView(AppView.PLANNER)} className={`p-2 rounded-xl flex flex-col items-center ${view === AppView.PLANNER ? 'text-brand-600' : 'text-gray-400'}`}>
              <Utensils size={22} />
              <span className="text-[10px] font-bold mt-1">Plan</span>
          </button>
          <div className="relative -top-6">
              <button 
                onClick={() => { setSelectedScan(null); setShowScanner(true); }}
                className="w-14 h-14 bg-gradient-to-tr from-brand-600 to-brand-400 rounded-full shadow-lg shadow-brand-200 flex items-center justify-center text-white transform active:scale-95 transition border-4 border-slate-50"
              >
                  <ScanLine size={24} />
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

      <VoiceAgent onSpeechResult={handleVoiceInput} />

      {/* Chat Dialog */}
      {isChatOpen && (
          <div className="fixed bottom-28 right-6 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-30 flex flex-col max-h-[500px] animate-in slide-in-from-bottom-10 fade-in duration-300">
              <div className="p-4 border-b flex justify-between items-center bg-brand-600 rounded-t-2xl text-white">
                  <h3 className="font-bold flex items-center gap-2"><MessageSquare size={18}/> Health Assistant</h3>
                  <button onClick={() => setIsChatOpen(false)}><XIcon size={18}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 h-80">
                  {chatHistory.length === 0 && (
                      <div className="text-center mt-8">
                          <p className="text-gray-400 text-sm">Ask me anything!</p>
                          <div className="mt-4 flex flex-wrap justify-center gap-2">
                              {['My acidity is high', 'Exercise for back pain', 'Good hair foods'].map(q => (
                                  <button key={q} onClick={() => handleVoiceInput(q)} className="text-xs bg-white border px-3 py-1 rounded-full text-brand-600 hover:bg-brand-50">
                                      {q}
                                  </button>
                              ))}
                          </div>
                      </div>
                  )}
                  {chatHistory.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-brand-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'}`}>
                              {msg.text}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

    </div>
  );
};

export default App;
