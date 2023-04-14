/* eslint-disable */
var webpack = require('webpack');

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
    }),
  );

  return config;
};
