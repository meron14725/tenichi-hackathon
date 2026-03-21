import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { tagApi, TagResponse } from '@/api/tagApi';
import { scheduleListApi, ScheduleListResponse } from '@/api/scheduleListApi';
import { scheduleApi } from '@/api/scheduleApi';
import { routeApi, TravelMode, RouteSearchResponse } from '@/api/routeApi';
import { userApi, UserSettingsResponse } from '@/api/userApi';
import { useAuth } from '@/contexts/AuthContext';

const C = {
  primary: '#436F9B',
  accent: '#6E8F8A',
  bg: '#EEF0F1',
  white: '#FFFFFF',
  textPrimary: '#1F2528',
  textSecondary: '#63747E',
  textMuted: '#B5BFC5',
  black: '#000000',
  border: '#EEF0F1',
  placeholder: '#98A6AE',
  danger: '#FF3B30',
};

function getCategoryIcon(name: string): string {
  if (name.includes('遊')) return 'run-fast';
  if (name.includes('食')) return 'hamburger';
  if (name.includes('仕事')) return 'account-group-outline';
  if (name.includes('帰')) return 'exit-run';
  return 'label-outline';
}

const TRAVEL_MODES: { value: TravelMode; label: string; icon: string }[] = [
  { value: 'transit', label: '電車', icon: 'train' },
  { value: 'driving', label: '車', icon: 'car' },
  { value: 'walking', label: '徒歩', icon: 'walk' },
  { value: 'cycling', label: '自転車', icon: 'bicycle' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

function TimePickerModal({
  visible,
  onSelect,
  onClose,
  initialHour,
  initialMinute,
}: {
  visible: boolean;
  onSelect: (hour: number, minute: number) => void;
  onClose: () => void;
  initialHour?: number;
  initialMinute?: number;
}) {
  const [hour, setHour] = useState<number>(initialHour ?? 8);
  const [minute, setMinute] = useState<number>(initialMinute ?? 0);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={timePickerStyles.backdrop} onPress={onClose}>
        <Pressable onPress={e => e.stopPropagation()} style={timePickerStyles.card}>
          <Text style={timePickerStyles.title}>到着時間を選択</Text>
          <View style={timePickerStyles.pickerRow}>
            {/* Hours */}
            <View style={timePickerStyles.column}>
              <Text style={timePickerStyles.columnLabel}>時</Text>
              <ScrollView
                style={timePickerStyles.scrollColumn}
                showsVerticalScrollIndicator={false}
              >
                {HOURS.map(h => (
                  <TouchableOpacity
                    key={h}
                    style={[timePickerStyles.cell, hour === h && timePickerStyles.cellSelected]}
                    onPress={() => setHour(h)}
                  >
                    <Text
                      style={[
                        timePickerStyles.cellText,
                        hour === h && timePickerStyles.cellTextSelected,
                      ]}
                    >
                      {String(h).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={timePickerStyles.separator}>:</Text>

            {/* Minutes */}
            <View style={timePickerStyles.column}>
              <Text style={timePickerStyles.columnLabel}>分</Text>
              <ScrollView
                style={timePickerStyles.scrollColumn}
                showsVerticalScrollIndicator={false}
              >
                {MINUTES.map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[timePickerStyles.cell, minute === m && timePickerStyles.cellSelected]}
                    onPress={() => setMinute(m)}
                  >
                    <Text
                      style={[
                        timePickerStyles.cellText,
                        minute === m && timePickerStyles.cellTextSelected,
                      ]}
                    >
                      {String(m).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={timePickerStyles.buttons}>
            <TouchableOpacity style={timePickerStyles.cancelButton} onPress={onClose}>
              <Text style={timePickerStyles.cancelText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={timePickerStyles.confirmButton}
              onPress={() => {
                onSelect(hour, minute);
                onClose();
              }}
            >
              <Text style={timePickerStyles.confirmText}>決定</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const timePickerStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 24,
    width: '100%',
    gap: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: C.textPrimary,
    textAlign: 'center',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  column: {
    alignItems: 'center',
    gap: 8,
  },
  columnLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: C.textSecondary,
  },
  scrollColumn: {
    height: 180,
    width: 70,
  },
  cell: {
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 7,
  },
  cellSelected: {
    backgroundColor: C.primary,
  },
  cellText: {
    fontSize: 16,
    fontWeight: '500',
    color: C.textPrimary,
  },
  cellTextSelected: {
    color: C.white,
    fontWeight: '700',
  },
  separator: {
    fontSize: 24,
    fontWeight: '700',
    color: C.textPrimary,
    marginTop: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 7,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textSecondary,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: C.primary,
    borderRadius: 7,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.white,
  },
});

interface Destination {
  lat: number;
  lon: number;
  name: string;
  address: string;
}

export default function ScheduleEditScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    schedule_id: string;
    schedule_list_id?: string;
    destination_lat?: string;
    destination_lon?: string;
    destination_name?: string;
    destination_address?: string;
    title?: string;
    memo?: string;
    selected_category_id?: string;
    travel_mode?: string;
    arrival_hour?: string;
    arrival_minute?: string;
    use_last_train?: string;
  }>();

  const scheduleId = Number(params.schedule_id);
  const scheduleListId = params.schedule_list_id ? Number(params.schedule_list_id) : null;
  const scheduleListRef = useRef<ScheduleListResponse | null>(null);

  const { isAuthenticated } = useAuth();

  const [title, setTitle] = useState<string>(params.title || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [tags, setTags] = useState<TagResponse[]>([]);
  const [arrivalTime, setArrivalTime] = useState<{ hour: number; minute: number } | null>(null);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
  const [useLastTrain, setUseLastTrain] = useState<boolean>(false);
  const [memo, setMemo] = useState<string>(params.memo || '');
  const [destination, setDestination] = useState<Destination | null>(null);
  const [travelMode, setTravelMode] = useState<TravelMode>('transit');
  const [routeData, setRouteData] = useState<RouteSearchResponse | null>(null);
  const [routeLoading, setRouteLoading] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [selectedItineraryIndex, setSelectedItineraryIndex] = useState<number | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettingsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const initialFetchDone = useRef(false);

  // 初回データロード
  useEffect(() => {
    if (!isAuthenticated || !scheduleId) return;

    async function fetchInitialData() {
      try {
        const schedule = await scheduleApi.getById(scheduleId);

        // パラメータで上書きされていない場合のみ、既存データを使用
        if (!params.title) setTitle(schedule.title);
        if (!params.memo) setMemo(schedule.memo || '');
        if (!params.selected_category_id)
          setSelectedCategoryId(schedule.tags.length > 0 ? schedule.tags[0].id : null);
        if (!params.travel_mode) setTravelMode((schedule.travel_mode as TravelMode) || 'transit');

        if (
          !params.destination_lat &&
          schedule.destination_lat != null &&
          schedule.destination_lon != null
        ) {
          setDestination({
            lat: schedule.destination_lat,
            lon: schedule.destination_lon,
            name: schedule.destination_name || '',
            address: schedule.destination_address || '',
          });
        }

        if (!params.arrival_hour && schedule.end_at) {
          const d = new Date(schedule.end_at);
          setArrivalTime({ hour: d.getHours(), minute: d.getMinutes() });
        }

        if (schedule.schedule_list_id) {
          const list = await scheduleListApi.getById(schedule.schedule_list_id);
          scheduleListRef.current = list;
        }

        // 保存済みルートがあれば表示
        const savedRoute = await scheduleApi.getRoute(scheduleId).catch(() => null);
        if (savedRoute) {
          setRouteData({ itineraries: [savedRoute.route_data] });
          setSelectedItineraryIndex(0);
        }
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
        Alert.alert('エラー', 'データの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    }

    if (initialFetchDone.current) return;
    fetchInitialData().then(() => {
      initialFetchDone.current = true;
    });
  }, [
    isAuthenticated,
    scheduleId,
    params.title,
    params.memo,
    params.selected_category_id,
    params.travel_mode,
    params.destination_lat,
    params.arrival_hour,
  ]);

  useEffect(() => {
    if (!isAuthenticated) return;
    async function fetchTags() {
      try {
        const fetchedTags = await tagApi.getTags();
        setTags(fetchedTags);
      } catch (error) {
        console.error('Failed to fetch tags:', error);
      }
    }
    fetchTags();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    async function fetchUserSettings() {
      try {
        const settings = await userApi.getSettings();
        setUserSettings(settings);
      } catch (error) {
        console.error('Failed to fetch user settings:', error);
      }
    }
    fetchUserSettings();
  }, [isAuthenticated]);

  // Handle returning from picker with high priority
  useEffect(() => {
    if (params.destination_lat && params.destination_lon && params.destination_name) {
      setDestination({
        lat: parseFloat(params.destination_lat),
        lon: parseFloat(params.destination_lon),
        name: params.destination_name,
        address: params.destination_address || params.destination_name,
      });
    }
  }, [
    params.destination_lat,
    params.destination_lon,
    params.destination_name,
    params.destination_address,
  ]);

  const isHomecoming = tags.find(t => t.id === selectedCategoryId)?.name === '帰宅';

  // Automatically set home as destination when "帰宅" is selected
  useEffect(() => {
    if (isHomecoming && userSettings && userSettings.home_lat && userSettings.home_lon) {
      setDestination({
        lat: userSettings.home_lat,
        lon: userSettings.home_lon,
        name: '自宅',
        address: userSettings.home_address,
      });
    }
  }, [isHomecoming, userSettings]);

  // Params updates
  useEffect(() => {
    if (params.title !== undefined) setTitle(params.title);
  }, [params.title]);
  useEffect(() => {
    if (params.memo !== undefined) setMemo(params.memo);
  }, [params.memo]);
  useEffect(() => {
    if (params.selected_category_id !== undefined)
      setSelectedCategoryId(Number(params.selected_category_id));
  }, [params.selected_category_id]);
  useEffect(() => {
    if (params.travel_mode !== undefined) setTravelMode(params.travel_mode as TravelMode);
  }, [params.travel_mode]);
  useEffect(() => {
    if (params.arrival_hour !== undefined && params.arrival_minute !== undefined) {
      setArrivalTime({
        hour: Number(params.arrival_hour),
        minute: Number(params.arrival_minute),
      });
    }
  }, [params.arrival_hour, params.arrival_minute]);
  useEffect(() => {
    if (params.use_last_train !== undefined) setUseLastTrain(params.use_last_train === 'true');
  }, [params.use_last_train]);

  const canUpdate = title.trim().length > 0;
  const isTransit = travelMode === 'transit';
  const isLastTrainEnabled = isHomecoming && isTransit;

  useEffect(() => {
    if (!isLastTrainEnabled && useLastTrain) {
      setUseLastTrain(false);
    }
  }, [isLastTrainEnabled, useLastTrain]);

  function formatTime(time: { hour: number; minute: number } | null): string {
    if (!time) return '-- : --';
    return `${String(time.hour).padStart(2, '0')} : ${String(time.minute).padStart(2, '0')}`;
  }

  const getOrigin = React.useCallback(async (): Promise<{
    lat: number;
    lon: number;
    name?: string;
  }> => {
    const list = scheduleListRef.current;

    if (!list) {
      throw new Error(`[エラー] scheduleListRefが空です。`);
    }

    if ((arrivalTime || useLastTrain) && list.schedules.length > 0) {
      const now = new Date();
      let refDate: Date;

      if (useLastTrain) {
        refDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 1, 0);
      } else {
        refDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          arrivalTime!.hour,
          arrivalTime!.minute
        );
      }

      // 自分自身を除外して計算する必要がある
      const earlierSchedules = list.schedules
        .filter(s => s.id !== scheduleId && s.end_at && new Date(s.end_at) < refDate)
        .sort((a, b) => new Date(b.end_at!).getTime() - new Date(a.end_at!).getTime());

      if (earlierSchedules.length > 0) {
        try {
          const prevSchedule = await scheduleApi.getById(earlierSchedules[0].id);
          if (prevSchedule.destination_lat != null && prevSchedule.destination_lon != null) {
            return {
              lat: Number(prevSchedule.destination_lat),
              lon: Number(prevSchedule.destination_lon),
              name: prevSchedule.destination_name || '前の予定',
            };
          }
        } catch (error: any) {
          console.error('Failed to fetch previous schedule details:', error);
        }
      }
    }

    if (list.departure_lat != null && list.departure_lng != null) {
      return {
        lat: list.departure_lat,
        lon: list.departure_lng,
        name: list.departure_name || '出発地',
      };
    }

    throw new Error('出発地を特定できませんでした。');
  }, [arrivalTime, useLastTrain, scheduleId]);

  const handleSearchRoutes = React.useCallback(async () => {
    if (!destination || (!arrivalTime && !useLastTrain)) return;

    setRouteLoading(true);
    setRouteError(null);
    setRouteData(null);
    setSelectedItineraryIndex(null);

    let origin: { lat: number; lon: number; name?: string };
    try {
      origin = await getOrigin();
    } catch (e: any) {
      setRouteLoading(false);
      setRouteError(`出発地特定エラー: ${e.message}`);
      return;
    }

    const now = new Date();
    let arrivalDate: Date;

    if (useLastTrain) {
      arrivalDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 1, 0);
    } else {
      arrivalDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        arrivalTime!.hour,
        arrivalTime!.minute
      );
    }

    try {
      const searchParams = {
        origin_lat: origin!.lat,
        origin_lon: origin!.lon,
        destination_lat: destination!.lat,
        destination_lon: destination!.lon,
        travel_mode: travelMode,
        arrival_time: arrivalDate.toISOString(),
      };

      const result = await routeApi.search(searchParams);

      if (origin.name || destination?.name) {
        result.itineraries.forEach(itinerary => {
          if (itinerary.legs && itinerary.legs.length > 0) {
            if (origin.name) itinerary.legs[0].from_name = origin.name;
            if (destination?.name)
              itinerary.legs[itinerary.legs.length - 1].to_name = destination.name;
          }
        });
      }

      setRouteData(result);
    } catch (e: any) {
      console.error(e);
      setRouteError(`ルート取得エラー: ${e.message}`);
    } finally {
      setRouteLoading(false);
    }
  }, [destination, arrivalTime, useLastTrain, travelMode, getOrigin]);

  useEffect(() => {
    if (useLastTrain && destination) {
      handleSearchRoutes();
    }
  }, [useLastTrain, destination, handleSearchRoutes]);

  async function handleUpdate() {
    if (!scheduleId || !title.trim()) return;

    let start_at = new Date().toISOString();
    let end_at = new Date().toISOString();

    if (arrivalTime) {
      const now = new Date();
      const arrivalDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        arrivalTime.hour,
        arrivalTime.minute
      );
      end_at = arrivalDate.toISOString();
      start_at = end_at;
    }

    if (
      routeData &&
      selectedItineraryIndex !== null &&
      routeData.itineraries[selectedItineraryIndex]
    ) {
      const route = routeData.itineraries[selectedItineraryIndex];
      start_at = route.departure_time;
      end_at = route.arrival_time;
    }

    try {
      await scheduleApi.update(scheduleId, {
        title: title.trim(),
        start_at,
        end_at,
        destination_name: destination?.name ?? null,
        destination_address: destination?.address ?? destination?.name ?? null,
        destination_lat: destination?.lat ?? null,
        destination_lon: destination?.lon ?? null,
        travel_mode: travelMode,
        memo: memo.trim() || null,
        tag_ids: selectedCategoryId ? [selectedCategoryId] : [],
      });

      if (
        routeData &&
        selectedItineraryIndex !== null &&
        routeData.itineraries[selectedItineraryIndex]
      ) {
        const route = routeData.itineraries[selectedItineraryIndex];
        await scheduleApi.saveRoute(scheduleId, {
          route_data: route,
          departure_time: route.departure_time,
          arrival_time: route.arrival_time,
          duration_minutes: route.duration_minutes,
        });
      }

      router.back();
    } catch (error: any) {
      console.error('Failed to update schedule:', error);
      Alert.alert('エラー', '予定の更新に失敗しました');
    }
  }

  async function handleDelete() {
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
            console.error('Failed to delete schedule:', error);
            Alert.alert('エラー', '予定の削除に失敗しました');
          }
        },
      },
    ]);
  }

  function formatRouteTime(isoString: string): string {
    const d = new Date(isoString);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}分`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}時間${m}分` : `${h}時間`;
  }

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>スケジュール編集</Text>
        <TouchableOpacity onPress={canUpdate ? handleUpdate : undefined}>
          <Text style={[styles.addText, !canUpdate && { opacity: 0.3 }]}>保存</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>タイトル</Text>
          <View style={styles.inputCard}>
            <TextInput
              style={styles.textInput}
              placeholder="例：打ち合わせ"
              value={title}
              onChangeText={setTitle}
            />
          </View>
        </View>

        {/* Tags */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>カテゴリー</Text>
          <View style={styles.categoryRow}>
            {tags.map(tag => {
              const isSelected = selectedCategoryId === tag.id;
              const icon = getCategoryIcon(tag.name);
              return (
                <TouchableOpacity
                  key={tag.id}
                  style={[styles.categoryPill, isSelected && styles.categoryPillSelected]}
                  onPress={() => setSelectedCategoryId(tag.id)}
                >
                  <MaterialCommunityIcons
                    name={icon as any}
                    size={20}
                    color={isSelected ? C.white : C.textSecondary}
                  />
                  <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                    {tag.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Destination */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>目的地</Text>
          <TouchableOpacity
            style={styles.formButton}
            onPress={() => {
              router.push({
                pathname: '/schedule/unit/destination-picker',
                params: {
                  initial_lat: destination?.lat.toString(),
                  initial_lng: destination?.lon.toString(),
                  initial_name: destination?.name,
                  initial_address: destination?.address,
                  title,
                  memo,
                  selected_category_id: selectedCategoryId?.toString(),
                  travel_mode: travelMode,
                  arrival_hour: arrivalTime?.hour.toString(),
                  arrival_minute: arrivalTime?.minute.toString(),
                  use_last_train: useLastTrain.toString(),
                  schedule_id: scheduleId.toString(),
                  ...(scheduleListId ? { schedule_list_id: scheduleListId.toString() } : {}),
                },
              });
            }}
          >
            <Ionicons name="location-outline" size={20} color={C.textSecondary} />
            <Text style={destination ? styles.formButtonValue : styles.formButtonPlaceholder}>
              {destination ? destination.name : '目的地を選択'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Travel Mode */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>移動手段</Text>
          <View style={styles.travelModeRow}>
            {TRAVEL_MODES.map(mode => {
              const isActive = travelMode === mode.value;
              return (
                <TouchableOpacity
                  key={mode.value}
                  style={[styles.travelModePill, isActive && styles.travelModePillActive]}
                  onPress={() => setTravelMode(mode.value)}
                >
                  <MaterialCommunityIcons
                    name={mode.icon as any}
                    size={18}
                    color={isActive ? C.white : C.textSecondary}
                  />
                  <Text style={[styles.travelModeText, isActive && styles.travelModeTextActive]}>
                    {mode.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Arrival Time */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>到着時間</Text>
          <View style={styles.arrivalRow}>
            <TouchableOpacity
              style={[styles.timeSelect, useLastTrain && styles.timeSelectDisabled]}
              onPress={() => {
                if (!useLastTrain) setShowTimePicker(true);
              }}
            >
              <Ionicons name="time-outline" size={20} color={C.textSecondary} />
              <Text style={styles.timeText}>{formatTime(arrivalTime)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.checkboxRow, !isLastTrainEnabled && { opacity: 0.5 }]}
              onPress={() => {
                if (isLastTrainEnabled) {
                  const nextVal = !useLastTrain;
                  setUseLastTrain(nextVal);
                  if (nextVal) setArrivalTime(null);
                }
              }}
            >
              <Ionicons
                name={useLastTrain ? 'checkbox' : 'square-outline'}
                size={24}
                color={C.primary}
              />
              <Text style={styles.checkboxLabel}>終電で帰る</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Routes */}
        {destination && (arrivalTime || useLastTrain) && (
          <View style={styles.section}>
            <View style={styles.routeHeaderRow}>
              <Text style={styles.sectionLabel}>ルート候補</Text>
              <TouchableOpacity style={styles.searchRouteButton} onPress={handleSearchRoutes}>
                <Text style={styles.searchRouteButtonText}>ルートを検索</Text>
              </TouchableOpacity>
            </View>

            {routeLoading && <ActivityIndicator color={C.primary} style={{ marginTop: 20 }} />}
            {routeError && <Text style={styles.errorText}>{routeError}</Text>}

            {routeData &&
              routeData.itineraries.map((itinerary, index) => {
                const isSelected = selectedItineraryIndex === index;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.itineraryCard, isSelected && styles.itineraryCardSelected]}
                    onPress={() => setSelectedItineraryIndex(index)}
                  >
                    <View style={styles.itineraryTimeRange}>
                      <Text style={styles.itineraryTime}>
                        {formatRouteTime(itinerary.departure_time)}
                      </Text>
                      <Text style={styles.itinerarySeparator}>→</Text>
                      <Text style={styles.itineraryTime}>
                        {formatRouteTime(itinerary.arrival_time)}
                      </Text>
                    </View>
                    <Text style={styles.itineraryDuration}>
                      {formatDuration(itinerary.duration_minutes)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
          </View>
        )}

        {/* Memo */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>メモ</Text>
          <View style={styles.inputCard}>
            <TextInput
              style={[styles.textInput, { height: 100, textAlignVertical: 'top' }]}
              placeholder="メモを入力..."
              multiline
              value={memo}
              onChangeText={setMemo}
            />
          </View>
        </View>

        {/* Delete */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color={C.danger} />
          <Text style={styles.deleteButtonText}>予定を削除</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <TimePickerModal
        visible={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        onSelect={(h, m) => setArrivalTime({ hour: h, minute: m })}
        initialHour={arrivalTime?.hour}
        initialMinute={arrivalTime?.minute}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  addText: { fontSize: 16, fontWeight: '700', color: C.primary },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, gap: 24 },
  section: { gap: 12 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: C.textSecondary },
  inputCard: {
    backgroundColor: C.white,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textInput: { fontSize: 16, color: C.textPrimary },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
  },
  categoryPillSelected: { backgroundColor: C.primary, borderColor: C.primary },
  categoryText: { fontSize: 14, color: C.textSecondary },
  categoryTextSelected: { color: C.white, fontWeight: '700' },
  formButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.white,
    borderRadius: 8,
    padding: 16,
  },
  formButtonValue: { fontSize: 16, color: C.textPrimary },
  formButtonPlaceholder: { fontSize: 16, color: C.placeholder },
  travelModeRow: { flexDirection: 'row', gap: 8 },
  travelModePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: C.white,
  },
  travelModePillActive: { backgroundColor: C.primary },
  travelModeText: { fontSize: 13, color: C.textSecondary },
  travelModeTextActive: { color: C.white, fontWeight: '700' },
  arrivalRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  timeSelect: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.white,
    borderRadius: 8,
    padding: 16,
  },
  timeSelectDisabled: { opacity: 0.5 },
  timeText: { fontSize: 16, color: C.textPrimary },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkboxLabel: { fontSize: 14, color: C.textSecondary },
  routeHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  searchRouteButton: {
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
  },
  searchRouteButtonText: { color: C.white, fontSize: 12, fontWeight: '700' },
  itineraryCard: {
    backgroundColor: C.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itineraryCardSelected: { borderColor: C.primary, borderWidth: 2 },
  itineraryTimeRange: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itineraryTime: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  itinerarySeparator: { color: C.textMuted },
  itineraryDuration: { color: C.textSecondary },
  errorText: { color: C.danger, marginTop: 8 },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 16,
  },
  deleteButtonText: { color: C.danger, fontSize: 16, fontWeight: '700' },
});
