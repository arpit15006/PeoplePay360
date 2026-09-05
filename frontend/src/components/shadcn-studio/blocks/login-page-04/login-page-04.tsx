import { useState } from 'react'
import { ShieldCheck, ChevronDown } from 'lucide-react'
import LoginForm from '@/components/shadcn-studio/blocks/login-page-04/login-form'

const Login = () => {
  const [language, setLanguage] = useState('English')

  return (
    <div className="relative min-h-screen w-full bg-[#f8fafc] text-slate-900 flex flex-col justify-between overflow-x-hidden">
      {/* Top right language selector */}
      <div className="absolute top-6 right-8 z-20 flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer select-none">
        <span>{language}</span>
        <ChevronDown className="size-4 text-slate-500" />
      </div>

      {/* Main Layout: Left image side and Right form side with proportional spacing */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] xl:grid-cols-[1.2fr_0.8fr] items-center min-h-[calc(100vh-60px)] px-4 sm:px-8 lg:px-12 py-4">
        {/* Left Side: Provided Login Image */}
        <div className="relative hidden lg:flex items-center justify-center p-4 xl:p-8 overflow-hidden">
          <img
            src="/login-image.png"
            alt="PeoplePay360 - People First. Simpler HR. Real Impact."
            className="w-full h-auto max-h-[88vh] object-contain rounded-2xl"
          />
        </div>

        {/* Right Side: Centered Login Card */}
        <div className="flex flex-col items-center justify-center p-2 sm:p-4 lg:p-6 z-10">
          <div className="w-full max-w-[480px] bg-white rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.05)] border border-slate-100 p-8 sm:p-10 flex flex-col gap-6">
            {/* Header */}
            <div className="text-center space-y-1.5">
              <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900">
                Welcome back
              </h1>
              <p className="text-sm text-slate-500 font-normal">
                Sign in to your PeoplePay360 account
              </p>
            </div>

            {/* Form */}
            <LoginForm />

            {/* Separator */}
            <div className="h-px bg-slate-100 w-full mt-1" />

            {/* Security Notice */}
            <div className="flex items-center justify-center gap-2 text-center text-xs text-slate-500 font-normal">
              <ShieldCheck className="size-4 text-slate-400 shrink-0" />
              <span>Your data is secure and stays within your organization.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Links */}
      <footer className="w-full py-5 px-8 flex items-center justify-end gap-6 text-xs text-slate-500 font-medium z-10">
        <a href="#privacy" className="hover:text-slate-800 transition-colors">
          Privacy Policy
        </a>
        <span className="text-slate-300">|</span>
        <a href="#terms" className="hover:text-slate-800 transition-colors">
          Terms of Service
        </a>
        <span className="text-slate-300">|</span>
        <a href="#help" className="hover:text-slate-800 transition-colors">
          Help
        </a>
      </footer>
    </div>
  )
}

export default Login
