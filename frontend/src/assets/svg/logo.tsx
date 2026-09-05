import type { SVGAttributes } from 'react'

const Logo = (props: SVGAttributes<SVGElement>) => {
  return (
    <svg width='1em' height='1em' viewBox='0 0 512 512' fill='none' xmlns='http://www.w3.org/2000/svg' {...props}>
      {/* Center person (front, larger) */}
      <circle cx='256' cy='160' r='80' fill='#144f84' />
      <path d='M140 440 C140 340, 190 280, 256 280 C322 280, 372 340, 372 440 Z' fill='#144f84' />
      {/* Left person (behind) */}
      <circle cx='110' cy='195' r='65' fill='#3a75af' />
      <path d='M10 440 C10 355, 55 305, 110 305 C165 305, 195 340, 195 380 L195 440 Z' fill='#3a75af' />
      {/* Right person (behind) */}
      <circle cx='402' cy='195' r='65' fill='#3a75af' />
      <path d='M317 440 L317 380 C317 340, 347 305, 402 305 C457 305, 502 355, 502 440 Z' fill='#3a75af' />
    </svg>
  )
}

export default Logo
