/* eslint-disable */
var webpack = require('webpack');

module.exports = function(config, APP_DIR) {
    console.log('Using packages-scoped css loader');

    config.module.rules.push({
        test: /\.css$/,
        use: [
            'style-loader',
            {
                loader: 'css-loader',
                options: {
                    importLoaders: 1
                }
            }
        ],
        exclude: APP_DIR
    });

    return config;
}
