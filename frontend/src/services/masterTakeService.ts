import apiClient from "../lib/api";
import { CreateMasterTakeDto } from "../types/api";

class MasterTakeService {
    async createMasterTake(createMasterTakeDto: CreateMasterTakeDto) {
        const {track_id} = createMasterTakeDto;   
        try {
            const response = await apiClient.post('/master-take', {
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


    async getMasterTakeByTrackId(trackId: string) {
        const response = await apiClient.get(`/master-take/track/${trackId}`,{
            withCredentials: true,
        });
        if(!response.data.success) {
            throw new Error(response.data.message);
        }

        return response.data;
    }
}   

export default new MasterTakeService(); 