import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import socket from '../socket';
import { motion, AnimatePresence } from 'framer-motion';

// Pre-load DBZ Audio
const audioCache = {
  button: new Audio('/sounds/buttonPress.mp3'),
  teleport: new Audio('/sounds/dbz-teleport.mp3'),
  punch: new Audio('/sounds/dragon-ball-z-heavy-punch.mp3'),
  charge: new Audio('/sounds/kame_charge.mp3'),
  victory: new Audio('/sounds/pvz-victory.mp3'),
  ultraInstinct: new Audio('/sounds/ultra-instinct.mp3') 
};

audioCache.ultraInstinct.volume = 0.6;
audioCache.charge.volume = 0.5;

export default function Arena() {
  const location = useLocation();
  const navigate = useNavigate();

  // --- STATE ---
  const [problem, setProblem] = useState(null);
  
  const [matchData, setMatchData] = useState(() => {
    return location.state || JSON.parse(localStorage.getItem('activeMatch'));
  });

  const [language, setLanguage] = useState(() => {
    const match = location.state || JSON.parse(localStorage.getItem('activeMatch'));
    return match ? localStorage.getItem(`lang_${match.matchId}`) || "javascript" : "javascript";
  });

  const [code, setCode] = useState(() => {
    const match = location.state || JSON.parse(localStorage.getItem('activeMatch'));
    return match ? localStorage.getItem(`code_${match.matchId}`) || "" : "";
  });

  const [output, setOutput] = useState("Ready to execute...");
  const [isExecuting, setIsExecuting] = useState(false);
  const [testStatus, setTestStatus] = useState(null);

  const [timeLeft, setTimeLeft] = useState(() => matchData?.duration || 15 * 60);
  const [opponentProgress, setOpponentProgress] = useState(0);
  const [opponentTests, setOpponentTests] = useState("0/0");
  const [gameOver, setGameOver] = useState(null);

  const [myProgress, setMyProgress] = useState(0);
  const [myTests, setMyTests] = useState("0/0");

  // --- CHAT STATE & ANIMATIONS ---
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef(null);
  const [chatAnim, setChatAnim] = useState(null); 
  const chatTimerRef = useRef(null);

  // NEW: Dedicated Babidi State and Timer
  const [showBabidi, setShowBabidi] = useState(false);
  const babidiTimerRef = useRef(null);

  // --- CUSTOM RESIZE ENGINE ---
  const [leftWidth, setLeftWidth] = useState(50);
  const [topHeight, setTopHeight] = useState(65);
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);

  // --- AUDIO LOGIC ---
  const playSound = (type) => {
    try {
      const sound = audioCache[type];
      sound.currentTime = 0; 
      sound.play().catch(() => {});
    } catch (e) {}
  };

  const stopSound = (type) => {
    try {
      audioCache[type].pause();
      audioCache[type].currentTime = 0;
    } catch (e) {}
  };

  const startHorizontalDrag = (e) => {
    e.preventDefault();
    const onDrag = (e) => {
      const newWidth = (e.clientX / window.innerWidth) * 100;
      if (newWidth > 20 && newWidth < 80) setLeftWidth(newWidth);
    };
    const stopDrag = () => {
      document.removeEventListener('mousemove', onDrag);
      document.removeEventListener('mouseup', stopDrag);
    };
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  const startVerticalDrag = (e) => {
    e.preventDefault();
    const onDrag = (e) => {
      const availableHeight = window.innerHeight - 64; 
      const newHeight = ((e.clientY - 64) / availableHeight) * 100;
      if (newHeight > 20 && newHeight < 80) setTopHeight(newHeight);
    };
    const stopDrag = () => {
      document.removeEventListener('mousemove', onDrag);
      document.removeEventListener('mouseup', stopDrag);
    };
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
  };
  
  // --- LIFECYCLE & SOCKETS ---
  useEffect(() => {
    let currentMatch = matchData;

    if (!currentMatch) {
      navigate('/dashboard'); 
      return; 
    } else {
      localStorage.setItem('activeMatch', JSON.stringify(currentMatch));
    }

    socket.emit('rejoin_match', currentMatch.matchId);
    const startTime = currentMatch.startTime || Date.now();

    axios.get(`http://localhost:5000/api/problems/${currentMatch.problemId}`)
      .then(res => {
        setProblem(res.data);
        setOpponentTests(`0/${res.data.testCases.length}`);
        setMyTests(`0/${res.data.testCases.length}`);
        const savedCode = localStorage.getItem(`code_${currentMatch.matchId}`);
        if (!savedCode) setCode(res.data.starterCode);
      });

    const timer = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      // NEW: Reads dynamic duration (fallback to 15m just in case)
      const matchDuration = currentMatch.duration || (15 * 60); 
      const remaining = Math.max(0, matchDuration - elapsedSeconds);
      
      setTimeLeft(remaining);
      
      if (remaining === 7) {
        playSound('ultraInstinct');
      }

      if (remaining === 0) {
        setGameOver({ isWinner: false, reason: 'Time is up! Draw.' });
        clearInterval(timer);
      }
    }, 1000);

    socket.on('opponent_progress', (data) => {
      setOpponentProgress(data.percentage);
      setOpponentTests(`${data.passed}/${data.total}`);
    });

    socket.on('match_over', (data) => {
      stopSound('charge'); 
      
      if (data.reason === 'disconnect') {
        setGameOver({ isWinner: true, reason: 'Opponent fled the arena.' });
        playSound('victory'); 
      } else if (data.reason === 'surrender') {
        const isMe = data.winner === socket.id;
        setGameOver({ 
          isWinner: isMe, 
          reason: isMe ? 'Opponent surrendered. You win!' : 'You surrendered the match.' 
        });
        if (isMe) playSound('victory'); else playSound('punch');
      } else {
        const isMe = data.winner === socket.id;
        setGameOver({ 
          isWinner: isMe, 
          reason: isMe ? 'You crushed them!' : 'Opponent completed the algorithm first.' 
        });
        if (isMe) playSound('victory'); else playSound('punch');
      }
      
      localStorage.removeItem('activeMatch');
      clearInterval(timer);
    });

    socket.on('receive_message', (message) => {
      setChatMessages((prev) => [...prev, message]);
      playSound('teleport');
      
      setChatAnim('received');
      clearTimeout(chatTimerRef.current);
      chatTimerRef.current = setTimeout(() => setChatAnim(null), 3000);
    });

    return () => {
      clearInterval(timer);
      socket.off('opponent_progress');
      socket.off('match_over');
      socket.off('receive_message');
      clearTimeout(babidiTimerRef.current); // Clean up Babidi timer
    };
  }, [matchData, navigate]);
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    playSound('teleport'); 
    
    const newMessage = { text: chatInput, sender: 'You', timestamp: Date.now() };
    setChatMessages((prev) => [...prev, newMessage]);

    socket.emit('send_message', { matchId: matchData.matchId, message: chatInput });
    setChatInput("");

    setChatAnim('sent');
    clearTimeout(chatTimerRef.current);
    chatTimerRef.current = setTimeout(() => setChatAnim(null), 3000);
  };

  const handleCodeChange = (val) => {
    setCode(val);
    if (matchData) localStorage.setItem(`code_${matchData.matchId}`, val);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleLanguageChange = (e) => {
    const selectedLang = e.target.value;
    setLanguage(selectedLang);
    if (matchData) localStorage.setItem(`lang_${matchData.matchId}`, selectedLang);
    
    if (selectedLang === 'javascript') {
      setCode(`// Node.js\nconst fs = require('fs');\n\nfunction main() {\n    const input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/);\n    if (!input[0]) return;\n    \n    // Write your logic here\n}\n\nmain();`);
    } else if (selectedLang === 'cpp') {
      setCode(`#include <iostream>\n#include <vector>\n#include <string>\nusing namespace std;\n\nint main() {\n    // Read your input here\n    // Example: int n; cin >> n;\n    \n    return 0;\n}`);
    } else if (selectedLang === 'python') {
      setCode(`import sys\n\ndef main():\n    input_data = sys.stdin.read().split()\n    if not input_data: return\n    \n    # Write your logic here\n\nif __name__ == '__main__':\n    main()`);
    }
  };

  const handleRunCode = async () => {
    if (!problem || gameOver) return;
    playSound('charge'); 
    setIsExecuting(true);
    setOutput("Gathering energy...");
    setTestStatus(null);
    setShowBabidi(false); // Hide Babidi instantly when a new test starts

    try {
      const res = await axios.post('http://localhost:5000/api/execute', { problemId: problem._id, code, language });
      
      stopSound('charge'); 
      setOutput(res.data.output || res.data.message);
      setTestStatus(res.data.status);

      if (res.data.status !== 'Pass') {
        playSound('punch'); 
        
        // FIXED: Trigger Babidi with a 3-second auto-dismiss timer
        setShowBabidi(true);
        clearTimeout(babidiTimerRef.current);
        babidiTimerRef.current = setTimeout(() => setShowBabidi(false), 3000);
      }

      if (res.data.total) {
        const percentage = (res.data.passed / res.data.total) * 100;
        setMyProgress(percentage);
        setMyTests(`${res.data.passed}/${res.data.total}`);
        socket.emit('update_progress', { matchId: matchData.matchId, percentage, passed: res.data.passed, total: res.data.total });
        
        if (res.data.passed === res.data.total) {
          socket.emit('player_won', matchData.matchId);
        }
      }
    } catch (err) {
      stopSound('charge');
      playSound('punch'); 
      setOutput("Server Error.");
      setTestStatus('Fail');
      
      // Show Babidi on server crash too
      setShowBabidi(true);
      clearTimeout(babidiTimerRef.current);
      babidiTimerRef.current = setTimeout(() => setShowBabidi(false), 3000);

    } finally {
      setIsExecuting(false);
    }
  };

  const handleSurrenderClick = () => {
    playSound('button');
    setShowSurrenderConfirm(true);
  };

  const cancelSurrender = () => {
    playSound('button');
    setShowSurrenderConfirm(false);
  };

  const confirmSurrender = () => {
    playSound('punch'); 
    socket.emit('surrender', matchData.matchId); 
    setShowSurrenderConfirm(false);
  };

  if (!problem || !matchData) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading Arena...</div>;

  return (
    <div 
      className="flex flex-col h-screen text-white font-sans relative overflow-hidden bg-cover bg-center"

    >
      
      {/* GAME OVER MODAL */}
      <AnimatePresence>
        {gameOver && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }}
              className={`p-10 rounded-xl border-4 text-center max-w-lg relative ${gameOver.isWinner ? 'border-yellow-400 bg-gray-900 shadow-[0_0_80px_rgba(250,204,21,0.4)]' : 'border-red-500 bg-red-950 shadow-[0_0_80px_rgba(239,68,68,0.4)]'}`}
            >
              {gameOver.isWinner && (
                <motion.img 
                  initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5, type: "spring" }}
                  src="/characters/mrsatan.png" 
                  className="absolute -top-32 -right-20 w-48 drop-shadow-2xl z-[110]" 
                  alt="Mr Satan" 
                />
              )}

              <h2 className={`text-6xl font-saiyan mb-2 tracking-widest drop-shadow-lg ${gameOver.isWinner ? 'text-yellow-400' : 'text-red-500'}`}>
                {gameOver.isWinner ? 'VICTORY' : 'DEFEAT'}
              </h2>
              <p className="text-gray-300 mb-8 text-lg font-bold">{gameOver.reason}</p>
              <button 
                onClick={() => { playSound('button'); localStorage.removeItem('activeMatch'); navigate('/dashboard'); }}
                className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded tracking-widest uppercase transition border border-gray-600 shadow-lg"
              >
                Return to Dashboard
              </button>
            </motion.div>
          </motion.div>
        )}
        
        {showSurrenderConfirm && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, opacity: 0 }}
              className="p-8 rounded-lg border-2 border-red-500 bg-red-950/90 shadow-[0_0_50px_rgba(239,68,68,0.4)] text-center max-w-md"
            >
              <h2 className="text-4xl font-saiyan mb-2 tracking-widest text-red-500 uppercase">WARNING</h2>
              <p className="text-gray-300 mb-8 text-sm leading-relaxed font-bold">
                Are you sure you want to surrender? You will instantly forfeit this match and your Power Level will drop.
              </p>
              <div className="flex gap-4 justify-center">
                <button onClick={cancelSurrender} className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded tracking-widest uppercase transition">Keep Fighting</button>
                <button onClick={confirmSurrender} className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded tracking-widest uppercase transition shadow-[0_0_15px_rgba(220,38,38,0.5)]">Surrender</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex justify-between items-center p-4 bg-black/60 backdrop-blur-md border-b border-white/20 h-16 shrink-0 relative z-20 shadow-lg">
        
        <div className="text-2xl font-saiyan text-yellow-400 tracking-widest flex items-center gap-3 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
          CODE STRIKE
          <span className="font-sans text-[10px] bg-white/10 text-gray-200 px-2 py-1 rounded border border-white/20 tracking-widest font-bold">
            MATCH: {matchData.matchId.split('_')[1]}
          </span>
        </div>
        
        <div className="flex flex-col items-center absolute left-1/2 transform -translate-x-1/2">
          <span className="text-[10px] text-gray-300 uppercase tracking-[0.3em] mb-1 drop-shadow-md font-bold">Time Remaining</span>
          <span className={`text-3xl font-mono font-black tracking-wider drop-shadow-md ${timeLeft <= 60 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
            {formatTime(timeLeft)}
          </span>
        </div>

        <div className="flex items-center gap-6">
          <button onClick={handleSurrenderClick} className="px-3 py-1.5 bg-red-900/40 hover:bg-red-600 border border-red-500/50 hover:border-red-500 text-red-200 text-xs font-bold tracking-widest uppercase transition-colors rounded shadow-sm">
            Surrender
          </button>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-bold text-blue-400 drop-shadow-md">You</div>
              <div className="text-[10px] text-gray-300">Tests: {myTests}</div>
            </div>
            <div className="w-24 h-3 bg-black/50 rounded-full overflow-hidden border border-white/20 shadow-inner">
              <div className="bg-blue-500 h-full transition-all duration-500 ease-out shadow-[0_0_10px_blue]" style={{ width: `${myProgress}%` }}></div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-bold text-red-400 drop-shadow-md">Opponent</div>
              <div className="text-[10px] text-gray-300">Tests: {opponentTests}</div>
            </div>
            <div className="w-24 h-3 bg-black/50 rounded-full overflow-hidden border border-white/20 shadow-inner">
              <div className="bg-red-500 h-full transition-all duration-500 ease-out shadow-[0_0_10px_red]" style={{ width: `${opponentProgress}%` }}></div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        
        <section 
          className="flex flex-col bg-black/50 backdrop-blur-md shrink-0 border-r border-white/20 relative"
          style={{ width: `${leftWidth}%` }}
        >
          <AnimatePresence>
            {chatAnim === 'sent' && (
              <motion.img 
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
                src="/characters/kingkai.png" 
                className="absolute bottom-16 right-4 w-16 z-30 drop-shadow-[0_0_10px_rgba(255,255,255,0.4)] pointer-events-none" alt="King Kai"
              />
            )}
            {chatAnim === 'received' && (
              <motion.img 
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
                src="/characters/whis.png" 
                className="absolute bottom-16 right-4 w-16 z-30 drop-shadow-[0_0_10px_rgba(255,255,255,0.4)] pointer-events-none" alt="Whis"
              />
            )}
          </AnimatePresence>

          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            <div className="mb-6">
              <h1 className="text-4xl font-saiyan tracking-widest text-yellow-400 mb-2 drop-shadow-md uppercase">{problem.title}</h1>
              <span className="inline-block bg-white/10 text-gray-200 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wide border border-white/20 shadow-sm">
                {problem.difficulty}
              </span>
            </div>
            <div className="prose prose-invert max-w-none text-gray-100 mb-10 whitespace-pre-wrap leading-relaxed font-medium drop-shadow-md">
              {problem.description}
            </div>
            
            <div>
              <h3 className="text-xl font-black mb-6 text-gray-300 uppercase tracking-widest border-b border-white/20 pb-2">
                Sample Data
              </h3>
              {problem.testCases.filter(tc => !tc.isHidden).map((testCase, index) => (
                <div key={index} className="mb-10 space-y-4 relative z-10">
                  <h4 className="font-bold text-blue-300 drop-shadow-md">Example {index + 1}:</h4>
                  <div className="bg-black/60 border border-white/10 rounded-lg overflow-hidden shadow-lg backdrop-blur-sm">
                    <div className="bg-white/5 px-4 py-2 text-xs font-bold text-gray-300 uppercase tracking-wider border-b border-white/10">Standard Input</div>
                    <div className="p-4 font-mono text-sm text-blue-200 whitespace-pre-wrap">{testCase.input}</div>
                    <div className="bg-white/5 px-4 py-2 text-xs font-bold text-gray-300 uppercase tracking-wider border-t border-b border-white/10">Expected Output</div>
                    <div className="p-4 font-mono text-sm text-green-400 whitespace-pre-wrap">{testCase.expectedOutput}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="h-64 bg-black/60 flex flex-col border-t border-white/20 shrink-0 backdrop-blur-md relative z-20">
            <div className="p-2 bg-white/5 text-xs font-black text-gray-300 uppercase tracking-widest border-b border-white/10 flex justify-between items-center shadow-sm">
              <span>Match Comm-Link</span>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_5px_rgba(34,197,94,1)]"></span>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto flex flex-col space-y-3 scroll-smooth custom-scrollbar">
              {chatMessages.length === 0 ? (
                <div className="text-gray-400 text-xs text-center italic mt-auto mb-auto drop-shadow-md">Connection secure. Waiting for transmissions...</div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={`max-w-[85%] p-2 rounded shadow-lg text-sm font-medium ${msg.sender === 'You' ? 'bg-blue-600/80 border border-blue-500/50 text-white self-end rounded-br-none' : 'bg-gray-700/80 border border-gray-500/50 text-gray-100 self-start rounded-bl-none'}`}
                  >
                    {msg.text}
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-3 bg-black/40 border-t border-white/10 flex gap-2">
              <input 
                type="text" 
                value={chatInput} 
                onChange={e => setChatInput(e.target.value)} 
                placeholder="Message opponent..." 
                maxLength={100}
                className="flex-1 bg-black/50 border border-white/20 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-blue-400 transition-colors shadow-inner" 
              />
              <button 
                type="submit" 
                disabled={!chatInput.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-bold tracking-wider uppercase transition-colors shadow-md"
              >
                Send
              </button>
            </form>
          </div>
        </section>

        <div 
          onMouseDown={startHorizontalDrag}
          className="w-2 bg-black/80 hover:bg-blue-500 transition-colors cursor-col-resize flex justify-center items-center group shrink-0 z-30 border-x border-white/10"
        >
          <div className="h-8 w-1 bg-gray-500 rounded-full group-hover:bg-white transition-colors"></div>
        </div>

        <section 
          className="flex flex-col bg-black shrink-0 relative z-30"
          style={{ width: `calc(${100 - leftWidth}% - 8px)` }}
        >
          
          <div className="flex flex-col shrink-0" style={{ height: `${topHeight}%` }}>
            <div className="flex justify-between items-center p-2 bg-[#1e1e1e] border-b border-gray-800 text-sm">
              <div className="text-gray-400 px-2 font-mono flex items-center gap-2">
                <span>Language:</span>
                <select 
                  value={language}
                  onChange={handleLanguageChange}
                  className="bg-[#2d2d2d] border border-gray-600 text-white text-xs rounded focus:ring-blue-500 focus:border-blue-500 block p-1"
                >
                  <option value="javascript">JavaScript (Node)</option>
                  <option value="cpp">C++ (GCC)</option>
                  <option value="python">Python 3</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-hidden bg-[#1e1e1e]">
              <Editor
                height="100%"
                theme="vs-dark"
                language={language}
                value={code}
                onChange={handleCodeChange}
                options={{ minimap: { enabled: false }, fontSize: 16, padding: { top: 16 }, formatOnPaste: true, autoIndent: "full" }}
              />
            </div>
          </div>

          <div 
            onMouseDown={startVerticalDrag}
            className="h-2 bg-gray-900 hover:bg-blue-500 transition-colors cursor-row-resize flex justify-center items-center group shrink-0 z-10 border-y border-gray-800"
          >
            <div className="w-8 h-1 bg-gray-600 rounded-full group-hover:bg-white transition-colors"></div>
          </div>

          <div className="bg-[#0d1117] p-4 flex flex-col shrink-0 relative shadow-[inset_0_10px_20px_rgba(0,0,0,0.5)]" style={{ height: `calc(${100 - topHeight}% - 8px)` }}>
            
            {/* FIXED: Babidi only shows up on Fail, and exits automatically after 3 seconds via state! */}
            <AnimatePresence>
              {showBabidi && (
                <motion.img 
                  initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
                  src="/characters/babidi.png" 
                  className="absolute bottom-4 right-6 w-24 z-10 drop-shadow-[0_0_15px_rgba(239,68,68,0.3)] pointer-events-none" 
                  alt="Babidi" 
                />
              )}
            </AnimatePresence>

            <div className="flex justify-between items-center mb-4 relative z-20">
              <span className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">Live Console</span>
              
              <button 
                onClick={handleRunCode}
                disabled={isExecuting || gameOver}
                className={`relative overflow-hidden font-black py-2 px-8 rounded tracking-widest shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:transform-none disabled:shadow-none
                  ${isExecuting ? 'bg-gray-700 text-gray-400' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
              >
                {isExecuting ? 'CHARGING...' : '💥 KAMEHAMEHA'}
              </button>
            </div>
            
            <div className={`flex-1 rounded-lg p-4 font-mono text-sm overflow-y-auto whitespace-pre-wrap transition-all duration-500 relative z-20
              ${testStatus === 'Pass' ? 'bg-green-950/50 border-2 border-green-500 text-green-300 shadow-[0_0_30px_rgba(34,197,94,0.1)]' : 
                testStatus === 'Fail' ? 'bg-red-950/50 border-2 border-red-500 text-red-300 shadow-[0_0_30px_rgba(239,68,68,0.1)]' : 
                'bg-black border border-gray-800 text-gray-400'}`}
            >
              {isExecuting ? (
                <div className="animate-pulse text-blue-400 flex items-center gap-3">
                  <span>Gathering energy to compile...</span>
                </div>
              ) : (
                <>
                  {testStatus && (
                    <div className={`font-black text-xl mb-3 tracking-widest uppercase flex items-center gap-2
                      ${testStatus === 'Pass' ? 'text-green-400 animate-pulse' : 'text-red-500'}`}
                    >
                      {testStatus === 'Pass' ? '🏆 VICTORY ACHIEVED' : '💀 CRITICAL FAILURE'}
                    </div>
                  )}
                  <div className="opacity-90 leading-relaxed">
                    <span className="text-gray-500 mr-2">$</span>{output}
                  </div>
                </>
              )}
            </div>
          </div>

        </section>
      </main>
    </div>
  );
}