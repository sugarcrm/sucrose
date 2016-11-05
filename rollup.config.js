// Rollup plugins
// import babel from 'rollup-plugin-babel';
// import eslint from 'rollup-plugin-eslint';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
// import * as path from 'path';
// import * as fc from './src/fc';

export default {
  moduleName: 'sucrose',
  entry: './src/main.js',
  dest: './build2/sucrose.js',
  format: 'umd',
  // sourceMap: 'inline',
  // external: ['d3'],
  // external: ['d3', '../d3fc-rebind.js'],
  // external: ['d3', path.resolve( '../d3fc-rebind.js' )],
  external: ['d3', 'd3fc-rebind'], // need babel
  treeshake: false,
  plugins: [
    resolve({
      jsnext: true,
      main: true,
      browser: true,
    }),
    commonjs(),
    // eslint({
    //   exclude: [
    //     'src/styles/**',
    //   ]
    // }),
    // babel({
    //   // exclude: 'node_modules/**',
    //   babelrc: false,
    //   presets: ['es2015-rollup'],
    // }),
  ],
  globals: {
    d3: 'd3',
    // '../d3fc-rebind.js': 'fc',
  },
};
