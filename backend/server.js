require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const executeRoutes = require('./routes/execute');

const app = express();
const Problem = require('./models/Problem');

// Middleware
app.use(express.json());
app.use(cors());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected successfully'))
  .catch(err => console.error('❌ DB Connection Error: ', err));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/execute', executeRoutes);

// Temporary route to grab a problem for testing the Arena
app.get('/api/problems/test', async (req, res) => {
    try {
        const problem = await Problem.findOne(); // Grabs the first problem in the DB
        res.status(200).json(problem);
    } catch (err) {
        res.status(500).json({ message: "Error fetching problem" });
    }
});

// Basic Health Check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'Code Strike API is live.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));