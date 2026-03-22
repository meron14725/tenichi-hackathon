import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { scheduleListApi, ScheduleListResponse } from '@/api/scheduleListApi';

const C = {
  primary: '#436F9B',
  accent: '#6E8F8A',
  textPrimary: '#1F2528',
  textSecondary: '#63747E',
  textMuted: '#B5BFC5',
  white: '#FFFFFF',
  border: '#EEF0F1',
  black: '#000000',
  // Registration Screen Colors
  holiday: '#D1AEB6',
  travel: '#D6C093',
  work: '#C1D3D0',
  business: '#9284C2',
};

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

type CategoryUI =
  | { color: string; icon: React.ComponentProps<typeof Ionicons>['name']; iconSet: 'ionicons' }
  | { color: string; icon: React.ComponentProps<typeof FontAwesome5>['name']; iconSet: 'fa5' }
  | { color: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; iconSet: 'mci' };

const CATEGORY_UI_MAP: Record<string, CategoryUI> = {
  休日: { color: C.holiday, icon: 'bicycle', iconSet: 'ionicons' },
  旅行: { color: C.travel, icon: 'suitcase-rolling', iconSet: 'fa5' },
  仕事: { color: C.work, icon: 'briefcase-outline', iconSet: 'mci' },
  出張: { color: C.business, icon: 'briefcase', iconSet: 'fa5' },
};

function getCategoryUI(name?: string): CategoryUI {
  const defaultUI: CategoryUI = { color: C.accent, icon: 'bookmark-outline', iconSet: 'ionicons' };
  if (!name) return defaultUI;
  return CATEGORY_UI_MAP[name] || defaultUI;
}

function renderCategoryIcon(iconInfo: CategoryUI, color: string, size: number = 10) {
  if (iconInfo.iconSet === 'ionicons') {
    return <Ionicons name={iconInfo.icon} size={size} color={color} />;
  }
  if (iconInfo.iconSet === 'fa5') {
    return <FontAwesome5 name={iconInfo.icon} size={size} color={color} />;
  }
  return <MaterialCommunityIcons name={iconInfo.icon} size={size} color={color} />;
}

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: { day: number; currentMonth: boolean; date: Date }[] = [];

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({
      day: daysInPrevMonth - i,
      currentMonth: false,
      date: new Date(year, month, -i),
    });
  }

  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      day: i,
      currentMonth: true,
      date: new Date(year, month, i),
    });
  }

  // Next month leading days (fill to 6 rows)
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({
      day: i,
      currentMonth: false,
      date: new Date(year, month + 1, i),
    });
  }

  return days;
}

function formatLocalDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Record<string, ScheduleListResponse>>({});
  const [loading, setLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const start = formatLocalDate(new Date(year, month, 1));
      const end = formatLocalDate(new Date(year, month + 1, 0));
      const data = await scheduleListApi.list({ start_date: start, end_date: end });

      const mapped: Record<string, ScheduleListResponse> = {};
      data.forEach(item => {
        // API returns YYYY-MM-DD
        mapped[item.date] = item;
      });
      setEvents(mapped);
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const days = getCalendarDays(year, month);
  const weeks: (typeof days)[] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color={C.textPrimary} />
          </TouchableOpacity>
          <View style={styles.monthLabel}>
            <Text style={styles.monthText}>
              {year}年 {month + 1}月
            </Text>
          </View>
          <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={24} color={C.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <ActivityIndicator size="small" color={C.primary} style={{ marginBottom: 10 }} />
        )}

        {/* Weekday headers */}
        <View style={styles.weekdayRow}>
          {WEEKDAYS.map(d => (
            <View key={d} style={styles.weekdayCell}>
              <Text style={styles.weekdayText}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((item, di) => {
              const dateStr = formatLocalDate(item.date);
              const event = events[dateStr];
              const isToday = formatLocalDate(new Date()) === dateStr;

              return (
                <TouchableOpacity
                  key={`${wi}-${di}`}
                  style={styles.dayCell}
                  onPress={() => {
                    if (event) {
                      router.push({
                        pathname: '/schedule/list',
                        params: { id: event.id },
                      });
                    } else if (item.currentMonth) {
                      // 新規登録へ
                      router.push({
                        pathname: '/schedule/list/register',
                        params: { date: dateStr },
                      });
                    }
                  }}
                  activeOpacity={item.currentMonth ? 0.6 : 1}
                >
                  <View style={[styles.dayNumberContainer, isToday && styles.todayCircle]}>
                    <Text
                      style={[
                        styles.dayText,
                        !item.currentMonth && styles.dayTextMuted,
                        isToday && styles.todayText,
                      ]}
                    >
                      {item.day}
                    </Text>
                  </View>
                  {event &&
                    (() => {
                      const ui = getCategoryUI(event.category?.name);
                      return (
                        <View style={[styles.eventBadge, { backgroundColor: ui.color }]}>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 2,
                            }}
                          >
                            {renderCategoryIcon(ui, C.white, 8)}
                            <Text style={styles.eventBadgeText}>{event.name}</Text>
                          </View>
                        </View>
                      );
                    })()}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.white,
  },

  // Header
  header: {
    backgroundColor: C.white,
    paddingHorizontal: 12.25,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    justifyContent: 'center',
    minHeight: 56,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    padding: 8,
  },
  monthLabel: {
    flex: 1,
    alignItems: 'center',
  },
  monthText: {
    fontSize: 17.5,
    fontWeight: '700',
    color: C.black,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 17.5,
    paddingBottom: 100,
  },

  // Weekday header
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 12.25,
    fontWeight: '500',
    color: C.textSecondary,
    textAlign: 'center',
  },

  // Calendar grid
  weekRow: {
    flexDirection: 'row',
    marginTop: 12.25,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    minHeight: 60,
  },
  dayNumberContainer: {
    width: 24.5,
    height: 24.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textPrimary,
    textAlign: 'center',
  },
  dayTextMuted: {
    color: C.textMuted,
  },
  todayCircle: {
    borderRadius: 12.25,
    backgroundColor: C.primary,
  },
  todayText: {
    color: C.white,
    fontWeight: '700',
  },

  // Event badge
  eventBadge: {
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    width: '90%',
    alignSelf: 'center',
  },
  eventBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: C.white,
    textAlign: 'center',
  },
});
