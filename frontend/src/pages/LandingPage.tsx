import React from 'react';
import { Link } from 'react-router-dom';
import { PageLayout, Button, Logo } from '../components';

const LandingPage: React.FC = () => {
  const features = [
    {
      title: 'Collaborative Music Production',
      description: 'Work together with your team in real-time on music projects',
      icon: '🎵'
    },
    {
      title: 'Version Control',
      description: 'Track changes and manage different versions of your tracks',
      icon: '🔄'
    },
    {
      title: 'File Management',
      description: 'Organize and manage your audio files efficiently',
      icon: '📁'
    }
  ];

  return (
    <div className="h-screen overflow-auto">
    <PageLayout>
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-12">
            <Logo size="lg" />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Create Music Together
          </h1>
          
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            WaveFlow is the ultimate platform for collaborative music production. 
            Share, collaborate, and create amazing music with your team in real-time.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button variant="gradient" size="lg">
                Get Started Free
              </Button>
            </Link>
            {/* <Link to="/dashboard">
              <Button variant="outline" size="lg">
                View Dashboard
              </Button>
            </Link> */}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Everything You Need
            </h2>
            <p className="text-xl text-gray-300">
              Powerful tools for modern music production
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gray-800/50 p-8 rounded-xl border border-gray-700/50 hover:border-gray-600/50 transition-colors"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Start Creating?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of musicians and producers who are already using WaveFlow
          </p>
          <Link to="/signup">
            <Button variant="gradient" size="lg">
              Start Your Free Trial
            </Button>
          </Link>
        </div>
      </section>
    </PageLayout>
    </div>
  );
};

export default LandingPage;