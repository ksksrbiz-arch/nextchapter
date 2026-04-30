import { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Sparkles, Loader2, BookOpen, PenTool } from 'lucide-react';

import { handleAIError } from '../../lib/ai-errors';

export default function BrandKitTab() {
  const [niche, setNiche] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [voiceGuidelines, setVoiceGuidelines] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const generateVoice = async () => {
    if (!niche || !process.env.NEXT_PUBLIC_GEMINI_API_KEY) return;
    setIsGenerating(true);
    setErrorMsg('');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      const prompt = `Next Chapter Travel LLC is a boutique travel agency. 
Brand Metaphor: Every trip is a "New Chapter".
User Niche: ${niche}

Generate specific, detailed brand voice guidelines for this niche while keeping the "Next Chapter" metaphor.
Include:
1. Tone Keywords
2. Sample Phrases (e.g. "Turn the page on your routine...")
3. Interaction style (how to talk to clients)
4. Do's and Don'ts`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      setVoiceGuidelines(response.text || 'Failed to generate voice guidelines.');
    } catch (e) {
      const aiErr = handleAIError(e);
      setErrorMsg(aiErr.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h2 className="font-serif text-3xl mb-2 text-slate-800">Brand Kit Hub</h2>
        <p className="text-slate-500">Visual identity and voice guidelines for Next Chapter Travel.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Colors */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="font-serif text-xl mb-4 text-slate-800">Color Palette</h3>
          <p className="text-sm text-slate-500 mb-6">Inspired by warm vintage travel journals and maps.</p>
          <div className="grid grid-cols-2 gap-4">
            <ColorSwatch name="Warm Brown" hex="#8c6b4f" bgClass="bg-[#8c6b4f]" textClass="text-white" />
            <ColorSwatch name="Ivory" hex="#fdfcf9" bgClass="bg-[#fdfcf9]" textClass="text-slate-800" border />
            <ColorSwatch name="Deep Navy" hex="#0f172a" bgClass="bg-slate-900" textClass="text-white" />
            <ColorSwatch name="Gold Accent" hex="#f59e0b" bgClass="bg-amber-500" textClass="text-white" />
          </div>
        </div>

        {/* AI Voice Customizer */}
        <div className="bg-[#1e293b] p-8 rounded-3xl shadow-xl text-white flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="font-serif text-xl text-white">AI Voice Customizer</h3>
          </div>
          
          <div className="space-y-4 mb-6">
            <p className="text-slate-400 text-sm">Define your specific travel niche to get tailored brand voice guidelines.</p>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={niche}
                onChange={e => setNiche(e.target.value)}
                placeholder="e.g., Luxury Safaris, Budget Backpacking..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500 placeholder-slate-500"
              />
              <button 
                onClick={generateVoice}
                disabled={isGenerating || !niche}
                className="bg-amber-600 hover:bg-amber-500 text-white p-2 rounded-xl transition disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <PenTool className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 overflow-y-auto max-h-[300px] text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">
            {errorMsg ? (
              <div className="text-red-400 p-2 border border-red-900/50 rounded-lg bg-red-900/10">
                {errorMsg}
              </div>
            ) : (
              voiceGuidelines || "Generated guidelines will appear here. Describe your niche above to start."
            )}
          </div>
        </div>

        {/* Typography */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between md:col-span-1">
          <div>
            <h3 className="font-serif text-xl mb-4 text-slate-800">Typography</h3>
            <div className="space-y-6">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-2">Headlines</span>
                <p className="font-serif text-3xl italic text-slate-800">Playfair Display</p>
                <p className="text-sm text-slate-500 mt-1">Used for chapters, titles, and emotional hooks.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-2">Body Copy</span>
                <p className="font-sans text-xl text-slate-800">Space Grotesk</p>
                <p className="text-sm text-slate-500 mt-1">Used for informative text, details, and UI.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Photography */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm md:col-span-1">
          <h3 className="font-serif text-xl mb-4 text-slate-800">Photography Rules</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="h-32 bg-amber-100 rounded-2xl overflow-hidden relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://picsum.photos/seed/warm/400/300" className="w-full h-full object-cover mix-blend-multiply opacity-80" alt="Warm tone" />
              </div>
              <h4 className="font-medium text-slate-800">Warm Tones</h4>
              <p className="text-sm text-slate-500">Golden hour lighting, vibrant grounding colors.</p>
            </div>
            <div className="space-y-2">
              <div className="h-32 bg-amber-50 rounded-2xl overflow-hidden relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://picsum.photos/seed/reel/400/300" className="w-full h-full object-cover mix-blend-multiply opacity-80" alt="Reel format" />
              </div>
              <h4 className="font-medium text-slate-800">Reels Format</h4>
              <p className="text-sm text-slate-500">7-15s montages. Text overlays referencing &quot;next chapter&quot;.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorSwatch({ name, hex, bgClass, textClass, border = false }: { name: string, hex: string, bgClass: string, textClass: string, border?: boolean }) {
  return (
    <div className={`p-4 rounded-2xl flex flex-col justify-end h-24 shadow-inner ${bgClass} ${border ? 'border border-slate-200' : ''}`}>
      <span className={`font-medium ${textClass}`}>{name}</span>
      <span className={`text-xs opacity-80 ${textClass}`}>{hex}</span>
    </div>
  );
}
