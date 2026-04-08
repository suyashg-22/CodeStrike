import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

// --- AUDIO CACHE ---
const audioCache = {
  button: new Audio('/sounds/buttonPress.mp3'),
  charge: new Audio('/sounds/kame_charge.mp3'),
  victory: new Audio('/sounds/pvz-victory.mp3'),
  fail: new Audio('/sounds/dragon-ball-z-heavy-punch.mp3'),
  menuMusic: new Audio('/sounds/problemselect.mp3')
};

audioCache.charge.volume = 0.9;
audioCache.menuMusic.volume = 0.7;
audioCache.menuMusic.loop = true;

export default function Training() {
  const navigate = useNavigate();
  
  // -- FIXED STATE: Lazy Initialization from LocalStorage --
  const [view, setView] = useState(() => {
    return localStorage.getItem('activeTraining') ? 'arena' : 'menu';
  });
  const [problem, setProblem] = useState(() => {
    const saved = localStorage.getItem('activeTraining');
    return saved ? JSON.parse(saved).problem : null;
  });
  const [code, setCode] = useState(() => {
    const saved = localStorage.getItem('activeTraining');
    return saved ? JSON.parse(saved).code : "";
  });
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('activeTraining');
    return saved ? JSON.parse(saved).language : "javascript";
  });

  const [problemsList, setProblemsList] = useState([]);
  const [output, setOutput] = useState("Time Chamber ready...");
  const [isExecuting, setIsExecuting] = useState(false);
  const [testStatus, setTestStatus] = useState(null);
  
  // Set initial tests display based on if a problem is loaded
  const [myTests, setMyTests] = useState(() => {
    const saved = localStorage.getItem('activeTraining');
    return saved ? `0/${JSON.parse(saved).problem.testCases.length}` : "0/0";
  });
  const [myProgress, setMyProgress] = useState(0);
  const [trainingComplete, setTrainingComplete] = useState(false);

  // 1. Fetch all algorithms on load
  useEffect(() => {
    axios.get('https://code-strike-backend.onrender.com/api/problems')
      .then(res => setProblemsList(res.data))
      .catch(err => console.error("Failed to fetch problems list", err));
  }, []);

  // 2. Control the Menu Music based on the current View
  useEffect(() => {
    if (view === 'menu') {
      audioCache.menuMusic.play().catch(() => {
        const startMusic = () => {
          audioCache.menuMusic.play().catch(()=>{});
          document.removeEventListener('click', startMusic);
        };
        document.addEventListener('click', startMusic);
      });
    } else {
      audioCache.menuMusic.pause();
      audioCache.menuMusic.currentTime = 0; 
    }
    return () => audioCache.menuMusic.pause();
  }, [view]);

  // NEW: 3. Auto-Save Progress to LocalStorage!
  useEffect(() => {
    if (view === 'arena' && problem) {
      localStorage.setItem('activeTraining', JSON.stringify({ problem, code, language }));
    }
  }, [code, language, problem, view]);

  const playSound = (type) => {
    try {
      audioCache[type].currentTime = 0;
      audioCache[type].play().catch(() => {});
    } catch (e) {}
  };

  const handleSelectProblem = (id) => {
    playSound('button');
    setTrainingComplete(false);
    setOutput("Ready to execute...");
    setTestStatus(null);
    setMyProgress(0);
    
    axios.get(`https://code-strike-backend.onrender.com/api/problems/${id}`)
      .then(res => {
        const fetchedProblem = res.data;
        setProblem(fetchedProblem);
        setMyTests(`0/${fetchedProblem.testCases.length}`);
        setLanguage("javascript");
        setCode(fetchedProblem.starterCode);
        setView('arena'); 

        // Instantly save to local storage
        localStorage.setItem('activeTraining', JSON.stringify({
          problem: fetchedProblem,
          language: "javascript",
          code: fetchedProblem.starterCode
        }));
      })
      .catch(err => console.error(err));
  };

  const handleLanguageChange = (e) => {
    const selectedLang = e.target.value;
    setLanguage(selectedLang);
    
    if (selectedLang === 'javascript') {
      setCode(`// Node.js\nconst fs = require('fs');\nfunction main() {\n    const input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/);\n    if (!input[0]) return;\n    \n    // Write your logic here\n}\nmain();`);
    } else if (selectedLang === 'cpp') {
      setCode(`#include <iostream>\n#include <vector>\n#include <string>\nusing namespace std;\n\nint main() {\n    // Read your input here\n    // Example: int n; cin >> n;\n    \n    return 0;\n}`);
    } else if (selectedLang === 'python') {
      setCode(`import sys\n\ndef main():\n    input_data = sys.stdin.read().split()\n    if not input_data: return\n    \n    # Write your logic here\n\nif __name__ == '__main__':\n    main()`);
    }
  };

  const handleRunCode = async () => {
    if (!problem) return;
    playSound('charge');
    setIsExecuting(true);
    setOutput("Executing algorithm...");
    setTestStatus(null);

    try {
      const res = await axios.post('https://code-strike-backend.onrender.com/api/execute', {
        problemId: problem._id, code, language
      });
      
      audioCache.charge.pause();
      setOutput(res.data.output || res.data.message);
      setTestStatus(res.data.status);

      if (res.data.total) {
        const percentage = (res.data.passed / res.data.total) * 100;
        setMyProgress(percentage);
        setMyTests(`${res.data.passed}/${res.data.total}`);
        
        if (res.data.passed === res.data.total) {
          playSound('victory');
          setTrainingComplete(true);
          
          const user = JSON.parse(localStorage.getItem('user'));
          if (user) {
            await axios.post('https://code-strike-backend.onrender.com/api/auth/master-problem', {
              userId: user._id,
              problemId: problem._id
            });
          }
        } else {
          playSound('fail');
        }
      }
    } catch (err) {
      audioCache.charge.pause();
      playSound('fail');
      setOutput("Server Error.");
      setTestStatus('Fail');
    } finally {
      setIsExecuting(false);
    }
  };

  // Helper function to safely clear the session
  const clearTrainingSession = () => {
    playSound('button');
    localStorage.removeItem('activeTraining');
    setView('menu');
  };

  const getDifficultyColor = (diff) => {
    if (diff === 'Easy') return 'text-green-400 bg-green-900/30 border-green-500/50';
    if (diff === 'Medium') return 'text-yellow-400 bg-yellow-900/30 border-yellow-500/50';
    return 'text-red-400 bg-red-900/30 border-red-500/50';
  };

  return (
    <div className="flex flex-col h-screen font-sans relative overflow-hidden bg-black">
      
      {view === 'menu' && (
        <>
          <div 
            className="absolute inset-0 bg-cover bg-center z-0"
            style={{ backgroundImage: "url('/backgrounds/hyperbolic-time-chamber.jpg')" }}
          ></div>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm z-0"></div>

          <motion.img 
            animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            src="/characters/vegeta.png" 
            className="hidden xl:block absolute bottom-0 left-4 h-[75vh] object-contain z-10 drop-shadow-[0_0_25px_rgba(59,130,246,0.6)] pointer-events-none" alt="Vegeta"
          />
          <motion.img 
            animate={{ y: [0, 15, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            src="/characters/ultrainstinct.png" 
            className="hidden xl:block absolute bottom-10 right-4 h-[80vh] object-contain z-10 drop-shadow-[0_0_35px_rgba(255,255,255,0.7)] pointer-events-none" alt="UI Goku"
          />
        </>
      )}

      {view === 'arena' && (
        <>
          <div 
            className="absolute inset-0 bg-cover bg-center z-0"
            style={{ backgroundImage: "url('/backgrounds/Tournament%20of%20Power.jpg')" }}
          ></div>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-0"></div>
        </>
      )}

      {/* HEADER */}
      <header className={`flex justify-between items-center p-4 border-b h-16 shrink-0 relative z-20 shadow-sm ${view === 'menu' ? 'bg-black/40 backdrop-blur-md border-white/20' : 'bg-black/60 backdrop-blur-md border-white/10'}`}>
        <div className="text-4xl font-saiyan tracking-widest uppercase drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600">
          Hyperbolic Time Chamber
        </div>
        <div className="flex gap-4">
          {view === 'arena' && (
            <button 
              onClick={clearTrainingSession} // FIXED: Clears cache when going back
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold tracking-widest uppercase transition-colors rounded backdrop-blur-sm"
            >
              Back to Menu
            </button>
          )}
          <button 
            onClick={() => { playSound('button'); localStorage.removeItem('activeTraining'); navigate('/dashboard'); }} // FIXED: Clears cache on exit
            className={`px-4 py-2 font-bold tracking-widest uppercase transition-colors rounded shadow-lg ${view === 'menu' ? 'bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 text-white' : 'bg-red-500/80 hover:bg-red-600 text-white border border-red-500'}`}
          >
            Exit Chamber
          </button>
        </div>
      </header>

      {/* VIEW CONTROLLER */}
      {view === 'menu' ? (
        
        <main className="flex-1 overflow-y-auto p-4 md:p-10 container mx-auto relative z-20 custom-scrollbar">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-5xl font-saiyan tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-blue-300 to-blue-500 mb-2 uppercase drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] text-center">
              Select Training Module
            </h1>
            <p className="text-gray-200 mb-10 font-bold tracking-wider text-center drop-shadow-md">Choose an algorithm to master. Your Elo will not be affected in this environment.</p>
            
            {problemsList.length === 0 ? (
              <div className="text-yellow-400 font-bold animate-pulse text-xl tracking-widest text-center">Loading holographic database...</div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {problemsList.map((p) => (
                  <div 
                    key={p._id} 
                    className="flex justify-between items-center bg-black/40 backdrop-blur-md p-5 rounded-lg border border-white/10 hover:border-yellow-400 hover:bg-black/60 shadow-xl hover:shadow-[0_0_20px_rgba(250,204,21,0.4)] transition-all cursor-pointer transform hover:-translate-y-1"
                    onClick={() => handleSelectProblem(p._id)}
                  >
                    <div>
                      <h3 className="text-2xl font-black text-white drop-shadow-md">{p.title}</h3>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest border ${getDifficultyColor(p.difficulty)}`}>
                        {p.difficulty}
                      </span>
                      <button className="text-yellow-400 font-black tracking-widest uppercase text-sm hover:text-yellow-300 drop-shadow-md">
                        TRAIN ➔
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

      ) : (

        /* THE ARENA TRAINING VIEW */
        <main className="flex flex-1 overflow-hidden relative z-10">
          
          <AnimatePresence>
            {trainingComplete && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
              >
                <motion.div 
                  initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }}
                  className="p-10 rounded-lg border-4 border-yellow-400 bg-gray-900 shadow-[0_0_100px_rgba(250,204,21,0.5)] text-center max-w-md"
                >
                  <h2 className="text-4xl font-black mb-2 tracking-widest text-yellow-500 uppercase">LIMIT BROKEN</h2>
                  <p className="text-gray-300 mb-8 font-bold">Algorithm Mastered.</p>
                  <div className="flex flex-col gap-4">
                    <button onClick={clearTrainingSession} className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-black py-4 px-8 rounded tracking-widest uppercase transition shadow-lg" >
                      Select Next Algorithm
                    </button>
                    <button onClick={() => { playSound('button'); localStorage.removeItem('activeTraining'); navigate('/dashboard'); }} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded tracking-widest uppercase transition border border-gray-500" >
                      Exit Chamber
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* LEFT: Problem Description */}
          <section className="w-1/2 flex flex-col bg-black/40 backdrop-blur-md border-r border-white/10 overflow-y-auto p-8 text-white relative custom-scrollbar">
            
            <motion.img 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              src="/characters/vegito.png" 
              className="absolute bottom-0 right-0 h-[60vh] object-contain opacity-20 pointer-events-none mix-blend-screen drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] z-0"
              alt="Vegito Watermark"
            />

            <div className="relative z-10">
              <h1 className="text-4xl font-black mb-4 text-white drop-shadow-md">{problem.title}</h1>
              <span className={`inline-block w-max text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wide mb-8 border ${getDifficultyColor(problem.difficulty)}`}>
                {problem.difficulty}
              </span>
              <div className="prose max-w-none text-gray-200 mb-10 whitespace-pre-wrap leading-relaxed font-medium drop-shadow-md">
                {problem.description}
              </div>
              
              <h3 className="text-xl font-black mb-4 text-gray-300 uppercase tracking-widest border-b border-white/20 pb-2">
                Training Data
              </h3>
              {problem.testCases.filter(tc => !tc.isHidden).map((testCase, index) => (
                <div key={index} className="mb-6">
                  <h4 className="font-bold text-gray-400 mb-2">Example {index + 1}:</h4>
                  <div className="bg-black/50 border border-white/10 rounded p-4 font-mono text-sm shadow-inner">
                    <div className="text-gray-400 text-xs mb-1">Input:</div>
                    <div className="text-gray-200 whitespace-pre-wrap mb-4">{testCase.input}</div>
                    <div className="text-gray-400 text-xs mb-1">Output:</div>
                    <div className="text-green-400 whitespace-pre-wrap">{testCase.expectedOutput}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* RIGHT: Editor & Console */}
          <section className="w-1/2 flex flex-col bg-[#1e1e1e] relative z-20">
            
            <div className="flex justify-between items-center p-2 bg-gray-800 border-b border-gray-700 text-sm shrink-0">
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

            <div className="flex-1 overflow-hidden">
              <Editor
                height="100%" theme="vs-dark" language={language} value={code}
                onChange={(val) => setCode(val)}
                options={{ minimap: { enabled: false }, fontSize: 16 }}
              />
            </div>

            <div className="bg-gray-900 p-6 flex flex-col h-64 shrink-0 border-t-4 border-gray-800">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4 w-1/2">
                  <span className="text-xs font-black text-gray-500 uppercase">Tests: {myTests}</span>
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="bg-white h-full transition-all duration-500" style={{ width: `${myProgress}%` }}></div>
                  </div>
                </div>
                <button 
                  onClick={handleRunCode} disabled={isExecuting}
                  className="bg-white hover:bg-gray-200 text-black font-black py-3 px-12 rounded tracking-widest uppercase transition disabled:opacity-50"
                >
                  {isExecuting ? 'EXECUTING...' : 'RUN'}
                </button>
              </div>
              
              <div className={`flex-1 rounded p-4 font-mono text-sm overflow-y-auto whitespace-pre-wrap
                ${testStatus === 'Pass' ? 'bg-green-900/30 text-green-400' : testStatus === 'Fail' ? 'bg-red-900/30 text-red-400' : 'bg-black text-gray-400'}`}
              >
                $ {output}
              </div>
            </div>
          </section>

        </main>
      )}
    </div>
  );
}