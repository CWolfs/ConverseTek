/* eslint-disable */
const webpack = require('webpack');

module.exports = function (config, APP_DIR, BUILD_DIR) {
  console.log('Using local config');

  config = {
    ...config,
    mode: 'development',
    devtool: 'inline-source-map',
    optimization: {
      moduleIds: 'named',
    },
  };

  config.plugins.push(
    new webpack.DefinePlugin({
      __BUILD_DATE__: JSON.stringify(`LOCAL ${new Date(Date.now()).toUTCString()}`),
    }),
  );

  return config;
};
