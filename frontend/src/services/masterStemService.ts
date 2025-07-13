import apiClient from "../lib/api";
import { CreateMasterStemDto } from "../types/api";

class MasterStemService {
    async createMasterStem(createMasterStemDto: CreateMasterStemDto) {
        const {file_path, file_name, key, tag, description, track_id, category_id, masterTake_id, uploaded_by, take} = createMasterStemDto;
        
        // 필수 필드 검증
        if (!file_path || !file_name || !track_id || !category_id || !masterTake_id || !uploaded_by || !take) {
            throw new Error('필수 필드가 누락되었습니다: file_path, file_name, track_id, category_id, masterTake_id, uploaded_by');
        }

        try {
            const response = await apiClient.post('/master-stem', {
                file_path,
                file_name,
                key: key || '',
                tag: tag || '',
                description: description || '',
                track_id,
                category_id,
                masterTake_id,
                uploaded_by,
                take,
            },{
                withCredentials: true,
            });

            if(!response.data.success) {
                throw new Error(response.data.message || 'Master stem 생성에 실패했습니다.');
            }

            return response.data;
        } catch (error: any) {
            console.error('[ERROR] createMasterStem error:', error.response?.data || error.message);
            throw error;
        }
    }


    async getLatestStemsPerCategoryByTrack(trackId: string, take: number) {
        const response = await apiClient.get(`/master-stem/track/${trackId}/latest-stems/${take}`,{
            withCredentials: true,
        });
        if(!response.data.success) {
            throw new Error(response.data.message || 'Master stem 조회에 실패했습니다.');
        }
        return response.data;
    }

    async compareBestStemWithMasterStem(sessionId: string, trackId: string) {
        const response = await apiClient.get(`/master-stem/compare/${sessionId}/${trackId}`,{
            withCredentials: true,
        });
        if(!response.data.success) {
            throw new Error(response.data.message || 'Best stem과 master stem 비교에 실패했습니다.');
        }
        return response.data;
    }   


    async compareDropSelectionWithMaster(trackId: string, dropId: string) {
        const response = await apiClient.get(`/master-stem/compare-drop/${trackId}/${dropId}`,{
            withCredentials: true,
        });
        if(!response.data.success) {
            throw new Error(response.data.message || 'Drop selection과 master stem 비교에 실패했습니다.');
        }
        return response.data;
    }
}  
export default new MasterStemService(); 