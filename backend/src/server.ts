import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { initSocket } from './socket';
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
app.use(express.json());
app.use(cookieParser());

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
  });
}

export { app, server };
