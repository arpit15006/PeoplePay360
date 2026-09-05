import { io, Socket } from 'socket.io-client';

const URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const socket: Socket = io(URL, {
  autoConnect: true,
  withCredentials: true,
  transports: ['websocket', 'polling'],
});

socket.on('connect', () => {
  console.log('[WebSocket] Connected to PeoplePay360 Server with ID:', socket.id);
});

socket.on('disconnect', () => {
  console.log('[WebSocket] Disconnected from server');
});
