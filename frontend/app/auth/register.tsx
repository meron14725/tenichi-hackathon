import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '@/api/authApi';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/utils/apiClient';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';

const C = {
  primary: '#436F9B',
  white: '#FFFFFF',
  textPrimary: '#1F2528',
  textSecondary: '#63747E',
  textMuted: '#B5BFC5',
  bg: '#EEF0F1',
  placeholder: '#98A6AE',
  error: '#D94040',
};

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// 東京をデフォルト中心にする
const DEFAULT_CENTER = { lat: 35.6762, lng: 139.6503 };

type FieldErrors = {
  email?: string;
  password?: string;
  name?: string;
  preparation_minutes?: string;
  home_address?: string;
};

function validate(fields: {
  email: string;
  password: string;
  name: string;
  preparationMinutes: string;
  homeAddress: string;
  homeLat: number | null;
}): FieldErrors {
  const errors: FieldErrors = {};
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(fields.email)) {
    errors.email = 'メールアドレスのフォーマットにしてください。';
  }

  const hasLetter = /[a-zA-Z]/.test(fields.password);
  const hasDigit = /\d/.test(fields.password);
  if (fields.password.length < 8 || fields.password.length > 100 || !hasLetter || !hasDigit) {
    errors.password = 'パスワードは英数字2種類以上かつ8文字以上100文字以下にしてください。';
  }

  if (fields.name.length < 1 || fields.name.length > 20) {
    errors.name = 'ユーザー名は1文字以上20文字以下にしてください。';
  }

  const minutes = Number(fields.preparationMinutes);
  if (!fields.preparationMinutes || isNaN(minutes) || minutes < 0) {
    errors.preparation_minutes = '身支度時間を正しく入力してください。';
  }

  if (!fields.homeAddress || fields.homeAddress.length > 200) {
    errors.home_address = '住所を入力してください。';
  }

  if (fields.homeLat === null) {
    errors.home_address = 'マップ上で住所をピンで指定してください。';
  }

  return errors;
}

// ==================================================================
// Geocoder を APIProvider 配下で1つだけ初期化し共有するためのコンテキスト
// ==================================================================
const GeocoderContext = React.createContext<google.maps.Geocoder | null>(null);

function GeocoderProvider({ children }: { children: React.ReactNode }) {
  const geocodingLib = useMapsLibrary('geocoding');
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);

  useEffect(() => {
    if (geocodingLib && !geocoderRef.current) {
      geocoderRef.current = new geocodingLib.Geocoder();
      setGeocoder(geocoderRef.current);
    }
  }, [geocodingLib]);

  return <GeocoderContext.Provider value={geocoder}>{children}</GeocoderContext.Provider>;
}

function useSharedGeocoder() {
  return React.useContext(GeocoderContext);
}

// ==================================================================
// マップ上のピン操作とジオコーディングを管理するコンポーネント
// ==================================================================
function MapContent({
  pinPosition,
  onPinChange,
}: {
  pinPosition: { lat: number; lng: number } | null;
  onPinChange: (lat: number, lng: number, address: string) => void;
}) {
  const map = useMap();
  const geocoder = useSharedGeocoder();

  // ピン位置が変わったらマップを移動
  useEffect(() => {
    if (map && pinPosition) {
      map.panTo(pinPosition);
      map.setZoom(16);
    }
  }, [map, pinPosition]);

  // マップをクリック → その場所にピンを移動 + 逆ジオコーディングで住所取得
  const handleMapClick = useCallback(
    (e: any) => {
      const latLng = e.detail?.latLng;
      if (!latLng) return;

      const lat = latLng.lat;
      const lng = latLng.lng;

      if (geocoder) {
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          const name =
            status === 'OK' && results?.[0]
              ? results[0].formatted_address
              : `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          onPinChange(lat, lng, name);
        });
      } else {
        onPinChange(lat, lng, `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    },
    [geocoder, onPinChange]
  );

  return (
    <>
      <Map
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={12}
        gestureHandling="greedy"
        disableDefaultUI={true}
        onClick={handleMapClick as any}
        style={{ width: '100%', height: '100%' }}
        mapId="register-address-map"
      />
      {pinPosition && <AdvancedMarker position={pinPosition} />}
    </>
  );
}

// ==================================================================
// 住所検索 → ジオコーディングでマップ上のピンを移動
// ==================================================================
function AddressGeocoder({
  onGeocode,
}: {
  onGeocode: (lat: number, lng: number, address: string) => void;
}) {
  const [query, setQuery] = useState('');
  const geocoder = useSharedGeocoder();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChangeText = useCallback(
    (text: string) => {
      setQuery(text);

      // 前のタイマーをクリア
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      if (!text.trim() || !geocoder) return;

      // 入力後 800ms 後にジオコーディング実行
      debounceTimer.current = setTimeout(() => {
        geocoder?.geocode({ address: text, region: 'jp' }, (results, status) => {
          if (status === 'OK' && results?.[0]?.geometry?.location) {
            const loc = results[0].geometry.location;
            onGeocode(loc.lat(), loc.lng(), results[0].formatted_address);
          }
        });
      }, 800);
    },
    [geocoder, onGeocode]
  );

  return (
    <View style={geocoderStyles.container}>
      <Ionicons name="search" size={18} color={C.placeholder} />
      <TextInput
        style={geocoderStyles.input}
        placeholder="住所を入力してマップを移動"
        placeholderTextColor={C.placeholder}
        value={query}
        onChangeText={handleChangeText}
      />
      {query.length > 0 && (
        <TouchableOpacity onPress={() => setQuery('')}>
          <Ionicons name="close-circle" size={16} color={C.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const geocoderStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 8,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    gap: 8,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
      },
    }),
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: C.textPrimary,
  },
});

