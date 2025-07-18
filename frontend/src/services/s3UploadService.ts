import apiClient, { ApiResponse } from '../lib/api';
import {
  AddUploadDto,
  UploadResponse,
  PresignedUrlsDto,
  PresignedUrlsResponse,
  CompleteUploadDto,
  CompleteUploadResponse,
  AbortUploadDto,
  UploadProgress,
  UploadedPart,
  PresignedImageUrl,
} from '../types/api';
import { encodeFilename} from '../utils/filenameUtils';

class S3UploadService {
  private activeUploads: Map<string, UploadProgress> = new Map();
  private cancelTokens: Map<string, AbortController[]> = new Map();

 
  /**
   * 기존 프로젝트에 파일 추가 업로드 초기화
   */
  async addUpload(
    data: AddUploadDto
  ): Promise<ApiResponse<UploadResponse>> {
    try {
      const response = await apiClient.post<
        ApiResponse<UploadResponse>
      >('/uploads/add-upload', data);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'front-end initUpload 업로드 초기화에 실패했습니다.'
      );
    }
  }

  /**
   * 이미지 업로드를 위한 presigned URL 요청
   */
  async getImagePresignedUrl(fileName: string,contentType: string): Promise<ApiResponse<PresignedImageUrl>> {
    try {
      const response = await apiClient.post<ApiResponse<PresignedImageUrl>>(
        '/images/upload-url',
        {
          fileName,
          contentType,
        },
        {
          withCredentials: true,
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('[ERROR] getImagePresignedUrl failed:', error);
      throw new Error(
        error.response?.data?.message?.join?.(', ') ||
          '이미지 presigned URL 요청에 실패했습니다.'
      );
    }
  }

  /**
   * 이미지 파일을 S3에 업로드
   */
  async uploadImage(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{ imageUrl: string; key: string }> {
    try {
      console.log('[DEBUG] Requesting presigned URL for image...');
      const presignedResponse = await this.getImagePresignedUrl(
        file.name,
        file.type
      );
  
      if (!presignedResponse.success || !presignedResponse.data) {
        throw new Error('이미지 presigned URL 요청 실패');
      }
  
      const { uploadUrl, key } = presignedResponse.data;
  
      const imageUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
  
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            const progress = Math.round((event.loaded * 100) / event.total);
            onProgress(progress);
          }
        };
  
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const cleanUrl = uploadUrl.split('?')[0];
            resolve(cleanUrl);
          } else {
            reject(new Error(`S3 업로드 실패: HTTP ${xhr.status}`));
          }
        };
  
        xhr.onerror = () => {
          reject(new Error('이미지 업로드 중 네트워크 오류'));
        };
  
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });
  
      return { imageUrl, key };
    } catch (error: any) {
      throw new Error(`이미지 업로드 실패: ${error.message}`);
    }
  }
  

  /**
   * presigned URL 요청
   */
  async getPresignedUrls(
    data: PresignedUrlsDto
  ): Promise<ApiResponse<PresignedUrlsResponse>> {
    try {
      const response = await apiClient.post<
        ApiResponse<PresignedUrlsResponse>
      >('/uploads/presigned-urls', data);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message ||
          'presigned URL 요청에 실패했습니다.'
      );
    }
  }

  /**
   * 업로드 완료
   */
  async completeUpload(
    data: CompleteUploadDto
  ): Promise<ApiResponse<CompleteUploadResponse>> {
    try {
      const response = await apiClient.post<
        ApiResponse<CompleteUploadResponse>
      >('/uploads/complete', data);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || '업로드 완료에 실패했습니다.'
      );
    }
  }

  /**
   * 업로드 취소
   */
  async abortUpload(data: AbortUploadDto): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>(
        '/uploads/abort',
        data
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || '업로드 취소에 실패했습니다.'
      );
    }
  }

  /**
   * 파일을 청크로 분할
   */
  private splitFileIntoChunks(file: File, chunkSize: number): Blob[] {
    const chunks: Blob[] = [];
    let start = 0;

    while (start < file.size) {
      const end = Math.min(start + chunkSize, file.size);
      chunks.push(file.slice(start, end));
      start = end;
    }

    return chunks;
  }

  /**
   * 단일 청크를 S3에 업로드
   */
  private async uploadChunk(
    chunk: Blob,
    url: string,
    partNumber: number,
    uploadId: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const controller = new AbortController();
    
    // 취소 토큰 등록
    const existingControllers = this.cancelTokens.get(uploadId) || [];
    existingControllers.push(controller);
    this.cancelTokens.set(uploadId, existingControllers);

    try {
      // XMLHttpRequest를 사용한 업로드 (axios 대신)
      const xhr = new XMLHttpRequest();
      
      return new Promise<string>((resolve, reject) => {
        // 업로드 진행률 처리
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            const progress = Math.round((event.loaded * 100) / event.total);
            onProgress(progress);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const etag = xhr.getResponseHeader('etag');
            if (!etag) {
              reject(new Error(`Part ${partNumber}에 대한 ETag를 받지 못했습니다.`));
              return;
            }
            resolve(etag.replace(/"/g, '')); // ETag에서 따옴표 제거
          } else {
            reject(new Error(`청크 ${partNumber} 업로드 실패: HTTP ${xhr.status}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error(`청크 ${partNumber} 업로드 중 네트워크 오류 발생`));
        };

        xhr.onabort = () => {
          reject(new Error('업로드가 취소되었습니다.'));
        };

        // 취소 처리
        controller.signal.addEventListener('abort', () => {
          xhr.abort();
        });

        xhr.open('PUT', url);
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        xhr.send(chunk);
      });
    } catch (error: any) {
      if (error.name === 'AbortError' || error.message.includes('취소')) {
        throw new Error('업로드가 취소되었습니다.');
      }
      throw new Error(`청크 ${partNumber} 업로드 실패: ${error.message}`);
    }
  }
  
  /**
   * 전체 파일 업로드 처리 (메인 함수)
   */
  async uploadFile(
    file: File,
    projectId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<CompleteUploadResponse> {
    let uploadId = '';
    let key = '';

    try {
      // 한글 파일명을 안전한 ASCII 형태로 인코딩
      const encodedFilename = encodeFilename(file.name);
      console.log('[📤 S3UPLOAD] Original filename:', file.name);
      console.log('[📤 S3UPLOAD] Encoded filename:', encodedFilename);

      // 1. 업로드 초기화 (기존 프로젝트에 파일 추가)
      const uploadResponse = await this.addUpload({
        projectId,
        filename: encodedFilename, // 인코딩된 파일명 사용
        contentType: file.type,
        fileSize: file.size,
      });

      console.log('[DEBUG] uploadResponse:', uploadResponse);
      
      // 백엔드 응답 형식이 { success: true, data: {...} }로 통일됨
      if (!uploadResponse.success || !uploadResponse.data || !uploadResponse.data.uploadId) {
        console.log('[ERROR] uploadResponse:', uploadResponse);
        throw new Error('front-end uploadFile 업로드 초기화에 실패했습니다.');
      }

      // 백엔드 응답에서 데이터 추출
      uploadId = uploadResponse.data.uploadId;
      key = uploadResponse.data.key;
      const chunkSize = uploadResponse.data.chunkSize;

      // 2. 파일을 청크로 분할
      const chunks = this.splitFileIntoChunks(file, chunkSize);
      
      // 3. 업로드 진행 상태 초기화
      const uploadProgress: UploadProgress = {
        uploadId,
        fileName: file.name, // UI 표시용으로는 원본 파일명 사용
        totalSize: file.size,
        uploadedBytes: 0,
        progress: 0,
        chunks: chunks.map((chunk, index) => ({
          partNumber: index + 1,
          size: chunk.size,
          uploadedBytes: 0,
          progress: 0,
          status: 'pending' as const,
        })),
        status: 'preparing',
        projectId,
        key,
        uploadSpeed: 0,
        estimatedTimeRemaining: 0,
      };

      this.activeUploads.set(uploadId, uploadProgress);
      onProgress?.(uploadProgress);

      // 4. 사전 서명된 URL 요청
      const parts = chunks.map((_, index) => ({ partNumber: index + 1 }));
      const presignedResponse = await this.getPresignedUrls({
        uploadId,
        key,
        projectId: uploadProgress.projectId,
        parts,
      });

      if (!presignedResponse.success || !presignedResponse.data) {
        throw new Error('사전 서명된 URL 요청에 실패했습니다.');
      }

      uploadProgress.status = 'uploading';
      onProgress?.(uploadProgress);

      // 5. 청크들을 병렬로 업로드
      const uploadPromises = chunks.map(async (chunk, index) => {
        const partNumber = index + 1;
        const presignedUrl = presignedResponse.data!.urls.find(
          (url) => url.partNumber === partNumber
        );

        console.log('[DEBUG] Looking for partNumber:', partNumber);
        console.log('[DEBUG] Available URLs:', presignedResponse.data!.urls.map(u => ({ partNumber: u.partNumber, hasUrl: !!u.url })));

        if (!presignedUrl) {
          throw new Error(`Part ${partNumber}에 대한 URL을 찾을 수 없습니다.`);
        }

        const chunkProgress = uploadProgress.chunks[index];
        chunkProgress.status = 'uploading';

        try {
          const ETag = await this.uploadChunk(
            chunk,
            presignedUrl.url,
            partNumber,
            uploadId,
            (progress) => {
              // 청크별 진행률 업데이트
              chunkProgress.progress = progress;
              chunkProgress.uploadedBytes = Math.round(
                (chunk.size * progress) / 100
              );

              // 전체 진행률 계산
              const totalUploadedBytes = uploadProgress.chunks.reduce(
                (sum, chunk) => sum + chunk.uploadedBytes,
                0
              );
              uploadProgress.uploadedBytes = totalUploadedBytes;
              uploadProgress.progress = Math.round(
                (totalUploadedBytes * 100) / file.size
              );

              onProgress?.(uploadProgress);
            }
          );

          chunkProgress.status = 'completed';
          chunkProgress.ETag = ETag;
          chunkProgress.uploadedBytes = chunk.size;
          chunkProgress.progress = 100;

          return { partNumber, eTag: ETag };
        } catch (error: any) {
          chunkProgress.status = 'error';
          chunkProgress.error = error.message;
          throw error;
        }
      });

      const uploadedParts: UploadedPart[] = await Promise.all(uploadPromises);

      // 6. 업로드 완료
      uploadProgress.status = 'completing';
      onProgress?.(uploadProgress);

      const completeResponse = await this.completeUpload({
        uploadId,
        key,
        projectId: uploadProgress.projectId,
        parts: uploadedParts,
      });

      if (!completeResponse.success || !completeResponse.data) {
        throw new Error('업로드 완료에 실패했습니다.');
      }

      uploadProgress.status = 'completed';
      uploadProgress.result = completeResponse.data;
      onProgress?.(uploadProgress);

      // 7. 정리
      this.activeUploads.delete(uploadId);
      this.cancelTokens.delete(uploadId);

      return completeResponse.data;
    } catch (error: any) {
      // 에러 발생 시 업로드 취소 시도
      if (uploadId && key) {
        try {
          await this.abortUpload({ uploadId, key, projectId: projectId.toString() });
        } catch (abortError) {
          console.error('업로드 취소 실패:', abortError);
        }
      }

      const uploadProgress = this.activeUploads.get(uploadId);
      if (uploadProgress) {
        uploadProgress.status = 'error';
        uploadProgress.error = error.message;
        onProgress?.(uploadProgress);
      }

      this.activeUploads.delete(uploadId);
      this.cancelTokens.delete(uploadId);

      throw error;
    }
  }

  /**
   * 업로드 취소
   */
  async cancelUpload(uploadId: string): Promise<void> {
    const uploadProgress = this.activeUploads.get(uploadId);
    if (!uploadProgress) {
      throw new Error('활성 업로드를 찾을 수 없습니다.');
    }

    // 진행 중인 모든 청크 업로드 취소
    const controllers = this.cancelTokens.get(uploadId) || [];
    controllers.forEach((controller) => controller.abort());

    // 백엔드에 업로드 취소 요청
    try {
      await this.abortUpload({
        uploadId: uploadProgress.uploadId,
        key: uploadProgress.key,
        projectId: uploadProgress.projectId,
      });
    } catch (error) {
      console.error('백엔드 업로드 취소 실패:', error);
    }

    // 상태 업데이트
    uploadProgress.status = 'cancelled';

    // 정리
    this.activeUploads.delete(uploadId);
    this.cancelTokens.delete(uploadId);
  }

  /**
   * 활성 업로드 목록 가져오기
   */
  getActiveUploads(): UploadProgress[] {
    return Array.from(this.activeUploads.values());
  }

  /**
   * 특정 업로드 진행 상태 가져오기
   */
  getUploadProgress(uploadId: string): UploadProgress | undefined {
    return this.activeUploads.get(uploadId);
  }
}

export default new S3UploadService(); 