import React, { createContext, useContext, useState } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '@/components/hooks/ThemeContext';

const DialogContext = createContext();

export const Dialog = ({ children, open, onOpenChange }) => {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
};

export const DialogTrigger = ({ children, asChild, ...props }) => {
  const { onOpenChange } = useContext(DialogContext);
  
  if (asChild) {
    return React.cloneElement(children, {
      onClick: () => onOpenChange(true),
    });
  }
  
  return (
    <button onClick={() => onOpenChange(true)} {...props}>
      {children}
    </button>
  );
};

export const DialogContent = React.forwardRef(({ className = '', children, ...props }, ref) => {
  const { open, onOpenChange } = useContext(DialogContext);
  const { isDark } = useTheme();

  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50" 
        onClick={() => onOpenChange(false)}
      />
      
      {/* Content */}
      <div
        ref={ref}
        className={`relative z-50 w-full p-6 ${isDark ? 'bg-[#111118] text-slate-100' : 'bg-white text-slate-900'} ${className}`}
        {...props}
      >
        {children}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none"
          style={{ color: isDark ? '#94a3b8' : '#64748b' }}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>
  );
});
DialogContent.displayName = 'DialogContent';

export const DialogHeader = ({ className = '', ...props }) => (
  <div className={`flex flex-col space-y-1.5 text-center sm:text-left ${className}`} {...props} />
);

export const DialogFooter = ({ className = '', ...props }) => (
  <div className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className}`} {...props} />
);

export const DialogTitle = React.forwardRef(({ className = '', ...props }, ref) => (
  <h2 ref={ref} className={`text-lg font-semibold leading-none tracking-tight ${className}`} {...props} />
));
DialogTitle.displayName = 'DialogTitle';

export const DialogDescription = React.forwardRef(({ className = '', ...props }, ref) => (
  <p ref={ref} className={`text-sm text-slate-500 ${className}`} {...props} />
));
DialogDescription.displayName = 'DialogDescription';
