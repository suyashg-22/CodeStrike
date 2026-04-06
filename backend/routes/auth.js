const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Importing the Mongoose schema we made earlier
const Match = require('../models/Match'); // Make sure to import the Match model!

const router = express.Router();

// ==========================================
// 1. REGISTER ENDPOINT (/api/auth/register)
// ==========================================
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'Username or Email already taken.' });
        }

        // Hash the password for security
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create and save the new user
        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });
        await newUser.save();

        // Generate a JWT Token
        const token = jwt.sign(
            { id: newUser._id, username: newUser.username }, 
            process.env.JWT_SECRET, 
            { expiresIn: '7d' } // Token lasts for 7 days
        );

        // Send token and user data back to the frontend
        // FIX: Ensured the key is "_id" and sent the full stats
        res.status(201).json({
            token,
            user: { 
                _id: newUser._id, 
                username: newUser.username, 
                elo: newUser.elo || 1000,
                wins: newUser.wins || 0,
                losses: newUser.losses || 0
            }
        });
    } catch (err) {
        console.error("Registration Error:", err);
        // FIX: Properly handle errors instead of referencing undefined variables
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// ==========================================
// 2. LOGIN ENDPOINT (/api/auth/login)
// ==========================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find the user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password.' });
        }

        // Compare the provided password with the hashed password in DB
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password.' });
        }

        // Generate a JWT Token
        const token = jwt.sign(
            { id: user._id, username: user.username }, 
            process.env.JWT_SECRET, 
            { expiresIn: '7d' }
        );

        // Send token and user data back
        // FIX: Ensured the key is "_id"
        res.status(200).json({
            token,
            user: { 
                _id: user._id, 
                username: user.username, 
                elo: user.elo || 1000,
                wins: user.wins || 0,
                losses: user.losses || 0
            }
        });
    } catch (err) {
        console.error("Login Error:", err);
        // FIX: Properly handle errors
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// ==========================================
// 3. PROFILE ENDPOINT (/api/auth/profile/:id)
// ==========================================
router.get('/profile/:id', async (req, res) => {
    try {
        // 1. Get the user's stats
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });

        // 2. Get their match history (populate opponent names and problem titles)
        const history = await Match.find({ 
            $or: [{ winnerId: user._id }, { loserId: user._id }] 
        })
        .populate('winnerId', 'username')
        .populate('loserId', 'username')
        .populate('problemId', 'title')
        .sort({ date: -1 }) // Newest matches first
        .limit(10); // Only grab the last 10 games

        res.status(200).json({ user, history });
    } catch (err) {
        console.error("Profile Error:", err);
        res.status(500).json({ message: 'Server error fetching profile' });
    }
});

// ==========================================
// 4. LEADERBOARD ENDPOINT (/api/auth/leaderboard)
// ==========================================
router.get('/leaderboard', async (req, res) => {
    try {
        // Find top 10 users, sort by elo descending (-1), and exclude their passwords
        const topFighters = await User.find()
            .sort({ elo: -1 })
            .limit(10)
            .select('username elo wins losses'); 
            
        res.status(200).json(topFighters);
    } catch (err) {
        console.error("Leaderboard Error:", err);
        res.status(500).json({ message: 'Server error fetching leaderboard' });
    }
});

module.exports = router;