import apiClient from "../lib/api";

class VersionStemService {
    
    async getLatestStemsPerCategoryByTrack(trackId: string, version: number) {
        try {
            const response = await apiClient.get(`/version-stem/track/${trackId}/version-stem/${version}`);
            if(!response.data.success){
                throw new Error(response.data.message);
            }
            return response.data.data;
        } catch (error) {
            console.error('Failed to get latest stems per category by track:', error);
            throw new Error('Failed to get latest stems per category by track');
        }
    }

    async getLatestStem(trackId : string, version : number){
        try {
            const response = await apiClient.get(`/guide/track/${trackId}/version-stem/${version}`);
            if(!response.data.success){
                throw new Error(response.data.message);
            }
            return response.data.data;
        } catch (error) {
            console.error('Failed to get latest stems per category by track:', error);
            throw new Error('Failed to get latest stems per category by track');
        }
    }

    async getVersionStemByStageId(stageId: string) {
        try {
            const response = await apiClient.get(`/version-stem/stage/${stageId}`);
            if(!response.data.success){
                throw new Error(response.data.message);
            }
            return response.data.data;
        } catch (error) {
            console.error('Failed to get version stems by stage ID:', error);
            throw new Error('Failed to get version stems by stage ID');
        }
    }
}

export default new VersionStemService();