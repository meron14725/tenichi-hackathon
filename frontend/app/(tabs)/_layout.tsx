import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#436F9B',
        tabBarInactiveTintColor: '#63747E',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#EEF0F1',
          backgroundColor: '#FFFFFF',
        },
        tabBarLabelStyle: {
          fontSize: 12.25,
          fontWeight: '500',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '本日の予定',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={24}
              color={color}
            />
          ),
          tabBarLabelStyle: {
            fontSize: 12.25,
            fontWeight: '700',
          },
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'カレンダー',
          tabBarIcon: ({ color }) => (
            <Ionicons name="calendar-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="routine"
        options={{
          title: 'ルーティン',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="arrow-u-left-top" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          title: 'マイページ',
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
