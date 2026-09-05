'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'

interface LoginFormProps {
  onSuccess?: () => void
}

const LoginForm = ({ onSuccess }: LoginFormProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter both email and password.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      await login(email, password)
      if (onSuccess) {
        onSuccess()
      } else {
        navigate('/employees')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid email or password'
      setError(msg)
    } finally {
      setLoading(false)
    }
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
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
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
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-10 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
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
              className="border-slate-300 data-checked:bg-blue-600 data-checked:border-blue-600"
            />
            <label
              htmlFor="rememberMe"
              className="text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer select-none"
            >
              Remember me
            </label>
          </div>
          <a
            href="#forgot-password"
            onClick={(e) => {
              e.preventDefault()
              alert('Password reset link will be sent to your registered corporate email.')
            }}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400"
          >
            Forgot password?
          </a>
        </div>

        {/* Submit button */}
        <div className="pt-2">
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <span>{loading ? 'Signing in…' : 'Sign in'}</span>
            {!loading && <ArrowRight className="size-4" />}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

export default LoginForm
