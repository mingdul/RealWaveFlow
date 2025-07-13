
import apiClient from "../lib/api";
import { CreateCategoryDto } from "../types/api";

class CategoryService {
    
    async createCategory(createCategoryDto  : CreateCategoryDto) {
        const {name, track_id} = createCategoryDto;
        try {
            const response = await apiClient.post('/category', {
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

    async getCategoryByTrackId(trackId: string) {
        try {
            const response = await apiClient.get(`/category/match/${trackId}`);
            return response.data;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async getCategoryHistory(categoryId: string) {
        try {
            const response = await apiClient.get(`/category/${categoryId}`);
            return response.data;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
}
export default new CategoryService(); 