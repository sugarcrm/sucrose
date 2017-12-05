import replace from 'rollup-plugin-replace';
import eslint from 'rollup-plugin-eslint';
import resolve from 'rollup-plugin-node-resolve';
const version = require('./package.json').version;

export default {
  moduleName: 'sucrose',
  entry: './src/main.js',
  // dest: './build/sucrose.js',
  format: 'umd',
  // node
  external: [
    'd3',
  ],
  // browser
  globals: {
    'd3': 'd3',
  },
  // sourceMap: 'inline',
  treeshake: false,
  plugins: [
    replace({
      exclude: 'node_modules/**',
      values: {
        ENV_DEV: (process.env.DEV || false),
        ENV_BUILD: 'scr',
        ENV_VERSION: version,
      },
    }),
    eslint({
      throwOnError: true,
      rules: {
        'no-console': (process.env.DEV === 'false' ? 2 : 0)
      }
    }),
    resolve({
      jsnext: true,
      main: true,
      browser: true,
    }),
  ],
};
