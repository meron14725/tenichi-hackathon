import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';

import { scheduleApi, ScheduleResponse, ScheduleRouteFullResponse } from '@/api/scheduleApi';
import { scheduleListApi, ScheduleSummary } from '@/api/scheduleListApi';
import { weatherApi, WeatherForecastDay } from '@/api/weatherApi';
import { suggestionApi, ScheduleSuggestionResponse } from '@/api/suggestionApi';
import TimelineView from '@/components/timeline-view';
import { TimelineItem } from '@/lib/types/timeline';
import { AppColors as C } from '@/constants/app-colors';
import { formatTime } from '@/utils/date-utils';

const owlAvatar = require('@/assets/images/owl-avatar.png');

function getCategoryIcon(name: string): string {
  if (name.includes('遊')) return 'run-fast';
  if (name.includes('食')) return 'hamburger';
  if (name.includes('仕事')) return 'account-group-outline';
  if (name.includes('帰')) return 'exit-run';
  return 'label-outline';
}

function getCategoryColor(name: string): string {
  if (name.includes('遊') || name.includes('旅')) return C.travel;
  if (name.includes('食')) return C.eventWarm;
  if (name.includes('仕事')) return C.work;
  if (name.includes('帰')) return C.eventGreen;
  return C.eventGreen;
}

function getWeatherIcon(condition: string): string {
  const c = condition.toLowerCase();
  if (c.includes('sunny') || c.includes('clear') || c.includes('晴')) return 'weather-sunny';
  if (c.includes('cloud') || c.includes('曇')) return 'weather-cloudy';
  if (c.includes('rain') || c.includes('雨')) return 'weather-rainy';
  if (c.includes('snow') || c.includes('雪')) return 'weather-snowy';
  return 'weather-partly-cloudy';
}

function getWeatherAdvice(weather: WeatherForecastDay): string {
  if (weather.chance_of_rain >= 50) return `雨が降るので傘が必要です！`;
  if (weather.chance_of_rain >= 30) return `雨の可能性があります。折り畳み傘をお忘れなく。`;
  if (weather.avg_temp_c <= 10) return `寒くなりそうです。暖かい服装で出かけましょう。`;
  if (weather.avg_temp_c >= 30) return `暑くなりそうです。熱中症に注意しましょう。`;
  return `お出かけ日和です！`;
}

