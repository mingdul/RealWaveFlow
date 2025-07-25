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
  socialButtonsComponent,
}) => {
  return (
    <div className='m-0 flex h-screen w-screen flex-col overflow-hidden p-0 lg:flex-row'>
      {/* Left side - Auth Form */}
      <div className='m-0 flex w-full items-center justify-center bg-[#0D0D0D] p-4 sm:p-6 md:p-8 lg:w-1/2'>
        <div className='w-full max-w-md px-4 sm:px-6 md:px-8 lg:max-w-lg lg:px-12 xl:max-w-xl'>
          {/* Logo and Tagline */}
          <div className='mb-8 sm:mb-10 md:mb-12'>
            <Logo size='md' />
          </div>

          {/* Auth Form */}
          <div className='rounded-xl bg-[#262626] p-4 shadow-2xl sm:p-6 md:p-8 lg:rounded-2xl'>
            <h2 className='mb-6 text-xl font-semibold text-[#D9D9D9] sm:mb-8 sm:text-2xl'>
              {title}
            </h2>

            {children}

            {/* Divider */}
            {showSocialButtons && (
              <div className='my-6 text-center sm:my-8'>
                <span className='text-sm text-[#BFBFBF]'>or continue with</span>
              </div>
            )}

            {/* Social Login Buttons */}
            {showSocialButtons && socialButtonsComponent && (
              <div className='mb-4 sm:mb-6'>{socialButtonsComponent}</div>
            )}

            {/* Link to other auth page */}
            <div className='text-center'>
              <span className='text-sm text-[#BFBFBF]'>{linkText} </span>
              <Link
                to={linkUrl}
                className='text-sm text-[#D9D9D9] transition-colors hover:text-[#BFBFBF]'
              >
                {linkLabel}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Background Pattern */}
      <div className='relative h-32 w-full overflow-hidden sm:h-48 md:h-64 lg:h-full lg:w-1/2'>
        <div
          className='absolute inset-0 bg-cover bg-center bg-no-repeat'
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
          <div className='absolute inset-0 flex items-center justify-center'>
            <img
              src='../DJ.jpg'
              alt='Background'
              className='h-full w-full object-cover'
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthFormWrapper;
