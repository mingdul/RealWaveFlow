import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { AuthFormWrapper, Input, Button, AuthSocialButtons } from '../components';
import apiClient from '../lib/api';

const SignUpPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { register, isLoading, error, clearError } = useAuth();
  const { showSuccess, showError } = useToast();

  // 초대 토큰이 있는 경우 이메일 자동 설정
  useEffect(() => {
    const inviteToken = location.state?.inviteToken;
    const inviteEmail = location.state?.email;
    
    if (inviteEmail && inviteToken) {
      setEmail(inviteEmail);
    }
  }, [location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await register({ email, username, password });
      showSuccess('sign up success');
      
      // 초대 토큰이 있는 경우 회원가입 완료 후 초대 처리
      const inviteToken = location.state?.inviteToken;
      if (inviteToken) {
        try {
          const response = await apiClient.post('/invite/complete-signup', {
            token: inviteToken
          }, {
            withCredentials: true,
          });
          
          if (response.data.success) {
            showSuccess('회원가입이 완료되었습니다. 트랙에 참여되었습니다.');
            navigate(`/track/${response.data.track_id}`);
            return;
          }
        } catch (error) {
          console.error('초대 처리 실패:', error);
        }
      }
      
      navigate('/login');
    } catch (error: any) {
      showError(error.message || 'sign up failed.');
    }
  };

  return (
    <AuthFormWrapper 
      title="Create Account"
      linkText="Already have an account?"
      linkUrl="/login"
      linkLabel="Login"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Input
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <Input
            type="text"
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div>
          <Input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'sign up...' : 'sign up'}
        </Button>
      </form>

      <div className="mt-8">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 text-gray-500">or</span>
          </div>
        </div>

        <div className="mt-6">
          <AuthSocialButtons />
        </div>
      </div>

      
    </AuthFormWrapper>
  );
};

export default SignUpPage;
