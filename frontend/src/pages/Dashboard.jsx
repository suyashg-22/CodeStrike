import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // <-- FIXED: Added axios import
import socket from '../socket';

// Pre-load Dashboard audio
const audioCache = {
  bgm: new Audio('/sounds/meteor.mp3'),
  teleport: new Audio('/sounds/dbz-teleport.mp3'),
  button: new Audio('/sounds/buttonPress.mp3')
};
// Loop the background music and lower the volume so it's not deafening
audioCache.bgm.loop = true;
audioCache.bgm.volume = 0.3;

// DBZ Elo Ranking System
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
  const navigate = useNavigate();

  // Fetch Database Stats on Load
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      axios.get(`http://localhost:5000/api/auth/profile/${user._id}`)
        .then(res => {
          setProfileData(res.data.user);
          setMatchHistory(res.data.history);
        })
        .catch(err => console.error("Failed to load profile", err));
    } else {
      navigate('/login'); // Redirect if not logged in
    }
  }, [navigate]);

  useEffect(() => {
    // 1. Define the fallback function FIRST so JavaScript knows it exists
    const startAudio = () => {
      audioCache.bgm.play().catch(() => {});
      document.removeEventListener('click', startAudio);
    };

    // 2. Try to play Background Music immediately
    audioCache.bgm.play().catch(() => {
      // 3. If the browser blocks autoplay, attach the click listener
      document.addEventListener('click', startAudio);
    });

    // 4. Add generic button click sound to all buttons on the page
    const handleGlobalClick = (e) => {
      if (e.target.tagName.toLowerCase() === 'button') {
        audioCache.button.currentTime = 0;
        audioCache.button.play().catch(() => {});
      }
    };
    document.addEventListener('click', handleGlobalClick);

    // 5. Listen for the 'match_found' event from the server
    const handleMatchFound = (data) => {
      console.log("⚔️ Match Found!", data);
      setIsSearching(false);
      audioCache.bgm.pause(); 
      audioCache.bgm.currentTime = 0;
      // Teleport the user to the Arena
      navigate('/arena', { 
        state: { 
          matchId: data.matchId, 
          problemId: data.problemId,
          startTime: data.startTime
        } 
      });
    };

    socket.on('match_found', handleMatchFound);

    // Cleanup the listener when the component unmounts
    return () => {
      socket.off('match_found', handleMatchFound);
      document.removeEventListener('click', startAudio);
      document.removeEventListener('click', handleGlobalClick);
      audioCache.bgm.pause(); // Ensure BGM stops if they leave the page
    };
  }, [navigate]);

