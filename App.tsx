
import React, { useState, useEffect, useMemo } from 'react';
import { GeminiService } from './services/geminiService';
import { ENHANCEMENT_STYLES, DEFAULT_SETTINGS } from './constants';
import { EnhancementStyle, User, WebSettings, ChatMessage, UserRole } from './types';
import { ComparisonSlider } from './components/ComparisonSlider';

const ADMIN_EMAIL = 'himanshurauniyar993@gmail.com';

const App: React.FC = () => {
  // --- Global State ---
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('neo_users');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

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
  useEffect(() => {
    localStorage.setItem('neo_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('neo_users', JSON.stringify(users));
  }, [users]);
  
  // CRITICAL: Robust identity persistence
  // Ensures that when the component mounts or users array changes, 
  // the currentUser is correctly reconciled with the latest database entry.
  useEffect(() => {
    if (currentUser) {
      const latestUserRecord = users.find(u => u.email.toLowerCase() === currentUser.email.toLowerCase());
      if (latestUserRecord) {
        // Only update if data is actually different to avoid render loops
        if (JSON.stringify(latestUserRecord) !== JSON.stringify(currentUser)) {
          setCurrentUser(latestUserRecord);
        }
      }
      localStorage.setItem('neo_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('neo_current_user');
    }
  }, [currentUser, users]);

  // --- Core Methods ---
  const updateUserInMatrix = (updated: User) => {
    setUsers(prev => {
      const exists = prev.find(u => u.id === updated.id);
      if (exists) {
        return prev.map(u => u.id === updated.id ? updated : u);
      }
      return [...prev, updated];
    });
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const emailLower = authForm.email.toLowerCase().trim();
    const existingUser = users.find(u => u.email.toLowerCase() === emailLower);
    
    if (authMode === 'login') {
      if (existingUser) {
        if (existingUser.isSuspended) {
          setError("Access Denied: Account Suspended.");
          return;
        }
        if (existingUser.password && existingUser.password !== authForm.password) {
          setError("Invalid Key: Access Denied.");
          return;
        }
        // Force sync with matrix
        setCurrentUser({ ...existingUser, isAdmin: existingUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() });
        setActiveTab('app');
      } else {
        setError("Identity not found. Please initialize a new account.");
      }
    } else {
      if (existingUser) {
        setError("Identity already exists. Switching to Authorization...");
        setTimeout(() => setAuthMode('login'), 1000);
      } else {
        const newUser: User = {
          id: 'u_' + Date.now(),
          name: authForm.name || 'New Operator',
          email: emailLower,
          photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${emailLower}`,
          credits: 5,
          isAdmin: emailLower === ADMIN_EMAIL.toLowerCase(),
          role: 'free',
          isSuspended: false,
          password: authForm.password
        };
        updateUserInMatrix(newUser);
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
      setError("Energy units depleted. Upgrade to VIP for unlimited access.");
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
      setError("Neural matrix failure. Please check your network or API key.");
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
    alert("Identity Profile Synced Successfully.");
  };

  // --- UI Rendition ---
  const renderHome = () => (
    <div className="pt-24 md:pt-48 space-y-16 md:space-y-40 text-center px-6 max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-1000">
      <div className="space-y-8 md:space-y-12">
        <h1 className="text-6xl md:text-9xl font-black tracking-tighter leading-tight filter drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
          Visual <span className="gradient-text">{settings.siteName}</span>
        </h1>
        <p className="text-zinc-500 text-lg md:text-2xl max-w-3xl mx-auto font-light leading-relaxed">
          The ultimate 8K neural reconstruction network. <br className="hidden md:block"/>
          Transform artifacts into masterpieces with cinematic lighting.
        </p>
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <button 
            onClick={() => currentUser ? setActiveTab('app') : setActiveTab('auth')}
            className="w-full sm:w-auto px-12 py-6 bg-white text-black rounded-3xl font-black uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-[0_20px_60px_-15px_rgba(255,255,255,0.3)] active:scale-95"
          >
            {currentUser ? 'Open Studio' : 'Establish Identity'}
          </button>
          {!currentUser && (
            <button 
              onClick={() => { setAuthMode('login'); setActiveTab('auth'); }}
              className="px-10 py-5 text-zinc-600 font-bold uppercase tracking-widest text-xs hover:text-white hover:bg-white/5 rounded-3xl transition-all"
            >
              Authorization Code
            </button>
          )}
        </div>
      </div>
      <div className="glass-panel p-2 rounded-[3rem] md:rounded-[6rem] border-white/5 shadow-2xl overflow-hidden max-w-5xl mx-auto group">
        <ComparisonSlider 
          before="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1200&auto=format&fit=crop&blur=80"
          after="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1200&auto=format&fit=crop"
        />
      </div>
    </div>
  );

  const renderAdmin = () => (
    <div className="pt-24 pb-20 px-6 max-w-7xl mx-auto space-y-16 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-8 border-b border-white/10 pb-16">
        <div className="space-y-2">
          <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter">Command <span className="text-blue-500">Matrix</span></h2>
          <p className="text-zinc-600 font-black uppercase tracking-[0.8em] text-[10px]">Global Administrator Node</p>
        </div>
        <button onClick={() => setActiveTab('app')} className="px-10 py-5 bg-white text-black rounded-3xl text-xs font-black uppercase tracking-widest shadow-xl">Exit Terminal</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="glass-panel p-10 md:p-16 rounded-[4rem] space-y-12">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-600">Infrastructure Core</h3>
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-zinc-500">Platform Identity</label>
              <input value={settings.siteName} onChange={e => setSettings({...settings, siteName: e.target.value})} className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-lg font-bold outline-none focus:border-blue-500 transition-all" />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-zinc-500">Primary Hue</label>
                <input type="color" value={settings.themePrimary} onChange={e => setSettings({...settings, themePrimary: e.target.value})} className="w-full h-20 bg-white/5 border border-white/10 rounded-3xl cursor-pointer" />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-zinc-500">Secondary Hue</label>
                <input type="color" value={settings.themeSecondary} onChange={e => setSettings({...settings, themeSecondary: e.target.value})} className="w-full h-20 bg-white/5 border border-white/10 rounded-3xl cursor-pointer" />
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel p-10 md:p-16 rounded-[4rem] space-y-12">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-600">Identity Index</h3>
            <span className="text-[10px] font-black bg-blue-600 px-4 py-1.5 rounded-full uppercase tracking-widest">{users.length} Active</span>
          </div>
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
            {users.map(u => (
              <div key={u.id} className="w-full p-6 rounded-3xl border border-white/5 bg-white/5 flex items-center justify-between group hover:bg-white/10 transition-all">
                <div className="flex items-center gap-5">
                  <img src={u.photo} className="w-12 h-12 rounded-2xl border border-white/10" alt="r" />
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest">{u.name}</p>
                    <p className="text-[10px] text-zinc-600 font-bold truncate max-w-[150px]">{u.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black">{u.role === 'vip' ? '∞' : u.credits}</p>
                  <p className="text-[8px] uppercase font-black text-zinc-700">Units</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="pt-32 pb-20 px-6 max-w-5xl mx-auto space-y-16 animate-in slide-in-from-bottom-10 duration-700">
      <div className="flex flex-col md:flex-row items-center gap-12 border-b border-white/10 pb-20">
        <div className="relative group">
          <img src={currentUser?.photo} className="w-48 h-48 rounded-[4rem] border-[12px] border-white/5 shadow-2xl group-hover:scale-105 transition-all duration-500" alt="p" />
          <div className="absolute inset-0 rounded-[4rem] bg-gradient-to-tr from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="flex-1 space-y-6 text-center md:text-left">
          <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter truncate">{currentUser?.name}</h2>
          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
            <span className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 shadow-xl ${currentUser?.role === 'vip' ? 'text-amber-500 bg-amber-500/10' : 'text-zinc-500'}`}>
              {currentUser?.role} Member
            </span>
            {currentUser?.isAdmin && <span className="px-6 py-2.5 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20">System Admin</span>}
          </div>
        </div>
        <button onClick={handleLogout} className="px-12 py-5 bg-red-600/10 text-red-500 border border-red-600/20 rounded-3xl text-xs font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">Disconnect</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="glass-panel p-16 rounded-[4rem] text-center space-y-6 border-white/10 shadow-2xl">
          <p className="text-xs font-black uppercase text-zinc-600 tracking-widest">Energy Matrix</p>
          <p className="text-8xl font-black gradient-text leading-none">{currentUser?.role === 'vip' ? '∞' : currentUser?.credits}</p>
          <p className="text-[10px] uppercase font-black text-zinc-800">Available Reconstruction Units</p>
        </div>
        <div className="lg:col-span-2 glass-panel p-12 md:p-16 rounded-[4rem] space-y-12 shadow-2xl">
          <form onSubmit={handleUpdateProfile} className="space-y-10">
            <div className="space-y-4">
              <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Update Signature (Name)</label>
              <input value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full bg-white/5 border border-white/10 p-7 rounded-[2rem] text-xl font-bold outline-none focus:border-white transition-all" />
            </div>
            <button type="submit" className="w-full py-7 bg-white text-black rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all">Establish Sync</button>
            {currentUser?.isAdmin && (
                <button type="button" onClick={() => setActiveTab('admin')} className="w-full py-7 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl flex items-center justify-center gap-4 group">
                  <svg className="w-5 h-5 group-hover:rotate-180 transition-all duration-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>
                  Admin Terminal
                </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );

  const renderAuth = () => (
    <div className="pt-32 md:pt-48 pb-20 px-6 max-w-xl mx-auto space-y-12 animate-in fade-in duration-700">
      <div className="text-center space-y-6">
        <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter">
          {authMode === 'login' ? 'Establish' : 'Initialize'} <span className="gradient-text">Identity</span>
        </h2>
        <p className="text-zinc-600 text-xs font-black uppercase tracking-[1em]">Neural Authentication Node</p>
      </div>
      <div className="glass-panel p-10 md:p-16 rounded-[4rem] border-white/10 shadow-2xl space-y-12">
        <form onSubmit={handleAuthSubmit} className="space-y-6">
          {authMode === 'signup' && (
            <input required value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-sm font-bold outline-none focus:border-white transition-all" placeholder="Network Signature (Name)" />
          )}
          <input required type="email" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-sm font-bold outline-none focus:border-white transition-all" placeholder="Identity Address (Email)" />
          <input required type="password" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-sm font-bold outline-none focus:border-white transition-all" placeholder="Access Key" />
          <button type="submit" className="w-full py-7 bg-white text-black rounded-3xl font-black uppercase text-xs tracking-[0.5em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all">
            {authMode === 'login' ? 'Authorize' : 'Initialize'}
          </button>
        </form>
        <div className="text-center pt-8 border-t border-white/5">
          <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-xs font-black uppercase tracking-widest text-blue-500 hover:text-white transition-colors">
            {authMode === 'login' ? 'Establish New Identity' : 'Authorized Personnel Login'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderApp = () => (
    <div className="pt-24 md:pt-36 pb-20 px-6 max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 md:gap-24">
      <aside className="w-full lg:w-[400px] space-y-12 animate-in slide-in-from-left-10 duration-1000">
        <div className="glass-panel p-10 rounded-[4rem] space-y-8 shadow-2xl border-white/10">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-600">1. Data Ingress</h3>
          <label className="block w-full h-64 md:h-96 rounded-[3rem] border-4 border-dashed border-white/5 hover:border-white/20 bg-white/5 transition-all cursor-pointer relative overflow-hidden group">
            {originalImage ? (
              <img src={originalImage} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" alt="i" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 text-zinc-800">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
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
        
        <div className="space-y-6">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-600 px-4">2. Visual Matrix</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            {ENHANCEMENT_STYLES.map(s => (
              <button 
                key={s.id} 
                onClick={() => setSelectedStyle(s)} 
                className={`w-full p-8 rounded-[2.5rem] border flex items-center gap-6 transition-all ${selectedStyle.id === s.id ? 'bg-white text-black border-white shadow-2xl scale-[1.05]' : 'bg-white/5 border-white/5 text-white hover:bg-white/10'}`}
              >
                <span className="text-4xl">{s.icon}</span>
                <div className="text-left overflow-hidden">
                  <p className="text-xs font-black uppercase tracking-widest">{s.name}</p>
                  <p className={`text-[10px] font-bold truncate opacity-40 ${selectedStyle.id === s.id ? 'text-black' : 'text-white'}`}>{s.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <button 
          disabled={!originalImage || isProcessing} 
          onClick={handleEnhance} 
          className="w-full py-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-[3rem] font-black uppercase tracking-[0.6em] text-xs hover:scale-[1.03] active:scale-95 transition-all shadow-[0_25px_60px_-15px_rgba(59,130,246,0.5)] disabled:opacity-20"
        >
          {isProcessing ? 'Synthesizing Matrix...' : 'Execute Reconstruction'}
        </button>
      </aside>

      <main className="flex-1 space-y-12 animate-in slide-in-from-right-10 duration-1000">
        <header className="flex flex-col sm:flex-row justify-between items-center gap-6 bg-white/5 p-4 rounded-[3rem] border border-white/5 shadow-2xl backdrop-blur-xl">
          <div className="flex bg-black/40 rounded-[2rem] p-1.5 w-full sm:w-auto">
            <button onClick={() => setViewMode('compare')} className={`flex-1 sm:flex-none px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'compare' ? 'bg-white text-black shadow-xl' : 'text-zinc-600 hover:text-white'}`}>Scan View</button>
            <button onClick={() => setViewMode('result')} className={`flex-1 sm:flex-none px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'result' ? 'bg-white text-black shadow-xl' : 'text-zinc-600 hover:text-white'}`}>8K Masterpiece</button>
          </div>
          {enhancedImage && (
            <a href={enhancedImage} download="neo-reconstructed.png" className="w-full sm:w-auto text-center px-10 py-4 bg-blue-600 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all">Archive Data</a>
          )}
        </header>

        <div className="glass-panel p-2 rounded-[3.5rem] md:rounded-[6rem] aspect-square md:aspect-video flex items-center justify-center bg-black/40 overflow-hidden relative border-white/5 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]">
          {enhancedImage ? (
            viewMode === 'compare' ? (
              <ComparisonSlider before={originalImage!} after={enhancedImage} />
            ) : (
              <div className="w-full h-full relative group">
                <img src={enhancedImage} className="w-full h-full object-cover rounded-[3.2rem] md:rounded-[5.8rem]" alt="e" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-12">
                   <p className="text-white text-xs font-black uppercase tracking-[1em]">{selectedStyle.name} Reconstruction Established</p>
                </div>
              </div>
            )
          ) : isProcessing ? (
            <div className="text-center space-y-10">
              <div className="w-24 h-24 border-[6px] border-t-blue-500 border-white/5 rounded-full animate-spin mx-auto shadow-[0_0_50px_rgba(59,130,246,0.3)]" />
              <div className="space-y-4">
                <p className="text-xs font-black uppercase tracking-[1em] animate-pulse text-blue-500">Processing Neural Paths</p>
                <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest">Stabilizing resolution matrix...</p>
              </div>
            </div>
          ) : originalImage ? (
            <div className="w-full h-full relative">
              <img src={originalImage} className="w-full h-full object-cover rounded-[3.2rem] md:rounded-[5.8rem] opacity-30 blur-3xl scale-110" alt="p" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                <div className="w-20 h-20 border-4 border-white/10 rounded-full flex items-center justify-center animate-pulse">
                  <svg className="w-10 h-10 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <p className="text-xs font-black uppercase tracking-[1em] text-white/20">Awaiting Enhancement</p>
              </div>
            </div>
          ) : (
            <div className="text-center opacity-5 space-y-10 group">
              <svg className="w-32 h-32 md:w-48 md:h-48 mx-auto group-hover:scale-110 transition-transform duration-1000" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              <p className="text-3xl md:text-5xl font-black uppercase tracking-[2em] leading-none">Standby</p>
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

      <nav className="fixed top-0 w-full z-[100] p-6 md:p-10 pointer-events-none">
        <div className="max-w-7xl mx-auto glass-panel border-white/10 px-8 md:px-12 py-4 md:py-6 rounded-[2.5rem] md:rounded-[4rem] flex items-center justify-between backdrop-blur-[50px] shadow-2xl pointer-events-auto">
          <div className="flex items-center gap-6 cursor-pointer group" onClick={() => setActiveTab('home')}>
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center font-black text-2xl md:text-3xl shadow-2xl group-hover:scale-110 transition-transform duration-500" style={{ background: `linear-gradient(135deg, ${settings.themePrimary}, ${settings.themeSecondary})` }}>
              {settings.logoUrl ? <img src={settings.logoUrl} className="w-full h-full object-cover" alt="logo" /> : settings.logoText}
            </div>
            <span className="text-2xl md:text-4xl font-black tracking-tighter uppercase hidden sm:inline truncate max-w-[200px]">{settings.siteName}</span>
          </div>
          <div className="flex items-center gap-6 md:gap-12">
            {currentUser ? (
              <>
                <button onClick={() => setActiveTab('app')} className="text-[11px] font-black uppercase text-zinc-500 hover:text-white transition-all tracking-[0.4em] hidden md:block">Studio</button>
                <div className="flex items-center gap-4 bg-white/5 px-6 py-3 rounded-full border border-white/5 cursor-pointer group hover:bg-white/10 transition-all shadow-xl" onClick={() => setActiveTab('profile')}>
                  <div className="text-right hidden sm:block">
                    <p className={`text-[9px] font-black uppercase tracking-widest ${currentUser.role === 'vip' ? 'text-amber-500' : 'text-zinc-600'}`}>{currentUser.role === 'vip' ? 'Infinite' : `${currentUser.credits} Units`}</p>
                    <p className="text-[8px] font-bold text-zinc-800 uppercase leading-none">Energy Matrix</p>
                  </div>
                  <img src={currentUser.photo} className="w-9 h-9 md:w-11 md:h-11 rounded-2xl border-2 border-white/10 shadow-xl group-hover:border-white/30 transition-all" alt="a" />
                </div>
              </>
            ) : (
              <button onClick={() => { setAuthMode('signup'); setActiveTab('auth'); }} className="px-10 py-4 bg-white text-black rounded-3xl text-xs font-black uppercase tracking-[0.3em] hover:scale-105 active:scale-95 transition-all shadow-2xl">Initialize</button>
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
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 px-12 py-6 bg-red-600 rounded-[3rem] text-[11px] font-black uppercase tracking-[0.4em] shadow-[0_30px_90px_rgba(220,38,38,0.5)] z-[1000] text-center w-[90%] md:w-auto animate-in slide-in-from-bottom-5">
          {error}
        </div>
      )}
    </div>
  );
};

export default App;
