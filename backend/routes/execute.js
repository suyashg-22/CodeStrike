const express = require('express');
const axios = require('axios');
const Problem = require('../models/Problem');

const router = express.Router();

// 1. Initialize the Credential Pool from .env
const apiKeys = [
    { id: process.env.JDOODLE_CLIENT_ID_1, secret: process.env.JDOODLE_CLIENT_SECRET_1 },
    { id: process.env.JDOODLE_CLIENT_ID_2, secret: process.env.JDOODLE_CLIENT_SECRET_2 },
    { id: process.env.JDOODLE_CLIENT_ID_3, secret: process.env.JDOODLE_CLIENT_SECRET_3 },
    { id: process.env.JDOODLE_CLIENT_ID_4, secret: process.env.JDOODLE_CLIENT_SECRET_4 },
    { id: process.env.JDOODLE_CLIENT_ID_5, secret: process.env.JDOODLE_CLIENT_SECRET_5 }
].filter(key => key.id && key.secret);

let currentKeyIndex = 0;

// 2. The Auto-Swapping Execution Wrapper
const executeWithRotation = async (script, language, versionIndex, stdin, attempts = 0) => {
    if (apiKeys.length === 0) throw new Error("No API keys configured in .env");
    
    const currentKey = apiKeys[currentKeyIndex];

    try {
        const response = await axios.post('https://api.jdoodle.com/v1/execute', {
            script: script,
            language: language,
            versionIndex: versionIndex,
            stdin: stdin,
            clientId: currentKey.id,
            clientSecret: currentKey.secret
        });

        // JDoodle sometimes returns 200 OK but puts "limit reached" in the error string
        if (response.data.error && response.data.error.includes("Daily limit reached")) {
            throw { response: { status: 429 } }; 
        }

        return response; 

    } catch (error) {
        // Grab the status code safely
        const status = error.response ? error.response.status : null;

        // If the key is Rate Limited (429) OR Invalid/Forbidden (401, 403)
        if (status === 429 || status === 401 || status === 403) {
            if (attempts < apiKeys.length - 1) {
                console.log(`⚠️ Key ${currentKeyIndex + 1} failed (Status: ${status}). Rotating to next key...`);
                
                // Swap to the next key in the array
                currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
                
                // Recursively try again
                return await executeWithRotation(script, language, versionIndex, stdin, attempts + 1);
            } else {
                throw new Error("CRITICAL: ALL API KEYS EXHAUSTED OR INVALID.");
            }
        }
        
        // If it's a completely different error (network offline), throw it normally
        throw error;
    }
};

// 3. The Main Execution Route
router.post('/', async (req, res) => {
    try {
        const { problemId, code, language } = req.body;

        const problem = await Problem.findById(problemId);
        if (!problem) return res.status(404).json({ message: 'Problem not found' });

        const langMap = {
            javascript: { language: 'nodejs', versionIndex: '4' },
            python: { language: 'python3', versionIndex: '4' },
            cpp: { language: 'cpp17', versionIndex: '1' }
        };

        let passedCount = 0;
        let totalCount = problem.testCases.length;
        let firstErrorMessage = "";

        // Loop through test cases using the rotation wrapper
        for (const testCase of problem.testCases) {
            const response = await executeWithRotation(
                code, 
                langMap[language].language, 
                langMap[language].versionIndex, 
                testCase.input
            );

            const actualOutput = response.data.output ? response.data.output.trim() : "";
            const expectedOutput = testCase.expectedOutput.trim();

            if (actualOutput === expectedOutput) {
                passedCount++;
            } else {
                firstErrorMessage = testCase.isHidden ? "Hidden Test Case Failed" : `Expected ${expectedOutput}, got ${actualOutput}`;
                break;
            }
        }

        const status = passedCount === totalCount ? 'Pass' : 'Fail';
        const message = status === 'Pass' ? `ALL ${totalCount} TESTS PASSED!` : `Passed ${passedCount}/${totalCount} tests.`;

        res.status(200).json({ status, passed: passedCount, total: totalCount, output: firstErrorMessage || message });

    } catch (err) {
        console.error("Execution Error:", err.message);
        res.status(500).json({ message: 'Server error during execution' });
    }
});

module.exports = router;