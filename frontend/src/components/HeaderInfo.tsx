import React, { useState, useEffect } from 'react';
import Logo from './Logo';
import NotificationBell from './NotificationBell';
import { useSocket } from '../contexts/SocketContext';
import socketService from '../services/socketService';

const HeaderInfo: React.FC = () => {
  const [activeTab, setActiveTab] = useState('MASTER');
  const [tabs, setTabs] = useState(['MASTER']);
  const [newTab, setNewTab] = useState<string>('');
  const [notificationTrigger, setNotificationTrigger] = useState(0); // 재렌더링 트리거용
  const { isConnected } = useSocket();

  const handleAddTab = () => {
    const trimmedTab = newTab.trim();
    if (trimmedTab && !tabs.includes(trimmedTab)) {
      setTabs([...tabs, newTab]);
      setNewTab('');
    }
  };

  // 소켓 이벤트 처리
  useEffect(() => {
    if (!isConnected) return;

    console.log('[HeaderInfo] 소켓 이벤트 리스너 등록');

    // 파일 처리 완료 이벤트 (InitProjectModal과 동일)
    const handleFileProcessingCompleted = (data: {
      trackId: string;
      fileName: string;
      result: any;
      processingTime: number;
    }) => {
      console.log('[HeaderInfo] File processing completed event received:', data);
      
      // 재렌더링 트리거
      setNotificationTrigger(prev => prev + 1);
      
      // NotificationBell 업데이트를 위한 커스텀 이벤트 발생
      window.dispatchEvent(new CustomEvent('notification-badge-update', {
        detail: { 
          timestamp: new Date().toISOString(),
          source: 'header-info-socket',
          triggerCount: notificationTrigger + 1
        }
      }));
    };

    // 알림 이벤트
    const handleNotification = (notification: any) => {
      console.log('[HeaderInfo] Notification event received:', notification);
      
      // 재렌더링 트리거
      setNotificationTrigger(prev => prev + 1);
      
      // NotificationBell 업데이트를 위한 커스텀 이벤트 발생
      window.dispatchEvent(new CustomEvent('notification-badge-update', {
        detail: { 
          timestamp: new Date().toISOString(),
          source: 'header-info-notification',
          triggerCount: notificationTrigger + 1
        }
      }));
    };

    // 프로젝트 상태 변경 이벤트
    const handleProjectStatusUpdate = (data: {
      projectId: string;
      status: string;
      message?: string;
    }) => {
      console.log('[HeaderInfo] Project status update event received:', data);
      
      // 재렌더링 트리거
      setNotificationTrigger(prev => prev + 1);
    };

    // 일반적인 업데이트 이벤트
    const handleGeneralUpdate = (data: any) => {
      console.log('[HeaderInfo] General update event received:', data);
      
      // 재렌더링 트리거
      setNotificationTrigger(prev => prev + 1);
    };

    // 소켓 이벤트 리스너 등록
    socketService.on('file-processing-completed', handleFileProcessingCompleted);
    socketService.on('notification', handleNotification);
    socketService.on('project-status-update', handleProjectStatusUpdate);
    socketService.on('header-update', handleGeneralUpdate);

    // Cleanup 함수
    return () => {
      socketService.off('file-processing-completed', handleFileProcessingCompleted);
      socketService.off('notification', handleNotification);
      socketService.off('project-status-update', handleProjectStatusUpdate);
      socketService.off('header-update', handleGeneralUpdate);
      console.log('[HeaderInfo] 소켓 이벤트 리스너 제거');
    };
  }, [isConnected, notificationTrigger]);

  // 소켓 연결 상태 변경 시 로그
  useEffect(() => {
    console.log('[HeaderInfo] 소켓 연결 상태:', isConnected ? '연결됨' : '연결 안됨');
  }, [isConnected]);

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
            
            {/* 개발 환경에서만 소켓 상태 표시 */}
            {import.meta.env.DEV && (
              <div className='text-xs text-gray-400'>
                Socket: {isConnected ? '🟢' : '🔴'} | Trigger: {notificationTrigger}
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
