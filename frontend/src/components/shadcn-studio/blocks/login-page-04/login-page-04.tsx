import { ShieldCheck } from 'lucide-react'
import LoginForm from '@/components/shadcn-studio/blocks/login-page-04/login-form'

const Login = () => {
  return (
    <div className="relative h-dvh w-full bg-[#f8fafc] text-slate-900 flex flex-col overflow-hidden">
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

          {/* ── Logo ── */}
          <div className="relative z-10 flex items-center gap-3">
            {/* People icon SVG */}
            <svg width="44" height="40" viewBox="0 0 512 512" fill="none">
              {/* Center person (front, larger) */}
              <circle cx="256" cy="160" r="80" fill="#144f84" />
              <path d="M140 440 C140 340, 190 280, 256 280 C322 280, 372 340, 372 440 Z" fill="#144f84" />
              {/* Left person (behind) */}
              <circle cx="110" cy="195" r="65" fill="#3a75af" />
              <path d="M10 440 C10 355, 55 305, 110 305 C165 305, 195 340, 195 380 L195 440 Z" fill="#3a75af" />
              {/* Right person (behind) */}
              <circle cx="402" cy="195" r="65" fill="#3a75af" />
              <path d="M317 440 L317 380 C317 340, 347 305, 402 305 C457 305, 502 355, 502 440 Z" fill="#3a75af" />
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
          <div className="relative z-10 flex-1 flex flex-col justify-center py-6 max-w-[480px]">
            {/* Category tag badge */}
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 backdrop-blur-xs border border-slate-200/70 text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase shadow-xs">
                <span className="size-1.5 rounded-full bg-[#144f84]" />
                HR &nbsp;•&nbsp; Payroll &nbsp;•&nbsp; People Operations
              </span>
            </div>

            {/* Hero headline */}
            <h1 className="text-[clamp(2.5rem,4.5vw,3.6rem)] font-extrabold text-[#1a2236] leading-[1.08] tracking-tight">
              <span className="block">People First.</span>
              <span className="block">Simpler HR.</span>
              <span className="block text-[#144f84]">Real Impact.</span>
            </h1>

            {/* Description */}
            <p className="mt-6 text-[15px] leading-relaxed text-slate-600 max-w-[420px]">
              A complete HR and Payroll solution to manage your workforce, automate processes and drive growth — all in one place.
            </p>

            {/* Tagline pills */}
            <div className="mt-8 flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/70 border border-slate-200/70 text-[10.5px] font-semibold tracking-wider text-slate-600 uppercase shadow-xs">
                Organize
              </span>
              <span className="text-slate-300">•</span>
              <span className="px-3 py-1 rounded-full bg-white/70 border border-slate-200/70 text-[10.5px] font-semibold tracking-wider text-slate-600 uppercase shadow-xs">
                Automate
              </span>
              <span className="text-slate-300">•</span>
              <span className="px-3 py-1 rounded-full bg-white/70 border border-slate-200/70 text-[10.5px] font-semibold tracking-wider text-slate-600 uppercase shadow-xs">
                Empower
              </span>
            </div>
          </div>

          {/* ── Bottom footer area ── */}
          <div className="relative z-10 pt-6 border-t border-slate-200/60 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <p className="text-[12px] text-slate-500 tracking-wide">
              Trusted by teams building a better tomorrow.
            </p>

            <div className="text-left sm:text-right">
              <p style={{ fontFamily: "'Patrick Hand', 'Comic Neue', cursive" }} className="text-[18px] text-[#2c3e50] leading-snug">
                <span className="italic">Better People, </span>
                <span className="italic text-[#144f84] font-semibold">Brighter Tomorrow</span>
              </p>
              <svg className="mt-0.5 sm:ml-auto" width="80" height="6" viewBox="0 0 80 6" fill="none">
                <path d="M2 4 C25 2, 55 2, 78 4" stroke="#144f84" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            RIGHT SIDE — Login Card (unchanged)
            ═══════════════════════════════════════════════ */}
        <div className="flex flex-col items-center justify-center px-6 sm:px-10 lg:px-12 py-8">
          <div className="w-full max-w-[440px] bg-white rounded-xl border border-slate-200 p-7 sm:p-9 flex flex-col gap-5">
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

        </div>
      </div>
    </div>
  )
}

export default Login

