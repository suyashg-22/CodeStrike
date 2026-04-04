const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    eloRating: { type: Number, default: 1200 }, // The competitive ranking
    matchesPlayed: { type: Number, default: 0 },
    matchesWon: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);