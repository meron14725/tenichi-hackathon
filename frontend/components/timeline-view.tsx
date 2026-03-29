import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AppColors as C } from '@/constants/app-colors';
import { TimelineItem } from '@/lib/types/timeline';

interface TimelineViewProps {
  items: TimelineItem[];
  extraIdForEdit?: number; // schedule_list_id
  onPressItem?: (item: TimelineItem) => void;
  transparentCards?: boolean;
}

export default function TimelineView({
  items,
  extraIdForEdit,
  onPressItem,
  transparentCards,
}: TimelineViewProps) {
  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Image
          source={require('@/assets/images/owl2.svg')}
          style={styles.emptyOwl}
          contentFit="contain"
        />
        <Text style={styles.emptyText}>どんな1日を過ごす？</Text>
      </View>
    );
  }

  return (
    <View style={styles.timeline}>
      {items.map((item, index) =>
        renderTimelineEntry(item, index, items, extraIdForEdit, onPressItem, transparentCards)
      )}
    </View>
  );
}

function renderTimelineEntry(
  item: TimelineItem,
  index: number,
  array: TimelineItem[],
  extraIdForEdit?: number,
  onPressItem?: (item: TimelineItem) => void,
  transparentCards?: boolean
) {
  const isLast = index === array.length - 1;
  const textColor = item.past ? C.textMuted : C.black;

  return (
    <View key={`${item.time}-${item.title}-${index}`} style={styles.timelineRow}>
      <View style={styles.timeColumn}>
        <Text style={[styles.timeText, { color: textColor }]}>{item.time}</Text>
        <View
          style={[styles.timelineDot, { backgroundColor: item.past ? C.textMuted : C.headerBg }]}
        />
        {!isLast && <View style={[styles.timelineLine, { borderColor: C.textMuted }]} />}
      </View>

      <View style={styles.timelineContent}>
        {item.hasChevron ? (
          (() => {
            const isClickable = !!onPressItem;
            const CardContainer = isClickable ? (TouchableOpacity as any) : View;
            return (
              <CardContainer
                style={[
                  styles.eventCard,
                  { opacity: item.past ? 0.6 : 1 },
                  transparentCards && { backgroundColor: 'transparent' },
                ]}
                onPress={isClickable ? () => onPressItem!(item) : undefined}
              >
                <View
                  style={[
                    styles.eventIcon,
                    { backgroundColor: item.past ? C.weatherBg : item.iconBg },
                  ]}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={item.past ? C.textMuted : C.textSecondary}
                  />
                </View>
                <View style={styles.eventDetails}>
                  <Text style={[styles.eventTitle, { color: textColor }]}>{item.title}</Text>
                  {item.subtitle ? (
                    <Text style={[styles.eventSubtitle, { color: textColor }]}>
                      {item.subtitle}
                    </Text>
                  ) : null}
                  {item.weather && (
                    <View style={styles.eventWeatherInline}>
                      <Text style={[styles.weatherTempText, { color: textColor }]}>
                        {item.weather.max_temp_c}° / {item.weather.min_temp_c}°
                      </Text>
                      <Text style={styles.weatherDivider}> | </Text>
                      <Text
                        style={[
                          styles.weatherRainText,
                          { color: item.past ? C.textMuted : C.headerBg },
                        ]}
                      >
                        降水確率 {item.weather.chance_of_rain}%
                      </Text>
                    </View>
                  )}
                </View>
                {isClickable && <Ionicons name="chevron-forward" size={18} color={C.textMuted} />}
              </CardContainer>
            );
          })()
        ) : (
          <View style={[styles.stationRow, { opacity: item.past ? 0.6 : 1 }]}>
            <View style={{ flex: 1 }}>
              <View style={styles.stationTextContainer}>
                {item.iconName && (
                  <MaterialCommunityIcons
                    name={item.iconName}
                    size={16}
                    color={item.past ? C.textMuted : C.textSecondary}
                    style={styles.stationIcon}
                  />
                )}
                <Text style={[styles.stationName, { color: textColor }]}>{item.title}</Text>
                {item.lineName && (
                  <View
                    style={[
                      styles.lineNameBadge,
                      { backgroundColor: item.past ? C.textMuted : item.lineColor },
                    ]}
                  >
                    <Text style={styles.lineNameText}>{item.lineName}</Text>
                  </View>
                )}
                {item.walk && (
                  <View style={styles.walkRow}>
                    <Text style={styles.walkText}>{item.walk}</Text>
                  </View>
                )}
              </View>
              {item.weather && (
                <View style={styles.weatherTextRow}>
                  <Text style={styles.weatherSmallText}>
                    {item.weather.max_temp_c}° / {item.weather.min_temp_c}°
                  </Text>
                  <Text style={styles.weatherSmallText}>
                    {' '}
                    降水確率 {item.weather.chance_of_rain}%
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyOwl: {
    width: 120,
    height: 189.17,
    marginBottom: 12.25,
  },
  emptyText: {
    color: C.textPrimary,
    fontSize: 15.75,
    fontWeight: '500',
  },
  timeline: {},
  timelineRow: { flexDirection: 'row', minHeight: 56 },
  timeColumn: { width: 70, alignItems: 'center', position: 'relative' },
  timeText: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  timelineDot: { width: 10, height: 10, borderRadius: 5 },
  timelineLine: {
    position: 'absolute',
    top: 36,
    bottom: 0,
    width: 0,
    borderLeftWidth: 1.5,
    borderStyle: 'dashed',
  },
  timelineContent: { flex: 1, paddingBottom: 14, paddingLeft: 8 },
  stationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  stationTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    flexWrap: 'wrap',
  },
  stationIcon: { width: 20, textAlign: 'center' },
  stationName: { fontSize: 14, fontWeight: '700', color: C.textPrimary, letterSpacing: -0.5 },
  eventWeatherInline: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  weatherTextRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, paddingLeft: 28 },
  weatherTempText: { fontSize: 11, fontWeight: '700', color: C.textPrimary },
  weatherDivider: { fontSize: 11, color: C.textMuted },
  weatherRainText: { fontSize: 11, color: C.headerBg, fontWeight: '600' },
  weatherSmallText: { fontSize: 10, color: C.textSecondary, fontWeight: '500', marginRight: 8 },
  lineNameBadge: { borderRadius: 5.25, paddingHorizontal: 8, paddingVertical: 2 },
  lineNameText: { fontSize: 12.25, fontWeight: '500', color: C.white },
  walkRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  walkText: { fontSize: 12.25, fontWeight: '400', color: C.textSecondary },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.white,
    borderRadius: 8,
    paddingVertical: 4,
  },
  eventIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDetails: { flex: 1 },
  eventTitle: { fontSize: 14, fontWeight: '500', color: C.textPrimary },
  eventSubtitle: { fontSize: 12.25, fontWeight: '400', color: C.textSecondary },
});
