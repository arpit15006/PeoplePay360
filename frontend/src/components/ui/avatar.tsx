import React from 'react';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

export const Avatar: React.FC<AvatarProps> = ({
  className = '',
  size = 'md',
  children,
  ...props
}) => {
  return (
    <div className={`saas-avatar saas-avatar-${size} ${className}`} {...props}>
      {children}
    </div>
  );
};

export const AvatarFallback: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <span className={`saas-avatar-fallback ${className}`} {...props}>
      {children}
    </span>
  );
};
