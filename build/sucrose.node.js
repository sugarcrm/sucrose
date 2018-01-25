'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var sucrose = require('./sucrose.js');

//INFO: why doesn't require('sucrose') work?
//  index.js is declared as module (jsnext:main) in package.json
//  for module aware bundlers. The UMD main entry point for require
//  and node is build/sucrose.node.js

exports.charts = sucrose.charts;
exports.development = sucrose.development;
exports.models = sucrose.models;
exports.tooltip = sucrose.tooltip;
exports.transform = sucrose.transform;
exports.utility = sucrose.utility;
exports.version = sucrose.version;
