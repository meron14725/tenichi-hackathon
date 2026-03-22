import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';

import OwlChatBubble from '@/components/owl-chat-bubble';
import TodoCard from '@/components/todo-card';
import ScheduleMapModal, { MapPin } from '@/components/schedule-map-modal';
import WeatherTrainBar from '@/components/weather-train-bar';
import TimelineView from '@/components/timeline-view';
import AdviceOwlCard from '@/components/advice-owl-card';

import { scheduleListApi, ScheduleListResponse } from '@/api/scheduleListApi';
import { scheduleApi, ScheduleResponse, ScheduleRouteFullResponse } from '@/api/scheduleApi';
import { userApi, UserSettingsResponse } from '@/api/userApi';
import { suggestionApi, TodaySuggestionResponse } from '@/api/suggestionApi';
import { weatherApi, WeatherForecastDay } from '@/api/weatherApi';

import { AppColors as C } from '@/constants/app-colors';
import { getJPDay } from '@/utils/date-utils';
import { buildTimelineItems } from '@/utils/timeline-helper';

export default function ScheduleIndexScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [scheduleList, setScheduleList] = useState<ScheduleListResponse | null>(null);
  const [schedules, setSchedules] = useState<ScheduleResponse[]>([]);
  const [routes, setRoutes] = useState<Record<number, ScheduleRouteFullResponse>>({});
  const [userSettings, setUserSettings] = useState<UserSettingsResponse | null>(null);
  const [suggestionData, setSuggestionData] = useState<TodaySuggestionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [mapVisible, setMapVisible] = useState(false);
  const [weatherMap, setWeatherMap] = useState<Record<string, WeatherForecastDay>>({});
  const [menuVisible, setMenuVisible] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [settings, listData] = await Promise.all([
        userApi.getSettings(),
        scheduleListApi.getById(Number(id)),
      ]);
      setUserSettings(settings);
      setScheduleList(listData);

      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      if (listData.date === dateStr) {
        suggestionApi
          .getToday()
          .then(setSuggestionData)
          .catch(() => null);
      }

      if (listData.schedules.length > 0) {
        const details = await Promise.all(listData.schedules.map(s => scheduleApi.getById(s.id)));
        details.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
        setSchedules(details);

        const routePromises = details
          .filter(s => s.selected_route)
          .map(s => scheduleApi.getRoute(s.id));
        const routeResults = await Promise.all(routePromises);
        const routeMap: Record<number, ScheduleRouteFullResponse> = {};
        routeResults.forEach(r => {
          routeMap[r.schedule_id] = r;
        });
        setRoutes(routeMap);

        const weatherLocations: { lat: number; lon: number }[] = [];
        if (listData.departure_lat != null && listData.departure_lng != null) {
          weatherLocations.push({ lat: listData.departure_lat, lon: listData.departure_lng });
        }
        details.forEach(s => {
          if (s.destination_lat != null && s.destination_lon != null) {
            weatherLocations.push({ lat: s.destination_lat, lon: s.destination_lon });
          }
        });

        const uniqueLocs = Array.from(new Set(weatherLocations.map(l => `${l.lat},${l.lon}`))).map(
          s => {
            const [lat, lon] = s.split(',').map(Number);
            return { lat, lon };
          }
        );

        const weatherResults = await Promise.all(
          uniqueLocs.map(l => weatherApi.getForecast(l.lat, l.lon).catch(() => null))
        );
        const newWeatherMap: Record<string, WeatherForecastDay> = {};
        weatherResults.forEach((res, i) => {
          if (res && res.forecast.length > 0) {
            const loc = uniqueLocs[i];
            const targetDayWeather =
              res.forecast.find(f => f.date === listData.date) || res.forecast[0];
            newWeatherMap[`${loc.lat},${loc.lon}`] = targetDayWeather;
          }
        });
        setWeatherMap(newWeatherMap);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  async function handleToggleTodo(itemId: number) {
    if (!scheduleList) return;
    const item = scheduleList.packing_items.find(i => i.id === itemId);
    if (!item) return;
    try {
      const updated = await scheduleListApi.updatePackingItem(scheduleList.id, itemId, {
        is_checked: !item.is_checked,
      });
      setScheduleList(prev => {
        if (!prev) return null;
        return {
          ...prev,
          packing_items: prev.packing_items.map(i => (i.id === itemId ? updated : i)),
        };
      });
    } catch (error) {
      console.error('Failed to toggle packing item:', error);
    }
  }

  function getMapPins(): MapPin[] {
    const pins: MapPin[] = [];
    if (scheduleList?.departure_lat != null && scheduleList?.departure_lng != null) {
      pins.push({
        lat: scheduleList.departure_lat,
        lng: scheduleList.departure_lng,
        label: scheduleList.departure_name || '出発地点',
        color: '#E74C3C',
      });
    }
    schedules.forEach(s => {
      if (s.destination_lat != null && s.destination_lon != null) {
        pins.push({
          lat: s.destination_lat,
          lng: s.destination_lon,
          label: s.destination_name || s.title,
          color: '#436F9B',
        });
      }
    });
    return pins;
  }

  function handleEdit() {
    setMenuVisible(false);
    if (scheduleList) {
      router.push({
        pathname: '/schedule/list/edit',
        params: { id: scheduleList.id.toString() },
      });
    }
  }

  function handleDelete() {
    setMenuVisible(false);
    Alert.alert('確認', 'この日の予定をすべて削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          try {
            if (scheduleList) {
              await scheduleListApi.delete(scheduleList.id);
              router.replace('/(tabs)');
            }
          } catch (error) {
            console.error('Failed to delete schedule list:', error);
            Alert.alert('エラー', '削除に失敗しました');
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingCenter]}>
        <ActivityIndicator color={C.white} size="large" />
      </View>
    );
  }

  const timelineItems = buildTimelineItems(
    schedules,
    routes,
    userSettings,
    weatherMap,
    scheduleList
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={C.white} />
            <Text style={styles.backText}>カレンダー</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuButton} onPress={() => setMenuVisible(true)}>
            <Feather name="more-horizontal" size={20} color={C.white} />
          </TouchableOpacity>
        </View>
        <View style={styles.owlLayer}>
          <OwlChatBubble
            message={
              suggestionData?.suggestion ||
              (scheduleList ? `${scheduleList.name}の準備は整いましたか？` : '読み込み中です...')
            }
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContent}>
          <TodoCard
            todos={(scheduleList?.packing_items || []).map(item => ({
              id: item.id,
              label: item.name,
              checked: item.is_checked,
            }))}
            onToggle={handleToggleTodo}
          />

          <WeatherTrainBar weatherMap={weatherMap} schedules={schedules} routes={routes} />

          {/* Schedule Header */}
          <View style={styles.scheduleHeaderRow}>
            <View style={styles.scheduleHeaderLeft}>
              <Text style={styles.scheduleDate}>
                {scheduleList
                  ? `${new Date(scheduleList.date).getMonth() + 1}/${new Date(scheduleList.date).getDate()} (${getJPDay(scheduleList.date)})`
                  : ''}
              </Text>
              <Text style={styles.scheduleTitle}>{scheduleList?.name || '予定がありません'}</Text>
            </View>
            <TouchableOpacity style={styles.mapButton} onPress={() => setMapVisible(true)}>
              <Ionicons name="map-outline" size={14} color={C.textSecondary} />
              <Text style={styles.mapButtonText}>マップ</Text>
            </TouchableOpacity>
          </View>

          <TimelineView
            items={timelineItems}
            onPressItem={item => {
              if (item.scheduleId) {
                router.push({
                  pathname: '/schedule/unit/detail',
                  params: {
                    schedule_id: item.scheduleId.toString(),
                    schedule_list_id: scheduleList?.id?.toString(),
                  },
                });
              }
            }}
          />

          <AdviceOwlCard title="予定を確認！" subtitle="忘れ物がないかチェックしましょう！" />
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 30 + insets.bottom }]}
        onPress={() => {
          if (scheduleList) {
            router.push({
              pathname: '/schedule/unit/register',
              params: { schedule_list_id: String(scheduleList.id) },
            });
          }
        }}
      >
        <Ionicons name="add" size={28} color={C.white} />
      </TouchableOpacity>

      <ScheduleMapModal
        visible={mapVisible}
        onClose={() => setMapVisible(false)}
        pins={getMapPins()}
        title={scheduleList?.name || 'ルート情報'}
      />

      {/* Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
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
  container: { flex: 1, backgroundColor: C.headerBg },
  loadingCenter: { justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: C.headerBg, paddingHorizontal: 14, gap: 8 },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 35 },
  backText: { fontSize: 14, fontWeight: '500', color: C.white },
  menuButton: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  owlLayer: { marginTop: -30 },
  scrollView: { flex: 1 },
  scrollContent: {},
  mainContent: {
    backgroundColor: C.white,
    paddingHorizontal: 14,
    paddingTop: 17.5,
    paddingBottom: 17.5,
    gap: 17.5,
    minHeight: 800,
  },
  scheduleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  scheduleHeaderLeft: { gap: 2 },
  scheduleDate: { fontSize: 12.25, fontWeight: '500', color: C.textSecondary },
  scheduleTitle: { fontSize: 17.5, fontWeight: '700', color: C.black },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: C.textMuted,
    borderRadius: 10000,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  mapButtonText: { fontSize: 12.25, fontWeight: '500', color: C.textSecondary },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.fabBg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  menuContainer: {
    position: 'absolute',
    right: 20,
    width: 160,
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  menuItemText: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E8EAEC',
    marginHorizontal: 8,
  },
});
