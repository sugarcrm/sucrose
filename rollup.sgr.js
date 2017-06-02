import replace from 'rollup-plugin-replace';
import resolve from 'rollup-plugin-node-resolve';
import eslint from 'rollup-plugin-eslint';

export default {
  moduleName: 'sucrose',
  entry: './src/main.js',
  dest: './build/sucrose.js',
  format: 'umd',
  // node
  external: [
    '@sugarcrm/d3-sugar',
    'd3fc-rebind',
  ],
  // browser
  globals: {
    '@sugarcrm/d3-sugar': 'd3-sugar',
    'd3fc-rebind': 'fc',
  },
  // sourceMap: 'inline',
  // treeshake: false,
  plugins: [
    replace({
      exclude: 'node_modules/**',
      values: {
        ENV_DEV: (process.env.DEV || true),
        ENV_BUILD: 'sgr',
        '\'d3\'': '\'@sugarcrm\/d3-sugar\'',
      },
    }),
    eslint(),
    resolve({
      jsnext: true,
      main: true,
      browser: true,
    }),
  ],
};
