import { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Loader2, Wand2, Copy, Check, Sparkles, Save, Image as ImageIcon, RotateCcw, MessageSquarePlus } from 'lucide-react';
import { collection, query, getDocs, addDoc, serverTimestamp, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../AuthProvider';
import { handleAIError } from '../../lib/ai-errors';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

interface Account {
  id: string;
  name: string;
  ownerId: string;
}

export default function CaptionAssistantTab() {
  const { user } = useAuth();
  const [topic, setTopic] = useState('');
  const [imageTheme, setImageTheme] = useState('');
  const [pillar, setPillar] = useState('Chapter 1: Destination Inspiration');
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New AI state
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isRefining, setIsRefining] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Fetch accounts owned by user
    const q = query(collection(db, 'accounts'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const accs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
      setAccounts(accs);
      
      // Select first account by default if none selected
      if (accs.length > 0) {
        setSelectedAccountId(prev => prev || accs[0].id);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'accounts');
    });

    return () => unsubscribe();
  }, [user]);

  const getAIClient = () => {
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      throw new Error('NEXT_PUBLIC_GEMINI_API_KEY is not set.');
    }
    return new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
  };

  const generateCaption = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErrorMsg('');
    setSaveSuccess(false);
    setImageUrl(null);
    if (!topic) return;

    setIsGenerating(true);
    try {
      const ai = getAIClient();
      const prompt = `You are the social media manager for "Next Chapter Travel LLC", a boutique travel agency.
Brand Metaphor: Every trip is a "New Chapter" in the traveler's adventure. Tone is warm, inviting, adventurous, and expert.
Format:
- Hook (line 1): Bold, curiosity-driven.
- Story (2-3 sentences): Connect destination to narrative using the "New Chapter" metaphor.
- CTA: Drive to link in bio or DM.
- Hashtags: 15-20 layered hashtags including #NextChapterTravel #YourAdventureChapterStartsHere.

Write an Instagram caption for the following topic:
Topic: ${topic}
Pillar: ${pillar}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      setOutput(response.text || 'Failed to generate content.');
      
      if (window.innerWidth < 1024) {
        setTimeout(() => {
          const resultSection = document.getElementById('caption-result-section');
          resultSection?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (e: any) {
      const aiErr = handleAIError(e);
      setErrorMsg(aiErr.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateReelIdeas = async () => {
    setErrorMsg('');
    setSaveSuccess(false);
    setImageUrl(null);
    if (!topic) return;

    setIsGenerating(true);
    try {
      const ai = getAIClient();
      const prompt = `You are the social media manager for "Next Chapter Travel LLC", a boutique travel agency.
Brand Metaphor: Every trip is a "New Chapter" in the traveler's adventure. Tone is warm, inviting, adventurous, and expert.

Generate 3 creative Instagram Reel ideas for the following topic and pillar. For each idea, provide:
1. Title
2. Trending Audio Suggestion
3. Visual Concept (What happens on screen)
4. Hook (Text on screen)
5. Caption Summary

Topic: ${topic}
Pillar: ${pillar}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      setOutput(response.text || 'Failed to generate content.');
      
      if (window.innerWidth < 1024) {
        setTimeout(() => {
          const resultSection = document.getElementById('caption-result-section');
          resultSection?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (e: any) {
      const aiErr = handleAIError(e);
      setErrorMsg(aiErr.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const refineCaption = async (instruction: string) => {
    if (!output) return;
    setIsRefining(true);
    setErrorMsg('');
    try {
      const ai = getAIClient();
      const prompt = `Original Caption:
${output}

Update this Instagram caption based on the following instruction: "${instruction}"
Maintain the "Next Chapter Travel LLC" brand voice (warm, adventurous, expert).
Ensure the Hook → Story → CTA → Hashtags format is preserved.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      setOutput(response.text || output);
    } catch (e: any) {
      const aiErr = handleAIError(e);
      setErrorMsg('Error refining: ' + aiErr.message);
    } finally {
      setIsRefining(false);
    }
  };

  const generateImage = async () => {
    const finalTheme = imageTheme || topic;
    if (!finalTheme) {
      setErrorMsg('Please provide a topic or image theme first.');
      return;
    }

    setIsGeneratingImage(true);
    setErrorMsg('');
    try {
      const ai = getAIClient();
      const imagePrompt = `A high-quality, professional travel photograph for Instagram. 
Content Pillar: ${pillar}
Primary Visual Theme: ${finalTheme}
${output ? `Secondary context from caption: ${output.split('\n')[0]}` : ''}
Style: Vibrant, adventurous, clean composition, high-end travel magazine quality.
Atmosphere: Inviting and full of wonder. Photorealistic. High resolution.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: imagePrompt,
        config: {
          imageConfig: {
            aspectRatio: '1:1'
          }
        }
      });

      // Find the image part in candidates
      const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (part?.inlineData?.data) {
        setImageUrl(`data:image/png;base64,${part.inlineData.data}`);
      } else {
        throw new Error('Image could not be generated. Please try a different topic.');
      }
    } catch (e: any) {
      const aiErr = handleAIError(e);
      setErrorMsg('Error generating image: ' + aiErr.message);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleSaveDraft = async () => {
    if (!selectedAccountId || !output || !user) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await addDoc(collection(db, `accounts/${selectedAccountId}/posts`), {
        pillar,
        topic,
        content: output,
        status: 'draft',
        authorId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        hasGeneratedImage: !!imageUrl,
        mockImageUrl: imageUrl || null
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      handleFirestoreError(e, OperationType.CREATE, `accounts/${selectedAccountId}/posts`);
      setErrorMsg('Failed to save draft. Check your permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Form Area */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
        <div className="mb-8">
          <h2 className="font-serif text-3xl mb-2 text-slate-800">Caption Assistant</h2>
          <p className="text-sm text-slate-500">AI-powered copywriting & visual generation.</p>
        </div>

        <form className="space-y-6 flex-1">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Target Account</label>
            <select 
              value={selectedAccountId} 
              onChange={e => setSelectedAccountId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="" disabled>Select an account...</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
            {accounts.length === 0 && (
               <p className="text-xs text-amber-600 mt-2">Go to Accounts & Team to create an account first.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Content Pillar</label>
            <select 
              value={pillar} 
              onChange={e => setPillar(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option>Chapter 1: Destination Inspiration</option>
              <option>Chapter 2: Travel Tips & Education</option>
              <option>Chapter 3: Client Stories / Testimonials</option>
              <option>Chapter 4: Behind the Scenes</option>
              <option>Chapter 5: Deals & Packages</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Post Details / Topic</label>
            <textarea 
              required
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. A hidden beach cafe in Santorini at sunset..."
              className="w-full border border-slate-200 rounded-xl p-4 bg-slate-50 min-h-[120px] focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Image Theme / Visual Insight (Optional)</label>
            <input 
              type="text"
              value={imageTheme}
              onChange={e => setImageTheme(e.target.value)}
              placeholder="e.g. Vintage aesthetic, focus on espresso, moody lighting..."
              className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">If blank, AI will use your topic for any visual generation.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button 
              type="button" 
              onClick={generateCaption}
              disabled={isGenerating || !topic}
              className="w-full py-4 rounded-xl bg-amber-600 text-white font-medium hover:bg-amber-700 transition flex items-center justify-center gap-2 shadow-lg shadow-amber-200 disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="animate-spin w-5 h-5" /> : <Wand2 className="w-5 h-5" />}
              Caption
            </button>
            <button 
              type="button" 
              onClick={generateReelIdeas}
              disabled={isGenerating || !topic}
              className="w-full py-4 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5 text-amber-400" />}
              Reel Ideas
            </button>
          </div>
          
          {errorMsg && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-200 animate-in fade-in slide-in-from-top-2">
              {errorMsg}
            </div>
          )}
        </form>
      </div>

      {/* Output Area (Dark mode) */}
      <div id="caption-result-section" className="bg-[#0f172a] text-slate-300 p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col min-h-[600px]">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <h3 className="font-serif text-2xl text-white">Result</h3>
          
          {output && (
            <div className="flex items-center gap-2">
              <button 
                onClick={handleSaveDraft} 
                disabled={!selectedAccountId || isSaving}
                className="text-xs bg-slate-800 hover:bg-amber-600 text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saveSuccess ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Save className="w-3.5 h-3.5" />}
                {saveSuccess ? 'Saved' : 'Save'}
              </button>
              <button 
                onClick={handleCopy} 
                className="p-2 text-slate-400 hover:text-white transition bg-slate-800 rounded-lg"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
        
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-1">
             <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Caption Draft</span>
             {!output && (
               <div className="flex items-center gap-2">
                 <button 
                   onClick={generateImage}
                   disabled={isGeneratingImage || (!topic && !imageTheme)}
                   className="text-xs bg-amber-600/10 text-amber-500 border border-amber-600/20 px-3 py-1.5 rounded-lg hover:bg-amber-600/20 transition flex items-center gap-1.5 disabled:opacity-50"
                 >
                   {isGeneratingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                   Generate Visual First
                 </button>
               </div>
             )}
          </div>

          {output ? (
            <>
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 whitespace-pre-wrap overflow-y-auto max-h-[300px] text-sm leading-relaxed">
                {output}
              </div>

              {/* AI Refinement Controls */}
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => refineCaption('Make it shorter and punchier')}
                  disabled={isRefining}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs flex items-center gap-1.5 transition"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isRefining ? 'animate-spin' : ''}`} />
                  Make Punchier
                </button>
                <button 
                  onClick={() => refineCaption('Add more emojis')}
                  disabled={isRefining}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs flex items-center gap-1.5 transition"
                >
                  ✨ Add Emojis
                </button>
                <button 
                  onClick={() => refineCaption('Make the CTA more urgent')}
                  disabled={isRefining}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs flex items-center gap-1.5 transition"
                >
                  🔥 Urgent CTA
                </button>
                <button 
                  onClick={() => refineCaption('Make it more descriptive')}
                  disabled={isRefining}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs flex items-center gap-1.5 transition"
                >
                  🎨 More Descriptive
                </button>
                <button 
                  onClick={() => refineCaption('Shorten the hook')}
                  disabled={isRefining}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs flex items-center gap-1.5 transition"
                >
                  ⚡ Shorten Hook
                </button>
              </div>

              {/* Image Generation */}
              <div className="mt-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Visual Component</span>
                  <button 
                    onClick={generateImage}
                    disabled={isGeneratingImage}
                    className="text-xs bg-amber-600/20 text-amber-400 border border-amber-600/30 px-3 py-1.5 rounded-lg hover:bg-amber-600/30 transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isGeneratingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                    Gen Visual
                  </button>
                </div>
                
                <div className="flex-1 bg-slate-800/30 border-2 border-dashed border-slate-700 rounded-2xl flex items-center justify-center overflow-hidden min-h-[240px]">
                  {imageUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={imageUrl} 
                        alt="Generated Visual" 
                        className="w-full h-full object-cover animate-in fade-in zoom-in duration-500" 
                        referrerPolicy="no-referrer"
                      />
                    </>
                  ) : (
                    <div className="text-center p-6 text-slate-600">
                      {isGeneratingImage ? (
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                          <p className="text-sm">Painting your travel visual...</p>
                        </div>
                      ) : (
                        <p className="text-xs italic">Generate a custom AI image to match this caption</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-30 space-y-4">
              <Sparkles className="w-16 h-16" />
              <p className="font-medium">AI response will manifest here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