// ==================================================================
// メインの登録画面コンポーネント
// ==================================================================
export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [preparationMinutes, setPreparationMinutes] = useState('');

  // 住所関連 state
  const [homeAddress, setHomeAddress] = useState('');
  const [homeLat, setHomeLat] = useState<number | null>(null);
  const [homeLon, setHomeLon] = useState<number | null>(null);
  const [pinPosition, setPinPosition] = useState<{ lat: number; lng: number } | null>(null);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  const allFilled =
    email.length > 0 &&
    password.length > 0 &&
    name.length > 0 &&
    preparationMinutes.length > 0 &&
    homeAddress.length > 0;

  // 住所検索結果やマップクリックでピン位置と住所を更新するハンドラ
  const handlePinChange = useCallback((lat: number, lng: number, address: string) => {
    setHomeLat(lat);
    setHomeLon(lng);
    setHomeAddress(address);
    setPinPosition({ lat, lng });
  }, []);

  async function handleRegister() {
    setApiError('');
    setFieldErrors({});

    const errors = validate({
      email,
      password,
      name,
      preparationMinutes,
      homeAddress,
      homeLat,
    });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.register({
        email,
        password,
        name,
        home_address: homeAddress,
        home_lat: homeLat ?? 0.0,
        home_lon: homeLon ?? 0.0,
        preparation_minutes: Number(preparationMinutes),
        reminder_minutes_before: 5,
      });

      await login({
        access_token: response.access_token,
        refresh_token: response.refresh_token,
        expires_in: response.expires_in,
      });
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 409) {
        setApiError('このメールアドレスは既に登録されています。');
      } else {
        const message =
          err instanceof Error
            ? err.message
            : '予期せぬエラーが発生しました。しばらく待って再度試してください。';
        setApiError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  function renderInput(
    label: string,
    value: string,
    onChangeText: (v: string) => void,
    options: {
      placeholder: string;
      errorKey?: keyof FieldErrors;
      keyboardType?: 'default' | 'email-address' | 'numeric';
      secureTextEntry?: boolean;
      autoCapitalize?: 'none' | 'sentences';
    }
  ) {
    const err = options.errorKey ? fieldErrors[options.errorKey] : undefined;
    const isPassword = options.secureTextEntry;

    return (
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{label}</Text>
        <View style={isPassword ? styles.passwordRow : undefined}>
          <TextInput
            style={[styles.input, err && styles.inputError, isPassword && styles.passwordInput]}
            placeholder={options.placeholder}
            placeholderTextColor={C.placeholder}
            keyboardType={options.keyboardType ?? 'default'}
            secureTextEntry={isPassword && !showPassword}
            autoCapitalize={options.autoCapitalize ?? 'sentences'}
            value={value}
            onChangeText={onChangeText}
          />
          {isPassword && (
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        {err && <Text style={styles.fieldError}>{err}</Text>}
      </View>
    );
  }

  function renderMapSection() {
    if (!GOOGLE_MAPS_API_KEY) {
      return (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>自宅住所</Text>
          <View style={styles.noMapContainer}>
            <Ionicons name="map-outline" size={28} color={C.textMuted} />
            <Text style={styles.noMapText}>
              Google Maps APIキーが未設定です。{'\n'}
              EXPO_PUBLIC_GOOGLE_MAPS_API_KEY を設定してください。
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.inputGroup}>
        <Text style={styles.label}>自宅住所</Text>
        <Text style={styles.sublabel}>
          住所を入力するとマップが移動します。ピンをタップで微調整できます。
        </Text>

        {/* マップ表示エリア */}
        <View style={styles.mapWrapper}>
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <GeocoderProvider>
              <MapContent pinPosition={pinPosition} onPinChange={handlePinChange} />
              <AddressGeocoder onGeocode={handlePinChange} />
            </GeocoderProvider>
          </APIProvider>
        </View>

        {/* 選択された住所の表示 */}
        {homeAddress ? (
          <View style={styles.selectedAddressRow}>
            <Ionicons name="location" size={16} color={C.primary} />
            <Text style={styles.selectedAddressText} numberOfLines={2}>
              {homeAddress}
            </Text>
          </View>
        ) : null}

        {fieldErrors.home_address && (
          <Text style={styles.fieldError}>{fieldErrors.home_address}</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={[styles.header, { paddingTop: insets.top + 30 }]}>
            <View style={styles.iconCircle}>
              <Ionicons name="person-add" size={32} color={C.white} />
            </View>
            <Text style={styles.appName}>セバス・ホー</Text>
            <Text style={styles.subtitle}>新規アカウント作成</Text>
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>サインアップ</Text>

            {apiError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={C.error} />
                <Text style={styles.errorText}>{apiError}</Text>
              </View>
            ) : null}

            {renderInput('ユーザー名', name, setName, {
              placeholder: 'お名前を入力',
              errorKey: 'name',
            })}

            {renderInput('メールアドレス', email, setEmail, {
              placeholder: 'example@email.com',
              errorKey: 'email',
              keyboardType: 'email-address',
              autoCapitalize: 'none',
            })}

            {renderInput('パスワード', password, setPassword, {
              placeholder: '英数字8文字以上',
              errorKey: 'password',
              secureTextEntry: true,
              autoCapitalize: 'none',
            })}

            {renderInput('朝の身支度時間（分）', preparationMinutes, setPreparationMinutes, {
              placeholder: '例: 30',
              errorKey: 'preparation_minutes',
              keyboardType: 'numeric',
            })}

            {/* マップ付き住所選択セクション */}
            {renderMapSection()}

            <TouchableOpacity
              style={[styles.button, (!allFilled || loading) && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={!allFilled || loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <Text style={styles.buttonText}>サインアップ</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/auth/login')}>
              <Text style={styles.linkText}>
                アカウントをお持ちの方は
                <Text style={styles.linkTextBold}> ログイン</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.primary,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingBottom: 24,
    paddingHorizontal: 14,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: C.white,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.8)',
  },

  // Form
  formCard: {
    flex: 1,
    backgroundColor: C.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 20,
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 7,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: C.error,
  },

  // Input
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textSecondary,
    marginBottom: 8,
  },
  sublabel: {
    fontSize: 11,
    fontWeight: '400',
    color: C.textMuted,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: C.bg,
    borderRadius: 7,
    paddingHorizontal: 14,
    fontSize: 15,
    color: C.textPrimary,
    backgroundColor: C.white,
  },
  inputError: {
    borderColor: C.error,
  },
  passwordRow: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  fieldError: {
    fontSize: 12,
    color: C.error,
    marginTop: 4,
  },

  // Map section
  mapWrapper: {
    height: 240,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.bg,
    position: 'relative',
  },
  selectedAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#F0F5FA',
    borderRadius: 7,
    padding: 10,
  },
  selectedAddressText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: C.textPrimary,
    lineHeight: 18,
  },
  noMapContainer: {
    height: 120,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.bg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 16,
  },
  noMapText: {
    fontSize: 12,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Button
  button: {
    height: 50,
    backgroundColor: C.primary,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.white,
  },

  // Link
  linkButton: {
    alignItems: 'center',
    marginTop: 20,
    padding: 8,
  },
  linkText: {
    fontSize: 14,
    color: C.textSecondary,
  },
  linkTextBold: {
    fontWeight: '700',
    color: C.primary,
  },
});
