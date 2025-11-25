import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Utensils, ScanLine, Activity, MessageSquare, 
  Menu, User as UserIcon, Bell, ChevronRight, Mic, MicOff,
  Sun, Moon, Droplets, BedDouble, Smile, AlertTriangle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

// Components
import Scanner from './components/Scanner';
import { UserProfile, AppView, DailyLog, MealPlan, WorkoutPlan, Gender } from './types';
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
};

// --- HELPER COMPONENTS ---

interface DashboardCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const DashboardCard = ({ title, children, className = "" }: DashboardCardProps) => (
  <div className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 ${className}`}>
    <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
    {children}
  </div>
);

const FeatureBadge = ({ icon: Icon, label, color }: { icon: any, label: string, color: string }) => (
  <div className={`flex flex-col items-center justify-center p-3 rounded-xl ${color} bg-opacity-10 min-w-[80px]`}>
    <Icon size={24} className={`${color.replace('bg-', 'text-')}`} />
    <span className="text-xs font-medium mt-1 text-gray-700">{label}</span>
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
  
  // Tracker State
  const [water, setWater] = useState(4);
  const [mood, setMood] = useState(3);

  // Initialize Data
  useEffect(() => {
    // Generate initial plan if not exists
    if (!dailyPlan.meal) {
      handleGeneratePlan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGeneratePlan = async () => {
    setLoadingPlan(true);
    try {
      const plan = await generateDailyPlan(profile);
      setDailyPlan({ meal: plan.mealPlan, workout: plan.workoutPlan });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPlan(false);
    }
  };

  const handleVoiceInput = async (text: string) => {
    setIsChatOpen(true);
    const newHistory = [...chatHistory, { role: 'user' as const, text }];
    setChatHistory(newHistory);
    
    // Convert history format for Gemini API
    const apiHistory = newHistory.slice(0, -1).map(h => ({
      role: h.role,
      parts: [{ text: h.text }]
    }));

    try {
      const response = await chatWithAgent(apiHistory, text);
      setChatHistory([...newHistory, { role: 'model', text: response }]);
      
      // Text-to-Speech
      const utterance = new SpeechSynthesisUtterance(response);
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      setChatHistory([...newHistory, { role: 'model', text: "Sorry, I couldn't process that right now. Please try again." }]);
    }
  };

  // Render Logic
  return (
    <div className="min-h-screen bg-slate-50 flex text-gray-900 font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen fixed">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-xl">
            H
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-brand-teal">
            Health AI
          </span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {[
            { id: AppView.DASHBOARD, icon: LayoutDashboard, label: 'Dashboard' },
            { id: AppView.PLANNER, icon: Utensils, label: 'Meals & Fitness' },
            { id: AppView.TRACKER, icon: Activity, label: 'Wellness Tracker' },
            { id: AppView.COMMUNITY, icon: UserIcon, label: 'Community' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                view === item.id 
                  ? 'bg-brand-50 text-brand-700 font-medium' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
          
          <div className="pt-6 mt-6 border-t border-gray-100">
            <button 
              onClick={() => setShowScanner(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-teal text-white shadow-lg shadow-brand-200 hover:shadow-xl transition"
            >
              <ScanLine size={20} />
              <span>Smart Scan</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto w-full">
        {/* Top Header Mobile */}
        <header className="md:hidden flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-500 rounded flex items-center justify-center text-white font-bold">H</div>
            <span className="font-bold text-lg text-brand-800">Health AI</span>
          </div>
          <button className="p-2 bg-white rounded-full shadow-sm"><Bell size={20} className="text-gray-600"/></button>
        </header>

        {/* --- VIEW: DASHBOARD --- */}
        {view === AppView.DASHBOARD && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Hello, {profile.name} 👋</h1>
                <p className="text-gray-500 mt-1">Today is a great day to improve your eye health.</p>
              </div>
              <div className="hidden md:block text-right">
                <p className="text-sm font-semibold text-brand-600">Streak: 5 Days 🔥</p>
                <p className="text-xs text-gray-400">Keep it up!</p>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-orange-100 bg-gradient-to-br from-white to-orange-50">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">Weight</span>
                    <Activity size={16} className="text-orange-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{profile.weight} <span className="text-sm font-normal text-gray-500">kg</span></div>
                <span className="text-xs text-green-600 font-medium">-0.5kg this week</span>
              </div>
              
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100 bg-gradient-to-br from-white to-blue-50">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">Water</span>
                    <Droplets size={16} className="text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{water}/8 <span className="text-sm font-normal text-gray-500">glasses</span></div>
                <button onClick={() => setWater(w => Math.min(w+1, 8))} className="text-xs text-blue-600 font-medium hover:underline">+ Log Water</button>
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-sm border border-purple-100 bg-gradient-to-br from-white to-purple-50">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">Sleep</span>
                    <BedDouble size={16} className="text-purple-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900">7.2 <span className="text-sm font-normal text-gray-500">hrs</span></div>
                <span className="text-xs text-purple-600 font-medium">Quality: Good</span>
              </div>

               <div className="bg-white p-4 rounded-2xl shadow-sm border border-green-100 bg-gradient-to-br from-white to-green-50">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">Mood</span>
                    <Smile size={16} className="text-green-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900">Good</div>
                <span className="text-xs text-green-600 font-medium">Acidity Low</span>
              </div>
            </div>

            {/* Main Dashboard Content */}
            <div className="grid md:grid-cols-3 gap-6">
              
              {/* Daily Focus (Left 2 cols) */}
              <div className="md:col-span-2 space-y-6">
                 {/* Today's Goal */}
                 <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-3xl p-6 text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-xl font-bold mb-2">Desk Warrior Mission</h3>
                        <p className="opacity-90 mb-4 text-sm max-w-md">You've been sitting for 4 hours. It's time for the "Eye & Spine" reset routine to prevent fatigue.</p>
                        <button 
                            onClick={() => setView(AppView.PLANNER)}
                            className="bg-white text-brand-700 px-5 py-2 rounded-full text-sm font-bold hover:bg-brand-50 transition"
                        >
                            Start 5-min Routine
                        </button>
                    </div>
                    {/* Abstract Shapes */}
                    <div className="absolute right-0 top-0 w-32 h-32 bg-white opacity-10 rounded-full translate-x-10 -translate-y-10"></div>
                    <div className="absolute bottom-0 right-20 w-24 h-24 bg-brand-400 opacity-20 rounded-full translate-y-10"></div>
                 </div>

                 {/* Charts */}
                 <DashboardCard title="Health Trends">
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={[
                                {name: 'Mon', mood: 3, acidity: 2},
                                {name: 'Tue', mood: 4, acidity: 1},
                                {name: 'Wed', mood: 2, acidity: 4},
                                {name: 'Thu', mood: 5, acidity: 1},
                                {name: 'Fri', mood: 4, acidity: 2},
                                {name: 'Sat', mood: 5, acidity: 0},
                                {name: 'Sun', mood: 5, acidity: 0},
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                                <Line type="monotone" dataKey="mood" stroke="#14b8a6" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} name="Mood" />
                                <Line type="monotone" dataKey="acidity" stroke="#f97316" strokeWidth={3} dot={{r: 4}} name="Acidity Lvl" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                 </DashboardCard>
              </div>

              {/* Sidebar Right (Suggestions) */}
              <div className="space-y-6">
                  <DashboardCard title="AI Insights" className="h-full">
                      <div className="space-y-4">
                          <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                              <div className="flex items-center gap-2 mb-1 text-yellow-800 font-semibold text-sm">
                                  <AlertTriangle size={14} /> Acidity Alert
                              </div>
                              <p className="text-xs text-yellow-700 leading-relaxed">
                                  Yesterday's spicy dinner caused high acidity. Recommended lunch today: <strong>Curd Rice & Cucumber</strong>.
                              </p>
                          </div>

                          <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                              <div className="flex items-center gap-2 mb-1 text-purple-800 font-semibold text-sm">
                                  <Sun size={14} /> Skin Care
                              </div>
                              <p className="text-xs text-purple-700 leading-relaxed">
                                  UV Index is high. If going out, apply sunscreen. Scan your current sunscreen to check expiry.
                              </p>
                          </div>
                      </div>
                      
                      <button 
                        onClick={() => setShowScanner(true)}
                        className="w-full mt-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 text-sm font-medium hover:border-brand-300 hover:text-brand-600 transition flex items-center justify-center gap-2"
                      >
                          <ScanLine size={16} /> Scan Food/Skin
                      </button>
                  </DashboardCard>
              </div>

            </div>
          </div>
        )}

        {/* --- VIEW: PLANNER --- */}
        {view === AppView.PLANNER && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Your Personalized Plan</h2>
                    <button onClick={handleGeneratePlan} disabled={loadingPlan} className="text-sm text-brand-600 hover:underline">
                        {loadingPlan ? 'Generating...' : 'Regenerate Plan'}
                    </button>
                </div>

                {loadingPlan && (
                    <div className="p-12 text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-gray-500">AI is crafting your perfect diet & workout...</p>
                    </div>
                )}

                {!loadingPlan && dailyPlan.meal && (
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Meal Plan */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-700 flex items-center gap-2"><Utensils size={18}/> Nutrition for Digestion & Energy</h3>
                            {[
                                { label: 'Breakfast', food: dailyPlan.meal.breakfast, time: '8:00 AM' },
                                { label: 'Lunch', food: dailyPlan.meal.lunch, time: '1:00 PM' },
                                { label: 'Snack', food: dailyPlan.meal.snacks, time: '4:30 PM' },
                                { label: 'Dinner', food: dailyPlan.meal.dinner, time: '8:00 PM' },
                            ].map((meal, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-brand-400 flex justify-between items-center group hover:shadow-md transition">
                                    <div>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{meal.label}</span>
                                        <p className="font-medium text-gray-800">{meal.food}</p>
                                    </div>
                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">{meal.time}</span>
                                </div>
                            ))}
                            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                <h4 className="text-sm font-bold text-green-800 mb-2">Why this plan?</h4>
                                <ul className="list-disc list-inside text-xs text-green-700 space-y-1">
                                    {dailyPlan.meal.nutritionalHighlights.map((h, i) => <li key={i}>{h}</li>)}
                                </ul>
                            </div>
                        </div>

                        {/* Workout Plan */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-700 flex items-center gap-2"><Activity size={18}/> {dailyPlan.workout?.type} ({dailyPlan.workout?.duration} min)</h3>
                            
                            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                                {dailyPlan.workout?.exercises.map((ex, i) => (
                                    <div key={i} className="p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                        <div className="flex justify-between mb-1">
                                            <span className="font-semibold text-gray-800">{ex.name}</span>
                                            <span className="text-xs font-bold bg-brand-100 text-brand-700 px-2 py-1 rounded">{ex.duration}</span>
                                        </div>
                                        <p className="text-sm text-gray-500">{ex.description}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                                <div className="p-2 bg-blue-200 rounded-full text-blue-700"><MessageSquare size={16} /></div>
                                <div>
                                    <p className="text-sm text-blue-800 font-medium">Eye Care Tip</p>
                                    <p className="text-xs text-blue-700 mt-1">Every 20 minutes, look at something 20 feet away for 20 seconds to reduce strain.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

         {/* --- VIEW: TRACKER (Placeholder for brevity) --- */}
         {view === AppView.TRACKER && (
             <div className="text-center py-20 animate-in fade-in">
                 <div className="bg-white p-8 rounded-3xl inline-block shadow-lg">
                    <Activity size={48} className="mx-auto text-brand-500 mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Wellness Tracker</h2>
                    <p className="text-gray-500 mb-6">Detailed sleep and symptom logs coming in full version.</p>
                    <button onClick={() => setView(AppView.DASHBOARD)} className="text-brand-600 font-medium">Back to Dashboard</button>
                 </div>
             </div>
         )}
         
         {/* --- VIEW: COMMUNITY (Placeholder) --- */}
         {view === AppView.COMMUNITY && (
             <div className="text-center py-20 animate-in fade-in">
                 <div className="bg-white p-8 rounded-3xl inline-block shadow-lg">
                    <UserIcon size={48} className="mx-auto text-brand-500 mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Desk Warriors Community</h2>
                    <p className="text-gray-500 mb-6">Connect with 12,000+ others improving their posture and health.</p>
                    <button onClick={() => setView(AppView.DASHBOARD)} className="text-brand-600 font-medium">Back to Dashboard</button>
                 </div>
             </div>
         )}

      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 p-2 flex justify-around items-center z-40 pb-safe">
          <button onClick={() => setView(AppView.DASHBOARD)} className={`p-2 rounded-xl flex flex-col items-center ${view === AppView.DASHBOARD ? 'text-brand-600' : 'text-gray-400'}`}>
              <LayoutDashboard size={24} />
              <span className="text-[10px] font-medium">Home</span>
          </button>
          <button onClick={() => setView(AppView.PLANNER)} className={`p-2 rounded-xl flex flex-col items-center ${view === AppView.PLANNER ? 'text-brand-600' : 'text-gray-400'}`}>
              <Utensils size={24} />
              <span className="text-[10px] font-medium">Plan</span>
          </button>
          <div className="relative -top-6">
              <button 
                onClick={() => setShowScanner(true)}
                className="w-14 h-14 bg-gradient-to-r from-brand-500 to-brand-teal rounded-full shadow-lg shadow-brand-200 flex items-center justify-center text-white transform hover:scale-105 transition"
              >
                  <ScanLine size={24} />
              </button>
          </div>
          <button onClick={() => setView(AppView.TRACKER)} className={`p-2 rounded-xl flex flex-col items-center ${view === AppView.TRACKER ? 'text-brand-600' : 'text-gray-400'}`}>
              <Activity size={24} />
              <span className="text-[10px] font-medium">Track</span>
          </button>
          <button onClick={() => setView(AppView.COMMUNITY)} className={`p-2 rounded-xl flex flex-col items-center ${view === AppView.COMMUNITY ? 'text-brand-600' : 'text-gray-400'}`}>
              <UserIcon size={24} />
              <span className="text-[10px] font-medium">Social</span>
          </button>
      </nav>

      {/* Overlays */}
      {showScanner && (
        <Scanner userProfile={profile} onClose={() => setShowScanner(false)} />
      )}

      <VoiceAgent onSpeechResult={handleVoiceInput} />

      {/* Chat Dialog */}
      {isChatOpen && (
          <div className="fixed bottom-28 right-6 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-30 flex flex-col max-h-[500px] animate-in slide-in-from-bottom-10 fade-in duration-300">
              <div className="p-4 border-b flex justify-between items-center bg-brand-600 rounded-t-2xl text-white">
                  <h3 className="font-bold flex items-center gap-2"><MessageSquare size={18}/> Health Assistant</h3>
                  <button onClick={() => setIsChatOpen(false)}><X size={18}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 h-80">
                  {chatHistory.length === 0 && <p className="text-center text-gray-400 text-sm mt-10">Ask me anything about your health!</p>}
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

// Icons needed that were missing in main import (Lucide React handles most, adding X for close buttons)
const X = ({ size, className }: { size: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

export default App;