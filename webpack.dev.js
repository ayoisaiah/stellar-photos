const { merge } = require('webpack-merge');
const common = require('./webpack.common');

module.exports = (env) => {
  const config = merge(common(env), {
    devtool: 'inline-source-map',
    mode: 'development',
  });

  return config;
};
