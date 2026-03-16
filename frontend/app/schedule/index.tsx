import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const C = {
  headerBg: '#436F9B',
  primary: '#436F9B',
  accent: '#6E8F8A',
  todoBg: '#E6EDF6',
  todoBorder: '#A8C0DD',
  weatherBg: '#EDF0F2',
  trainBg: '#EEF0F1',
  textPrimary: '#1F2528',
  textSecondary: '#63747E',
  textMuted: '#B5BFC5',
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
        <View style={styles.chatRow}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={22} color={C.white} />
          </View>
          <View style={styles.chatBubble}>
            <Text style={styles.chatText}>スケジュールを登録しよう！</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContent}>
          {/* Checklist */}
          <View style={styles.todoCard}>
            <View style={styles.todoHeader}>
              <MaterialCommunityIcons
                name="clipboard-text-outline"
                size={24.5}
                color={C.textPrimary}
              />
              <Text style={styles.todoHeaderText}>前日までに準備すること！</Text>
            </View>
            <View style={styles.todoBody}>
              <View style={styles.todoRow}>
                <Ionicons name="checkbox" size={22} color="#4CAF50" />
                <Text style={styles.todoCheckedText}>折りたたみ傘</Text>
              </View>
              <View style={styles.dashedDivider} />
              <View style={styles.todoRow}>
                <View style={styles.uncheckedBox} />
                <Text style={styles.todoText}>スーツ</Text>
              </View>
            </View>
          </View>

          {/* Weather + Train */}
          <View style={styles.infoRow}>
            <View style={styles.weatherCard}>
              <Ionicons name="cloud" size={23} color={C.textSecondary} />
              <Text style={styles.weatherTemp}>18℃ / 12℃</Text>
              <Text style={styles.weatherNote}>午後から雨</Text>
            </View>
            <View style={styles.trainCard}>
              <MaterialCommunityIcons name="chart-timeline-variant" size={28} color={C.textPrimary} />
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
              onPress={() => router.push('/schedule/create')}
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
  header: { backgroundColor: C.headerBg, paddingHorizontal: 14, paddingBottom: 24.5, gap: 12 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 14, fontWeight: '500', color: C.white },
  chatRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBubble: {
    flex: 1,
    backgroundColor: C.white,
    borderTopLeftRadius: 3.5,
    borderTopRightRadius: 10.5,
    borderBottomLeftRadius: 10.5,
    borderBottomRightRadius: 10.5,
    padding: 12,
  },
  chatText: { fontSize: 14, fontWeight: '400', lineHeight: 21, color: C.textPrimary },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  mainContent: {
    backgroundColor: C.white,
    borderTopLeftRadius: 10.5,
    borderTopRightRadius: 10.5,
    marginTop: -8,
    paddingHorizontal: 14,
    paddingTop: 17.5,
    paddingBottom: 17.5,
    gap: 17.5,
    minHeight: 600,
  },

  // Todo
  todoCard: { borderWidth: 2, borderColor: C.todoBorder, borderRadius: 14, overflow: 'hidden' },
  todoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.todoBg,
    borderBottomWidth: 2,
    borderBottomColor: C.todoBorder,
    paddingHorizontal: 17.5,
    paddingVertical: 12.25,
  },
  todoHeaderText: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  todoBody: { paddingHorizontal: 17.5, paddingVertical: 17.5, gap: 17.5 },
  todoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  todoCheckedText: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textPrimary,
    textDecorationLine: 'line-through',
    textDecorationColor: C.textMuted,
  },
  todoText: { fontSize: 14, fontWeight: '500', color: C.textPrimary },
  uncheckedBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.textMuted,
  },
  dashedDivider: {
    height: 0,
    borderBottomWidth: 1.5,
    borderBottomColor: C.todoBorder,
    borderStyle: 'dashed',
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
