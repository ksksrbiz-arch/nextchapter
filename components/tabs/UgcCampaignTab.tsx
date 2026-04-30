import { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Sparkles, Loader2, MessageSquarePlus, Megaphone, ImagePlus } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

import { handleAIError } from '../../lib/ai-errors';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../AuthProvider';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

interface Account {
  id: string;
  name: string;
}

export default function UgcCampaignTab() {
  const { user } = useAuth();
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [isGeneratingGraphic, setIsGeneratingGraphic] = useState(false);
  const [generatedGraphicUrl, setGeneratedGraphicUrl] = useState<string | null>(null);
  const [copy, setCopy] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // UGC Upload State
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [quote, setQuote] = useState('');
  const [clientProfileUrl, setClientProfileUrl] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchAccounts = async () => {
      try {
        const ownedQ = query(collection(db, 'accounts'), where('ownerId', '==', user.uid));
        const ownedSnapshot = await getDocs(ownedQ);
        const ownedAccs = ownedSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Account));

        setAccounts(ownedAccs);
        if (ownedAccs.length > 0) {
           setSelectedAccountId(ownedAccs[0].id);
        }
      } catch (e) {
        console.error('Error fetching accounts:', e);
      }
    };
    fetchAccounts();
  }, [user]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId || !clientName || !quote || !photo || !user) {
      setErrorMsg('Please fill in all required fields and select an image.');
      return;
    }

    setIsUploading(true);
    setErrorMsg('');
    setUploadSuccess(false);

    try {
      // 1. Upload to storage
      const storageRef = ref(storage, `accounts/${selectedAccountId}/ugcSubmissions/${Date.now()}_${photo.name}`);
      const uploadResult = await uploadBytes(storageRef, photo);
      const photoUrl = await getDownloadURL(uploadResult.ref);

      // 2. Save to firestore
      const subRef = collection(db, `accounts/${selectedAccountId}/ugcSubmissions`);
      await addDoc(subRef, {
        clientName,
        quote,
        photoUrl,
        clientProfileUrl: clientProfileUrl || null,
        uploadedBy: user.uid,
        createdAt: serverTimestamp()
      });

      setUploadSuccess(true);
      setClientName('');
      setQuote('');
      setClientProfileUrl('');
      setPhoto(null);
    } catch (e) {
      console.error(e);
      setErrorMsg('Failed to upload submission.');
    } finally {
      setIsUploading(false);
    }
  };

  const generateCampaignCopy = async () => {
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) return;
    setIsGeneratingCopy(true);
    setErrorMsg('');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      const prompt = `You are a creative director for Next Chapter Travel LLC. 
We need promo copy for our "#MyNextChapterTravel" UGC campaign.
The goal is to get clients to share their travel photos and stories.
Incentive: $250 quarterly travel credit.
Tone: Emotional, encouraging, adventurous. 
Mention the "New Chapter" metaphor.
Provide:
1. An Instagram post caption inviting people to join.
2. A short script for an Instagram Story (15s).
3. A DM template to send to happy clients.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      setCopy(response.text || 'Failed to generate campaign copy.');
    } catch (e: any) {
      const aiErr = handleAIError(e);
      setErrorMsg(aiErr.message);
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  const generateCampaignGraphic = async () => {
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) return;
    setIsGeneratingGraphic(true);
    setErrorMsg('');
    setGeneratedGraphicUrl(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      const prompt = `A highly aesthetic, cinematic travel poster. Warm, inviting, and adventurous. It features an open book seamlessly blending into a breathtaking landscape with a traveler stepping into the scene. "My Next Chapter Travel" theme.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: prompt,
        config: {
          imageConfig: {
            aspectRatio: '16:9'
          }
        }
      });
      
      let base64Image = '';
      if (response.candidates && response.candidates.length > 0) {
        const parts = response.candidates[0].content?.parts;
        if (parts) {
          for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
              base64Image = part.inlineData.data;
              break;
            }
          }
        }
      }

      if (base64Image) {
        setGeneratedGraphicUrl(`data:image/jpeg;base64,${base64Image}`);
      } else {
        throw new Error("No image was generated.");
      }
    } catch (e: any) {
      const aiErr = handleAIError(e);
      setErrorMsg(aiErr.message);
    } finally {
      setIsGeneratingGraphic(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-serif text-3xl mb-2 text-slate-800">&quot;My Next Chapter&quot; UGC Campaign</h2>
          <p className="text-slate-500">Strategy to incentivize and showcase User-Generated Content.</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex gap-2">
            <button 
              onClick={generateCampaignGraphic}
              disabled={isGeneratingGraphic}
              className="bg-slate-800 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-700 transition flex items-center gap-2 shadow-lg shadow-slate-800/20 disabled:opacity-50"
            >
              {isGeneratingGraphic ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4 text-amber-400" />}
              AI Graphic
            </button>
            <button 
              onClick={generateCampaignCopy}
              disabled={isGeneratingCopy}
              className="bg-amber-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-amber-700 transition flex items-center gap-2 shadow-lg shadow-amber-200 disabled:opacity-50"
            >
              {isGeneratingCopy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              AI Campaign Promo
            </button>
          </div>
          {errorMsg && <p className="text-red-500 text-[10px] italic">{errorMsg}</p>}
        </div>
      </div>

      {(copy || generatedGraphicUrl) && (
        <div className="bg-[#0f172a] text-slate-300 p-8 rounded-3xl shadow-xl animate-in zoom-in duration-300">
          <div className="flex items-center gap-2 mb-6 text-amber-400">
            <Megaphone className="w-5 h-5" />
            <h3 className="font-serif text-xl">Generated Campaign Assets</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {copy && (
              <div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed max-h-[400px] overflow-y-auto pr-4 bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                  {copy}
                </div>
                <button 
                  onClick={() => { navigator.clipboard.writeText(copy) }}
                  className="mt-4 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg transition border border-slate-700"
                >
                  Copy to Clipboard
                </button>
              </div>
            )}
            {generatedGraphicUrl && (
              <div>
                <div className="bg-slate-800/50 p-2 rounded-2xl border border-slate-700 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={generatedGraphicUrl} alt="Campaign Graphic" className="w-full rounded-xl object-cover aspect-video" />
                </div>
                <a 
                  href={generatedGraphicUrl}
                  download="campaign-graphic.jpg"
                  className="mt-4 inline-block text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg transition border border-slate-700 text-center"
                >
                  Download Graphic
                </a>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4">
          <h3 className="font-serif text-xl text-amber-700">The Concept</h3>
          <p className="text-slate-600 text-sm leading-relaxed">
            Encourage travelers to share their most transformative/memorable travel moments—the exact point they felt they were starting a &quot;new chapter.&quot;
          </p>
          <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <span className="text-xs uppercase tracking-wider font-bold text-amber-400 mb-1 block">Primary Hashtag</span>
            <span className="text-xl font-bold text-amber-900">#MyNextChapterTravel</span>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1 block">Secondary Hashtag</span>
            <span className="text-xl font-bold text-slate-700">#TurningThePageTravel</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4">
          <h3 className="font-serif text-xl text-amber-700">Incentives</h3>
          
          <div className="p-4 border-l-4 border-amber-500 bg-amber-50/50 rounded-r-2xl">
            <h4 className="font-semibold text-slate-800 mb-1">Quarterly Giveaway</h4>
            <p className="text-sm text-slate-600">A $250 travel credit awarded to the best #MyNextChapterTravel submission to encourage ongoing engagement.</p>
          </div>

          <div className="p-4 border-l-4 border-slate-700 bg-slate-50 rounded-r-2xl">
            <h4 className="font-semibold text-slate-800 mb-1">Welcome Home Gift</h4>
            <p className="text-sm text-slate-600">Proactively send clients a high-quality embossed travel journal upon return, containing a card prompting them to share.</p>
          </div>
        </div>

        <div className="bg-[#1e293b] p-8 rounded-3xl shadow-lg md:col-span-2 text-white">
          <h3 className="font-serif text-2xl text-amber-400 mb-6 font-medium">Upload Client Photo & Quote</h3>
          
          <form className="space-y-6 bg-slate-800/50 p-6 rounded-2xl border border-slate-700" onSubmit={handleUploadSubmit}>
            {uploadSuccess && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
                Successfully uploaded client photo and quote!
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Select Account</label>
                <select 
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  required
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                  {accounts.length === 0 && <option value="">No accounts found</option>}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Client Name <span className="text-red-400">*</span></label>
                <input 
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Sarah J."
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Quote / Story <span className="text-red-400">*</span></label>
              <textarea 
                required
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                placeholder="What made this trip special?"
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[100px] resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Profile Link (Optional)</label>
                <input 
                  type="url"
                  value={clientProfileUrl}
                  onChange={(e) => setClientProfileUrl(e.target.value)}
                  placeholder="e.g. https://instagram.com/client"
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Client Photo <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input 
                    type="file"
                    accept="image/*"
                    required
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setPhoto(e.target.files[0]);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="w-full bg-slate-900 border border-slate-700 text-slate-400 rounded-xl p-3 flex items-center justify-between hover:border-amber-500/50 transition">
                     <span className="truncate pr-4 text-sm">{photo ? photo.name : 'Choose an image file...'}</span>
                     <ImagePlus className="w-5 h-5 flex-shrink-0 text-slate-500" />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-700 flex justify-end">
              <button 
                type="submit"
                disabled={isUploading || accounts.length === 0}
                className="bg-amber-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-amber-700 transition shadow-lg shadow-amber-900/20 disabled:opacity-50 flex items-center gap-2"
              >
                {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isUploading ? 'Uploading...' : 'Save UGC Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
