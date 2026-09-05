import { io, Socket } from 'socket.io-client';

// Matches the vite proxy target. The 5000 fallback pointed at a port macOS
// AirPlay occupies, so a missing env var connected to the wrong service.
const URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

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

export default socket;
