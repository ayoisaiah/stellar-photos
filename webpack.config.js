const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');

const javascript = {
  test: /\.js$/,
  use: [
    {
      loader: 'babel-loader',
    },
  ],
};

const sass = {
  test: /\.scss$/,
  use: [
    MiniCssExtractPlugin.loader,
    'css-loader?sourceMap',
    'sass-loader?sourceMap',
  ],
};

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
        ignore: ['*.js', '*.css', '*.scss', '*.png'],
        flatten: true,
      },
      {
        from: './src/icons',
        to: 'icons',
      },
    ]),
    new OptimizeCSSAssetsPlugin({
      cssProcessorOptions: { discardComments: { removeAll: true } },
    }),
  ],
};

module.exports = config;
