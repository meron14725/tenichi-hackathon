import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { apiPost } from '../lib/api-client';
import type {
  RouteSearchRequest,
  RouteSearchResponse,
  ItineraryResponse,
} from '../lib/types/routes';

const C = {
  primary: '#436F9B',
  bg: '#EEF0F1',
  white: '#FFFFFF',
  textPrimary: '#1F2528',
  textSecondary: '#63747E',
  textMuted: '#B5BFC5',
  placeholder: '#98A6AE',
  border: '#D1D7DB',
  borderLight: '#EEF0F1',
  badgeGray: '#7C8D98',
  badgeDestination: '#A86A78',
  lineTJ: '#436F9B',
  lineF: '#8A6F4C',
  lineJS: '#A86A78',
};

type TravelMode = 'transit' | 'driving' | 'walking';

const TRAVEL_TABS: { mode: TravelMode; label: string; icon: string }[] = [
  { mode: 'transit', label: '電車', icon: 'train' },
  { mode: 'driving', label: '車', icon: 'car' },
  { mode: 'walking', label: '走る人', icon: 'walk' },
];

// Simple line color mapping based on common patterns
function getLineColor(routeShortName?: string): string {
  if (!routeShortName) return C.primary;
  const name = routeShortName.toUpperCase();
  if (name.includes('TJ') || name.includes('東武')) return C.lineTJ;
  if (name.includes('F') || name.includes('副都心')) return C.lineF;
  if (name.includes('JS') || name.includes('湘南')) return C.lineJS;
  if (name.includes('JR')) return '#E2725B';
  if (name.includes('M') || name.includes('丸ノ内')) return '#E44D38';
  if (name.includes('G') || name.includes('銀座')) return '#F39B28';
  if (name.includes('H') || name.includes('日比谷')) return '#B5B5AC';
  if (name.includes('Z') || name.includes('半蔵門')) return '#8B76D0';
  return C.primary;
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}分`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}時間${m}分` : `${h}時間`;
}

interface RouteResultsProps {
  destinationLat: number;
  destinationLon: number;
  arrivalTime: string;
}