export default function ScheduleDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    schedule_id: string;
    schedule_list_id?: string;
  }>();

  const scheduleId = Number(params.schedule_id);
  const scheduleListId = params.schedule_list_id ? Number(params.schedule_list_id) : null;

  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [route, setRoute] = useState<ScheduleRouteFullResponse | null>(null);
  const [weather, setWeather] = useState<WeatherForecastDay | null>(null);
  const [originWeather, setOriginWeather] = useState<WeatherForecastDay | null>(null);
  const [suggestion, setSuggestion] = useState<ScheduleSuggestionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [menuVisible, setMenuVisible] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    try {
      const scheduleData = await scheduleApi.getById(scheduleId);
      setSchedule(scheduleData);

      // Fetch route
      const routeData = await scheduleApi.getRoute(scheduleId).catch(() => null);
      setRoute(routeData);

      const listId = scheduleListId || scheduleData.schedule_list_id;
      if (listId) {
        const list = await scheduleListApi.getById(listId);

        // Find origin for weather
        const currentIdx = list.schedules.findIndex((s: ScheduleSummary) => s.id === scheduleId);
        let originLat = list.departure_lat;
        let originLon = list.departure_lng;

        if (currentIdx > 0) {
          const prevS = await scheduleApi.getById(list.schedules[currentIdx - 1].id);
          originLat = prevS.destination_lat;
          originLon = prevS.destination_lon;
        }

        if (originLat && originLon) {
          const originW = await weatherApi.getForecast(originLat, originLon).catch(() => null);
          if (originW && originW.forecast.length > 0) {
            const targetDate = scheduleData.start_at.split('T')[0];
            const dayWeather =
              originW.forecast.find(f => f.date === targetDate) || originW.forecast[0];
            setOriginWeather(dayWeather);
          }
        }
      }

      // Fetch weather
      if (scheduleData.destination_lat && scheduleData.destination_lon) {
        const weatherData = await weatherApi
          .getForecast(scheduleData.destination_lat, scheduleData.destination_lon)
          .catch(() => null);
        if (weatherData && weatherData.forecast.length > 0) {
          const targetDate = scheduleData.start_at.split('T')[0];
          const dayWeather =
            weatherData.forecast.find(f => f.date === targetDate) || weatherData.forecast[0];
          setWeather(dayWeather);
        }
      }

      // Fetch per-schedule suggestion
      const suggestionData = await suggestionApi.getByScheduleId(scheduleId).catch(() => null);
      setSuggestion(suggestionData);
    } catch (error) {
      console.error('Failed to fetch schedule detail:', error);
      Alert.alert('エラー', 'スケジュールの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [scheduleId, scheduleListId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  async function handleDelete() {
    setMenuVisible(false);
    Alert.alert('確認', 'この予定を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          try {
            await scheduleApi.delete(scheduleId);
            router.back();
          } catch (error) {
            console.error('Failed to delete:', error);
            Alert.alert('エラー', '削除に失敗しました');
          }
        },
      },
    ]);
  }

  const handleEdit = () => {
    setMenuVisible(false);
    router.push({
      pathname: '/schedule/unit/edit',
      params: {
        schedule_id: scheduleId.toString(),
        ...(scheduleListId ? { schedule_list_id: scheduleListId.toString() } : {}),
      },
    });
  };

  const getTimelineItems = (): TimelineItem[] => {
    if (!schedule) return [];

    const items: TimelineItem[] = [];

    // Current schedule's legs lead to it
    if (route && route.route_data && route.route_data.legs.length > 0) {
      route.route_data.legs.forEach((leg, legIdx) => {
        const isFirstLeg = legIdx === 0;
        const mode = leg.mode.toUpperCase();
        const modeIcon =
          mode === 'WALK'
            ? 'walk'
            : mode === 'RAIL' || mode === 'SUBWAY' || mode === 'TRANSIT'
              ? 'train'
              : mode === 'BUS'
                ? 'bus'
                : mode === 'BICYCLE'
                  ? 'bike'
                  : mode === 'CAR'
                    ? 'car'
                    : 'walk';

        items.push({
          time: formatTime(leg.departure_time),
          title: `${leg.from_name}発`,
          lineName:
            mode === 'RAIL' || mode === 'SUBWAY' || mode === 'TRANSIT' || mode === 'BUS'
              ? leg.route_long_name || leg.route_short_name || leg.agency_name
              : undefined,
          lineColor: C.accent,
          walk: mode === 'WALK' ? `${leg.duration_minutes}分` : undefined,
          past: false,
          iconName: modeIcon as any,
          weather: isFirstLeg ? originWeather || undefined : undefined,
        });
      });
    }

    const tag = schedule.tags.length > 0 ? schedule.tags[0] : null;
    const iconBg = tag ? getCategoryColor(tag.name) : C.eventGreen;

    items.push({
      time: formatTime(schedule.start_at),
      title: schedule.title,
      subtitle: schedule.destination_name || undefined,
      iconBg,
      hasChevron: true,
      past: false,
      scheduleId: schedule.id,
      weather: weather || undefined,
    });

    return items;
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }, styles.loadingCenter]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (!schedule) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }, styles.loadingCenter]}>
        <Text style={styles.emptyText}>スケジュールが見つかりません</Text>
      </View>
    );
  }

  const categoryTag = schedule.tags.length > 0 ? schedule.tags[0] : null;
  const categoryIconName = categoryTag ? getCategoryIcon(categoryTag.name) : 'label-outline';
  const categoryBg = categoryTag ? getCategoryColor(categoryTag.name) : C.eventGreen;

  // Aggregate weather for the card
  const displayMaxTemp = Math.max(weather?.max_temp_c ?? -99, originWeather?.max_temp_c ?? -99);
  const displayMinTemp = Math.min(weather?.min_temp_c ?? 99, originWeather?.min_temp_c ?? 99);
  const displayMaxRain = Math.max(weather?.chance_of_rain ?? 0, originWeather?.chance_of_rain ?? 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={16} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {schedule.title}
        </Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)}>
          <Feather name="more-horizontal" size={20} color={C.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Destination Card */}
        {schedule.destination_name && (
          <View style={styles.destinationCard}>
            <View style={[styles.categoryIconBg, { backgroundColor: categoryBg }]}>
              <MaterialCommunityIcons
                name={categoryIconName as any}
                size={24}
                color={C.textSecondary}
              />
            </View>
            <View style={styles.destinationInfo}>
              <Text style={styles.destinationName}>{schedule.destination_name}</Text>
              {categoryTag && <Text style={styles.destinationCategory}>{categoryTag.name}</Text>}
              {schedule.destination_address && (
                <View style={styles.addressRow}>
                  <Ionicons name="location-outline" size={13} color={C.textMuted} />
                  <Text style={styles.addressText} numberOfLines={2}>
                    {schedule.destination_address}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Weather Card */}
        {weather && (
          <View style={styles.weatherCard}>
            <MaterialCommunityIcons
              name={getWeatherIcon(weather.condition) as any}
              size={28}
              color={C.primary}
            />
            <View style={styles.weatherInfo}>
              <View style={styles.temperatureRow}>
                <Text style={styles.weatherTemp}>
                  {displayMaxTemp !== -99 ? Math.round(displayMaxTemp) : '--'}° /{' '}
                  {displayMinTemp !== 99 ? Math.round(displayMinTemp) : '--'}°
                </Text>
                <View style={styles.rainBadge}>
                  <Ionicons name="rainy-outline" size={14} color={C.textSecondary} />
                  <Text style={styles.rainText}>雨 {displayMaxRain}%</Text>
                </View>
              </View>
              <Text style={styles.weatherAdvice}>
                {getWeatherAdvice(weather || originWeather || ({} as any))}
              </Text>
            </View>
          </View>
        )}

        {/* Schedule Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>スケジュール</Text>
          <TimelineView items={getTimelineItems()} transparentCards />
        </View>

        {/* Memo Card */}
        {schedule.memo && (
          <View style={styles.memoCard}>
            <View style={styles.memoHeader}>
              <Ionicons name="checkbox" size={18} color={C.primary} />
              <Text style={styles.memoTitle}>一言メモ！</Text>
            </View>
            <Text style={styles.memoText}>{schedule.memo}</Text>
          </View>
        )}

        {/* Suggestion Card */}
        {suggestion && (
          <View style={styles.suggestionWrapper}>
            <View style={styles.suggestionBadge}>
              <Text style={styles.suggestionBadgeText}>おすすめスポット！</Text>
            </View>
            <View style={styles.suggestionCard}>
              <View style={styles.suggestionContent}>
                <Image source={owlAvatar} style={styles.suggestionOwl} resizeMode="contain" />
                <Text style={styles.suggestionText}>{suggestion.suggestion}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={[styles.menuContainer, { top: insets.top + 50 }]}>
            <TouchableOpacity style={styles.menuItem} onPress={handleEdit}>
              <Ionicons name="create-outline" size={20} color={C.textPrimary} />
              <Text style={styles.menuItemText}>編集</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>削除</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8F9' },
  loadingCenter: { justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 14, color: C.textMuted },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    height: 60,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F1',
  },
  headerTitle: {
    fontSize: 15.75,
    fontWeight: '700',
    color: C.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  scrollView: { flex: 1 },
  scrollContent: { padding: 14, paddingTop: 17.5, paddingBottom: 40, gap: 14 },

  /* Destination Card */
  destinationCard: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  categoryIconBg: {
    width: 50,
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destinationInfo: { flex: 1, gap: 3 },
  destinationName: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  destinationCategory: { fontSize: 12, fontWeight: '500', color: C.textSecondary },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 3, marginTop: 2 },
  addressText: { fontSize: 12, color: C.textMuted, flex: 1 },

  /* Weather Card */
  weatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDF0F2',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 14,
  },
  weatherInfo: { flex: 1, gap: 4 },
  temperatureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  weatherTemp: { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  rainBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rainText: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
  weatherAdvice: { fontSize: 12.5, fontWeight: '500', color: C.textSecondary },

  /* Schedule Section */
  section: { gap: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '500', color: C.textSecondary, marginBottom: 8 },

  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#D9DFE3',
    paddingLeft: 14,
    marginLeft: 4,
  },
  scheduleDot: {
    position: 'absolute',
    left: -5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D9DFE3',
  },
  scheduleDotActive: {
    backgroundColor: C.primary,
    width: 10,
    height: 10,
    borderRadius: 5,
    left: -6,
  },
  scheduleTime: { fontSize: 13, fontWeight: '500', color: C.textSecondary, width: 40 },
  scheduleIconBg: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#EEF0F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleTextGroup: { flex: 1, gap: 1 },
  scheduleTitle: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  scheduleSubtitle: { fontSize: 12, color: C.textSecondary },
  walkRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 1 },
  walkText: { fontSize: 11, color: C.textMuted },

  /* Memo Card */
  memoCard: {
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  memoHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memoTitle: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  memoText: { fontSize: 13, color: C.textSecondary, lineHeight: 20 },

  /* Menu Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  menuContainer: {
    position: 'absolute',
    right: 14,
    backgroundColor: C.white,
    borderRadius: 12,
    paddingVertical: 4,
    minWidth: 160,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemText: { fontSize: 15, fontWeight: '500', color: C.textPrimary },
  menuDivider: { height: 1, backgroundColor: '#EEF0F1', marginHorizontal: 12 },

  /* Suggestion Card */
  suggestionWrapper: {
    marginTop: 18,
    position: 'relative',
  },
  suggestionCard: {
    backgroundColor: '#EDF4FA',
    borderWidth: 2,
    borderColor: '#A8C0DD',
    borderRadius: 12,
    paddingTop: 16,
    paddingBottom: 4,
    paddingHorizontal: 12,
  },
  suggestionBadge: {
    position: 'absolute',
    top: -14,
    right: -2,
    backgroundColor: '#436F9B',
    paddingVertical: 4,
    paddingLeft: 24,
    paddingRight: 10,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 0,
    transform: [{ skewX: '-20deg' }],
    zIndex: 1,
  },
  suggestionBadgeText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '700',
    transform: [{ skewX: '20deg' }], // reverse skew for text
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  suggestionOwl: {
    width: 60,
    height: 80,
    marginBottom: -4,
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2528',
    lineHeight: 18,
    paddingBottom: 10,
  },
});
