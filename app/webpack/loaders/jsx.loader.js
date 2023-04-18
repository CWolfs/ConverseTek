/* eslint-disable */
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

module.exports = function (config, APP_DIR, isLocal) {
  console.log('Using jsx loader');

  config.module.rules.push({
    test: /\.(js|jsx|tsx|ts)$/,
    use: [
      {
        loader: 'babel-loader?cacheDirectory',
        options: {
          plugins: isLocal ? [require.resolve('react-refresh/babel')] : undefined,
        },
      },
    ],
    include: APP_DIR,
  });

  if (isLocal) config.plugins.push(new ReactRefreshWebpackPlugin());

  return config;
};
