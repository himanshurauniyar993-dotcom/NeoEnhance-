
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
  useEffect(() => {
    localStorage.setItem('neo_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('neo_users', JSON.stringify(users));
  }, [users]);
  
  // High-reliability sync: Ensures currentUser always reflects the latest state in users array
  useEffect(() => {
    if (currentUser) {
      const latestUser = users.find(u => u.id === currentUser.id);
      if (latestUser && JSON.stringify(latestUser) !== JSON.stringify(currentUser)) {
        setCurrentUser(latestUser);
      }
      localStorage.setItem('neo_current_user', JSON.stringify(currentUser));
      setProfileForm(prev => ({ ...prev, name: currentUser.name }));
    } else {
      localStorage.removeItem('neo_current_user');
    }
  }, [currentUser, users]);

  // --- Core Methods ---
  const updateUserInMatrix = (updated: User) => {
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    if (currentUser?.id === updated.id) {
        setCurrentUser(updated);
    }
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const emailLower = authForm.email.toLowerCase().trim();
    // Re-scanning user matrix for existing identity
    const existing = users.find(u => u.email.toLowerCase() === emailLower);
    
    if (authMode === 'login') {
      if (existing) {
        if (existing.isSuspended) {
          setError("Identity suspended. Access denied.");
          return;
        }
        if (existing.password && existing.password !== authForm.password) {
          setError("Invalid access key provided.");
          return;
        }
        // Force sync existing data to state
        setCurrentUser({ ...existing, isAdmin: existing.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() });
        setActiveTab('app');
      } else {
        setError("Identity not found in matrix.");
      }
    } else {
      if (existing) {
        setError("Identity already established. Switching to Authorization.");
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
      setError("Energy units depleted. Upgrade to VIP.");
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
    alert("Profile Updated");
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
              Log In
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
      {selectedAdminUser && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-4 overflow-y-auto">
          <div className="w-full max-w-2xl glass-panel p-8 md:p-12 rounded-[2.5rem] md:rounded-[4rem] relative shadow-2xl">
            <button onClick={() => setSelectedAdminUser(null)} className="absolute top-8 right-8 text-white/20 hover:text-white">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="flex flex-col md:flex-row items-center gap-8 mb-10">
              <img src={selectedAdminUser.photo} className="w-24 h-24 rounded-[2rem] border-4 border-white/10" alt="u" />
              <div className="text-center md:text-left">
                <h3 className="text-3xl font-black uppercase tracking-tighter">{selectedAdminUser.name}</h3>
                <p className="text-sm text-zinc-500 font-bold">{selectedAdminUser.email}</p>
                <span className="inline-block mt-3 px-4 py-1 rounded-full text-[9px] font-black uppercase bg-blue-500/10 text-blue-500">{selectedAdminUser.role}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-zinc-600">Credits</label>
                <div className="flex gap-2">
                  <input id="amt_inject" type="number" className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-bold" />
                  <button onClick={() => {
                    const val = parseInt((document.getElementById('amt_inject') as HTMLInputElement).value);
                    if (!isNaN(val)) updateUserInMatrix({ ...selectedAdminUser, credits: selectedAdminUser.credits + val });
                  }} className="px-6 bg-white text-black rounded-xl text-[10px] font-black uppercase">Add</button>
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-zinc-600">Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['free', 'subscriber', 'vip'] as UserRole[]).map(r => (
                    <button key={r} onClick={() => updateUserInMatrix({ ...selectedAdminUser, role: r })} className={`py-3 rounded-xl text-[8px] font-black uppercase border ${selectedAdminUser.role === r ? 'bg-blue-600 border-blue-500' : 'bg-white/5 border-white/5'}`}>{r}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center border-b border-white/10 pb-10">
        <h2 className="text-5xl font-black uppercase tracking-tighter">Admin <span className="text-blue-500">Matrix</span></h2>
        <button onClick={() => setActiveTab('app')} className="px-8 py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest">Back</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="glass-panel p-8 rounded-[3rem] space-y-6">
          <h3 className="text-[12px] font-black uppercase text-zinc-600">Site Config</h3>
          <div className="space-y-4">
            <input value={settings.siteName} onChange={e => setSettings({...settings, siteName: e.target.value})} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-sm font-bold" placeholder="Site Name" />
          </div>
        </div>
        <div className="glass-panel p-8 rounded-[3rem] space-y-6">
          <h3 className="text-[12px] font-black uppercase text-zinc-600">Users</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {users.map(u => (
              <button key={u.id} onClick={() => setSelectedAdminUser(u)} className="w-full p-4 rounded-xl border border-white/5 bg-white/5 flex items-center justify-between hover:bg-white/10 transition-all">
                <div className="flex items-center gap-3">
                  <img src={u.photo} className="w-10 h-10 rounded-lg" alt="r" />
                  <p className="text-[11px] font-black uppercase">{u.name}</p>
                </div>
                <p className="font-black">{u.credits} U</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="pt-32 pb-20 px-6 max-w-5xl mx-auto space-y-16 animate-in slide-in-from-bottom-10 duration-700">
      <div className="flex flex-col md:flex-row items-center gap-10 border-b border-white/10 pb-12">
        <img src={currentUser?.photo} className="w-40 h-40 rounded-[3rem] border-8 border-white/5 shadow-2xl" alt="p" />
        <div className="flex-1 space-y-4 text-center md:text-left">
          <h2 className="text-5xl font-black uppercase tracking-tighter">{currentUser?.name}</h2>
          <div className="flex gap-3 justify-center md:justify-start">
            <span className="px-5 py-2 rounded-full text-[9px] font-black uppercase bg-white/5 border border-white/10">{currentUser?.role} Member</span>
            {currentUser?.isAdmin && <span className="px-5 py-2 bg-blue-600 rounded-full text-[9px] font-black uppercase">Admin</span>}
          </div>
        </div>
        <button onClick={handleLogout} className="px-10 py-4 bg-red-600/10 text-red-500 border border-red-600/20 rounded-2xl text-[10px] font-black uppercase">Sign Out</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="glass-panel p-10 rounded-[3rem] text-center space-y-4">
          <p className="text-[12px] font-black uppercase text-zinc-600">Energy Balance</p>
          <p className="text-7xl font-black gradient-text">{currentUser?.role === 'vip' ? '∞' : currentUser?.credits}</p>
        </div>
        <div className="md:col-span-2 glass-panel p-10 rounded-[3rem] space-y-10">
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase">Update Name</label>
              <input value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-sm font-bold outline-none focus:border-white transition-all" />
            </div>
            <button type="submit" className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl">Sync Protocol</button>
            {currentUser?.isAdmin && (
                <button type="button" onClick={() => setActiveTab('admin')} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl">Access Terminal</button>
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
        <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.5em]">Identity Authentication Matrix</p>
      </div>
      <div className="glass-panel p-8 md:p-12 rounded-[2.5rem] md:rounded-[4rem] border-white/10 shadow-2xl space-y-8">
        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {authMode === 'signup' && (
            <input required value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl text-sm font-bold outline-none focus:border-white transition-all" placeholder="Network Name" />
          )}
          <input required type="email" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl text-sm font-bold outline-none focus:border-white transition-all" placeholder="Identity Email" />
          <input required type="password" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl text-sm font-bold outline-none focus:border-white transition-all" placeholder="Access Key" />
          <button type="submit" className="w-full py-6 bg-white text-black rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-2xl">
            {authMode === 'login' ? 'Authorize' : 'Initialize'}
          </button>
        </form>
        <div className="text-center pt-6 border-t border-white/5">
          <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-white transition-colors">
            {authMode === 'login' ? 'New Matrix Identity' : 'Existing Matrix Identity'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderApp = () => (
    <div className="pt-24 md:pt-32 pb-20 px-4 md:px-6 max-w-7xl mx-auto flex flex-col md:flex-row gap-10 md:gap-16">
      <aside className="w-full md:w-1/3 space-y-10 animate-in slide-in-from-left-10 duration-1000">
        <div className="glass-panel p-8 rounded-[3rem] space-y-6">
          <h3 className="text-[10px] md:text-[12px] font-black uppercase tracking-widest text-zinc-600">1. Data Ingress</h3>
          <label className="block w-full h-56 md:h-80 rounded-[2rem] border-4 border-dashed border-white/5 hover:border-white/20 bg-white/5 transition-all cursor-pointer relative overflow-hidden">
            {originalImage ? (
              <img src={originalImage} className="w-full h-full object-cover opacity-60" alt="i" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-zinc-800">
                <svg className="w-12 h-12 md:w-16 md:h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span className="text-[11px] font-black uppercase tracking-widest">Select Source</span>
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
          <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-600 px-2">2. Visual Presets</h3>
          <div className="space-y-3">
            {ENHANCEMENT_STYLES.map(s => (
              <button key={s.id} onClick={() => setSelectedStyle(s)} className={`w-full p-6 rounded-[2rem] border flex items-center gap-5 transition-all ${selectedStyle.id === s.id ? 'bg-white text-black border-white shadow-2xl scale-[1.02]' : 'bg-white/5 border-white/5 text-white hover:bg-white/10'}`}>
                <span className="text-2xl md:text-3xl">{s.icon}</span>
                <div className="text-left overflow-hidden">
                  <p className="text-[11px] font-black uppercase tracking-widest">{s.name}</p>
                  <p className={`text-[9px] font-bold truncate opacity-40 ${selectedStyle.id === s.id ? 'text-black' : 'text-white'}`}>{s.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
        <button disabled={!originalImage || isProcessing} onClick={handleEnhance} className="w-full py-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-[3rem] font-black uppercase tracking-[0.4em] text-[10px] hover:scale-[1.03] transition-all shadow-2xl disabled:opacity-20">
          {isProcessing ? 'Synthesizing...' : 'Reconstruct Frame'}
        </button>
      </aside>

      <main className="flex-1 space-y-8 animate-in slide-in-from-right-10 duration-1000">
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/5 p-3 rounded-[2rem] border border-white/5">
          <div className="flex bg-black/40 rounded-2xl p-1 w-full sm:w-auto">
            <button onClick={() => setViewMode('compare')} className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest ${viewMode === 'compare' ? 'bg-white text-black' : 'text-zinc-600'}`}>Compare</button>
            <button onClick={() => setViewMode('result')} className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest ${viewMode === 'result' ? 'bg-white text-black' : 'text-zinc-600'}`}>Final</button>
          </div>
          {enhancedImage && (
            <a href={enhancedImage} download="reconstructed.png" className="w-full sm:w-auto text-center px-8 py-3 bg-blue-600 rounded-xl text-[9px] font-black uppercase shadow-xl">Download</a>
          )}
        </header>
        <div className="glass-panel p-1 rounded-[2.5rem] md:rounded-[5rem] aspect-square md:aspect-video flex items-center justify-center bg-black/40 overflow-hidden relative border-white/5 shadow-inner">
          {enhancedImage ? (
            viewMode === 'compare' ? <ComparisonSlider before={originalImage!} after={enhancedImage} /> : <img src={enhancedImage} className="w-full h-full object-cover rounded-[2.3rem] md:rounded-[4.8rem]" alt="e" />
          ) : isProcessing ? (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 border-t-4 border-blue-500 rounded-full animate-spin mx-auto" />
              <p className="text-[11px] font-black uppercase tracking-[0.5em] animate-pulse">Scanning Neural Paths</p>
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
          <div className="flex items-center gap-5">
            {currentUser ? (
              <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/5 cursor-pointer" onClick={() => setActiveTab('profile')}>
                <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ${currentUser.role === 'vip' ? 'text-amber-500' : 'text-zinc-600'}`}>{currentUser.role === 'vip' ? '∞' : `${currentUser.credits} U`}</span>
                <img src={currentUser.photo} className="w-7 h-7 md:w-8 md:h-8 rounded-lg" alt="a" />
              </div>
            ) : (
              <button onClick={() => { setAuthMode('signup'); setActiveTab('auth'); }} className="px-6 py-3 bg-white text-black rounded-xl text-[9px] md:text-[10px] font-black uppercase">Start</button>
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
