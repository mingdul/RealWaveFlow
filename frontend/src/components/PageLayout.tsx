import React from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import Button from './Button';

interface PageLayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
  className?: string;
}

// 랜딩 페이지 레이아웃 컴포넌트 

const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  showHeader = true,
  className = ''
}) => {
  // const navigationItems = [
  //   { name: 'Home', path: '/' },
  //   { name: 'Dashboard', path: '/dashboard' },
  //   { name: 'Add Project', path: '/add-project' },
  //   { name: 'Master', path: '/master' },
  //   { name: 'Upload', path: '/commit' }
  // ];

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white ${className}`}>
      {/* Header */}
      {showHeader && (
        <header className="bg-black/80 backdrop-blur-md border-b border-gray-700/50 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link to="/" className="flex items-center">
                <Logo size="sm" showTagline={false} />
              </Link>

              {/* Navigation */}
              {/* <nav className="hidden md:flex items-center space-x-8">
                {navigationItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    {item.name}
                  </Link>
                ))}
              </nav> */}

              {/* Auth Buttons */}
              <div className="flex items-center space-x-4">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="gradient" size="sm">
                    Sign Up
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

export default PageLayout; 