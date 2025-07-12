import apiClient from "../lib/api";
import { CreateDropSelectionDto } from "../types/api";


class DropSelectionService {

    async createDropSelection(dropSelection: CreateDropSelectionDto) {
        const response = await apiClient.post('/drop-selection', dropSelection, {
            withCredentials: true,
        });

        if(!response.data.success){
            throw new Error('Failed to create drop selection');
        }

        return response.data;   
    }

}

export default new DropSelectionService();

