import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';

// Re-use the DBZ Elo Ranking System
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

// The Ranking Chart Data
const rankingChart = [
  { title: 'Angel / UI', min: 2100, color: 'text-white', shadow: 'drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]', img: '/characters/ultrainstinct.png' },
  { title: 'God of Destruction', min: 1900, color: 'text-purple-400', shadow: 'drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]', img: '/characters/beerus.png' },
  { title: 'Majin Threat', min: 1700, color: 'text-pink-500', shadow: 'drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]', img: '/characters/superbuu.png' },
  { title: 'Super Saiyan', min: 1500, color: 'text-yellow-400', shadow: 'drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]', img: '/characters/supersaiyan3.png' },
  { title: 'Elite Saiyan', min: 1300, color: 'text-blue-400', shadow: 'drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]', img: '/characters/gohan.png' },
  { title: 'Namekian Warrior', min: 1100, color: 'text-green-500', shadow: 'drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]', img: '/characters/piccolo.png' },
  { title: 'Earthling Fighter', min: 0, color: 'text-orange-400', shadow: 'drop-shadow-[0_0_10px_rgba(251,146,60,0.5)]', img: '/characters/videl.png' },
];

const audioCache = {
  button: new Audio('/sounds/buttonPress.mp3'),
  bgm: new Audio('/sounds/meteor.mp3')
};
audioCache.bgm.loop = true;
audioCache.bgm.volume = 0.3;

