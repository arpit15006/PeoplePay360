import React from 'react';
import { cn } from '@/lib/utils';
import type { InputProps } from '@/components/ui/input';

export interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

export const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative flex items-center w-full rounded-md border border-slate-300 bg-white transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100',
        className
      )}
      {...props}
    />
  )
);
InputGroup.displayName = 'InputGroup';

export interface InputGroupInputProps extends InputProps {}

export const InputGroupInput = React.forwardRef<HTMLInputElement, InputGroupInputProps>(
  ({ className = '', ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full flex-1 bg-transparent px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none border-none',
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
        'flex items-center justify-center text-slate-400',
        align === 'inline-start' ? 'pl-2.5' : 'pr-2.5',
        className
      )}
      {...props}
    />
  )
);
InputGroupAddon.displayName = 'InputGroupAddon';
