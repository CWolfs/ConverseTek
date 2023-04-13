/* eslint-disable no-console */
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
// const SpeedMeasurePlugin = require("speed-measure-webpack-plugin");

const isLocal = process.env.NODE_ENV === 'local';
const isDev = process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'production';

const APP_DIR = path.resolve(__dirname, 'src');
const BUILD_DIR = path.resolve(__dirname, '../dist');

const localConfig = require('./webpack/webpack.local.config');
const devConfig = require('./webpack/webpack.dev.config');
const prodConfig = require('./webpack/webpack.prod.config');

// loaders
const cssLoader = require('./webpack/loaders/css.loader');
const jsxLoader = require('./webpack/loaders/jsx.loader');
const lessLoader = require('./webpack/loaders/less.loader');
const postcssLoader = require('./webpack/loaders/postcss.loader');
const imageLoader = require('./webpack/loaders/image.loader');

let config = {
  entry: ['@babel/polyfill', `${APP_DIR}/index.js`],

  output: {
    path: BUILD_DIR,
    filename: 'bundle.js',
    publicPath: '.',
  },

  resolve: {
    extensions: ['.js', '.json', '.jsx', '.tsx', '.ts'],
    alias: {
      root: path.resolve(__dirname, 'src/'),
      components: path.resolve(__dirname, 'src/components/'),
      containers: path.resolve(__dirname, 'src/containers/'),
      services: path.resolve(__dirname, 'src/services/'),
      hooks: path.resolve(__dirname, 'src/hooks/'),
      stores: path.resolve(__dirname, 'src/stores/'),
      utils: path.resolve(__dirname, 'src/utils/'),
    },
    modules: [path.resolve(__dirname), 'node_modules'],
  },

  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename],
    },
  },

  module: {
    rules: [],
  },

  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/index.html', to: 'index.html' },
        { from: 'src/assets/', to: 'assets/' },
      ],
    }),
  ],
};

// Loader hooks
config = cssLoader(config, APP_DIR);
config = jsxLoader(config, APP_DIR);
config = lessLoader(config, APP_DIR);
config = postcssLoader(config, APP_DIR);
config = imageLoader(config, APP_DIR);

if (isLocal) {
  config = localConfig(config, APP_DIR, BUILD_DIR);
} else if (isDev) {
  config = devConfig(config);
} else if (isProd) {
  config = prodConfig(config);
} else {
  console.log('WARNING: NODE_ENV=environment (e.g. development or production) must be set on the package.json script hook');
}

// Speed check
// const smp = new SpeedMeasurePlugin();
// config = smp.wrap(config);

module.exports = config;