export default function Leaderboard() {
  const [fighters, setFighters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('http://localhost:5000/api/auth/leaderboard')
      .then(res => {
        setFighters(res.data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to load leaderboard", err);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    audioCache.bgm.play().catch(() => {});
    return () => {
      audioCache.bgm.pause();
    };
  }, []);
  
  const handleBack = () => {
    audioCache.button.currentTime = 0;
    audioCache.button.play().catch(() => {});
    navigate('/dashboard');
  };

  return (
    <div 
      className="min-h-screen flex flex-col font-sans relative overflow-hidden py-10 px-4 bg-cover bg-center bg-fixed text-white"
      style={{ backgroundImage: "url('/backgrounds/allcharacters.jpg')" }}
    >
      {/* STRIPPED OUT THE BLUR ENTIRELY: Just a very light black tint so the background is crystal clear */}
      <div className="absolute inset-0 bg-black/20 z-0"></div>

      <div className="relative z-10 w-full max-w-[1400px] mx-auto flex flex-col items-start px-4 md:px-10 h-full">
        
        {/* HEADER */}
        <div className="w-full flex justify-between items-center mb-8 border-b border-white/20 pb-4 shrink-0">
          <h1 className="text-6xl font-saiyan tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600 uppercase drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">
            Hall of Legends
          </h1>
          <button 
            onClick={handleBack}
            className="px-6 py-2 bg-black/60 border border-white/20 text-white font-bold rounded tracking-widest uppercase transition-colors shadow-lg hover:bg-black/80"
          >
            Back to HQ
          </button>
        </div>

        <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0 overflow-hidden">
          
          {/* LEFT SIDE: The Leaderboard List */}
          <div className="lg:col-span-2 flex flex-col h-full overflow-hidden">
            {isLoading ? (
              <div className="text-center w-full text-blue-400 animate-pulse text-2xl tracking-widest font-black mt-20 drop-shadow-md">
                SCANNING SERVER POWER LEVELS...
              </div>
            ) : (
              <div className="space-y-3 w-full pb-10 overflow-y-auto pr-2 custom-scrollbar max-h-[75vh]">
                {fighters.map((fighter, index) => {
                  const tier = getEloTier(fighter.elo);
                  
                  {/* THE CREATIVE FIX: Gradients! Dark on the left for reading, completely transparent on the right to see the characters */}
                  let borderStyle = "border-white/10 bg-gradient-to-r from-black/90 via-black/40 to-transparent hover:via-black/60";
                  if (index === 0) borderStyle = "border-yellow-400/50 bg-gradient-to-r from-yellow-900/90 via-yellow-900/40 to-transparent shadow-[0_0_15px_rgba(250,204,21,0.2)]";
                  if (index === 1) borderStyle = "border-gray-300/50 bg-gradient-to-r from-gray-800/90 via-gray-800/40 to-transparent shadow-[0_0_15px_rgba(209,213,219,0.2)]";
                  if (index === 2) borderStyle = "border-orange-500/50 bg-gradient-to-r from-orange-900/90 via-orange-900/40 to-transparent shadow-[0_0_15px_rgba(249,115,22,0.2)]";

                  return (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}
                      key={fighter._id} 
                      // Removed backdrop-blur entirely from the rows!
                      className={`flex items-center justify-between p-4 md:p-5 rounded-xl border-l-4 border-y border-r transition-all w-full ${borderStyle}`}
                    >
                      
                      {/* Left Side: Rank & Name */}
                      <div className="flex items-center gap-6 md:gap-8">
                        <div className={`text-5xl font-saiyan w-12 text-center drop-shadow-[0_2px_2px_rgba(0,0,0,1)] ${index < 3 ? 'text-white' : 'text-gray-300'}`}>
                          #{index + 1}
                        </div>
                        <div className="text-left">
                          <div className={`text-2xl md:text-3xl font-black uppercase tracking-wider drop-shadow-[0_2px_2px_rgba(0,0,0,1)] ${index === 0 ? 'text-yellow-400' : 'text-white'}`}>
                            {fighter.username}
                          </div>
                          <div className={`text-xs md:text-sm font-bold tracking-widest uppercase drop-shadow-[0_2px_2px_rgba(0,0,0,1)] ${tier.color}`}>
                            {tier.title}
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Stats (Now highly transparent to show background) */}
                      <div className="flex items-center gap-6 md:gap-12 text-right pr-4">
                        <div className="hidden md:block">
                          <div className="text-xs text-gray-300 uppercase tracking-widest mb-1 drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">Win Rate</div>
                          <div className="text-2xl font-bold text-white drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">
                            {fighter.wins + fighter.losses > 0 
                              ? Math.round((fighter.wins / (fighter.wins + fighter.losses)) * 100) + '%' 
                              : '0%'}
                          </div>
                        </div>
                        <div className="min-w-[100px] md:min-w-[120px]">
                          <div className="text-xs text-gray-300 uppercase tracking-widest mb-1 drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">Power Level</div>
                          <div className={`text-4xl md:text-5xl font-saiyan drop-shadow-[0_3px_3px_rgba(0,0,0,1)] ${tier.color} ${tier.shadow}`}>
                            {fighter.elo}
                          </div>
                        </div>
                      </div>

                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT SIDE: The Classifications Index */}
          <div className="lg:col-span-1 hidden lg:flex flex-col h-[75vh]">
            
            {/* FIXED: Replaced heavy glass with a sleek dark-to-transparent gradient */}
            <div className="bg-gradient-to-bl from-black/90 to-black/20 border border-white/20 rounded-xl p-4 shadow-[0_0_30px_rgba(0,0,0,0.8)] h-full flex flex-col">
              
              <div className="text-center border-b border-white/20 pb-3 mb-2 shrink-0">
                <h2 className="text-4xl font-saiyan tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-[0_2px_2px_rgba(0,0,0,1)] uppercase">
                  Classifications
                </h2>
                <p className="text-[10px] text-gray-300 font-bold tracking-[0.2em] uppercase mt-1 drop-shadow-md">Official Tournament Tiers</p>
              </div>

              {/* FIXED SCROLLING: Used flex-1 and justify-between so it auto-spaces the 7 items perfectly! */}
              <div className="flex-1 flex flex-col justify-between py-2">
                {rankingChart.map((rank, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-1.5 md:p-2 hover:bg-white/10 transition-colors rounded-lg group">
                    
                    {/* Reduced icon size slightly to guarantee a perfect fit */}
                    <div className="w-10 h-10 shrink-0 flex items-center justify-center bg-black/50 rounded-full border border-white/20 group-hover:scale-110 transition-transform">
                      <img src={rank.img} alt={rank.title} className="max-w-full max-h-full object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
                    </div>

                    <div className="flex-1">
                      <div className={`text-[11px] md:text-xs font-black uppercase tracking-wider drop-shadow-[0_2px_2px_rgba(0,0,0,1)] ${rank.color} ${rank.shadow}`}>
                        {rank.title}
                      </div>
                      <div className="text-[9px] md:text-[10px] text-gray-300 font-mono mt-0.5 drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
                        REQ ELO: <span className="text-white font-bold">{rank.min}+</span>
                      </div>
                    </div>

                  </div>
                ))}
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}