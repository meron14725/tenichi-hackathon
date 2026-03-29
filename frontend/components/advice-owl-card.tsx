import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { AppColors as C } from '@/constants/app-colors';

const owlAvatar = require('@/assets/images/owl3.svg');

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
        <Image source={owlAvatar} style={styles.adviceOwl} contentFit="contain" />
        <View style={styles.adviceTextWrapper}>
          <Text style={styles.adviceTitle}>{title}</Text>
          <Text style={styles.adviceSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={21} color={C.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  adviceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E6EDF6',
    borderWidth: 3,
    borderColor: C.adviceBorder,
    borderRadius: 7,
    paddingHorizontal: 12.25,
    gap: 7,
    overflow: 'hidden', // clips the overflowing owl
  },
  adviceContent: {
    flexDirection: 'row',
    gap: 7,
  },
  adviceOwl: {
    width: 56,
    transform: [{ translateY: 11.5 }], // shifts the owl downwards
  },
  adviceTextWrapper: {
    gap: 7,
    paddingVertical: 12.25,
  },
  adviceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textPrimary,
  },
  adviceSubtitle: {
    fontSize: 12.25,
    fontWeight: '500',
    color: C.textPrimary,
  },
});
