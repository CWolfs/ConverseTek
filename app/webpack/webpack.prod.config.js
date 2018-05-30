/* eslint-disable */
var webpack = require('webpack');
var UglifyJSPlugin = require('uglifyjs-webpack-plugin');

module.exports = function(config) {
    console.log('Using prod config');
    config.mode = 'production';

    config.plugins.push(
        new webpack.DefinePlugin({
            __BUILD_DATE__: '',
            'process.env.NODE_ENV': JSON.stringify('production')
        }),
        new UglifyJSPlugin({
            sourceMap: true
        })
    );

    return config;
}