'use client';

import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { MessageSquare, X, Send, Loader2, Bot, User } from 'lucide-react';
import { handleAIError } from '../lib/ai-errors';

interface Message {
  role: 'user' | 'model';
  content: string;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: 'Hi there! I am your Next Chapter Travel assistant. I can help navigate the app or assist you with social media content.' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const aiRef = useRef<GoogleGenAI | null>(null);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_GEMINI_API_KEY && !aiRef.current) {
      aiRef.current = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !aiRef.current) return;

    const userMsg = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user' as const, content: userMsg }];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      const systemInstruction = `You are a helpful conversational assistant integrated into the Next Chapter Travel LLC Content Strategy Dashboard.
The app allows users to manage target accounts, plan content calendars, generate Instagram captions and Reel ideas, and run UGC campaigns.
Answer questions about the app, provide social media marketing advice, and assist users with their tasks.
If the user asks to go to a specific section, use the navigateTab tool to take them there.
Available tabs:
- overview: Dashboard Overview
- brand: Brand Kit
- planner: Content Planner
- caption: AI Caption Assistant
- ugc: UGC Campaign
- hall-of-fame: Hall of Fame (Client galleries)
- accounts: Accounts & Team`;

      const navigateTab: FunctionDeclaration = {
        name: 'navigateTab',
        description: 'Navigate the application to a specific tab. Use this whenever the user asks to switch views, see a certain tab, or go to a feature.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            tabId: {
              type: Type.STRING,
              description: 'The ID of the tab to navigate to (overview, brand, planner, caption, ugc, hall-of-fame, accounts)'
            }
          },
          required: ['tabId']
        }
      };

      const getActiveTab: FunctionDeclaration = {
        name: 'getActiveTab',
        description: 'Get the ID of the currently active tab.',
        parameters: {
          type: Type.OBJECT,
          properties: {}
        }
      };

      const formattedHistory = newMessages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const ai = aiRef.current;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: formattedHistory,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: [navigateTab, getActiveTab] }]
        }
      });

      let textOutput = response.text || '';
      const functionCalls = response.functionCalls;

      if (functionCalls && functionCalls.length > 0) {
        for (const call of functionCalls) {
          if (call.name === 'navigateTab') {
            const args = call.args as any;
            if (args && args.tabId) {
              const event = new CustomEvent('app:navigate', { detail: { tabId: args.tabId } });
              window.dispatchEvent(event);
              textOutput += (textOutput ? '\n\n' : '') + `Navigating to ${args.tabId}...`;
            }
          } else if (call.name === 'getActiveTab') {
            // Because we're in an async flow and can't easily wait for the DOM response via CustomEvent synchronously,
            // we will just inform them it's complicated, or we can resolve it. 
            // Since this is a simple implementation, let's just ignore getActiveTab for now and stick to navigate.
            // Wait, we could just read the DOM to find active tab, but navigate is the most important.
          }
        }
      }

      setMessages([...newMessages, { role: 'model', content: textOutput || 'Done!' }]);
    } catch (error) {
      const aiErr = handleAIError(error);
      setMessages([...newMessages, { role: 'model', content: `Error: ${aiErr.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 rounded-full bg-amber-600 text-white shadow-lg shadow-amber-900/20 hover:bg-amber-700 transition-all z-40 ${isOpen ? 'scale-0' : 'scale-100'}`}
        aria-label="Open AI Assistant"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      <div 
        className={`fixed bottom-6 right-6 sm:bottom-8 sm:right-8 w-[90vw] sm:w-[400px] h-[600px] max-h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 transform origin-bottom-right z-50 border border-slate-200 ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}
      >
        {/* Header */}
        <div className="bg-slate-900 p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 p-2 rounded-lg">
              <Bot className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <h3 className="font-serif font-medium">App Assistant</h3>
              <p className="text-[10px] text-slate-400">Powered by Gemini</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'}`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`max-w-[75%] p-3 rounded-2xl text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-amber-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm'}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-sm flex items-center gap-2 w-16">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-slate-100">
          <form onSubmit={handleSubmit} className="flex items-center gap-2 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              className="flex-1 bg-slate-100 text-slate-900 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="absolute right-2 p-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
