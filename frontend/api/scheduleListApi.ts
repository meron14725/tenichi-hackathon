import { api } from '@/utils/apiClient';

export interface PackingItemCreate {
  name: string;
  sort_order?: number;
}

export interface ScheduleListCreateRequest {
  name: string;
  date: string; // YYYY-MM-DD
  category_id?: number | null;
  memo?: string | null;
  departure_name?: string | null;
  departure_lat?: number | null;
  departure_lng?: number | null;
  packing_items?: PackingItemCreate[];
}

export interface ScheduleListCategoryResponse {
  id: number;
  name: string;
}

export interface ScheduleSummary {
  id: number;
  title: string;
  start_at: string;
  end_at: string | null;
}

export interface PackingItemResponse {
  id: number;
  name: string;
  is_checked: boolean;
  sort_order: number;
}

export interface ScheduleListResponse {
  id: number;
  name: string;
  date: string;
  category: ScheduleListCategoryResponse | null;
  memo: string | null;
  departure_name: string | null;
  departure_lat: number | null;
  departure_lng: number | null;
  schedules: ScheduleSummary[];
  packing_items: PackingItemResponse[];
  created_at: string;
  updated_at: string;
}

export interface PackingItemUpdate {
  name?: string;
  is_checked?: boolean;
  sort_order?: number;
}

export const scheduleListApi = {
  create: async (data: ScheduleListCreateRequest): Promise<ScheduleListResponse> => {
    return await api.post<ScheduleListResponse>('schedule-lists', data);
  },
  getById: async (id: number): Promise<ScheduleListResponse> => {
    return await api.get<ScheduleListResponse>(`schedule-lists/${id}`);
  },
  list: async (params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<ScheduleListResponse[]> => {
    let endpoint = 'schedule-lists';
    if (params) {
      const query = new URLSearchParams();
      if (params.start_date) query.append('start_date', params.start_date);
      if (params.end_date) query.append('end_date', params.end_date);
      const queryString = query.toString();
      if (queryString) {
        endpoint += `?${queryString}`;
      }
    }
    return await api.get<ScheduleListResponse[]>(endpoint);
  },
  addPackingItem: async (listId: number, data: PackingItemCreate): Promise<PackingItemResponse> => {
    return await api.post<PackingItemResponse>(`schedule-lists/${listId}/packing-items`, data);
  },
  updatePackingItem: async (
    listId: number,
    itemId: number,
    data: PackingItemUpdate
  ): Promise<PackingItemResponse> => {
    return await api.put<PackingItemResponse>(
      `schedule-lists/${listId}/packing-items/${itemId}`,
      data
    );
  },
  deletePackingItem: async (listId: number, itemId: number): Promise<void> => {
    await api.delete(`schedule-lists/${listId}/packing-items/${itemId}`);
  },
  update: async (
    id: number,
    data: Partial<ScheduleListCreateRequest>
  ): Promise<ScheduleListResponse> => {
    return await api.put<ScheduleListResponse>(`schedule-lists/${id}`, data);
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`schedule-lists/${id}`);
  },
};
