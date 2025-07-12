import apiClient, { ApiResponse } from '../lib/api';
import { CreateStemFileDto, StemFile } from '../types/api';


class stemFileService {


  async createStemFile(createStemFileDto: CreateStemFileDto) {
      const { file_name, file_path, category_id, track_id, session_id, tag, key, description } = createStemFileDto;
  
      // 필수 필드 검증
      if (!file_name || !file_path || !category_id || !track_id || !session_id) {
        throw new Error('필수 필드가 누락되었습니다: file_name, file_path, category_id, track_id, session_id');
      }

      try {
        console.log('[DEBUG] createStemFile API 호출 시작:', createStemFileDto);
        
        const response = await apiClient.post<ApiResponse<StemFile>>(
          '/stem-files',
          {
            file_name,
            file_path,
            category_id,
            track_id,
            session_id,
            tag: tag || '',  
            key: key || '',
            description: description || '',
          },
          {
            withCredentials: true,
          }
        );
  
        if (!response.data.success) {
          console.error('[ERROR] createStemFile failed:', response.data);
          throw new Error('Stem 파일 등록에 실패했습니다.');
        }
  
        console.log('[DEBUG] Stem file successfully registered:', response.data.data);
        return response.data;
      } catch (error: any) {
        console.error('[ERROR] createStemFile error:', error.response?.data || error.message);
        throw error;
      }
    }
  }

  export default new stemFileService(); 