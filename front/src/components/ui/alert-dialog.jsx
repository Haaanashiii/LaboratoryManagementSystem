import React, { createContext, useContext, useState } from 'react';

const AlertDialogContext = createContext();

export const AlertDialog = ({ children, open, onOpenChange }) => {
  return (
    <AlertDialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </AlertDialogContext.Provider>
  );
};

export const AlertDialogTrigger = ({ children, asChild, ...props }) => {
  const { onOpenChange } = useContext(AlertDialogContext);
  
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

export const AlertDialogContent = React.forwardRef(({ className = '', children, ...props }, ref) => {
  const { open, onOpenChange } = useContext(AlertDialogContext);
  
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div
        ref={ref}
        className={`relative z-50 grid w-full max-w-lg gap-4 border bg-white p-6 shadow-lg sm:rounded-lg ${className}`}
        {...props}
      >
        {children}
      </div>
    </div>
  );
});
AlertDialogContent.displayName = 'AlertDialogContent';

export const AlertDialogHeader = ({ className = '', ...props }) => (
  <div className={`flex flex-col space-y-2 text-center sm:text-left ${className}`} {...props} />
);

export const AlertDialogFooter = ({ className = '', ...props }) => (
  <div className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className}`} {...props} />
);

export const AlertDialogTitle = React.forwardRef(({ className = '', ...props }, ref) => (
  <h2 ref={ref} className={`text-lg font-semibold ${className}`} {...props} />
));
AlertDialogTitle.displayName = 'AlertDialogTitle';

export const AlertDialogDescription = React.forwardRef(({ className = '', ...props }, ref) => (
  <p ref={ref} className={`text-sm text-slate-500 ${className}`} {...props} />
));
AlertDialogDescription.displayName = 'AlertDialogDescription';

export const AlertDialogAction = React.forwardRef(({ className = '', ...props }, ref) => (
  <button
    ref={ref}
    className={`inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white ring-offset-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${className}`}
    {...props}
  />
));
AlertDialogAction.displayName = 'AlertDialogAction';

export const AlertDialogCancel = React.forwardRef(({ className = '', ...props }, ref) => (
  <button
    ref={ref}
    className={`inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold ring-offset-white transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${className}`}
    {...props}
  />
));
AlertDialogCancel.displayName = 'AlertDialogCancel';
