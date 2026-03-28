export default ({ config }) => {
  const env = process.env.EXPO_PUBLIC_ENV || 'local';

  return {
    ...config,
    name: env === 'production' ? 'セバス・ホー' : `セバス・ホー (${env})`,
    slug: 'frontend',
    scheme: 'sebasu-hoo',
    ios: {
      ...config.ios,
      bundleIdentifier: env === 'production' ? 'com.hoo.sebasu' : `com.hoo.sebasu.${env}`,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    updates: {
      url: 'https://u.expo.dev/dfe53b5d-1359-4896-b65a-8426048bbd3d',
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    // ここから下を安全な書き方に修正
    android: {
      ...(config.android || {}),
    },
    web: {
      ...(config.web || {}),
    },
    plugins: [...(config.plugins || []), 'expo-router', 'expo-secure-store'],
    extra: {
      env: env,
      eas: {
        projectId: 'dfe53b5d-1359-4896-b65a-8426048bbd3d',
      },
    },
  };
};
