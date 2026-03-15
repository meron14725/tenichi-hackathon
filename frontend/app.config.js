export default ({ config }) => {
  const env = process.env.EXPO_PUBLIC_ENV || 'local';

  return {
    ...config,
    name: env === 'production' ? 'セバス・ホー' : `セバス・ホー (${env})`,
    slug: 'frontend',
    ios: {
      ...config.ios,
      bundleIdentifier: env === 'production' ? 'com.yourname.sebasu' : `com.yourname.sebasu.${env}`,
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
    plugins: [...(config.plugins || [])],
    extra: {
      env: env,
    },
  };
};
