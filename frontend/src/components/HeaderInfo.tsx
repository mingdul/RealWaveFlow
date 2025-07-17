import React, { useState } from 'react';
import Logo from './Logo';
import NotificationBell from './NotificationBell';

const HeaderInfo: React.FC = () => {
  const [activeTab, setActiveTab] = useState('MASTER');
  const [tabs, setTabs] = useState(['MASTER']);
  const [newTab, setNewTab] = useState<string>('');

  const handleAddTab = () => {
    const trimmedTab = newTab.trim();
    if (trimmedTab && !tabs.includes(trimmedTab)) {
      setTabs([...tabs, newTab]);
      setNewTab('');
    }
  };

  return (
    <div>
      <div className='border-b border-gray-700 bg-black px-6 py-4'>
        <div className='flex items-center justify-between'>
          {/* Logo */}
          <div className='flex items-center space-x-4'>
            <div className='flex items-center space-x-2'>
              <div>
                <Logo />{' '}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className='flex items-center space-x-4'>
            <div className='bg-ㅠlack flex gap-x-2 overflow-hidden rounded-lg'>
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-6 py-2 font-medium transition-all duration-300 ${
                    activeTab === tab
                      ? 'bg-white text-black'
                      : 'bg-gray-700 text-white transition-all duration-200 hover:scale-105 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* New Tab Input */}
            <input
              type='text'
              placeholder='New Branch'
              value={newTab}
              onChange={(e) => setNewTab(e.target.value)}
              className='rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-white'
            />
            <button
              onClick={handleAddTab}
              className='rounded bg-gray-800 px-3 py-1 text-sm text-white hover:bg-gray-800/50'
            >
              +
            </button>

            {/* Drop Request Button */}
            <button className='rounded-md bg-red-500 px-4 py-2 text-sm font-medium transition-colors hover:bg-red-600'>
              + Drop Request
            </button>

            {/* Notification Bell */}
            <NotificationBell />
          </div>
        </div>
      </div>
      <div className='flex'></div>
    </div>
  );
};

export default HeaderInfo;
