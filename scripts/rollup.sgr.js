import replace from 'rollup-plugin-replace';
import eslint from 'rollup-plugin-eslint';
import resolve from 'rollup-plugin-node-resolve';
const version = require('../package.json').version;

export default {
  input: './src/main.js',
  output: {
    name: 'sucrose',
    // browser
    globals: {
      '@sugarcrm/d3-sugar': 'd3sugar',
    },
    // dest: './build/sucrose.js',
    format: 'umd',
  },
  // node
  external: [
    '@sugarcrm/d3-sugar',
  ],
  // sourceMap: 'inline',
  treeshake: false,
  plugins: [
    replace({
      exclude: 'node_modules/**',
      delimiters: ['', ''],
      values: {
        ENV_VERSION: version,
        ENV_BUILD: 'sgr',
        ENV_DEV: (process.env.DEV === 'true' || false),
        '\'d3\'': '\'@sugarcrm\/d3-sugar\'',
      },
    }),
    eslint({
      throwOnError: true,
      rules: {
        'no-console': (process.env.DEV === 'true' ? 0 : 2)
      }
    }),
    resolve({
      jsnext: true,
      main: true,
      browser: true,
    }),
  ],
};
