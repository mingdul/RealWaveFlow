import React from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';

interface AuthFormWrapperProps {
  title: string;
  children: React.ReactNode;
  linkText: string;
  linkUrl: string;
  linkLabel: string;
  showSocialButtons?: boolean;
  socialButtonsComponent?: React.ReactNode;
}

const AuthFormWrapper: React.FC<AuthFormWrapperProps> = ({
  title,
  children,
  linkText,
  linkUrl,
  linkLabel,
  showSocialButtons = true,
  socialButtonsComponent
}) => {
  return (
    <div className="flex w-screen h-screen flex-col md:flex-row m-0 p-0 overflow-hidden">
      {/* Left side - Auth Form */}
      <div className="w-full md:w-1/2 items-center justify-center bg-[#0D0D0D] p-8 m-0">
        <div className="w-full px-8 md:px-32">
          {/* Logo and Tagline */}
          <div className="mb-12">
            <Logo size="md" />
          </div>

          {/* Auth Form */}
          <div className="rounded-2xl bg-[#262626] p-8 shadow-2xl">
            <h2 className="mb-8 text-2xl font-semibold text-[#D9D9D9]">{title}</h2>

            
              {children}
     

            {/* Divider */}
            {showSocialButtons && (
              <div className="my-8 text-center">
                <span className="text-sm text-[#BFBFBF]">or continue with</span>
              </div>
            )}

            {/* Social Login Buttons */}
            {showSocialButtons && socialButtonsComponent && (
              <div className="mb-6">
                {socialButtonsComponent}
              </div>
            )}

            {/* Link to other auth page */}
            <div className="text-center">
              <span className="text-sm text-[#BFBFBF]">
                {linkText}{' '}
              </span>
              <Link
                to={linkUrl}
                className="text-sm text-[#D9D9D9] transition-colors hover:text-[#BFBFBF]"
              >
                {linkLabel}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Background Pattern */}
      <div className="relative w-full md:w-1/2 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            background: `linear-gradient(45deg, 
              rgba(38, 38, 38, 0.9) 0%, 
              rgba(89, 89, 89, 0.7) 25%,
              rgba(191, 191, 191, 0.5) 50%,
              rgba(89, 89, 89, 0.7) 75%,
              rgba(38, 38, 38, 0.9) 100%
            ), url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600"><defs><pattern id="mixer" patternUnits="userSpaceOnUse" width="40" height="40"><circle cx="20" cy="20" r="3" fill="%23D9D9D9" opacity="0.2"/></pattern></defs><rect width="100%" height="100%" fill="url(%23mixer)"/></svg>')`,
          }}
        >
          {/* Background Image */}
          <div className="absolute inset-0 flex items-center justify-center">
            <img 
              src="/hand-1850120_1280.jpg" 
              alt="Background" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthFormWrapper; 