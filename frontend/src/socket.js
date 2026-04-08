import { io } from 'socket.io-client';

const URL = 'https://code-strike-backend.onrender.com';

const socket = io(URL, {
  transports: ['websocket', 'polling']
});

export default socket;