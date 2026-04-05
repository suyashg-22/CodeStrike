import { io } from 'socket.io-client';

// Establish a single connection to your Node.js backend
const socket = io('http://localhost:5000');

export default socket;