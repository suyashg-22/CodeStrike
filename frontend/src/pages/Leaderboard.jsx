import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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
    // Play music when they enter the Leaderboard
    audioCache.bgm.play().catch(() => {});
    
    // Pause music when they leave the Leaderboard
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
    <div className="min-h-screen flex flex-col bg-gray-950 text-white font-sans relative overflow-hidden py-10 px-4">
      {/* Background Grid Styling */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      <div className="relative z-10 max-w-4xl mx-auto w-full">
        
        <div className="flex justify-between items-center mb-10 border-b border-gray-800 pb-4">
          <h1 className="text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600 uppercase">
            Hall of Legends
          </h1>
          <button 
            onClick={handleBack}
            className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded tracking-widest uppercase transition-colors"
          >
            Back to HQ
          </button>
        </div>

        {isLoading ? (
          <div className="text-center text-blue-400 animate-pulse text-xl tracking-widest font-bold">
            SCANNING SERVER POWER LEVELS...
          </div>
        ) : (
          <div className="space-y-4">
            {fighters.map((fighter, index) => {
              const tier = getEloTier(fighter.elo);
              
              // Add special glowing borders for the Top 3
              let borderStyle = "border-gray-800 hover:border-gray-600";
              if (index === 0) borderStyle = "border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)] bg-yellow-900/10";
              if (index === 1) borderStyle = "border-gray-400 shadow-[0_0_15px_rgba(156,163,175,0.2)] bg-gray-800/30";
              if (index === 2) borderStyle = "border-orange-700 shadow-[0_0_15px_rgba(194,65,12,0.2)] bg-orange-900/20";

              return (
                <div key={fighter._id} className={`flex items-center justify-between p-6 bg-gray-900 border rounded-lg transition-all ${borderStyle}`}>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-3xl font-black text-gray-600 w-10 text-center">
                      #{index + 1}
                    </div>
                    <div>
                      <div className={`text-2xl font-black uppercase tracking-wider ${index === 0 ? 'text-yellow-500' : 'text-white'}`}>
                        {fighter.username}
                      </div>
                      <div className={`text-sm font-bold tracking-widest uppercase ${tier.color}`}>
                        {tier.title}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8 text-right">
                    <div className="hidden md:block">
                      <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Win Rate</div>
                      <div className="text-lg font-bold text-gray-300">
                        {fighter.wins + fighter.losses > 0 
                          ? Math.round((fighter.wins / (fighter.wins + fighter.losses)) * 100) + '%' 
                          : '0%'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Power Level</div>
                      <div className={`text-3xl font-black ${tier.color} ${tier.shadow}`}>
                        {fighter.elo}
                      </div>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}