import apiClient from "../lib/api";
import { CreateDropDto } from "../types/api";


class DropService {

    async createDrop(createDropDto: CreateDropDto) {
        const response = await apiClient.post('/drop', createDropDto, {
            withCredentials: true,
        });

        if(!response.data.success){
            throw new Error('Failed to create drop');
        }

        return response.data;
    }

    async getDropsByTrackId(trackId: string) {
        console.log('=== DropService.getDropsByTrackId called ===');
        console.log('trackId:', trackId);
        console.log('API endpoint:', `/drop/${trackId}`);
        
        try {
            const response = await apiClient.get(`/drop/${trackId}`, {
                withCredentials: true,
            });

            console.log('=== API Response in DropService ===');
            console.log('Response status:', response.status);
            console.log('Response data:', response.data);

            if(!response.data.success){
                console.error('API returned success: false');
                console.error('API error message:', response.data.message);
                throw new Error('Failed to fetch drops');
            }

            console.log('API call successful, returning data');
            return response.data;
        } catch (error) {
            console.error('=== API Call Error in DropService ===');
            console.error('Error details:', error);
            throw error;
        }
    }


    async getDropById(dropId: string) {
        const response = await apiClient.get(`/drop/info/${dropId}`, {
            withCredentials: true,
        });
        if(!response.data.success){
            throw new Error('Failed to fetch drop');
        }
        return response.data;
    }
}

export default new DropService();

