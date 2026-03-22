import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors as C } from '@/constants/app-colors';

const owlAvatar = require('@/assets/images/owl-avatar.png');

interface AdviceOwlCardProps {
  title?: string;
  subtitle?: string;
  onPress?: () => void;
}

export default function AdviceOwlCard({
  title = '予定を確認！',
  subtitle = '準備は大丈夫ですか？',
  onPress,
}: AdviceOwlCardProps) {
  return (
    <TouchableOpacity style={styles.adviceCard} onPress={onPress}>
      <View style={styles.adviceContent}>
        <Image source={owlAvatar} style={styles.adviceOwl} resizeMode="contain" />
        <View style={styles.adviceTextWrapper}>
          <Text style={styles.adviceTitle}>{title}</Text>
          <Text style={styles.adviceSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={21} color={C.white} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  adviceCard: {
    // TODO: 提出用対応のため非表示
    display: 'none',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.headerBg,
    borderWidth: 3,
    borderColor: C.adviceBorder,
    borderRadius: 7,
    paddingRight: 12.25,
    gap: 7,
  },
  adviceContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 7,
  },
  adviceOwl: {
    width: 56,
    height: 74.49,
  },
  adviceTextWrapper: {
    gap: 7,
    paddingVertical: 12.25,
  },
  adviceTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16.8,
    color: C.white,
  },
  adviceSubtitle: {
    fontSize: 12.25,
    fontWeight: '500',
    lineHeight: 14.7,
    color: C.white,
  },
});
