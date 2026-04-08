require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http'); 
const { Server } = require('socket.io'); 

const authRoutes = require('./routes/auth');
const executeRoutes = require('./routes/execute');
const Problem = require('./models/Problem');

const app = express();
const server = http.createServer(app); 

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});
const User = require('./models/User'); 
const Match = require('./models/Match');
const calculateElo = require('./utils/elo');

// Middleware
app.use(express.json());
app.use(cors({
    origin: "*" // UPDATED: Allows Express API calls from anywhere
}));

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected successfully'))
  .catch(err => console.error('❌ DB Connection Error: ', err));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/execute', executeRoutes);

// Fetch ALL problems for the Time Chamber Menu
app.get('/api/problems', async (req, res) => {
    try {
        const problems = await Problem.find().select('title difficulty');
        res.status(200).json(problems);
    } catch (err) {
        res.status(500).json({ message: "Error fetching problem list" });
    }
});

// Fetch a specific problem by ID
app.get('/api/problems/:id', async (req, res) => {
    try {
        const problem = await Problem.findById(req.params.id);
        if (!problem) return res.status(404).json({ message: "Problem not found" });
        res.status(200).json(problem);
    } catch (err) {
        res.status(500).json({ message: "Error fetching problem" });
    }
});

// Fetch a random problem for the Time Chamber
app.get('/api/problems/training/random', async (req, res) => {
    try {
        const problems = await Problem.find();
        const randomProblem = problems[Math.floor(Math.random() * problems.length)];
        res.status(200).json(randomProblem);
    } catch (err) {
        res.status(500).json({ message: "Error fetching training problem" });
    }
});

// Record a Mastered Problem
app.post('/api/auth/master-problem', async (req, res) => {
    try {
        const { userId, problemId } = req.body;
        const user = await User.findById(userId);
        
        if (user && !user.solvedProblems.includes(problemId)) {
            user.solvedProblems.push(problemId);
            await user.save();
        }
        res.status(200).json({ message: "Algorithm Mastered" });
    } catch (err) {
        res.status(500).json({ message: "Error saving mastery" });
    }
});

// ==========================================
// SOCKET.IO MATCHMAKING ENGINE
// ==========================================
let matchmakingQueue = []; 
const activeMatches = {}; 
const socketToMatch = {}; 
const disconnectTimeouts = {}; 

let isMatchmakingRunning = false;

// THE TICK ENGINE: Runs every 2 seconds
setInterval(async () => {
    if (matchmakingQueue.length < 2 || isMatchmakingRunning) return;
    isMatchmakingRunning = true;

    let matchedSocketIds = new Set();

    for (let i = 0; i < matchmakingQueue.length; i++) {
        const p1 = matchmakingQueue[i];
        if (matchedSocketIds.has(p1.socketId)) continue;

        // 1. EXPANDING RADIUS LOGIC
        const waitTime = Date.now() - p1.joinTime;
        let eloRadius = 200; // 0-10 seconds
        if (waitTime >= 10000 && waitTime < 20000) eloRadius = 400; // 10-20 seconds
        else if (waitTime >= 20000) eloRadius = Infinity; // 20+ seconds (Match anyone!)

        for (let j = i + 1; j < matchmakingQueue.length; j++) {
            const p2 = matchmakingQueue[j];
            if (matchedSocketIds.has(p2.socketId)) continue;

            if (Math.abs(p1.elo - p2.elo) <= eloRadius) {
                // MATCH FOUND!
                matchedSocketIds.add(p1.socketId);
                matchedSocketIds.add(p2.socketId);

                const matchId = `match_${Date.now()}`;
                const avgElo = (p1.elo + p2.elo) / 2;
                
                // 2. DYNAMIC DIFFICULTY & TIME LIMITS
                let targetDifficulty = 'Easy';
                let matchDurationSeconds = 10 * 60; // 10 Minutes

                if (avgElo >= 1400) { 
                    targetDifficulty = 'Medium'; 
                    matchDurationSeconds = 20 * 60; // 20 Minutes
                }
                if (avgElo >= 1800) { 
                    targetDifficulty = 'Hard'; 
                    matchDurationSeconds = 30 * 60; // 30 Minutes
                }

                try {
                    let problems = await Problem.find({ difficulty: targetDifficulty });
                    if (problems.length === 0) problems = await Problem.find(); 

                    const randomProblem = problems[Math.floor(Math.random() * problems.length)];
                    const startTime = Date.now();
                    
                    activeMatches[matchId] = { player1: p1, player2: p2, startTime, problemId: randomProblem._id, duration: matchDurationSeconds };
                    socketToMatch[p1.socketId] = matchId;
                    socketToMatch[p2.socketId] = matchId;

                    p1.socket.join(matchId);
                    p2.socket.join(matchId);

                    // Send the new "duration" property to the frontend
                    io.to(matchId).emit('match_found', { matchId, problemId: randomProblem._id, startTime, duration: matchDurationSeconds });
                    
                    console.log(`⚔️ Match: ${p1.elo} vs ${p2.elo} | Diff: ${targetDifficulty} | Time: ${matchDurationSeconds / 60}m | Wait: ${Math.round(waitTime/1000)}s`);
                } catch (err) { console.error(err); }
                break; // Break inner loop, move to next p1
            }
        }
    }

    // Clean up the queue
    if (matchedSocketIds.size > 0) {
        matchmakingQueue = matchmakingQueue.filter(p => !matchedSocketIds.has(p.socketId));
    }
    isMatchmakingRunning = false;

}, 2000); // 2 Second Tick Rate


