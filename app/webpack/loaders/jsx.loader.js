/* eslint-disable */
var webpack = require('webpack');

module.exports = function (config, APP_DIR) {
  console.log('Using jsx loader');

  config.module.rules.push({
    test: /\.jsx?$/,
    use: ['babel-loader?cacheDirectory'],
    include: APP_DIR,
  });

  return config;
};
