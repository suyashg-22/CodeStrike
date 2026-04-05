require('dotenv').config();
const mongoose = require('mongoose');
const Problem = require('./models/Problem');

const seedProblems = [
    {
        title: "Binary Search",
        difficulty: "Easy",
        description: "Given a sorted array of N integers and a target value, return the index of the target. If not found, return -1.\n\nINPUT FORMAT:\nLine 1: N (Size of array)\nLine 2: N space-separated integers\nLine 3: Target integer",
        starterCode: "// Node.js\nconst fs = require('fs');\nfunction main() {\n    const input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/);\n    if (!input[0]) return;\n    // Write your logic here\n}\nmain();",
        testCases: [
            // Notice: Clean numbers now! "6" is the size, then the array, then "9" is the target.
            { 
              input: "6\n-1 0 3 5 9 12\n9", 
              expectedOutput: "4", 
              explanation: "n = 6.\nThe array is [-1, 0, 3, 5, 9, 12].\nThe target is 9, which is located at index 4.",
              isHidden: false 
            },
            { 
              input: "6\n-1 0 3 5 9 12\n2", 
              expectedOutput: "-1", 
              explanation: "n = 6.\nThe target is 2, which does not exist in the array, so we return -1.",
              isHidden: false 
            },
            { input: "1\n5\n5", expectedOutput: "0", isHidden: true },
            { input: "2\n2 5\n0", expectedOutput: "-1", isHidden: true }
        ]
    }
];

const seedDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, { family: 4 });
        await Problem.deleteMany({});
        await Problem.insertMany(seedProblems);
        console.log('🌱 Database seeded with Codeforces-style Binary Search!');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
seedDatabase();