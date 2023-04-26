/* eslint-disable */
const webpack = require('webpack');

module.exports = function (config) {
  console.log('Using prod config');

  config = {
    ...config,
    mode: 'production',

    optimization: {
      minimize: true,
    },
  };

  config.plugins.push(
    new webpack.DefinePlugin({
      __BUILD_DATE__: '',
      'process.env.NODE_ENV': JSON.stringify('production'),
      __INITIAL_ROUTE_PATH__: JSON.stringify('index.html'),
    }),
  );

  return config;
};
