'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var sucrose = require('./sucrose.js');

var version = "0.6.3";

//INFO: why doesn't require('sucrose') work?
//  index.js is declared as module (jsnext:main) in package.json
//  for module aware bundlers. The UMD main entry point for require
//  and node is build/sucrose.node.js

exports.version = version;
exports.development = sucrose.development;
exports.utility = sucrose.utility;
exports.tooltip = sucrose.tooltip;
exports.models = sucrose.models;
exports.charts = sucrose.charts;
exports.transform = sucrose.transform;
