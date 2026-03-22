import React, { createContext, useContext, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

const SelectContext = createContext();

export const Select = ({ children, value, onValueChange, defaultValue }) => {
  const [open, setOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value || defaultValue || '');
  
  const handleValueChange = (newValue) => {
    setSelectedValue(newValue);
    if (onValueChange) onValueChange(newValue);
    setOpen(false);
  };
  
  return (
    <SelectContext.Provider value={{ open, setOpen, selectedValue, handleValueChange }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
};

export const SelectTrigger = React.forwardRef(({ className = '', children, ...props }, ref) => {
  const { open, setOpen } = useContext(SelectContext);
  
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => setOpen(!open)}
      className={`flex h-10 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50  ${className}`}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
});
SelectTrigger.displayName = 'SelectTrigger';

export const SelectValue = ({ placeholder }) => {
  const { selectedValue } = useContext(SelectContext);
  return <span>{selectedValue || placeholder}</span>;
};

export const SelectContent = ({ children, className = '' }) => {
  const { open, setOpen } = useContext(SelectContext);
  
  if (!open) return null;
  
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      <div className={`absolute z-50 mt-1 max-h-60 w-full overflow-y-auto overflow-x-hidden rounded-md border bg-white py-1 shadow-lg ${className}`}>
        {children}
      </div>
    </>
  );
};

export const SelectItem = ({ children, value, className = '' }) => {
  const { selectedValue, handleValueChange } = useContext(SelectContext);
  const isSelected = selectedValue === value;
  
  return (
    <div
      onClick={() => handleValueChange(value)}
      className={`relative flex w-full cursor-pointer select-none items-center whitespace-nowrap rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-slate-100 ${isSelected ? 'bg-slate-100' : ''} ${className}`}
    >
      {isSelected && (
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <Check className="h-4 w-4" />
        </span>
      )}
      {children}
    </div>
  );
};
