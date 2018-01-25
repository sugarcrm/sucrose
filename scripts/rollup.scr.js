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
      'd3': 'd3',
    },
    // dest: './build/sucrose.js',
    format: 'umd',
  },
  // node
  external: [
    'd3',
  ],
  // sourceMap: 'inline',
  treeshake: false,
  plugins: [
    replace({
      exclude: 'node_modules/**',
      delimiters: ['', ''],
      values: {
        ENV_DEV: (process.env.DEV === 'true' || false),
        ENV_BUILD: 'scr',
        ENV_VERSION: version,
      },
    }),
    eslint({
      throwOnError: true,
      throwOnWarning: false,
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
