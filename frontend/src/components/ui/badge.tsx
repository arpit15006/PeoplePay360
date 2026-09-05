import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'secondary' | 'outline' | 'warning';
}

export const Badge: React.FC<BadgeProps> = ({
  className = '',
  variant = 'default',
  children,
  ...props
}) => {
  return (
    <div className={`saas-badge saas-badge-${variant} ${className}`} {...props}>
      {children}
    </div>
  );
};