export default function RouteResults({
  destinationLat,
  destinationLon,
  arrivalTime,
}: RouteResultsProps) {
  const [activeMode, setActiveMode] = useState<TravelMode>('transit');
  const [data, setData] = useState<RouteSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchRoutes() {
      setLoading(true);
      setError(null);
      setData(null);

      const body: RouteSearchRequest = {
        destination_lat: destinationLat,
        destination_lon: destinationLon,
        travel_mode: activeMode,
        arrival_time: arrivalTime,
      };

      try {
        const result = await apiPost<RouteSearchResponse>('/routes/search', body);
        if (!cancelled) setData(result);
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || 'ルートの取得に失敗しました');
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRoutes();
    return () => {
      cancelled = true;
    };
  }, [destinationLat, destinationLon, arrivalTime, activeMode, retryCount]);

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.title}>移動手段</Text>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TRAVEL_TABS.map(tab => {
          const isActive = activeMode === tab.mode;
          return (
            <TouchableOpacity
              key={tab.mode}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveMode(tab.mode)}
            >
              <MaterialCommunityIcons
                name={tab.icon as any}
                size={18}
                color={isActive ? C.primary : C.textSecondary}
              />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      {loading && (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={C.primary} size="large" />
          <Text style={styles.loadingText}>ルートを検索中...</Text>
        </View>
      )}

      {error && (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={32} color={C.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => setRetryCount(c => c + 1)}>
            <Text style={styles.retryText}>再試行</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && data && (
        <View style={styles.resultsList}>
          <Text style={styles.resultCount}>{data.itineraries.length}件</Text>
          {data.itineraries.map((itinerary, index) => (
            <ItineraryCard key={index} itinerary={itinerary} />
          ))}
        </View>
      )}

      {!loading && !error && data && data.itineraries.length === 0 && (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>ルートが見つかりませんでした</Text>
        </View>
      )}
    </View>
  );
}

function ItineraryCard({ itinerary }: { itinerary: ItineraryResponse }) {
  return (
    <View style={styles.card}>
      {/* Summary row */}
      <View style={styles.cardSummary}>
        <View style={styles.cardTimeRange}>
          <Text style={styles.cardTime}>{formatTime(itinerary.departure_time)}</Text>
          <Ionicons name="arrow-forward" size={12} color={C.textMuted} />
          <Text style={styles.cardTimeArrival}>{formatTime(itinerary.arrival_time)}</Text>
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.cardDuration}>{formatDuration(itinerary.duration_minutes)}</Text>
          {itinerary.number_of_transfers != null && (
            <Text style={styles.cardTransfers}>乗換{itinerary.number_of_transfers}回</Text>
          )}
        </View>
      </View>

      {/* Timeline */}
      <View style={styles.timeline}>
        {/* Origin badge */}
        <View style={styles.timelineStep}>
          <View style={[styles.badge, { backgroundColor: C.badgeGray }]}>
            <Text style={styles.badgeText}>出発地</Text>
          </View>
        </View>

        {itinerary.legs.map((leg, legIndex) => (
          <React.Fragment key={legIndex}>
            {/* Connector */}
            <View style={styles.connector}>
              {leg.mode === 'WALK' ? (
                <View style={styles.connectorContent}>
                  <MaterialCommunityIcons name="walk" size={14} color={C.textSecondary} />
                  <Text style={styles.connectorText}>{leg.duration_minutes}分</Text>
                </View>
              ) : (
                <View style={styles.connectorContent}>
                  {leg.route_short_name && (
                    <View
                      style={[
                        styles.lineBadge,
                        {
                          borderColor: getLineColor(leg.route_short_name),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.lineBadgeText,
                          { color: getLineColor(leg.route_short_name) },
                        ]}
                      >
                        {leg.route_short_name}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.connectorText}>{leg.duration_minutes}分</Text>
                </View>
              )}
            </View>

            {/* Station */}
            {legIndex < itinerary.legs.length - 1 && (
              <View style={styles.timelineStep}>
                <Text style={styles.stationName}>{leg.to_name}</Text>
              </View>
            )}
          </React.Fragment>
        ))}

        {/* Destination badge */}
        <View style={styles.timelineStep}>
          <View style={styles.connectorContent}>
            {itinerary.legs.length > 0 &&
              (() => {
                const lastLeg = itinerary.legs[itinerary.legs.length - 1];
                if (lastLeg.mode === 'WALK') {
                  return (
                    <>
                      <MaterialCommunityIcons name="walk" size={14} color={C.textSecondary} />
                      <Text style={styles.connectorText}>{lastLeg.duration_minutes}分</Text>
                    </>
                  );
                }
                return null;
              })()}
          </View>
          <View style={[styles.badge, { backgroundColor: C.badgeDestination }]}>
            <Text style={styles.badgeText}>目的地</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  title: {
    fontSize: 15.75,
    fontWeight: '700',
    color: C.textPrimary,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: C.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textSecondary,
  },
  tabTextActive: {
    fontWeight: '700',
    color: C.primary,
  },

  // Center container (loading, error)
  centerContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: C.textSecondary,
  },
  errorText: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    borderWidth: 1,
    borderColor: C.primary,
    borderRadius: 7,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 4,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '500',
    color: C.primary,
  },

  // Results list
  resultsList: {
    gap: 8,
  },
  resultCount: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textSecondary,
  },

  // Card
  card: {
    backgroundColor: C.white,
    borderRadius: 10,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  cardSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTimeRange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTime: {
    fontSize: 18,
    fontWeight: '500',
    color: C.textPrimary,
  },
  cardTimeArrival: {
    fontSize: 18,
    fontWeight: '700',
    color: C.textPrimary,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardDuration: {
    fontSize: 13,
    fontWeight: '500',
    color: C.textSecondary,
  },
  cardTransfers: {
    fontSize: 13,
    fontWeight: '500',
    color: C.textSecondary,
  },

  // Timeline
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badge: {
    borderRadius: 5.25,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.white,
  },
  connector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  connectorText: {
    fontSize: 11,
    color: C.textSecondary,
  },
  lineBadge: {
    borderWidth: 1.5,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  lineBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  stationName: {
    fontSize: 12,
    fontWeight: '500',
    color: C.textPrimary,
  },
});
