import { api } from '@/utils/apiClient';

export type TravelMode = 'transit' | 'driving' | 'walking' | 'cycling';

export interface RouteSearchRequest {
  origin_lat: number;
  origin_lon: number;
  destination_lat: number;
  destination_lon: number;
  travel_mode: TravelMode;
  arrival_time: string; // ISO8601
}

export interface LegResponse {
  mode: string;
  from_name: string;
  to_name: string;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  route_short_name?: string;
  route_long_name?: string;
  agency_name?: string;
  headsign?: string;
  transit_line_id?: number;
  route_color?: string;
}

export interface ItineraryResponse {
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  number_of_transfers?: number;
  legs: LegResponse[];
}

export interface RouteSearchResponse {
  itineraries: ItineraryResponse[];
}

export const routeApi = {
  search: async (data: RouteSearchRequest): Promise<RouteSearchResponse> => {
    return await api.post<RouteSearchResponse>('routes/search', data);
  },
};
