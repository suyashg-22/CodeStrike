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

// ==========================================
// SOCKET.IO MATCHMAKING & LIFECYCLE
// ==========================================
let waitingPlayer = null; 
const activeMatches = {}; 
const socketToMatch = {}; 
const disconnectTimeouts = {}; // Tracks the 10-second grace periods

io.on('connection', (socket) => {
    console.log(`👤 User Connected: ${socket.id}`);

    // 1. Matchmaking
    socket.on('find_match', async () => {
        if (waitingPlayer && waitingPlayer.id !== socket.id) {
            const matchId = `match_${Date.now()}`;
            const player1 = waitingPlayer;
            const player2 = socket;

            try {
                const problems = await Problem.find();
                const randomProblem = problems[Math.floor(Math.random() * problems.length)];
                
                const startTime = Date.now();
                activeMatches[matchId] = { player1: player1.id, player2: player2.id, startTime };
                socketToMatch[player1.id] = matchId;
                socketToMatch[player2.id] = matchId;

                player1.join(matchId);
                player2.join(matchId);

                io.to(matchId).emit('match_found', { matchId, problemId: randomProblem._id, startTime });
                waitingPlayer = null;
            } catch (err) { console.error(err); }
        } else {
            waitingPlayer = socket;
        }
    });

    // 2. Handle Reconnections (Grace Period Fix Part 1)
    socket.on('rejoin_match', (matchId) => {
        if (activeMatches[matchId]) {
            socket.join(matchId);
            socketToMatch[socket.id] = matchId;
            
            // Cancel the instant-win timer if they reconnected in time
            if (disconnectTimeouts[matchId]) {
                clearTimeout(disconnectTimeouts[matchId]);
                delete disconnectTimeouts[matchId];
                console.log(`⏱️ Saved ${matchId} from disconnect timeout. User reconnected.`);
            }
            
            console.log(`🔄 ${socket.id} rejoined ${matchId}`);
        }
    });

    // 3. Live Progress
    socket.on('update_progress', (data) => {
        socket.to(data.matchId).emit('opponent_progress', data);
    });

    // 4. INSTANT WIN LOGIC
    socket.on('player_won', (matchId) => {
        io.to(matchId).emit('match_over', { winner: socket.id, reason: 'completed' });
        delete activeMatches[matchId]; 
    });
    // 6. Real-Time Chat (Add this right here!)
    socket.on('send_message', (data) => {
        // Broadcast the message to everyone in the room EXCEPT the sender
        socket.to(data.matchId).emit('receive_message', {
            text: data.message,
            sender: 'Opponent',
            timestamp: Date.now()
        });
    });
    // 5. Handle Rage-Quits & Disconnects (Grace Period Fix Part 2)
    socket.on('disconnect', () => {
        if (waitingPlayer && waitingPlayer.id === socket.id) waitingPlayer = null;
        
        const matchId = socketToMatch[socket.id];
        if (matchId && activeMatches[matchId]) {
            console.log(`⚠️ User disconnected from ${matchId}. Starting 10s grace period...`);
            
            // Give them 10 seconds to refresh the page before ending the match
            disconnectTimeouts[matchId] = setTimeout(() => {
                if (activeMatches[matchId]) {
                    io.to(matchId).emit('match_over', { winner: 'opponent_quit', reason: 'disconnect' });
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