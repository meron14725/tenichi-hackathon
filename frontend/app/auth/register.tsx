import React, { useState } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL, setToken } from '@/lib/api-client';

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
    errors.home_address = '住所を選択してください。';
  }

  if (fields.homeLat === null) {
    errors.home_address = 'マップから住所を選択してください。';
  }

  return errors;
}

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    home_lat?: string;
    home_lon?: string;
    home_address?: string;
  }>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [preparationMinutes, setPreparationMinutes] = useState('');

  // 住所はマップピッカーから受け取る
  const homeAddress = params.home_address ?? '';
  const homeLat = params.home_lat ? parseFloat(params.home_lat) : null;
  const homeLon = params.home_lon ? parseFloat(params.home_lon) : null;

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const allFilled =
    email.length > 0 &&
    password.length > 0 &&
    name.length > 0 &&
    preparationMinutes.length > 0 &&
    homeAddress.length > 0;

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
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
          home_address: homeAddress,
          home_lat: homeLat,
          home_lon: homeLon,
          preparation_minutes: Number(preparationMinutes),
          reminder_minutes_before: 5,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        if (res.status === 409) {
          setApiError('このメールアドレスは既に登録されています。');
        } else if (errorData?.detail) {
          setApiError(errorData.detail);
        } else {
          setApiError('予期せぬエラーが発生しました。しばらく待って再度試してください。');
        }
        return;
      }

      const { access_token } = await res.json();
      setToken(access_token);

      router.replace('/(tabs)/calendar');
    } catch {
      setApiError('予期せぬエラーが発生しました。しばらく待って再度試してください。');
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

            {/* 住所選択 - マップピッカーで選択 */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>自宅住所</Text>
              <TouchableOpacity
                style={[styles.addressButton, fieldErrors.home_address && styles.inputError]}
                onPress={() =>
                  router.push({
                    pathname: '/schedule/destination-picker',
                    params: { returnTo: 'auth/register' },
                  })
                }
              >
                <Ionicons
                  name="location"
                  size={18}
                  color={homeAddress ? C.primary : C.placeholder}
                />
                <Text
                  style={[styles.addressText, !homeAddress && styles.addressPlaceholder]}
                  numberOfLines={1}
                >
                  {homeAddress || 'マップから住所を選択'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
              </TouchableOpacity>
              {fieldErrors.home_address && (
                <Text style={styles.fieldError}>{fieldErrors.home_address}</Text>
              )}
            </View>

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

            <TouchableOpacity style={styles.linkButton} onPress={() => router.back()}>
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

  // Address picker button
  addressButton: {
    height: 48,
    borderWidth: 1,
    borderColor: C.bg,
    borderRadius: 7,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.white,
  },
  addressText: {
    flex: 1,
    fontSize: 15,
    color: C.textPrimary,
  },
  addressPlaceholder: {
    color: C.placeholder,
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
