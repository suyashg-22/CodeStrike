const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
    winnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    loserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem' },
    reason: { type: String, enum: ['completed', 'disconnect'], required: true },
    eloChange: { type: Number, default: 0 },
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Match', matchSchema);