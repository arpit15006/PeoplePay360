import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { initSocket } from './socket';

import authRouter from './routes/auth.routes';

const app = express();
const server = http.createServer(app);

// Initialize WebSockets
initSocket(server);

// Middleware
app.use(
  cors({
    origin: [env.FRONTEND_URL, 'http://localhost:5173'],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRouter);

// Base Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'PeoplePay360 API',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

const PORT = parseInt(env.PORT, 10) || 5000;

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`🚀 PeoplePay360 Backend API running on http://localhost:${PORT}`);
  });
}

export { app, server };
