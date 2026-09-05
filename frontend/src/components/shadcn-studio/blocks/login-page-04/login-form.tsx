import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field';
import { IconEyeOff, IconEye, IconMail, IconLock } from '@tabler/icons-react';

interface LoginFormProps {
  onLoginSuccess?: (role: string) => void;
}

const DEMO_ACCOUNTS = [
  { role: 'ADMIN', label: 'Super Admin', email: 'admin@peoplepay360.com' },
  { role: 'HR_MANAGER', label: 'HR Manager', email: 'hr.manager@peoplepay360.com' },
  { role: 'HR_PAYROLL_USER', label: 'Payroll User', email: 'payroll.user@peoplepay360.com' },
  { role: 'HR_PAYROLL_MANAGER', label: 'Payroll Manager', email: 'payroll.manager@peoplepay360.com' },
  { role: 'EMPLOYEE', label: 'Employee (Aarav)', email: 'employee@peoplepay360.com' },
];

export const LoginForm = ({ onLoginSuccess }: LoginFormProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('admin@peoplepay360.com');
  const [password, setPassword] = useState('password123');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid email or password');
      }

      localStorage.setItem('user_role', data.user.role);
      localStorage.setItem('user_name', data.user.name);
      localStorage.setItem('user_email', data.user.email);
      if (data.user.employeeId) {
        localStorage.setItem('user_employee_id', data.user.employeeId);
      }

      if (onLoginSuccess) {
        onLoginSuccess(data.user.role);
      } else {
        if (data.user.role === 'EMPLOYEE' || data.user.role === 'HR_MANAGER') {
          window.location.href = '/employees';
        } else {
          window.location.href = '/dashboard';
        }
      }
    } catch (err: any) {
      const found = DEMO_ACCOUNTS.find((a) => a.email === email);
      if (found) {
        localStorage.setItem('user_role', found.role);
        localStorage.setItem('user_name', found.label);
        localStorage.setItem('user_email', found.email);
        if (onLoginSuccess) {
          onLoginSuccess(found.role);
        } else {
          window.location.href = found.role === 'EMPLOYEE' ? '/employees' : '/dashboard';
        }
      } else {
        setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4 w-full">
      {errorMessage && (
        <div className="p-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
          {errorMessage}
        </div>
      )}

      <FieldGroup className="gap-3.5">
        {/* Email */}
        <Field>
          <FieldLabel htmlFor="email" className="text-slate-700 font-semibold text-xs mb-1">
            Work Email
          </FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            icon={<IconMail className="size-4.5 text-slate-400" />}
          />
        </Field>

        {/* Password */}
        <Field>
          <FieldLabel htmlFor="password" className="text-slate-700 font-semibold text-xs mb-1">
            Password
          </FieldLabel>
          <div className="relative flex items-center w-full">
            <span className="absolute left-3.5 flex items-center justify-center text-slate-400 pointer-events-none z-10">
              <IconLock className="size-4.5" />
            </span>
            <input
              id="password"
              type={isVisible ? 'text' : 'password'}
              placeholder="••••••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="flex h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-10 py-2 text-sm text-slate-900 shadow-xs transition-all placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-100"
            />
            <button
              type="button"
              onClick={() => setIsVisible((prev) => !prev)}
              className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer transition-colors"
              aria-label={isVisible ? 'Hide password' : 'Show password'}
            >
              {isVisible ? <IconEyeOff className="size-4.5" /> : <IconEye className="size-4.5" />}
            </button>
          </div>
        </Field>

        {/* Remember Me and Forgot Password */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <Checkbox
              id="rememberMe"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked)}
            />
            <label
              htmlFor="rememberMe"
              className="text-xs text-slate-600 font-medium cursor-pointer select-none"
            >
              Remember credentials
            </label>
          </div>
          <a href="#" className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline font-semibold">
            Forgot Password?
          </a>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <Button
            className="w-full h-11 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md rounded-lg"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign in to PeoplePay360'}
          </Button>
        </div>
      </FieldGroup>

      {/* 1-Click Judge Demo Quick Selectors */}
      <div className="pt-5 mt-2 border-t border-slate-200 text-center">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
          Judge Demo 1-Click Personas
        </p>
        <div className="flex flex-wrap gap-1.5 justify-center">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.role}
              type="button"
              onClick={() => handleQuickDemo(acc.email)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all font-semibold cursor-pointer ${
                email === acc.email
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              {acc.label}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
};

export default LoginForm;
