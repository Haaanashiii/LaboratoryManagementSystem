import React from 'react';

export const Badge = React.forwardRef(({ className = '', variant = 'default', ...props }, ref) => {
  const variants = {
    default: 'bg-slate-100 text-slate-900',
    secondary: 'bg-slate-100 text-slate-900',
    destructive: 'bg-red-100 text-red-900',
    outline: 'border border-slate-300',
  };

  return (
    <div
      ref={ref}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 ${variants[variant]} ${className}`}
      {...props}
    />
  );
});
Badge.displayName = 'Badge';
