import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc, 
  Timestamp, 
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../AuthProvider';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Layout, 
  Image as ImageIcon,
  MoreVertical,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Post {
  id: string;
  accountId: string;
  pillar: string;
  topic: string;
  content: string;
  status: 'draft' | 'approved' | 'published';
  scheduledDate?: Timestamp;
  mockImageUrl?: string;
}

interface Account {
  id: string;
  name: string;
}

export default function PlannerTab() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);

  const [view, setView] = useState<'calendar' | 'list'>('calendar');

  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editTime, setEditTime] = useState<string>('');
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // Automatically switch to list view on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setView('list');
      } else {
        setView('calendar');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch accounts user has access to
  useEffect(() => {
    if (!user) return;

    const fetchAccounts = async () => {
      try {
        // Query accounts where user is owner
        const ownedQ = query(collection(db, 'accounts'), where('ownerId', '==', user.uid));
        const ownedSnapshot = await getDocs(ownedQ);
        const ownedAccs = ownedSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Account));

        // Query memberships (Collection Group)
        // Wait, collection group query in Firestore:
        const { collectionGroup } = await import('firebase/firestore');
        const memberQ = query(collectionGroup(db, 'members'), where('userId', '==', user.uid));
        const memberSnapshot = await getDocs(memberQ);
        
        const memberAccountIds = memberSnapshot.docs.map(d => d.data().accountId).filter(id => !ownedAccs.find(a => a.id === id));
        
        const memberAccs: Account[] = [];
        for (const accountId of memberAccountIds) {
          const accDoc = await getDocs(query(collection(db, 'accounts'), where('__name__', '==', accountId)));
          if (!accDoc.empty) {
            memberAccs.push({ id: accDoc.docs[0].id, ...accDoc.docs[0].data() } as Account);
          }
        }
        
        setAccounts([...ownedAccs, ...memberAccs]);
        setIsLoading(false);
      } catch (e) {
        console.error('Error fetching accounts:', e);
        // Fallback to just owned accounts if collection group fails (usually due to missing index)
        const ownedQ = query(collection(db, 'accounts'), where('ownerId', '==', user.uid));
        const ownedSnapshot = await getDocs(ownedQ);
        setAccounts(ownedSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Account)));
        setIsLoading(false);
      }
    };

    fetchAccounts();
  }, [user]);

  // Subscribe to posts for all found accounts
  useEffect(() => {
    if (accounts.length === 0) return;

    const unsubscribes = accounts.map(account => {
      const q = query(collection(db, `accounts/${account.id}/posts`));
      return onSnapshot(q, (snapshot) => {
        const accPosts = snapshot.docs.map(d => ({ 
          id: d.id, 
          accountId: account.id,
          ...d.data() 
        } as Post));
        
        setPosts(prev => {
          // Filter out existing posts from this account and add new ones
          const otherPosts = prev.filter(p => p.accountId !== account.id);
          return [...otherPosts, ...accPosts];
        });
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `accounts/${account.id}/posts`);
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [accounts]);

  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleDragStart = (e: React.DragEvent, postId: string) => {
    setDraggedPostId(postId);
    e.dataTransfer.setData('postId', postId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, day: number) => {
    e.preventDefault();
    const postId = e.dataTransfer.getData('postId');
    if (!postId) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    
    try {
      const postRef = doc(db, `accounts/${post.accountId}/posts`, post.id);
      await updateDoc(postRef, {
        scheduledDate: Timestamp.fromDate(newDate),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `accounts/${post.accountId}/posts/${post.id}`);
    }
    
    setDraggedPostId(null);
  };

  const openPostEdit = (post: Post) => {
    setEditingPost(post);
    if (post.scheduledDate) {
      const d = post.scheduledDate.toDate();
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      setEditDate(`${yr}-${mo}-${da}`);
      const hr = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      setEditTime(`${hr}:${mi}`);
    } else {
      setEditDate('');
      setEditTime('');
    }
  };

  const savePostSchedule = async () => {
    if (!editingPost) return;
    setIsSavingSchedule(true);

    try {
      let newTimestamp: Timestamp | null = null;
      if (editDate) {
        const [yr, mo, da] = editDate.split('-').map(Number);
        let hr = 0, mi = 0;
        if (editTime) {
          const [h, m] = editTime.split(':').map(Number);
          hr = h;
          mi = m;
        }
        newTimestamp = Timestamp.fromDate(new Date(yr, mo - 1, da, hr, mi));
      }

      const postRef = doc(db, `accounts/${editingPost.accountId}/posts`, editingPost.id);
      const updateData: any = {
        updatedAt: serverTimestamp()
      };
      
      if (newTimestamp) {
         updateData.scheduledDate = newTimestamp;
      }

      await updateDoc(postRef, updateData);
      setEditingPost(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `accounts/${editingPost.accountId}/posts/${editingPost.id}`);
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const renderListView = () => {
    const scheduledPosts = posts
      .filter(p => p.scheduledDate)
      .sort((a, b) => a.scheduledDate!.toMillis() - b.scheduledDate!.toMillis());

    if (scheduledPosts.length === 0) {
      return (
        <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl">
          <CalendarIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400">No posts scheduled yet.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {scheduledPosts.map((post, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            key={post.id} 
            onClick={() => openPostEdit(post)}
            className="flex gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm items-start cursor-pointer hover:border-amber-500/50 transition hover:shadow-md"
          >
            <div className={`w-12 h-12 rounded-xl flex-shrink-0 flex flex-col items-center justify-center text-white ${
              post.status === 'published' ? 'bg-green-500' : post.status === 'approved' ? 'bg-blue-500' : 'bg-slate-400'
            }`}>
              <span className="text-[10px] uppercase font-bold opacity-70">
                {post.scheduledDate?.toDate().toLocaleString('default', { month: 'short' })}
              </span>
              <span className="text-lg font-bold leading-none">
                {post.scheduledDate?.toDate().getDate()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest truncate">{post.pillar}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase font-bold truncate ${
                  post.status === 'published' ? 'bg-green-100 text-green-700' : 
                  post.status === 'approved' ? 'bg-blue-100 text-blue-700' : 
                  'bg-slate-100 text-slate-600'
                }`}>
                  {post.status}
                </span>
              </div>
              <h4 className="text-sm font-semibold text-slate-800 line-clamp-1">{post.topic}</h4>
              <p className="text-xs text-slate-500 line-clamp-2 mt-1">{post.content.split('\n')[0]}</p>
            </div>
            {post.mockImageUrl && (
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200">
                 <>
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img src={post.mockImageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                 </>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    );
  };

  const renderCalendar = () => {
    const days = [];
    const totalDays = daysInMonth(currentDate);
    const startOffset = firstDayOfMonth(currentDate);

    // Days headers
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Fill offset days
    for (let i = 0; i < startOffset; i++) {
      days.push(<div key={`offset-${i}`} className="h-40 border-b border-r border-slate-100 bg-slate-50/30"></div>);
    }

    // Actual days
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
      const isToday = new Date().toDateString() === date.toDateString();
      
      const dayPosts = posts.filter(p => {
        if (!p.scheduledDate) return false;
        const sDate = p.scheduledDate.toDate();
        return sDate.getFullYear() === date.getFullYear() &&
               sDate.getMonth() === date.getMonth() &&
               sDate.getDate() === date.getDate();
      });

      days.push(
        <div 
          key={d} 
          className={`h-40 border-b border-r border-slate-100 p-2 overflow-y-auto transition-colors group relative ${isToday ? 'bg-amber-50/50' : 'hover:bg-slate-50'}`}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, d)}
        >
          <span className={`text-xs font-medium mb-2 inline-block px-1.5 py-0.5 rounded-full ${isToday ? 'bg-amber-600 text-white' : 'text-slate-400 group-hover:text-slate-600'}`}>
            {d}
          </span>
          
          <div className="space-y-1">
            {dayPosts.map(post => (
              <div
                key={post.id}
                draggable
                onDragStart={(e) => handleDragStart(e, post.id)}
                onClick={() => openPostEdit(post)}
                className={`text-[10px] p-1.5 rounded-lg border shadow-sm cursor-pointer active:cursor-grabbing transform transition-all hover:scale-[1.02] ${
                  post.status === 'published' ? 'bg-green-50 border-green-200 text-green-700' :
                  post.status === 'approved' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                  'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="truncate font-semibold">{post.pillar.split(':')[0]}</span>
                  {post.mockImageUrl && <ImageIcon className="w-2.5 h-2.5 flex-shrink-0" />}
                </div>
                <p className="truncate opacity-80">{post.topic}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-7 border-t border-l border-slate-100 rounded-xl overflow-hidden">
        {weekDays.map(day => (
          <div key={day} className="p-3 text-center text-xs font-bold text-slate-400 border-r border-b border-slate-100 bg-slate-50/50 uppercase tracking-wider">
            {day}
          </div>
        ))}
        {days}
      </div>
    );
  };

  const unscheduledPosts = posts.filter(p => !p.scheduledDate);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="font-serif text-3xl text-slate-800 mb-1">Content Planner</h2>
          <p className="text-slate-500">Coordinate and schedule your agency stories.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex bg-slate-100 p-1 rounded-xl">
             <button 
               onClick={() => setView('calendar')}
               className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${view === 'calendar' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
             >
               Calendar
             </button>
             <button 
               onClick={() => setView('list')}
               className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${view === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
             >
               List
             </button>
          </div>
          
          <div className="flex items-center gap-4 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-50 rounded-xl transition text-slate-600">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-serif text-lg px-4 text-slate-800 min-w-[120px] sm:min-w-[160px] text-center">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-50 rounded-xl transition text-slate-600">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main View Area */}
        <div className="lg:col-span-9">
          {view === 'calendar' ? (
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm overflow-x-auto">
              <div className="min-w-[800px] lg:min-w-0">
                {renderCalendar()}
              </div>
            </div>
          ) : (
            <div className="lg:bg-white lg:p-6 lg:rounded-3xl lg:border lg:border-slate-100 lg:shadow-sm">
              {renderListView()}
            </div>
          )}
        </div>

        {/* Sidebar: Unscheduled & Stats */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-xl text-amber-400">Unscheduled</h3>
              <Layout className="w-5 h-5 text-slate-500" />
            </div>
            <p className="text-xs text-slate-400 mb-4">Drag these onto the calendar to set a live date.</p>
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {unscheduledPosts.length === 0 ? (
                <div className="p-8 border-2 border-dashed border-slate-800 rounded-2xl text-center">
                  <Plus className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-xs text-slate-600">All posts have been scheduled</p>
                </div>
              ) : (
                unscheduledPosts.map(post => (
                  <div
                    key={post.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, post.id)}
                    onClick={() => openPostEdit(post)}
                    className="p-4 bg-slate-800 border border-slate-700 rounded-2xl cursor-pointer active:cursor-grabbing hover:border-amber-500/50 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">{post.pillar.split(':')[0]}</span>
                       <MoreVertical className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                    </div>
                    <p className="text-sm font-medium mb-1 line-clamp-1">{post.topic}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-bold ${
                        post.status === 'approved' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-400'
                      }`}>
                        {post.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-center gap-4">
            <div className="bg-amber-600 p-3 rounded-2xl">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-amber-800 font-bold uppercase tracking-wider">Next Deadline</p>
              <p className="text-sm text-amber-900 font-medium">May 15th - Italy Reel</p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Scheduling Modal */}
      <AnimatePresence>
        {editingPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingPost(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md relative z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                   <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-serif text-xl text-slate-800">Schedule Post</h3>
                  <p className="text-xs text-slate-500 truncate max-w-[250px]">{editingPost.topic}</p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                  <input 
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-amber-500 focus:border-amber-500 block p-3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Time</label>
                  <input 
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-amber-500 focus:border-amber-500 block p-3"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                   <button 
                     onClick={() => setEditingPost(null)}
                     className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl transition"
                   >
                     Cancel
                   </button>
                   <button 
                     onClick={savePostSchedule}
                     disabled={isSavingSchedule}
                     className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-800 transition shadow-sm disabled:opacity-50"
                   >
                     {isSavingSchedule ? 'Saving...' : 'Save Schedule'}
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

