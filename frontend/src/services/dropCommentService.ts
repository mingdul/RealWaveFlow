import apiClient from "../lib/api";
import { CreateDropCommentDto } from "../types/api";


class DropCommentService {

    async createDropComment(dropComment: CreateDropCommentDto) {
        const response = await apiClient.post('/drop-comment', dropComment);
            
        if(!response.data.success){
            throw new Error('Failed to create drop comment');
        }

        return response.data;
    }
    
}

export default new DropCommentService();

