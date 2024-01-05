import { typecheckPlugin } from '@jgoz/esbuild-plugin-typecheck';
import autoprefixer from 'autoprefixer';
import esbuild from 'esbuild';
import inlineImage from 'esbuild-plugin-inline-image';
import inlineImportPlugin from 'esbuild-plugin-inline-import';
import jsonMerge from 'esbuild-plugin-json-merge';
import { sassPlugin } from 'esbuild-sass-plugin';
import fs from 'node:fs';
import util from 'node:util';
import postcss from 'postcss';
import postcssPresetEnv from 'postcss-preset-env';
import { rimraf } from 'rimraf';
import { replace } from 'esbuild-plugin-replace';

const isProd = process.env.NODE_ENV === 'production';
const isDev = process.env.NODE_ENV === 'development';
const browser = process.env.BROWSER;

// TODO: minify CSS in production

(async function build() {
  // await rimraf(['dist']);

  await esbuild.build({
    bundle: true,
    minify: isProd,
    sourcemap: isDev,
    entryPoints: [
      'src/ts/main.ts',
      'src/ts/popup.ts',
      'src/ts/tab.ts',
      'src/ts/background.ts',
      'src/ts/init.ts',
      'src/ts/events.ts',
      // 'src/ts/service-worker.ts',
      // 'src/ts/content_start.ts',
    ],
    outdir: 'dist',
    entryNames: '[name]',
    assetNames: '[name]',
    metafile: true,
    plugins: [
      replace({
        NODE_ENV: process.env.NODE_ENV,
      }),
      inlineImportPlugin({
        filter: /^sass:/,
        transform: async (source, args) => {
          const { css } = await postcss([
            autoprefixer,
            postcssPresetEnv({ stage: 0 }),
          ]).process(source, { from: undefined });
          return css;
        },
      }),
      sassPlugin({
        async transform(source, _resolveDir) {
          const { css } = await postcss([
            autoprefixer,
            postcssPresetEnv({ stage: 0 }),
          ]).process(source, { from: undefined });
          return css;
        },
      }),
      jsonMerge({
        entryPoints: [
          'src/manifest/common.json',
          `src/manifest/${browser}.json`,
        ],
        outfile: 'manifest.json',
      }),
      typecheckPlugin({
        omitStartLog: true,
      }),
      inlineImage(),
    ],
    loader: {
      '.woff': 'copy',
      '.woff2': 'copy',
      '.svg': 'copy',
    },
  });

  const copy = util.promisify(fs.cp);

  await copy('src/icons', 'dist/icons', { recursive: true });
  await copy('src/index.html', 'dist/index.html');
  await copy('src/popup.html', 'dist/popup.html');
  await copy('src/fonts', 'dist/fonts', { recursive: true });
  await copy('src/images', 'dist/images', { recursive: true });
})();
