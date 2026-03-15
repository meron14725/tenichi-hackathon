import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const C = {
  primary: '#436F9B',
  workAccent: '#6E8F8A',
  holidayAccent: '#A86A78',
  textPrimary: '#1F2528',
  textSecondary: '#63747E',
  textMuted: '#B5BFC5',
  black: '#000000',
  white: '#FFFFFF',
  border: '#EEF0F1',
  searchBg: '#EEF0F1',
  searchPlaceholder: '#98A6AE',
  stepConnector: '#C2A070',
};

type Routine = {
  id: string;
  title: string;
  accentColor: string;
  steps: string[];
};

const FREQUENT_ROUTINES: Routine[] = [
  {
    id: 'f1',
    title: '仕事ルーティン①',
    accentColor: C.workAccent,
    steps: ['荻窪発', '渋谷着', 'MTG'],
  },
  {
    id: 'f2',
    title: '仕事ルーティン②',
    accentColor: C.workAccent,
    steps: ['荻窪発', '渋谷着', 'MTG'],
  },
  { id: 'f3', title: '休日①', accentColor: C.holidayAccent, steps: ['荻窪発', '渋谷着', 'MTG'] },
];

const RECENT_ROUTINES: Routine[] = [
  {
    id: 'r1',
    title: '仕事ルーティン①',
    accentColor: C.workAccent,
    steps: ['荻窪発', '渋谷着', 'MTG'],
  },
  {
    id: 'r2',
    title: '仕事ルーティン②',
    accentColor: C.workAccent,
    steps: ['荻窪発', '渋谷着', 'MTG'],
  },
  { id: 'r3', title: '休日①', accentColor: C.holidayAccent, steps: ['荻窪発', '渋谷着', 'MTG'] },
];

function RoutineCard({ routine }: { routine: Routine }) {
  return (
    <TouchableOpacity style={[styles.card, { borderColor: C.border }]} activeOpacity={0.7}>
      <View style={[styles.cardInner, { borderLeftColor: routine.accentColor }]}>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{routine.title}</Text>
          <View style={styles.stepsRow}>
            {routine.steps.map((step, i) => (
              <View key={`${routine.id}-${i}`} style={styles.stepItem}>
                <View style={styles.stepDotRow}>
                  <View style={[styles.stepDot, { backgroundColor: routine.accentColor }]} />
                  {i < routine.steps.length - 1 && (
                    <View style={[styles.stepLine, { backgroundColor: C.stepConnector }]} />
                  )}
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={21} color={C.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

function Section({ title, routines }: { title: string; routines: Routine[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {routines.map(r => (
        <RoutineCard key={r.id} routine={r} />
      ))}
    </View>
  );
}

export default function RoutineScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Header with search */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={C.searchPlaceholder} />
          <TextInput
            style={styles.searchInput}
            placeholder="ルーティンを検索"
            placeholderTextColor={C.searchPlaceholder}
            editable={false}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Section title="よく使うルーティン" routines={FREQUENT_ROUTINES} />
        <Section title="最近のルーティン" routines={RECENT_ROUTINES} />
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
    minHeight: 70,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.searchBg,
    borderRadius: 7,
    paddingHorizontal: 12.25,
    gap: 7,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: C.textPrimary,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingTop: 17.5,
    paddingBottom: 100,
    gap: 24.5,
  },

  // Section
  section: {
    gap: 17.5,
  },
  sectionTitle: {
    fontSize: 17.5,
    fontWeight: '700',
    color: C.black,
  },

  // Card
  card: {
    borderWidth: 1,
    borderRadius: 7,
    overflow: 'hidden',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 6,
    borderRadius: 7,
    paddingVertical: 12.25,
    paddingHorizontal: 17.5,
    gap: 8,
  },
  cardContent: {
    flex: 1,
    gap: 12.25,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textPrimary,
  },

  // Steps
  stepsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stepItem: {
    alignItems: 'center',
    gap: 7,
  },
  stepDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 12.25,
    height: 12.25,
    borderRadius: 6.125,
  },
  stepLine: {
    width: 68,
    height: 2,
  },
  stepText: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textSecondary,
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
