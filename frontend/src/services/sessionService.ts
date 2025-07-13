import apiClient, { ApiResponse } from '../lib/api';
import {
  InitializeTrackDto,
  CreateSessionBranchDto,
  Branch,
  Version,
  StemFile,
  PullRequest,
  CreatePullRequestDto,
  MergePullRequestDto,
  TrackStatus,
  UploadStemDto,
  CreateSessionDto
} from '../types/api';

class SessionService {

  async createSession(createSessionDto: CreateSessionDto) {
    const {name, track_id} = createSessionDto;
    try {
      const response = await apiClient.post('/session', {
        name,
        track_id,
      },{
        withCredentials: true,
      });

      if(!response.data.success) {
        throw new Error(response.data.message);
      }

      return response.data;

    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  /**
   * 트랙별 세션 목록 조회
   */
  async getSessionsByTrack(trackId: string): Promise<ApiResponse<{
    id: string;
    name: string;
  }[]>> {
    try {
      const response = await apiClient.get<ApiResponse<{
        id: string;
        name: string;
      }[]>>(`/session/${trackId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '세션 목록 조회에 실패했습니다.');
    }
  }

  /**
   * 트랙 초기화 (master 브랜치 생성)
   */
  async initializeTrack(dto: InitializeTrackDto): Promise<ApiResponse<{
    masterBranchId: string;
    initialVersionId: string;
    versionNumber: string;
  }>> {
    try {
      const response = await apiClient.post<ApiResponse<{
        masterBranchId: string;
        initialVersionId: string;
        versionNumber: string;
      }>>('/session/initialize', dto);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '트랙 초기화에 실패했습니다.');
    }
  }

  /**
   * 세션 브랜치 생성
   */
  async createSessionBranch(dto: CreateSessionBranchDto): Promise<ApiResponse<{
    sessionBranchId: string;
    sessionName: string;
    directories: Array<{
      id: string;
      instrumentName: string;
      directoryPath: string;
    }>;
  }>> {
    try {
      const response = await apiClient.post<ApiResponse<{
        sessionBranchId: string;
        sessionName: string;
        directories: Array<{
          id: string;
          instrumentName: string;
          directoryPath: string;
        }>;
      }>>('/session/create-branch', dto);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '세션 브랜치 생성에 실패했습니다.');
    }
  }

  /**
   * 스템 파일 업로드
   */
  async uploadStemFile(file: File, dto: UploadStemDto): Promise<ApiResponse<{
    stemFileId: string;
    fileName: string;
    filePath: string;
    instrumentName: string;
  }>> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionBranchId', dto.sessionBranchId);
      formData.append('instrumentName', dto.instrumentName);
      formData.append('userId', dto.userId.toString());

      const response = await apiClient.post<ApiResponse<{
        stemFileId: string;
        fileName: string;
        filePath: string;
        instrumentName: string;
      }>>('/session/upload-stem', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '스템 파일 업로드에 실패했습니다.');
    }
  }

  /**
   * Pull Request 생성
   */
  async createPullRequest(dto: CreatePullRequestDto): Promise<ApiResponse<{
    pullRequestId: string;
    title: string;
    status: string;
  }>> {
    try {
      const response = await apiClient.post<ApiResponse<{
        pullRequestId: string;
        title: string;
        status: string;
      }>>('/session/pull-request', dto);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Pull Request 생성에 실패했습니다.');
    }
  }

  /**
   * Pull Request 병합
   */
  async mergePullRequest(
    pullRequestId: string,
    dto: MergePullRequestDto
  ): Promise<ApiResponse<{
    versionId: string;
    versionNumber: string;
    commitMessage: string;
  }>> {
    try {
      const response = await apiClient.put<ApiResponse<{
        versionId: string;
        versionNumber: string;
        commitMessage: string;
      }>>(`/session/pull-request/${pullRequestId}/merge`, dto);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Pull Request 병합에 실패했습니다.');
    }
  }

  /**
   * 트랙의 모든 브랜치 조회
   */
  async getBranchesByTrack(trackId: string): Promise<ApiResponse<Branch[]>> {
    try {
      const response = await apiClient.get<ApiResponse<Branch[]>>(
        `/session/branches/${trackId}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '브랜치 목록 조회에 실패했습니다.');
    }
  }

  /**
   * 브랜치별 스템 파일 목록 조회
   */
  async getStemFilesByBranch(branchId: string): Promise<ApiResponse<StemFile[]>> {
    try {
      const response = await apiClient.get<ApiResponse<StemFile[]>>(
        `/session/stems/${branchId}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '스템 파일 목록 조회에 실패했습니다.');
    }
  }

  /**
   * 버전 히스토리 조회
   */
  async getVersionHistory(trackId: string): Promise<ApiResponse<Version[]>> {
    try {
      const response = await apiClient.get<ApiResponse<Version[]>>(
        `/session/versions/${trackId}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '버전 히스토리 조회에 실패했습니다.');
    }
  }

  /**
   * 트랙 상태 조회 (대시보드용)
   */
  async getTrackStatus(trackId: string): Promise<ApiResponse<TrackStatus>> {
    try {
      const response = await apiClient.get<ApiResponse<TrackStatus>>(
        `/session/status/${trackId}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '트랙 상태 조회에 실패했습니다.');
    }
  }

  /**
   * 특정 버전의 상세 정보 조회
   */
  async getVersionById(versionId: string): Promise<ApiResponse<Version>> {
    try {
      const response = await apiClient.get<ApiResponse<Version>>(
        `/versions/${versionId}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '버전 정보 조회에 실패했습니다.');
    }
  }

  /**
   * 특정 스템 파일 상세 조회
   */
  async getStemFileById(stemFileId: string): Promise<ApiResponse<StemFile>> {
    try {
      const response = await apiClient.get<ApiResponse<StemFile>>(
        `/stem-files/${stemFileId}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '스템 파일 조회에 실패했습니다.');
    }
  }

  /**
   * Pull Request 목록 조회
   */
  async getPullRequestsByTrack(trackId: string): Promise<ApiResponse<PullRequest[]>> {
    try {
      const response = await apiClient.get<ApiResponse<PullRequest[]>>(
        `/pull-request/track/${trackId}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Pull Request 목록 조회에 실패했습니다.');
    }
  }
}

export default new SessionService(); 