import apiClient from "../lib/api";
import { CreateDropReviewerDto } from "../types/api";


class DropReviewerService {

    async createDropReviewer(dropReviewer: CreateDropReviewerDto) {
        const response = await apiClient.post('/drop-reviewer', dropReviewer);

        if(!response.data.success){
            throw new Error('Failed to create drop reviewer');
        }

        return response.data;
    }

    async getDropReviewer(dropId: string) {
        const response = await apiClient.get(`/drop-reviewer/${dropId}`);

        if(!response.data.success){
            throw new Error('Failed to get drop reviewer');
        }

        return response.data;
    }


    async approveDropReviewer(dropId: string) {
        const response = await apiClient.put(`/drop-reviewer/${dropId}/approve`);


        if(!response.data){
            throw new Error('Failed to approve drop reviewer');
        }

        if(!response.data.success){
            throw new Error(response.data.message);
        }

        return response.data;
    }

    async rejectDropReviewer(dropId: string) {
        const response = await apiClient.put(`/drop-reviewer/${dropId}/reject`);

        if(!response.data){
            throw new Error('Failed to reject drop reviewer');
        }
        
        if(!response.data.success){
            throw new Error(response.data.message);
        }

        return response.data;
    }
}

export default new DropReviewerService();

