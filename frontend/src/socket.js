import { io } from 'socket.io-client';

// Establish a single connection to your Node.js backend
const socket = io('http://localhost:https://code-strike-backend.onrender.com');

export default socket;