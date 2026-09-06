import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { initSocket } from './socket';
import { startAttendanceJobs } from './attendance/jobs';
import { errorHandler } from './middleware/errorHandler';

// Route imports
import authRoutes from './routes/auth.routes';
import employeesRoutes from './routes/employees.routes';
import usersRoutes from './routes/users.routes';
import departmentsRoutes from './routes/departments.routes';
import contractsRoutes from './routes/contracts.routes';
import schedulesRoutes from './routes/schedules.routes';
import attendanceRoutes from './routes/attendance.routes';
import timeoffRoutes from './routes/timeoff.routes';
import salaryStructuresRoutes from './routes/salaryStructures.routes';
import salaryRulesRoutes from './routes/salaryRules.routes';
import payrunsRoutes from './routes/payruns.routes';
import payslipsRoutes from './routes/payslips.routes';
import dashboardRoutes from './routes/dashboard.routes';

const app = express();
const server = http.createServer(app);

// Initialize WebSockets
initSocket(server);

// Middleware
//
// helmet first so its headers are on every response, including errors.
app.use(helmet({
  // The API serves JSON to a separate origin; the restrictive default policy
  // here only governs this server's own responses.
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// A month of attendance for a large workforce is megabytes of JSON, and it
// gzips to a fraction of that. Applied before the routes so every response
// benefits.
app.use(compression());

app.use(
  cors({
    origin: [
      env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
    ],
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

/**
 * A ceiling, not a throttle.
 *
 * Every signed-in employee sends a presence heartbeat once a minute and reads
 * a few screens, which is nowhere near these numbers. They exist so a runaway
 * client or a scripted caller cannot take the service down for everyone.
 */
app.use(
  '/api/auth/login',
  rateLimit({
    windowMs: 15 * 60_000,
    limit: process.env.NODE_ENV === 'production' ? 20 : 500,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, error: 'Too many sign-in attempts. Try again shortly.' },
  })
);

app.use(
  '/api',
  rateLimit({
    windowMs: 60_000,
    // Five requests a second, sustained, per account. A person clicking
    // through screens does a fraction of that; the ceiling is there for a
    // runaway client. Development is left loose because the test harness
    // drives the UI far faster than anyone can click.
    limit: process.env.NODE_ENV === 'production' ? 300 : 5_000,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Keyed per signed-in account, not per address. A whole office shares one
    // public IP, so limiting by address would give a thousand colleagues a
    // single budget between them and lock out the building. The token is read
    // from the cookie because this runs before the routers that authenticate.
    keyGenerator: (req) => {
      const cookie = req.headers.cookie ?? '';
      const token = cookie
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith('token='));
      return token ? `u:${token.slice(-32)}` : `ip:${ipKeyGenerator(req.ip ?? '')}`;
    },
    // The health check is what a load balancer polls; it should never be capped.
    skip: (req) => req.path === '/health',
    message: { success: false, error: 'Too many requests. Slow down and try again.' },
  })
);

// Base Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'PeoplePay360 API',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// ─── API Routes ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/contracts', contractsRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/timeoff', timeoffRoutes);
app.use('/api/salary-structures', salaryStructuresRoutes);
app.use('/api/salary-rules', salaryRulesRoutes);
app.use('/api/payruns', payrunsRoutes);
app.use('/api/payslips', payslipsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ─── Global Error Handler (must be last) ─────────────────────
app.use(errorHandler);

const PORT = parseInt(env.PORT, 10) || 5000;

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`🚀 PeoplePay360 Backend API running on http://localhost:${PORT}`);
    // Closing stale sessions and marking missed days only makes sense once
    // this process is the one serving requests.
    startAttendanceJobs();
  });
}

export { app, server };
