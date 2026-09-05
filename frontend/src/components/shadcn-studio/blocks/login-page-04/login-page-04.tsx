import LoginForm from '@/components/shadcn-studio/blocks/login-page-04/login-form';
import { ShieldCheck, Users, FileText, Clock, DollarSign, PieChart } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess?: (role: string) => void;
}

export const Login = ({ onLoginSuccess }: LoginPageProps) => {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2 bg-slate-50">
      {/* Left Column: PeoplePay360 Brand & Connected Workflow Showcase */}
      <div className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 flex flex-col justify-between p-10 max-lg:hidden xl:p-16 text-white relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-32 -left-32 size-96 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-10 rounded-xl bg-white text-indigo-700 font-extrabold flex items-center justify-center text-xl shadow-lg">
              P
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-white">PEOPLEPAY<span className="text-indigo-300">360</span></span>
              <span className="block text-xs font-semibold text-indigo-200 tracking-wider uppercase">HR & Payroll Platform</span>
            </div>
          </div>
          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-snug mb-4">
            Unified HR & Autonomous Payroll Engine
          </h1>
          <p className="text-indigo-100 text-base max-w-lg leading-relaxed">
            Connect employee lifecycle, contract terms, attendance logs, and sequence-based salary rules into validated payslips and live executive analytics.
          </p>
        </div>

        {/* Visual Workflow Cards */}
        <div className="relative z-10 my-8 p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-2xl">
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-200 mb-4 flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-400" />
            Connected Operational Workflow
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <Users className="size-5 mx-auto mb-1 text-indigo-300" />
              <div className="text-xs font-bold">1. Employee</div>
              <div className="text-[10px] text-slate-300">Profiles & Depts</div>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <FileText className="size-5 mx-auto mb-1 text-amber-300" />
              <div className="text-xs font-bold">2. Contract</div>
              <div className="text-[10px] text-slate-300">Period Matched</div>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <Clock className="size-5 mx-auto mb-1 text-sky-300" />
              <div className="text-xs font-bold">3. Attendance</div>
              <div className="text-[10px] text-slate-300">Worked Days & Leaves</div>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <ShieldCheck className="size-5 mx-auto mb-1 text-emerald-300" />
              <div className="text-xs font-bold">4. Salary Rules</div>
              <div className="text-[10px] text-slate-300">Sequential Execution</div>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <DollarSign className="size-5 mx-auto mb-1 text-violet-300" />
              <div className="text-xs font-bold">5. Payrun</div>
              <div className="text-[10px] text-slate-300">2-Step Creation Wizard</div>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <PieChart className="size-5 mx-auto mb-1 text-rose-300" />
              <div className="text-xs font-bold">6. Payslips</div>
              <div className="text-[10px] text-slate-300">PDF & Live Dashboard</div>
            </div>
          </div>
        </div>

        {/* Footer badges */}
        <div className="relative z-10 flex items-center justify-between text-xs text-indigo-200">
          <span>Enterprise 5-Tier RBAC</span>
          <span>Neon PostgreSQL + WebSockets</span>
          <span>Zero-Poll Realtime Updates</span>
        </div>
      </div>

      {/* Right Column: Corporate Login Form */}
      <div className="flex h-full flex-col items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="flex w-full max-w-md flex-col gap-6 bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm">
          {/* Mobile Logo View */}
          <div className="lg:hidden flex items-center gap-2 mb-2">
            <div className="size-8 rounded-lg bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm">
              P
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">PEOPLEPAY360</span>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Sign in to your account</h2>
            <p className="text-sm text-slate-500">Access your organization portal and payroll dashboard</p>
          </div>

          {/* Form */}
          <LoginForm onLoginSuccess={onLoginSuccess} />

          <p className="text-xs text-center text-slate-400 mt-2">
            PeoplePay360 &copy; 2026. High-Security Enterprise Payroll Gateway.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
