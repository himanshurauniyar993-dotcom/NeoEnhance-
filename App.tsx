
import React, { useState, useEffect } from 'react';
import { GeminiService } from './services/geminiService';
import { ENHANCEMENT_STYLES, DEFAULT_SETTINGS } from './constants';
import { EnhancementStyle, User, WebSettings, UserRole } from './types';
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

  // --- UI State ---
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<EnhancementStyle>(ENHANCEMENT_STYLES[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'compare' | 'result'>('compare');
  const [activeTab, setActiveTab] = useState<'home' | 'app' | 'admin' | 'profile' | 'auth'>('home');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [diagStatus, setDiagStatus] = useState<string[]>([]);
  
  // --- Form State ---
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [chatInput, setChatInput] = useState('');

  // --- Persistence & Matrix Synchronization ---
  useEffect(() => {
    localStorage.setItem('neo_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('neo_users', JSON.stringify(users));
  }, [users]);
  
  useEffect(() => {
    if (currentUser) {
      const masterRecord = users.find(u => u.id === currentUser.id);
      if (masterRecord && JSON.stringify(masterRecord) !== JSON.stringify(currentUser)) {
        setCurrentUser(masterRecord);
      }
      localStorage.setItem('neo_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('neo_current_user');
    }
  }, [currentUser, users]);

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
        if (existingUser.isSuspended) return setError("Identity Suspended.");
        if (existingUser.password && existingUser.password !== authForm.password) return setError("Invalid Access Key.");
        setCurrentUser(existingUser);
        setActiveTab('app');
      } else {
        setError("Identity not found.");
      }
    } else {
      if (existingUser) return setError("Identity already exists.");
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
  };

  const deductCredit = () => {
    if (!currentUser) return false;
    if (currentUser.role === 'vip' || currentUser.isAdmin) return true;
    if (currentUser.credits <= 0) {
      setError("Units depleted. Upgrade to VIP.");
      return false;
    }
    const updated = { ...currentUser, credits: currentUser.credits - 1 };
    updateUserInMatrix(updated);
    return true;
  };

  const runDiagnostic = () => {
    setDiagStatus(["Starting System Diagnostic..."]);
    setTimeout(() => setDiagStatus(prev => [...prev, "✓ Storage Node: Operational"]), 500);
    setTimeout(() => setDiagStatus(prev => [...prev, `✓ Identity Matrix: ${users.length} nodes active`]), 1000);
    setTimeout(() => setDiagStatus(prev => [...prev, "✓ Pricing Core: Logic valid"]), 1500);
    setTimeout(() => setDiagStatus(prev => [...prev, "SYSTEM STATUS: SECURE & READY"]), 2000);
  };

  const handleEnhance = async () => {
    if (!originalImage || !currentUser) return;
    try {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) await (window as any).aistudio.openSelectKey();
    } catch (err) { console.warn(err); }
    
    if (!deductCredit()) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const gemini = GeminiService.getInstance();
      const result = await gemini.enhanceImage(originalImage, selectedStyle.prompt, chatInput);
      setEnhancedImage(result);
      setViewMode('result');
    } catch (err: any) {
      console.error("Enhancement failed:", err);
      if (err?.message?.includes("Requested entity was not found.")) {
        setError("Invalid Key Error. Select a valid API key.");
        await (window as any).aistudio.openSelectKey();
      } else if (err?.message?.includes("Safety")) {
        setError("Safety Filter: Image content flagged.");
      } else {
        setError(err.message || "Synthesis Failed. Try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdminAction = (userId: string, action: 'add_credit' | 'rem_credit' | 'set_role' | 'toggle_suspend', value?: any) => {
    // SECURITY: Ensure only admins can execute these actions on the backend matrix
    if (!currentUser?.isAdmin && userId !== currentUser?.id) return;
    // SECURITY: Non-admins cannot set their own role or credits
    if (!currentUser?.isAdmin && (action === 'set_role' || action === 'add_credit' || action === 'rem_credit' || action === 'toggle_suspend')) {
      setError("Unauthorized Operation.");
      return;
    }

    const user = users.find(u => u.id === userId);
    if (!user) return;
    let updated = { ...user };
    if (action === 'add_credit') updated.credits += 5;
    if (action === 'rem_credit') updated.credits = Math.max(0, updated.credits - 5);
    if (action === 'set_role') updated.role = value as UserRole;
    if (action === 'toggle_suspend') updated.isSuspended = !updated.isSuspended;
    updateUserInMatrix(updated);
  };

  const renderHome = () => (
    <div className="pt-48 space-y-40 text-center px-6 max-w-7xl mx-auto animate-in fade-in duration-1000">
      <div className="space-y-12">
        <h1 className="text-7xl md:text-9xl font-black tracking-tighter leading-tight">
          Neural <span className="gradient-text">{settings.siteName}</span>
        </h1>
        <p className="text-zinc-500 text-xl md:text-2xl max-w-2xl mx-auto font-light">
          8K Reconstructive Intelligence for Professional Visuals.
        </p>
        <button onClick={() => currentUser ? setActiveTab('app') : setActiveTab('auth')} className="px-16 py-8 bg-white text-black rounded-full font-black uppercase tracking-widest hover:scale-105 transition-all shadow-2xl">
          Enter Studio
        </button>
      </div>
      <div className="glass-panel p-2 rounded-[4rem] overflow-hidden max-w-4xl mx-auto shadow-2xl">
        <ComparisonSlider 
          before="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1000&auto=format&fit=crop&blur=50"
          after="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1000&auto=format&fit=crop"
        />
      </div>
    </div>
  );

  const renderAdmin = () => (
    <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-500">
      <div className="flex justify-between items-end border-b border-white/10 pb-12">
        <div>
          <h2 className="text-6xl font-black uppercase tracking-tighter">Command <span className="text-blue-500">Center</span></h2>
          <p className="text-zinc-600 font-black uppercase tracking-[0.5em] text-[10px]">Global Infrastructure Terminal</p>
        </div>
        <button onClick={() => setActiveTab('app')} className="px-8 py-3 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">Exit Console</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-10">
          <div className="glass-panel p-10 rounded-[3rem] space-y-8 border-white/10">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Infrastructure Core</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-600">Site Name</label>
                  <input type="text" value={settings.siteName} onChange={(e) => setSettings({...settings, siteName: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-xs font-bold outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-600">Logo Text</label>
                  <input type="text" value={settings.logoText} onChange={(e) => setSettings({...settings, logoText: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-xs font-bold outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-600">Primary Hue</label>
                  <input type="color" value={settings.themePrimary} onChange={(e) => setSettings({...settings, themePrimary: e.target.value})} className="w-full h-12 bg-transparent border-none cursor-pointer" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-600">Secondary Hue</label>
                  <input type="color" value={settings.themeSecondary} onChange={(e) => setSettings({...settings, themeSecondary: e.target.value})} className="w-full h-12 bg-transparent border-none cursor-pointer" />
                </div>
              </div>
            </div>
          </div>
          <div className="glass-panel p-8 rounded-[2.5rem] border-white/10 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Diagnostic Node</h3>
              <button onClick={runDiagnostic} className="text-[8px] font-black uppercase px-3 py-1 bg-blue-600 rounded-lg">Run Check</button>
            </div>
            <div className="bg-black/40 rounded-2xl p-6 font-mono text-[10px] text-zinc-500 space-y-2 min-h-[120px]">
              {diagStatus.length === 0 && <p className="animate-pulse">Ready to verify infrastructure...</p>}
              {diagStatus.map((line, i) => <p key={i} className={line.includes('SYSTEM') ? 'text-green-500 font-bold mt-4' : ''}>{line}</p>)}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 glass-panel p-10 rounded-[3rem] space-y-10 border-white/10">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Identity Index</h3>
            <span className="text-[10px] font-black px-4 py-1.5 bg-blue-600/20 text-blue-400 rounded-full border border-blue-500/20">{users.length} Nodes</span>
          </div>
          <div className="space-y-4 max-h-[800px] overflow-y-auto pr-4 custom-scrollbar">
            {users.map(u => (
              <div key={u.id} className="w-full p-6 rounded-2xl border border-white/5 bg-white/5 space-y-6 group transition-all hover:bg-white/[0.07]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img src={u.photo} className="w-12 h-12 rounded-xl border border-white/10" alt="u" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest">{u.name} {u.isAdmin && <span className="ml-2 text-blue-500">★</span>}</p>
                      <p className="text-[10px] text-zinc-600 font-bold">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${u.isSuspended ? 'bg-red-600/20 text-red-500' : 'bg-green-600/20 text-green-500'}`}>
                      {u.isSuspended ? 'Suspended' : 'Active'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-white/5">
                  <div className="flex-1 min-w-[150px] space-y-2">
                    <label className="text-[8px] font-black uppercase text-zinc-700">Role Status</label>
                    <select value={u.role} onChange={(e) => handleAdminAction(u.id, 'set_role', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-bold outline-none cursor-pointer">
                      <option value="free">Free Node</option>
                      <option value="subscriber">Subscriber Node</option>
                      <option value="vip">VIP Node (Infinite)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-black uppercase text-zinc-700">Balance ({u.role === 'vip' ? '∞' : u.credits})</label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleAdminAction(u.id, 'rem_credit')} className="p-2 bg-white/5 hover:bg-red-500/20 rounded-lg transition-all">-</button>
                      <button onClick={() => handleAdminAction(u.id, 'add_credit')} className="p-2 bg-white/5 hover:bg-green-500/20 rounded-lg transition-all">+</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-black uppercase text-zinc-700">Access</label>
                    <button onClick={() => handleAdminAction(u.id, 'toggle_suspend')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${u.isSuspended ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                      {u.isSuspended ? 'Revoke Suspension' : 'Suspend Node'}
                    </button>
                  </div>
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
        <img src={currentUser?.photo} className="w-40 h-40 rounded-[3rem] border-8 border-white/5 shadow-2xl" alt="p" />
        <div className="flex-1 text-center md:text-left space-y-4">
          <h2 className="text-6xl font-black uppercase tracking-tighter">{currentUser?.name}</h2>
          <div className="flex gap-4 justify-center md:justify-start">
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 ${currentUser?.role === 'vip' ? 'text-amber-500 bg-amber-500/5' : 'bg-white/5'}`}>
              {currentUser?.role} Member
            </span>
            {currentUser?.isAdmin && <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/10">Administrator</span>}
          </div>
        </div>
        <button onClick={() => { setCurrentUser(null); setActiveTab('home'); }} className="px-10 py-4 bg-red-600/10 text-red-500 border border-red-600/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">Disconnect</button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="glass-panel p-12 rounded-[3rem] text-center space-y-6">
          <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Available Energy</p>
          <p className="text-7xl font-black gradient-text">{currentUser?.role === 'vip' ? '∞' : currentUser?.credits}</p>
          <p className="text-[10px] uppercase font-bold text-zinc-800 tracking-widest">Reconstruction Units</p>
        </div>
        
        {/* IDENTITY UPGRADE MATRIX - ONLY ACCESSIBLE TO ADMINS */}
        {currentUser?.isAdmin ? (
          <div className="lg:col-span-2 glass-panel p-10 rounded-[3rem] space-y-8 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Identity Upgrade Matrix (Admin)</h3>
              <button onClick={deductCredit} className="text-[8px] font-black uppercase px-4 py-1 bg-white/5 rounded-full hover:bg-white/10 border border-white/10">Simulate Logic Test</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button onClick={() => handleAdminAction(currentUser.id, 'add_credit')} className="p-6 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 text-left transition-all group">
                <p className="text-xs font-black uppercase tracking-widest group-hover:text-blue-400 transition-colors">Refill Units</p>
                <p className="text-[10px] text-zinc-600 mt-1">Acquire 5 Reconstruction Units instantly.</p>
              </button>
              <button onClick={() => handleAdminAction(currentUser.id, 'set_role', 'vip')} className="p-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 text-left transition-all group">
                <p className="text-xs font-black uppercase tracking-widest text-blue-400">Unlock VIP ∞</p>
                <p className="text-[10px] text-zinc-600 mt-1">Unlimited 8K processing & priority queue.</p>
              </button>
            </div>
            <button onClick={() => setActiveTab('admin')} className="w-full py-6 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.5em] shadow-xl hover:bg-blue-500 transition-all">Open Command Center</button>
          </div>
        ) : (
          <div className="lg:col-span-2 glass-panel p-10 rounded-[3rem] space-y-8 flex flex-col justify-center text-center">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">System Status</h3>
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-500/10 text-green-500 rounded-full border border-green-500/20">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">Identity Online</span>
              </div>
              <p className="text-zinc-600 text-xs font-medium max-w-sm mx-auto">
                Your neural link is active. To refill units or upgrade to VIP, please contact the local administrator.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderApp = () => (
    <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col lg:flex-row gap-16">
      <aside className="w-full lg:w-[350px] space-y-10 animate-in slide-in-from-left-5">
        <div className="glass-panel p-6 rounded-[2.5rem] space-y-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">1. Data Ingress</h3>
          <label className="block w-full h-48 rounded-[1.5rem] border-2 border-dashed border-white/10 hover:border-white/20 transition-all cursor-pointer relative overflow-hidden group">
            {originalImage ? (
              <img src={originalImage} className="w-full h-full object-cover" alt="orig" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-700">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span className="text-[8px] font-black uppercase tracking-widest">Select Source</span>
              </div>
            )}
            <input type="file" className="hidden" accept="image/*" onChange={e => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = ev => {
                  setOriginalImage(ev.target?.result as string);
                  setEnhancedImage(null);
                };
                reader.readAsDataURL(file);
              }
            }} />
          </label>
        </div>
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 px-4">2. Neural Style</h3>
          {ENHANCEMENT_STYLES.map(s => (
            <button key={s.id} onClick={() => setSelectedStyle(s)} className={`w-full p-5 rounded-2xl border flex items-center gap-4 transition-all ${selectedStyle.id === s.id ? 'bg-white text-black border-white scale-105 shadow-xl' : 'bg-white/5 border-white/5 text-white hover:bg-white/10'}`}>
              <span className="text-xl">{s.icon}</span>
              <div className="text-left overflow-hidden">
                <p className="text-[9px] font-black uppercase tracking-widest">{s.name}</p>
                <p className="text-[7px] font-bold opacity-40 truncate">{s.description}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="glass-panel p-6 rounded-[2.5rem] space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">3. Neural Instructions</h3>
          <textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="E.g. Change eye color to neon green, add cinematic fog..." className="w-full h-24 bg-black/40 border border-white/5 rounded-2xl p-4 text-[11px] font-bold text-white placeholder-zinc-700 focus:border-blue-500 outline-none transition-all resize-none custom-scrollbar" />
        </div>
        <button disabled={!originalImage || isProcessing} onClick={handleEnhance} className="w-full py-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl font-black uppercase tracking-[0.4em] text-[10px] hover:scale-105 transition-all shadow-xl disabled:opacity-20 active:scale-95">
          {isProcessing ? 'Synthesizing...' : 'Execute Reconstruction'}
        </button>
      </aside>
      <main className="flex-1 space-y-8 animate-in slide-in-from-right-5">
        <div className="flex bg-white/5 p-2 rounded-2xl w-fit backdrop-blur-3xl border border-white/5">
          <button onClick={() => setViewMode('compare')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'compare' ? 'bg-white text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}>Scan View</button>
          <button onClick={() => setViewMode('result')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'result' ? 'bg-white text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}>8K Masterpiece</button>
        </div>
        <div className="glass-panel p-2 rounded-[3rem] aspect-video flex items-center justify-center bg-black/40 overflow-hidden relative border-white/5 shadow-2xl">
          {enhancedImage ? (
            viewMode === 'compare' ? (
              <ComparisonSlider before={originalImage!} after={enhancedImage} />
            ) : (
              <img src={enhancedImage} className="w-full h-full object-contain rounded-[2.8rem]" alt="e" />
            )
          ) : isProcessing ? (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 border-4 border-t-blue-500 border-white/5 rounded-full animate-spin mx-auto shadow-[0_0_20px_rgba(59,130,246,0.3)]" />
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500 animate-pulse">Processing Neural Paths</p>
            </div>
          ) : (
            <div className="text-center opacity-10 uppercase tracking-[1em] font-black text-3xl select-none">Standby</div>
          )}
        </div>
      </main>
    </div>
  );

  const renderAuth = () => (
    <div className="pt-48 pb-20 px-6 max-w-lg mx-auto space-y-12 animate-in fade-in duration-700">
      <div className="text-center space-y-4">
        <h2 className="text-5xl font-black uppercase tracking-tighter">Establish <span className="gradient-text">Identity</span></h2>
        <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.5em]">Neural Authentication Node</p>
      </div>
      <form onSubmit={handleAuthSubmit} className="glass-panel p-10 rounded-[3rem] space-y-6 shadow-2xl border-white/10">
        {authMode === 'signup' && (
          <input required value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-xs font-bold outline-none focus:border-white transition-all placeholder:text-zinc-700" placeholder="Signature (Name)" />
        )}
        <input required type="email" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-xs font-bold outline-none focus:border-white transition-all placeholder:text-zinc-700" placeholder="Identity Node (Email)" />
        <input required type="password" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-xs font-bold outline-none focus:border-white transition-all placeholder:text-zinc-700" placeholder="Access Key" />
        <button type="submit" className="w-full py-6 bg-white text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl hover:scale-105 transition-all">
          {authMode === 'login' ? 'Authorize' : 'Initialize'}
        </button>
        <button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="w-full text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-colors">
          {authMode === 'login' ? 'Create New Identity' : 'Authorized Personnel Login'}
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-blue-500/40">
      <style>{`
        .gradient-text { background: linear-gradient(90deg, ${settings.themePrimary}, ${settings.themeSecondary}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
      <nav className="fixed top-0 w-full z-50 p-6">
        <div className="max-w-7xl mx-auto glass-panel border-white/10 px-8 py-4 rounded-full flex items-center justify-between backdrop-blur-3xl shadow-2xl">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl shadow-lg" style={{ background: `linear-gradient(135deg, ${settings.themePrimary}, ${settings.themeSecondary})` }}>
              {settings.logoText}
            </div>
            <span className="text-xl font-black tracking-tighter uppercase hidden sm:inline">{settings.siteName}</span>
          </div>
          <div className="flex items-center gap-8">
            {currentUser ? (
              <>
                <button onClick={() => setActiveTab('app')} className="text-[10px] font-black uppercase text-zinc-500 hover:text-white transition-all tracking-widest">Studio</button>
                <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-full border border-white/5 cursor-pointer hover:bg-white/10 transition-all" onClick={() => setActiveTab('profile')}>
                  <div className="text-right hidden sm:block">
                    <p className={`text-[8px] font-black uppercase ${currentUser.role === 'vip' ? 'text-amber-500' : 'text-blue-400'}`}>{currentUser.role === 'vip' ? 'Infinite' : `${currentUser.credits} Units`}</p>
                    <p className="text-[7px] font-bold text-zinc-600 uppercase">Matrix Balance</p>
                  </div>
                  <img src={currentUser.photo} className="w-8 h-8 rounded-lg border border-white/10" alt="u" />
                </div>
              </>
            ) : (
              <button onClick={() => { setAuthMode('signup'); setActiveTab('auth'); }} className="px-8 py-3 bg-white text-black rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl">Initialize</button>
            )}
          </div>
        </div>
      </nav>
      {activeTab === 'home' && renderHome()}
      {activeTab === 'app' && renderApp()}
      {activeTab === 'admin' && currentUser?.isAdmin && renderAdmin()}
      {activeTab === 'profile' && renderProfile()}
      {activeTab === 'auth' && renderAuth()}
      {error && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 px-10 py-5 bg-red-600 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl z-[100] animate-in slide-in-from-bottom-5">
          {error}
        </div>
      )}
    </div>
  );
};

export default App;
