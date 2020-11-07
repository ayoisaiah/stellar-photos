const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const GenerateJsonPlugin = require('generate-json-webpack-plugin');
const { merge } = require('webpack-merge');
const path = require('path');
const cssnano = require('cssnano');
const cssnext = require('postcss-preset-env');
const reporter = require('postcss-reporter');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const FixStyleOnlyEntriesPlugin = require('webpack-fix-style-only-entries');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

const postcss = {
  loader: 'postcss-loader',
  options: {
    plugins() {
      return [cssnext(), cssnano(), reporter({ clearReportedMessages: true })];
    },
    sourceMap: true,
  },
};

const typescript = {
  test: /\.(ts|js)$/,
  use: [
    {
      loader: 'babel-loader',
      options: {
        presets: ['@babel/preset-env', '@babel/preset-typescript'],
        plugins: [
          '@babel/plugin-proposal-class-properties',
          '@babel/plugin-proposal-object-rest-spread',
        ],
      },
    },
  ],
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
    typescript.use.push({
      loader: 'webpack-strip-block',
      options: {
        start: 'CHROME_START',
        end: 'CHROME_END',
      },
    });
  }

  if (platform === 'chrome') {
    typescript.use.push({
      loader: 'webpack-strip-block',
      options: {
        start: 'FIREFOX_START',
        end: 'FIREFOX_END',
      },
    });
  }

  typescript.use.push({
    loader: 'placeholder-loader',
    options: {
      placeholder: 'STELLAR_ENV',
      handler: () => mode,
    },
  });

  const config = {
    entry: {
      'js/index': './src/js/index.js',
      'js/popup': './src/ts/popup.ts',
      'js/background': './src/ts/background.ts',
      'js/set-image': './src/js/set-image.js',
      'js/tab': './src/js/tab.js',
      'css/popup': './src/sass/popup.scss',
      'css/main': './src/sass/main.scss',
    },

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].bundle.js',
    },

    module: {
      rules: [typescript, sass],
    },

    resolve: {
      extensions: ['.js', '.ts'],
    },

    plugins: [
      // Clean up the dist folder before each build
      new CleanWebpackPlugin(),
      // Prevent CSS / SCSS imports from generating additional JS file
      new FixStyleOnlyEntriesPlugin(),

      new MiniCssExtractPlugin({
        filename: '[name].css',
      }),

      new ForkTsCheckerWebpackPlugin(),

      new CopyWebpackPlugin({
        patterns: [
          {
            from: './src/popup.html',
            to: '',
          },
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
          // eslint-disable-next-line
          require('./src/manifest/common.json'),
          // eslint-disable-next-line
          require(`./src/manifest/${platform}.json`)
        ),
        null,
        2
      ),
    ],
  };

  return config;
};
