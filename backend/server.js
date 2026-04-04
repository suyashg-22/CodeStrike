require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Import our new Auth Routes
const authRoutes = require('./routes/auth');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected successfully'))
  .catch(err => console.error('❌ DB Connection Error: ', err));

// API Routes
app.use('/api/auth', authRoutes); // <--- We mounted the routes here!

// Basic Health Check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'Code Strike API is live.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));