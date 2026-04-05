const express = require('express');
const axios = require('axios');
const Problem = require('../models/Problem');
const router = express.Router();

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

        // 1. Prepare Code Wrapper
        let finalCode = code;
        if (language === 'javascript') {
            const functionName = problem.starterCode.split(' ')[1].split('(')[0]; 
            finalCode = `
${code}
const fs = require('fs');
try {
    const input = fs.readFileSync(0, 'utf8').trim();
    if (input) {
        const args = input.split('\\n').map(line => {
            try { return JSON.parse(line); } catch(e) { return line; }
        });
        console.log(${functionName}(...args));
    }
} catch (err) { process.exit(0); }`;
        }

        let passedCount = 0;
        let totalCount = problem.testCases.length;
        let firstErrorMessage = "";

        // 2. Loop through ALL test cases (JDoodle calls)
        for (const testCase of problem.testCases) {
            const response = await axios.post('https://api.jdoodle.com/v1/execute', {
                script: finalCode,
                language: langMap[language].language,
                versionIndex: langMap[language].versionIndex,
                stdin: testCase.input,
                clientId: process.env.JDOODLE_CLIENT_ID,
                clientSecret: process.env.JDOODLE_CLIENT_SECRET
            });

            const actualOutput = response.data.output ? response.data.output.trim() : "";
            const expectedOutput = testCase.expectedOutput.trim();

            if (actualOutput === expectedOutput) {
                passedCount++;
            } else {
                if (!firstErrorMessage) {
                    firstErrorMessage = testCase.isHidden ? "Hidden Test Case Failed" : `Expected ${expectedOutput}, got ${actualOutput}`;
                }
            }
        }

        // 3. Final Evaluation
        const status = passedCount === totalCount ? 'Pass' : 'Fail';
        const message = status === 'Pass' ? `ALL ${totalCount} TESTS PASSED!` : `Passed ${passedCount}/${totalCount} tests.`;

        res.status(200).json({ status, passed: passedCount, total: totalCount, output: firstErrorMessage || message });

    } catch (err) {
        console.error("Execution Error:", err.message);
        res.status(500).json({ message: 'Server error during execution' });
    }
});

module.exports = router;