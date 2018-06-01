const webpack = require('webpack');
const merge = require('webpack-merge');
const common = require('./webpack.common');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

module.exports = env => {
  const config = merge(common(env), {
    mode: 'production',
    plugins: [
      new UglifyJSPlugin({
        sourceMap: false,
      }),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('production'),
      }),
    ],
  });

  return config;
};