io.on('connection', (socket) => {
    console.log(`👤 User Connected: ${socket.id}`);

    // Add to Matchmaking Engine
    socket.on('find_match', (data) => {
        if (!matchmakingQueue.find(p => p.socketId === socket.id)) {
            matchmakingQueue.push({
                socketId: socket.id,
                dbId: data.userId,
                elo: data.elo || 1000,
                socket: socket,
                joinTime: Date.now() // Track exactly when they entered the queue
            });
            console.log(`📡 ${socket.id} (${data.elo || 1000} Elo) entered the queue.`);
        }
    });

    socket.on('cancel_search', () => {
        matchmakingQueue = matchmakingQueue.filter(p => p.socketId !== socket.id);
        console.log(`🛑 User ${socket.id} aborted search.`);
    });

    socket.on('rejoin_match', (matchId) => {
        if (activeMatches[matchId]) {
            socket.join(matchId);
            socketToMatch[socket.id] = matchId;
            if (disconnectTimeouts[matchId]) {
                clearTimeout(disconnectTimeouts[matchId]);
                delete disconnectTimeouts[matchId];
                console.log(`⏱️ Saved ${matchId} from disconnect timeout.`);
            }
            console.log(`🔄 ${socket.id} rejoined ${matchId}`);
        }
    });

    socket.on('update_progress', (data) => {
        socket.to(data.matchId).emit('opponent_progress', data);
    });

    // INSTANT WIN & DATABASE SAVE
    socket.on('player_won', async (matchId) => {
        const match = activeMatches[matchId];
        if (!match) return;

        io.to(matchId).emit('match_over', { winner: socket.id, reason: 'completed' });
        
        try {
            const winnerId = match.player1.socketId === socket.id ? match.player1.dbId : match.player2.dbId;
            const loserId = match.player1.socketId === socket.id ? match.player2.dbId : match.player1.dbId;

            const winner = await User.findById(winnerId);
            const loser = await User.findById(loserId);

            if (winner && loser) {
                const { newWinnerElo, newLoserElo, pointsExchanged } = calculateElo(winner.elo || 1000, loser.elo || 1000);
                winner.elo = newWinnerElo; winner.wins = (winner.wins || 0) + 1; await winner.save();
                loser.elo = newLoserElo; loser.losses = (loser.losses || 0) + 1; await loser.save();

                await Match.create({ winnerId: winner._id, loserId: loser._id, problemId: match.problemId, reason: 'completed', eloChange: pointsExchanged });
                console.log(`💾 Match Saved: ${winner.username} beat ${loser.username}. Elo Exchanged: ${pointsExchanged}`);
            }
        } catch (err) { console.error("Database save error:", err); }

        delete activeMatches[matchId]; 
    });

    // SURRENDER LOGIC
    socket.on('surrender', async (matchId) => {
        const match = activeMatches[matchId];
        if (!match) return;

        const winnerSocketId = match.player1.socketId === socket.id ? match.player2.socketId : match.player1.socketId;
        io.to(matchId).emit('match_over', { winner: winnerSocketId, reason: 'surrender' });

        try {
            const loserId = match.player1.socketId === socket.id ? match.player1.dbId : match.player2.dbId;
            const winnerId = match.player1.socketId === socket.id ? match.player2.dbId : match.player1.dbId;

            const winner = await User.findById(winnerId);
            const loser = await User.findById(loserId);

            if (winner && loser) {
                const { newWinnerElo, newLoserElo, pointsExchanged } = calculateElo(winner.elo || 1000, loser.elo || 1000);
                winner.elo = newWinnerElo; winner.wins = (winner.wins || 0) + 1; await winner.save();
                loser.elo = newLoserElo; loser.losses = (loser.losses || 0) + 1; await loser.save();

                await Match.create({ winnerId: winner._id, loserId: loser._id, problemId: match.problemId, reason: 'surrender', eloChange: pointsExchanged });
            }
        } catch (err) { console.error("Surrender Database save error:", err); }

        delete activeMatches[matchId];
    });

    // Real-Time Chat
    socket.on('send_message', (data) => {
        socket.to(data.matchId).emit('receive_message', { text: data.message, sender: 'Opponent', timestamp: Date.now() });
    });

    // Handle Rage-Quits & Disconnects
    socket.on('disconnect', () => {
        matchmakingQueue = matchmakingQueue.filter(p => p.socketId !== socket.id);
        
        const matchId = socketToMatch[socket.id];
        if (matchId && activeMatches[matchId]) {
            disconnectTimeouts[matchId] = setTimeout(async () => { 
                const match = activeMatches[matchId];
                if (match) {
                    io.to(matchId).emit('match_over', { winner: 'opponent_quit', reason: 'disconnect' });
                    
                    try {
                        const loserId = match.player1.socketId === socket.id ? match.player1.dbId : match.player2.dbId;
                        const winnerId = match.player1.socketId === socket.id ? match.player2.dbId : match.player1.dbId;

                        const winner = await User.findById(winnerId);
                        const loser = await User.findById(loserId);

                        if (winner && loser) {
                            const { newWinnerElo, newLoserElo, pointsExchanged } = calculateElo(winner.elo || 1000, loser.elo || 1000);
                            winner.elo = newWinnerElo; winner.wins = (winner.wins || 0) + 1; await winner.save();
                            loser.elo = newLoserElo; loser.losses = (loser.losses || 0) + 1; await loser.save();

                            await Match.create({ winnerId: winner._id, loserId: loser._id, problemId: match.problemId, reason: 'disconnect', eloChange: pointsExchanged });
                        }
                    } catch (err) { console.error("Disconnect DB error:", err); }

                    delete activeMatches[matchId];
                    delete disconnectTimeouts[matchId];
                }
            }, 10000);
        }
        delete socketToMatch[socket.id];
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));