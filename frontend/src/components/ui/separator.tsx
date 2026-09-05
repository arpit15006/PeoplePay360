import React from 'react';

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
}

export const Separator: React.FC<SeparatorProps> = ({
  className = '',
  orientation = 'horizontal',
  ...props
}) => {
  return (
    <div
      className={`saas-separator saas-separator-${orientation} ${className}`}
      role="separator"
      {...props}
    />
  );
};
