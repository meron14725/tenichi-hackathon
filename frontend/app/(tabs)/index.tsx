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
import { useRouter, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
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
import { getCategoryTheme } from '@/utils/category-helper';
import { cancelNotificationsForSchedules } from '@/utils/notifications';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [scheduleList, setScheduleList] = useState<ScheduleListResponse | null>(null);
  const [schedules, setSchedules] = useState<ScheduleResponse[]>([]);
  const [routes, setRoutes] = useState<Record<number, ScheduleRouteFullResponse>>({});
  const [userSettings, setUserSettings] = useState<UserSettingsResponse | null>(null);
  const [suggestionData, setSuggestionData] = useState<TodaySuggestionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [mapVisible, setMapVisible] = useState<boolean>(false);
  const [weatherMap, setWeatherMap] = useState<Record<string, WeatherForecastDay>>({});
  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  const [tomorrowListId, setTomorrowListId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      // Tomorrow's date
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

      const [todayData, settings, listResults, tomorrowResults] = await Promise.all([
        suggestionApi.getToday(),
        userApi.getSettings(),
        scheduleListApi.list({ start_date: dateStr, end_date: dateStr }),
        scheduleListApi.list({ start_date: tomorrowStr, end_date: tomorrowStr }),
      ]);

      // Store tomorrow's list id if available
      if (tomorrowResults && tomorrowResults.length > 0) {
        setTomorrowListId(tomorrowResults[0].id);
      } else {
        setTomorrowListId(null);
      }

      setSuggestionData(todayData);
      setUserSettings(settings);

      if (listResults && listResults.length > 0) {
        const list = listResults[0];
        setScheduleList(list);

        if (list.schedules.length > 0) {
          const details = await Promise.all(list.schedules.map(s => scheduleApi.getById(s.id)));
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
          if (settings.home_lat != null && settings.home_lon != null) {
            weatherLocations.push({ lat: settings.home_lat, lon: settings.home_lon });
          }
          details.forEach(s => {
            if (s.destination_lat != null && s.destination_lon != null) {
              weatherLocations.push({ lat: s.destination_lat, lon: s.destination_lon });
            }
          });

          const uniqueLocs = Array.from(
            new Set(weatherLocations.map(l => `${l.lat},${l.lon}`))
          ).map(s => {
            const [lat, lon] = s.split(',').map(Number);
            return { lat, lon };
          });

          const weatherResults = await Promise.all(
            uniqueLocs.map(l => weatherApi.getForecast(l.lat, l.lon).catch(() => null))
          );
          const newWeatherMap: Record<string, WeatherForecastDay> = {};
          weatherResults.forEach((res, i) => {
            if (res && res.forecast.length > 0) {
              const loc = uniqueLocs[i];
              newWeatherMap[`${loc.lat},${loc.lon}`] = res.forecast[0];
            }
          });
          setWeatherMap(newWeatherMap);
        }
      } else {
        // Reset if no list found for today
        setScheduleList(null);
        setSchedules([]);
        setRoutes({});
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

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
              // Cancel all notifications for schedules in this list
              const scheduleIds = scheduleList.schedules.map(s => s.id);
              await cancelNotificationsForSchedules(scheduleIds);
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
      {/* Floating Header */}
      <View style={[styles.floatingHeader, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTopRow}>
          <View />
          <TouchableOpacity style={styles.menuButton} onPress={() => setMenuVisible(true)}>
            <Feather name="more-horizontal" size={20} color={C.white} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Scrollable Blue Header */}
        <View style={[styles.blueHeaderSection, { paddingTop: insets.top + 10, paddingBottom: 0 }]}>
          <View style={{ height: 35, marginBottom: 0 }} />
          <View style={styles.owlLayer}>
            <OwlChatBubble
              message={
                suggestionData?.suggestion || '今日も一日頑張りましょう！\n準備は大丈夫ですか？'
              }
            />
          </View>
        </View>

        <View style={styles.mainContent}>
          <View style={styles.todoCardWrapper}>
            <TodoCard
              todos={(scheduleList?.packing_items || []).map(item => ({
                id: item.id,
                label: item.name,
                checked: item.is_checked,
              }))}
              onToggle={handleToggleTodo}
            />
          </View>

          <WeatherTrainBar weatherMap={weatherMap} schedules={schedules} routes={routes} />

          {/* Schedule Header */}
          <View style={styles.scheduleHeaderRow}>
            <View style={styles.scheduleHeaderLeft}>
              <Text
                style={styles.scheduleDate}
              >{`${new Date().getMonth() + 1}/${new Date().getDate()} (${getJPDay(new Date())})`}</Text>
              <Text style={styles.scheduleTitle}>今日の予定</Text>
            </View>
            <TouchableOpacity style={styles.mapButton} onPress={() => setMapVisible(true)}>
              <Ionicons name="map-outline" size={14} color={C.textSecondary} />
              <Text style={styles.mapButtonText}>マップ</Text>
            </TouchableOpacity>
          </View>

          {scheduleList?.name &&
            (() => {
              const theme = getCategoryTheme(scheduleList.category?.id);
              return (
                <View style={[styles.scheduleNameCard, { borderColor: theme.color }]}>
                  <Image source={theme.icon} style={styles.scheduleNameIcon} contentFit="contain" />
                  <Text style={styles.scheduleNameText}>{scheduleList.name}</Text>
                </View>
              );
            })()}

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

          <AdviceOwlCard
            title="明日の予定を確認！"
            subtitle="明日に備えて、今日の夜はぐっすり寝よう！"
            onPress={() => {
              if (tomorrowListId) {
                router.push({
                  pathname: '/schedule/list',
                  params: { id: tomorrowListId.toString() },
                });
              } else {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const yyyy = tomorrow.getFullYear();
                const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
                const dd = String(tomorrow.getDate()).padStart(2, '0');
                router.push({
                  pathname: '/schedule/list/register',
                  params: { date: `${yyyy}-${mm}-${dd}` },
                });
              }
            }}
          />
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 10 + insets.bottom }]}
        onPress={() => {
          if (scheduleList) {
            router.push({
              pathname: '/schedule/unit/register',
              params: { schedule_list_id: String(scheduleList.id) },
            });
          } else {
            const now = new Date();
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;
            router.push({
              pathname: '/schedule/list/register',
              params: { date: dateStr },
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
        title={scheduleList?.name || '今日のルート'}
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
  container: { flex: 1, backgroundColor: C.white },
  loadingCenter: { justifyContent: 'center', alignItems: 'center' },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    zIndex: 10,
  },
  blueHeaderSection: { backgroundColor: C.headerBg, paddingHorizontal: 14, gap: 8 },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  menuButton: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  owlLayer: { marginTop: -35 },
  scrollView: {
    flex: 1,
  },
  scrollContent: {},
  mainContent: {
    backgroundColor: C.white,
    marginTop: -20,
    paddingHorizontal: 14,
    paddingTop: 17.5,
    paddingBottom: 36.26,
    gap: 17.5,
  },
  todoCardWrapper: {
    marginTop: -40,
  },
  scheduleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  scheduleHeaderLeft: { gap: 2 },
  scheduleDate: { fontSize: 12.25, fontWeight: '500', color: C.textSecondary },
  scheduleTitle: { fontSize: 17.5, fontWeight: '700', color: C.black },
  scheduleNameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.white,
  },
  scheduleNameText: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  scheduleNameIcon: { width: 32, height: 32 },
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
