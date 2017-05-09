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
    'd3v4',
    'd3fc-rebind',
  ],
  // browser
  globals: {
    'd3v4': 'd3v4',
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
        '\'d3\'': '\'d3v4\'',
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
