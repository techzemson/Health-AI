
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Utensils, ScanLine, Activity, MessageSquare, 
  User as UserIcon, Bell, Mic, MicOff,
  Sun, BedDouble, Smile, AlertTriangle, History, Camera, TrendingUp,
  Award, Zap, Calendar, Droplets, BookOpen, Heart, ChevronRight, Share2, Plus, X as XIcon, Trash2, ShoppingCart, Play, CheckCircle2, Wind, Scale, Calculator
} from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Components
import Scanner from './components/Scanner';
import { UserProfile, AppView, MealPlan, WorkoutPlan, Gender, ScanResult, ProgressPhoto } from './types';
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
  const [mood, setMood] = useState(3);
  const [shoppingList, setShoppingList] = useState<string[]>([]);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [workoutTimer, setWorkoutTimer] = useState(0);

  // Initialize Data
  useEffect(() => {
    if (!dailyPlan.meal) handleGeneratePlan();
  }, []);

  useEffect(() => {
    let interval: any;
    if (showWorkoutModal && workoutTimer > 0) {
      interval = setInterval(() => setWorkoutTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [showWorkoutModal, workoutTimer]);

  const handleGeneratePlan = async () => {
    setLoadingPlan(true);
    try {
      const plan = await generateDailyPlan(profile);
      setDailyPlan({ meal: plan.mealPlan, workout: plan.workoutPlan });
      if (plan.mealPlan.shoppingList) {
          setShoppingList(plan.mealPlan.shoppingList);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPlan(false);
    }
  };

  const handleSaveScan = (result: ScanResult) => {
    setScanHistory(prev => [result, ...prev]);
    // Award XP
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
              setProfile(p => ({ ...p, xp: p.xp + 100 })); // Big XP reward
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
      // Logic to toggle done state could go here, for now just basic list
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
            { id: AppView.PLANNER, icon: Utensils, label: 'Day Planner' },
            { id: AppView.TRACKER, icon: Activity, label: 'Wellness Tools' },
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
                  <button onClick={() => setWater(w => Math.min(w+1, 8))} className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition hover:opacity-80 bg-blue-100 text-blue-600">
                      <Droplets size={16} /> Log Water
                  </button>
                  <button onClick={() => alert("Daily Tip: Drink water 30 mins before meals for better digestion!")} className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition hover:opacity-80 bg-purple-100 text-purple-600">
                      <BookOpen size={16} /> Read Tip
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
                <button onClick={() => setWater(w => Math.min(w+1, 8))} className="absolute inset-0 z-20 cursor-pointer"></button>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-125 transition duration-500"></div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-purple-100 relative overflow-hidden group">
                <div className="flex justify-between items-start mb-2 relative z-10">
                    <span className="text-gray-400 text-xs uppercase font-extrabold tracking-wider">Sleep Score</span>
                    <BedDouble size={18} className="text-purple-500" />
                </div>
                <div className="text-3xl font-black text-gray-900 relative z-10">85 <span className="text-sm font-medium text-gray-400">/ 100</span></div>
                <div className="mt-2 text-xs text-purple-600 font-bold relative z-10">Great Quality</div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-purple-50 rounded-full group-hover:scale-125 transition duration-500"></div>
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
                 {/* Today's Goal Card */}
                 <div className="bg-gradient-to-r from-brand-700 to-brand-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-brand-100">
                    <div className="relative z-10 max-w-lg">
                        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold mb-4 border border-white/20">
                             <Award size={14} className="text-yellow-300"/> Active Timer
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Desk Warrior Mission</h3>
                        <p className="opacity-80 mb-6 leading-relaxed">You've been sedentary for 4 hours. Start the active timer to improve spine health.</p>
                        <div className="flex gap-3">
                            <button 
                                onClick={startWorkout}
                                className="bg-white text-brand-900 px-6 py-3 rounded-xl text-sm font-bold hover:bg-gray-100 transition shadow-lg flex items-center gap-2"
                            >
                                <Play size={16} fill="currentColor"/> Start Routine
                            </button>
                            <button className="px-6 py-3 rounded-xl text-sm font-bold border border-white/30 hover:bg-white/10 transition">
                                Skip
                            </button>
                        </div>
                    </div>
                    {/* Abstract Shapes */}
                    <div className="absolute right-0 top-0 w-64 h-64 bg-brand-500 opacity-20 rounded-full translate-x-10 -translate-y-10 blur-3xl"></div>
                    <div className="absolute bottom-0 right-20 w-32 h-32 bg-teal-400 opacity-20 rounded-full translate-y-10 blur-2xl"></div>
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

        {/* --- VIEW: HISTORY --- */}
        {view === AppView.HISTORY && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Scan History</h2>
                        <p className="text-gray-500">Your past analyses and product insights.</p>
                    </div>
                </div>

                {scanHistory.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
                        <History size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-bold text-gray-700">No History Yet</h3>
                        <p className="text-gray-500 mb-6">Scan your first product to start building your health log.</p>
                        <button onClick={() => { setSelectedScan(null); setShowScanner(true); }} className="bg-brand-600 text-white px-6 py-2 rounded-lg font-bold">Start Scanning</button>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {scanHistory.map((scan, i) => (
                            <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition">
                                <div className="h-48 overflow-hidden relative">
                                    <img src={scan.imagePreview} alt="scan" className="w-full h-full object-cover group-hover:scale-110 transition duration-500"/>
                                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold shadow-sm">
                                        {new Date(scan.timestamp).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded bg-gray-100 text-gray-600`}>{scan.type}</span>
                                        <span className={`text-sm font-bold ${scan.recommendation === 'BUY' ? 'text-green-600' : scan.recommendation === 'AVOID' ? 'text-red-600' : 'text-orange-600'}`}>
                                            {scan.recommendation?.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-lg text-gray-800 mb-1">{scan.productName || 'Unknown Item'}</h4>
                                    <p className="text-gray-500 text-sm line-clamp-2">{scan.analysis}</p>
                                    
                                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                                        <div className="flex items-center gap-1 text-yellow-500">
                                            <Award size={16} />
                                            <span className="text-xs font-bold text-gray-700">{scan.score}/100</span>
                                        </div>
                                        <button onClick={() => handleViewScan(scan)} className="text-brand-600 text-sm font-bold hover:underline">View Details</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
             </div>
        )}

        {/* --- VIEW: PROGRESS PHOTOS --- */}
        {view === AppView.PROGRESS_PHOTOS && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Body Progress</h2>
                        <p className="text-gray-500">Visual tracking of your transformation journey.</p>
                    </div>
                    <label className="cursor-pointer bg-brand-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-brand-700 transition flex items-center gap-2 shadow-lg shadow-brand-200">
                        <Plus size={18} /> Add Photo
                        <input type="file" className="hidden" accept="image/*" onChange={handleAddProgressPhoto} />
                    </label>
                </div>

                {progressPhotos.length === 0 ? (
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl p-10 text-center border border-indigo-100">
                         <Camera size={64} className="mx-auto text-indigo-300 mb-6" />
                         <h3 className="text-xl font-bold text-indigo-900 mb-2">Start Your Visual Journey</h3>
                         <p className="text-indigo-600 max-w-md mx-auto mb-8">Take a photo today to compare with your future self. We'll help you track hair growth, skin improvements, and weight changes.</p>
                         <label className="cursor-pointer bg-white text-indigo-600 px-8 py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition border border-indigo-100 inline-flex items-center gap-2">
                            <Camera size={20}/> Upload First Photo
                            <input type="file" className="hidden" accept="image/*" onChange={handleAddProgressPhoto} />
                        </label>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {progressPhotos.map((photo, i) => (
                            <div key={i} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 group relative">
                                <div className="aspect-[3/4] rounded-xl overflow-hidden mb-3 relative">
                                    <img src={photo.image} alt="progress" className="w-full h-full object-cover"/>
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                        <button className="p-2 bg-white rounded-full text-gray-900 hover:scale-110 transition"><Share2 size={16}/></button>
                                        <button className="p-2 bg-red-500 rounded-full text-white hover:scale-110 transition"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-sm font-bold text-gray-800">{photo.date}</span>
                                    <span className="text-xs text-gray-400 font-medium">{photo.note}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
             </div>
        )}

        {/* --- VIEW: PLANNER --- */}
        {view === AppView.PLANNER && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold">Your Day Planner</h2>
                        <p className="text-gray-500 text-sm">Meals, Shopping & Workouts</p>
                    </div>
                    <button onClick={handleGeneratePlan} disabled={loadingPlan} className="text-sm text-brand-600 font-bold hover:bg-brand-50 px-3 py-1.5 rounded-lg transition">
                        {loadingPlan ? 'Crafting Plan...' : 'Regenerate Plan'}
                    </button>
                </div>

                {loadingPlan && (
                    <div className="p-20 text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
                        <div className="animate-spin w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <h3 className="text-lg font-bold text-gray-800">AI is planning your day...</h3>
                        <p className="text-gray-500 text-sm">Generating recipes, shopping list and exercises.</p>
                    </div>
                )}

                {!loadingPlan && dailyPlan.meal && (
                    <div className="grid lg:grid-cols-2 gap-8">
                        {/* Meal Plan */}
                        <div className="space-y-6">
                            <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                <div className="p-2 bg-green-100 text-green-600 rounded-lg"><Utensils size={20}/></div>
                                Today's Menu
                            </h3>
                            
                            {/* Calorie Progress */}
                            <div className="bg-white p-4 rounded-xl border border-gray-100">
                                <div className="flex justify-between text-sm font-bold mb-1">
                                    <span>Calories</span>
                                    <span className="text-brand-600">850 / 2200 kcal</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                    <div className="bg-brand-500 w-[40%] h-full"></div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {[
                                    { label: 'Breakfast', food: dailyPlan.meal.breakfast, time: '8:00 AM', cal: '350 cal' },
                                    { label: 'Lunch', food: dailyPlan.meal.lunch, time: '1:00 PM', cal: '550 cal' },
                                    { label: 'Snack', food: dailyPlan.meal.snacks, time: '4:30 PM', cal: '150 cal' },
                                    { label: 'Dinner', food: dailyPlan.meal.dinner, time: '8:00 PM', cal: '400 cal' },
                                ].map((meal, idx) => (
                                    <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center group hover:border-brand-200 transition">
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1 w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-xs shadow-sm">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{meal.label}</span>
                                                <p className="font-bold text-gray-800 text-lg">{meal.food}</p>
                                                <p className="text-xs text-brand-600 mt-1 font-medium">{meal.time} • {meal.cal}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Shopping List */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h4 className="font-bold flex items-center gap-2 mb-4"><ShoppingCart size={18} /> Smart Shopping List</h4>
                                <div className="space-y-2">
                                    {shoppingList.map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer" onClick={() => toggleShoppingItem(i)}>
                                            <div className="w-5 h-5 rounded border border-gray-300 flex items-center justify-center text-white bg-white hover:border-brand-500">
                                                {/* Logic to show check would go here */}
                                            </div>
                                            <span className="text-sm text-gray-700">{item}</span>
                                        </div>
                                    ))}
                                    {shoppingList.length === 0 && <p className="text-gray-400 text-sm">Generating items...</p>}
                                </div>
                            </div>
                        </div>

                        {/* Workout Plan */}
                        <div className="space-y-6">
                            <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><Activity size={20}/></div>
                                Desk Warrior Routine
                            </h3>
                            
                            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="bg-orange-50 p-6 border-b border-orange-100 flex justify-between items-center">
                                    <div>
                                        <div className="text-orange-800 font-bold">{dailyPlan.workout?.type}</div>
                                        <p className="text-orange-700/80 text-sm mt-1">Reduced eye strain & improved posture.</p>
                                    </div>
                                    <button onClick={startWorkout} className="bg-white text-orange-600 p-3 rounded-full shadow-sm hover:scale-105 transition"><Play size={20} fill="currentColor"/></button>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {dailyPlan.workout?.exercises.map((ex, i) => (
                                        <div key={i} className="p-5 hover:bg-gray-50 transition flex gap-4">
                                            <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl">
                                                🧘
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-gray-800">{ex.name}</span>
                                                    <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded">{ex.duration}</span>
                                                </div>
                                                <p className="text-sm text-gray-500 leading-relaxed">{ex.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                             {/* Eye Care Tip Widget */}
                            <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200 relative overflow-hidden">
                                <div className="relative z-10">
                                    <h4 className="font-bold flex items-center gap-2 mb-2"><MessageSquare size={18} /> Eye Care Rule 20-20-20</h4>
                                    <p className="text-blue-100 text-sm mb-4">Every 20 minutes, look at something 20 feet away for 20 seconds.</p>
                                    <button className="bg-white text-blue-600 px-4 py-2 rounded-lg text-xs font-bold">Start Timer</button>
                                </div>
                                <div className="absolute -right-4 -bottom-10 text-9xl opacity-20 rotate-12">👁️</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

         {/* --- VIEW: TRACKER (WELLNESS TOOLS) --- */}
         {view === AppView.TRACKER && (
             <div className="space-y-8 animate-in fade-in">
                 <h2 className="text-2xl font-bold mb-4">Wellness Tools</h2>
                 <div className="grid md:grid-cols-2 gap-6">
                    {/* BMI Calculator */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-6 text-brand-600">
                             <Scale size={20} /> <h3 className="font-bold text-gray-800">BMI Calculator</h3>
                        </div>
                        <div className="flex justify-between items-center mb-6">
                            <div className="text-center">
                                <p className="text-xs text-gray-400 font-bold uppercase">Weight</p>
                                <p className="text-2xl font-bold">{profile.weight} kg</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-gray-400 font-bold uppercase">Height</p>
                                <p className="text-2xl font-bold">{profile.height} cm</p>
                            </div>
                            <div className="text-center p-3 bg-brand-50 rounded-xl">
                                <p className="text-xs text-brand-500 font-bold uppercase">BMI Score</p>
                                <p className="text-2xl font-black text-brand-600">{(profile.weight / ((profile.height/100)**2)).toFixed(1)}</p>
                            </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden mb-2">
                             <div className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500" style={{width: '70%'}}></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 font-medium">
                            <span>Underweight</span>
                            <span>Normal</span>
                            <span>Obese</span>
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
                                <button key={sym} className="px-4 py-2 rounded-full border border-gray-200 text-gray-600 hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 transition text-sm font-medium">
                                    + {sym}
                                </button>
                            ))}
                        </div>
                        <textarea className="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-brand-200 resize-none h-24 text-sm" placeholder="Describe how you feel today..."></textarea>
                        <button className="mt-4 w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-black transition">Log Entry</button>
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
          <button onClick={() => setView(AppView.HISTORY)} className={`p-2 rounded-xl flex flex-col items-center ${view === AppView.HISTORY ? 'text-brand-600' : 'text-gray-400'}`}>
              <History size={22} />
              <span className="text-[10px] font-bold mt-1">History</span>
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
