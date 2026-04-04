const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Importing the Mongoose schema we made earlier

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
        res.status(201).json({
            token,
            user: { id: newUser._id, username: newUser.username, eloRating: newUser.eloRating }
        });
    } catch (err) {
        console.error(err);
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
        res.status(200).json({
            token,
            user: { id: user._id, username: user.username, eloRating: user.eloRating }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

module.exports = router;