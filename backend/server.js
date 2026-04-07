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
    origin: "http://localhost:5173", 
    methods: ["GET", "POST"]
  }
});
const User = require('./models/User'); // From Day 1
const Match = require('./models/Match');
const calculateElo = require('./utils/elo');

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

// NEW: Fetch ALL problems for the Time Chamber Menu
app.get('/api/problems', async (req, res) => {
    try {
        // We use .select() to only grab the metadata, not the heavy descriptions and test cases
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
        
        // Only add it if they haven't solved it before!
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
// SOCKET.IO MATCHMAKING & LIFECYCLE
// ==========================================
let matchmakingQueue = []; // UPGRADE: Now an array!
const activeMatches = {}; 
const socketToMatch = {}; 
const disconnectTimeouts = {}; 

io.on('connection', (socket) => {
    console.log(`👤 User Connected: ${socket.id}`);

    // 1. SMART MATCHMAKING ALGORITHM
    socket.on('find_match', async (data) => {
        const player = { socketId: socket.id, dbId: data.userId, elo: data.elo || 1000, socket: socket };

        // Prevent duplicate entries if they click multiple times
        if (!matchmakingQueue.find(p => p.socketId === socket.id)) {
            matchmakingQueue.push(player);
        }

        // Scan the queue for an opponent within +/- 200 Elo
        let opponentIndex = -1;
        for (let i = 0; i < matchmakingQueue.length; i++) {
            const p = matchmakingQueue[i];
            if (p.socketId !== player.socketId && Math.abs(p.elo - player.elo) <= 200) {
                opponentIndex = i;
                break;
            }
        }

        if (opponentIndex !== -1) {
            const opponent = matchmakingQueue[opponentIndex];

            // Remove BOTH from queue
            matchmakingQueue = matchmakingQueue.filter(p => p.socketId !== player.socketId && p.socketId !== opponent.socketId);

            const matchId = `match_${Date.now()}`;

            try {
                // DYNAMIC DIFFICULTY ALGORITHM
                const avgElo = (player.elo + opponent.elo) / 2;
                let targetDifficulty = 'Easy';
                if (avgElo >= 1400) targetDifficulty = 'Medium';
                if (avgElo >= 1800) targetDifficulty = 'Hard';

                let problems = await Problem.find({ difficulty: targetDifficulty });
                // Fallback if no problems of that difficulty exist yet
                if (problems.length === 0) problems = await Problem.find(); 

                const randomProblem = problems[Math.floor(Math.random() * problems.length)];
                
                const startTime = Date.now();
                activeMatches[matchId] = { player1: opponent, player2: player, startTime, problemId: randomProblem._id };
                socketToMatch[opponent.socketId] = matchId;
                socketToMatch[player.socketId] = matchId;

                opponent.socket.join(matchId);
                player.socket.join(matchId);

                io.to(matchId).emit('match_found', { matchId, problemId: randomProblem._id, startTime });
                console.log(`⚔️ Smart Match! ${player.elo} vs ${opponent.elo} (Diff: ${targetDifficulty})`);
            } catch (err) { console.error(err); }
        } else {
            console.log(`📡 ${player.socketId} (${player.elo} Elo) is scanning for a worthy opponent...`);
        }
    });

    // Handle Abort Search
    socket.on('cancel_search', () => {
        matchmakingQueue = matchmakingQueue.filter(p => p.socketId !== socket.id);
        console.log(`🛑 User ${socket.id} aborted search.`);
    });

    // 2. Handle Reconnections
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

    // 3. Live Progress
    socket.on('update_progress', (data) => {
        socket.to(data.matchId).emit('opponent_progress', data);
    });

    // 4. INSTANT WIN & DATABASE SAVE
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
    // 4.5 SURRENDER LOGIC
    socket.on('surrender', async (matchId) => {
        const match = activeMatches[matchId];
        if (!match) return;

        // Calculate exactly who won and lost based on socket IDs
        const loserSocketId = socket.id;
        const winnerSocketId = match.player1.socketId === socket.id ? match.player2.socketId : match.player1.socketId;

        // FIXED: Send the actual winner's socket.id to the frontend
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

                await Match.create({
                    winnerId: winner._id,
                    loserId: loser._id,
                    problemId: match.problemId,
                    reason: 'surrender',
                    eloChange: pointsExchanged
                });
                console.log(`💾 Surrender Saved: ${loser.username} surrendered to ${winner.username}. Elo Exchanged: ${pointsExchanged}`);
            }
        } catch (err) {
            console.error("Surrender Database save error:", err);
        }

        delete activeMatches[matchId];
    });
    // 5. Real-Time Chat
    socket.on('send_message', (data) => {
        socket.to(data.matchId).emit('receive_message', { text: data.message, sender: 'Opponent', timestamp: Date.now() });
    });

    // 6. Handle Rage-Quits & Disconnects
    socket.on('disconnect', () => {
        // Remove from waiting queue if they disconnect while searching
        matchmakingQueue = matchmakingQueue.filter(p => p.socketId !== socket.id);
        
        const matchId = socketToMatch[socket.id];
        if (matchId && activeMatches[matchId]) {
            console.log(`⚠️ User disconnected from ${matchId}. Starting 10s grace period...`);
            
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
                            console.log(`💾 Forfeit Saved: ${winner.username} wins by abandonment over ${loser.username}. Elo: ${pointsExchanged}`);
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