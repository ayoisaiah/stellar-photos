module.exports = {
  printWidth: 80,
  singleQuote: true,
  trailingComma: 'es5',
  importOrderParserPlugins: ['typescript', 'decorators-legacy'],
  importOrder: ['<THIRD_PARTY_MODULES>', '^[./]'],
  plugins: [
    'prettier-plugin-organize-attributes',
    '@trivago/prettier-plugin-sort-imports',
    'prettier-plugin-css-order',
    'prettier-plugin-tailwindcss',
  ],
};
