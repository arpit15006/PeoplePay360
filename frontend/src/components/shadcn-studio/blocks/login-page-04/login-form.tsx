'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Mail, Lock, Eye, EyeOff, ArrowRight, KeyRound } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { roleLandingPath, type Role } from '@/types/user'
import { authApi } from '@/api/auth'

interface LoginFormProps {
  onSuccess?: () => void
}

/**
 * Seeded demo accounts (backend/prisma/seed.ts). One click signs in and lands
 * on that role's screen per PRD Screen 1. Credentials are always verified by
 * the server — these buttons only supply them.
 */
const DEMO_ACCOUNTS: {
  role: Role
  label: string
  email: string
  lands: string
  dotColor: string
}[] = [
  { role: 'ADMIN', label: 'Admin', email: 'admin@peoplepay360.com', lands: 'Dashboard', dotColor: 'bg-blue-500' },
  { role: 'HR_MANAGER', label: 'HR Manager', email: 'hr.manager@peoplepay360.com', lands: 'Employees', dotColor: 'bg-emerald-500' },
  { role: 'HR_PAYROLL_USER', label: 'Payroll User', email: 'payroll.user@peoplepay360.com', lands: 'Payruns', dotColor: 'bg-amber-500' },
  { role: 'HR_PAYROLL_MANAGER', label: 'Payroll Manager', email: 'payroll.manager@peoplepay360.com', lands: 'Dashboard', dotColor: 'bg-indigo-500' },
  { role: 'EMPLOYEE', label: 'Employee', email: 'employee@peoplepay360.com', lands: 'My profile', dotColor: 'bg-violet-500' },
]

const DEMO_PASSWORD = 'password123'

const LoginForm = ({ onSuccess }: LoginFormProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Forgot Password modal state
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState<string | null>(null)

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email address.')
      return
    }

    try {
      setForgotLoading(true)
      setForgotError(null)
      const res = await authApi.forgotPassword({ email: forgotEmail.trim() })
      toast.success(res.message || 'Temporary password sent to your email!')
      setForgotOpen(false)
      setForgotEmail('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not request password reset.'
      setForgotError(msg)
    } finally {
      setForgotLoading(false)
    }
  }

  const { login } = useAuth()
  const navigate = useNavigate()

  /** Authenticate, then route to the landing screen for the returned role. */
  const signIn = async (emailValue: string, passwordValue: string) => {
    try {
      setLoading(true)
      setError(null)
      const user = await login(emailValue, passwordValue)
      if (onSuccess) {
        onSuccess()
      } else {
        navigate(roleLandingPath(user), { replace: true })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid email or password'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter both email and password.')
      return
    }
    await signIn(email, password)
  }

  /** One-click demo persona: fill the fields, then sign in as that role. */
  const handleDemoLogin = async (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword(DEMO_PASSWORD)
    await signIn(demoEmail, DEMO_PASSWORD)
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <FieldGroup className="gap-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-xs font-medium text-red-600 border border-red-200 dark:bg-red-950/40 dark:border-red-900/50 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Email */}
        <Field className="gap-1.5">
          <FieldLabel htmlFor="email" className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Email address
          </FieldLabel>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-slate-400 pointer-events-none flex items-center">
              <Mail className="size-4" />
            </span>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
        </Field>

        {/* Password */}
        <Field className="gap-1.5">
          <FieldLabel htmlFor="password" className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Password
          </FieldLabel>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-slate-400 pointer-events-none flex items-center">
              <Lock className="size-4" />
            </span>
            <input
              id="password"
              type={isVisible ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-10 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
            <button
              type="button"
              onClick={() => setIsVisible((prev) => !prev)}
              aria-label={isVisible ? 'Hide password' : 'Show password'}
              className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
            >
              {isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>

        {/* Remember Me and Forgot Password */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <Checkbox
              id="rememberMe"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(!!checked)}
              className="border-slate-300 data-checked:bg-primary data-checked:border-primary"
            />
            <label
              htmlFor="rememberMe"
              className="text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer select-none"
            >
              Remember me
            </label>
          </div>
          <button
            type="button"
            onClick={() => {
              setForgotError(null)
              setForgotEmail(email || '')
              setForgotOpen(true)
            }}
            className="text-xs font-medium text-primary hover:underline cursor-pointer"
          >
            Forgot password?
          </button>
        </div>

        {/* Submit button */}
        <div className="pt-2">
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <span>{loading ? 'Signing in…' : 'Sign in'}</span>
            {!loading && <ArrowRight className="size-4" />}
          </Button>
        </div>

        {/* Demo credentials — compact persona access */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Demo accounts
            </span>
            <span className="text-[10px] text-slate-400">
              pwd: <span className="font-mono font-medium text-slate-600">{DEMO_PASSWORD}</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.role}
                type="button"
                disabled={loading}
                onClick={() => handleDemoLogin(account.email)}
                title={`${account.label} (${account.email})\nLands on: ${account.lands}\nPassword: ${DEMO_PASSWORD}`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer disabled:opacity-50 ${
                  email === account.email
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 hover:border-slate-300 hover:text-slate-900 active:scale-95'
                }`}
              >
                <span
                  className={`size-1.5 rounded-full shrink-0 ${
                    email === account.email ? 'bg-white' : account.dotColor
                  }`}
                />
                <span>{account.label}</span>
              </button>
            ))}
          </div>
        </div>
      </FieldGroup>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md p-6 gap-4">
          <DialogHeader className="gap-1.5 text-left">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <KeyRound className="size-5" />
              </div>
              <DialogTitle className="text-base font-semibold">
                Reset Your Password
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter your registered corporate email address. A temporary password will be generated and emailed to your inbox.
            </DialogDescription>
          </DialogHeader>

          {forgotError && (
            <Alert variant="destructive" className="py-2.5">
              <AlertDescription className="text-xs">{forgotError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="forgot-email" className="text-xs font-medium">
                Registered Work Email
              </Label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-muted-foreground pointer-events-none flex items-center">
                  <Mail className="size-4" />
                </span>
                <Input
                  id="forgot-email"
                  type="email"
                  required
                  autoFocus
                  placeholder="name@company.com"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setForgotOpen(false)}
                disabled={forgotLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={forgotLoading || !forgotEmail.trim()}
              >
                {forgotLoading ? (
                  <>
                    <Spinner className="mr-2" />
                    Sending…
                  </>
                ) : (
                  'Send Temporary Password'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </form>
  )
}

export default LoginForm

