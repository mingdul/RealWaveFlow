import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, X, AlertCircle } from 'lucide-react';
import { Button } from '../components';
import apiClient from '../lib/api';

interface InviteData {
  track_name: string;
  inviter_name: string;
  email: string;
  expires_at: string;
  status: string;
}

interface InvitePageProps {}

const InvitePage: React.FC<InvitePageProps> = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('유효하지 않은 초대 링크입니다.');
      setLoading(false);
      return;
    }

    validateInviteToken();
  }, [token]);

  const validateInviteToken = async () => {
    try {
      const response = await apiClient.get(`/invite/validate/${token}`, {
        withCredentials: true,
      });

      if (response.data.success) {
        setInviteData(response.data.data);
      } else {
        setError('초대 정보를 찾을 수 없습니다.');
      }
    } catch (error: any) {
      console.error('초대 토큰 검증 실패:', error);
      if (error.response?.status === 404) {
        setError('초대 링크를 찾을 수 없습니다.');
      } else if (error.response?.status === 410) {
        setError('초대 링크가 만료되었습니다.');
      } else {
        setError('초대 정보를 불러오는 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!token) return;

    setAccepting(true);
    try {
      const response = await apiClient.post(
        '/invite/accept',
        { token },
        { withCredentials: true }
      );

      if (response.data.success) {
        if (response.data.user_status === 'existing') {
          // 기존 회원인 경우 트랙 페이지로 리다이렉트
          navigate(`/track/${response.data.track_id}`);
        } else {
          // 신규 회원인 경우 회원가입 페이지로 리다이렉트
          navigate('/signup', { 
            state: { 
              inviteToken: token,
              email: inviteData?.email 
            } 
          });
        }
      } else {
        setError(response.data.message || '초대 수락에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('초대 수락 실패:', error);
      setError(error.response?.data?.message || '초대 수락에 실패했습니다.');
    } finally {
      setAccepting(false);
    }
  };

  const handleDeclineInvite = async () => {
    if (!token) return;

    setDeclining(true);
    try {
      const response = await apiClient.post(
        '/invite/decline',
        { token },
        { withCredentials: true }
      );

      if (response.data.success) {
        // 거절 완료 후 홈페이지로 리다이렉트
        navigate('/');
      } else {
        setError(response.data.message || '초대 거절에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('초대 거절 실패:', error);
      setError(error.response?.data?.message || '초대 거절에 실패했습니다.');
    } finally {
      setDeclining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">초대 정보를 확인하는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">초대 링크 오류</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Button
            variant="primary"
            onClick={() => navigate('/')}
            className="bg-purple-600 hover:bg-purple-700"
          >
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  if (!inviteData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">초대 정보를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const isExpired = new Date(inviteData.expires_at) < new Date();

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">트랙 초대</h1>
          <p className="text-gray-400">
            {inviteData.inviter_name}님이 초대했습니다
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-2">
              {inviteData.track_name}
            </h3>
            <p className="text-gray-400 text-sm">
              초대자: {inviteData.inviter_name}
            </p>
            <p className="text-gray-400 text-sm">
              이메일: {inviteData.email}
            </p>
            <p className="text-gray-400 text-sm">
              만료: {new Date(inviteData.expires_at).toLocaleDateString('ko-KR')}
            </p>
          </div>

          {isExpired && (
            <div className="bg-red-900 border border-red-700 rounded-lg p-4">
              <p className="text-red-300 text-sm">
                이 초대는 만료되었습니다.
              </p>
            </div>
          )}
        </div>

        {!isExpired && inviteData.status === 'pending' && (
          <div className="space-y-3">
            <Button
              variant="primary"
              size="lg"
              onClick={handleAcceptInvite}
              disabled={accepting}
              className="w-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center gap-2"
            >
              {accepting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  <Check size={20} />
                  초대 수락
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              onClick={handleDeclineInvite}
              disabled={declining}
              className="w-full flex items-center justify-center gap-2"
            >
              {declining ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  <X size={20} />
                  초대 거절
                </>
              )}
            </Button>
          </div>
        )}

        {inviteData.status !== 'pending' && (
          <div className="text-center">
            <p className="text-gray-400 mb-4">
              이 초대는 이미 처리되었습니다.
            </p>
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="bg-gray-700 hover:bg-gray-600"
            >
              홈으로 돌아가기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvitePage; 