import resolve from 'rollup-plugin-node-resolve';

export default {
  moduleName: 'sucrose',
  entry: './src/main.js',
  dest: './build/sucrose.js',
  format: 'umd',
  // sourceMap: 'inline',
  external: ['d3'],
  // treeshake: false,
  plugins: [
    resolve({
      jsnext: true,
      main: true,
      browser: true,
    }),
  ],
  globals: {
    d3: 'd3',
  },
};
