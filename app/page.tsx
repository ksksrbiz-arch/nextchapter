'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Map, 
  CalendarDays, 
  Sparkles, 
  Camera, 
  Image as ImageIcon,
  Users,
  Menu,
  X,
  LogOut
} from 'lucide-react';

import OverviewTab from '../components/tabs/OverviewTab';
import BrandKitTab from '../components/tabs/BrandKitTab';
import PlannerTab from '../components/tabs/PlannerTab';
import CaptionAssistantTab from '../components/tabs/CaptionAssistantTab';
import UgcCampaignTab from '../components/tabs/UgcCampaignTab';
import HallOfFameTab from '../components/tabs/HallOfFameTab';
import AccountsTab from '../components/tabs/AccountsTab';
import { useAuth } from '../components/AuthProvider';

type TabId = 'overview' | 'brand' | 'planner' | 'caption' | 'ugc' | 'hall-of-fame' | 'accounts';

export default function Page() {
  const { user, loading, signIn, logOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handleNavigate = (e: CustomEvent<{ tabId: TabId }>) => {
      if (e.detail && e.detail.tabId) {
        setActiveTab(e.detail.tabId);
      }
    };
    
    const handleGetActiveTab = () => {
      const event = new CustomEvent('app:activeTabResponse', { detail: { tabId: activeTab } });
      window.dispatchEvent(event);
    };

    window.addEventListener('app:navigate' as any, handleNavigate);
    window.addEventListener('app:getActiveTab' as any, handleGetActiveTab);
    return () => {
      window.removeEventListener('app:navigate' as any, handleNavigate);
      window.removeEventListener('app:getActiveTab' as any, handleGetActiveTab);
    };
  }, [activeTab]);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'brand', label: 'Brand Kit', icon: Map },
    { id: 'planner', label: 'Content Planner', icon: CalendarDays },
    { id: 'caption', label: 'AI Caption Assistant', icon: Sparkles },
    { id: 'ugc', label: 'UGC Campaign', icon: Camera },
    { id: 'hall-of-fame', label: 'Hall of Fame', icon: ImageIcon },
    { id: 'accounts', label: 'Accounts & Team', icon: Users },
  ] as const;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfcf9]">
        <div className="animate-spin text-amber-600">
          <BookOpen className="w-8 h-8" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfcf9] font-sans p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-slate-100 text-center">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="font-serif italic text-3xl text-slate-900 mb-2">Next Chapter HQ</h1>
          <p className="text-slate-500 mb-8">Log in to manage brand assets, content strategies, and agency teams.</p>
          <button 
            onClick={signIn}
            className="w-full bg-slate-900 text-white font-medium py-3 rounded-xl hover:bg-slate-800 transition shadow-md"
          >
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#fdfcf9] font-sans relative pb-20 lg:pb-0">
      
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 text-amber-50 flex items-center justify-between px-4 z-40 shadow-md">
        <h1 className="font-serif italic tracking-tight text-xl flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-500" />
          Next Chapter
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-300 hover:text-white">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-[100dvh] lg:h-screen w-64 bg-slate-900 text-amber-50 flex flex-col shadow-2xl z-50 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 border-b border-slate-800 flex justify-between items-start">
          <div>
            <h1 className="font-serif italic tracking-tight text-2xl flex items-center gap-2 mb-2">
              <BookOpen className="w-6 h-6 text-amber-500" />
              Next Chapter
            </h1>
            <div className="inline-block px-2 py-1 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full mt-1 border border-amber-500/30 shadow-sm">
              HQ Dashboard
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="p-1 lg:hidden text-slate-400 hover:text-white">
             <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                  isActive 
                    ? 'bg-amber-50 text-slate-900 shadow-md transform translate-x-1' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-600' : 'opacity-70'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 overflow-hidden">
               <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                 {user.displayName?.[0] || user.email?.[0] || 'U'}
               </div>
               <div className="text-xs truncate">
                 <div className="text-slate-300 font-medium truncate">{user.displayName || 'Travel Agent'}</div>
                 <div className="text-slate-500 truncate">{user.email}</div>
               </div>
            </div>
            <button onClick={logOut} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition" title="Log out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative lg:w-[calc(100%-16rem)] pt-16 lg:pt-0 overflow-x-hidden min-h-[100dvh]">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overview' && <OverviewTab />}
              {activeTab === 'brand' && <BrandKitTab />}
              {activeTab === 'planner' && <PlannerTab />}
              {activeTab === 'caption' && <CaptionAssistantTab />}
              {activeTab === 'ugc' && <UgcCampaignTab />}
              {activeTab === 'hall-of-fame' && <HallOfFameTab />}
              {activeTab === 'accounts' && <AccountsTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-100 flex items-center justify-around px-2 z-40 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 transition-colors ${
                isActive ? 'text-amber-600' : 'text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
