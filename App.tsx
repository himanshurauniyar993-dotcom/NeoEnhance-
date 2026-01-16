
import React, { useState, useEffect, useMemo } from 'react';
import { GeminiService } from './services/geminiService';
import { ENHANCEMENT_STYLES, DEFAULT_SETTINGS } from './constants';
import { EnhancementStyle, User, WebSettings, ChatMessage, UserRole } from './types';
import { ComparisonSlider } from './components/ComparisonSlider';

const ADMIN_EMAIL = 'himanshurauniyar993@gmail.com';

const App: React.FC = () => {
  // --- Global State ---
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('neo_current_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [settings, setSettings] = useState<WebSettings>(() => {
    const saved = localStorage.getItem('neo_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('neo_users');
    return saved ? JSON.parse(saved) : [];
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
  
  // Sync currentUser with users array to ensure "user data" like role/credits are always fresh
  useEffect(() => {
    if (currentUser) {
      const freshData = users.find(u => u.id === currentUser.id);
      if (freshData && JSON.stringify(freshData) !== JSON.stringify(currentUser)) {
        setCurrentUser(freshData);
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
    if (currentUser?.id === updated.id) setCurrentUser(updated);
    if (selectedAdminUser?.id === updated.id) setSelectedAdminUser(updated);
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    setTimeout(() => {
      const emailLower = authForm.email.toLowerCase();
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
          setError("Identity already registered.");
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
    }, 600);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('home');
    setEnhancedImage(null);
    setOriginalImage(null);
  };

  const deductCredit = () => {
    if (!currentUser) return false;
    // VIP and Admin bypass deduction functionally
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
    alert("Identity updated successfully.");
  };

  // --- UI Sections ---
  const renderHome = () => (
    <div className="pt-24 md:pt-32 space-y-16 md:space-y-32 text-center px-4 sm:px-6 max-w-7xl mx-auto overflow-hidden">
      <div className="space-y-6 md:space-y-10 animate-in fade-in zoom-in-95 duration-1000">
        <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tighter leading-tight">
          Visual <span className="gradient-text">{settings.siteName}</span>
        </h1>
        <p className="text-zinc-500 text-base md:text-xl max-w-2xl mx-auto font-medium">
          The ultimate neural network for image reconstruction. Cinematic resolution at your fingertips.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button 
            onClick={() => currentUser ? setActiveTab('app') : setActiveTab('auth')}
            className="w-full sm:w-auto px-8 py-4 md:px-12 md:py-6 bg-white text-black rounded-2xl md:rounded-3xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_80px_rgba(255,255,255,0.15)]"
          >
            {currentUser ? 'Enter Studio' : 'Start Free'}
          </button>
          {!currentUser && (
            <button 
              onClick={() => { setAuthMode('login'); setActiveTab('auth'); }}
              className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] hover:text-white transition-colors"
            >
              Sign In to Existing Matrix
            </button>
          )}
        </div>
      </div>
      <div className="glass-panel p-1 md:p-2 rounded-[2rem] md:rounded-[4rem] border-white/5 shadow-2xl overflow-hidden max-w-5xl mx-auto">
        <ComparisonSlider 
          before="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1200&auto=format&fit=crop&blur=80"
          after="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1200&auto=format&fit=crop"
        />
      </div>
    </div>
  );

  const renderAdmin = () => (
    <div className="pt-24 pb-20 px-4 sm:px-6 max-w-7xl mx-auto space-y-10 md:space-y-16 animate-in fade-in duration-500">
      {/* User Management Portal */}
      {selectedAdminUser && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-4 md:p-6 overflow-y-auto">
          <div className="w-full max-w-2xl glass-panel p-6 md:p-12 rounded-[2.5rem] md:rounded-[4rem] border-white/20 relative shadow-2xl my-auto">
            <button onClick={() => setSelectedAdminUser(null)} className="absolute top-6 right-6 md:top-10 md:right-10 text-white/20 hover:text-white transition-colors">
              <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 mb-8 md:mb-12 text-center md:text-left">
              <img src={selectedAdminUser.photo} className="w-20 h-20 md:w-28 md:h-28 rounded-2xl md:rounded-[3rem] border-4 border-white/10 shadow-2xl" alt="m-u" />
              <div>
                <h3 className="text-2xl md:text-4xl font-black uppercase tracking-tighter">{selectedAdminUser.name}</h3>
                <p className="text-xs md:text-sm text-zinc-500 font-bold">{selectedAdminUser.email}</p>
                <div className="flex justify-center md:justify-start gap-2 mt-4">
                  <span className={`px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest border ${
                    selectedAdminUser.role === 'vip' ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 
                    selectedAdminUser.role === 'subscriber' ? 'bg-blue-500/20 text-blue-500 border-blue-500/30' : 
                    'bg-zinc-800 text-zinc-500 border-white/5'
                  }`}>{selectedAdminUser.role} Role</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              <div className="space-y-6 md:space-y-8">
                <div className="space-y-3">
                  <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-zinc-600">Inject Energy (Credits)</h4>
                  <div className="flex gap-2">
                    <input id="amt_inject" type="number" placeholder="Units" className="flex-1 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-4 text-sm font-bold outline-none" />
                    <button onClick={() => {
                      const val = parseInt((document.getElementById('amt_inject') as HTMLInputElement).value);
                      if (!isNaN(val)) updateUserInMatrix({ ...selectedAdminUser, credits: selectedAdminUser.credits + val });
                      (document.getElementById('amt_inject') as HTMLInputElement).value = '';
                    }} className="px-4 md:px-8 py-3 md:py-4 bg-white text-black rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest">Inject</button>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-zinc-600">Modify Identity Role</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {(['free', 'subscriber', 'vip'] as UserRole[]).map(role => (
                      <button 
                        key={role}
                        onClick={() => updateUserInMatrix({ ...selectedAdminUser, role })}
                        className={`py-3 md:py-4 rounded-xl md:rounded-2xl text-[8px] md:text-[10px] font-black uppercase border transition-all ${selectedAdminUser.role === role ? 'bg-blue-600 text-white border-blue-500' : 'bg-white/5 border-white/5 text-zinc-600'}`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6 md:space-y-8">
                <div className="space-y-3">
                  <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-zinc-600">Security Actions</h4>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => updateUserInMatrix({ ...selectedAdminUser, isSuspended: !selectedAdminUser.isSuspended })}
                      className={`w-full py-4 md:py-5 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase border transition-all ${selectedAdminUser.isSuspended ? 'bg-green-600/10 text-green-500 border-green-500/20' : 'bg-red-600/10 text-red-500 border-red-600/20'}`}
                    >
                      {selectedAdminUser.isSuspended ? 'Reinstate Identity' : 'Suspend Access'}
                    </button>
                    <button 
                      onClick={() => { if(confirm("Permanently purge this identity?")) setUsers(users.filter(u => u.id !== selectedAdminUser.id)); setSelectedAdminUser(null); }}
                      className="w-full py-4 md:py-5 bg-zinc-900 border border-white/10 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase text-red-500"
                    >
                      Purge Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Landing */}
      <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-6 md:gap-10 border-b border-white/10 pb-8 md:pb-16 text-center md:text-left">
        <div className="space-y-2 md:space-y-4">
          <h2 className="text-4xl sm:text-5xl md:text-7xl font-black uppercase tracking-tighter">Command <span className="text-blue-500">Center</span></h2>
          <p className="text-zinc-500 text-[10px] md:text-sm font-bold uppercase tracking-[0.4em]">Global Overseer Terminal</p>
        </div>
        <button onClick={() => setActiveTab('app')} className="px-8 md:px-12 py-3 md:py-5 bg-white text-black rounded-xl md:rounded-3xl text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-xl whitespace-nowrap">Back to Studio</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16">
        {/* Global Web Configuration */}
        <div className="glass-panel p-6 md:p-12 rounded-[2.5rem] md:rounded-[4rem] border-white/10 space-y-8 md:space-y-12 shadow-2xl">
          <h3 className="text-[10px] md:text-[12px] font-black uppercase tracking-widest text-zinc-600 flex items-center gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" /> Platform Configuration
          </h3>
          
          <div className="grid grid-cols-1 gap-6 md:gap-10">
            <div className="space-y-3 md:space-y-4">
              <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">Site Name</label>
              <input value={settings.siteName} onChange={e => setSettings({...settings, siteName: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 md:p-5 rounded-xl md:rounded-3xl text-sm font-bold focus:border-blue-500 outline-none transition-all" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-3 md:space-y-4">
                <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">Logo Branding (Text)</label>
                <input value={settings.logoText} onChange={e => setSettings({...settings, logoText: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 md:p-5 rounded-xl md:rounded-3xl text-sm font-bold" />
              </div>
              <div className="space-y-3 md:space-y-4">
                <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">Logo Branding (Icon)</label>
                <label className="cursor-pointer block bg-white/5 border border-white/10 p-4 md:p-5 rounded-xl md:rounded-3xl text-sm font-bold hover:bg-white/10 transition-all text-center">
                  {settings.logoUrl ? 'Update Symbol' : 'Upload Symbol'}
                  <input type="file" className="hidden" accept="image/*" onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = ev => setSettings({...settings, logoUrl: ev.target?.result as string});
                      reader.readAsDataURL(file);
                    }
                  }} />
                </label>
              </div>
            </div>

            <div className="space-y-3 md:space-y-4 pt-6 border-t border-white/5">
              <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">Environment Theme</label>
              <div className="grid grid-cols-2 gap-4">
                <input type="color" value={settings.themePrimary} onChange={e => setSettings({...settings, themePrimary: e.target.value})} className="w-full h-12 md:h-16 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl cursor-pointer" />
                <input type="color" value={settings.themeSecondary} onChange={e => setSettings({...settings, themeSecondary: e.target.value})} className="w-full h-12 md:h-16 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl cursor-pointer" />
              </div>
            </div>
          </div>
        </div>

        {/* User Identity Matrix */}
        <div className="glass-panel p-6 md:p-12 rounded-[2.5rem] md:rounded-[4rem] border-white/10 space-y-8 md:space-y-12 shadow-2xl">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] md:text-[12px] font-black uppercase tracking-widest text-zinc-600">Identity Matrix</h3>
            <span className="text-[9px] md:text-[10px] font-black bg-blue-600 text-white px-3 py-1 md:px-4 md:py-1.5 rounded-full uppercase tracking-widest">{users.length} Units</span>
          </div>

          <div className="space-y-3 md:space-y-4 overflow-y-auto max-h-[400px] md:max-h-[600px] pr-2 md:pr-4 custom-scrollbar">
            {users.map(u => (
              <button 
                key={u.id}
                onClick={() => setSelectedAdminUser(u)}
                className={`w-full p-4 md:p-6 rounded-2xl md:rounded-[3rem] border transition-all flex items-center justify-between group ${u.isSuspended ? 'opacity-30' : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10 shadow-xl'}`}
              >
                <div className="flex items-center gap-4 md:gap-6 overflow-hidden">
                  <img src={u.photo} className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl border border-white/10 group-hover:scale-110 transition-transform flex-shrink-0" alt="r" />
                  <div className="text-left overflow-hidden">
                    <p className="text-xs md:text-sm font-black uppercase tracking-widest truncate">{u.name}</p>
                    <div className="flex gap-2 items-center mt-1">
                      <span className={`text-[6px] md:text-[7px] font-black uppercase px-2 py-0.5 md:py-1 rounded-full ${u.role === 'vip' ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}>{u.role}</span>
                      <p className="text-[8px] md:text-[9px] text-zinc-600 truncate max-w-[80px] sm:max-w-[150px] font-bold">{u.email}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="text-base md:text-lg font-black">{u.role === 'vip' ? '∞' : u.credits}</p>
                  <p className="text-[7px] md:text-[8px] text-zinc-700 uppercase font-black">Reserve</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="pt-32 pb-20 px-4 sm:px-6 max-w-5xl mx-auto space-y-10 md:space-y-16 animate-in slide-in-from-bottom-10 duration-700">
      <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 border-b border-white/10 pb-12 md:pb-16 text-center md:text-left">
        <div className="relative group">
          <img src={currentUser?.photo} className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] md:rounded-[4rem] border-4 md:border-8 border-white/5 shadow-2xl group-hover:scale-105 transition-all" alt="p" />
          <div className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 bg-blue-600 p-2 md:p-3 rounded-xl md:rounded-2xl shadow-xl">
             <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
        </div>
        <div className="flex-1 space-y-3 md:space-y-4">
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter truncate">{currentUser?.name}</h2>
          <div className="flex flex-wrap justify-center md:justify-start gap-2 md:gap-3">
            <span className={`px-4 py-1.5 md:px-6 md:py-2 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest border ${
              currentUser?.role === 'vip' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-white/5 text-zinc-500 border-white/10'
            }`}>{currentUser?.role} Member</span>
            {currentUser?.isAdmin && <span className="px-4 py-1.5 md:px-6 md:py-2 bg-blue-600 text-white rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest shadow-lg">Administrator</span>}
          </div>
        </div>
        <button onClick={handleLogout} className="w-full md:w-auto px-10 py-4 md:px-12 md:py-5 bg-red-600/10 text-red-500 border border-red-600/20 rounded-[1.5rem] md:rounded-[2rem] text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">Sign Out</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10">
        <div className="glass-panel p-8 md:p-12 rounded-[2rem] md:rounded-[4rem] text-center space-y-4 md:space-y-6 border-white/10 shadow-2xl">
          <p className="text-[10px] md:text-[12px] font-black uppercase tracking-widest text-zinc-600">Unit Balance</p>
          <p className="text-6xl md:text-8xl font-black gradient-text leading-none">{currentUser?.role === 'vip' ? '∞' : currentUser?.credits}</p>
          <p className="text-[8px] md:text-[10px] font-bold text-zinc-800 uppercase tracking-widest pt-2 md:pt-4">Energy Units Remaining</p>
        </div>

        <div className="lg:col-span-2 glass-panel p-8 md:p-12 rounded-[2rem] md:rounded-[4rem] space-y-8 md:space-y-12 border-white/10 shadow-2xl">
          <div className="flex gap-8 md:gap-12 border-b border-white/5 pb-4 md:pb-6 overflow-x-auto custom-scrollbar">
            {(['general', 'security'] as const).map(tab => (
              <button 
                key={tab}
                onClick={() => setProfileSubTab(tab)}
                className={`text-[10px] md:text-[12px] font-black uppercase tracking-widest transition-all pb-4 md:pb-6 border-b-2 md:border-b-4 whitespace-nowrap ${profileSubTab === tab ? 'border-white text-white' : 'border-transparent text-white/20'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-8 md:space-y-10 animate-in fade-in duration-500">
            {profileSubTab === 'general' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                <div className="space-y-3 md:space-y-4">
                  <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">Display Name</label>
                  <input value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 md:p-5 rounded-2xl md:rounded-3xl text-sm font-bold outline-none focus:border-white transition-all" />
                </div>
                <div className="space-y-3 md:space-y-4">
                  <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">Network Address (Locked)</label>
                  <input className="w-full bg-white/5 border border-white/10 p-4 md:p-5 rounded-2xl md:rounded-3xl text-sm font-bold opacity-30 cursor-not-allowed" value={currentUser?.email} disabled />
                </div>
              </div>
            ) : (
              <div className="space-y-6 md:space-y-8 max-w-md">
                <div className="space-y-3 md:space-y-4">
                  <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">New Secret Key (Password)</label>
                  <input type="password" value={profileForm.password} onChange={e => setProfileForm({...profileForm, password: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 md:p-5 rounded-2xl md:rounded-3xl text-sm font-bold outline-none focus:border-white" />
                </div>
                <div className="space-y-3 md:space-y-4">
                  <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">Confirm Secret Key</label>
                  <input type="password" value={profileForm.confirmPassword} onChange={e => setProfileForm({...profileForm, confirmPassword: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 md:p-5 rounded-2xl md:rounded-3xl text-sm font-bold outline-none focus:border-white" />
                </div>
              </div>
            )}
            
            <button type="submit" className="w-full py-5 md:py-6 bg-white text-black rounded-2xl md:rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-2xl hover:scale-[1.02] transition-all">Update Identity Profile</button>
            
            {currentUser?.isAdmin && profileSubTab === 'general' && (
              <button type="button" onClick={() => setActiveTab('admin')} className="w-full py-5 md:py-6 bg-blue-600 text-white rounded-2xl md:rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-2xl flex items-center justify-center gap-3 md:gap-4 group">
                 <svg className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>
                 Open Overseer Terminal
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );

  // --- Auth View ---
  const renderAuth = () => (
    <div className="pt-32 md:pt-48 pb-20 px-4 sm:px-6 max-w-xl mx-auto space-y-8 md:space-y-12 animate-in fade-in zoom-in-95 duration-700">
      <div className="text-center space-y-2 md:space-y-4">
        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
          {authMode === 'login' ? 'Establish' : 'Initialize'} <span className="gradient-text">Identity</span>
        </h2>
        <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.6em]">Neural Network Auth Protocol</p>
      </div>

      <div className="glass-panel p-8 md:p-12 rounded-[2rem] md:rounded-[4rem] border-white/10 shadow-2xl space-y-8 md:space-y-10">
        <form onSubmit={handleAuthSubmit} className="space-y-6 md:space-y-8">
          {authMode === 'signup' && (
            <div className="space-y-2 md:space-y-3">
              <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">Operator Name</label>
              <input 
                required
                value={authForm.name} 
                onChange={e => setAuthForm({...authForm, name: e.target.value})} 
                className="w-full bg-white/5 border border-white/10 p-4 md:p-5 rounded-2xl md:rounded-3xl text-sm font-bold outline-none focus:border-white transition-all" 
                placeholder="Agent Zero"
              />
            </div>
          )}
          <div className="space-y-2 md:space-y-3">
            <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">Network Address</label>
            <input 
              required
              type="email"
              value={authForm.email} 
              onChange={e => setAuthForm({...authForm, email: e.target.value})} 
              className="w-full bg-white/5 border border-white/10 p-4 md:p-5 rounded-2xl md:rounded-3xl text-sm font-bold outline-none focus:border-white transition-all" 
              placeholder="operator@neo.network"
            />
          </div>
          <div className="space-y-2 md:space-y-3">
            <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">Access Key</label>
            <input 
              required
              type="password"
              value={authForm.password} 
              onChange={e => setAuthForm({...authForm, password: e.target.value})} 
              className="w-full bg-white/5 border border-white/10 p-4 md:p-5 rounded-2xl md:rounded-3xl text-sm font-bold outline-none focus:border-white transition-all" 
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="w-full py-5 md:py-6 bg-white text-black rounded-2xl md:rounded-[2.5rem] font-black uppercase text-xs tracking-[0.5em] shadow-2xl hover:scale-[1.02] transition-all">
            {authMode === 'login' ? 'Authorize' : 'Initialize'}
          </button>
        </form>

        <div className="text-center pt-6 md:pt-8 border-t border-white/5 space-y-3 md:space-y-4">
          <p className="text-[9px] md:text-[10px] font-black text-zinc-700 uppercase tracking-widest">
            {authMode === 'login' ? "Identity not found?" : "Already established?"}
          </p>
          <button 
            onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
            className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-blue-500 hover:text-white transition-colors"
          >
            {authMode === 'login' ? 'Switch to Initialization' : 'Switch to Authorization'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderApp = () => (
    <div className="pt-24 md:pt-32 pb-20 px-4 sm:px-6 max-w-7xl mx-auto flex flex-col md:flex-row gap-12 md:gap-16">
      <aside className="w-full md:w-1/3 space-y-8 md:space-y-12 animate-in slide-in-from-left-10 duration-1000">
        <div className="glass-panel p-6 md:p-10 rounded-[2rem] md:rounded-[4rem] space-y-4 md:space-y-6 border-white/10 shadow-xl">
          <h3 className="text-[10px] md:text-[12px] font-black uppercase tracking-widest text-zinc-600">1. Data Ingress</h3>
          <label className="block w-full h-56 md:h-80 rounded-2xl md:rounded-[3rem] border-4 border-dashed border-white/5 hover:border-white/20 bg-white/5 transition-all cursor-pointer relative overflow-hidden group">
            {originalImage ? (
              <img src={originalImage} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-all duration-700" alt="i" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 md:gap-6 text-zinc-800 group-hover:text-zinc-600 transition-colors">
                <svg className="w-12 h-12 md:w-16 md:h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.5em]">Input Source</span>
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

        <div className="space-y-4 md:space-y-6">
          <h3 className="text-[10px] md:text-[12px] font-black uppercase tracking-widest text-zinc-600 px-2">2. Stylistic Map</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2 md:space-y-3">
            {ENHANCEMENT_STYLES.map(style => (
              <button 
                key={style.id}
                onClick={() => setSelectedStyle(style)}
                className={`w-full p-4 md:p-6 rounded-xl md:rounded-[2rem] border transition-all text-left flex items-center gap-4 md:gap-6 group ${selectedStyle.id === style.id ? 'bg-white text-black border-white shadow-2xl scale-105' : 'bg-white/5 border-white/5 hover:bg-white/10 text-white'}`}
              >
                <span className="text-2xl md:text-3xl group-hover:scale-125 transition-transform duration-500">{style.icon}</span>
                <div className="flex-1 overflow-hidden">
                  <p className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em]">{style.name}</p>
                  <p className={`text-[8px] md:text-[9px] font-bold truncate opacity-40 ${selectedStyle.id === style.id ? 'text-black' : 'text-white'}`}>{style.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 md:space-y-6">
          <h3 className="text-[10px] md:text-[12px] font-black uppercase tracking-widest text-zinc-600 px-2">3. Variables</h3>
          <input 
            value={chatInput} 
            onChange={e => setChatInput(e.target.value)} 
            placeholder="Reconstruction details..." 
            className="w-full bg-white/5 border border-white/10 p-4 md:p-6 rounded-2xl md:rounded-3xl text-sm font-bold shadow-xl outline-none focus:border-white transition-all"
          />
        </div>

        <button 
          disabled={!originalImage || isProcessing}
          onClick={handleEnhance}
          className="w-full py-6 md:py-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl md:rounded-[3rem] font-black uppercase tracking-[0.4em] text-[9px] md:text-[10px] hover:scale-[1.03] active:scale-95 transition-all shadow-2xl shadow-blue-600/30 disabled:opacity-20 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Synthesizing...' : 'Execute Reconstruction'}
        </button>
      </aside>

      <main className="flex-1 space-y-8 md:space-y-12 animate-in slide-in-from-right-10 duration-1000">
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/5 p-3 md:p-5 rounded-2xl md:rounded-[3rem] border border-white/5 shadow-2xl">
          <div className="flex bg-black/40 rounded-xl md:rounded-3xl p-1 md:p-2 shadow-inner w-full sm:w-auto">
            <button onClick={() => setViewMode('compare')} className={`flex-1 sm:flex-none px-4 md:px-8 py-2 md:py-3 rounded-lg md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase transition-all tracking-widest ${viewMode === 'compare' ? 'bg-white text-black shadow-2xl' : 'text-zinc-600'}`}>Scan View</button>
            <button onClick={() => setViewMode('result')} className={`flex-1 sm:flex-none px-4 md:px-8 py-2 md:py-3 rounded-lg md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase transition-all tracking-widest ${viewMode === 'result' ? 'bg-white text-black shadow-2xl' : 'text-zinc-600'}`}>Final View</button>
          </div>
          {enhancedImage && (
            <a href={enhancedImage} download="neo-augmented.png" className="w-full sm:w-auto text-center px-6 md:px-10 py-3 bg-blue-600 text-white rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/30 hover:bg-blue-500 transition-all">Archive Result</a>
          )}
        </header>

        <div className="glass-panel p-1 md:p-2 rounded-[2.5rem] md:rounded-[5rem] aspect-square md:aspect-video flex items-center justify-center bg-black/40 overflow-hidden relative border-white/5 shadow-inner">
          {enhancedImage ? (
            viewMode === 'compare' ? <ComparisonSlider before={originalImage!} after={enhancedImage} /> : <img src={enhancedImage} className="w-full h-full object-cover rounded-[2.2rem] md:rounded-[4.5rem]" alt="e" />
          ) : isProcessing ? (
            <div className="text-center space-y-6 md:space-y-8">
              <div className="w-12 h-12 md:w-20 md:h-20 border-t-4 border-blue-500 rounded-full animate-spin mx-auto shadow-2xl" />
              <p className="text-[10px] md:text-[12px] font-black uppercase text-zinc-700 tracking-[0.5em] md:tracking-[0.8em] animate-pulse px-4">Syncing Resolution Matrix</p>
            </div>
          ) : originalImage ? (
            <img src={originalImage} className="w-full h-full object-cover rounded-[2.2rem] md:rounded-[4.5rem] opacity-20 blur-xl" alt="p" />
          ) : (
            <div className="text-center opacity-5 space-y-4 md:space-y-8">
              <svg className="w-24 h-24 md:w-40 md:h-40 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              <p className="text-2xl md:text-4xl font-black uppercase tracking-[1em] md:tracking-[1.5em] leading-none">Standby</p>
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
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
      `}</style>

      <nav className="fixed top-0 w-full z-[100] p-4 md:p-8 pointer-events-none">
        <div className="max-w-7xl mx-auto glass-panel border-white/10 px-4 md:px-10 py-3 md:py-4 rounded-[1.8rem] md:rounded-[3rem] flex items-center justify-between backdrop-blur-3xl shadow-2xl pointer-events-auto">
          <div className="flex items-center gap-3 md:gap-6 cursor-pointer group" onClick={() => setActiveTab('home')}>
            <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-xl md:text-3xl overflow-hidden shadow-xl group-hover:scale-110 transition-transform duration-500" style={{ background: `linear-gradient(135deg, ${settings.themePrimary}, ${settings.themeSecondary})` }}>
              {settings.logoUrl ? <img src={settings.logoUrl} className="w-full h-full object-cover" alt="logo" /> : settings.logoText}
            </div>
            <span className="text-xl md:text-3xl font-black tracking-tighter uppercase hidden sm:inline truncate max-w-[120px] md:max-w-none">{settings.siteName}</span>
          </div>
          
          <div className="flex items-center gap-4 md:gap-12">
            {currentUser ? (
              <>
                <button onClick={() => setActiveTab('app')} className="text-[10px] md:text-[12px] font-black uppercase text-zinc-500 hover:text-white transition-all tracking-[0.2em] md:tracking-[0.3em]">Studio</button>
                <div 
                  className="flex items-center gap-3 md:gap-5 bg-white/5 px-4 md:px-6 py-2 md:py-3 rounded-[1.5rem] md:rounded-[2rem] border border-white/5 hover:bg-white/10 cursor-pointer shadow-xl transition-all group"
                  onClick={() => setActiveTab('profile')}
                >
                  <span className={`text-[9px] md:text-[11px] font-black uppercase tracking-widest ${currentUser.role === 'vip' ? 'text-amber-500' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
                    {currentUser.role === 'vip' ? 'Infinite' : `${currentUser.credits} U`}
                  </span>
                  <img src={currentUser.photo} className="w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-2xl shadow-2xl border-2 border-white/5 group-hover:border-white/20 transition-all" alt="a" />
                </div>
              </>
            ) : (
              <button onClick={() => { setAuthMode('signup'); setActiveTab('auth'); }} className="px-6 md:px-10 py-3 md:py-4 bg-white text-black rounded-xl md:rounded-3xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.4em] hover:scale-105 transition-all shadow-2xl whitespace-nowrap">Deploy Identity</button>
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

      {activeTab === 'home' && (
        <footer className="max-w-7xl mx-auto px-6 mt-32 md:mt-60 pb-16 md:pb-24 text-center opacity-20 border-t border-white/5 pt-16 md:pt-24 space-y-6 md:space-y-8">
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            {['Architecture', 'Privacy', 'Compliance', 'Identity'].map(link => (
              <span key={link} className="text-[9px] md:text-[11px] font-black uppercase tracking-widest">{link}</span>
            ))}
          </div>
          <p className="text-[8px] md:text-[10px] uppercase font-black tracking-[1em] md:tracking-[1.5em] text-zinc-600 px-4">{settings.siteName} Intelligence Network // Stabilized v4.0</p>
        </footer>
      )}

      {error && (
        <div className="fixed bottom-6 md:bottom-12 left-1/2 -translate-x-1/2 px-8 md:px-12 py-4 md:py-6 bg-red-600 rounded-[2rem] md:rounded-[3rem] text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] md:tracking-[0.4em] shadow-[0_20px_90px_rgba(220,38,38,0.5)] animate-bounce z-[1000] text-center w-[90%] md:w-auto">
          {error}
        </div>
      )}
    </div>
  );
};

export default App;
