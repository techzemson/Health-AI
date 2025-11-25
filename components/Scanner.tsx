
import React, { useState, useRef } from 'react';
import { Camera, AlertTriangle, CheckCircle, ShoppingBag, X, Loader2, Info, List, PieChart as PieChartIcon, Activity, Heart, ShieldAlert } from 'lucide-react';
import { analyzeImage } from '../services/geminiService';
import { UserProfile, ScanResult } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

interface ScannerProps {
  userProfile: UserProfile;
  onClose: () => void;
  onSave: (result: ScanResult) => void;
}

type Tab = 'OVERVIEW' | 'INGREDIENTS' | 'MACROS';

const Scanner: React.FC<ScannerProps> = ({ userProfile, onClose, onSave }) => {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Partial<ScanResult> | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('OVERVIEW');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        startAnalysis(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startAnalysis = async (base64Image: string) => {
    setAnalyzing(true);
    setProgress(0);
    setResult(null);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 8;
      });
    }, 400);

    try {
      const base64Data = base64Image.split(',')[1];
      const analysis = await analyzeImage(base64Data, userProfile);
      
      clearInterval(interval);
      setProgress(100);
      
      const fullResult: ScanResult = {
          ...analysis as ScanResult,
          id: Date.now().toString(),
          timestamp: Date.now(),
          imagePreview: base64Image
      };

      setTimeout(() => {
        setResult(fullResult);
        setAnalyzing(false);
        onSave(fullResult); // Save to history immediately
      }, 500);
    } catch (error) {
      clearInterval(interval);
      setAnalyzing(false);
      alert("Analysis failed. Please try again.");
    }
  };

  const getStatusColor = (rec?: string) => {
    switch (rec) {
      case 'BUY': return 'text-green-600 bg-green-50 border-green-200';
      case 'AVOID': return 'text-red-600 bg-red-50 border-red-200';
      case 'CONSULT_DOCTOR': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-md">
      <div className="bg-white w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-brand-600 to-brand-teal text-white sticky top-0 z-10">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Camera size={24} /> 
            {result ? 'Scan Results' : 'AI Health Scanner'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-0 bg-slate-50">
          
          {!image && (
            <div className="flex flex-col items-center justify-center h-[500px] p-6 text-center">
              <div 
                  className="w-full max-w-sm h-64 border-3 border-dashed border-brand-300 rounded-3xl bg-brand-50 hover:bg-brand-100 transition cursor-pointer flex flex-col items-center justify-center group"
                  onClick={() => fileInputRef.current?.click()}
              >
                 <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-brand-600 shadow-lg mb-4 group-hover:scale-110 transition">
                    <Camera size={40} />
                 </div>
                 <p className="text-brand-900 font-bold text-lg">Tap to Scan</p>
                 <p className="text-brand-600 text-sm mt-1">Food, Labels, Skin, or Products</p>
              </div>
              
              <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-sm">
                 <div className="bg-white p-4 rounded-xl shadow-sm text-left">
                     <List size={20} className="text-blue-500 mb-2"/>
                     <h4 className="font-bold text-gray-800 text-sm">Ingredient Check</h4>
                     <p className="text-xs text-gray-500">Detects harmful additives</p>
                 </div>
                 <div className="bg-white p-4 rounded-xl shadow-sm text-left">
                     <PieChartIcon size={20} className="text-purple-500 mb-2"/>
                     <h4 className="font-bold text-gray-800 text-sm">Macro Analysis</h4>
                     <p className="text-xs text-gray-500">Protein, Carbs & Fat breakdown</p>
                 </div>
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                capture="environment"
                onChange={handleFileChange} 
              />
            </div>
          )}

          {/* Analysis View */}
          {(image || result) && (
             <div className="flex flex-col md:flex-row h-full">
                {/* Image Side */}
                <div className="md:w-1/3 bg-gray-900 flex flex-col items-center justify-center relative min-h-[300px] md:min-h-full">
                    <img src={image!} alt="Scan" className="w-full h-full object-cover opacity-80" />
                    
                    {analyzing && (
                        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-8 z-20">
                            <div className="w-20 h-20 relative mb-6">
                                <svg className="animate-spin w-full h-full text-brand-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">{Math.round(progress)}%</span>
                            </div>
                            <h3 className="text-white font-bold text-lg mb-2">Analyzing Health Impact...</h3>
                            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                                <div className="bg-gradient-to-r from-brand-400 to-brand-600 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                            </div>
                            <p className="text-gray-400 text-xs mt-4 text-center">Scanning for hidden sugars, allergens, and nutritional value.</p>
                        </div>
                    )}
                    
                    {result && !analyzing && (
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black to-transparent p-6 text-white">
                             <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-xs font-bold mb-2 uppercase tracking-wide">
                                 {result.type} DETECTED
                             </div>
                             <h3 className="text-2xl font-bold leading-tight">{result.productName || 'Unknown Item'}</h3>
                        </div>
                    )}
                </div>

                {/* Results Side */}
                {result && (
                <div className="md:w-2/3 flex flex-col h-full overflow-hidden bg-slate-50">
                    
                    {/* Verdict Banner */}
                    <div className={`p-6 border-b flex justify-between items-center ${getStatusColor(result.recommendation)} bg-opacity-20`}>
                        <div className="flex items-center gap-3">
                             {result.recommendation === 'BUY' && <CheckCircle className="w-8 h-8"/>}
                             {result.recommendation === 'AVOID' && <ShieldAlert className="w-8 h-8"/>}
                             {result.recommendation === 'CONSULT_DOCTOR' && <Activity className="w-8 h-8"/>}
                             <div>
                                 <h4 className="font-black text-xl tracking-tight">{result.recommendation?.replace('_', ' ')}</h4>
                                 <p className="text-xs opacity-80 font-medium">Based on your profile</p>
                             </div>
                        </div>
                        <div className="text-center">
                            <span className="block text-4xl font-black">{result.score}</span>
                            <span className="text-[10px] font-bold uppercase opacity-60">Health Score</span>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b bg-white">
                        {[
                            { id: 'OVERVIEW', label: 'Overview', icon: Info },
                            { id: 'INGREDIENTS', label: 'Ingredients', icon: List },
                            { id: 'MACROS', label: 'Nutrition', icon: PieChartIcon },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as Tab)}
                                className={`flex-1 py-4 flex items-center justify-center gap-2 text-sm font-bold transition border-b-2 ${activeTab === tab.id ? 'border-brand-600 text-brand-700 bg-brand-50/50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
                            >
                                <tab.icon size={16} /> {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        
                        {activeTab === 'OVERVIEW' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                    <h5 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Analysis</h5>
                                    <p className="text-gray-700 leading-relaxed">{result.analysis}</p>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                        <h5 className="text-green-800 font-bold flex items-center gap-2 mb-3"><CheckCircle size={16}/> The Good Stuff</h5>
                                        <ul className="space-y-2">
                                            {result.pros?.map((pro, i) => (
                                                <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                                                    <span className="mt-1.5 w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0"></span>
                                                    {pro}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                        <h5 className="text-red-800 font-bold flex items-center gap-2 mb-3"><AlertTriangle size={16}/> Potential Risks</h5>
                                        <ul className="space-y-2">
                                            {result.cons?.map((con, i) => (
                                                <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                                                    <span className="mt-1.5 w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0"></span>
                                                    {con}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {result.usageInstructions && (
                                    <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                                        <h5 className="text-blue-800 font-bold mb-2">Usage Guide</h5>
                                        <p className="text-sm text-blue-700">{result.usageInstructions}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'INGREDIENTS' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                    {result.ingredients?.map((ing, i) => (
                                        <div key={i} className="p-4 border-b border-gray-100 last:border-0 flex items-start justify-between hover:bg-gray-50 transition">
                                            <div>
                                                <p className="font-bold text-gray-800">{ing.name}</p>
                                                <p className="text-xs text-gray-500 mt-1">{ing.description}</p>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                                                ing.riskLevel === 'SAFE' ? 'bg-green-100 text-green-700' : 
                                                ing.riskLevel === 'MODERATE' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {ing.riskLevel}
                                            </span>
                                        </div>
                                    ))}
                                    {(!result.ingredients || result.ingredients.length === 0) && (
                                        <div className="p-8 text-center text-gray-400">No ingredients detected.</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'MACROS' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2">
                                {result.macros && result.macros.length > 0 ? (
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                        <h5 className="text-center font-bold text-gray-700 mb-6">Nutritional Breakdown</h5>
                                        <div className="h-64 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={result.macros}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        {result.macros.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                                        ))}
                                                    </Pie>
                                                    <RechartsTooltip />
                                                    <Legend verticalAlign="bottom" height={36}/>
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 mt-6">
                                             {result.macros.map((m, i) => (
                                                 <div key={i} className="text-center p-3 bg-gray-50 rounded-lg">
                                                     <p className="text-xs text-gray-500 uppercase font-bold">{m.name}</p>
                                                     <p className="text-xl font-bold" style={{color: m.fill}}>{m.value}%</p>
                                                 </div>
                                             ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center p-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                        <Activity className="mx-auto text-gray-300 mb-3" size={48} />
                                        <p className="text-gray-500">Nutritional data not applicable or unavailable for this item.</p>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {/* Affiliate Links - Always visible at bottom if exist */}
                        {result.affiliateLinks && result.affiliateLinks.length > 0 && (
                            <div className="mt-8 pt-6 border-t border-gray-100">
                                <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <ShoppingBag size={18} className="text-brand-600" /> Recommended Purchase
                                </h4>
                                <div className="space-y-3">
                                    {result.affiliateLinks.map((link, idx) => (
                                    <a key={idx} href={link.url} target="_blank" rel="noreferrer" 
                                        className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-brand-300 transition group">
                                        <span className="font-medium text-gray-700 group-hover:text-brand-600">{link.name}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-bold text-gray-900">{link.price}</span>
                                            <span className="bg-brand-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm shadow-brand-200">Buy Now</span>
                                        </div>
                                    </a>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                    
                    {/* Action Footer */}
                    <div className="p-4 bg-white border-t flex gap-3">
                         <button onClick={onClose} className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-50 rounded-xl transition">
                             Close
                         </button>
                         <button onClick={() => { fileInputRef.current?.click(); setImage(null); setResult(null); }} className="flex-1 py-3 bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-700 transition flex items-center justify-center gap-2">
                             <Camera size={18} /> Scan New
                         </button>
                    </div>

                </div>
                )}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Scanner;
