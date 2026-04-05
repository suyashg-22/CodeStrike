import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';

export default function Arena() {
  const [problem, setProblem] = useState(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  
  const [output, setOutput] = useState("Ready to execute...");
  const [isExecuting, setIsExecuting] = useState(false);
  const [testStatus, setTestStatus] = useState(null);

  // 1. Fetch the problem on load
  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/problems/test');
        setProblem(res.data);
        setCode(res.data.starterCode); // Default to JS starter code
      } catch (err) {
        console.error("Failed to load problem", err);
        setOutput("Error connecting to database.");
      }
    };
    fetchProblem();
  }, []);

  // 2. Handle Language Switching & Boilerplate Code
  const handleLanguageChange = (e) => {
    const selectedLang = e.target.value;
    setLanguage(selectedLang);

    // Swap the code in the editor based on language chosen
    if (selectedLang === 'javascript') {
      setCode(problem.starterCode);
    } else if (selectedLang === 'cpp') {
      setCode("#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your C++ logic here\n    // Remember to read from cin!\n    \n    return 0;\n}");
    } else if (selectedLang === 'python') {
      setCode("import sys\n\ndef solution():\n    # Read from sys.stdin.read() or input()\n    # Write your Python logic here\n    pass\n\nsolution()");
    }
  };

  // 3. The Execution Engine Trigger
  const handleRunCode = async () => {
    if (!problem) return;
    
    setIsExecuting(true);
    setOutput("Sending code to execution sandbox...\nCompiling...");
    setTestStatus(null);

    try {
      const res = await axios.post('http://localhost:5000/api/execute', {
        problemId: problem._id,
        code: code,
        language: language
      });

      setOutput(res.data.output || res.data.message);
      setTestStatus(res.data.status);

    } catch (err) {
      setOutput("Server Error: Could not execute code.");
      setTestStatus('Fail');
    } finally {
      setIsExecuting(false);
    }
  };

  if (!problem) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading Arena...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-sans">
      
      {/* 1. MATCH HEADER */}
      <header className="flex justify-between items-center p-4 bg-gray-800 border-b border-gray-700 h-16 shrink-0">
        <div className="text-xl font-black text-blue-500 tracking-widest">CODE STRIKE</div>
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-400 uppercase tracking-widest">Time Remaining</span>
          <span className="text-2xl font-mono font-bold text-red-500">15:00</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-bold">Opponent: Player2</div>
            <div className="text-xs text-gray-400">Tests Passed: 0/4</div>
          </div>
          <div className="w-32 h-3 bg-gray-700 rounded-full overflow-hidden">
            <div className="bg-green-500 w-0 h-full transition-all duration-300"></div>
          </div>
        </div>
      </header>

      {/* 2. SPLIT SCREEN */}
      <main className="flex flex-1 overflow-hidden">
        
        {/* LEFT PANEL */}
        <section className="w-1/2 p-6 overflow-y-auto border-r border-gray-700 bg-gray-900">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">{problem.title}</h1>
            <span className="inline-block bg-yellow-500/20 text-yellow-500 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wide border border-yellow-500/50">
              {problem.difficulty}
            </span>
          </div>
          <div className="prose prose-invert max-w-none text-gray-300 mb-10">
            <p className="text-lg leading-relaxed">{problem.description}</p>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4 text-gray-400 border-b border-gray-700 pb-2">Public Test Case</h3>
            <div className="bg-gray-800 p-4 rounded border border-gray-700 font-mono text-sm">
              <div className="mb-2"><span className="text-blue-400">Input:</span> {problem.testCases[0].input.replace('\n', ' | ')}</div>
              <div><span className="text-green-400">Expected:</span> {problem.testCases[0].expectedOutput}</div>
            </div>
          </div>
        </section>

        {/* RIGHT PANEL */}
        <section className="w-1/2 flex flex-col bg-black">
          
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

          <div className="flex-1 overflow-hidden border-b border-gray-800">
            <Editor
              height="100%"
              theme="vs-dark"
              language={language}
              value={code}
              onChange={(val) => setCode(val)}
              options={{ minimap: { enabled: false }, fontSize: 16, padding: { top: 16 } }}
            />
          </div>

          {/* CONSOLE AREA */}
         {/* GAMIFIED CONSOLE AREA */}
          <div className="h-64 bg-gray-950 p-4 flex flex-col shrink-0 border-t-4 border-gray-800 relative shadow-[inset_0_10px_20px_rgba(0,0,0,0.5)]">
            
            {/* Header & Button */}
            <div className="flex justify-between items-center mb-4 relative z-10">
              <span className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">Live Console</span>
              
              <button 
                onClick={handleRunCode}
                disabled={isExecuting}
                className={`relative overflow-hidden font-black py-2 px-10 rounded shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:transform-none disabled:shadow-none
                  ${isExecuting ? 'bg-gray-700 text-gray-400' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
              >
                {isExecuting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    EXECUTING...
                  </span>
                ) : '⚡ STRIKE (RUN CODE)'}
              </button>
            </div>
            
            {/* Dynamic Output Display */}
            <div className={`flex-1 rounded-lg p-4 font-mono text-sm overflow-y-auto whitespace-pre-wrap transition-all duration-500 relative
              ${testStatus === 'Pass' ? 'bg-green-950 border-2 border-green-500 text-green-300 shadow-[0_0_30px_rgba(34,197,94,0.3)]' : 
                testStatus === 'Fail' ? 'bg-red-950 border-2 border-red-500 text-red-300 shadow-[0_0_30px_rgba(239,68,68,0.3)]' : 
                testStatus === 'Error' ? 'bg-yellow-950 border-2 border-yellow-500 text-yellow-300' :
                'bg-black border border-gray-800 text-gray-400'}`}
            >
              {isExecuting ? (
                 <div className="animate-pulse text-blue-400 flex items-center gap-3">
                   <span>Establishing link to cloud compiler</span>
                   <span className="flex gap-1">
                     <span className="animate-bounce inline-block">.</span>
                     <span className="animate-bounce inline-block delay-75">.</span>
                     <span className="animate-bounce inline-block delay-150">.</span>
                   </span>
                 </div>
              ) : (
                <>
                  {/* Status Banner */}
                  {testStatus && (
                    <div className={`font-black text-xl mb-3 tracking-widest uppercase flex items-center gap-2
                      ${testStatus === 'Pass' ? 'text-green-400 animate-pulse' : 
                        testStatus === 'Fail' ? 'text-red-500' : 'text-yellow-500'}`}
                    >
                      {testStatus === 'Pass' ? '🏆 VICTORY ACHIEVED' : 
                       testStatus === 'Fail' ? '💀 CRITICAL FAILURE' : '⚠️ COMPILATION ERROR'}
                    </div>
                  )}
                  
                  {/* Actual Output */}
                  <div className="opacity-90 leading-relaxed">
                    <span className="text-gray-500 mr-2">$</span>
                    {output}
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