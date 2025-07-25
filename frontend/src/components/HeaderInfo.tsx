import React, { useState, useEffect } from 'react';
import Logo from './Logo';
import NotificationBell from './NotificationBell';
import { useNotifications } from '../contexts/NotificationContext';

const HeaderInfo: React.FC = () => {
  const [activeTab, setActiveTab] = useState('MASTER');
  const [tabs, setTabs] = useState(['MASTER']);
  const [newTab, setNewTab] = useState<string>('');
  const [notificationTrigger, setNotificationTrigger] = useState(0); // 재렌더링 트리거용
  
  // NotificationContext 사용 (올바른 소켓 연결)
  const { notifications, unreadCount, refreshNotifications } = useNotifications();

  const handleAddTab = () => {
    const trimmedTab = newTab.trim();
    if (trimmedTab && !tabs.includes(trimmedTab)) {
      setTabs([...tabs, newTab]);
      setNewTab('');
    }
  };

  // 알림 개수 변경 시 재렌더링 트리거
  useEffect(() => {
    console.log('[HeaderInfo] 알림 개수 변경:', unreadCount);
    setNotificationTrigger(prev => prev + 1);
    
    // NotificationBell 강제 업데이트를 위한 이벤트 발생
    window.dispatchEvent(new CustomEvent('notification-badge-update', {
      detail: { 
        unreadCount: unreadCount,
        timestamp: new Date().toISOString(),
        source: 'header-info-context',
        triggerCount: notificationTrigger + 1
      }
    }));
  }, [unreadCount, notifications.length]);

  // 커스텀 이벤트 리스너 등록 (다른 컴포넌트에서 발생하는 이벤트 감지)
  useEffect(() => {
    console.log('[HeaderInfo] 커스텀 이벤트 리스너 등록');

    // 파일 처리 완료 이벤트
    const handleFileProcessingCompleted = (event: CustomEvent) => {
      console.log('[HeaderInfo] File processing completed event received:', event.detail);
      
      // 재렌더링 트리거
      setNotificationTrigger(prev => prev + 1);
      
      // 알림 새로고침 (새 알림이 있을 수 있음)
      setTimeout(() => {
        refreshNotifications();
      }, 1000);
    };

    // 프로젝트 상태 업데이트 이벤트
    const handleProjectUpdate = (event: CustomEvent) => {
      console.log('[HeaderInfo] Project update event received:', event.detail);
      
      // 재렌더링 트리거
      setNotificationTrigger(prev => prev + 1);
      
      // 알림 새로고침
      setTimeout(() => {
        refreshNotifications();
      }, 1000);
    };

    // 일반 헤더 업데이트 이벤트
    const handleHeaderUpdate = (event: CustomEvent) => {
      console.log('[HeaderInfo] Header update event received:', event.detail);
      
      // 재렌더링 트리거
      setNotificationTrigger(prev => prev + 1);
    };

    // 이벤트 리스너 등록
    window.addEventListener('file-processing-completed', handleFileProcessingCompleted as EventListener);
    window.addEventListener('project-status-update', handleProjectUpdate as EventListener);
    window.addEventListener('header-update', handleHeaderUpdate as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('file-processing-completed', handleFileProcessingCompleted as EventListener);
      window.removeEventListener('project-status-update', handleProjectUpdate as EventListener);
      window.removeEventListener('header-update', handleHeaderUpdate as EventListener);
      console.log('[HeaderInfo] 커스텀 이벤트 리스너 제거');
    };
  }, [refreshNotifications]);

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

            {/* Notification Bell - key prop으로 재렌더링 강제 */}
            <NotificationBell key={`notification-${notificationTrigger}`} />
            
            {/* 개발 환경에서만 알림 상태 표시 */}
            {import.meta.env.DEV && (
              <div className='text-xs text-gray-400'>
                알림: {unreadCount} | Total: {notifications.length} | Trigger: {notificationTrigger}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className='flex'></div>
    </div>
  );
};

export default HeaderInfo;
