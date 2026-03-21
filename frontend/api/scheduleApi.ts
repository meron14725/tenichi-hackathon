import { api } from '@/utils/apiClient';
import { TagResponse } from './tagApi';
import { ItineraryResponse } from './routeApi';

export interface SelectedRouteResponse {
  id: number;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
}

export interface ScheduleResponse {
  id: number;
  title: string;
  start_at: string;
  end_at: string | null;
  destination_name: string | null;
  destination_address: string | null;
  destination_lat: number | null;
  destination_lon: number | null;
  travel_mode: string | null;
  memo: string | null;
  schedule_list_id: number | null;
  tags: TagResponse[];
  selected_route: SelectedRouteResponse | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleCreateRequest {
  title: string;
  start_at: string;
  end_at: string | null;
  destination_name: string | null;
  destination_address: string | null;
  destination_lat: number | null;
  destination_lon: number | null;
  travel_mode: string | null;
  memo: string | null;
  tag_ids: number[];
  schedule_list_id: number;
}

export interface ScheduleRouteCreateRequest {
  route_data: ItineraryResponse;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
}

export interface ScheduleRouteFullResponse {
  id: number;
  schedule_id: number;
  route_data: ItineraryResponse;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  created_at: string;
}

export interface ScheduleUpdateRequest {
  title?: string;
  start_at?: string;
  end_at?: string | null;
  destination_name?: string | null;
  destination_address?: string | null;
  destination_lat?: number | null;
  destination_lon?: number | null;
  travel_mode?: string | null;
  memo?: string | null;
  tag_ids?: number[];
}

export const scheduleApi = {
  getById: async (id: number): Promise<ScheduleResponse> => {
    return await api.get<ScheduleResponse>(`schedules/${id}`);
  },
  create: async (data: ScheduleCreateRequest): Promise<ScheduleResponse> => {
    return await api.post<ScheduleResponse>('schedules', data);
  },
  update: async (id: number, data: ScheduleUpdateRequest): Promise<ScheduleResponse> => {
    return await api.put<ScheduleResponse>(`schedules/${id}`, data);
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`schedules/${id}`);
  },
  saveRoute: async (
    scheduleId: number,
    data: ScheduleRouteCreateRequest
  ): Promise<ScheduleRouteFullResponse> => {
    return await api.post<ScheduleRouteFullResponse>(`schedules/${scheduleId}/route`, data);
  },
  getRoute: async (scheduleId: number): Promise<ScheduleRouteFullResponse> => {
    return await api.get<ScheduleRouteFullResponse>(`schedules/${scheduleId}/route`);
  },
};
