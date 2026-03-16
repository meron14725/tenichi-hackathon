import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const C = {
  primary: '#436F9B',
  accent: '#6E8F8A',
  textPrimary: '#1F2528',
  textSecondary: '#63747E',
  textMuted: '#B5BFC5',
  white: '#FFFFFF',
  border: '#EEF0F1',
  black: '#000000',
};

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

// Mock events: day -> label
const EVENTS: Record<number, string> = {
  3: '仕事の日',
  10: '休日',
  17: '仕事の日',
  25: '出張',
};

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: { day: number; currentMonth: boolean }[] = [];

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ day: daysInPrevMonth - i, currentMonth: false });
  }

  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ day: i, currentMonth: true });
  }

  // Next month leading days (fill to 6 rows)
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, currentMonth: false });
  }

  return days;
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState(3);
  const year = 2025;
  const month = 2; // March (0-indexed)

  const days = getCalendarDays(year, month);
  const weeks: (typeof days)[] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.monthSelector}>
          <Text style={styles.monthText}>3月</Text>
          <Ionicons name="caret-down" size={12} color={C.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
              const isSelected = item.currentMonth && item.day === selectedDay;
              const event = item.currentMonth ? EVENTS[item.day] : undefined;

              return (
                <TouchableOpacity
                  key={`${wi}-${di}`}
                  style={styles.dayCell}
                  onPress={() => {
                    if (item.currentMonth) {
                      setSelectedDay(item.day);
                      router.push('/schedule');
                    }
                  }}
                  activeOpacity={item.currentMonth ? 0.6 : 1}
                >
                  {isSelected ? (
                    <View style={styles.selectedCircle}>
                      <Text style={styles.selectedDayText}>{item.day}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.dayText, !item.currentMonth && styles.dayTextMuted]}>
                      {item.day}
                    </Text>
                  )}
                  {event && (
                    <View style={styles.eventBadge}>
                      <Text style={styles.eventBadgeText}>{event}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { bottom: 100 + insets.bottom }]}>
        <Ionicons name="add" size={28} color={C.white} />
      </TouchableOpacity>
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
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    justifyContent: 'center',
    minHeight: 56,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
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
    gap: 3.5,
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
    gap: 3.5,
    marginTop: 12.25,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    gap: 3.5,
    paddingVertical: 3.5,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textPrimary,
    textAlign: 'center',
    width: 24.5,
    lineHeight: 24.5,
  },
  dayTextMuted: {
    color: C.textMuted,
  },
  selectedCircle: {
    width: 24.5,
    height: 24.5,
    borderRadius: 12.25,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDayText: {
    fontSize: 14,
    fontWeight: '500',
    color: C.white,
    textAlign: 'center',
  },

  // Event badge
  eventBadge: {
    backgroundColor: C.accent,
    borderRadius: 5.25,
    paddingHorizontal: 4,
    paddingVertical: 1.875,
    alignSelf: 'center',
  },
  eventBadgeText: {
    fontSize: 10.5,
    fontWeight: '500',
    color: C.white,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 5,
  },
});
