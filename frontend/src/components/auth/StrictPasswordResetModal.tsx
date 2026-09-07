'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Eye, EyeOff, KeyRound, ShieldAlert, Check, X } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/context/AuthContext'
import { authApi } from '@/api/auth'

/**
 * StrictPasswordResetModal
 *
 * Appears when an authenticated user has mustChangePassword === true (e.g. after
 * an administrator or self-service password reset generates a temporary password).
 *
 * Strict Enforcement:
 * - Unclosable: cannot be closed via clicking outside, Escape, or close buttons.
 * - Blocks any navigation or usage until a new valid password is submitted.
 * - Provides a fallback Logout action if the user wishes to exit.
 */
export function StrictPasswordResetModal() {
  const { user, setUser, logout } = useAuth()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Only open when a user is signed in and marked as requiring a password change
  const isOpen = Boolean(user && user.mustChangePassword)

  if (!isOpen) return null

  const isMinLength = newPassword.length >= 8
  const isMatching = newPassword.length > 0 && newPassword === confirmPassword
  const canSubmit = isMinLength && isMatching && !isSubmitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!isMinLength) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (!isMatching) {
      setError('Passwords do not match.')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await authApi.changePassword({ newPassword })

      toast.success('Password updated successfully! Welcome to PeoplePay360.')

      // Update the user session locally so the modal closes immediately
      if (res.user) {
        setUser(res.user)
      } else {
        setUser(prev => (prev ? { ...prev, mustChangePassword: false } : null))
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not update password. Please try again.'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen}>
      <DialogContent
        showCloseButton={false}
        onPointerDownOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
        className="sm:max-w-md p-6 gap-5 shadow-2xl border-primary/20 bg-background"
      >
        <DialogHeader className="gap-2 text-left">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold tracking-tight">
                Reset Temporary Password
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Account security verification required
              </DialogDescription>
            </div>
          </div>
          <p className="text-sm text-foreground/80 pt-1">
            You signed in with a temporary password. For your account security, you must set a new permanent password before continuing.
          </p>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="py-2.5">
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reset-new-password" className="text-xs font-medium">
              New Password
            </Label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-muted-foreground pointer-events-none flex items-center">
                <KeyRound className="size-4" />
              </span>
              <Input
                id="reset-new-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter at least 8 characters"
                className="pl-9 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reset-confirm-password" className="text-xs font-medium">
              Confirm New Password
            </Label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-muted-foreground pointer-events-none flex items-center">
                <KeyRound className="size-4" />
              </span>
              <Input
                id="reset-confirm-password"
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className="pl-9 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(prev => !prev)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
              >
                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Validation Checklist */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 border border-border/50 text-xs">
            <div className="flex items-center gap-2">
              {isMinLength ? (
                <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <X className="size-3.5 text-muted-foreground shrink-0" />
              )}
              <span className={isMinLength ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                Minimum 8 characters
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isMatching ? (
                <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <X className="size-3.5 text-muted-foreground shrink-0" />
              )}
              <span className={isMatching ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                Passwords match
              </span>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-col gap-2 pt-2">
            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full h-10"
            >
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2" />
                  Updating Password…
                </>
              ) : (
                'Set New Password & Continue'
              )}
            </Button>

            <div className="text-center pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => logout()}
              >
                Sign out instead
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default StrictPasswordResetModal
