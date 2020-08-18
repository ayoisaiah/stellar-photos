const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const GenerateJsonPlugin = require('generate-json-webpack-plugin');
const { merge } = require('webpack-merge');
const path = require('path');
const autoprefixer = require('autoprefixer');

const javascript = {
  test: /\.js$/,
  use: [
    {
      loader: 'babel-loader',
    },
  ],
};

const postcss = {
  loader: 'postcss-loader',
  options: {
    plugins() {
      return [autoprefixer({ overrideBrowsersList: 'last 3 versions' })];
    },
    sourceMap: true,
  },
};

const sass = {
  test: /\.scss$/,
  use: [
    MiniCssExtractPlugin.loader,
    'css-loader?sourceMap',
    postcss,
    'sass-loader?sourceMap',
  ],
};

module.exports = (env) => {
  const [mode, platform] = env.split(':');

  if (platform === 'firefox') {
    javascript.use.push({
      loader: 'webpack-strip-block',
      options: {
        start: 'CHROME_START',
        end: 'CHROME_END',
      },
    });
  }

  if (platform === 'chrome') {
    javascript.use.push({
      loader: 'webpack-strip-block',
      options: {
        start: 'FIREFOX_START',
        end: 'FIREFOX_END',
      },
    });
  }

  javascript.use.push({
    loader: 'placeholder-loader',
    options: {
      placeholder: 'BUILD_PLATFORM',
      handler: () => platform,
    },
  });

  javascript.use.push({
    loader: 'placeholder-loader',
    options: {
      placeholder: 'DEV_OR_PROD',
      handler: () => mode,
    },
  });

  const config = {
    entry: {
      'js/index': './src/js/index.js',
      'js/background': './src/js/background.js',
      'js/set-image': './src/js/set-image.js',
      'js/tab': './src/js/tab.js',
    },

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].bundle.js',
    },

    module: {
      rules: [javascript, sass],
    },

    plugins: [
      new MiniCssExtractPlugin({
        filename: 'css/main.css',
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: './src/index.html',
            to: '',
          },
          {
            from: './src/icons',
            to: 'icons',
          },
        ],
      }),
      new OptimizeCSSAssetsPlugin({
        cssProcessorOptions: { discardComments: { removeAll: true } },
      }),
      new GenerateJsonPlugin(
        'manifest.json',
        merge(
          require('./src/manifest/common.json'),
          require(`./src/manifest/${platform}.json`)
        ),
        null,
        2
      ),
    ],
  };

  return config;
};
