require('dotenv').config();
const mongoose = require('mongoose');
const Problem = require('./models/Problem');

// The Problem Library
const seedProblems = [
    {
        title: "Binary Search",
        difficulty: "Easy",
        description: "Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, then return its index. Otherwise, return -1.",
        starterCode: "function search(nums, target) {\n  // Write your code here\n}",
        testCases: [
            { input: "[-1,0,3,5,9,12]\n9", expectedOutput: "4", isHidden: false },
            { input: "[-1,0,3,5,9,12]\n2", expectedOutput: "-1", isHidden: false },
            { input: "[5]\n5", expectedOutput: "0", isHidden: true },
            { input: "[2,5]\n0", expectedOutput: "-1", isHidden: true }
        ]
    },
    {
        title: "Maximum Subarray",
        difficulty: "Medium",
        description: "Given an integer array `nums`, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum. Hint: Kadane's Algorithm is highly efficient here.",
        starterCode: "function maxSubArray(nums) {\n  // Write your code here\n}",
        testCases: [
            { input: "[-2,1,-3,4,-1,2,1,-5,4]", expectedOutput: "6", isHidden: false },
            { input: "[1]", expectedOutput: "1", isHidden: false },
            { input: "[5,4,-1,7,8]", expectedOutput: "23", isHidden: true },
            { input: "[-1]", expectedOutput: "-1", isHidden: true }
        ]
    }
];

// The Seeding Logic
const seedDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, { family: 4 }); // Using your IPv4 bypass
        console.log('✅ Connected to MongoDB for seeding...');

        // Clear existing problems to avoid duplicates
        await Problem.deleteMany({});
        console.log('🗑️ Cleared existing problems.');

        // Insert the new problems
        await Problem.insertMany(seedProblems);
        console.log('🌱 Successfully seeded the problem library!');

        process.exit();
    } catch (err) {
        console.error('❌ Seeding Error: ', err);
        process.exit(1);
    }
};

seedDatabase();