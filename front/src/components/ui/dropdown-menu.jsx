import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

const DropdownMenuContext = createContext();

export function DropdownMenu({ children }) {
  const [open, setOpen] = useState(false);
  
  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
}

export const DropdownMenuTrigger = React.forwardRef(({ children, asChild, ...props }, ref) => {
  const { open, setOpen } = useContext(DropdownMenuContext);
  
  const handleClick = () => {
    setOpen(!open);
  };
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      onClick: (e) => {
        handleClick();
        children.props.onClick?.(e);
      }
    });
  }
  
  return (
    <button ref={ref} onClick={handleClick} {...props}>
      {children}
    </button>
  );
});
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

export function DropdownMenuContent({ children, align = 'start', className = '', style, ...props }) {
  const { open, setOpen } = useContext(DropdownMenuContext);
  const contentRef = useRef(null);
  
  useEffect(() => {
    if (!open) return;
    
    const handleClickOutside = (e) => {
      if (contentRef.current && !contentRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, setOpen]);
  
  if (!open) return null;

  const alignmentClasses = {
    start: 'left-0',
    end: 'right-0',
    center: 'left-1/2 -translate-x-1/2'
  };

  const hasBg = className.includes('bg-');
  const hasBorder = className.includes('border-');
  const hasText = className.includes('text-slate-') || className.includes('text-white') || className.includes('text-gray-');
  const defaultBase = [
    !hasBg ? 'bg-white' : '',
    !hasBorder ? 'border-slate-200' : '',
    !hasText ? 'text-slate-950' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={contentRef}
      className={`absolute ${alignmentClasses[align]} mt-2 z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-md animate-in fade-in-0 zoom-in-95 ${defaultBase} ${className}`}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({ children, className = '', onClick, ...props }) {
  const { setOpen } = useContext(DropdownMenuContext);
  
  const handleClick = (e) => {
    onClick?.(e);
    setOpen(false);
  };

  // Only apply default light-mode hover when the caller hasn't supplied custom hover/focus bg classes.
  const hasCustomHover = className.includes('hover:bg') || className.includes('focus:bg');
  const defaultHover = hasCustomHover ? '' : 'hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900';
  
  return (
    <div
      className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors ${defaultHover} ${className}`}
      onClick={handleClick}
      {...props}
    >
      {children}
    </div>
  );
}

export function DropdownMenuLabel({ children, className = '', ...props }) {
  return (
    <div
      className={`px-2 py-1.5 text-sm font-semibold ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function DropdownMenuSeparator({ className = '', ...props }) {
  const hasBg = className.includes('bg-');
  return (
    <div
      className={`-mx-1 my-1 h-px ${hasBg ? '' : 'bg-slate-200'} ${className}`}
      {...props}
    />
  );
}
