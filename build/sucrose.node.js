'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var sucrose = require('./build/sucrose.js');

var version = "0.5.2";

//TODO: (from index.js) why doesn't from './build/sucrose.js' work?

exports.version = version;
exports.development = sucrose.development;
exports.utility = sucrose.utility;
exports.tooltip = sucrose.tooltip;
exports.models = sucrose.models;
exports.charts = sucrose.charts;
