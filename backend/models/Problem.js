const mongoose = require('mongoose');

const TestCaseSchema = new mongoose.Schema({
    input: { type: String, required: true },
    expectedOutput: { type: String, required: true },
    isHidden: { type: Boolean, default: true } // Some test cases should be visible to the user, others hidden
});

const ProblemSchema = new mongoose.Schema({
    title: { type: String, required: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
    description: { type: String, required: true },
    starterCode: { type: String, required: true }, // E.g., "function twoSum(nums, target) { \n\n }"
    testCases: [TestCaseSchema]
}, { timestamps: true });

module.exports = mongoose.model('Problem', ProblemSchema);