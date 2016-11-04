(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3'), require('d3fc-rebind')) :
	typeof define === 'function' && define.amd ? define(['exports', 'd3', 'd3fc-rebind'], factory) :
	(factory((global.sucrose = global.sucrose || {}),global.d3,global.fc));
}(this, (function (exports,d3,d3fcRebind) { 'use strict';

// import * as fc from '../node_modules/d3fc-rebind/build/d3fc-rebind.js';
// import * as fc from '../node_modules/d3fc-rebind/index.js';
// import * as fc from 'd3fc-rebind';
// import * as fc from '../node_modules/d3fc-rebind/src/rebind.js';
var ver = '0.0.2'; //change to 0.0.3 when ready
var dev = false; //set false when in production


// export {default as fc} from '../node_modules/d3fc-rebind/src/rebind.js';
// export {* as fc} from 'd3fc-rebind';
// export {default as utils} from './utils.js';
// export {default as legend} from './models/legend.js';
// export {default as funnel} from './models/funnel.js';
// export {default as funnelChart} from './models/funnelChart.js';
// var asdf = d3.select('div');

exports.version = ver;
exports.development = dev;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIi4uL3NyYy9tYWluLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGQzIGZyb20gJ2QzJzsgLy93aXRob3V0IHRoaXMgcm9sbHVwIGRvZXMgc29tZXRoaW5nIGZ1bmt5IHRvIGQzIGdsb2JhbFxuLy8gaW1wb3J0ICogYXMgZmMgZnJvbSAnLi4vbm9kZV9tb2R1bGVzL2QzZmMtcmViaW5kL2J1aWxkL2QzZmMtcmViaW5kLmpzJztcbi8vIGltcG9ydCAqIGFzIGZjIGZyb20gJy4uL25vZGVfbW9kdWxlcy9kM2ZjLXJlYmluZC9pbmRleC5qcyc7XG4vLyBpbXBvcnQgKiBhcyBmYyBmcm9tICdkM2ZjLXJlYmluZCc7XG4vLyBpbXBvcnQgKiBhcyBmYyBmcm9tICcuLi9ub2RlX21vZHVsZXMvZDNmYy1yZWJpbmQvc3JjL3JlYmluZC5qcyc7XG5pbXBvcnQgKiBhcyBmYyBmcm9tICdkM2ZjLXJlYmluZCc7XG5cbnZhciB2ZXIgPSAnMC4wLjInOyAvL2NoYW5nZSB0byAwLjAuMyB3aGVuIHJlYWR5XG5leHBvcnQge3ZlciBhcyB2ZXJzaW9ufTtcbnZhciBkZXYgPSBmYWxzZTsgLy9zZXQgZmFsc2Ugd2hlbiBpbiBwcm9kdWN0aW9uXG5leHBvcnQge2RldiBhcyBkZXZlbG9wbWVudH07XG5cbi8vIGV4cG9ydCB7ZGVmYXVsdCBhcyBmY30gZnJvbSAnLi4vbm9kZV9tb2R1bGVzL2QzZmMtcmViaW5kL3NyYy9yZWJpbmQuanMnO1xuLy8gZXhwb3J0IHsqIGFzIGZjfSBmcm9tICdkM2ZjLXJlYmluZCc7XG4vLyBleHBvcnQge2RlZmF1bHQgYXMgdXRpbHN9IGZyb20gJy4vdXRpbHMuanMnO1xuLy8gZXhwb3J0IHtkZWZhdWx0IGFzIGxlZ2VuZH0gZnJvbSAnLi9tb2RlbHMvbGVnZW5kLmpzJztcbi8vIGV4cG9ydCB7ZGVmYXVsdCBhcyBmdW5uZWx9IGZyb20gJy4vbW9kZWxzL2Z1bm5lbC5qcyc7XG4vLyBleHBvcnQge2RlZmF1bHQgYXMgZnVubmVsQ2hhcnR9IGZyb20gJy4vbW9kZWxzL2Z1bm5lbENoYXJ0LmpzJztcbi8vIHZhciBhc2RmID0gZDMuc2VsZWN0KCdkaXYnKTtcbiJdLCJuYW1lcyI6WyJ2ZXIiLCJkZXYiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUNBOzs7O0FBSUEsQUFFQSxJQUFJQSxNQUFNLE9BQVY7QUFDQSxBQUNBLElBQUlDLE1BQU0sS0FBVjtBQUNBOzs7Ozs7Ozs7Ozs7Ozs7In0=
