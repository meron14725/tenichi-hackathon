import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import OwlChatBubble from '@/components/owl-chat-bubble';
import TodoCard from '@/components/todo-card';

const C = {
  headerBg: '#436F9B',
  primary: '#436F9B',
  accent: '#6E8F8A',
  weatherBg: '#EDF0F2',
  trainBg: '#EEF0F1',
  textPrimary: '#1F2528',
  textSecondary: '#63747E',
  black: '#000000',
  white: '#FFFFFF',
  warmText: '#AA8A5E',
};

export default function ScheduleIndexScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.white} />
          <Text style={styles.backText}>カレンダー</Text>
        </TouchableOpacity>
        <OwlChatBubble message="スケジュールを登録しよう！" />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContent}>
          <TodoCard todos={[]} />

          {/* Weather + Train */}
          <View style={styles.infoRow}>
            <View style={styles.weatherCard}>
              <Ionicons name="cloud" size={23} color={C.textSecondary} />
              <Text style={styles.weatherTemp}>18℃ / 12℃</Text>
              <Text style={styles.weatherNote}>午後から雨</Text>
            </View>
            <View style={styles.trainCard}>
              <MaterialCommunityIcons
                name="chart-timeline-variant"
                size={28}
                color={C.textPrimary}
              />
              <Text style={styles.trainTime}>スケジュール未定</Text>
            </View>
          </View>

          {/* Schedule title */}
          <Text style={styles.scheduleTitle}>3/6 (金)の予定</Text>

          {/* Routine card */}
          <View style={styles.routineCard}>
            <View style={styles.routineInner}>
              <MaterialCommunityIcons name="bike" size={20} color={C.accent} />
              <View style={styles.routineTextWrap}>
                <Text style={styles.routineTitle}>友達と一日遊ぶ日</Text>
                <Text style={styles.routineMemo}>お店の予約をする！</Text>
              </View>
            </View>
          </View>

          {/* CTA */}
          <View style={styles.ctaSection}>
            <Text style={styles.ctaText}>スケジュールを追加しよう！</Text>
            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => router.push('/schedule/unit/register')}
            >
              <Ionicons name="add" size={20} color={C.white} />
              <Text style={styles.registerButtonText}>スケジュール追加</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.headerBg },
  header: { backgroundColor: C.headerBg, paddingHorizontal: 14, paddingBottom: 60, gap: 12 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 14, fontWeight: '500', color: C.white },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  mainContent: {
    backgroundColor: C.white,
    paddingHorizontal: 14,
    paddingTop: 17.5,
    paddingBottom: 17.5,
    gap: 17.5,
    minHeight: 600,
    marginTop: -30,
  },

  // Info row
  infoRow: { flexDirection: 'row', gap: 17.5 },
  weatherCard: {
    flex: 1,
    backgroundColor: C.weatherBg,
    borderRadius: 7,
    paddingVertical: 7,
    paddingHorizontal: 12.25,
    alignItems: 'center',
    gap: 7,
  },
  weatherTemp: { fontSize: 12.25, fontWeight: '500', color: C.textPrimary },
  weatherNote: { fontSize: 12.25, fontWeight: '500', color: C.warmText },
  trainCard: {
    flex: 1,
    backgroundColor: C.trainBg,
    borderRadius: 7,
    paddingVertical: 7,
    paddingHorizontal: 12.25,
    alignItems: 'center',
    gap: 7,
  },
  trainTime: { fontSize: 12.25, fontWeight: '500', color: C.textPrimary },

  // Schedule
  scheduleTitle: { fontSize: 17.5, fontWeight: '700', color: C.black },

  // Routine
  routineCard: {
    borderWidth: 1,
    borderColor: C.accent,
    borderRadius: 7,
    borderLeftWidth: 6,
    borderLeftColor: C.accent,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  routineInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routineTextWrap: { flex: 1, gap: 4 },
  routineTitle: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  routineMemo: { fontSize: 12.25, fontWeight: '400', color: C.textSecondary },

  // CTA
  ctaSection: { alignItems: 'center', gap: 14, paddingVertical: 20 },
  ctaText: { fontSize: 14, fontWeight: '500', color: C.textSecondary },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: C.primary,
    borderRadius: 10000,
    paddingHorizontal: 40,
    paddingVertical: 14,
  },
  registerButtonText: { fontSize: 14, fontWeight: '700', color: C.white },
});
