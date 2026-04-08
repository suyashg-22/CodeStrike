import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import socket from '../socket';
import { motion, AnimatePresence } from 'framer-motion';

// Pre-load Dashboard audio
const audioCache = {
  bgm: new Audio('/sounds/meteor.mp3'),
  teleport: new Audio('/sounds/dbz-teleport.mp3'),
  button: new Audio('/sounds/buttonPress.mp3'),
  // Optional: You can add a lightning sound effect here if you download one!
  // thunder: new Audio('/sounds/thunder.mp3') 
};
audioCache.bgm.loop = true;
audioCache.bgm.volume = 0.3;

const getEloTier = (elo) => {
  const currentElo = elo || 1000;
  if (currentElo >= 2100) return { title: 'Angel / Ultra Instinct', color: 'text-white', shadow: 'drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]' };
  if (currentElo >= 1900) return { title: 'God of Destruction', color: 'text-purple-500', shadow: 'drop-shadow-[0_0_15px_rgba(168,85,247,0.8)]' };
  if (currentElo >= 1700) return { title: 'Majin Threat', color: 'text-pink-500', shadow: 'drop-shadow-[0_0_15px_rgba(236,72,153,0.8)]' };
  if (currentElo >= 1500) return { title: 'Super Saiyan', color: 'text-yellow-400', shadow: 'drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]' };
  if (currentElo >= 1300) return { title: 'Elite Saiyan', color: 'text-blue-500', shadow: 'drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]' };
  if (currentElo >= 1100) return { title: 'Namekian Warrior', color: 'text-green-500', shadow: 'drop-shadow-[0_0_15px_rgba(34,197,94,0.8)]' };
  return { title: 'Earthling Fighter', color: 'text-orange-400', shadow: 'drop-shadow-[0_0_10px_rgba(251,146,60,0.5)]' };
};

