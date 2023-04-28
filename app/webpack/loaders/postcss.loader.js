/* eslint-disable */
var webpack = require('webpack');

module.exports = function (config, APP_DIR) {
  console.log('Using css and postcss loader');

  config.module.rules.push({
    test: /\.css$/,
    use: [
      'style-loader',
      {
        loader: 'css-loader',
        options: {
          importLoaders: 1,
          url: false,
        },
      },
      {
        loader: 'postcss-loader',
      },
    ],
    include: APP_DIR,
  });

  return config;
};
