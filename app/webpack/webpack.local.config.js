/* eslint-disable */
const webpack = require('webpack');
const merge = require('lodash.merge');

module.exports = function(config, APP_DIR, BUILD_DIR) {
    console.log('Using local config');

    config = merge(config, {
        mode: 'development',
        devtool: 'inline-source-map',

        devServer: {
            hot: true,
            contentBase: BUILD_DIR,
            publicPath: '/dist/',
            historyApiFallback: true,
            host: '127.0.0.1',
            port: 8080,
            disableHostCheck: true
        }
    });

    // push to the front of the array
    config.entry.unshift(
        'react-hot-loader/patch',
        'webpack-dev-server/client?http://127.0.0.1:8080',
        'webpack/hot/only-dev-server'
    );

    config.plugins.push(
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NamedModulesPlugin(),
        new webpack.DefinePlugin({
            __BUILD_DATE__: JSON.stringify(`LOCAL ${new Date(Date.now()).toUTCString()}`),
        }),
    );

    return config;
}
