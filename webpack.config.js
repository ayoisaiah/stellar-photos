const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const GenerateJsonPlugin = require('generate-json-webpack-plugin');
const merge = require('webpack-merge');
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
      return [autoprefixer({ browsers: 'last 3 versions' })];
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

module.exports = env => {
  const [mode, platform] = env.split(':');

  const config = {
    entry: {
      'js/index': './src/js/index.js',
      'js/background': './src/js/background.js',
      'js/set-image': './src/js/set-image.js',
      'js/tab': './src/js/tab.js',
    },

    devtool: 'source-map',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].bundle.js',
    },
    module: {
      rules: [javascript, sass],
    },
    mode: 'development',
    plugins: [
      new MiniCssExtractPlugin({
        filename: 'css/main.css',
      }),
      new CopyWebpackPlugin([
        {
          from: './src/**/*',
          to: '',
          ignore: ['*.js', '*.css', '*.scss', '*.png', '*.json', '*.md'],
          flatten: true,
        },
        {
          from: './src/icons',
          to: 'icons',
        },
        {
          from: './src/js/ga.js',
          to: 'js',
        },
      ]),
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
