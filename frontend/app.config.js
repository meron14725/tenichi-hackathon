export default ({ config }) => {
  const env = process.env.EXPO_PUBLIC_ENV || 'local';

  return {
    ...config,
    name: env === 'production' ? "Mr. Secretary" : `Mr. Secretary (${env})`,
    slug: "frontend",
    ios: {
      ...config.ios,
      bundleIdentifier: env === 'production'
        ? "com.yourname.butler"
        : `com.yourname.butler.${env}`,
    },
    // ここから下を安全な書き方に修正
    android: {
      ...(config.android || {}),
    },
    web: {
      ...(config.web || {}),
    },
    plugins: [
      ...(config.plugins || []),
    ],
    extra: {
      env: env
    }
  };
};