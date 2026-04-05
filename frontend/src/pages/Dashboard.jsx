import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function Dashboard() {
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Play Background Music on first user interaction
    const startAudio = () => {
      audioCache.bgm.play().catch(() => {});
      document.removeEventListener('click', startAudio);
    };
    document.addEventListener('click', startAudio);

    // 2. Add generic button click sound to all buttons on the page
    const handleGlobalClick = (e) => {
      if (e.target.tagName.toLowerCase() === 'button') {
        audioCache.button.currentTime = 0;
        audioCache.button.play().catch(() => {});
      }
    };
    document.addEventListener('click', handleGlobalClick);

    // 1. Listen for the 'match_found' event from the server
    const handleMatchFound = (data) => {
      console.log("⚔️ Match Found!", data);
      setIsSearching(false);
      audioCache.bgm.pause(); 
      audioCache.bgm.currentTime = 0;
      // 2. Teleport the user to the Arena, carrying the match data in the state
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
    // Play Teleport sound!
    audioCache.teleport.currentTime = 0;
    audioCache.teleport.play().catch(() => {});
    // Tell the server this user wants to fight
    socket.emit('find_match');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white font-sans relative overflow-hidden">
      
      {/* Background Grid Styling */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      <div className="relative z-10 flex flex-col items-center text-center">
        <h1 className="text-6xl font-black mb-4 tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
          GLOBAL DASHBOARD
        </h1>
        <p className="text-gray-400 mb-12 text-lg">Your Elo Rating: <span className="text-white font-bold text-xl">1200</span></p>

        {!isSearching ? (
          <button 
            onClick={handleFindMatch}
            className="group relative px-12 py-6 font-black text-2xl tracking-widest uppercase bg-blue-600 hover:bg-blue-500 text-white rounded shadow-[0_0_40px_rgba(37,99,235,0.5)] transition-all transform hover:scale-105 active:scale-95"
          >
            Find Match
            {/* Hover glow effect */}
            <div className="absolute inset-0 rounded bg-blue-400 blur-md opacity-0 group-hover:opacity-30 transition-opacity"></div>
          </button>
        ) : (
          <div className="flex flex-col items-center">
            {/* Searching Radar Animation */}
            <div className="relative w-32 h-32 mb-8">
              <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute inset-4 bg-blue-500/10 rounded-full animate-pulse"></div>
            </div>
            
            <h2 className="text-2xl font-bold text-blue-400 animate-pulse tracking-widest">
              SCANNING NETWORK...
            </h2>
            <p className="text-gray-500 mt-2">Waiting for an opponent to enter the queue.</p>
            
            <button 
              onClick={() => {
                setIsSearching(false);
                // We'll add a 'cancel_search' emit to the backend later to keep it clean
              }}
              className="mt-8 text-sm text-gray-500 hover:text-red-400 transition underline tracking-widest"
            >
              ABORT SEARCH
            </button>
          </div>
        )}
      </div>
    </div>
  );
}