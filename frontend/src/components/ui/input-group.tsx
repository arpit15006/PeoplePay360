import React from 'react';
import { cn } from '@/lib/utils';

export interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

export const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative flex items-center w-full h-11 rounded-lg border border-slate-300 bg-white shadow-xs transition-all focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100',
        className
      )}
      {...props}
    />
  )
);
InputGroup.displayName = 'InputGroup';

export interface InputGroupInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const InputGroupInput = React.forwardRef<HTMLInputElement, InputGroupInputProps>(
  ({ className = '', ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex-1 h-full bg-transparent px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none border-none',
        className
      )}
      {...props}
    />
  )
);
InputGroupInput.displayName = 'InputGroupInput';

export interface InputGroupAddonProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'inline-start' | 'inline-end';
}

export const InputGroupAddon = React.forwardRef<HTMLDivElement, InputGroupAddonProps>(
  ({ className = '', align = 'inline-end', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-center text-slate-400 shrink-0',
        align === 'inline-start' ? 'pl-3.5 pr-1' : 'pr-3 pl-1',
        className
      )}
      {...props}
    />
  )
);
InputGroupAddon.displayName = 'InputGroupAddon';
