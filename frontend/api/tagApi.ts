import { api } from '@/utils/apiClient';

export interface TagResponse {
  id: number;
  name: string;
}

export const tagApi = {
  getTags: async (): Promise<TagResponse[]> => {
    return await api.get<TagResponse[]>('tags');
  },
};
