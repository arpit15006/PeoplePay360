import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', icon, ...props }, ref) => {
    if (icon) {
      return (
        <div className="saas-input-with-icon">
          <span className="saas-input-icon">{icon}</span>
          <input
            ref={ref}
            className={`saas-input saas-input-has-icon ${className}`}
            {...props}
          />
        </div>
      );
    }
    return (
      <input
        ref={ref}
        className={`saas-input ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
