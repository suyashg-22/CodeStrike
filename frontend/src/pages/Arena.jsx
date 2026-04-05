import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import socket from '../socket';
import { motion, AnimatePresence } from 'framer-motion';

// Pre-load DBZ Audio
const audioCache = {
  button: new Audio('/sounds/buttonPress.mp3'),
  teleport: new Audio('/sounds/dbz-teleport.mp3'), // For Chat
  punch: new Audio('/sounds/dragon-ball-z-heavy-punch.mp3'), // For Fail
  charge: new Audio('/sounds/kame_charge.mp3'), // For STRIKE
  victory: new Audio('/sounds/pvz-victory.mp3'), // For Win
  ultraInstinct: new Audio('/sounds/ultra-instinct.mp3') // For 7 seconds left
};

// Lower volumes slightly so users can hear themselves think
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

  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [opponentProgress, setOpponentProgress] = useState(0);
  const [opponentTests, setOpponentTests] = useState("0/0");
  const [gameOver, setGameOver] = useState(null);

  const [myProgress, setMyProgress] = useState(0);
  const [myTests, setMyTests] = useState("0/0");

  // --- CHAT STATE ---
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef(null);

  // --- CUSTOM RESIZE ENGINE ---
  const [leftWidth, setLeftWidth] = useState(50); // Percentage
  const [topHeight, setTopHeight] = useState(65); // Percentage

  // --- AUDIO LOGIC ---
  const playSound = (type) => {
    try {
      const sound = audioCache[type];
      sound.currentTime = 0; // Rewind to start for rapid-fire sounds
      
      // We removed the silent catch so you can see if the browser blocks it
      sound.play().catch((err) => {
        console.warn(`Audio blocked by browser. User must click the page first. Error: ${err.message}`);
      });
    } catch (e) {
      console.error("Audio playback failed", e);
    }
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
      // 64px is the height of the header
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
      const remaining = Math.max(0, (15 * 60) - elapsedSeconds);
      setTimeLeft(remaining);
      
      // 🚨 THE ULTRA INSTINCT TRIGGER 🚨
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
      stopSound('charge'); // Just in case they were executing code when the match ended
      
      if (data.reason === 'disconnect') {
        setGameOver({ isWinner: true, reason: 'Opponent fled the arena.' });
        playSound('victory'); // Play Victory if opponent rage-quits!
      } else {
        const isMe = data.winner === socket.id;
        setGameOver({ isWinner: isMe, reason: isMe ? 'You crushed them!' : 'Opponent completed the algorithm first.' });
        
        // Play the correct sound based on who won
        if (isMe) {
          playSound('victory');
        } else {
          playSound('punch'); // Play a heavy hit if you lose
        }
      }
      
      localStorage.removeItem('activeMatch');
      clearInterval(timer);
    });

    socket.on('receive_message', (message) => {
      setChatMessages((prev) => [...prev, message]);
      playSound('teleport'); // DBZ Instant Transmission on receive 
    });

    return () => {
      clearInterval(timer);
      socket.off('opponent_progress');
      socket.off('match_over');
      socket.off('receive_message'); // Clean up the chat listener!
    };
  }, [matchData, navigate]);
  
  // Auto-scroll chat to bottom when a new message arrives
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    playSound('teleport'); // DBZ Instant Transmission on send
    // 1. Add to my own UI instantly
    const newMessage = { text: chatInput, sender: 'You', timestamp: Date.now() };
    setChatMessages((prev) => [...prev, newMessage]);

    // 2. Send to the server to broadcast to opponent
    socket.emit('send_message', {
      matchId: matchData.matchId,
      message: chatInput
    });

    // 3. Clear input
    setChatInput("");
  };

  // --- HANDLERS ---
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
    
    // playSound('button'); <-- DELETED this to stop the audio collision
    playSound('charge'); // ⚡ KAMEHAMEHA CHARGING ⚡
    
    setIsExecuting(true);
    setOutput("Executing algorithm...");
    setTestStatus(null);

    try {
      const res = await axios.post('http://localhost:5000/api/execute', {
        problemId: problem._id, code, language
      });
      
      stopSound('charge'); // Stop charging sound when results arrive
      setOutput(res.data.output || res.data.message);
      setTestStatus(res.data.status);

      // Only play the punch sound if you FAIL. 
      // If you PASS, the socket listener will handle the Victory music!
      if (res.data.status !== 'Pass') {
        playSound('punch'); 
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
      playSound('punch'); // Punch sound on server error too
      setOutput("Server Error.");
      setTestStatus('Fail');
    } finally {
      setIsExecuting(false);
    }
  };

  if (!problem || !matchData) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading Arena...</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-sans relative overflow-hidden">
      
      {/* GAME OVER MODAL */}
      <AnimatePresence>
        {gameOver && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }}
              className={`p-8 rounded-lg border-2 text-center max-w-md ${gameOver.isWinner ? 'border-green-500 bg-green-900/20 shadow-[0_0_50px_rgba(34,197,94,0.3)]' : 'border-red-500 bg-red-900/20 shadow-[0_0_50px_rgba(239,68,68,0.3)]'}`}
            >
              <h2 className={`text-5xl font-black mb-4 tracking-widest ${gameOver.isWinner ? 'text-green-400' : 'text-red-500'}`}>
                {gameOver.isWinner ? 'VICTORY' : 'DEFEAT'}
              </h2>
              <p className="text-gray-300 mb-8 text-lg">{gameOver.reason}</p>
              <button 
                onClick={() => { localStorage.removeItem('activeMatch'); navigate('/dashboard'); }}
                className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded tracking-widest uppercase transition"
              >
                Return to Dashboard
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MATCH HEADER (Height: 64px) */}
      <header className="flex justify-between items-center p-4 bg-gray-800 border-b border-gray-700 h-16 shrink-0 relative z-20 shadow-md">
        <div className="text-xl font-black text-blue-500 tracking-widest flex items-center gap-3">
          CODE STRIKE
          <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded border border-blue-700/50">
            MATCH: {matchData.matchId.split('_')[1]}
          </span>
        </div>
        
        <div className="flex flex-col items-center absolute left-1/2 transform -translate-x-1/2">
          <span className="text-[10px] text-gray-400 uppercase tracking-[0.3em] mb-1">Time Remaining</span>
          <span className={`text-3xl font-mono font-black tracking-wider ${timeLeft <= 60 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
            {formatTime(timeLeft)}
          </span>
        </div>

        {/* DUAL PROGRESS METERS */}
        <div className="flex items-center gap-8">
          
          {/* MY PROGRESS (Blue) */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-bold text-blue-400">You</div>
              <div className="text-xs text-gray-400">Tests: {myTests}</div>
            </div>
            <div className="w-32 h-4 bg-gray-900 rounded-full overflow-hidden border border-gray-700 shadow-inner">
              <div className="bg-blue-500 h-full transition-all duration-500 ease-out shadow-[0_0_10px_blue]" style={{ width: `${myProgress}%` }}></div>
            </div>
          </div>

          {/* OPPONENT PROGRESS (Red) */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-bold text-red-400">Opponent</div>
              <div className="text-xs text-gray-400">Tests: {opponentTests}</div>
            </div>
            <div className="w-32 h-4 bg-gray-900 rounded-full overflow-hidden border border-gray-700 shadow-inner">
              <div className="bg-red-500 h-full transition-all duration-500 ease-out shadow-[0_0_10px_red]" style={{ width: `${opponentProgress}%` }}></div>
            </div>
          </div>
          
        </div>
      </header>

      {/* DRAGGABLE SPLIT SCREEN MAIN */}
      <main className="flex flex-1 overflow-hidden">
        
        {/* LEFT PANEL: Problem Details & Chat */}
        <section 
          className="flex flex-col bg-gray-900 shrink-0 border-r border-gray-800"
          style={{ width: `${leftWidth}%` }}
        >
          {/* TOP HALF: Problem Details */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">{problem.title}</h1>
              <span className="inline-block bg-yellow-500/20 text-yellow-500 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wide border border-yellow-500/50">
                {problem.difficulty}
              </span>
            </div>
            <div className="prose prose-invert max-w-none text-gray-300 mb-10 whitespace-pre-wrap leading-relaxed">
              {problem.description}
            </div>
            
            <div>
              <h3 className="text-xl font-black mb-6 text-gray-500 uppercase tracking-widest border-b border-gray-700 pb-2">
                Sample Data
              </h3>
              {problem.testCases.filter(tc => !tc.isHidden).map((testCase, index) => (
                <div key={index} className="mb-10 space-y-4">
                  <h4 className="font-bold text-blue-400">Example {index + 1}:</h4>
                  <div className="bg-[#0d1117] border border-gray-700 rounded-lg overflow-hidden shadow-lg">
                    <div className="bg-gray-800 px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Standard Input (stdin)</div>
                    <div className="p-4 font-mono text-sm text-blue-300 whitespace-pre-wrap">{testCase.input}</div>
                    <div className="bg-gray-800 px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider border-t border-gray-700">Expected Output (stdout)</div>
                    <div className="p-4 font-mono text-sm text-green-400 whitespace-pre-wrap bg-[#0d1117]">{testCase.expectedOutput}</div>
                  </div>
                  {testCase.explanation && (
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                      <span className="text-xs font-bold text-yellow-500 uppercase tracking-widest block mb-2">Explanation</span>
                      <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{testCase.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* BOTTOM HALF: Live Chat Box */}
          <div className="h-64 bg-gray-950 flex flex-col border-t-4 border-gray-800 shrink-0">
            <div className="p-2 bg-gray-800 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-700 flex justify-between items-center">
              <span>Match Comm-Link</span>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            </div>
            
            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto flex flex-col space-y-3 scroll-smooth">
              {chatMessages.length === 0 ? (
                <div className="text-gray-600 text-xs text-center italic mt-auto mb-auto">Connection secure. No messages yet.</div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={`max-w-[85%] p-2 rounded shadow-md text-sm ${msg.sender === 'You' ? 'bg-blue-600 text-white self-end rounded-br-none' : 'bg-gray-700 text-gray-200 self-start rounded-bl-none'}`}
                  >
                    {msg.text}
                  </div>
                ))
              )}
              <div ref={chatEndRef} /> {/* Auto-scroll target */}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-3 bg-[#0d1117] border-t border-gray-800 flex gap-2">
              <input 
                type="text" 
                value={chatInput} 
                onChange={e => setChatInput(e.target.value)} 
                placeholder="Message opponent..." 
                maxLength={100}
                className="flex-1 bg-gray-900 border border-gray-700 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors" 
              />
              <button 
                type="submit" 
                disabled={!chatInput.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold tracking-wider uppercase transition-colors"
              >
                Send
              </button>
            </form>
          </div>
        </section>

        {/* HORIZONTAL DRAG HANDLE */}
        <div 
          onMouseDown={startHorizontalDrag}
          className="w-2 bg-gray-800 hover:bg-blue-500 transition-colors cursor-col-resize flex justify-center items-center group shrink-0 z-10"
        >
          <div className="h-8 w-1 bg-gray-600 rounded-full group-hover:bg-white transition-colors"></div>
        </div>

        {/* RIGHT PANEL: Editor & Console */}
        <section 
          className="flex flex-col bg-black shrink-0"
          style={{ width: `calc(${100 - leftWidth}% - 8px)` }}
        >
          
          {/* TOP HALF: Editor */}
          <div className="flex flex-col shrink-0" style={{ height: `${topHeight}%` }}>
            <div className="flex justify-between items-center p-2 bg-gray-800 border-b border-gray-700 text-sm">
              <div className="text-gray-400 px-2 font-mono flex items-center gap-2">
                <span>Language:</span>
                <select 
                  value={language}
                  onChange={handleLanguageChange}
                  className="bg-gray-900 border border-gray-600 text-white text-xs rounded focus:ring-blue-500 focus:border-blue-500 block p-1"
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

          {/* VERTICAL DRAG HANDLE */}
          <div 
            onMouseDown={startVerticalDrag}
            className="h-2 bg-gray-800 hover:bg-blue-500 transition-colors cursor-row-resize flex justify-center items-center group shrink-0 z-10"
          >
            <div className="w-8 h-1 bg-gray-600 rounded-full group-hover:bg-white transition-colors"></div>
          </div>

          {/* BOTTOM HALF: Console */}
          <div className="bg-gray-950 p-4 flex flex-col shrink-0 relative shadow-[inset_0_10px_20px_rgba(0,0,0,0.5)]" style={{ height: `calc(${100 - topHeight}% - 8px)` }}>
            <div className="flex justify-between items-center mb-4 relative z-10">
              <span className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">Live Console</span>
              <button 
                onClick={handleRunCode}
                disabled={isExecuting || gameOver}
                className={`relative overflow-hidden font-black py-2 px-10 rounded shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:transform-none disabled:shadow-none
                  ${isExecuting ? 'bg-gray-700 text-gray-400' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
              >
                {isExecuting ? 'EXECUTING...' : '⚡ STRIKE'}
              </button>
            </div>
            
            <div className={`flex-1 rounded-lg p-4 font-mono text-sm overflow-y-auto whitespace-pre-wrap transition-all duration-500 relative
              ${testStatus === 'Pass' ? 'bg-green-950 border-2 border-green-500 text-green-300 shadow-[0_0_30px_rgba(34,197,94,0.3)]' : 
                testStatus === 'Fail' ? 'bg-red-950 border-2 border-red-500 text-red-300 shadow-[0_0_30px_rgba(239,68,68,0.3)]' : 
                'bg-black border border-gray-800 text-gray-400'}`}
            >
              {isExecuting ? (
                <div className="animate-pulse text-blue-400 flex items-center gap-3">
                  <span>Establishing link to cloud compiler...</span>
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