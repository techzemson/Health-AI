import React, { useState, useRef } from 'react';
import { Camera, Upload, AlertTriangle, CheckCircle, ShoppingBag, X, Loader2 } from 'lucide-react';
import { analyzeImage } from '../services/geminiService';
import { UserProfile, ScanResult } from '../types';

interface ScannerProps {
  userProfile: UserProfile;
  onClose: () => void;
}

const Scanner: React.FC<ScannerProps> = ({ userProfile, onClose }) => {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Partial<ScanResult> | null>(null);
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

    // Simulate progress bar for better UX while waiting for API
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 500);

    try {
      // Strip prefix for API
      const base64Data = base64Image.split(',')[1];
      const analysis = await analyzeImage(base64Data, userProfile);
      
      clearInterval(interval);
      setProgress(100);
      setTimeout(() => {
        setResult(analysis);
        setAnalyzing(false);
      }, 600); // Small delay to show 100%
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
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-brand-500 to-brand-teal text-white">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Camera size={24} /> AI Health Scanner
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {!image && (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 hover:bg-gray-100 transition cursor-pointer"
                 onClick={() => fileInputRef.current?.click()}>
              <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 mb-4">
                <Camera size={32} />
              </div>
              <p className="text-gray-600 font-medium">Tap to Scan Product, Food, or Skin</p>
              <p className="text-xs text-gray-400 mt-2">Supports Barcodes, Labels, Visuals</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                capture="environment" // Prioritize rear camera on mobile
                onChange={handleFileChange} 
              />
            </div>
          )}

          {image && (
            <div className="relative rounded-2xl overflow-hidden shadow-lg mx-auto w-full max-w-sm">
               <img src={image} alt="Scan Preview" className="w-full h-64 object-cover" />
               {analyzing && (
                 <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-6">
                   <div className="w-full max-w-[200px]">
                      <div className="flex justify-between text-white text-sm mb-2 font-medium">
                        <span>Analyzing...</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2.5">
                        <div className="bg-brand-teal h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                      </div>
                   </div>
                   <p className="text-white/80 text-xs mt-4 text-center animate-pulse">Checking harmful ingredients & suitability...</p>
                 </div>
               )}
            </div>
          )}

          {result && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              
              {/* Verdict Card */}
              <div className={`p-6 rounded-2xl border-2 ${getStatusColor(result.recommendation)}`}>
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-2xl font-bold mb-1 uppercase tracking-wide">{result.recommendation?.replace('_', ' ')}</h3>
                        <p className="font-semibold text-lg opacity-90">{result.productName || 'Unknown Item'}</p>
                    </div>
                    <div className="text-4xl font-black opacity-30">{result.score}/100</div>
                </div>
                
                {result.isHarmful && (
                  <div className="mt-4 flex items-center gap-2 text-red-700 font-bold bg-white/50 p-2 rounded-lg inline-block">
                    <AlertTriangle size={18} />
                    <span>Harmful Ingredients / Risk Detected</span>
                  </div>
                )}
                
                {!result.isHarmful && result.recommendation === 'BUY' && (
                   <div className="mt-4 flex items-center gap-2 text-green-700 font-bold bg-white/50 p-2 rounded-lg inline-block">
                   <CheckCircle size={18} />
                   <span>Safe & Recommended for You</span>
                 </div>
                )}
              </div>

              {/* Analysis Text */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <h4 className="text-lg font-semibold text-gray-800 mb-3">AI Health Analysis</h4>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{result.analysis}</p>
              </div>

              {/* Affiliate / Alternatives */}
              {result.affiliateLinks && result.affiliateLinks.length > 0 && (
                <div className="bg-brand-50 p-5 rounded-xl border border-brand-100">
                  <h4 className="text-lg font-semibold text-brand-800 mb-4 flex items-center gap-2">
                    <ShoppingBag size={20} /> Recommended Alternatives
                  </h4>
                  <div className="grid gap-3">
                    {result.affiliateLinks.map((link, idx) => (
                      <a key={idx} href={link.url} target="_blank" rel="noreferrer" 
                         className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm hover:shadow-md transition group">
                        <span className="font-medium text-gray-700 group-hover:text-brand-600">{link.name}</span>
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-gray-900">{link.price || 'View Price'}</span>
                            <span className="bg-brand-100 text-brand-700 text-xs px-2 py-1 rounded">Buy Now</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {image && !analyzing && !result && (
              <div className="flex justify-center">
                   <button onClick={() => startAnalysis(image)} className="bg-brand-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-brand-700 transition flex items-center gap-2">
                     <Loader2 size={18} className="animate-spin" /> Retry Analysis
                   </button>
              </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Scanner;
