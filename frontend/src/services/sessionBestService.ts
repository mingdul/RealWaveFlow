import apiClient from "../lib/api";
import { CreateSessionBestDto } from "../types/api";

class SessionBestService {
    async createSessionBest(createSessionBestDto: CreateSessionBestDto) {
        const {session_id, category_id, stem_id} = createSessionBestDto;
        try {
            const response = await apiClient.post('/session-best', {
                session_id,
                category_id,
                stem_id,
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

    async getSessionBest(session_id: string) {
        const response = await apiClient.get(`/session-best/${session_id}`,{
            withCredentials: true,
        });
        if(!response.data.success) {
            throw new Error(response.data.message);
        }
    
        return response.data;
    }
}             

export default new SessionBestService(); 