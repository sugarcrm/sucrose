// http://sucrose.io Version 0.0.2. Copyright 2016 SugarCRM, Inc.
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ?
    factory(exports, require('d3'), require('d3fc-rebind')) :
    typeof define === 'function' && define.amd ?
      define(['exports', 'd3', 'd3fc-rebind'], factory) :
      (
        factory(
          (global.sucrose = global.sucrose || {}),
          global.d3,
          global.fc
        )
      );
} (this, (function (exports, d3, fc) {

'use strict';

var sucrose = sucrose || {};

var version = "0.0.2";
var dev = false; //set false when in production
