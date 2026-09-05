import React from 'react';
import { cn } from '@/lib/utils';
import { IconCheck } from '@tabler/icons-react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', checked, defaultChecked, onCheckedChange, onChange, ...props }, ref) => {
    const [isChecked, setIsChecked] = React.useState<boolean>(
      checked !== undefined ? !!checked : !!defaultChecked
    );

    React.useEffect(() => {
      if (checked !== undefined) {
        setIsChecked(!!checked);
      }
    }, [checked]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.checked;
      if (checked === undefined) {
        setIsChecked(next);
      }
      onCheckedChange?.(next);
      onChange?.(e);
    };

    return (
      <label className="relative inline-flex items-center cursor-pointer select-none">
        <input
          type="checkbox"
          ref={ref}
          checked={isChecked}
          onChange={handleChange}
          className="peer sr-only"
          {...props}
        />
        <div
          className={cn(
            'size-4 rounded border border-slate-300 bg-white transition-all duration-150',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 peer-focus-visible:ring-offset-1',
            'peer-checked:bg-indigo-600 peer-checked:border-indigo-600 peer-checked:text-white',
            'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
            'flex items-center justify-center',
            className
          )}
        >
          {isChecked && <IconCheck className="size-3 stroke-[3]" />}
        </div>
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';
