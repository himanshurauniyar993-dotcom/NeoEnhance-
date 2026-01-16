
import React, { useState, useEffect, useMemo } from 'react';
import { GeminiService } from './services/geminiService';
import { ENHANCEMENT_STYLES, DEFAULT_SETTINGS } from './constants';
import { EnhancementStyle, User, WebSettings, ChatMessage, UserRole } from './types';
import { ComparisonSlider } from './components/ComparisonSlider';

const ADMIN_EMAIL = 'himanshurauniyar993@gmail.com';

const App: React.FC = () => {
  // --- Global State ---
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('neo_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [settings, setSettings] = useState<WebSettings>(() => {
    try {
      const saved = localStorage.getItem('neo_settings');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  });
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('neo_users');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // --- Logic State ---
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<EnhancementStyle>(ENHANCEMENT_STYLES[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'compare' | 'result'>('compare');
  const [activeTab, setActiveTab] = useState<'home' | 'app' | 'admin' | 'profile' | 'auth'>('home');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [profileSubTab, setProfileSubTab] = useState<'general' | 'security'>('general');
  const [selectedAdminUser, setSelectedAdminUser] = useState<User | null>(null);
  
  // --- Form & Input State ---
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [profileForm, setProfileForm] = useState({ name: '', password: '', confirmPassword: '' });
  const [chatInput, setChatInput] = useState('');

  // --- Persistence & Synchronization ---
  useEffect(() => localStorage.setItem('neo_settings', JSON.stringify(settings)), [settings]);
  useEffect(() => localStorage.setItem('neo_users', JSON.stringify(users)), [users]);
  
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('neo_current_user', JSON.stringify(currentUser));
      setProfileForm(prev => ({ ...prev, name: currentUser.name }));
    } else {
      localStorage.removeItem('neo_current_user');
    }
  }, [currentUser]);

  // --- Core Methods ---
  const updateUserInMatrix = (updated: User) => {
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    if (currentUser?.id === updated.id) setCurrentUser(updated);
    if (selectedAdminUser?.id === updated.id) setSelectedAdminUser(updated);
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const emailLower = authForm.email.toLowerCase().trim();
    const existing = users.find(u => u.email.toLowerCase() === emailLower);
    
    if (authMode === 'login') {
      if (existing) {
        if (existing.isSuspended) {
          setError("Account suspended. Access denied.");
          return;
        }
        if (existing.password && existing.password !== authForm.password) {
          setError("Invalid credentials.");
          return;
        }
        setCurrentUser({ ...existing, isAdmin: existing.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() });
        setActiveTab('app');
      } else {
        setError("User identity not found.");
      }
    } else {
      if (existing) {
        setError("Identity already registered. Please login.");
        setAuthMode('login');
      } else {
        const newUser: User = {
          id: 'u_' + Date.now(),
          name: authForm.name || 'Operator',
          email: emailLower,
          photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${emailLower}`,
          credits: 5,
          isAdmin: emailLower === ADMIN_EMAIL.toLowerCase(),
          role: 'free',
          isSuspended: false,
          password: authForm.password
        };
        setUsers(prev => [...prev, newUser]);
        setCurrentUser(newUser);
        setActiveTab('app');
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('home');
    setEnhancedImage(null);
    setOriginalImage(null);
  };

  const deductCredit = () => {
    if (!currentUser) return false;
    if (currentUser.role === 'vip' || currentUser.isAdmin) return true;
    if (currentUser.credits <= 0) {
      setError("Energy units depleted. Upgrade to VIP for infinite access.");
      return false;
    }
    const updated = { ...currentUser, credits: currentUser.credits - 1 };
    updateUserInMatrix(updated);
    return true;
  };

  const handleEnhance = async () => {
    if (!originalImage || !currentUser) return;
    if (!deductCredit()) return;

    setIsProcessing(true);
    setError(null);

    try {
      const gemini = GeminiService.getInstance();
      const result = await gemini.enhanceImage(originalImage, selectedStyle.prompt, chatInput);
      setEnhancedImage(result);
      setViewMode('result');
    } catch (err) {
      setError("Matrix stabilization failure.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    const updated = { ...currentUser, name: profileForm.name };
    if (profileForm.password && profileForm.password === profileForm.confirmPassword) {
      updated.password = profileForm.password;
    }
    updateUserInMatrix(updated);
    alert("Identity updated.");
  };

  // --- UI Sections ---
  const renderHome = () => (
    <div className="pt-24 md:pt-40 space-y-12 md:space-y-32 text-center px-6 max-w-7xl mx-auto animate-in fade-in duration-700">
      <div className="space-y-6 md:space-y-10">
        <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-tight">
          Visual <span className="gradient-text">{settings.siteName}</span>
        </h1>
        <p className="text-zinc-500 text-sm md:text-xl max-w-2xl mx-auto font-medium">
          The ultimate neural network for image reconstruction. Cinematic resolution at your fingertips.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button 
            onClick={() => currentUser ? setActiveTab('app') : setActiveTab('auth')}
            className="w-full sm:w-auto px-10 py-5 md:px-12 md:py-6 bg-white text-black rounded-2xl md:rounded-3xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-2xl"
          >
            {currentUser ? 'Enter Studio' : 'Start Free'}
          </button>
          {!currentUser && (
            <button 
              onClick={() => { setAuthMode('login'); setActiveTab('auth'); }}
              className="text-zinc-600 font-bold uppercase tracking-widest text-[10px] hover:text-white transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
      <div className="glass-panel p-1 rounded-[2rem] md:rounded-[4rem] border-white/5 shadow-2xl overflow-hidden max-w-5xl mx-auto">
        <ComparisonSlider 
          before="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1200&auto=format&fit=crop&blur=80"
          after="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1200&auto=format&fit=crop"
        />
      </div>
    </div>
  );

  const renderAdmin = () => (
    <div className="pt-24 pb-20 px-4 md:px-6 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-500">
      {/* User Detail Overlay */}
      {selectedAdminUser && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-4 overflow-y-auto">
          <div className="w-full max-w-2xl glass-panel p-8 md:p-12 rounded-[2.5rem] md:rounded-[4rem] relative shadow-2xl animate-in zoom-in-95">
            <button onClick={() => setSelectedAdminUser(null)} className="absolute top-8 right-8 text-white/20 hover:text-white">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="flex flex-col md:flex-row items-center gap-8 mb-10 text-center md:text-left">
              <img src={selectedAdminUser.photo} className="w-24 h-24 rounded-[2rem] border-4 border-white/10" alt="u" />
              <div>
                <h3 className="text-3xl font-black uppercase tracking-tighter">{selectedAdminUser.name}</h3>
                <p className="text-sm text-zinc-500 font-bold">{selectedAdminUser.email}</p>
                <span className="inline-block mt-3 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-500/30 text-blue-500">{selectedAdminUser.role}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-600">Add Energy Units</label>
                  <div className="flex gap-2">
                    <input id="amt_inject" type="number" className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-bold" placeholder="Amount" />
                    <button onClick={() => {
                      const val = parseInt((document.getElementById('amt_inject') as HTMLInputElement).value);
                      if (!isNaN(val)) updateUserInMatrix({ ...selectedAdminUser, credits: selectedAdminUser.credits + val });
                      (document.getElementById('amt_inject') as HTMLInputElement).value = '';
                    }} className="px-6 py-4 bg-white text-black rounded-xl text-[10px] font-black uppercase">Inject</button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-600">Assign Role</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['free', 'subscriber', 'vip'] as UserRole[]).map(r => (
                      <button key={r} onClick={() => updateUserInMatrix({ ...selectedAdminUser, role: r })} className={`py-3 rounded-xl text-[8px] font-black uppercase border transition-all ${selectedAdminUser.role === r ? 'bg-blue-600 border-blue-500' : 'bg-white/5 border-white/5 text-zinc-600'}`}>{r}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-6 flex flex-col justify-end">
                <button onClick={() => updateUserInMatrix({ ...selectedAdminUser, isSuspended: !selectedAdminUser.isSuspended })} className={`w-full py-4 rounded-xl text-[10px] font-black uppercase border ${selectedAdminUser.isSuspended ? 'bg-green-600/10 text-green-500 border-green-600/20' : 'bg-red-600/10 text-red-500 border-red-600/20'}`}>
                  {selectedAdminUser.isSuspended ? 'Reinstate' : 'Suspend'}
                </button>
                <button onClick={() => { if(confirm("Purge account?")) setUsers(users.filter(u => u.id !== selectedAdminUser.id)); setSelectedAdminUser(null); }} className="w-full py-4 bg-zinc-900 border border-white/10 rounded-xl text-[10px] font-black uppercase text-red-500">Purge Data</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-white/10 pb-10">
        <h2 className="text-4xl md:text-7xl font-black uppercase tracking-tighter">Command <span className="text-blue-500">Center</span></h2>
        <button onClick={() => setActiveTab('app')} className="px-8 py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Exit Terminal</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="glass-panel p-8 md:p-12 rounded-[2.5rem] md:rounded-[4rem] space-y-10">
          <h3 className="text-[12px] font-black uppercase tracking-widest text-zinc-600">Platform Settings</h3>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-500">Site Name</label>
              <input value={settings.siteName} onChange={e => setSettings({...settings, siteName: e.target.value})} className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl text-sm font-bold focus:border-blue-500 outline-none transition-all" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input type="color" value={settings.themePrimary} onChange={e => setSettings({...settings, themePrimary: e.target.value})} className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl cursor-pointer" />
              <input type="color" value={settings.themeSecondary} onChange={e => setSettings({...settings, themeSecondary: e.target.value})} className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl cursor-pointer" />
            </div>
          </div>
        </div>

        <div className="glass-panel p-8 md:p-12 rounded-[2.5rem] md:rounded-[4rem] space-y-10">
          <div className="flex justify-between items-center">
            <h3 className="text-[12px] font-black uppercase tracking-widest text-zinc-600">Identity Matrix</h3>
            <span className="text-[10px] font-black bg-blue-600 px-3 py-1 rounded-full">{users.length} Units</span>
          </div>
          <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
            {users.map(u => (
              <button key={u.id} onClick={() => setSelectedAdminUser(u)} className={`w-full p-4 rounded-2xl border flex items-center justify-between group transition-all ${u.isSuspended ? 'opacity-30' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                <div className="flex items-center gap-4 text-left">
                  <img src={u.photo} className="w-10 h-10 rounded-lg border border-white/5" alt="r" />
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest">{u.name}</p>
                    <p className="text-[9px] text-zinc-600 font-bold truncate max-w-[120px]">{u.email}</p>
                  </div>
                </div>
                <p className="text-lg font-black">{u.role === 'vip' ? '∞' : u.credits}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="pt-32 pb-20 px-4 md:px-6 max-w-5xl mx-auto space-y-10 md:space-y-16 animate-in slide-in-from-bottom-10 duration-700">
      <div className="flex flex-col md:flex-row items-center gap-10 border-b border-white/10 pb-12">
        <img src={currentUser?.photo} className="w-32 h-32 md:w-40 md:h-40 rounded-[3rem] border-8 border-white/5 shadow-2xl" alt="p" />
        <div className="flex-1 space-y-4 text-center md:text-left">
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter truncate">{currentUser?.name}</h2>
          <div className="flex flex-wrap justify-center md:justify-start gap-3">
            <span className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10 ${currentUser?.role === 'vip' ? 'text-amber-500' : 'text-zinc-500'}`}>{currentUser?.role} Member</span>
            {currentUser?.isAdmin && <span className="px-5 py-2 bg-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest">Admin Access</span>}
          </div>
        </div>
        <button onClick={handleLogout} className="px-10 py-4 bg-red-600/10 text-red-500 border border-red-600/20 rounded-2xl text-[10px] font-black uppercase tracking-widest">Sign Out</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="glass-panel p-10 rounded-[2.5rem] md:rounded-[3rem] text-center space-y-4">
          <p className="text-[12px] font-black uppercase text-zinc-600">Energy Units</p>
          <p className="text-7xl font-black gradient-text">{currentUser?.role === 'vip' ? '∞' : currentUser?.credits}</p>
        </div>
        <div className="lg:col-span-2 glass-panel p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] space-y-10">
          <div className="flex gap-10 border-b border-white/5 pb-6 overflow-x-auto">
            {(['general', 'security'] as const).map(tab => (
              <button key={tab} onClick={() => setProfileSubTab(tab)} className={`text-[11px] font-black uppercase tracking-widest transition-all pb-4 border-b-2 ${profileSubTab === tab ? 'border-white text-white' : 'border-transparent text-white/20'}`}>{tab}</button>
            ))}
          </div>
          <form onSubmit={handleUpdateProfile} className="space-y-8">
            {profileSubTab === 'general' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase">Display Name</label>
                  <input value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-sm font-bold outline-none focus:border-white transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase">Network ID</label>
                  <input className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-sm font-bold opacity-30 cursor-not-allowed" value={currentUser?.email} disabled />
                </div>
              </div>
            ) : (
              <div className="space-y-6 max-w-md">
                <input type="password" placeholder="New Secret Key" value={profileForm.password} onChange={e => setProfileForm({...profileForm, password: e.target.value})} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-sm font-bold" />
                <input type="password" placeholder="Confirm Secret Key" value={profileForm.confirmPassword} onChange={e => setProfileForm({...profileForm, confirmPassword: e.target.value})} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-sm font-bold" />
              </div>
            )}
            <button type="submit" className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl">Update Protocol</button>
            {currentUser?.isAdmin && profileSubTab === 'general' && (
              <button type="button" onClick={() => setActiveTab('admin')} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl flex items-center justify-center gap-3">Manage Infrastructure</button>
            )}
          </form>
        </div>
      </div>
    </div>
  );

  const renderAuth = () => (
    <div className="pt-32 md:pt-48 pb-20 px-4 max-w-xl mx-auto space-y-10 animate-in fade-in duration-700">
      <div className="text-center space-y-4">
        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
          {authMode === 'login' ? 'Establish' : 'Initialize'} <span className="gradient-text">Identity</span>
        </h2>
        <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.5em]">Neural Authentication System</p>
      </div>
      <div className="glass-panel p-8 md:p-12 rounded-[2.5rem] md:rounded-[4rem] border-white/10 shadow-2xl space-y-10">
        <form onSubmit={handleAuthSubmit} className="space-y-6">
          {authMode === 'signup' && (
            <input required value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl text-sm font-bold outline-none focus:border-white transition-all" placeholder="Network Name" />
          )}
          <input required type="email" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl text-sm font-bold outline-none focus:border-white transition-all" placeholder="Identity Email" />
          <input required type="password" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl text-sm font-bold outline-none focus:border-white transition-all" placeholder="Access Key" />
          <button type="submit" className="w-full py-6 bg-white text-black rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-2xl transition-all active:scale-95">
            {authMode === 'login' ? 'Authorize Access' : 'Register Identity'}
          </button>
        </form>
        <div className="text-center pt-8 border-t border-white/5">
          <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-white transition-colors">
            {authMode === 'login' ? 'Create New Identity' : 'Log into Existing'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderApp = () => (
    <div className="pt-24 md:pt-32 pb-20 px-4 md:px-6 max-w-7xl mx-auto flex flex-col md:flex-row gap-10 md:gap-16">
      <aside className="w-full md:w-1/3 space-y-10 animate-in slide-in-from-left-10 duration-1000">
        <div className="glass-panel p-8 md:p-10 rounded-[2.5rem] md:rounded-[4rem] space-y-6">
          <h3 className="text-[10px] md:text-[12px] font-black uppercase tracking-widest text-zinc-600">1. Data Ingress</h3>
          <label className="block w-full h-56 md:h-80 rounded-[2rem] md:rounded-[3rem] border-4 border-dashed border-white/5 hover:border-white/20 bg-white/5 transition-all cursor-pointer relative overflow-hidden group">
            {originalImage ? (
              <img src={originalImage} className="w-full h-full object-cover opacity-60" alt="i" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-zinc-800">
                <svg className="w-12 h-12 md:w-16 md:h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span className="text-[11px] font-black uppercase tracking-widest">Select Frame</span>
              </div>
            )}
            <input type="file" className="hidden" accept="image/*" onChange={e => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = ev => setOriginalImage(ev.target?.result as string);
                reader.readAsDataURL(file);
              }
            }} />
          </label>
        </div>
        <div className="space-y-4">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-600 px-2">2. Visual Style</h3>
          <div className="space-y-3">
            {ENHANCEMENT_STYLES.map(s => (
              <button key={s.id} onClick={() => setSelectedStyle(s)} className={`w-full p-5 md:p-6 rounded-2xl md:rounded-[2rem] border flex items-center gap-5 transition-all ${selectedStyle.id === s.id ? 'bg-white text-black border-white shadow-2xl scale-[1.02]' : 'bg-white/5 border-white/5 text-white hover:bg-white/10'}`}>
                <span className="text-2xl md:text-3xl">{s.icon}</span>
                <div className="text-left overflow-hidden">
                  <p className="text-[11px] font-black uppercase tracking-widest">{s.name}</p>
                  <p className={`text-[9px] font-bold truncate opacity-40 ${selectedStyle.id === s.id ? 'text-black' : 'text-white'}`}>{s.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-600 px-2">3. Variable Context</h3>
          <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Refine reconstruction..." className="w-full bg-white/5 border border-white/10 p-5 md:p-6 rounded-2xl md:rounded-[2rem] text-sm font-bold outline-none focus:border-white transition-all shadow-xl" />
        </div>
        <button disabled={!originalImage || isProcessing} onClick={handleEnhance} className="w-full py-6 md:py-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-[2rem] md:rounded-[3rem] font-black uppercase tracking-[0.4em] text-[10px] hover:scale-[1.03] transition-all shadow-2xl disabled:opacity-20">
          {isProcessing ? 'Synthesizing...' : 'Execute Reconstruction'}
        </button>
      </aside>

      <main className="flex-1 space-y-8 md:space-y-12 animate-in slide-in-from-right-10 duration-1000">
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/5 p-3 rounded-[2rem] border border-white/5">
          <div className="flex bg-black/40 rounded-2xl p-1 w-full sm:w-auto">
            <button onClick={() => setViewMode('compare')} className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest ${viewMode === 'compare' ? 'bg-white text-black' : 'text-zinc-600'}`}>Scan View</button>
            <button onClick={() => setViewMode('result')} className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest ${viewMode === 'result' ? 'bg-white text-black' : 'text-zinc-600'}`}>Final View</button>
          </div>
          {enhancedImage && (
            <a href={enhancedImage} download="reconstructed.png" className="w-full sm:w-auto text-center px-8 py-3 bg-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl">Archive</a>
          )}
        </header>
        <div className="glass-panel p-1 rounded-[2.5rem] md:rounded-[5rem] aspect-square md:aspect-video flex items-center justify-center bg-black/40 overflow-hidden relative border-white/5 shadow-inner">
          {enhancedImage ? (
            viewMode === 'compare' ? <ComparisonSlider before={originalImage!} after={enhancedImage} /> : <img src={enhancedImage} className="w-full h-full object-cover rounded-[2.3rem] md:rounded-[4.8rem]" alt="e" />
          ) : isProcessing ? (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 border-t-4 border-blue-500 rounded-full animate-spin mx-auto" />
              <p className="text-[11px] font-black uppercase tracking-[0.5em] animate-pulse">Processing Neural Matrix</p>
            </div>
          ) : originalImage ? (
            <img src={originalImage} className="w-full h-full object-cover rounded-[2.3rem] md:rounded-[4.8rem] opacity-30 blur-2xl" alt="p" />
          ) : (
            <div className="text-center opacity-10 space-y-6">
              <svg className="w-20 h-20 md:w-32 md:h-32 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              <p className="text-xl md:text-3xl font-black uppercase tracking-[1em]">Standby</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-blue-500/40 overflow-x-hidden">
      <style>{`
        .gradient-text { background: linear-gradient(90deg, ${settings.themePrimary}, ${settings.themeSecondary}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
      `}</style>

      <nav className="fixed top-0 w-full z-[100] p-4 md:p-8 pointer-events-none">
        <div className="max-w-7xl mx-auto glass-panel border-white/10 px-6 md:px-10 py-3 md:py-4 rounded-[1.8rem] md:rounded-[3rem] flex items-center justify-between backdrop-blur-3xl shadow-2xl pointer-events-auto">
          <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setActiveTab('home')}>
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center font-black text-xl md:text-2xl" style={{ background: `linear-gradient(135deg, ${settings.themePrimary}, ${settings.themeSecondary})` }}>
              {settings.logoUrl ? <img src={settings.logoUrl} className="w-full h-full object-cover" alt="logo" /> : settings.logoText}
            </div>
            <span className="text-xl md:text-2xl font-black tracking-tighter uppercase hidden sm:inline truncate max-w-[150px]">{settings.siteName}</span>
          </div>
          <div className="flex items-center gap-5 md:gap-10">
            {currentUser ? (
              <>
                <button onClick={() => setActiveTab('app')} className="text-[10px] md:text-[11px] font-black uppercase text-zinc-500 hover:text-white transition-all tracking-widest">Studio</button>
                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 md:px-5 md:py-2.5 rounded-full border border-white/5 cursor-pointer group" onClick={() => setActiveTab('profile')}>
                  <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ${currentUser.role === 'vip' ? 'text-amber-500' : 'text-zinc-600'}`}>{currentUser.role === 'vip' ? 'Infinite' : `${currentUser.credits} U`}</span>
                  <img src={currentUser.photo} className="w-7 h-7 md:w-8 md:h-8 rounded-lg shadow-xl" alt="a" />
                </div>
              </>
            ) : (
              <button onClick={() => { setAuthMode('signup'); setActiveTab('auth'); }} className="px-6 py-3 bg-white text-black rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest">Connect</button>
            )}
          </div>
        </div>
      </nav>

      <main className="min-h-screen">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'app' && renderApp()}
        {activeTab === 'admin' && currentUser?.isAdmin && renderAdmin()}
        {activeTab === 'profile' && renderProfile()}
        {activeTab === 'auth' && renderAuth()}
      </main>

      {error && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 px-10 py-5 bg-red-600 rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-2xl z-[1000] text-center w-[90%] md:w-auto">
          {error}
        </div>
      )}
    </div>
  );
};

export default App;
