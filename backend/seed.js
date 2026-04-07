require('dotenv').config();
const mongoose = require('mongoose');
const Problem = require('./models/Problem');
const fs = require('fs');
const path = require('path');

const seedDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, { family: 4 });
        
        // 1. Wipe the old problem database to prevent duplicates
        console.log('🗑️  Clearing old algorithms...');
        await Problem.deleteMany({});

        // 2. Read the JSON file dynamically
        console.log('📖 Reading problems.json...');
        const rawData = fs.readFileSync(path.join(__dirname, 'data', 'problems.json'));
        const seedProblems = JSON.parse(rawData);

        // 3. Inject into MongoDB
        await Problem.insertMany(seedProblems);
        console.log(`✅ Database seeded with ${seedProblems.length} Codeforces-style Problems!`);
        
        process.exit();
    } catch (err) {
        console.error('❌ DB Seeding Error:', err);
        process.exit(1);
    }
};

seedDatabase();