import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, doc, setDoc, deleteDoc, serverTimestamp, onSnapshot, getDoc, collectionGroup } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../AuthProvider';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { Loader2, Plus, Users as UsersIcon, Shield, Trash2, UserCheck } from 'lucide-react';

interface Account {
  id: string;
  name: string;
  ownerId: string;
  createdAt: any;
  isMember?: boolean;
}

interface Member {
  id: string; // the memberId / userId
  role: 'admin' | 'moderator' | 'content creator' | 'analyst';
  addedBy: string;
  addedAt: any;
  email?: string; // Fetched from users
}

export default function AccountsTab() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newAccountName, setNewAccountName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'moderator' | 'content creator' | 'analyst'>('moderator');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [memberError, setMemberError] = useState('');

  useEffect(() => {
    if (!user) return;
    
    // Load accounts we own
    const qOwned = query(collection(db, 'accounts'), where('ownerId', '==', user.uid));
    const unsubOwned = onSnapshot(qOwned, (snapshot) => {
      const owned = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Account));
      
      // Load accounts we are a member of
      const qMember = query(collectionGroup(db, 'members'), where('userId', '==', user.uid));
      getDocs(qMember).then(memberSnap => {
        const promises = memberSnap.docs.map(async mDoc => {
          const mData = mDoc.data();
          const accSnap = await getDoc(doc(db, 'accounts', mData.accountId));
          if (accSnap.exists() && accSnap.data().ownerId !== user.uid) {
            return { id: accSnap.id, ...accSnap.data(), isMember: true } as Account;
          }
          return null;
        });
        
        Promise.all(promises).then(memberAccounts => {
          const validMems = memberAccounts.filter(Boolean) as Account[];
          setAccounts([...owned, ...validMems]);
          setLoading(false);
        });
      }).catch(err => {
         handleFirestoreError(err, OperationType.GET, 'members');
      });
      
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'accounts');
    });

    return () => unsubOwned();
  }, [user]);

  useEffect(() => {
    if (!selectedAccountId) return;
    
    const unsubscribe = onSnapshot(collection(db, `accounts/${selectedAccountId}/members`), async (snapshot) => {
      const mems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
      // fetch emails efficiently
      const memsWithEmails = await Promise.all(mems.map(async (m) => {
        try {
           const u = await getDoc(doc(db, 'users', m.id));
           return { ...m, email: u.data()?.email || 'Unknown' };
        } catch(e) { return m; }
      }));
      setMembers(memsWithEmails);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `accounts/${selectedAccountId}/members`);
    });

    return () => unsubscribe();
  }, [selectedAccountId]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountName.trim() || !user) return;
    setIsCreating(true);
    try {
      await addDoc(collection(db, 'accounts'), {
        name: newAccountName,
        createdAt: serverTimestamp(),
        ownerId: user.uid,
      });
      setNewAccountName('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'accounts');
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim() || !user || !selectedAccountId) return;
    setIsAddingMember(true);
    setMemberError('');
    try {
      // Find user by email
      const usersQuery = query(collection(db, 'users'), where('email', '==', newMemberEmail));
      const usersSnap = await getDocs(usersQuery);
      
      if (usersSnap.empty) {
        setMemberError('User with that email not found. They must log in to the dashboard first.');
        setIsAddingMember(false);
        return;
      }
      
      const newUserId = usersSnap.docs[0].id;
      
      await setDoc(doc(db, `accounts/${selectedAccountId}/members`, newUserId), {
        role: newMemberRole,
        addedBy: user.uid,
        addedAt: serverTimestamp(),
        accountId: selectedAccountId,
        userId: newUserId
      });
      
      setNewMemberEmail('');
    } catch (error) {
      setMemberError('Failed to add member. You may not have permissions.');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedAccountId) return;
    try {
      await deleteDoc(doc(db, `accounts/${selectedAccountId}/members`, memberId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `accounts/members`);
    }
  }

  const handleAccountToggle = (id: string) => {
    const newId = id === selectedAccountId ? null : id;
    setSelectedAccountId(newId);
    
    // Auto-scroll to team management on mobile when an account is selected
    if (newId && window.innerWidth < 1024) {
      setTimeout(() => {
        const teamSection = document.getElementById('team-management-section');
        teamSection?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  if (loading) return <div className="animate-pulse">Loading accounts...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-3xl mb-2 text-slate-800">Accounts & Team</h2>
        <p className="text-slate-500">Manage multiple Instagram accounts and invite moderators or admins.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Accounts List */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col h-full">
          <h3 className="font-serif text-xl text-slate-800 mb-4">Your Agency Accounts</h3>
          
          <form onSubmit={handleCreateAccount} className="flex gap-2 mb-6">
            <input 
              type="text" 
              value={newAccountName}
              onChange={e => setNewAccountName(e.target.value)}
              placeholder="E.g., Wanderlust Travels"
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none bg-slate-50"
            />
            <button 
              type="submit" 
              disabled={isCreating || !newAccountName.trim()}
              className="bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-amber-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              New
            </button>
          </form>

          <div className="space-y-3 overflow-y-auto flex-1">
            {accounts.length === 0 ? (
              <div className="text-center p-6 text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
                No accounts created yet.
              </div>
            ) : (
              accounts.map(acc => (
                <div 
                  key={acc.id} 
                  onClick={() => handleAccountToggle(acc.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedAccountId === acc.id 
                      ? 'border-amber-500 bg-amber-50 shadow-sm' 
                      : 'border-slate-100 hover:border-amber-200 bg-white'
                  }`}
                >
                  <span className="font-medium text-slate-800">{acc.name}</span>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {acc.isMember ? <UserCheck className="w-4 h-4 text-emerald-500"/> : <Shield className="w-4 h-4" />}
                    {acc.isMember ? 'Member' : 'Owner'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Team Management (if selected) */}
        <div id="team-management-section" className="bg-[#1e293b] text-white p-6 rounded-3xl shadow-xl flex flex-col h-full min-h-[400px]">
          {!selectedAccountId ? (
            <div className="h-full flex flex-col items-center justify-center opacity-50 space-y-4">
              <UsersIcon className="w-12 h-12" />
              <p>Select an account to manage its team</p>
            </div>
          ) : (
            <>
              <h3 className="font-serif text-xl text-amber-400 mb-6 flex items-center gap-2">
                <UsersIcon className="w-5 h-5" />
                Manage Team
              </h3>
              
              {(!accounts.find(a => a.id === selectedAccountId)?.isMember) && (
                <form onSubmit={handleAddMember} className="mb-6 bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="email" 
                      required
                      value={newMemberEmail}
                      onChange={e => setNewMemberEmail(e.target.value)}
                      placeholder="User email"
                      className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500 placeholder-slate-500"
                    />
                    <select 
                      value={newMemberRole}
                      onChange={e => setNewMemberRole(e.target.value as any)}
                      className="bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="moderator">Moderator</option>
                      <option value="content creator">Content Creator</option>
                      <option value="analyst">Analyst</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button 
                      type="submit" 
                      disabled={isAddingMember || !newMemberEmail.trim()}
                      className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50"
                    >
                      {isAddingMember ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Invite'}
                    </button>
                  </div>
                  {memberError && <p className="text-red-400 text-xs mt-3">{memberError}</p>}
                  <p className="text-slate-400 text-xs mt-3">
                    * Roles: <strong>Admin</strong> (Full access), <strong>Moderator</strong> (Draft/Approve), <strong>Content Creator</strong> (Create Drafts), <strong>Analyst</strong> (View Only).
                  </p>
                </form>
              )}

              <div className="space-y-3 overflow-y-auto flex-1">
                {members.length === 0 ? (
                  <div className="text-center p-6 text-slate-500 border border-dashed border-slate-600 rounded-2xl">
                    No team members added yet.
                  </div>
                ) : (
                  members.map(member => (
                    <div key={member.id} className="p-3 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-slate-200">{member.email}</div>
                        <div className="text-xs text-amber-500 capitalize mt-0.5">{member.role}</div>
                      </div>
                      {!accounts.find(a => a.id === selectedAccountId)?.isMember && (
                        <button 
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
