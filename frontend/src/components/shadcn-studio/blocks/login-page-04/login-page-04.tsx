import LoginForm from '@/components/shadcn-studio/blocks/login-page-04/login-form';
import { ShieldCheck, Users, FileText, Clock, DollarSign, PieChart } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess?: (role: string) => void;
}

export const Login = ({ onLoginSuccess }: LoginPageProps) => {
  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-12 bg-slate-50 font-sans">
      {/* Left Column: PeoplePay360 Brand & Connected Workflow Showcase (5 of 12 cols on desktop) */}
      <div
        className="hidden lg:flex lg:col-span-6 xl:col-span-5 flex-col justify-between p-12 xl:p-16 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #3730a3 0%, #312e81 50%, #1e1b4b 100%)',
          color: '#ffffff',
        }}
      >
        {/* Subtle background glow */}
        <div
          className="absolute -top-32 -left-32 size-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-32 -right-32 size-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, transparent 70%)' }}
        />

        {/* Brand Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="size-11 rounded-xl bg-white text-indigo-700 font-black flex items-center justify-center text-2xl shadow-md">
              P
            </div>
            <div>
              <div className="text-2xl font-black tracking-tight" style={{ color: '#ffffff' }}>
                PEOPLEPAY<span style={{ color: '#a5b4fc' }}>360</span>
              </div>
              <div className="text-xs font-bold tracking-widest uppercase" style={{ color: '#c7d2fe' }}>
                HR & Payroll Platform
              </div>
            </div>
          </div>

          <h1
            className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight mb-4"
            style={{ color: '#ffffff' }}
          >
            Unified HR & Autonomous Payroll Engine
          </h1>
          <p className="text-base leading-relaxed" style={{ color: '#e0e7ff' }}>
            Connect employee lifecycle, contracts, working schedules, attendance, and sequence-based salary rules into validated payslips and live executive analytics.
          </p>
        </div>

        {/* Connected Operational Workflow Grid */}
        <div
          className="relative z-10 my-8 p-6 rounded-2xl shadow-xl"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div
            className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2"
            style={{ color: '#c7d2fe' }}
          >
            <ShieldCheck className="size-4 text-emerald-400" />
            Connected Operational Workflow
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div
              className="p-3 rounded-xl transition-all"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              <Users className="size-5 mx-auto mb-1 text-indigo-300" />
              <div className="text-xs font-bold" style={{ color: '#ffffff' }}>1. Employee</div>
              <div className="text-[10px]" style={{ color: '#cbd5e1' }}>Profiles & Depts</div>
            </div>

            <div
              className="p-3 rounded-xl transition-all"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              <FileText className="size-5 mx-auto mb-1 text-amber-300" />
              <div className="text-xs font-bold" style={{ color: '#ffffff' }}>2. Contract</div>
              <div className="text-[10px]" style={{ color: '#cbd5e1' }}>Period Matched</div>
            </div>

            <div
              className="p-3 rounded-xl transition-all"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              <Clock className="size-5 mx-auto mb-1 text-sky-300" />
              <div className="text-xs font-bold" style={{ color: '#ffffff' }}>3. Attendance</div>
              <div className="text-[10px]" style={{ color: '#cbd5e1' }}>Worked Days & Leaves</div>
            </div>

            <div
              className="p-3 rounded-xl transition-all"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              <ShieldCheck className="size-5 mx-auto mb-1 text-emerald-300" />
              <div className="text-xs font-bold" style={{ color: '#ffffff' }}>4. Salary Rules</div>
              <div className="text-[10px]" style={{ color: '#cbd5e1' }}>Sequential Execution</div>
            </div>

            <div
              className="p-3 rounded-xl transition-all"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              <DollarSign className="size-5 mx-auto mb-1 text-violet-300" />
              <div className="text-xs font-bold" style={{ color: '#ffffff' }}>5. Payrun</div>
              <div className="text-[10px]" style={{ color: '#cbd5e1' }}>2-Step Creation Wizard</div>
            </div>

            <div
              className="p-3 rounded-xl transition-all"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              <PieChart className="size-5 mx-auto mb-1 text-rose-300" />
              <div className="text-xs font-bold" style={{ color: '#ffffff' }}>6. Payslips</div>
              <div className="text-[10px]" style={{ color: '#cbd5e1' }}>PDF & Live Dashboard</div>
            </div>
          </div>
        </div>

        {/* Footer badges */}
        <div className="relative z-10 flex items-center justify-between text-xs" style={{ color: '#c7d2fe' }}>
          <span>Enterprise 5-Tier RBAC</span>
          <span>Neon PostgreSQL + WebSockets</span>
          <span>Zero-Poll Realtime Updates</span>
        </div>
      </div>

      {/* Right Column: Corporate Login Form (7 of 12 cols on desktop) */}
      <div className="col-span-12 lg:col-span-6 xl:col-span-7 flex flex-col items-center justify-center p-6 sm:p-12 lg:p-16 min-h-screen">
        <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-xl space-y-6">
          {/* Mobile Logo View */}
          <div className="lg:hidden flex items-center gap-2 mb-2">
            <div className="size-9 rounded-lg bg-indigo-600 text-white font-black flex items-center justify-center text-lg shadow-sm">
              P
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">PEOPLEPAY360</span>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Sign in to your account
            </h2>
            <p className="text-sm text-slate-500">
              Access your organization portal and payroll dashboard
            </p>
          </div>

          {/* Form */}
          <LoginForm onLoginSuccess={onLoginSuccess} />

          <p className="text-xs text-center text-slate-400 pt-2 border-t border-slate-100">
            PeoplePay360 &copy; 2026. High-Security Enterprise Payroll Gateway.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
