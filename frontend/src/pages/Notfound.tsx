import React from 'react';
import { Link } from 'react-router-dom';
import { PageLayout, Button, Logo } from '../components';

const Notfound: React.FC = () => {
  return (
    <PageLayout>
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto text-center">
          {/* 404 Number */}
          <div className="mb-8">
            <h1 className="text-9xl font-bold bg-gradient-to-r from-[#FF4E4E] to-[#2159C6] bg-clip-text text-transparent">
              404
            </h1>
          </div>

          {/* Logo */}
          <div className="mb-8">
            <Logo size="md" />
          </div>

          {/* Error Message */}
          <h2 className="text-3xl font-bold text-white mb-4">
            Page Not Found
          </h2>
          
          <p className="text-gray-300 mb-8">
            Sorry, the page you're looking for doesn't exist. 
            It might have been moved, deleted, or you entered the wrong URL.
          </p>

          {/* Navigation Buttons */}
          <div className="space-y-4">
            <Link to="/">
              <Button variant="gradient" className="w-full">
                Go to Homepage
              </Button>
            </Link>
            
            <Link to="/dashboard">
              <Button variant="outline" className="w-full">
                Go to Dashboard
              </Button>
            </Link>
          </div>

          {/* Help Text */}
          <div className="mt-8 text-sm text-gray-400">
            <p>Need help? Contact our support team</p>
            <a 
              href="mailto:support@waveflow.com" 
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              support@waveflow.com
            </a>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Notfound;