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
  menuMusic: new Audio('/sounds/problemselect.mp3') // <-- NEW: Menu Music!
};

// Set volumes and loops
audioCache.charge.volume = 0.9;
audioCache.menuMusic.volume = 0.7;
audioCache.menuMusic.loop = true;

export default function Training() {
  const navigate = useNavigate();
  
  // -- STATE --
  const [view, setView] = useState('menu'); // 'menu' or 'arena'
  const [problemsList, setProblemsList] = useState([]);
  
  const [problem, setProblem] = useState(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [output, setOutput] = useState("Time Chamber ready...");
  const [isExecuting, setIsExecuting] = useState(false);
  const [testStatus, setTestStatus] = useState(null);
  const [myTests, setMyTests] = useState("0/0");
  const [myProgress, setMyProgress] = useState(0);
  const [trainingComplete, setTrainingComplete] = useState(false);

  // 1. Fetch all algorithms on load
  useEffect(() => {
    axios.get('http://localhost:5000/api/problems')
      .then(res => setProblemsList(res.data))
      .catch(err => console.error("Failed to fetch problems list", err));
  }, []);

  // 2. NEW: Control the Menu Music based on the current View
  useEffect(() => {
    if (view === 'menu') {
      audioCache.menuMusic.play().catch(() => {
        // Fallback for browser autoplay policies
        const startMusic = () => {
          audioCache.menuMusic.play().catch(()=>{});
          document.removeEventListener('click', startMusic);
        };
        document.addEventListener('click', startMusic);
      });
    } else {
      // Stop music instantly when entering the Arena
      audioCache.menuMusic.pause();
      audioCache.menuMusic.currentTime = 0; 
    }

    // Cleanup when leaving the Time Chamber entirely
    return () => {
      audioCache.menuMusic.pause();
    };
  }, [view]);

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
    
    axios.get(`http://localhost:5000/api/problems/${id}`)
      .then(res => {
        setProblem(res.data);
        setMyTests(`0/${res.data.testCases.length}`);
        
        // Ensure the code resets to JS initially to match state
        setLanguage("javascript");
        setCode(res.data.starterCode);
        
        setView('arena'); 
      })
      .catch(err => console.error(err));
  };

  // NEW: Handle Language Changes
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
      const res = await axios.post('http://localhost:5000/api/execute', {
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
            await axios.post('http://localhost:5000/api/auth/master-problem', {
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

  const getDifficultyColor = (diff) => {
    if (diff === 'Easy') return 'text-green-600 bg-green-100 border-green-200';
    if (diff === 'Medium') return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    return 'text-red-600 bg-red-100 border-red-200';
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-black font-sans relative overflow-hidden">
      
      {/* HEADER */}
      <header className="flex justify-between items-center p-4 bg-white border-b-2 border-gray-200 h-16 shrink-0 relative z-20 shadow-sm">
        <div className="text-xl font-black text-gray-800 tracking-widest">
          HYPERBOLIC TIME CHAMBER
        </div>
        <div className="flex gap-4">
          {view === 'arena' && (
            <button 
              onClick={() => { playSound('button'); setView('menu'); }}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold tracking-widest uppercase transition-colors rounded"
            >
              Back to Menu
            </button>
          )}
          <button 
            onClick={() => { playSound('button'); navigate('/dashboard'); }}
            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 font-bold tracking-widest uppercase transition-colors rounded"
          >
            Exit Chamber
          </button>
        </div>
      </header>

      {/* VIEW CONTROLLER */}
      {view === 'menu' ? (
        
        /* THE SELECTION MENU */
        <main className="flex-1 overflow-y-auto p-10 container mx-auto">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-black text-gray-900 mb-2 uppercase tracking-widest">Select Training Module</h1>
            <p className="text-gray-500 mb-10 font-medium">Choose an algorithm to master. Your Elo will not be affected in this environment.</p>
            
            {problemsList.length === 0 ? (
              <div className="text-gray-400 font-bold animate-pulse text-xl">Loading holographic database...</div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {problemsList.map((p) => (
                  <div 
                    key={p._id} 
                    className="flex justify-between items-center bg-white p-6 rounded-lg border-2 border-transparent hover:border-blue-400 shadow-sm hover:shadow-md transition-all cursor-pointer"
                    onClick={() => handleSelectProblem(p._id)}
                  >
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{p.title}</h3>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wide border ${getDifficultyColor(p.difficulty)}`}>
                        {p.difficulty}
                      </span>
                      <button className="text-blue-500 font-black tracking-widest uppercase text-sm hover:text-blue-700">
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
        <main className="flex flex-1 overflow-hidden">
          
          {/* SUCCESS MODAL */}
          <AnimatePresence>
            {trainingComplete && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm"
              >
                <motion.div 
                  initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }}
                  className="p-10 rounded-lg border-4 border-yellow-400 bg-white shadow-[0_0_100px_rgba(250,204,21,0.5)] text-center max-w-md"
                >
                  <h2 className="text-4xl font-black mb-2 tracking-widest text-yellow-500 uppercase">LIMIT BROKEN</h2>
                  <p className="text-gray-600 mb-8 font-bold">Algorithm Mastered.</p>
                  <div className="flex flex-col gap-4">
                    <button 
                      onClick={() => { playSound('button'); setView('menu'); }}
                      className="bg-yellow-500 hover:bg-yellow-400 text-white font-black py-4 px-8 rounded tracking-widest uppercase transition shadow-lg"
                    >
                      Select Next Algorithm
                    </button>
                    <button 
                      onClick={() => { playSound('button'); navigate('/dashboard'); }}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-8 rounded tracking-widest uppercase transition"
                    >
                      Exit Chamber
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* LEFT: Problem Description */}
          <section className="w-1/2 flex flex-col bg-white border-r-2 border-gray-200 overflow-y-auto p-8">
            <h1 className="text-4xl font-black mb-4 text-gray-900">{problem.title}</h1>
            <span className={`inline-block w-max text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wide mb-8 border ${getDifficultyColor(problem.difficulty)}`}>
              {problem.difficulty}
            </span>
            <div className="prose max-w-none text-gray-700 mb-10 whitespace-pre-wrap leading-relaxed font-medium">
              {problem.description}
            </div>
            
            <h3 className="text-xl font-black mb-4 text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-2">
              Training Data
            </h3>
            {problem.testCases.filter(tc => !tc.isHidden).map((testCase, index) => (
              <div key={index} className="mb-6">
                <h4 className="font-bold text-gray-500 mb-2">Example {index + 1}:</h4>
                <div className="bg-gray-50 border border-gray-200 rounded p-4 font-mono text-sm">
                  <div className="text-gray-400 text-xs mb-1">Input:</div>
                  <div className="text-gray-800 whitespace-pre-wrap mb-4">{testCase.input}</div>
                  <div className="text-gray-400 text-xs mb-1">Output:</div>
                  <div className="text-green-600 whitespace-pre-wrap">{testCase.expectedOutput}</div>
                </div>
              </div>
            ))}
          </section>

          {/* RIGHT: Editor & Console */}
          <section className="w-1/2 flex flex-col bg-[#1e1e1e]">
            
            {/* NEW: LANGUAGE SELECTOR */}
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