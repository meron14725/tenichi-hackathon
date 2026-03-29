import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
const tabTodaySolid = require('@/assets/images/tab-today-solid.svg');
const tabTodayOutline = require('@/assets/images/tab-today-outline.svg');
const tabCalendarSolid = require('@/assets/images/tab-calendar-solid.svg');
const tabCalendarOutline = require('@/assets/images/tab-calendar-outline.svg');
const tabRoutine = require('@/assets/images/tab-routine.svg');
const tabMypage = require('@/assets/images/tab-mypage.svg');

const C = {
  primary: '#436F9B',
  inactive: '#63747E',
  bg: '#FFFFFF',
  border: '#EEF0F1',
};

export default function GlobalFooter() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  // 特定の画面（例：認証画面など）ではフッターを非表示にする場合はここで制御
  const hideFooterPaths = ['/auth'];
  if (hideFooterPaths.some(p => pathname.startsWith(p))) {
    return null;
  }

  const tabs = [
    {
      id: 'index',
      label: '本日の予定',
      icon: (focused: boolean) => (
        <Image
          source={focused ? tabTodaySolid : tabTodayOutline}
          style={{ width: 24, height: 24, tintColor: focused ? C.primary : C.inactive }}
          contentFit="contain"
        />
      ),
      path: '/(tabs)',
    },
    {
      id: 'calendar',
      label: 'カレンダー',
      icon: (focused: boolean) => (
        <Image
          source={focused ? tabCalendarSolid : tabCalendarOutline}
          style={{ width: 24, height: 24, tintColor: focused ? C.primary : C.inactive }}
          contentFit="contain"
        />
      ),
      path: '/calendar',
    },
    {
      id: 'routine',
      label: 'ルーティン',
      icon: (focused: boolean) => (
        <Image
          source={tabRoutine}
          style={{ width: 24, height: 24, tintColor: focused ? C.primary : undefined }}
          contentFit="contain"
        />
      ),
      path: '/routine',
    },
    {
      id: 'mypage',
      label: 'マイページ',
      icon: (focused: boolean) => (
        <Image
          source={tabMypage}
          style={{ width: 24, height: 24, tintColor: focused ? C.primary : undefined }}
          contentFit="contain"
        />
      ),
      path: '/mypage',
    },
  ];

  const handlePress = (path: string) => {
    router.push(path);
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom || 24 }]}>
      <View style={styles.footerInner}>
        {tabs.map(tab => {
          // パス判定を少し詳細に行う
          // indexタブは /(tabs) または / (ルート) の場合にマッチ
          let focused = false;
          if (tab.id === 'index') {
            focused = pathname === '/' || pathname === '/(tabs)' || pathname === '/index';
          } else {
            focused = pathname.includes(tab.id);
          }

          return (
            <TouchableOpacity key={tab.id} style={styles.tab} onPress={() => handlePress(tab.path)}>
              {tab.icon(focused)}
              <Text style={[styles.label, focused && styles.labelFocused]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 8,
  },
  footerInner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    flex: 1,
  },
  label: {
    fontSize: 10,
    marginTop: 4,
    color: C.inactive,
  },
  labelFocused: {
    color: C.primary,
    fontWeight: '700',
  },
});
