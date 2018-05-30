/* eslint-disable */
var webpack = require('webpack');

module.exports = function(config, APP_DIR) {
    console.log('Using image loader');

    config.module.rules.push({
        test: /\.(gif|png|jpe?g|svg)$/i,
        use: [
          'file-loader',
          {
            loader: 'image-webpack-loader',
            options: {
              bypassOnDebug: true,
            },
          },
        ],
        include: APP_DIR
    });

    return config;
}
