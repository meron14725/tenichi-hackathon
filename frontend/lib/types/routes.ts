export interface RouteSearchRequest {
  origin_lat?: number;
  origin_lon?: number;
  destination_lat: number;
  destination_lon: number;
  travel_mode: 'transit' | 'walking' | 'cycling' | 'driving';
  arrival_time?: string;
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
