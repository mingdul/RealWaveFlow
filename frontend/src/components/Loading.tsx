import React from 'react';

interface LoadingProps {
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'white' | 'blue' | 'gray' | 'green' | 'red' | 'yellow' | 'purple';
  text?: string;
}

const Loading: React.FC<LoadingProps> = ({
  fullScreen = false,
  size = 'md',
  color = 'white',
  text = 'Loading...'
}) => {
  const sizeMap = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
  };

  // Tailwind CSS에서 동적 클래스명 사용 시 안전한 방법
  const colorMap = {
    white: 'border-white',
    blue: 'border-blue-500',
    gray: 'border-gray-500',
    green: 'border-green-500',
    red: 'border-red-500',
    yellow: 'border-yellow-500',
    purple: 'border-purple-500',
  };

  const textColorMap = {
    white: 'text-white',
    blue: 'text-blue-500',
    gray: 'text-gray-500',
    green: 'text-green-500',
    red: 'text-red-500',
    yellow: 'text-yellow-500',
    purple: 'text-purple-500',
  };

  return (
    <div
      className={`${
        fullScreen ? 'fixed inset-0' : 'w-full h-full'
      } flex flex-col items-center justify-center bg-black bg-opacity-70 z-50`}
    >
      <div 
        className={`animate-spin rounded-full border-b-2 ${colorMap[color]} ${sizeMap[size]}`}
      />
      {text && (
        <p className={`mt-4 ${textColorMap[color]} text-sm font-medium`}>
          {text}
        </p>
      )}
    </div>
  );
};

// 사용 예시 컴포넌트
const LoadingDemo: React.FC = () => {
  const [loading, setLoading] = React.useState(false);
  const [color, setColor] = React.useState<'white' | 'blue' | 'gray' | 'green' | 'red' | 'yellow' | 'purple'>('white');
  const [size, setSize] = React.useState<'sm' | 'md' | 'lg'>('md');

  const handleFullScreenLoading = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 3000);
  };

  return (
    <div className="p-8 space-y-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800">Loading Component Demo</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 컨트롤 패널 */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">컨트롤</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                크기
              </label>
              <select 
                value={size} 
                onChange={(e) => setSize(e.target.value as 'sm' | 'md' | 'lg')}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                색상
              </label>
              <select 
                value={color} 
                onChange={(e) => setColor(e.target.value as any)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="white">White</option>
                <option value="blue">Blue</option>
                <option value="gray">Gray</option>
                <option value="green">Green</option>
                <option value="red">Red</option>
                <option value="yellow">Yellow</option>
                <option value="purple">Purple</option>
              </select>
            </div>

            <button 
              onClick={handleFullScreenLoading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition-colors"
            >
              전체 화면 로딩 테스트
            </button>
          </div>
        </div>

        {/* 미리보기 */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">미리보기</h2>
          <div className="bg-gray-800 rounded-md relative" style={{height: '200px'}}>
            <Loading 
              fullScreen={false}
              size={size}
              color={color}
              text="Loading..."
            />
          </div>
        </div>
      </div>

      {/* 다양한 사용 사례 */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">다양한 사용 사례</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-md relative h-32">
            <Loading size="sm" color="white" text="Small" />
          </div>
          
          <div className="bg-gray-800 rounded-md relative h-32">
            <Loading size="md" color="blue" text="Medium" />
          </div>
          
          <div className="bg-gray-800 rounded-md relative h-32">
            <Loading size="lg" color="green" text="Large" />
          </div>
        </div>
      </div>

      {/* 전체 화면 로딩 */}
      {loading && (
        <Loading 
          fullScreen 
          size="lg" 
          color="white" 
          text="잠시만 기다려주세요..."
        />
      )}
    </div>
  );
};

export default LoadingDemo;