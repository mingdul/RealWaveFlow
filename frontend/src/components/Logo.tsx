import React from 'react';
import { Link } from 'react-router-dom';


interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  // showTagline = true, 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-4xl'
  };

  const waveBarCount = 12;
  const waveBars = Array.from({ length: waveBarCount }, (_, i) => ({
    id: i,
    height: 8 + Math.random() * 20
  }));

  return (
    <Link to="/dashboard" className={`text-center ${className}`}>
      <div>
        <div className="mb-2 flex items-center justify-center">
          <h1 className={`mr-3 font-bold text-{#BD91FF} ${sizeClasses[size]}`}>
            WAVEFLOW
          </h1>
          <div className="flex items-center text-[#BD91FF] space-x-1">
            {waveBars.map((bar) => (
              <div
                key={bar.id}
                className="bg-white"
                style={{
                  width: '3px',
                  height: `${bar.height}px`,
                }}
              />
            ))}
          </div>
        </div>
      
      </div>
    </Link>
  );
  
};

export default Logo; 