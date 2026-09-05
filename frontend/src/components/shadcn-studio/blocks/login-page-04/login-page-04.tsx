import { useState } from 'react'
import { ShieldCheck, ChevronDown } from 'lucide-react'
import LoginForm from '@/components/shadcn-studio/blocks/login-page-04/login-form'

const Login = () => {
  const [language] = useState('English')

  return (
    <div className="relative h-dvh w-full bg-[#f8fafc] text-slate-900 flex flex-col overflow-hidden">
      {/* Top right language selector */}
      <div className="absolute top-5 right-8 z-20 flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer select-none">
        <span>{language}</span>
        <ChevronDown className="size-4 text-slate-500" />
      </div>

      {/* Main two-column layout — no gap, edge-to-edge */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-0">

        {/* ═══════════════════════════════════════════════
            LEFT SIDE — Fully coded replica of the branding panel
            ═══════════════════════════════════════════════ */}
        <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-[#f0f4f9] via-[#eaeff6] to-[#e4eaf3] flex-col justify-between px-10 xl:px-14 py-8">

          {/* ── Decorative background wave shapes ── */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 600 900" preserveAspectRatio="none" fill="none">
            {/* Large upper-right curve */}
            <path d="M380 0 C380 0, 600 120, 600 320 C600 520, 450 480, 500 700 C530 820, 600 860, 600 900 L600 0 Z" fill="rgba(255,255,255,0.45)" />
            {/* Smaller inner curve */}
            <path d="M460 0 C460 0, 600 180, 600 360 C600 500, 520 520, 550 720 C570 820, 600 870, 600 900 L600 0 Z" fill="rgba(255,255,255,0.3)" />
            {/* Bottom-left subtle wash */}
            <path d="M0 750 C100 700, 200 780, 300 760 C400 740, 500 800, 600 780 L600 900 L0 900 Z" fill="rgba(255,255,255,0.25)" />
          </svg>

          {/* ── Dotted arc decoration ── */}
          <svg className="absolute pointer-events-none" style={{ top: '48%', left: '38%', width: '55%', height: '40%' }} viewBox="0 0 300 200" fill="none">
            <path
              d="M10 180 C60 40, 200 10, 290 60"
              stroke="#b0bec5"
              strokeWidth="1.5"
              strokeDasharray="4 6"
              fill="none"
              opacity="0.5"
            />
          </svg>

          {/* ── Logo ── */}
          <div className="relative z-10 flex items-center gap-3">
            {/* People icon SVG */}
            <svg width="44" height="40" viewBox="0 0 44 40" fill="none">
              <circle cx="22" cy="10" r="5.5" fill="#144f84" />
              <circle cx="12" cy="16" r="4.5" fill="#3a75af" />
              <circle cx="32" cy="16" r="4.5" fill="#3a75af" />
              <path d="M6 36 C6 28, 12 23, 22 23 C32 23, 38 28, 38 36" stroke="#144f84" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              <path d="M0 38 C0 32, 5 28, 12 28" stroke="#3a75af" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <path d="M44 38 C44 32, 39 28, 32 28" stroke="#3a75af" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            </svg>
            <div>
              <div className="flex items-baseline">
                <span className="text-[22px] font-bold text-[#1e293b] tracking-tight">PeoplePay</span>
                <span className="text-[22px] font-bold text-[#144f84] tracking-tight">360</span>
              </div>
              <p className="text-[11px] text-slate-500 -mt-0.5 tracking-wide">Built for People. Powered by Odoo.</p>
            </div>
          </div>

          {/* ── Main headline content ── */}
          <div className="relative z-10 flex-1 flex flex-col justify-center -mt-4">
            {/* Category tags */}
            <p className="text-[11px] font-semibold tracking-[0.2em] text-slate-500 uppercase mb-5">
              HR &nbsp;•&nbsp; Payroll &nbsp;•&nbsp; People Operations
            </p>

            {/* Hero headline */}
            <h1 className="leading-[1.08]">
              <span className="block text-[clamp(2.4rem,4.5vw,3.6rem)] font-extrabold text-[#1a2236]">People First.</span>
              <span className="block text-[clamp(2.4rem,4.5vw,3.6rem)] font-extrabold text-[#1a2236]">Simpler HR.</span>
              <span className="block text-[clamp(2.4rem,4.5vw,3.6rem)] font-extrabold text-[#144f84]">Real Impact.</span>
            </h1>

            {/* Description */}
            <p className="mt-6 text-[15px] leading-relaxed text-slate-600 max-w-[380px]">
              A complete HR and Payroll solution to manage your workforce, automate processes and drive growth — all in one place.
            </p>

            {/* Tagline bar */}
            <div className="mt-8 flex items-center gap-3">
              <div className="w-8 h-[3px] rounded-full bg-[#144f84]" />
              <span className="text-[10.5px] font-semibold tracking-[0.22em] text-slate-500 uppercase">
                Organize &nbsp;•&nbsp; Automate &nbsp;•&nbsp; Empower
              </span>
            </div>
          </div>

          {/* ── Bottom area: plant + handwritten text + trust line ── */}
          <div className="relative z-10">
            {/* Plant illustration */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/4" style={{ width: '140px', height: '180px' }}>
              <svg viewBox="0 0 140 180" fill="none" width="140" height="180">
                {/* Pot */}
                <rect x="45" y="135" width="50" height="45" rx="6" fill="#e8ecf0" />
                <rect x="40" y="128" width="60" height="14" rx="4" fill="#f0f3f6" />
                {/* Stems */}
                <path d="M70 130 C70 110, 65 95, 58 75" stroke="#5a7a52" strokeWidth="2.5" fill="none" />
                <path d="M70 130 C70 105, 78 90, 85 65" stroke="#4a6b42" strokeWidth="2" fill="none" />
                <path d="M70 130 C72 115, 60 100, 50 90" stroke="#5a7a52" strokeWidth="1.8" fill="none" />
                {/* Leaves */}
                <ellipse cx="52" cy="70" rx="18" ry="9" transform="rotate(-35 52 70)" fill="#5c8a50" />
                <ellipse cx="56" cy="72" rx="15" ry="7" transform="rotate(-35 56 72)" fill="#6b9e5e" />
                <ellipse cx="88" cy="60" rx="16" ry="8" transform="rotate(25 88 60)" fill="#4a7a3e" />
                <ellipse cx="85" cy="62" rx="13" ry="6" transform="rotate(25 85 62)" fill="#5c8a50" />
                <ellipse cx="45" cy="86" rx="14" ry="7" transform="rotate(-50 45 86)" fill="#6b9e5e" />
                <ellipse cx="48" cy="88" rx="11" ry="5.5" transform="rotate(-50 48 88)" fill="#7daa72" />
                {/* Small accent leaf */}
                <ellipse cx="78" cy="80" rx="10" ry="5" transform="rotate(40 78 80)" fill="#4a7a3e" />
              </svg>
            </div>

            {/* Handwritten motto — positioned to the right */}
            <div className="absolute bottom-16 right-4 xl:right-8">
              <p style={{ fontFamily: "'Patrick Hand', 'Comic Neue', cursive" }} className="text-[15px] leading-[1.6] text-[#2c3e50] text-right">
                <span className="block italic">Better</span>
                <span className="block italic ml-3">People</span>
                <span className="block italic ml-7">Brighter</span>
                <span className="block italic ml-12">Tomorrow</span>
              </p>
              {/* Blue underline accent */}
              <svg className="mt-0.5 ml-auto" width="70" height="8" viewBox="0 0 70 8">
                <path d="M2 5 C15 2, 35 2, 68 5" stroke="#144f84" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </svg>
            </div>

            {/* Trust line at bottom */}
            <p className="text-[12px] text-slate-500 tracking-wide pt-4">
              Trusted by teams building a better tomorrow.
            </p>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            RIGHT SIDE — Login Card (unchanged)
            ═══════════════════════════════════════════════ */}
        <div className="flex flex-col items-center justify-center px-6 sm:px-10 lg:px-12 py-8">
          <div className="w-full max-w-[440px] bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-slate-100 p-7 sm:p-9 flex flex-col gap-5">
            {/* Header */}
            <div className="text-center space-y-1">
              <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900">
                Welcome back
              </h1>
              <p className="text-sm text-slate-500 font-normal">
                Sign in to your PeoplePay360 account
              </p>
            </div>

            {/* Form */}
            <LoginForm />

            {/* Separator */}
            <div className="h-px bg-slate-100 w-full" />

            {/* Security Notice */}
            <div className="flex items-center justify-center gap-2 text-center text-xs text-slate-500 font-normal">
              <ShieldCheck className="size-4 text-slate-400 shrink-0" />
              <span>Your data is secure and stays within your organization.</span>
            </div>
          </div>

          {/* Footer Links inside right column */}
          <div className="mt-6 flex items-center gap-6 text-xs text-slate-500 font-medium">
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
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login

