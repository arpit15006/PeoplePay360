import React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

export interface FieldGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

export const FieldGroup = React.forwardRef<HTMLDivElement, FieldGroupProps>(
  ({ className = '', ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-3', className)} {...props} />
  )
);
FieldGroup.displayName = 'FieldGroup';

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal';
}

export const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ className = '', orientation = 'vertical', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'w-full',
        orientation === 'vertical' ? 'flex flex-col gap-1.5' : 'flex items-center gap-2',
        className
      )}
      {...props}
    />
  )
);
Field.displayName = 'Field';

export interface FieldLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const FieldLabel = React.forwardRef<HTMLLabelElement, FieldLabelProps>(
  ({ className = '', ...props }, ref) => (
    <Label ref={ref} className={cn('text-xs font-semibold text-slate-600', className)} {...props} />
  )
);
FieldLabel.displayName = 'FieldLabel';
