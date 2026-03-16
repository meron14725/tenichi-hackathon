import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { apiGet, apiPost, clearToken } from '@/lib/api-client';

const C = {
  primary: '#436F9B',
  white: '#FFFFFF',
  textPrimary: '#1F2528',
  textSecondary: '#63747E',
  textMuted: '#B5BFC5',
  bg: '#EEF0F1',
  danger: '#D94040',
};

type UserProfile = {
  id: number;
  email: string;
  name: string;
  created_at: string;
};

type UserSettings = {
  home_address: string;
  preparation_minutes: number;
  reminder_minutes_before: number;
};

export default function MyPageScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [p, s] = await Promise.all([
          apiGet<UserProfile>('/users/me'),
          apiGet<UserSettings>('/users/me/settings'),
        ]);
        setProfile(p);
        setSettings(s);
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  async function doLogout() {
    setLoggingOut(true);
    try {
      await apiPost('/auth/logout', {});
    } catch (error) {
      console.error('Logout API failed:', error);
    }
    clearToken();
    router.replace('/auth/login');
  }

  function handleLogout() {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('ログアウトしますか？');
      if (confirmed) doLogout();
    } else {
      Alert.alert('ログアウト', 'ログアウトしますか？', [
        { text: 'キャンセル', style: 'cancel' },
        { text: 'ログアウト', style: 'destructive', onPress: doLogout },
      ]);
    }
  }

  function renderInfoRow(icon: React.ReactNode, label: string, value: string) {
    return (
      <View style={styles.infoRow}>
        <View style={styles.infoIcon}>{icon}</View>
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={styles.infoValue}>{value}</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={36} color={C.white} />
          </View>
          <Text style={styles.userName}>{profile?.name ?? '---'}</Text>
          <Text style={styles.userEmail}>{profile?.email ?? '---'}</Text>
        </View>

        {/* Settings card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>アカウント情報</Text>

          {renderInfoRow(
            <Ionicons name="mail-outline" size={20} color={C.primary} />,
            'メールアドレス',
            profile?.email ?? '---'
          )}

          <View style={styles.divider} />

          {renderInfoRow(
            <MaterialCommunityIcons name="clock-outline" size={20} color={C.primary} />,
            '朝の身支度時間',
            settings ? `${settings.preparation_minutes}分` : '---'
          )}

          <View style={styles.divider} />

          {renderInfoRow(
            <Ionicons name="location-outline" size={20} color={C.primary} />,
            '自宅住所',
            settings?.home_address ?? '---'
          )}

          <View style={styles.divider} />

          {renderInfoRow(
            <Ionicons name="notifications-outline" size={20} color={C.primary} />,
            'リマインダー',
            settings ? `${settings.reminder_minutes_before}分前` : '---'
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={loggingOut}
          activeOpacity={0.7}
        >
          {loggingOut ? (
            <ActivityIndicator color={C.danger} />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color={C.danger} />
              <Text style={styles.logoutText}>ログアウト</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Header
  header: {
    backgroundColor: C.primary,
    alignItems: 'center',
    paddingBottom: 28,
    paddingHorizontal: 14,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: C.white,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
  },

  // Card
  card: {
    backgroundColor: C.white,
    marginHorizontal: 14,
    marginTop: -14,
    borderRadius: 14,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 16,
  },

  // Info row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: C.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: C.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: C.bg,
    marginVertical: 4,
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 14,
    marginTop: 24,
    backgroundColor: C.white,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: C.danger,
    paddingVertical: 14,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.danger,
  },
});