const handleFindMatch = () => {
    setIsSearching(true);
    audioCache.teleport.currentTime = 0;
    audioCache.teleport.play().catch(() => {});
    
    const user = JSON.parse(localStorage.getItem('user')); 
    
    // SEND ELO TO BACKEND FOR SMART MATCHING
    socket.emit('find_match', { 
      userId: user._id, 
      elo: profileData?.elo || 1000 
    }); 
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white font-sans relative overflow-hidden">
      
      {/* Background Grid Styling */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      <div className="relative z-10 container mx-auto px-4 py-8 flex flex-col h-full">
        
        {/* HEADER SECTION */}
        <div className="flex justify-between items-center mb-12 border-b border-gray-800 pb-4">
          <h1 className="text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600 uppercase">
            Code Strike HQ
          </h1>
          <div className="flex items-center gap-6">
            {/* ADDED LEADERBOARD BUTTON */}
            <button 
              onClick={() => {
                audioCache.button.currentTime = 0;
                audioCache.button.play().catch(()=>{});
                navigate('/leaderboard');
              }}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-blue-400 font-bold rounded tracking-widest uppercase transition-colors"
            >
              🏆 Global Rankings
            </button>

            <div className="text-right border-l border-gray-800 pl-6">
              <div className="text-gray-400 text-sm tracking-widest uppercase">Logged in as</div>
              <div className="text-2xl font-bold text-white uppercase">{profileData?.username || 'Fighter'}</div>
            </div>
          </div>
        </div>

        {/* MAIN LAYOUT: Split Screen (Stats on Left, History on Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
          
          {/* LEFT COLUMN: Stats & Matchmaking */}
          <div className="lg:col-span-1 flex flex-col gap-8">
            
            {/* POWER LEVEL (STATS) CARD */}
            <div className="bg-gray-950 border border-gray-800 p-6 rounded-lg shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
              <h2 className="text-xl font-black text-gray-500 uppercase tracking-widest mb-6 border-b border-gray-800 pb-2">Combat Record</h2>
              
              {/* DYNAMIC DBZ TIER INJECTION */}
              <div className="mb-8">
                <div className="text-xs text-gray-400 uppercase tracking-[0.3em] mb-1">Power Level (Elo)</div>
                <div className={`text-6xl font-black ${getEloTier(profileData?.elo).color} ${getEloTier(profileData?.elo).shadow}`}>
                  {profileData?.elo || 1000}
                </div>
                <div className={`mt-2 text-sm font-bold tracking-widest uppercase ${getEloTier(profileData?.elo).color}`}>
                  Class: {getEloTier(profileData?.elo).title}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900 p-4 rounded border border-gray-800 text-center">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Victories</div>
                  <div className="text-3xl font-bold text-green-500">{profileData?.wins || 0}</div>
                </div>
                <div className="bg-gray-900 p-4 rounded border border-gray-800 text-center">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Defeats</div>
                  <div className="text-3xl font-bold text-red-500">{profileData?.losses || 0}</div>
                </div>
              </div>
            </div>

            {/* MATCHMAKING RADAR */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-950 border border-gray-800 rounded-lg">
              {!isSearching ? (
                <button 
                  onClick={handleFindMatch}
                  className="group relative w-full py-6 font-black text-2xl tracking-widest uppercase bg-blue-600 hover:bg-blue-500 text-white rounded shadow-[0_0_40px_rgba(37,99,235,0.5)] transition-all transform hover:scale-105 active:scale-95"
                >
                  Enter Arena
                  <div className="absolute inset-0 rounded bg-blue-400 blur-md opacity-0 group-hover:opacity-30 transition-opacity"></div>
                </button>
              ) : (
                <div className="flex flex-col items-center w-full">
                  <div className="relative w-32 h-32 mb-8">
                    <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                    <div className="absolute inset-4 bg-blue-500/10 rounded-full animate-pulse"></div>
                  </div>
                  <h2 className="text-2xl font-bold text-blue-400 animate-pulse tracking-widest text-center">
                    SCANNING...
                  </h2>
                  <button 
                    onClick={() => {
                      setIsSearching(false);
                      socket.emit('cancel_search'); // <-- ADD THIS LINE!
                    }}
                    className="mt-6 text-sm text-gray-500 hover:text-red-400 transition underline tracking-widest"
                  >
                    ABORT SEARCH
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Match History */}
          <div className="lg:col-span-2 bg-gray-950 border border-gray-800 rounded-lg p-6 flex flex-col overflow-hidden">
            <h2 className="text-xl font-black text-gray-500 uppercase tracking-widest mb-6 border-b border-gray-800 pb-2">Recent Battles</h2>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {matchHistory.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-600 italic tracking-wider">
                  No combat data found. Enter the arena to begin your legacy.
                </div>
              ) : (
                <div className="space-y-3">
                  {matchHistory.map((match) => {
                    // Determine if the logged-in user won this match
                    const user = JSON.parse(localStorage.getItem('user'));
                    const isWinner = match.winnerId._id === user._id;
                    const opponent = isWinner ? match.loserId.username : match.winnerId.username;

                    return (
                      <div key={match._id} className="flex items-center justify-between bg-gray-900 border border-gray-800 p-4 rounded hover:border-gray-600 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-12 rounded ${isWinner ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}></div>
                          <div>
                            <div className={`text-lg font-bold tracking-wider uppercase ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
                              {isWinner ? 'VICTORY' : 'DEFEAT'}
                            </div>
                            <div className="text-sm text-gray-400">
                              vs <span className="text-gray-200 font-bold uppercase">{opponent}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right flex items-center gap-6">
                          <div className="hidden md:block text-right">
                            <div className="text-xs text-gray-500 uppercase tracking-widest">Algorithm</div>
                            <div className="text-sm text-gray-300 truncate max-w-[150px]">{match.problemId?.title || 'Unknown'}</div>
                          </div>
                          <div className="text-right min-w-[80px]">
                            <div className="text-xs text-gray-500 uppercase tracking-widest">Elo Shift</div>
                            <div className={`text-xl font-black ${isWinner ? 'text-green-500' : 'text-red-500'}`}>
                              {isWinner ? '+' : '-'}{match.eloChange || 0}
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

        </div>
      </div>
    </div>
  );
}