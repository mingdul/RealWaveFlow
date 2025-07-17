import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'gradient' | 'outline' | 'ghost' | 'waveflowbtn';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-[#262626] text-[#D9D9D9] hover:bg-[#595959] focus:ring-[#BFBFBF]',
    secondary: 'bg-[#595959] text-[#D9D9D9] hover:bg-[#BFBFBF] hover:text-[#0D0D0D] focus:ring-[#BFBFBF]',
    gradient: 'bg-[#D9D9D9] text-[#0D0D0D] hover:bg-[#BFBFBF] focus:ring-[#D9D9D9] shadow-lg hover:shadow-[#D9D9D9]/25',
    outline: 'border border-[#595959] text-[#D9D9D9] hover:bg-[#595959] focus:ring-[#BFBFBF]',
    ghost: 'text-[#BFBFBF] hover:text-[#D9D9D9] hover:bg-[#595959]/50 focus:ring-[#BFBFBF]',
    waveflowbtn: 'bg-[#1F2325] text-[#ffffff] hover:bg-[#40413E] focus:bg-white focus:text-black',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm rounded-lg',
    md: 'px-4 py-3 text-base rounded-lg',
    lg: 'px-6 py-4 text-lg rounded-xl'
  };
  
  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
  
  return (
    <button
      className={classes}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button; 