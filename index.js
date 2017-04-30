export {
  version
} from './build/package';

export {
  development,
  utility,
  tooltip,
  models,
  charts,
  transform,
} from 'sucrose';
//INFO: why doesn't require('sucrose') work?
//  index.js is declared as module (jsnext:main) in package.json
//  for module aware bundlers. The UMD main entry point for require
//  and node is build/sucrose.node.js
