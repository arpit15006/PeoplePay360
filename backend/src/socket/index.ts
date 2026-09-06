import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

import { env } from '../config/env';
import { loadUser } from '../middleware/auth';

/**
 * The realtime channel, addressed rather than broadcast.
 *
 * Every connection is identified from the same auth cookie the API uses and
 * put into rooms for its role and its employee record. Events are then sent to
 * the rooms that care.
 *
 * The alternative — io.emit to everyone — meant one person checking in woke
 * every open browser, each of which refetched its attendance list. That cost
 * grows with the square of the workforce: a thousand people clocking in on a
 * Monday morning would have produced a million refetches.
 */

let io: Server | null = null;

/** Everyone signed in, for the rare event that genuinely concerns all of them. */
export const ROOM_ALL = 'all';
export const roomForUser = (userId: string) => `user:${userId}`;
export const roomForEmployee = (employeeId: string) => `employee:${employeeId}`;
export const roomForRole = (role: Role | string) => `role:${role}`;

interface SocketAuth {
  userId: string;
  role: Role;
  employeeId?: string | null;
}

/**
 * Identifies a connection from the auth cookie, the same way the API does.
 *
 * The token carries only the user id — role and employee come from the record
 * behind it — so this loads the user through the same cached helper the HTTP
 * middleware uses. Once per connection, not once per event.
 */
async function identify(socket: Socket): Promise<SocketAuth | null> {
  const raw = socket.handshake.headers.cookie;
  if (!raw) return null;

  const token = raw
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('token='))
    ?.slice('token='.length);
  if (!token) return null;

  try {
    const { userId } = jwt.verify(decodeURIComponent(token), env.JWT_SECRET) as { userId: string };
    const user = await loadUser(userId);
    if (!user) return null;
    return { userId: user.id, role: user.role, employeeId: user.employeeId };
  } catch {
    return null;
  }
}

export const initSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: [
        env.FRONTEND_URL,
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  });

  io.on('connection', async (socket: Socket) => {
    const auth = await identify(socket);

    // An unauthenticated socket joins nothing, so it receives nothing. It is
    // not disconnected: the client reconnects on its own once signed in.
    if (!auth) {
      console.log(`[WebSocket] Unauthenticated client ${socket.id} — no rooms joined`);
      socket.on('disconnect', () => undefined);
      return;
    }

    socket.join(ROOM_ALL);
    socket.join(roomForUser(auth.userId));
    socket.join(roomForRole(auth.role));
    if (auth.employeeId) socket.join(roomForEmployee(auth.employeeId));

    console.log(`[WebSocket] ${auth.role} connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized yet!');
  }
  return io;
};
