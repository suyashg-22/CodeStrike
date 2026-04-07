import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';

const audioCache = {
  button: new Audio('/sounds/buttonPress.mp3'),
  bgm: new Audio('/sounds/meteor.mp3')
};

audioCache.bgm.loop = true;
audioCache.bgm.volume = 0.3;

export default function Login() {
  const [isLoginView, setIsLoginView] = useState(true);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user && user !== "undefined") {
      navigate('/dashboard');
    }

    const startAudio = () => {
      audioCache.bgm.play().catch(() => { });
      document.removeEventListener('click', startAudio);
    };
    document.addEventListener('click', startAudio);

    return () => {
      document.removeEventListener('click', startAudio);
      audioCache.bgm.pause();
    };
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const playClick = () => {
    audioCache.button.currentTime = 0;
    audioCache.button.play().catch(() => { });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    playClick();
    setIsLoading(true);
    setError('');

    const endpoint = isLoginView ? '/login' : '/register';

    try {
      const res = await axios.post(`http://localhost:5000/api/auth${endpoint}`, formData);
      const userData = res.data.user;
      
      if (!userData || !userData._id) {
        setError("Backend Auth Error: Server did not return the user ID.");
        setIsLoading(false);
        return; 
      }

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(userData));

      audioCache.bgm.pause();
      navigate('/dashboard');

    } catch (err) {
      setError(err.response?.data?.message || 'A network anomaly occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-start px-4 md:px-20 lg:px-32 bg-cover bg-center relative overflow-hidden pb-16"
      style={{ backgroundImage: "url('/backgrounds/kamilookout.jpg')" }}
    >
      {/* Background Overlays - Kept light so the image pops */}
      <div className="absolute inset-0 bg-black/30 z-0"></div> 
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] z-0"></div>

      {/* --- SCENE COMPOSITION --- */}
      
      {/* 1. Guardian Piccolo */}
      <motion.img 
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 0.95, x: 0, y: [0, -15, 0] }}
        transition={{ 
          opacity: { duration: 1.5 }, 
          x: { duration: 1.5, type: "spring" },
          y: { duration: 5, repeat: Infinity, ease: "easeInOut" } 
        }}
        src="/characters/piccolo.png" 
        alt="Guardian"
        className="hidden lg:block absolute right-0 bottom-10 h-[90vh] object-contain z-10 drop-shadow-[0_0_20px_rgba(34,197,94,0.3)] pointer-events-none"
      />

      {/* 2. Floating Tech Stack (FIXED: High contrast, re-positioned to avoid Piccolo, added laptop & notebook) */}
      <motion.img 
        animate={{ y: [0, 20, 0], rotate: [0, 5, -5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        src="/characters/javascript.png" 
        className="hidden lg:block absolute right-[95%] top-[5%] w-16 opacity-100 brightness-110 drop-shadow-[0_10px_15px_rgba(0,0,0,0.8)] z-10 pointer-events-none"
      />
      <motion.img 
        animate={{ y: [0, -25, 0], rotate: [0, -10, 10, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        src="/characters/python.png" 
        className="hidden lg:block absolute right-[95%] top-[30%] w-16 opacity-100 brightness-110 drop-shadow-[0_10px_15px_rgba(0,0,0,0.8)] z-10 pointer-events-none"
      />
      <motion.img 
        animate={{ y: [0, 15, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        src="/characters/c++.png" 
        className="hidden lg:block absolute right-[94%] top-[50%] w-24 opacity-100 brightness-110 drop-shadow-[0_10px_15px_rgba(0,0,0,0.8)] z-10 pointer-events-none"
      />
      <motion.img 
        animate={{ y: [0, -15, 0], rotate: [0, 2, -2, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        src="/characters/laptop.png" 
className="hidden lg:block absolute right-[94%] bottom-[15%] w-20 opacity-100 brightness-110 drop-shadow-[0_10px_15px_rgba(0,0,0,0.8)] z-10 pointer-events-none"
      />
      <motion.img 
        animate={{ y: [0, 25, 0], rotate: [0, -5, 5, 0] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        src="/characters/notebook.png" 
        className="hidden lg:block absolute right-[25%] bottom-[40%] w-20 opacity-100 brightness-110 drop-shadow-[0_10px_15px_rgba(0,0,0,0.8)] z-10 pointer-events-none"
      />
      {/* --- END SCENE COMPOSITION --- */}

      {/* LOGIN CARD */}
      <div className="relative z-20 w-full max-w-md p-8 bg-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        
        {/* Dragonball (FIXED: Moved to the bottom right, away from input fields) */}
        <motion.img 
          animate={{ rotate: 360, y: [0, -5, 0] }}
          transition={{ rotate: { duration: 25, repeat: Infinity, ease: "linear" }, y: { duration: 4, repeat: Infinity, ease: "easeInOut" } }}
          src="/characters/dragonball.png" 
          className="absolute -bottom-8 -right-8 w-24 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)] opacity-100 pointer-events-none z-30"
        />

        <div className="text-center mb-8">
          <h1 className="text-6xl font-saiyan tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] text-center mb-2 uppercase">
            Code Strike
          </h1>
          <p className="text-gray-400 text-xs tracking-[0.3em] uppercase font-bold">
            {isLoginView ? 'Identify Yourself, Fighter' : 'Register for the Tournament'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-900/30 border border-red-500 rounded text-red-400 text-sm text-center font-bold tracking-wider animate-pulse">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 relative z-20">
          {!isLoginView && (
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Fighter Tag (Username)</label>
              <input type="text" name="username" value={formData.username} onChange={handleChange} required={!isLoginView} className="w-full bg-[#0d1117]/80 border border-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-mono text-sm shadow-inner" placeholder="e.g. SuperSaiyan99" />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full bg-[#0d1117]/80 border border-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-mono text-sm shadow-inner" placeholder="fighter@earth.com" />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Password</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} required className="w-full bg-[#0d1117]/80 border border-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-mono text-sm shadow-inner" placeholder="••••••••" />
          </div>

          <button type="submit" disabled={isLoading} className="w-full py-4 mt-2 font-black text-lg tracking-widest uppercase bg-blue-600 hover:bg-blue-500 text-white rounded shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:transform-none">
            {isLoading ? 'Verifying...' : (isLoginView ? 'Login' : 'Register')}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-gray-700/50 pt-6 relative z-20">
          <p className="text-gray-400 text-xs uppercase tracking-wider">
            {isLoginView ? "Don't have a combat record? " : "Already registered? "}
            <button type="button" onClick={() => { playClick(); setIsLoginView(!isLoginView); setError(''); }} className="text-yellow-400 hover:text-yellow-300 font-black tracking-widest transition-colors ml-2">
              {isLoginView ? 'Register Here' : 'Login Here'}
            </button>
          </p>
        </div>
      </div>

      {/* FIXED: The Sleek Horizontal Footer HUD */}
      <div className="absolute bottom-0 left-0 w-full bg-black/60 backdrop-blur-md border-t border-white/10 p-3 lg:p-4 z-30 hidden md:flex justify-center gap-8 lg:gap-24 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        
        <div className="flex items-center gap-3">
          <span className="text-blue-400 text-xl drop-shadow-md">⚔️</span>
          <div>
            <h4 className="text-white text-xs font-black tracking-widest uppercase">Real-Time Combat</h4>
            <p className="text-gray-400 text-[10px] font-mono mt-0.5">1v1 Algorithm Duels. Compile faster to win.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 border-l border-white/10 pl-8 lg:pl-24">
          <span className="text-yellow-400 text-xl drop-shadow-md">🏆</span>
          <div>
            <h4 className="text-white text-xs font-black tracking-widest uppercase">Global Rankings</h4>
            <p className="text-gray-400 text-[10px] font-mono mt-0.5">Ascend the DBZ Elo Tier System.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 border-l border-white/10 pl-8 lg:pl-24">
          <span className="text-green-400 text-xl drop-shadow-md">⏱️</span>
          <div>
            <h4 className="text-white text-xs font-black tracking-widest uppercase">Solo Practice</h4>
            <p className="text-gray-400 text-[10px] font-mono mt-0.5">Master logic in the Hyperbolic Time Chamber.</p>
          </div>
        </div>

      </div>

    </div>
  );
}