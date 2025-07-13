import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className = '',
  ...props
}) => {
  const baseClasses = 'w-full rounded-lg border bg-[#595959] px-4 py-3 text-[#D9D9D9] placeholder-[#BFBFBF] transition-colors focus:outline-none focus:ring-1';
  const borderClasses = error 
    ? 'border-[#BFBFBF] focus:border-[#D9D9D9] focus:ring-[#D9D9D9]' 
    : 'border-[#262626] focus:border-[#BFBFBF] focus:ring-[#BFBFBF]';
  
  const classes = `${baseClasses} ${borderClasses} ${className}`;
  
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-[#BFBFBF]">
          {label}
        </label>
      )}
      <input className={classes} {...props} />
      {error && (
        <p className="text-sm text-[#D9D9D9]">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-sm text-[#BFBFBF]">{helperText}</p>
      )}
    </div>
  );
};

export default Input;
