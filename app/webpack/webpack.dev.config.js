/* eslint-disable */
const webpack = require('webpack');

module.exports = function (config, APP_DIR, BUILD_DIR) {
  console.log('Using dev config');

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
      __INITIAL_ROUTE_PATH__: JSON.stringify('index.html'),
    }),
  );

  return config;
};
