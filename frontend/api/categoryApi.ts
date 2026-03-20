import { api } from '@/utils/apiClient';

export interface CategoryResponse {
  id: number;
  name: string;
}

export const categoryApi = {
  getCategories: async (): Promise<CategoryResponse[]> => {
    return await api.get<CategoryResponse[]>('categories');
  },
};