export default function Dashboard() {
  const [profileData, setProfileData] = useState(null);
  const [matchHistory, setMatchHistory] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // STATE: Controls the cinematic weather events
  const [cinematicPhase, setCinematicPhase] = useState('idle'); 
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      axios.get(`https://code-strike-backend.onrender.com/api/auth/profile/${user._id}`)
        .then(res => {
          setProfileData(res.data.user);
          setMatchHistory(res.data.history);
        })
        .catch(err => console.error("Failed to load profile", err));
    } else {
      navigate('/login'); 
    }
  }, [navigate]);

  useEffect(() => {
    const startAudio = () => {
      audioCache.bgm.play().catch(() => { });
      document.removeEventListener('click', startAudio);
    };

    audioCache.bgm.play().catch(() => {
      document.addEventListener('click', startAudio);
    });

    const handleGlobalClick = (e) => {
      if (e.target.tagName.toLowerCase() === 'button') {
        audioCache.button.currentTime = 0;
        audioCache.button.play().catch(() => { });
      }
    };
    document.addEventListener('click', handleGlobalClick);

    const handleMatchFound = (data) => {
      setIsSearching(false);
      audioCache.bgm.pause();
      audioCache.bgm.currentTime = 0;
      navigate('/arena', {
        state: { 
          matchId: data.matchId, 
          problemId: data.problemId, 
          startTime: data.startTime,
          duration: data.duration // <-- NEW: Passes the time limit to the Arena!
        }
      });
    };

    socket.on('match_found', handleMatchFound);

    // THE CINEMATIC ENGINE
    const cinematicInterval = setInterval(() => {
      // 1. Lightning flashes
      setCinematicPhase('lightning');
      
      // 2. Clear Lightning, Shenron drops from above
      setTimeout(() => {
        setCinematicPhase('shenron');
      }, 300); // Lightning flash duration

      // 3. Clear Shenron
      setTimeout(() => {
        setCinematicPhase('idle');
      }, 3300); // Shenron hangs around for 3 seconds
      
    }, 10000); // Cycle loops every 10 seconds

    return () => {
      socket.off('match_found', handleMatchFound);
      document.removeEventListener('click', startAudio);
      document.removeEventListener('click', handleGlobalClick);
      audioCache.bgm.pause(); 
      clearInterval(cinematicInterval); // Cleanup interval!
    };
  }, [navigate]);

  const handleFindMatch = () => {
    setIsSearching(true);
    audioCache.teleport.currentTime = 0;
    audioCache.teleport.play().catch(() => { });

    const user = JSON.parse(localStorage.getItem('user'));
    socket.emit('find_match', { userId: user._id, elo: profileData?.elo || 1000 });
  };

  // NEW: Logout Function
  const handleLogout = () => {
    audioCache.button.currentTime = 0;
    audioCache.button.play().catch(() => {});
    
    // Clear auth tokens
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Teleport back to Gateway
    navigate('/login');
  };

  return (
    <div 
      className="min-h-screen flex flex-col text-white font-sans relative overflow-hidden bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/backgrounds/kamehouse.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/60 z-0"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] z-10 pointer-events-none"></div>

      {/* --- HIGH Z-INDEX CINEMATIC OVERLAYS --- */}
      <AnimatePresence>
        {cinematicPhase === 'lightning' && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}
            className="fixed inset-0 z-[999] pointer-events-none flex items-center justify-center bg-white/30 mix-blend-screen"
          >
            <img src="/characters/lightning.png" className="w-full h-full object-cover opacity-100" alt="lightning" />
          </motion.div>
        )}

        {cinematicPhase === 'shenron' && (
          <motion.img 
            initial={{ opacity: 0, y: -800 }} 
            animate={{ opacity: 0.9, y: -50 }} 
            exit={{ opacity: 0, y: -800 }}
            transition={{ duration: 1.2, type: "spring", bounce: 0.3 }}
            src="/characters/shenron.png" 
            className="fixed top-0 right-8 h-[85vh] object-contain z-[998] pointer-events-none drop-shadow-[0_0_50px_rgba(34,197,94,0.6)] mix-blend-screen"
            alt="shenron"
          />
        )}
      </AnimatePresence>
      {/* --- END CINEMATIC OVERLAYS --- */}

      {/* --- FIXED DIORAMA (Studytable & Goku) --- */}
      <div className="hidden xl:block fixed bottom-0 right-4 z-[50] pointer-events-none drop-shadow-2xl">
        <div className="relative w-[300px] h-[240px] flex items-end justify-center">
          <motion.img 
            animate={{ y: [0, 2, 0] }} 
            transition={{ duration: 3, repeat: Infinity }} 
            src="/characters/goku_sitting.png" 
            className="absolute bottom-[100px] right-[100px] w-[110px] z-10 drop-shadow-lg" 
            alt="goku" 
          />
          <img 
            src="/characters/studytable.png" 
            className="absolute bottom-0 right-0 w-full z-20 drop-shadow-2xl" 
            alt="study table" 
          />
        </div>
      </div>
      {/* --- END DIORAMA --- */}

      <div className="relative z-20 container mx-auto px-4 py-8 flex flex-col h-full">
        {/* HEADER SECTION */}
        <div className="flex justify-between items-center mb-12 border-b border-white/20 pb-4 shrink-0 relative">
          
          <div className="flex items-center gap-4">
            <h1 className="text-6xl font-saiyan tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] uppercase">
              Code Strike HQ
            </h1>
            <motion.img 
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              src="/characters/dragonball.png" 
              className="w-12 h-12 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]"
              alt="dragonball"
            />
          </div>

          <div className="flex items-center gap-4 relative z-30">
            {/* FIXED: Logged In As moved to the far left of the button group */}
            <div className="text-right border-r border-white/20 pr-4">
              <div className="text-gray-400 text-sm tracking-widest uppercase drop-shadow-md">Logged in as</div>
              <div className="text-2xl font-bold text-white uppercase drop-shadow-md">{profileData?.username || 'Fighter'}</div>
            </div>

            <button 
              onClick={() => { 
                audioCache.button.currentTime = 0;
                audioCache.button.play().catch(()=>{});
                navigate('/training'); 
              }}
              className="px-4 py-2 bg-black/40 hover:bg-black/60 text-yellow-400 font-black rounded tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] border border-yellow-500/30 backdrop-blur-md cursor-pointer"
            >
              ⏱️ Time Chamber
            </button>

            <button 
              onClick={() => { 
                audioCache.button.currentTime = 0;
                audioCache.button.play().catch(()=>{});
                navigate('/leaderboard'); 
              }}
              className="px-4 py-2 bg-black/40 hover:bg-black/60 border border-white/20 text-white font-bold rounded tracking-widest uppercase transition-colors backdrop-blur-md cursor-pointer"
            >
              🏆 Global Rankings
            </button>

            {/* NEW: Secure Logout Button added to the far right */}
            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 text-white font-bold rounded tracking-widest uppercase transition-colors backdrop-blur-md cursor-pointer"
            >
              🚪 Logout
            </button>
          </div>
        </div>

        {/* MAIN LAYOUT: Split Screen */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0 relative z-20">
          
          {/* LEFT COLUMN */}
          <div className="lg:col-span-1 flex flex-col gap-4 lg:max-h-[calc(100vh-200px)]">
            
            {/* COMBAT RECORD PANEL (Fixed: Highly Transparent bg-black/20) */}
            <div className="bg-black/20 border border-white/10 backdrop-blur-sm p-4 rounded-lg shadow-xl shrink-0 hover:bg-black/30 transition-colors">
              <h2 className="text-lg font-black text-gray-400 uppercase tracking-widest mb-4 border-b border-white/10 pb-2">Combat Record</h2>
              
              <div className="mb-6">
                <div className="text-xs text-gray-300 uppercase tracking-[0.3em] mb-1">Power Level (Elo)</div>
                <div className={`text-7xl font-saiyan tracking-widest ${getEloTier(profileData?.elo).color} ${getEloTier(profileData?.elo).shadow}`}>
                  {profileData?.elo || 1000}
                </div>
                <div className={`mt-1 text-xs font-bold tracking-widest uppercase ${getEloTier(profileData?.elo).color}`}>
                  Class: {getEloTier(profileData?.elo).title}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-black/10 p-3 rounded border border-white/10 text-center shadow-inner">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Mastered</div>
                  <div className="text-xl font-bold text-yellow-500">{profileData?.solvedProblems?.length || 0}</div>
                </div>
                <div className="bg-black/10 p-3 rounded border border-white/10 text-center shadow-inner">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Victories</div>
                  <div className="text-xl font-bold text-green-500">{profileData?.wins || 0}</div>
                </div>
                <div className="bg-black/10 p-3 rounded border border-white/10 text-center shadow-inner">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Defeats</div>
                  <div className="text-xl font-bold text-red-500">{profileData?.losses || 0}</div>
                </div>
              </div>
            </div>

            {/* RADAR PANEL (Fixed: Highly Transparent bg-black/20) */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-black/20 border border-white/10 backdrop-blur-sm rounded-lg min-h-[200px] shrink-0 shadow-2xl relative overflow-hidden">
              {!isSearching ? (
                <button 
                  onClick={handleFindMatch}
                  className="group relative w-full py-4 font-black text-2xl tracking-widest uppercase bg-blue-600 hover:bg-blue-500 text-white rounded shadow-[0_0_40px_rgba(37,99,235,0.5)] transition-all transform hover:scale-105 active:scale-95 z-10"
                >
                  Enter Arena
                  <div className="absolute inset-0 rounded bg-blue-400 blur-md opacity-0 group-hover:opacity-30 transition-opacity"></div>
                </button>
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full z-10">
                  <div className="relative w-20 h-20 mb-4 shrink-0">
                    <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                    <div className="absolute inset-4 bg-blue-500/10 rounded-full animate-pulse"></div>
                  </div>
                  <h2 className="text-xl font-bold text-blue-400 animate-pulse tracking-widest text-center shrink-0 drop-shadow-md"> SCANNING... </h2>
                  <button onClick={() => { setIsSearching(false); socket.emit('cancel_search'); }} className="mt-4 text-xs text-gray-300 hover:text-red-400 transition underline tracking-widest shrink-0" > ABORT SEARCH </button>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN */}
          {/* RECENT BATTLES PANEL (Fixed: Highly Transparent bg-black/20) */}
          <div className="lg:col-span-2 bg-black/20 border border-white/10 backdrop-blur-sm rounded-lg p-6 flex flex-col overflow-hidden lg:max-h-[calc(100vh-200px)] min-h-[500px] shadow-xl relative z-40">
            <h2 className="text-xl font-black text-gray-400 uppercase tracking-widest mb-6 border-b border-white/10 pb-2 shrink-0">Recent Battles</h2>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {matchHistory.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-300 italic tracking-wider"> No combat data found. Enter the arena to begin your legacy. </div>
              ) : (
                <div className="space-y-3">
                  {matchHistory.map((match) => {
                    const user = JSON.parse(localStorage.getItem('user'));
                    const isWinner = match.winnerId._id === user._id;
                    const opponent = isWinner ? match.loserId.username : match.winnerId.username;

                    return (
                      // Changed individual rows to highly transparent bg-black/10
                      <div key={match._id} className="flex items-center justify-start gap-8 md:gap-16 bg-black/10 border border-white/5 p-4 rounded hover:border-blue-500/50 hover:bg-blue-900/30 transition-all transform hover:translate-x-1">
                        
                        {/* COLUMN 1: Victory / Defeat */}
                        <div className="flex items-center gap-4 min-w-[150px]">
                          <div className={`w-2 h-12 rounded ${isWinner ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}></div>
                          <div>
                            <div className={`text-lg font-bold tracking-wider uppercase ${isWinner ? 'text-green-400' : 'text-red-400'}`}>{isWinner ? 'VICTORY' : 'DEFEAT'}</div>
                            <div className="text-sm text-gray-300"> vs <span className="text-white font-bold uppercase drop-shadow-md">{opponent}</span></div>
                          </div>
                        </div>
                        
                        {/* COLUMN 2: Algorithm */}
                        <div className="hidden md:block text-left min-w-[150px]">
                          <div className="text-xs text-gray-300 uppercase tracking-widest">Algorithm</div>
                          <div className="text-sm text-gray-100 truncate font-medium drop-shadow-md">{match.problemId?.title || 'Unknown'}</div>
                        </div>

                        {/* COLUMN 3: Elo Shift */}
                        <div className="text-left min-w-[80px]">
                          <div className="text-xs text-gray-300 uppercase tracking-widest">Elo Shift</div>
                          <div className={`text-3xl font-saiyan drop-shadow-md ${isWinner ? 'text-green-500' : 'text-red-500'}`}>{isWinner ? '+' : '-'}{match.eloChange || 0}</div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}