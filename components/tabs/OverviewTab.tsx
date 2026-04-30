import { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Sparkles, Loader2, Lightbulb } from 'lucide-react';

import { handleAIError } from '../../lib/ai-errors';

export default function OverviewTab() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiIdeas, setAiIdeas] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const generateIdeas = async () => {
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) return;
    setIsGenerating(true);
    setErrorMsg('');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      const prompt = `You are a social media growth expert for Next Chapter Travel LLC. 
Based on our 5 Content Chapters:
1. Destination Inspiration
2. Travel Tips & Education
3. Client Stories
4. Behind the Scenes
5. Deals & CTAs

Generate 5 specific, unique, and actionable content ideas (one for each chapter) for this week. 
Format as a JSON array of strings.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });
      
      const ideas = JSON.parse((response.text || '[]').trim());
      setAiIdeas(ideas);
    } catch (e: any) {
      const aiErr = handleAIError(e);
      setErrorMsg(aiErr.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#8c6b4f] to-[#4a3f35] rounded-3xl p-8 text-amber-50 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-64 h-64 transform rotate-12">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
        </div>
        <div className="relative z-10 max-w-2xl">
          <h2 className="font-serif text-4xl mb-4 italic">Your Adventure Chapter starts here!</h2>
          <p className="text-amber-100/80 text-lg leading-relaxed mb-6">
            A comprehensive strategy for Next Chapter Travel LLC. 
            Transforming real traveler experiences into a compelling narrative using the &quot;new chapter&quot; metaphor.
          </p>
          <div className="flex gap-4">
            <div className="px-4 py-2 bg-amber-50/10 backdrop-blur-sm rounded-xl border border-amber-50/20">
              <span className="block text-sm text-amber-200">Total Followers</span>
              <span className="font-serif text-2xl font-bold">11</span>
            </div>
            <div className="px-4 py-2 bg-amber-50/10 backdrop-blur-sm rounded-xl border border-amber-50/20">
              <span className="block text-sm text-amber-200">Posts</span>
              <span className="font-serif text-2xl font-bold">1</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Growth Assistant */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h3 className="font-serif text-2xl text-slate-800 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-500" />
              AI Growth Assistant
            </h3>
            <p className="text-slate-500 text-sm mt-1">Experimental: Weekly content recommendations powered by Gemini.</p>
          </div>
          <button 
            onClick={generateIdeas}
            disabled={isGenerating}
            className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 transition flex items-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
            {aiIdeas.length > 0 ? 'Refresh Ideas' : 'Generate Ideas'}
          </button>
        </div>

        {aiIdeas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {aiIdeas.map((idea, idx) => (
              <div key={idx} className="p-5 bg-amber-50/50 rounded-2xl border border-amber-100 hover:border-amber-200 transition group">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 block mb-2 opacity-60">Chapter {idx + 1}</span>
                <p className="text-slate-700 text-sm leading-relaxed font-medium">{idea}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-slate-400">
            <Sparkles className="w-10 h-10 mb-4 opacity-20" />
            <p className="text-sm">Click to generate this week&apos;s custom strategy ideas.</p>
          </div>
        )}
        {errorMsg && <p className="text-red-500 text-xs mt-4">{errorMsg}</p>}
      </div>

      {/* Chapters (Bento Grid) */}
      <div>
        <h3 className="font-serif text-2xl mb-6 text-slate-800 ml-1">The Strategy Blueprint</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ChapterCard 
            num="1" 
            title="Destination Inspiration" 
            bg="bg-amber-50"
            desc="Stunning visuals of destinations; aspirational language tied to the 'new chapter' metaphor."
          />
          <ChapterCard 
            num="2" 
            title="Travel Tips & Education" 
            bg="bg-slate-50"
            desc="Packing hacks, visa tips, insurance advice. Positions you as an expert."
          />
          <ChapterCard 
            num="3" 
            title="Client Stories" 
            bg="bg-amber-50"
            desc="Real traveler experiences & UGC. Builds trust and social proof."
          />
          <ChapterCard 
            num="4" 
            title="Behind the Scenes" 
            bg="bg-slate-50"
            desc="Planning trips, vendor calls. Humanizes the brand."
          />
          <ChapterCard 
            num="5" 
            title="Deals & CTAs" 
            bg="bg-amber-50"
            desc="Promotions, packages, driving traffic directly to the website."
          />
        </div>
      </div>
    </div>
  );
}

function ChapterCard({ num, title, desc, bg }: { num: string, title: string, desc: string, bg: string }) {
  return (
    <div className={`p-6 rounded-3xl ${bg} border border-[#e2d5c8] shadow-sm flex flex-col h-full hover:shadow-md transition-shadow`}>
      <span className="font-serif italic text-4xl text-amber-800/20 mb-2">Chapter {num}</span>
      <h4 className="font-semibold text-slate-900 mb-2 text-lg">{title}</h4>
      <p className="text-slate-600 text-sm leading-relaxed flex-1">{desc}</p>
    </div>
  );
}
