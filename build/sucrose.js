/*
Copyright 2018 SugarCRM, Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3')) :
	typeof define === 'function' && define.amd ? define(['exports', 'd3'], factory) :
	(factory((global.sucrose = {}),global.d3));
}(this, (function (exports,d3) { 'use strict';

d3 = d3 && d3.hasOwnProperty('default') ? d3['default'] : d3;

/*-------------------
      UTILITIES
-------------------*/

// Method is assumed to be a standard D3 getter-setter:
// If passed with no arguments, gets the value.
// If passed with arguments, sets the value and returns the target.
function d3_rebind(target, source, method) {
  return function() {
    var value = method.apply(source, arguments);
    return value === source ? target : value;
  };
}

var utility = {};

utility.identity = function(d) {
  return d;
};

utility.functor = function functor(v) {
  return typeof v === 'function' ? v : function() {
    return v;
  };
};

utility.isFunction = function(o) {
 var ol = {};
 return o && ol.toString.call(o) == '[object Function]';
};

// Copies a variable number of methods from source to target.
utility.rebind = function(target, source) {
  var i = 1, n = arguments.length, method;
  while (++i < n) target[method = arguments[i]] = d3_rebind(target, source, source[method]);
  return target;
};

/*
Snippet of code you can insert into each utility.models.* to give you the ability to
do things like:
chart.options({
  showXAxis: true,
  tooltips: true
});
To enable in the chart:
chart.options = utility.optionsFunc.bind(chart);
*/
utility.optionsFunc = function(args) {
  if (!args) {
    return this;
  }
  d3.map(args).each((function(value, key) {
    var m = this[key];
    var v = utility.toNative(value);
    if (!utility.isFunction(m)) {
      return;
    }
    if (Array.isArray(v)) {
      m.apply(v);
    } else {
      m(v);
    }
  }).bind(this));
  return this;
};

// Window functions
utility.windowSize = function() {
  // Sane defaults
  var size = {};
  if (window.innerWidth && window.innerHeight) {
    // most recent browsers use
    size.width = window.innerWidth;
    size.height = window.innerHeight;
  } else if (document.body && document.body.offsetWidth) {
    // earlier IE uses Doc.body
    size.width = document.body.offsetWidth;
    size.height = document.body.offsetHeight;
  } else if (document.compatMode === 'CSS1Compat' &&
    // IE can use depending on mode it is in
    document.documentElement &&
    document.documentElement.offsetWidth ) {
    size.width = document.documentElement.offsetWidth;
    size.height = document.documentElement.offsetHeight;
  } else {
    // default
    size.width = 640;
    size.height = 480;
  }
  return (size);
};

// Easy way to bind multiple functions to window.onresize
  // TODO: give a way to remove a function after its bound, other than removing alkl of them
  // utility.windowResize = function(fun)
  // {
  //   var oldresize = window.onresize;

  //   window.onresize = function(e) {
  //     if (typeof oldresize == 'function') oldresize(e);
  //     fun(e);
  //   }
// }

utility.windowResize = function(fun) {
  if (window.attachEvent) {
      window.attachEvent('onresize', fun);
  }
  else if (window.addEventListener) {
      window.addEventListener('resize', fun, true);
  }
  else {
      //The browser does not support Javascript event binding
  }
};

utility.windowUnResize = function(fun) {
  if (window.detachEvent) {
    window.detachEvent('onresize', fun);
  }
  else if (window.removeEventListener) {
    window.removeEventListener('resize', fun, true);
  }
  else {
    //The browser does not support Javascript event binding
  }
};

utility.resizeOnPrint = function(fn) {
  if (window.matchMedia) {
    var mediaQueryList = window.matchMedia('print');
    mediaQueryList.addListener(function(mql) {
        if (mql.matches) {
            fn();
        }
    });
  } else if (window.attachEvent) {
    window.attachEvent('onbeforeprint', fn);
  } else {
    window.onbeforeprint = fn;
  }
  //TODO: allow for a second call back to undo using
  //window.attachEvent('onafterprint', fn);
};

utility.unResizeOnPrint = function(fn) {
  if (window.matchMedia) {
    var mediaQueryList = window.matchMedia('print');
    mediaQueryList.removeListener(function(mql) {
        if (mql.matches) {
            fn();
        }
    });
  } else if (window.detachEvent) {
    window.detachEvent('onbeforeprint', fn);
  } else {
    window.onbeforeprint = null;
  }
};

// Color functions

// Backwards compatible way to implement more d3-like coloring of graphs.
// If passed an array, wrap it in a function which implements the old default
// behavior
utility.getColor = function(color) {
  if (!arguments.length) {
    //if you pass in nothing, get default colors back
    return utility.defaultColor();
  }
  if (Array.isArray(color)) {
    return function(d, i) {
      return d.color || color[i % color.length];
    };
  } else if (Object.prototype.toString.call(color) === '[object String]') {
    return function(d) {
      return d.color || '#' + color.replace('#', '');
    };
  } else {
    return color;
    // can't really help it if someone passes rubbish as color
    // or color is already a function
  }
};

// Default color chooser uses the index of an object as before.
utility.defaultColor = function() {
  var colors = d3.scaleOrdinal(d3.schemeCategory20).range();
  return function(d, i) {
    return d.color || colors[i % colors.length];
  };
};

utility.getTextContrast = function(c, i, callback) {
  var back = c,
      backLab = d3.lab(back),
      backLumen = backLab.l,
      textLumen = backLumen > 60 ?
        backLab.darker(4 + (backLumen - 75) / 25).l : // (50..100)[1 to 3.5]
        backLab.brighter(4 + (18 - backLumen) / 25).l, // (0..50)[3.5..1]
      textLab = d3.lab(textLumen, 0, 0),
      text = textLab.toString();
  if (callback) {
    callback(backLab, textLab);
  }
  return text;
};

// Returns a color function that takes the result of 'getKey' for each series and
// looks for a corresponding color from the dictionary,
utility.customTheme = function(dictionary, getKey, defaultColors) {
  var defIndex;
  getKey = getKey || function(series) { return series.key; }; // use default series.key if getKey is undefined
  defaultColors = defaultColors || d3.scaleOrdinal(d3.schemeCategory20).range(); //default color function
  defIndex = defaultColors.length; //current default color (going in reverse)
  return function(series) {
    var key = getKey(series);

    if (!defIndex) {
      defIndex = defaultColors.length; //used all the default colors, start over
    }
    if (typeof dictionary[key] !== 'undefined') {
      return (typeof dictionary[key] === 'function') ? dictionary[key]() : dictionary[key];
    } else {
      return defaultColors[--defIndex]; // no match in dictionary, use default color
    }
  };
};

// Gradient functions

utility.colorLinearGradient = function(d, i, p, c, defs) {
  var id = 'lg_gradient_' + i;
  var grad = defs.select('#' + id);
  if (grad.empty()) {
    if (p.position === 'middle') {
      utility.createLinearGradient(id, p, defs, [
        { 'offset': '0%',  'stop-color': d3.rgb(c).darker().toString(),  'stop-opacity': 1 },
        { 'offset': '20%', 'stop-color': d3.rgb(c).toString(), 'stop-opacity': 1 },
        { 'offset': '50%', 'stop-color': d3.rgb(c).brighter().toString(), 'stop-opacity': 1 },
        { 'offset': '80%', 'stop-color': d3.rgb(c).toString(), 'stop-opacity': 1 },
        { 'offset': '100%','stop-color': d3.rgb(c).darker().toString(),  'stop-opacity': 1 }
      ]);
    } else {
      utility.createLinearGradient(id, p, defs, [
        { 'offset': '0%',  'stop-color': d3.rgb(c).darker().toString(),  'stop-opacity': 1 },
        { 'offset': '50%', 'stop-color': d3.rgb(c).toString(), 'stop-opacity': 1 },
        { 'offset': '100%','stop-color': d3.rgb(c).brighter().toString(), 'stop-opacity': 1 }
      ]);
    }
  }
  return 'url(#'+ id +')';
};

// defs:definition container
// id:dynamic id for arc
// radius:outer edge of gradient
// stops: an array of attribute objects
utility.createLinearGradient = function(id, params, defs, stops) {
  var x2 = params.orientation === 'horizontal' ? '0%' : '100%';
  var y2 = params.orientation === 'horizontal' ? '100%' : '0%';
  var attrs, stop;
  var grad = defs.append('linearGradient');
  grad
    .attr('id', id)
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', x2 )
    .attr('y2', y2 )
    //.attr('gradientUnits', 'userSpaceOnUse')objectBoundingBox
    .attr('spreadMethod', 'pad');
  for (var i = 0; i < stops.length; i += 1) {
    attrs = stops[i];
    stop = grad.append('stop');
    Object.getOwnPropertyNames(attrs).forEach(function(val) {
      stop.attr(val, attrs[val]);
    });
  }
};

utility.colorRadialGradient = function(d, i, p, c, defs) {
  var id = 'rg_gradient_' + i;
  var grad = defs.select('#' + id);
  if (grad.empty()) {
    utility.createRadialGradient(id, p, defs, [
      {'offset': p.s, 'stop-color': d3.rgb(c).brighter().toString(), 'stop-opacity': 1},
      {'offset': '100%','stop-color': d3.rgb(c).darker().toString(), 'stop-opacity': 1}
    ]);
  }
  return 'url(#' + id + ')';
};

utility.createRadialGradient = function(id, params, defs, stops) {
  var attrs, stop, grad;
  grad = defs.append('radialGradient')
    .attr('id', id)
    .attr('r', params.r)
    .attr('cx', params.x)
    .attr('cy', params.y)
    .attr('gradientUnits', params.u)
    .attr('spreadMethod', 'pad');
  for (var i = 0; i < stops.length; i += 1) {
    attrs = stops[i];
    stop = grad.append('stop');
    Object.getOwnPropertyNames(attrs).forEach(function(val) {
      stop.attr(val, attrs[val]);
    });
  }
};

// Creates a rectangle with rounded corners
utility.roundedRectangle = function(x, y, width, height, radius) {
  var s =
    'M' + x + ',' + y +
    'h' + (width - radius * 2) +
    'a' + radius + ',' + radius + ' 0 0 1 ' + radius + ',' + radius +
    'v' + (height - 2 - radius * 2) +
    'a' + radius + ',' + radius + ' 0 0 1 ' + -radius + ',' + radius +
    'h' + (radius * 2 - width) +
    'a' + -radius + ',' + radius + ' 0 0 1 ' + -radius + ',' + -radius +
    'v' + ( -height + radius * 2 + 2 ) +
    'a' + radius + ',' + radius + ' 0 0 1 ' + radius + ',' + -radius +
    'z';
  return s;
};

utility.dropShadow = function(id, defs, options) {
  var opt = options || {};
  var h = opt.height || '130%';
  var o = opt.offset || 2;
  var b = opt.blur || 1;
  var filter;
  var merge;
  if (defs.select('#' + id).empty()) {
    filter = defs.append('filter')
      .attr('id', id)
      .attr('height', h);
    filter.append('feOffset')
      .attr('in', 'SourceGraphic')
      .attr('result', 'offsetBlur')
      .attr('dx', o)
      .attr('dy', o); //how much to offset
    filter.append('feColorMatrix')
      .attr('in', 'offsetBlur')
      .attr('result', 'matrixOut')
      .attr('type', 'matrix')
      .attr('values', '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0');
    filter.append('feGaussianBlur')
      .attr('in', 'matrixOut')
      .attr('result', 'blurOut')
      .attr('stdDeviation', b); //stdDeviation is how much to blur
    merge = filter.append('feMerge');
    merge.append('feMergeNode'); //this contains the offset blurred image
    merge.append('feMergeNode')
      .attr('in', 'SourceGraphic'); //this contains the element that the filter is applied to
  }
  return 'url(#' + id + ')';
};
// <svg xmlns="http://www.w3.org/2000/svg" version="1.1">
  //   <defs>
  //     <filter id="f1" x="0" y="0" width="200%" height="200%">
  //       <feOffset result="offOut" in="SourceGraphic" dx="20" dy="20" />
  //       <feColorMatrix result="matrixOut" in="offOut" type="matrix"
  //       values="0.2 0 0 0 0 0 0.2 0 0 0 0 0 0.2 0 0 0 0 0 1 0" />
  //       <feGaussianBlur result="blurOut" in="matrixOut" stdDeviation="10" />
  //       <feBlend in="SourceGraphic" in2="blurOut" mode="normal" />
  //     </filter>
  //   </defs>
  //   <rect width="90" height="90" stroke="green" stroke-width="3" fill="yellow" filter="url(#f1)" />
// </svg>

utility.createTexture = function(defs, id, x, y) {
  var texture = '#sc-diagonalHatch-' + id;
  var mask = '#sc-textureMask-' + id;
  defs
    .append('pattern')
      .attr('id', 'sc-diagonalHatch-' + id)
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('width', 8)
      .attr('height', 8)
      .append('path')
        .attr('d', 'M-1,1 l2,-2 M0,8 l8,-8 M7,9 l1,-1')
        .attr('class', 'texture-line')
        // .attr('class', classes)
        // .attr('stroke', fill)
        .attr('stroke', '#fff')
        .attr('stroke-linecap', 'square');
  defs
    .append('mask')
      .attr('id', 'sc-textureMask-' + id)
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', '100%')
      .attr('height', '100%')
      .append('rect')
        .attr('x', x || 0)
        .attr('y', y || -1)
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('fill', 'url(' + texture + ')');

  return mask;
};

// String functions
// Deprecated: _format param is ignored. _data is expected to be already formated.
utility.stringSetLengths = function(_data, _container, classes) {
  var lengths = [];
  var txt = _container.select('.tmp-text-strings').select('text');
  if (txt.empty()) {
    txt = _container.append('g').attr('class', 'tmp-text-strings').append('text');
  }
  txt.classed(classes, true);
  txt.style('display', 'inline');
  _data.forEach(function(d) {
      txt.text(d);
      lengths.push(txt.node().getBoundingClientRect().width);
    });
  txt.text('').attr('class', 'tmp-text-strings').style('display', 'none');
  return lengths;
};

// Deprecated: _format param is ignored. _data is expected to be already formated.
utility.stringSetThickness = function(_data, _container, classes) {
  var thicknesses = [];
  var txt = _container.select('.tmp-text-strings').select('text');
  if (txt.empty()) {
    txt = _container.append('g').attr('class', 'tmp-text-strings').append('text');
  }
  txt.classed(classes, true);
  txt.style('display', 'inline');
  _data.forEach(function(d) {
      txt.text(d);
      thicknesses.push(txt.node().getBoundingClientRect().height);
    });
  txt.text('').attr('class', 'tmp-text-strings').style('display', 'none');
  return thicknesses;
};

utility.maxStringSetLength = function(_data, _container, _format, classes) {
  var lengths = utility.stringSetLengths(_data, _container, _format, classes);
  return d3.max(lengths);
};

utility.stringEllipsify = function(_string, _container, _length) {
  var txt = _container.select('.tmp-text-strings').select('text'),
      str = _string,
      len = 0,
      ell = 0,
      strLen = 0;
  if (txt.empty()) {
    txt = _container.append('g').attr('class', 'tmp-text-strings').append('text');
  }
  txt.style('display', 'inline');
  txt.text('...');
  ell = txt.node().getBoundingClientRect().width;
  txt.text(str);
  len = txt.node().getBoundingClientRect().width;
  strLen = len;
  while (len > _length && len > 30) {
    str = str.slice(0, -1);
    txt.text(str);
    len = txt.node().getBoundingClientRect().width + ell;
  }
  txt.text('');
  return str + (strLen > _length ? '...' : '');
};

utility.getTextBBox = function(text, floats) {
  var bbox = text.node().getBoundingClientRect();
  var size = {
        width: floats ? bbox.width : parseInt(bbox.width, 10),
        height: floats ? bbox.height : parseInt(bbox.height, 10),
        top: floats ? bbox.top : parseInt(bbox.top, 10),
        left: floats ? bbox.left : parseInt(bbox.left, 10)
      };
  return size;
};

utility.strip = function(s) {
  return s.replace(/(\s|&)/g,'');
};

utility.isRTLChar = function(c) {
  var rtlChars_ = '\u0591-\u07FF\uFB1D-\uFDFF\uFE70-\uFEFC';
  var rtlCharReg_ = new RegExp('[' + rtlChars_ + ']');
  return rtlCharReg_.test(c);
};

// Numeric functions

// Numbers that are undefined, null or NaN, convert them to zeros.
utility.NaNtoZero = function(n) {
  return utility.isNumeric(n) ? n : 0;
};

utility.polarToCartesian = function(centerX, centerY, radius, angleInDegrees) {
  var angleInRadians = utility.angleToRadians(angleInDegrees);
  var x = centerX + radius * Math.cos(angleInRadians);
  var y = centerY + radius * Math.sin(angleInRadians);
  return [x, y];
};

utility.angleToRadians = function(angleInDegrees) {
  return angleInDegrees * Math.PI / 180.0;
};

utility.angleToDegrees = function(angleInRadians) {
  return angleInRadians * 180.0 / Math.PI;
};

utility.getAbsoluteXY = function(element) {
  var viewportElement = document.documentElement;
  var box = element.getBoundingClientRect();
  var scrollLeft = viewportElement.scrollLeft + document.body.scrollLeft;
  var scrollTop = viewportElement.scrollTop + document.body.scrollTop;
  var x = box.left + scrollLeft;
  var y = box.top + scrollTop;
  return {'left': x, 'top': y};
};

utility.translation = function(x, y) {
  return 'translate(' + x + ',' + y + ')';
};

utility.isNumeric = function(value) {
  var v = parseFloat(value);
  return !isNaN(v) && typeof v === 'number' && isFinite(v);
};

utility.toNative = function(value) {
  var v = utility.isNumeric(parseFloat(value)) ?
    parseFloat(value) :
    value === 'true' ?
      true :
      value === 'false' ?
        false :
        value;
  return v;
};

utility.toBoolean = function(value) {
  var v = utility.isNumeric(parseFloat(value)) ?
    !!parseFloat(value) :
    value === 'true' ?
      true :
      value === 'false' ?
        false :
        value;
  return v;
};

utility.round = function(x, n) {
  // Sigh...
  var ten_n = Math.pow(10, n);
  return Math.round(x * ten_n) / ten_n;
};

utility.countSigFigsAfter = function(value) {
  // consider: d3.precisionFixed(value);
  // if value has decimals
  // compare "$123.45k"
  var re = /^[^\d]*([\d.,\s]+)[^\d]*$/;
  var digits = value.toString().match(re)[1].replace(/[,\s]/, '.');
  var sigfigs = 0;
  if (Math.floor(digits) !== parseFloat(digits)) {
    sigfigs = parseFloat(digits).toString().split('.').pop().length || 0;
  }
  return sigfigs;
};

utility.countSigFigsBefore = function(value) {
  return Math.floor(value).toString().replace(/0+$/g, '').length;
};

utility.siDecimal = function(n) {
  return Math.pow(10, Math.floor(Math.log(n) * Math.LOG10E));
  // return Math.pow(1000, Math.floor((Math.round(parseFloat(n)).toString().length - 1) / 3));
};

utility.siValue = function(si) {
  if (utility.isNumeric(si)) {
    return utility.siDecimal(si);
  }
  var units = {
    y: 1e-24,
    yocto: 1e-24,
    z: 1e-21,
    zepto: 1e-21,
    a: 1e-18,
    atto: 1e-18,
    f: 1e-15,
    femto: 1e-15,
    p: 1e-12,
    pico: 1e-12,
    n: 1e-9,
    nano: 1e-9,
    µ: 1e-6,
    micro: 1e-6,
    m: 1e-3,
    milli: 1e-3,
    k: 1e3,
    kilo: 1e3,
    M: 1e6,
    mega: 1e6,
    G: 1e9,
    giga: 1e9,
    T: 1e12,
    tera: 1e12,
    P: 1e15,
    peta: 1e15,
    E: 1e18,
    exa: 1e18,
    Z: 1e21,
    zetta: 1e21,
    Y: 1e24,
    yotta: 1e24
  };
  return units[si] || 0;
};

utility.numberFormat = function(number, precision, currency, locale) {
  var d, c, m, p, f, s;
  d = parseFloat(number);
  c = typeof currency === 'boolean' ? currency : false;
  if (!utility.isNumeric(d) || (d === 0 && !c)) {
    return number.toString();
  }
  m = utility.countSigFigsAfter(d);
  p = utility.isNumeric(precision)
    ? Math.floor(precision)
    : typeof locale !== 'undefined'
      ? locale.precision
      : c
        ? 2
        : null;
  p = !utility.isNumeric(p)
    ? m
    : m && c
      ? p
      : Math.min(p, m);
  f = typeof locale === 'undefined' ? d3.format : d3.formatLocale(locale).format;
  s = c ? '$,' : ',';
  s += m ? ('.' + p + 'f') : '';
  return f(s)(d);
};

utility.numberFormatFixed = function(d, p, c, l) {
  var f, s;
  if (!utility.isNumeric(d)) {
    return d.toString();
  }
  c = typeof c === 'boolean' ? c : false;
  p = utility.isNumeric(p) ? p : c ? 2 : 0;
  f = typeof l === 'undefined' ? d3.format : d3.formatLocale(l).format;
  s = c ? '$,' : ',';
  s += '.' + p + 'f';
  return f(s)(d);
};

utility.numberFormatSI = function(d, p, c, l) {
  var f, s, m;
  if (!utility.isNumeric(d)) {
    return d;
  }
  c = typeof c === 'boolean' ? c : false;
  p = utility.isNumeric(p) ? p : 0;
  f = typeof l === 'undefined' ? d3.format : d3.formatLocale(l).format;
  m = utility.countSigFigsAfter(d);
  s = c ? '$,' : ',';
  // if currency less than 1k with decimal places
  if (c && m && d < 1000) {
    d = utility.round(d, p);
    m = utility.countSigFigsAfter(d);
    p = Math.min(m, p);
    if (p === 1) {
      p = 2;
    }
    // try using: d = parseFloat(d.toFixed(p)).toString();
    // use fixed formatting with rounding
    s += '.' + p + 'f';
  }
  // if absolute value less than 1
  else if (Math.abs(d) < 1) {
    s += (
      // if rounding to precision results in 0
      +d.toFixed(p) === 0 ?
        // use next si unit
        '.1s' :
        // round to a single significant figure
        '.' + Math.min(p, m) + 'f'
    );
  }
  // if absolute value less than 1k
  else if (Math.abs(d) < 1000) {
    d = utility.round(d, p);
  }
  else {
    f = typeof l === 'undefined' ? d3.formatPrefix : d3.formatLocale(l).formatPrefix;
    if (p !== 0) {
      var d1 = f('.' + p + 's', d)(d);
      var d2 = d1.split('.').pop().replace(/[^\d]+$/, '').match(/0+$/g);
      if (Array.isArray(d2)) {
        p -= d2.pop().length;
      }
    }
    s += '.' + p + 's';
    return f(s, d)(d);
  }
  return f(s)(d);
};

utility.numberFormatSIFixed = function(d, p, c, l, si) {
  var f, s;
  if (!utility.isNumeric(d)) {
    return d.toString();
  }
  c = typeof c === 'boolean' ? c : false;
  p = utility.isNumeric(p) ? p : c ? 2 : 0;
  f = typeof l === 'undefined' ? d3.formatPrefix : d3.formatLocale(l).formatPrefix;
  si = utility.siValue(si);
  s = c ? '$,' : ',';
  s += '.' + p + 's';
  return f(s, si)(d);
};

utility.numberFormatPercent = function(number, total, locale) {
  var t, n, d, p;
  t = parseFloat(total);
  n = utility.isNumeric(t) && t > 0 ? (number * 100 / t) : 100;
  p = locale && typeof locale.precision !== 'undefined' ? locale.precision : 1;
  d = utility.numberFormat(n, p, false, locale);
  //TODO: d3.format does not support locale percent formatting (boo)
  //Some countries have space between number and symbol and some countries put symbol at the beginning
  return d + '%';
};

// Date functions
utility.daysInMonth = function(month, year) {
  return (new Date(year, month+1, 0)).getDate();
};

utility.isValidDate = function(d) {
  if (!d) {
    return false;
  }
  return d instanceof Date && !isNaN(d.valueOf());
};

// accepts (ISO, W3C, RFC 822):
// 2012,
// '2012',
// 1330837567000,
// '1330837567000',
// '2012-03-04T05:06:07.000Z',
// '2012-03-04T00:06:07.000-05:00',
// '2012-03-04T05:06:07.000Z',
// 'March 4, 2012, 0:06:07 AM',
// 'March 4, 2012, 5:06:07 AM GMT',
// 'Sun Mar 04 2012 05:06:07 GMT+0000 (UTC)',
// 'Sun Mar 04 2012 00:06:07 GMT-0500 (EST)'
utility.parseDatetime = function(d) {
  var date;
  // only for 1991 or '1991'
  if (utility.isNumeric(Math.floor(d)) && d.toString().length === 4) {
    // date.setUTCMilliseconds(date.getUTCMilliseconds() - date.getTimezoneOffset() * 60000);
    // append day and month parts and GMT to get correct UTC offset
    date = new Date(Math.floor(d) + '-1-1 GMT');
  }
  // only for '1330837567000' or 1330837567000
  //   it will not fire for a Date object
  //   if you use Math.floor, Date object would convert to number
  else if (parseInt(d, 10).toString() === d || parseInt(d, 10) === d) {
    date = new Date(parseInt(d, 10));
  }
  // only for Date object or Date string
  else {
    // convert a numeric timestamp: 1330837567000
    // or convert a date string: 'Sun Mar 04 2012 05:06:07 GMT+0000 (UTC)'
    date = new Date(d);
    //Q: what should we do about dt strings w/o timezone?
    //'March 4, 2012, 0:06:07 AM'
    if (
      d.toString().substr(-1) !== 'Z' &&
      d.toString().indexOf('GMT') === -1 &&
      !d.toString().match(/\d\d\d\d-\d\d-\d\dT/)
    ) {
      // force to UTC
      date.setUTCMilliseconds(date.getUTCMilliseconds() - date.getTimezoneOffset() * 60000);
    }
  }
  if (!utility.isValidDate(date)) {
    date = d;
  }
  return date;
};

// expects an array of dates constructed from local datetime strings without GTM
// for instance: "2/3/1991, 4:05:06 AM" or "1991-2-3" which evaluates as
// Sun Feb 03 1991 04:05:06 GMT-0500 (EST). The GMT offset is ignored.
utility.getDateFormat = function(values, utc) {
  //TODO: use locality format strings mmmmY, etc.
  var dateFormats = [
    'multi',
    '%x, %I:%M:%S.%L %p',
    '%x, %I:%M:%S %p',
    '%x, %I:%M %p',
    '%x, %I %p',
    '%x',
    '%b %d',
    '%B %Y',
    '%Y'
  ];

  var formatIndex = values.length ? d3.min(values, function(date) {
    if (utc === true) {
      date.setUTCMilliseconds(date.getUTCMilliseconds() + date.getTimezoneOffset() * 60000);
    }
    var d = new Date(date);
    var format;
    // if round to second is less than date
    if (+d3.timeSecond(date) < +d) {
      // use millisecond format - .%L
      format = 1;
    }
    else
    // if round to minute is less than date
    if (+d3.timeMinute(date) < +d) {
      // use second format - :%S
      format = 2;
    }
    else
    // if round to hour is less than date
    if (+d3.timeHour(date) < +d) {
      // use minute format - %I:%M
      format = 3;
    }
    else
    // if round to day is less than date
    if (+d3.timeDay(date) < +d) {
      // use hour format - %I %p
      format = 4;
    }
    else
    // if round to month is less than date
    if (+d3.timeMonth(date) < +d) {
      // use day format - %x
      format = 5; // format = (d3.timeWeek(date) < date ? 4 : 5);
    }
    else
    // if round to year is less than date
    if (+d3.timeYear(date) < +d) {
      // use month format - %B
      format = 7;
    }
    else
    // as last resort
    {
      // use year format - %Y
      format = 8;
    }
    return format;
  }) : 8;

  return dateFormats[formatIndex];
};

// expects an array of date objects adjusted to GMT
// for instance: "Sun Feb 03 1991 04:05:06 GMT" which evaluates as
// Sun Feb 03 1991 04:05:06 GMT
utility.getDateFormatUTC = function(values) {
  //TODO: use locality format strings mmmmY, etc.
  var dateFormats = [
    'multi',
    '%x, %I:%M:%S.%L %p',
    '%x, %I:%M:%S %p',
    '%x, %I:%M %p',
    '%x, %I %p',
    '%x',
    '%b %d',
    '%B %Y',
    '%Y'
  ];

  var formatIndex = values.length ? d3.min(values, function(date) {
    var d = new Date(date);
    var format;
    // if round to second is less than date
    if (+d3.utcSecond(date) < +d) {
      // use millisecond format - .%L
      format = 1;
    }
    else
    // if round to minute is less than date
    if (+d3.utcMinute(date) < +d) {
      // use second format - :%S
      format = 2;
    }
    else
    // if round to hour is less than date
    if (+d3.utcHour(date) < +d) {
      // use minute format - %I:%M
      format = 3;
    }
    else
    // if round to day is less than date
    if (+d3.utcDay(date) < +d) {
      // use hour format - %I %p
      format = 4;
    }
    else
    // if round to month is less than date
    if (+d3.utcMonth(date) < +d) {
      // use day format - %x
      format = 5; // format = (d3.utcWeek(date) < date ? 4 : 5);
    }
    else
    // if round to year is less than date
    if (+d3.utcYear(date) < +d) {
      // use month format - %B
      format = 7;
    }
    else
    // as last resort
    {
      // use year format - %Y
      format = 8;
    }
    return format;
  }) : 8;
  return dateFormats[formatIndex];
};

utility.multiFormat = function(date, utc) {
  return utc === false ?
    utility.getDateFormat([date]) :
    utility.getDateFormatUTC([date]);
};

// expects string or date object
utility.dateFormat = function(d, p, l) {
  var locale, fmtr, spec;
  var date = utility.parseDatetime(d);

  if (!utility.isValidDate(date)) {
    return d;
  }

  if (l && l.hasOwnProperty('utcFormat')) {
    // Use rebuilt locale formatter
    fmtr = l.utcFormat;
    spec = p ? p.indexOf('%') !== -1 ? p : utility.multiFormat(date) : '%Y';
  } else {
    // Ensure locality object has all needed properties
    // TODO: this is expensive so consider removing
    locale = utility.buildLocality(l);
    fmtr = d3.timeFormatLocale(locale).utcFormat;
    spec = p ? p.indexOf('%') !== -1 ? p : locale[p] || utility.multiFormat(date) : '%Y';
    // TODO: if not explicit pattern provided, we should use .multi()
  }
  return fmtr(spec)(date);
};

utility.buildLocality = function(l, d) {
  var locale = l || {};
  var deep = !!d;
  var unfer = function(a) {
        return a.join('|').split('|').map(function(b) {
          return !(b) ? '' : isNaN(b) ? b : +b;
        });
      };
  var definition = {
        'decimal': '.',
        'thousands': ',',
        'grouping': [3],
        'currency': ['$', ''],
        'precision': 2,
        'periods': ['AM', 'PM'],
        'days': ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        'shortDays': ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        'months': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        'shortMonths': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        'date': '%b %-d, %Y', //%x
        'time': '%-I:%M:%S %p', //%X
        'dateTime': '%B %-d, %Y at %X GMT%Z', //%c
        // Custom patterns
        'full': '%A, %c',
        'long': '%c',
        'medium': '%x, %X',
        'short': '%-m/%-d/%y, %-I:%M %p',
        'yMMMEd': '%a, %x',
        'yMEd': '%a, %-m/%-d/%Y',
        'yMMMMd': '%B %-d, %Y',
        'yMMMd': '%x',
        'yMd': '%-m/%-d/%Y',
        'yMMMM': '%B %Y',
        'yMMM': '%b %Y',
        'MMMd': '%b %-d',
        'MMMM': '%B',
        'MMM': '%b',
        'y': '%Y'
      };

  Object.getOwnPropertyNames(locale).forEach(function(key) {
    var def = locale[key];
    definition[key] = !deep || !Array.isArray(def) ? def : unfer(def);
  });

  return definition;
};

utility.displayNoData = function(hasData, container, label, x, y) {
  var data = hasData ? [] : [label];
  var noData_bind = container.selectAll('.sc-no-data').data(data);
  var noData_entr = noData_bind.enter().append('text')
        .attr('class', 'sc-no-data')
        .attr('dy', '-.7em')
        .style('text-anchor', 'middle');
  var noData = container.selectAll('.sc-no-data').merge(noData_entr);
  noData_bind.exit().remove();
  if (!!data.length) {
    noData
      .attr('x', x)
      .attr('y', y)
      .text(utility.identity);
    container.selectAll('.sc-chart-wrap').remove();
    return true;
  } else {
    return false;
  }
};

/*-------------------
       TOOLTIP
-------------------*/

var tooltip = (function() {

  function replacer(content, point, strings) {
      return content
        .replace(/>\s+</gm, '><')
        .replace(/{{(\w+)}}/gm, function(m, p) {
          return point[p] || p;
        })
        .replace(/{{str\s([\w.]+)}}/gm, function(m, p) {
          return strings.translate(p);
        });
  }

  return {
    show: function(evt, content, gravity, dist, container, classes) {
      var wrapper = document.createElement('div'),
          inner = document.createElement('div'),
          arrow = document.createElement('div');

      gravity = gravity || 's';
      dist = dist || 5;

      inner.className = 'tooltip-inner';
      arrow.className = 'tooltip-arrow';
      inner.innerHTML = content;
      wrapper.style.left = 0;
      wrapper.style.top = -1000;
      wrapper.style.opacity = 0;
      wrapper.className = (classes || 'sc-tooltip') + ' tooltip xy-tooltip in';

      wrapper.appendChild(inner);
      wrapper.appendChild(arrow);
      container.appendChild(wrapper);

      tooltip.position(container, wrapper, evt, gravity, dist);
      wrapper.style.opacity = 1;

      return wrapper;
    },

    cleanup: function() {
      // Find the tooltips, mark them for removal by this class
      // (so others cleanups won't find it)
      var tooltips = document.getElementsByClassName('tooltip'),
          purging = [],
          i = tooltips.length;

      while (i > 0) {
        i -= 1;

        if (tooltips[i].className.indexOf('xy-tooltip') !== -1) {
          purging.push(tooltips[i]);
          tooltips[i].style.transitionDelay = '0 !important';
          tooltips[i].style.opacity = 0;
          tooltips[i].className = 'sctooltip-pending-removal out';
        }
      }

      setTimeout(function() {
        var removeMe;
        while (purging.length) {
          removeMe = purging.pop();
          removeMe.parentNode.removeChild(removeMe);
        }
      }, 500);
    },

    position: function(container, wrapper, evt, gravity, dist) {
      gravity = gravity || 's';
      dist = dist || 5;

      var rect = container.getBoundingClientRect();

      var pos = [
            evt.clientX - rect.left,
            evt.clientY - rect.top
          ];

      var wrapperWidth = parseInt(wrapper.offsetWidth, 10),
          wrapperHeight = parseInt(wrapper.offsetHeight, 10),
          containerWidth = container.clientWidth,
          containerHeight = container.clientHeight,
          containerLeft = container.scrollLeft,
          containerTop = container.scrollTop,
          class_name = wrapper.className.replace(/ top| right| bottom| left/g, ''),
          left, top;

      function alignCenter() {
        var left = pos[0] - (wrapperWidth / 2);
        if (left < containerLeft) left = containerLeft;
        if (left + wrapperWidth > containerWidth) left = containerWidth - wrapperWidth;
        return left;
      }
      function alignMiddle() {
        var top = pos[1] - (wrapperHeight / 2);
        if (top < containerTop) top = containerTop;
        if (top + wrapperHeight > containerTop + containerHeight) top = containerTop - wrapperHeight;
        return top;
      }
      function arrowLeft(left) {
        var marginLeft = pos[0] - (wrapperWidth / 2) - left - 5,
            arrow = wrapper.getElementsByClassName('tooltip-arrow')[0];
        arrow.style.marginLeft = marginLeft + 'px';
      }
      function arrowTop(top) {
        var marginTop = pos[1] - (wrapperHeight / 2) - top - 5,
            arrow = wrapper.getElementsByClassName('tooltip-arrow')[0];
        arrow.style.marginTop = marginTop + 'px';
      }

      switch (gravity) {
        case 'e':
          top = alignMiddle();
          left = pos[0] - wrapperWidth - dist;
          arrowTop(top);
          if (left < containerLeft) {
            left = pos[0] + dist;
            class_name += ' right';
          } else {
            class_name += ' left';
          }
          break;
        case 'w':
          top = alignMiddle();
          left = pos[0] + dist;
          arrowTop(top);
          if (left + wrapperWidth > containerWidth) {
            left = pos[0] - wrapperWidth - dist;
            class_name += ' left';
          } else {
            class_name += ' right';
          }
          break;
        case 'n':
          left = alignCenter();
          top = pos[1] + dist;
          arrowLeft(left);
          if (top + wrapperHeight > containerTop + containerHeight) {
            top = pos[1] - wrapperHeight - dist;
            class_name += ' top';
          } else {
            class_name += ' bottom';
          }
          break;
        case 's':
          left = alignCenter();
          top = pos[1] - wrapperHeight - dist;
          arrowLeft(left);
          if (containerTop > top) {
            top = pos[1] + dist;
            class_name += ' bottom';
          } else {
            class_name += ' top';
          }
          break;
      }

      wrapper.style.left = left + 'px';
      wrapper.style.top = top + 'px';
      wrapper.className = class_name;
    },

    single: function(point, strings) {
      var content =
        '<div class="tooltip-header"> \
            <b>{{key}}</b> \
        </div> \
        <div class="tooltip-grid"> \
            <p><span>{{label}}</span> <span>{{value}}</span></p>' +
            (typeof point.percent !== 'undefined' && String(point.percent).length
              ? '<p><span>{{str tooltip.percent}}</span> <span>{{percent}}%</span></p>'
              : ''
            ) +
        '</div>' +
        (typeof point.msg !== 'undefined' && point.msg.length
          ? '<div class="tooltip-status"><i>{{msg}}</i></div>'
          : ''
        );

        return replacer(content, point, strings);
    },

    multi: function(point, strings) {
      var content =
        '<div class="tooltip-grid"> \
            <p><span>{{groupName}}</span> <span>{{groupLabel}}</span></p>' +
            (typeof point.seriesName !== 'undefined' && String(point.seriesName).length
              ? '<p><span>{{seriesName}}</span> <span>{{seriesLabel}}</span></p>'
              : ''
            ) +
            '<p><span>{{valueName}}</span> <span>{{valueLabel}}</span></p>' +
            (typeof point.percent !== 'undefined' && String(point.percent).length
              ? '<p><span>{{str tooltip.percent}}</span> <span>{{percent}}%</span></p>'
              : ''
            ) +
        '</div>' +
        (typeof point.msg !== 'undefined' && point.msg.length
          ? '<div class="tooltip-status"><i>{{msg}}</i></div>'
          : ''
        );

        return replacer(content, point, strings);
    }
  };
})();

/*-------------------
       TRANSLATE
-------------------*/

var language = (function() {

  function decompose(obj, store) {
    var keys = obj ? Object.getOwnPropertyNames(obj) : [];
    if (keys.length) {
      keys.forEach(function(key) {
        var prop = obj[key];
        if (typeof prop === 'string' || prop instanceof String) {
          store[key] = prop.toString();
        } else {
          var ref = store[key] || (store[key] = {});
          if (ref instanceof Object && !(ref instanceof Date) && !(ref instanceof Function)) {
            decompose(prop, ref);
          }
        }
      });
    }
  }

  return function(lang) {
    var strings = {
      legend: {
        close: 'Hide legend',
        open: 'Show legend',
        noLabel: 'undefined'
      },
      controls: {
        close: 'Hide controls',
        open: 'Show controls'
      },
      tooltip: {
        amount: 'Amount',
        count: 'Count',
        date: 'Date',
        group: 'Group',
        key: 'Key',
        percent: 'Percent'
      },
      noData: 'No Data Available.',
      noLabel: 'undefined',
      displayError: 'The chart cannot be displayed due to its configuration.'
    };

    strings.translate = function(label) {
      var keys = label.split('.');
      var string = strings[keys[0]];
      return typeof string === 'string'
        ? string
        : keys.length === 2
          ? string[keys[1]]
          : label;
    };

    decompose(lang, strings);
    return strings;
  };
})();

function area() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 960,
      height = 500,
      getX = function(d) { return d.x; }, // accessor to get the x value from a data point
      getY = function(d) { return d.y; }, // accessor to get the y value from a data point
      id = Math.floor(Math.random() * 100000), //Create semi-unique ID incase user doesn't select one
      x = d3.scaleLinear(), //can be accessed via model.xScale()
      y = d3.scaleLinear(), //can be accessed via model.yScale()
      clipEdge = false, // if true, masks lines within x and y scale
      delay = 0, // transition
      duration = 0, // transition
      locality = utility.buildLocality(),
      direction = 'ltr',
      style = 'stack',
      offset = 'zero',
      order = 'default',
      interpolate = 'linear',  // controls the line interpolation
      xDomain = null, // Override x domain (skips the calculation from data)
      yDomain = null, // Override y domain
      forceX = [],
      forceY = [],
      color = function(d, i) { return utility.defaultColor()(d, d.seriesIndex); },
      gradient = utility.colorLinearGradient,
      fill = color,
      classes = function(d, i) { return 'sc-area sc-series-' + d.seriesIndex; },
      dispatch =  d3.dispatch('tooltipShow', 'tooltipHide', 'tooltipMove', 'elementClick', 'elementMouseover', 'elementMouseout', 'elementMousemove');

  /************************************
   * offset:
   *   'zero' (stacked) d3.stackOffsetNone
   *   'wiggle' (stream) d3.stackOffsetWiggle
   *   'expand' (normalize to 100%) d3.stackOffsetExpand
   *   'silhouette' (simple centered) d3.stackOffsetSilhouette
   *
   * order:
   *   'default' (input order) d3.stackOrderNone
   *   'inside-out' (stream) d3.stackOrderInsideOut
   ************************************/

  var data0;
  var y0 = y.copy();

  //============================================================

  function model(selection) {
    selection.each(function(chartData) {

      var container = d3.select(this);

      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom;

      var curve =
            interpolate === 'linear' ? d3.curveLinear :
            interpolate === 'cardinal' ? d3.curveCardinal :
            interpolate === 'monotone' ? d3.curveMonotoneX :
            interpolate === 'basis' ? d3.curveBasis : d3.curveNatural;
      var stackOffsetIndex = [['zero', 'wiggle', 'expand', 'silhouette'].indexOf(offset)];
      var stackOffset = [d3.stackOffsetNone, d3.stackOffsetWiggle, d3.stackOffsetExpand, d3.stackOffsetSilhouette][stackOffsetIndex];
      var stackOrderIndex = [['default', 'inside-out'].indexOf(order)];
      var stackOrder = [d3.stackOrderNone, d3.stackOrderInsideOut][stackOrderIndex];

      //------------------------------------------------------------
      // Process data

      var stack = d3.stack()
            .offset(stackOffset)
            .order(stackOrder)
            .value(function(d, k) {
              return d[k];
            });

      var indexedData = {};
      chartData.forEach(function(s, i) {
        s.values.forEach(function(p, j) {
          var x = p.x;
          var y = p.y;
          if (!indexedData[x]) {
            indexedData[x] = [];
            indexedData[x].x = x;
          }
          indexedData[x].push(y);
        });
      });

      var keys = d3.keys(indexedData);
      var xValues = keys.map(function(d) { return parseInt(d, 10); });
      var data = stack.keys(d3.range(0, chartData.length))(d3.values(indexedData));

      var min = d3.min(data, function(series) {
              return d3.min(series, function(point) {
                return d3.min(point, function(d) {
                  return d;
                });
              });
            });
      var max = d3.max(data, function(series) {
              return d3.max(series, function(point) {
                return d3.max(point, function(d) {
                  return d;
                });
              });
            });

      data.forEach(function(s, i) {
        s.key = chartData[i].key;
        s.seriesIndex = chartData[i].seriesIndex;
        s.total = chartData[i].total;
        s.color = chartData[i].color;
        s.class = chartData[i].classes;
        s.forEach(function(p, j) {
          p.seriesIndex = chartData[i].seriesIndex;
          p.si0 = i - 1;
          // shift streamgraph for each point in series
          if (min) {
              p[0] -= min;
              p[1] -= min;
          }
        });
      });

      //------------------------------------------------------------
      // Rendering functions

      var areaEnter = d3.area()
            .curve(curve)
            .x(function(d) { return x(d.data.x); })
            .y0(function(d, i) {
              var d0 = data0 ? data0[d.si0] : null;
              return (d0 && d0[i]) ? y0(d0[i][1]) : y0(0);
            })
            .y1(function(d, i) {
              var d0 = data0 ? data0[d.si0] : null;
              return (d0 && d0[i]) ? y0(d0[i][1]) : y0(0);
            });

      var area = d3.area()
            .curve(curve)
            .x(function(d) { return x(d.data.x); })
            .y0(function(d) { return y(d[0]); })
            .y1(function(d) { return y(d[1]); });

      var areaExit = d3.area()
            .curve(curve)
            .x(function(d) { return x(d.data.x); })
            .y0(function(d, i) {
              var d0 = data[d.si0];
              return (d0 && d0[i]) ? y(d0[i][1]) : y(0);
            })
            .y1(function(d, i) {
              var d0 = data[d.si0];
              return (d0 && d0[i]) ? y(d0[i][1]) : y(0);
            });

      var tran = d3.transition('area')
            .duration(duration)
            .ease(d3.easeLinear);

      //------------------------------------------------------------
      // Setup Scales

      x.domain(d3.extent(xValues)).range([0, availableWidth]);
      y.domain([0, max - min]).range([availableHeight, 0]);

      model.resetDimensions = function(w, h) {
        width = w;
        height = h;
        availableWidth = w - margin.left - margin.right;
        availableHeight = h - margin.top - margin.bottom;
        x.range([0, availableWidth]);
        y.range([availableHeight, 0]);
      };

      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap_bind = container.selectAll('g.sc-wrap.sc-area').data([data]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-wrap sc-area');
      var wrap = container.select('.sc-wrap.sc-area').merge(wrap_entr);

      var defs_entr = wrap_entr.append('defs');
      var defs = wrap.select('defs');

      wrap_entr.append('g').attr('class', 'sc-group');
      var group_wrap = wrap.select('.sc-group');

      wrap.attr('transform', utility.translation(margin.left, margin.top));

      //------------------------------------------------------------

      defs_entr.append('clipPath')
        .attr('id', 'sc-edge-clip-' + id)
        .append('rect');

      defs.select('#sc-edge-clip-' + id + ' rect')
        .attr('width', availableWidth)
        .attr('height', availableHeight);

      wrap.attr('clip-path', clipEdge ? 'url(#sc-edge-clip-' + id + ')' : '');

      // set up the gradient constructor function
      model.gradientFill = function(d, i, params) {
        var gradientId = id + '-' + i;
        var c = color(d, i);
        return gradient(d, gradientId, params, c, defs);
      };

      //------------------------------------------------------------
      // Series

      var series_bind = group_wrap.selectAll('g.sc-series').data(data, function(d) { return d.seriesIndex; });
      var series_entr = series_bind.enter().append('g')
            .attr('class', 'sc-series')
            .style('stroke-opacity', 1e-6)
            .style('fill-opacity', 1e-6);
      var series = group_wrap.selectAll('.sc-series').merge(series_entr);

      series
        .attr('fill', fill)
        .attr('stroke', color)
        .attr('class', classes)
        .classed('hover', function(d) { return d.hover; });
      series
        .transition(tran)
          .style('stroke-opacity', 1)
          .style('fill-opacity', 0.5);
      series_bind.exit()
        .transition(tran)
          .style('stroke-opacity', 1e-6)
          .style('fill-opacity', 1e-6)
          .remove();

      //------------------------------------------------------------
      // Areas

      var areas_bind = series.selectAll('path.sc-area').data(function(d) { return [d]; }); // note the special treatment of data
      var areas_entr = areas_bind.enter().append('path').attr('class', 'sc-area sc-enter');
      var areas = series.selectAll('.sc-area').merge(areas_entr);

      areas
        .filter(function(d) {
          return d3.select(this).classed('sc-enter');
        })
        .attr('d', areaEnter);

      areas
        .transition(tran)
          .attr('d', area)
          .on('end', function(d) {
            d3.select(this).classed('sc-enter', false);
            // store previous data for transitions
            data0 = data.map(function(s) {
              return s.map(function(p) {
                return [p[0], p[1]];
              });
            });
            // store previous scale for transitions
            y0 = y.copy();
          });

      series_bind.exit()
        .transition(tran).selectAll('.sc-area')
          .attr('d', areaExit)
          .remove();

      function buildEventObject(e, d, i) {
        return {
            point: d,
            seriesKey: d.key,
            seriesIndex: d.seriesIndex,
            e: e
          };
      }

      areas
        .on('mouseover', function(d, i) {
          var eo = buildEventObject(d3.event, d, i);
          dispatch.call('elementMouseover', this, eo);
          d3.select(this).classed('hover', true);
        })
        .on('mousemove', function(d, i) {
          var eo = buildEventObject(d3.event, d, i);
          var rect = wrap.select('#sc-edge-clip-' + id + ' rect').node().getBoundingClientRect();
          var xpos = d3.event.clientX - rect.left;
          var index = Math.round((xpos * xValues.length) / availableWidth) - 1;
          eo.data = data.map(function(d, i) {
            var point = [d[index].data.x, d[index][1]];
            point.seriesKey = d.key;
            point.seriesIndex = d.seriesIndex;
            return point;
          });
          eo.pointIndex = index;
          eo.origin = rect;

          dispatch.call('elementMousemove', this, eo);
        })
        .on('mouseout', function(d, i) {
          dispatch.call('elementMouseout', this);
          d3.select(this).classed('hover', false);
        })
        .on('click', function(d, i) {
          var eo = buildEventObject(d3.event, d, i);
          d3.event.stopPropagation();
          d3.select(this).classed('hover', false);
          dispatch.call('elementClick', this, eo);
        });

      //store old scales for use in transitions on update
      y0 = y.copy();

    });

    return model;
  }

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  model.dispatch = dispatch;

  model.id = function(_) {
    if (!arguments.length) { return id; }
    id = _;
    return model;
  };

  model.color = function(_) {
    if (!arguments.length) { return color; }
    color = _;
    return model;
  };
  model.fill = function(_) {
    if (!arguments.length) { return fill; }
    fill = _;
    return model;
  };
  model.classes = function(_) {
    if (!arguments.length) { return classes; }
    classes = _;
    return model;
  };
  model.gradient = function(_) {
    if (!arguments.length) { return gradient; }
    gradient = _;
    return model;
  };

  model.margin = function(_) {
    if (!arguments.length) { return margin; }
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        margin[prop] = _[prop];
      }
    }
    return model;
  };
  model.width = function(_) {
    if (!arguments.length) { return width; }
    width = _;
    return model;
  };
  model.height = function(_) {
    if (!arguments.length) { return height; }
    height = _;
    return model;
  };
  model.clipEdge = function(_) {
    if (!arguments.length) { return clipEdge; }
    clipEdge = _;
    return model;
  };

  model.x = function(_) {
    if (!arguments.length) { return getX; }
    getX = _;
    return model;
  };
  model.y = function(_) {
    if (!arguments.length) { return getY; }
    getY = _;
    return model;
  };
  model.xScale = function(_) {
    if (!arguments.length) { return x; }
    x = _;
    return model;
  };
  model.yScale = function(_) {
    if (!arguments.length) { return y; }
    y = _;
    return model;
  };
  model.xDomain = function(_) {
    if (!arguments.length) { return xDomain; }
    xDomain = _;
    return model;
  };
  model.yDomain = function(_) {
    if (!arguments.length) { return yDomain; }
    yDomain = _;
    return model;
  };
  model.forceX = function(_) {
    if (!arguments.length) { return forceX; }
    forceX = _;
    return model;
  };
  model.forceY = function(_) {
    if (!arguments.length) { return forceY; }
    forceY = _;
    return model;
  };

  model.delay = function(_) {
    if (!arguments.length) { return delay; }
    delay = _;
    return model;
  };
  model.duration = function(_) {
    if (!arguments.length) { return duration; }
    duration = _;
    return model;
  };

  model.locality = function(_) {
    if (!arguments.length) { return locality; }
    locality = utility.buildLocality(_);
    return model;
  };
  model.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    return model;
  };

  model.interpolate = function(_) {
    if (!arguments.length) { return interpolate; }
    interpolate = _;
    return model;
  };
  model.offset = function(_) {
    if (!arguments.length) { return offset; }
    offset = _;
    return model;
  };
  model.order = function(_) {
    if (!arguments.length) { return order; }
    order = _;
    return model;
  };
  //shortcut for offset + order
  model.style = function(_) {
    if (!arguments.length) { return style; }
    style = _;

    switch (style) {
      case 'stack':
        model.offset('zero');
        model.order('default');
        break;
      case 'stream':
        model.offset('wiggle');
        model.order('inside-out');
        break;
      case 'stream-center':
          model.offset('silhouette');
          model.order('inside-out');
          break;
      case 'expand':
        model.offset('expand');
        model.order('default');
        break;
    }

    return model;
  };

  //============================================================

  return model;
}

function axis() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var scale = d3.scaleLinear(),
      axisLabelText = null,
      showMaxMin = true,
      highlightZero = true,
      direction = 'ltr',
      orient = 'bottom',
      wrapTicks = false,
      staggerTicks = false,
      rotateTicks = 30, //one of (rotateTicks, staggerTicks, wrapTicks)
      reduceXTicks = false, // if false a tick will show for every data point
      rotateYLabel = true,
      hasRangeBand = false,
      textAnchor = null,
      ticks = null,
      tickPadding = 4,
      valueFormat = function(d) { return d; },
      axisLabelDistance = 8; //The larger this number is, the closer the axis label is to the axis.

  var tickFormat, tickValues, tickSize, tickSizeInner, tickSizeOuter;

  // Public Read-only Variables
  //------------------------------------------------------------
  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      thickness = 0;

  var axis = d3.axisBottom();

  // Private Variables
  //------------------------------------------------------------
  var scale0;

  //============================================================

  function model(selection) {
    selection.each(function(data) {

      var container = d3.select(this);
      var scaleCalc = axis.scale().copy();
      var marginCalc = {top: 0, right: 0, bottom: 0, left: 0};
      var extent = getRangeExtent();
      var scaleWidth = Math.abs(extent[1] - extent[0]);

      // Private
      scale0 = scale0 || axis.scale();

      var vertical = orient === 'left' || orient === 'right' ? true : false,
          reflect = orient === 'left' || orient === 'top' ? -1 : 1,
          maxLabelWidth = 0,
          maxLabelHeight = 0,
          tickGap = 6,
          labelThickness = 0,
          minSpacing = 0;

      var tickDimensions = [],
          tickDimsHash = {},
          minTickDims = {},
          maxTickDims = {};

      //------------------------------------------------------------
      // reset public readonly variables
      thickness = 0;

      if (ticks !== null) {
        axis.ticks(ticks);
      } else if (vertical) {
        axis.ticks(Math.ceil(scaleWidth / 48));
      } else {
        axis.ticks(Math.ceil(scaleWidth / 100));
      }

      // wrap
      axis.tickFormat(function(d, i, selection) {
        return valueFormat(d, i, selection, 'axis');
      });

      // test to see if rotateTicks was passed as a boolean
      if (rotateTicks && !utility.isNumeric(String(rotateTicks))) {
        rotateTicks = 30;
      }

      // ordinal scales do not have max-min values
      if (hasRangeBand) {
        showMaxMin = false;
      }

      //------------------------------------------------------------
      // Setup containers and skeleton of axis

      var wrap_bind = container.selectAll('g.sc-wrap.sc-axis').data([data]);
      var wrap_entr = wrap_bind.enter()
            .append('g').attr('class', 'sc-wrap sc-axis')
            .append('g').attr('class', 'sc-axis-inner');
      var wrap = container.select('.sc-axis-inner').merge(wrap_entr);

      wrap.call(axis);

      // Axis ticks
      var axisTicks = wrap.selectAll('g.tick');

      // Min Max ticks
      var axisMaxMin_data = showMaxMin ? d3.extent(scale.domain()) : [];
      var axisMaxMin_bind = wrap.selectAll('g.sc-axisMaxMin').data(axisMaxMin_data);
      var axisMaxMin_entr = axisMaxMin_bind.enter().append('g').attr('class', 'sc-axisMaxMin');
      axisMaxMin_bind.exit().remove();
      var axisMaxMin = wrap.selectAll('g.sc-axisMaxMin').merge(axisMaxMin_entr);

      axisMaxMin_entr.append('text').style('opacity', 1);

      var maxminText = axisMaxMin.select('text');

      // Get all axes and maxmin tick text for text handling functions
      var tickText = wrap.selectAll('g.tick, g.sc-axisMaxMin').select('text')
            .filter(function(d) {
              return this.getBoundingClientRect().width;
            });

      // Axis label
      var axisLabel_data = !!axisLabelText ? [axisLabelText] : [];
      var axisLabel_bind = wrap.selectAll('text.sc-axislabel').data(axisLabel_data);
      var axisLabel_entr = axisLabel_bind.enter().append('text').attr('class', 'sc-axislabel');
      axisLabel_bind.exit().remove();
      var axisLabel = wrap.selectAll('text.sc-axislabel').merge(axisLabel_entr);

      axisLabel
        .text(utility.identity);

      //------------------------------------------------------------
      // Tick label handling

      var wrapSucceeded = false,
          staggerSucceeded = false,
          rotateSucceeded = false;

      if (vertical) {

        resetTicks(true);

        tickText
          .style('text-anchor', rtlTextAnchor(textAnchor || (isMirrored() ? 'start' : 'end')));

      } else {

        resetTicks(false);
        recalcMargin();

        if (labelCollision(1)) {

          // if wrap is enabled, try it first (for ordinal scales only)
          if (wrapTicks) {
            resetTicks(false);
            handleWrap();
            recalcMargin();
            handleWrap();
            // check to see if we still have collisions
            if (!labelCollision(1)) {
              wrapSucceeded = true;
            }
          }

          // wrapping failed so fall back to stagger if enabled
          if (!wrapSucceeded && staggerTicks) {
            resetTicks(false);
            handleStagger();
            recalcMargin();
            handleStagger();
            // check to see if we still have collisions
            if (!labelCollision(2)) {
              staggerSucceeded = true;
            }
          }

          // if we still have a collision
          // add a test in the following if block to support opt-out of rotate method
          if (!wrapSucceeded && !staggerSucceeded) {
            if (!rotateTicks) {
              rotateTicks = 30;
            }
            resetTicks(true);
            if (!vertical) {
              minSpacing = maxLabelHeight / Math.sin(rotateTicks * Math.PI / 180);
            }
            handleRotation(rotateTicks);
            recalcMargin(rotateTicks);
            handleRotation(rotateTicks);
            rotateSucceeded = true;
          }
        }
      }

      //------------------------------------------------------------
      // Min Max values

      if (showMaxMin) {

        //check if max and min overlap other values, if so, hide the values that overlap
        axisTicks.each(function(d, i) {
            var tick = d3.select(this),
                dim = tickDimsHash['key-' + d.toString()],
                collision = false,
                isExtent = scaleCalc(d) === extent[0] || scaleCalc(d) === extent[1];

            if (isExtent) {
              collision = true;
            } else if (typeof dim !== 'undefined') {
              if (vertical) {
                collision = minTickDims.top - dim.bottom + 1 < 0 || dim.top - maxTickDims.bottom < 0;
              } else if (rotateSucceeded) {
                collision = dim.left - minSpacing / 2 < minTickDims.left || dim.left + minSpacing / 2 > maxTickDims.left;
              } else if (staggerSucceeded) {
                collision = (dim.left - tickGap < minTickDims.right || dim.right + tickGap > maxTickDims.left) &&
                            (dim.bottom === minTickDims.bottom || dim.bottom < minTickDims.top || dim.top > maxTickDims.bottom);
              } else {
                collision = dim.left - tickGap < minTickDims.right || dim.right + tickGap > maxTickDims.left;
              }
            }

            tick.select('line')
              .classed('extent', isExtent);
            tick.select('text')
              .style('opacity', 1 - collision);
          });

      } else {

        // hide tick line if same as domain line
        axisTicks.select('line')
          .style('stroke-opacity', function(d) {
            return scaleCalc(d) === extent[0 + isMirrored()] ? 0 : null;
          });

      }

      //highlight zero line ... Maybe should not be an option and should just be in CSS?
      axisTicks
        .filter(function(d) {
          // accounts for minor floating point errors...
          // this is because sometimes the 0 tick is a very small fraction,
          // though could be problematic if the scale is EXTREMELY SMALL
          //TODO: think of cleaner technique
          // return d === 0;
          // return !parseFloat(Math.round(d * 100000) / 1000000);
          // return scaleCalc(d) === extent[0 + isMirrored()];
          return d < 1e-10 && d > -1e-10 && scaleCalc(d) !== extent[0] && scaleCalc(d) !== extent[1];
        })
        .select('line')
        .classed('zero', highlightZero);

      //------------------------------------------------------------
      // Axis label

      if (!!axisLabelText) {
        var axisLabelX = vertical ?
              rotateYLabel ? scaleWidth / -2 : (thickness + axisLabelDistance) * reflect :
              scaleWidth / 2;
        var axisLabelY = vertical ?
              rotateYLabel ? (thickness + axisLabelDistance) * reflect : scaleWidth / 2 :
              (thickness + axisLabelDistance) * reflect;

        axisLabel
          .attr('x', axisLabelX)
          .attr('y', axisLabelY)
          .attr('dy', (0.355 + 0.355 * reflect) + 'em')
          .attr('transform', vertical && rotateYLabel ? 'rotate(-90)' : '')
          .style('text-anchor', vertical && !rotateYLabel ? rtlTextAnchor('end') : 'middle');

        axisLabel.each(function(d, i) {
          labelThickness += vertical ?
            parseInt(this.getBoundingClientRect().width / 1.3, 10) :
            parseInt(this.getBoundingClientRect().height / 1.3, 10);
        });
        thickness += labelThickness + axisLabelDistance;
      }

      //------------------------------------------------------------
      // Set final margins

      //store old scales for use in transitions on update
      scale0 = scale.copy();
      margin = {top: marginCalc.top, right: marginCalc.right, bottom: marginCalc.bottom, left: marginCalc.left};
      margin[orient] = thickness;

      //------------------------------------------------------------
      // Private functions

      function getStepInterval() {
        return scaleCalc.range().length > 1 ? Math.abs(scaleCalc.range()[1] - scaleCalc.range()[0]) : 0;
      }

      function getPaddingRatio() {
        return scaleCalc.range().length > 1 ? Math.max(0.25, 1 - utility.round(scaleCalc.bandwidth() / getStepInterval(), 2)) : 0;
      }

      function getRangeExtent() {
        return typeof scaleCalc.rangeExtent === 'function' ? scaleCalc.rangeExtent() : scaleCalc.range();
      }

      function getBarWidth() {
        return hasRangeBand ? scaleCalc.bandwidth() : 0;
      }

      function getOuterPadding() {
        return hasRangeBand ? scaleCalc.range()[0] : 0;
      }

      function getOuterPaddingRatio() {
        return getOuterPadding() / getTickSpacing();
      }

      function getTickSpacing() {
        var tickSpacing = 0,
            tickArray;
        if (hasRangeBand) {
          tickSpacing = scaleCalc.range().length > 1 ? Math.abs(scaleCalc.range()[1] - scaleCalc.range()[0]) : d3.max(getRangeExtent()) / 2;
        } else {
          tickArray = scaleCalc.ticks(axisTicks.size());
          tickSpacing = scaleCalc(tickArray[tickArray.length - 1]) - scaleCalc(tickArray[tickArray.length - 2]);
        }
        return tickSpacing;
      }

      function rtlTextAnchor(anchor) {
        if (direction === 'rtl') {
          if (anchor === 'start') {
            return 'end';
          } else if (anchor === 'end') {
            return 'start';
          }
        }
        return anchor;
      }

      function isMirrored() {
        return orient !== 'left' && orient !== 'bottom';
      }

      function setThickness(s) {
        s = s || 1;
        thickness = axis.tickPadding() + (vertical ? maxLabelWidth : maxLabelHeight) * s;
      }

      // Calculate the longest tick width and height
      function calcMaxLabelSizes() {
        calcTickLabelSizes();

        maxLabelWidth = d3.max(tickDimensions, function(d) { return d.width; });
        maxLabelHeight = d3.max(tickDimensions, function(d) { return d.height; });
      }

      function calcTickLabelSizes() {
        tickDimensions = [];
        tickDimsHash = {};

        // reposition max/min ticks before calculating bbox
        if (showMaxMin) {
          axisMaxMin
            .attr('transform', function(d, i) {
              var trans = vertical ? '0,' + scaleCalc(d) : scaleCalc(d) + ',0';
              return 'translate(' + trans + ')';
            });
        }

        tickText.each(function(d, i) { //TODO: make everything relative to domain path
            var bbox = this.getBoundingClientRect();
            if (bbox.width > 0) {
              tickDimensions.push({
                key: d,
                width: parseInt(bbox.width, 10),
                height: parseInt(bbox.height, 10),
                left: bbox.left,
                right: bbox.right,
                top: bbox.top,
                bottom: bbox.bottom
              });
            }
          });

        tickDimensions.sort(function(a, b) {
            return a.key - b.key;
          })
          .forEach(function(d, i) {
            d.index = i;
            tickDimsHash['key-' + d.key.toString()] = d;
          });
        minTickDims = tickDimensions[0];
        maxTickDims = tickDimensions[tickDimensions.length - 1];
      }

      function labelCollision(s) {
        // {0}   [2]   [4]   {6}
        //    [1]   [3]   [5]
        calcTickLabelSizes();
        var skip = showMaxMin ? 2 : s || 1;
        // this resets the maxLabelWidth for label collision detection
        for (var i = (showMaxMin ? 1 : 0), l = tickDimensions.length - skip; i < l; i += 1) {
          if (tickDimensions[i].right + tickGap > tickDimensions[i + s].left) {
            return true;
          }
        }
        return false;
      }

      function recalcMargin(a) {
        var normRotation = a ? (a + 180) % 180 : 0, // Normalize rotation: (-30 + 360) % 360 = 330; (30 + 360) % 360 = 30
            isRotatedLeft = normRotation > 90,
            dMin = null,
            dMax = null;

        // increase margins for min/max
        tickDimensions.forEach(function(d, i) {
          var isMin = dMin === null || d.left <= dMin,
              isMax = dMax === null || d.right >= dMax,
              tickPosition = 0,
              availableSpace = 0,
              textWidth = 0;

          if (!isMin && !isMax) {
            return;
          }

          textWidth = normRotation ? d.width - 6 : d.width / 2; // 6 is the cos(textHeight) @ 30
          tickPosition = scaleCalc(d.key) + (hasRangeBand * getBarWidth() / 2);
          if (isMin && (!normRotation || isRotatedLeft)) {
            dMin = d.left;
            availableSpace = Math.abs(extent[0] - tickPosition);
            marginCalc.left = Math.max(textWidth - availableSpace, 0);
          }
          if (isMax && (!normRotation || !isRotatedLeft)) {
            dMax = d.right;
            availableSpace = Math.abs(extent[1] - tickPosition);
            marginCalc.right = Math.max(textWidth - availableSpace, 0);
          }
        });
        // modify scale range
        if (!hasRangeBand) { //TODO: can we get rid of this for bar chart?
          var change = margin.right - Math.max(margin.right, marginCalc.right);
              change += margin.left - Math.max(margin.left, marginCalc.left);
          var newExtent = [extent[0], extent[1] + change]; // reduce operable width of axis by margins

          scaleCalc.range(newExtent);
          extent = getRangeExtent();
          scaleWidth = Math.abs(extent[1] - extent[0]);

          axis.scale(scaleCalc);
          wrap.call(axis);
        }
      }

      function resetTicks() {
        marginCalc = {top: 0, right: 0, bottom: 0, left: 0};

        scaleCalc = scale.copy();
        extent = getRangeExtent();
        scaleWidth = Math.abs(extent[1] - extent[0]);

        axis.scale(scale);

        wrap.call(axis);

        tickText.selectAll('tspan').remove();
        tickText
          .attr('dy', vertical ? '.32em' : 0.355 + 0.355 * reflect + 'em')
          .attr('x', vertical ? axis.tickPadding() * reflect : 0)
          .attr('y', vertical ? 0 : axis.tickPadding() * reflect)
          .attr('transform', 'translate(0,0)')
          .style('text-anchor', 'middle')
          .style('opacity', 1);

        maxminText
          .text(function(d, i, selection) {
            // get the current tickFormatter which is a wrapper around valueFormat
            return valueFormat(d, i, selection, 'maxmin');
          });

        calcMaxLabelSizes();
        setThickness();
      }

      function handleWrap() {
        var tickSpacing = getTickSpacing();

        tickText.each(function(d, i, selection) {
          // do not ellipsify the label
          var textContent = valueFormat(d, i, selection, 'no-ellipsis');
          var textNode = d3.select(this);
          var isDate = utility.isValidDate(utility.parseDatetime(textContent));
          var dy = reflect === 1 ? 0.71 : -1; // TODO: wrong. fails on reflect with 3 lines of wrap
          var di = 0;
          var textArray = (
                textContent && textContent !== '' ?
                  (
                    isDate ?
                      textContent :
                      textContent.replace('/', '/ ')
                  ) :
                  []
              ).split(' ');
          var l = textArray.length;

          // reset the tick text conent
          this.textContent = '';

          var textString,
              textSpan = textNode.append('tspan')
                .text(textArray[di] + ' ')
                .attr('dy', dy + 'em')
                .attr('x', 0);

          // reset vars
          di += 1;
          dy = 1; // TODO: wrong. fails on reflect with 3 lines of wrap

          while (di < l) {
            textSpan = textNode.append('tspan')
              .text(textArray[di] + ' ')
              .attr('dy', dy + 'em')
              .attr('x', 0);

            di += 1;

            while (di < l) {
              textString = textSpan.text();
              textSpan.text(textString + ' ' + textArray[di]);
              //TODO: this is different than collision test
              if (this.getBoundingClientRect().width <= tickSpacing) {
                di += 1;
              } else {
                textSpan.text(textString);
                break;
              }
            }
          }
        });

        calcMaxLabelSizes();
        setThickness();
      }

      function handleStagger() {
        tickText
          .attr('transform', function(d, i) {
            var yOffset = tickDimsHash['key-' + d.toString()].index % 2 * (maxLabelHeight);
            return 'translate(0,' + yOffset + ')';
          });

        calcMaxLabelSizes();
        setThickness(2);
      }

      function handleRotation(a) {
        // 0..90 = IV, 90..180 = III, 180..270 = IV, 270..360 = III
        // 0..-90 = III, -90..-180 = IV, -180..-270 = III, -270..-360 = IV
        // Normalize rotation: (-30 + 180) % 180 = 150; (30 + 180) % 180 = 30
        var normRotation = (a + 180) % 180,
            isLeft = normRotation > 90,
            angle = (normRotation - (isLeft ? 180 : 0)) * reflect,
            tickAnchor = rtlTextAnchor(isLeft ? 'end' : 'start'),
            //Convert to radians before calculating cos.
            cos = Math.abs(Math.cos(a * Math.PI / 180));

        //Rotate all tickText
        tickText
          .attr('transform', function(d, i, j) {
            return 'translate(0,' + (axis.tickPadding() * reflect) + ') rotate(' + angle + ')';
          })
          .attr('y', '0')
          .style('text-anchor', tickAnchor);

        calcMaxLabelSizes();
        setThickness();
      }

      //------------------------------------------------------------
      // Public functions

      model.resizeTickLines = function(dim) {
        wrap.selectAll('g.tick, g.sc-axisMaxMin').select('line')
          .attr(vertical ? 'x2' : 'y2', dim * reflect);
      };

      model.labelThickness = function() {
        return labelThickness;
      };

    });

    return model;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose model's sub-components
  model.axis = axis;

  // utility.rebind(model, axis, 'tickValues', 'tickSubdivide', 'tickSize', 'tickPadding', 'tickFormat');
  utility.rebind(model, scale, 'domain', 'range'); //these are also accessible by model.scale(), but added common ones directly for ease of use

  // read only
  model.width = function(_) {
    if (!arguments.length) {
      return thickness;
    }
    return model;
  };

  // read only
  model.height = function(_) {
    if (!arguments.length) {
      return thickness;
    }
    return model;
  };

  model.margin = function(_) {
    if (!arguments.length) {
      return margin;
    }
    margin = _;
    return model;
  };

  model.ticks = function(_) {
    if (!arguments.length) {
      return ticks;
    }
    ticks = _;
    return model;
  };

  model.axisLabel = function(_) {
    if (!arguments.length) {
      return axisLabelText;
    }
    axisLabelText = _;
    return model;
  };

  model.showMaxMin = function(_) {
    if (!arguments.length) {
      return showMaxMin;
    }
    showMaxMin = _;
    return model;
  };

  model.highlightZero = function(_) {
    if (!arguments.length) {
      return highlightZero;
    }
    highlightZero = _;
    return model;
  };

  model.wrapTicks = function(_) {
    if (!arguments.length) {
      return wrapTicks;
    }
    wrapTicks = _;
    return model;
  };

  model.rotateTicks = function(_) {
    if (!arguments.length) {
      return rotateTicks;
    }
    rotateTicks = _;
    return model;
  };

  model.staggerTicks = function(_) {
    if (!arguments.length) {
      return staggerTicks;
    }
    staggerTicks = _;
    return model;
  };

  model.reduceXTicks = function(_) {
    if (!arguments.length) {
      return reduceXTicks;
    }
    reduceXTicks = _;
    return model;
  };

  model.rotateYLabel = function(_) {
    if (!arguments.length) {
      return rotateYLabel;
    }
    rotateYLabel = _;
    return model;
  };

  model.axisLabelDistance = function(_) {
    if (!arguments.length) {
      return axisLabelDistance;
    }
    axisLabelDistance = _;
    return model;
  };

  model.textAnchor = function(_) {
    if (!arguments.length) {
      return textAnchor;
    }
    textAnchor = _;
    return model;
  };

  model.direction = function(_) {
    if (!arguments.length) {
      return direction;
    }
    direction = _;
    return model;
  };

  model.orient = function(_) {
    if (!arguments.length) {
      return orient;
    }
    orient = _;
    axis = orient === 'bottom' ? d3.axisBottom() :
           orient === 'right' ? d3.axisRight() :
           orient === 'left' ? d3.axisLeft() :
           orient === 'top' ? d3.axisTop() : d3.axisBottom();
    return model;
  };

  // d3 properties extended
  model.scale = function(_) {
    if (!arguments.length) {
      return scale;
    }
    scale = _;
    axis.scale(scale);
    hasRangeBand = typeof scale.padding === 'function';
    utility.rebind(model, scale, 'domain', 'range');
    return model;
  };
  model.valueFormat = function(_) {
    if (!arguments.length) {
      return valueFormat || axis.tickFormat();
    }
    valueFormat = _;
    return model;
  };
  // mask axis native tickFormat method
  model.tickFormat = function(_) {
    if (!arguments.length) {
      return tickFormat || axis.tickFormat();
    }
    tickFormat = _;
    axis.tickFormat(_);
    return model;
  };
  model.tickValues = function(_) {
    if (!arguments.length) {
      return tickValues;
    }
    tickValues = _;
    axis.tickValues(_);
    return model;
  };
  model.tickSize = function(_) {
    if (!arguments.length) {
      return tickSize;
    }
    tickSize = _;
    axis.tickSize(_);
    return model;
  };
  model.tickPadding = function(_) {
    if (!arguments.length) {
      return tickPadding;
    }
    tickPadding = _;
    axis.tickPadding(_);
    return model;
  };
  model.tickSizeInner = function(_) {
    if (!arguments.length) {
      return tickSizeInner;
    }
    tickSizeInner = _;
    axis.tickSizeInner(_);
    return model;
  };
  model.tickSizeOuter = function(_) {
    if (!arguments.length) {
      return tickSizeOuter;
    }
    tickSizeOuter = _;
    axis.tickSizeOuter(_);
    return model;
  };

  //============================================================

  return model;
}

function funnel() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 960,
      height = 500,
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID in case user doesn't select one
      getKey = function(d) { return (d.series || d).key; },
      getValue = function(d, i) { return (d.series || d).value; },
      getCount = function(d, i) { return (d.series || d).count; },
      fmtKey = function(d) { return getKey(d); },
      fmtValue = function(d) { return getValue(d); },
      fmtCount = function(d) { return !isNaN(getCount(d)) ? (' (' + getCount(d) + ')') : ''; },
      locality = utility.buildLocality(),
      direction = 'ltr',
      delay = 0,
      duration = 0,
      color = function(d, i) { return utility.defaultColor()(d, d.seriesIndex); },
      gradient = utility.colorLinearGradient,
      fill = color,
      textureFill = false,
      classes = function(d, i) { return 'sc-series sc-series-' + d.seriesIndex; };

  var r = 0.3, // ratio of width to height (or slope)
      y = d3.scaleLinear(),
      yDomain = null,
      forceY = [0], // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do model.forceY([]) to remove
      wrapLabels = true,
      minLabelWidth = 75,
      dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout', 'elementMousemove');

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  // These values are preserved between renderings
  var calculatedWidth = 0,
      calculatedHeight = 0,
      calculatedCenter = 0;

  //============================================================
  // Update model

  function model(selection) {
    selection.each(function(data) {

      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          container = d3.select(this);

      var labelGap = 5,
          labelSpace = 5,
          labelOffset = 0,
          funnelTotal = 0,
          funnelOffset = 0;

      // sum the values for each data element
      funnelTotal = d3.sum(data, function(d) { return d.value; });

      //------------------------------------------------------------
      // Setup scales

      function calcDimensions() {
        calculatedWidth = calcWidth(funnelOffset);
        calculatedHeight = calcHeight();
        calculatedCenter = calcCenter(funnelOffset);
      }

      function calcScales() {
        var funnelArea = areaTrapezoid(calculatedHeight, calculatedWidth),
            funnelShift = 0,
            funnelMinHeight = 4,
            _base = calculatedWidth - 2 * r * calculatedHeight,
            _bottom = calculatedHeight;

        //------------------------------------------------------------
        // Adjust points to compensate for parallax of slice
        // by increasing height relative to area of funnel

        // runs from bottom to top
        data.forEach(function(series, i) {
          series.values.forEach(function(point) {

            point._height = funnelTotal > 0 ?
              heightTrapezoid(funnelArea * point.value / funnelTotal, _base) :
              0;

            //TODO: not working
            if (point._height < funnelMinHeight) {
              funnelShift += point._height - funnelMinHeight;
              point._height = funnelMinHeight;
            } else if (funnelShift < 0 && point._height + funnelShift > funnelMinHeight) {
              point._height += funnelShift;
              funnelShift = 0;
            }

            point._base = _base;
            point._bottom = _bottom;
            point._top = point._bottom - point._height;

            _base += 2 * r * point._height;
            _bottom -= point._height;
          });
        });

        // Remap and flatten the data for use in calculating the scales' domains
        //TODO: this is no longer needed
        var seriesData = yDomain || // if we know yDomain, no need to calculate
              d3.extent(
                d3.merge(
                  data.map(function(d) {
                    return d.values.map(function(d) {
                      return d._top;
                    });
                  })
                ).concat(forceY)
              );

        y .domain(seriesData)
          .range([calculatedHeight, 0]);
      }

      calcDimensions();
      calcScales();

      //------------------------------------------------------------
      // Setup containers and skeleton of model

      var wrap_bind = container.selectAll('g.sc-wrap').data([data]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-wrap sc-funnel');
      var wrap = container.select('.sc-wrap.sc-funnel').merge(wrap_entr);

      var defs_entr = wrap_entr.append('defs');
      var defs = wrap.select('defs');

      wrap.attr('transform', utility.translation(margin.left, margin.top));

      //------------------------------------------------------------
      // Definitions

      if (textureFill) {
        var mask = utility.createTexture(defs_entr, id);
      }

      // set up the gradient constructor function
      model.gradientFill = function(d, i, params) {
        var gradientId = id + '-' + i;
        var c = color(d, i);
        return gradient(d, gradientId, params, c, defs);
      };

      //------------------------------------------------------------
      // Append major data series grouping containers

      var series_bind = wrap.selectAll('.sc-series').data(data, function(d) { return d.seriesIndex; });
      var series_entr = series_bind.enter().append('g').attr('class', 'sc-series');
      // series_bind.exit().transition().duration(duration)
      //   .selectAll('g.sc-slice')
      //   .delay(function(d, i) { return i * delay / data[0].values.length; })
      //     .attr('points', function(d) {
      //       return pointsTrapezoid(d, 0, calculatedWidth);
      //     })
      //     .style('stroke-opacity', 1e-6)
      //     .style('fill-opacity', 1e-6)
      //     .remove();
      // series_bind.exit().transition().duration(duration)
      //   .selectAll('g.sc-label-value')
      //   .delay(function(d, i) { return i * delay / data[0].values.length; })
      //     .attr('y', 0)
      //     .attr('transform', 'translate(' + calculatedCenter + ',0)')
      //     .style('stroke-opacity', 1e-6)
      //     .style('fill-opacity', 1e-6)
      //     .remove();
      series_bind.exit().remove();
      var series = wrap.selectAll('.sc-series').merge(series_entr);

      series_entr
        .style('stroke', '#FFF')
        .style('stroke-width', 2)
        .style('stroke-opacity', 1)
        .on('mouseover', function(d, i, j) { //TODO: figure out why j works above, but not here
          d3.select(this).classed('hover', true);
        })
        .on('mouseout', function(d, i, j) {
          d3.select(this).classed('hover', false);
        });

      series
        .attr('class', function(d) { return classes(d, d.seriesIndex); })
        .attr('fill', function(d) { return fill(d, d.seriesIndex); })
        .classed('sc-active', function(d) { return d.active === 'active'; })
        .classed('sc-inactive', function(d) { return d.active === 'inactive'; });

      series.transition().duration(duration)
          .style('stroke-opacity', 1)
          .style('fill-opacity', 1);

      //------------------------------------------------------------
      // Append polygons for funnel
      // Save for later...
      // function(s, i) {
      //   return s.values.map(function(v, j) {
      //     v.disabled = s.disabled;
      //     v.key = s.key;
      //     v.seriesIndex = s.seriesIndex;
      //     v.index = j;
      //     return v;
      //   });
      // },

      var slice_bind = series.selectAll('g.sc-slice')
            .data(function(d) { return d.values; }, function(d) { return d.seriesIndex; });
      slice_bind.exit().remove();
      var slice_entr = slice_bind.enter().append('g').attr('class', 'sc-slice');
      var slices = series.selectAll('g.sc-slice').merge(slice_entr);

      slice_entr.append('polygon')
        .attr('class', 'sc-base');

      slices.select('polygon.sc-base')
        .attr('points', function(d) {
          return pointsTrapezoid(d, 0, calculatedWidth);
        });

      if (textureFill) {
        // For on click active slices
        slice_entr.append('polygon')
          .attr('class', 'sc-texture')
          .style('mask', 'url(' + mask + ')');

        slices.select('polygon.sc-texture')
          .attr('points', function(d) {
            return pointsTrapezoid(d, 0, calculatedWidth);
          });
      }

      slice_entr
        .on('mouseover', function(d, i) {
          d3.select(this).classed('hover', true);
          var eo = buildEventObject(d3.event, d, i);
          dispatch.call('elementMouseover', this, eo);
        })
        .on('mousemove', function(d, i) {
          var e = d3.event;
          dispatch.call('elementMousemove', this, e);
        })
        .on('mouseout', function(d, i) {
          d3.select(this).classed('hover', false);
          dispatch.call('elementMouseout', this);
        })
        .on('click', function(d, i) {
          d3.event.stopPropagation();
          var eo = buildEventObject(d3.event, d, i);
          dispatch.call('elementClick', this, eo);
        })
        .on('dblclick', function(d, i) {
          d3.event.stopPropagation();
          var eo = buildEventObject(d3.event, d, i);
          dispatch.call('elementDblClick', this, eo);
        });

      //------------------------------------------------------------
      // Append containers for labels

      var labels_bind = series.selectAll('.sc-label-value')
            .data(function(d) { return d.values; }, function(d) { return d.seriesIndex; });
      labels_bind.exit().remove();
      var labels_entr = labels_bind.enter().append('g').attr('class', 'sc-label-value');
      var labels = series.selectAll('g.sc-label-value').merge(labels_entr);

      labels
        .attr('transform', 'translate(' + calculatedCenter + ',0)');

      var sideLabels = labels.filter('.sc-label-side');

      //------------------------------------------------------------
      // Update funnel labels

      function renderFunnelLabels() {
        // Remove responsive label elements
        labels.selectAll('polyline').remove();
        labels.selectAll('rect').remove();
        labels.selectAll('text').remove();

        labels.append('rect')
          .attr('class', 'sc-label-box')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', 0)
          .attr('height', 0)
          .attr('rx', 2)
          .attr('ry', 2)
          .style('pointer-events', 'none')
          .style('stroke-width', 0)
          .style('fill-opacity', 0);

        // Append label text and wrap if needed
        labels.append('text')
          .text(fmtKey)
            .call(fmtLabel, 'sc-label', 0.85, 'middle', fmtFill);

        labels.select('.sc-label')
          .call(
            handleLabel,
            (wrapLabels ? wrapLabel : ellipsifyLabel),
            calcFunnelWidthAtSliceMidpoint,
            function(txt, dy) {
              fmtLabel(txt, 'sc-label', dy, 'middle', fmtFill);
            }
          );

        // Append value and count text
        labels.append('text')
          .text(fmtValue)
            .call(fmtLabel, 'sc-value', 0.85, 'middle', fmtFill);

        labels.select('.sc-value')
          .append('tspan')
            .text(fmtCount);

        labels
          .call(positionValue)
          // Position labels and identify side labels
          .call(calcFunnelLabelDimensions)
          .call(positionLabelBox);

        labels
          .classed('sc-label-side', function(d) { return d.tooTall || d.tooWide; });
      }

      //------------------------------------------------------------
      // Update side labels

      function renderSideLabels() {
        var d0 = 0;
        var d1 = 0;
        var g, i, j, l;

        // Remove all responsive elements
        sideLabels = labels.filter('.sc-label-side');
        sideLabels.selectAll('.sc-label').remove();
        sideLabels.selectAll('rect').remove();
        sideLabels.selectAll('polyline').remove();

        // Position side labels
        sideLabels.append('text')
          .text(fmtKey)
            .call(fmtLabel, 'sc-label', 0.85, 'start', '#555');

        sideLabels.select('.sc-label')
          .call(
            handleLabel,
            (wrapLabels ? wrapLabel : ellipsifyLabel),
            (wrapLabels ? calcSideWidth : maxSideLabelWidth),
            function(txt, dy) {
              fmtLabel(txt, 'sc-label', dy, 'start', '#555');
            }
          );

        sideLabels
          .call(positionValue);

        sideLabels.select('.sc-value')
          .style('text-anchor', 'start')
          .style('fill', '#555');

        sideLabels
          .call(calcSideLabelDimensions);

        // Reflow side label vertical position to prevent overlap

        // Top to bottom
        for (g = sideLabels.nodes(), j = g.length - 1; j >= 0; j -= 1) {
          d1 = d3.select(g[j]).data()[0];
          if (d1) {
            if (!d0) {
              d1.labelBottom = d1.labelTop + d1.labelHeight + labelSpace;
              d0 = d1.labelBottom;
              continue;
            }

            d1.labelTop = Math.max(d0, d1.labelTop);
            d1.labelBottom = d1.labelTop + d1.labelHeight + labelSpace;
            d0 = d1.labelBottom;
          }
        }

        // And then...
        if (d0 && d0 - labelSpace > d3.max(y.range())) {

          d0 = 0;

          // Bottom to top
          for (g = sideLabels.nodes(), i = 0, l = g.length; i < l; i += 1) {
            d1 = d3.select(g[i]).data()[0];
            if (d1) {
              if (!d0) {
                d1.labelBottom = calculatedHeight - 1;
                d1.labelTop = d1.labelBottom - d1.labelHeight;
                d0 = d1.labelTop;
                continue;
              }

              d1.labelBottom = Math.min(d0, d1.labelBottom);
              d1.labelTop = d1.labelBottom - d1.labelHeight - labelSpace;
              d0 = d1.labelTop;
            }
          }

          // ok, FINALLY, so if we are above the top of the funnel,
          // we need to lower them all back down
          if (d0 < 0) {
            sideLabels.each(function(d) {
              d.labelTop -= d0;
              d.labelBottom -= d0;
            });
          }
        }

        d0 = 0;

        //------------------------------------------------------------
        // Recalculate funnel offset based on side label dimensions

        sideLabels
          .call(calcOffsets);
      }

      //------------------------------------------------------------
      // Calculate the width and position of labels which
      // determines the funnel offset dimension

      function renderLabels() {
        renderFunnelLabels();
        renderSideLabels();
      }

      renderLabels();
      calcDimensions();
      calcScales();

      // Calls twice since the first call may create a funnel offset
      // which decreases the funnel width which impacts label position

      renderLabels();
      calcDimensions();
      calcScales();

      renderLabels();
      calcDimensions();
      calcScales();

      //------------------------------------------------------------
      // Reposition responsive elements

      slices.select('.sc-base')
        .attr('points', function(d) {
          return pointsTrapezoid(d, 1, calculatedWidth);
        });

      if (textureFill) {
        slices.selectAll('.sc-texture')
          .attr('points', function(d) {
            return pointsTrapezoid(d, 1, calculatedWidth);
          })
          .style('fill', fmtFill);
      }

      labels
        .attr('transform', function(d) {
          var xTrans = d.tooTall ? 0 : calculatedCenter,
              yTrans = d.tooTall ? 0 : d.labelTop;
          return 'translate(' + xTrans + ',' + yTrans + ')';
        });

      sideLabels
        .attr('transform', function(d) {
          return 'translate(' + labelOffset + ',' + d.labelTop + ')';
        });

      sideLabels
        .append('polyline')
          .attr('class', 'sc-label-leader')
          .style('fill-opacity', 0)
          .style('stroke', '#999')
          .style('stroke-width', 1)
          .style('stroke-opacity', 0.5);

      sideLabels.selectAll('polyline')
        .call(pointsLeader);

      //------------------------------------------------------------
      // Utility functions

      // TODO: use scales instead of ratio algebra
      // var funnelScale = d3.scaleLinear()
      //       .domain([w / 2, minimum])
      //       .range([0, maxy1*thenscalethistopreventminimumfrompassing]);

      function buildEventObject(e, d, i) {
        return {
          id: id,
          key: fmtKey(d),
          value: getValue(d),
          count: getCount(d),
          data: d,
          series: d.series,
          seriesIndex: d.series.seriesIndex,
          e: e
        };
      }

      function wrapLabel(d, lbl, fnWidth, fmtLabel) {
        var text = lbl.text(),
            dy = parseFloat(lbl.attr('dy')),
            word,
            words = text.split(/\s+/).reverse(),
            line = [],
            lineNumber = 0,
            maxWidth = fnWidth(d, 0),
            parent = d3.select(lbl.node().parentNode);

        lbl.text(null);

        while ((word = words.pop())) {
          line.push(word);
          lbl.text(line.join(' '));
          if (lbl.node().getBoundingClientRect().width > maxWidth && line.length > 1) {
            line.pop();
            lbl.text(line.join(' '));
            line = [word];
            lbl = parent.append('text');
            lbl.text(word)
              .call(fmtLabel, ++lineNumber * 1.1 + dy);
          }
        }
      }

      function handleLabel(lbls, fnFormat, fnWidth, fmtLabel) {
        lbls.each(function(d) {
          var lbl = d3.select(this);
          fnFormat(d, lbl, fnWidth, fmtLabel);
        });
      }

      function ellipsifyLabel(d, lbl, fnWidth, fmtLabel) {
        var text = lbl.text(),
            dy = parseFloat(lbl.attr('dy')),
            maxWidth = fnWidth(d);

        lbl.text(utility.stringEllipsify(text, container, maxWidth))
          .call(fmtLabel, dy);
      }

      function maxSideLabelWidth(d) {
        // overall width of container minus the width of funnel top
        // or minLabelWidth, which ever is greater
        // this is also now as funnelOffset (maybe)
        var twenty = Math.max(availableWidth - availableHeight / 1.1, minLabelWidth),
            // bottom of slice
            sliceBottom = d._bottom,
            // x component of slope F at y
            base = sliceBottom * r,
            // total width at bottom of slice
            maxWidth = twenty + base,
            // height of sloped leader
            leaderHeight = Math.abs(d.labelBottom - sliceBottom),
            // width of the angled leader
            leaderWidth = leaderHeight * r,
            // total width of leader
            leaderTotal = labelGap + leaderWidth + labelGap + labelGap,
            // this is the distance from end of label plus spacing to F
            iOffset = maxWidth - leaderTotal;

        return Math.max(iOffset, minLabelWidth);
      }

      function pointsTrapezoid(d, h, w) {
        //MATH: don't delete
        // v = 1/2 * h * (b + b + 2*r*h);
        // 2v = h * (b + b + 2*r*h);
        // 2v = h * (2*b + 2*r*h);
        // 2v = 2*b*h + 2*r*h*h;
        // v = b*h + r*h*h;
        // v - b*h - r*h*h = 0;
        // v/r - b*h/r - h*h = 0;
        // b/r*h + h*h + b/r/2*b/r/2 = v/r + b/r/2*b/r/2;
        // h*h + b/r*h + b/r/2*b/r/2 = v/r + b/r/2*b/r/2;
        // (h + b/r/2)(h + b/r/2) = v/r + b/r/2*b/r/2;
        // h + b/r/2 = Math.sqrt(v/r + b/r/2*b/r/2);
        // h  = Math.abs(Math.sqrt(v/r + b/r/2*b/r/2)) - b/r/2;
        var y0 = d._bottom,
            y1 = d._top,
            w0 = w / 2 - r * y0,
            w1 = w / 2 - r * y1,
            c = calculatedCenter;

        return (
          (c - w0) + ',' + (y0 * h) + ' ' +
          (c - w1) + ',' + (y1 * h) + ' ' +
          (c + w1) + ',' + (y1 * h) + ' ' +
          (c + w0) + ',' + (y0 * h)
        );
      }

      function heightTrapezoid(a, b) {
        var x = b / r / 2;
        return Math.abs(Math.sqrt(a / r + x * x)) - x;
      }

      function areaTrapezoid(h, w) {
        return h * (w - h * r);
      }

      function calcWidth(offset) {
        return Math.round(Math.max(Math.min(availableHeight / 1.1, availableWidth - offset), 40));
      }

      function calcHeight() {
        // MATH: don't delete
        // h = 666.666
        // w = 600
        // m = 200
        // at what height is m = 200
        // w = h * 0.3 = 666 * 0.3 = 200
        // maxheight = ((w - m) / 2) / 0.3 = (w - m) / 0.6 = h
        // (600 - 200) / 0.6 = 400 / 0.6 = 666
        return Math.min(calculatedWidth * 1.1, (calculatedWidth - calculatedWidth * r) / (2 * r));
      }

      function calcCenter(offset) {
        return calculatedWidth / 2 + offset;
      }

      function calcFunnelWidthAtSliceMidpoint(d) {
        var b = calculatedWidth,
            v = d._bottom - d._height / 2; // mid point of slice
        return b - v * r * 2;
      }

      function calcSideWidth(d, offset) {
        var b = Math.max((availableWidth - calculatedWidth) / 2, offset),
            v = d._top; // top of slice
        return b + v * r;
      }

      function calcLabelBBox(lbl) {
        return d3.select(lbl).node().getBoundingClientRect();
      }

      function calcFunnelLabelDimensions(lbls) {
        lbls.each(function(d) {
          var bbox = calcLabelBBox(this);

          d.labelHeight = bbox.height;
          d.labelWidth = bbox.width;
          d.labelTop = (d._bottom - d._height / 2) - d.labelHeight / 2;
          d.labelBottom = d.labelTop + d.labelHeight + labelSpace;
          d.tooWide = d.labelWidth > calcFunnelWidthAtSliceMidpoint(d);
          d.tooTall = d.labelHeight > d._height - 4;
        });
      }

      function calcSideLabelDimensions(lbls) {
        lbls.each(function(d) {
          var bbox = calcLabelBBox(this);

          d.labelHeight = bbox.height;
          d.labelWidth = bbox.width;
          d.labelTop = d._top;
          d.labelBottom = d.labelTop + d.labelHeight + labelSpace;
        });
      }

      function pointsLeader(polylines) {
        // Mess with this function at your peril.
        var c = polylines.size();

        // run top to bottom
        for (var groups = polylines.nodes(), i = groups.length - 1; i >= 0; --i) {
          var node = d3.select(groups[i]);
          var d = node.data()[0];
          var // previous label
              p = i < c - 1 ? d3.select(groups[i + 1]).data()[0] : null,
              // next label
              n = i ? d3.select(groups[i - 1]).data()[0] : null,
              // label height
              h = Math.round(d.labelHeight) + 0.5,
              // slice bottom
              t = Math.round(d._bottom - d.labelTop) - 0.5,
              // previous width
              wp = p ? p.labelWidth - (d.labelBottom - p.labelBottom) * r : 0,
              // current width
              wc = d.labelWidth,
              // next width
              wn = n && h < t ? n.labelWidth : 0,
              // final width
              w = Math.round(Math.max(wp, wc, wn)) + labelGap,
              // funnel edge
              f = Math.round(calcSideWidth(d, funnelOffset)) - labelOffset - labelGap;

          // polyline points
          var points = 0 + ',' + h + ' ' +
                 w + ',' + h + ' ' +
                 (w + Math.abs(h - t) * r) + ',' + t + ' ' +
                 f + ',' + t;

          // this will be overridding the label width in data
          // referenced above as p.labelWidth
          d.labelWidth = w;
          node.attr('points', points);
        }
      }

      function calcOffsets(lbls) {
        var sideWidth = (availableWidth - calculatedWidth) / 2, // natural width of side
            offset = 0;

        lbls.each(function(d) {
          var // bottom of slice
              sliceBottom = d._bottom,
              // is slice below or above label bottom
              // scalar = d.labelBottom >= sliceBottom ? 1 : 0,
              // the width of the angled leader
              // from bottom right of label to bottom of slice
              leaderSlope = Math.abs(d.labelBottom + labelGap - sliceBottom) * r,
              // this is the x component of slope F at y
              base = sliceBottom * r,
              // this is the distance from end of label plus spacing to F
              iOffset = d.labelWidth + leaderSlope + labelGap * 3 - base;
          // if this label sticks out past F
          if (iOffset >= offset) {
            // this is the minimum distance for F
            // has to be away from the left edge of labels
            offset = iOffset;
          }
        });

        // how far from chart edge is label left edge
        offset = Math.round(offset * 10) / 10;

        // there are three states:
        if (offset <= 0) {
        // 1. no label sticks out past F
          labelOffset = sideWidth;
          funnelOffset = sideWidth;
        } else if (offset > 0 && offset < sideWidth) {
        // 2. iOffset is > 0 but < sideWidth
          labelOffset = sideWidth - offset;
          funnelOffset = sideWidth;
        } else {
        // 3. iOffset is >= sideWidth
          labelOffset = 0;
          funnelOffset = offset;
        }
      }

      function fmtFill(d, i, j) {
        var series = d.series || d;
        var index = series.seriesIndex || i;
        var fillColor = fill(series);
        var backColor = fillColor === 'inherit'
          ? d3.select('.' + classes(series, index).split(' ').join('.')).style('color')
          : fillColor;
        return utility.getTextContrast(backColor, index);
      }

      function fmtDirection(d) {
        return utility.isRTLChar(d.slice(-1)) ? 'rtl' : 'ltr';
      }

      function fmtLabel(txt, classes, dy, anchor, fill) {
        txt
          .attr('x', 0)
          .attr('y', 0)
          .attr('dy', dy + 'em')
          .attr('class', classes)
          .attr('direction', function() {
            return 'ltr';
            //TODO: should labels change sides in RTL?
            // return fmtDirection(txt.text());
          })
          .style('pointer-events', 'none')
          .style('text-anchor', anchor)
          .style('fill', fill);
      }

      function positionValue(lbls) {
        lbls.each(function(d) {
          var lbl = d3.select(this);
          var cnt = lbl.selectAll('.sc-label').size() + 1;
          var dy = (.85 + cnt - 1) + 'em';
          lbl.select('.sc-value')
            .attr('dy', dy);
        });
      }

      function positionLabelBox(lbls) {
        lbls.each(function(d, i) {
          var lbl = d3.select(this);

          lbl.select('.sc-label-box')
            .attr('x', (d.labelWidth + 6) / -2)
            .attr('y', -2)
            .attr('width', d.labelWidth + 6)
            .attr('height', d.labelHeight + 4)
            .attr('rx', 2)
            .attr('ry', 2)
            //NOTE: not sure is we want to do this?
            // .style('fill', function(d, i) {
            //   return color(d.series, i);
            // })
            .style('fill-opacity', 1);
        });
      }

    });

    return model;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  model.dispatch = dispatch;

  model.id = function(_) {
    if (!arguments.length) { return id; }
    id = _;
    return model;
  };

  model.color = function(_) {
    if (!arguments.length) { return color; }
    color = _;
    return model;
  };
  model.fill = function(_) {
    if (!arguments.length) { return fill; }
    fill = _;
    return model;
  };
  model.classes = function(_) {
    if (!arguments.length) { return classes; }
    classes = _;
    return model;
  };
  model.gradient = function(_) {
    if (!arguments.length) { return gradient; }
    gradient = _;
    return model;
  };

  model.margin = function(_) {
    if (!arguments.length) { return margin; }
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
    return model;
  };

  model.width = function(_) {
    if (!arguments.length) { return width; }
    width = _;
    return model;
  };

  model.height = function(_) {
    if (!arguments.length) { return height; }
    height = _;
    return model;
  };

  model.getKey = function(_) {
    if (!arguments.length) { return getKey; }
    getKey = _;
    return model;
  };

  model.getValue = function(_) {
    if (!arguments.length) { return getValue; }
    getValue = _;
    return model;
  };

  model.getCount = function(_) {
    if (!arguments.length) { return getCount; }
    getCount = _;
    return model;
  };

  model.fmtKey = function(_) {
    if (!arguments.length) { return fmtKey; }
    fmtKey = _;
    return model;
  };

  model.fmtValue = function(_) {
    if (!arguments.length) { return fmtValue; }
    fmtValue = _;
    return model;
  };

  model.fmtCount = function(_) {
    if (!arguments.length) { return fmtCount; }
    fmtCount = _;
    return model;
  };

  model.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    return model;
  };

  model.delay = function(_) {
    if (!arguments.length) { return delay; }
    delay = _;
    return model;
  };

  model.duration = function(_) {
    if (!arguments.length) { return duration; }
    duration = _;
    return model;
  };

  model.locality = function(_) {
    if (!arguments.length) { return locality; }
    locality = utility.buildLocality(_);
    return model;
  };

  model.textureFill = function(_) {
    if (!arguments.length) { return textureFill; }
    textureFill = _;
    return model;
  };

  // FUNNEL

  model.yScale = function(_) {
    if (!arguments.length) { return y; }
    y = _;
    return model;
  };

  model.yDomain = function(_) {
    if (!arguments.length) { return yDomain; }
    yDomain = _;
    return model;
  };

  model.forceY = function(_) {
    if (!arguments.length) { return forceY; }
    forceY = _;
    return model;
  };

  model.wrapLabels = function(_) {
    if (!arguments.length) { return wrapLabels; }
    wrapLabels = _;
    return model;
  };

  model.minLabelWidth = function(_) {
    if (!arguments.length) { return minLabelWidth; }
    minLabelWidth = _;
    return model;
  };

  //============================================================

  return model;
}

function gauge() {
  /* original inspiration for this chart type is at http://bl.ocks.org/3202712 */
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = null,
      height = null,
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID in case user doesn't select one
      getX = function(d) { return d.key; },
      getY = function(d) { return utility.isNumeric(d.y) ? parseFloat(d.y) : null; },
      getKey = function(d) { return d.hasOwnProperty('key') ? d.key : d; },
      getValue = function(d) { return utility.isNumeric(d.value) ? d.value : getY(d); },
      getCount = function(d) { return utility.isNumeric(d.count) ? d.count : d; },
      fmtKey = function(d) { return getKey(d); },
      fmtValue = function(d) { return getValue(d); },
      fmtCount = function(d) { return (' (' + getCount(d) + ')').replace(' ()', ''); },
      locality = utility.buildLocality(),
      direction = 'ltr',
      delay = 0,
      duration = 0,
      color = function(d, i) { return utility.defaultColor()(d, d.seriesIndex); },
      gradient = utility.colorRadialGradient,
      fill = color,
      classes = function(d, i) { return 'sc-slice sc-series-' + d.seriesIndex; },
      dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout', 'elementMousemove');

  var ringWidth = 50,
      showLabels = true,
      showPointer = true,
      labelThreshold = 0.01, //if slice percentage is under this, don't show label
      pointerWidth = 5,
      pointerTailLength = 5,
      pointerHeadLength = 90,
      pointerValue = 0,
      minValue = 0,
      maxValue = 0,
      minAngle = -90,
      maxAngle = 90,
      labelInset = 10;

  //colorScale = d3.scaleLinear().domain([0, .5, 1].map(d3.interpolate(min, max))).range(["green", "yellow", "red"]);

  //============================================================
  // Update model

  function model(selection) {
    selection.each(function(data) {

      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          container = d3.select(this);

      var radius = Math.min((availableWidth / 2), availableHeight) / ((100 + labelInset) / 100),
          range = maxAngle - minAngle,
          scale = d3.scaleLinear().range([0, 1]).domain([minValue, maxValue]),
          prop = function(d) { return d * radius / 100; };


      //------------------------------------------------------------
      // Setup containers and skeleton of model

      var wrap_bind = container.selectAll('g.sc-wrap').data([data]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-wrap sc-gauge');
      var wrap = container.select('.sc-wrap.sc-gauge').merge(wrap_entr);

      var defs_entr = wrap_entr.append('defs');
      var defs = wrap.select('defs');

      wrap_entr.append('g').attr('class', 'sc-group');
      var group_wrap = wrap.select('.sc-group');

      wrap_entr.append('g').attr('class', 'sc-labels');
      var labels_wrap = wrap.select('.sc-labels');

      wrap_entr.append('g').attr('class', 'sc-pointer');
      var pointer_wrap = wrap.select('.sc-pointer');

      var odometer_entr = wrap_entr.append('g').attr('class', 'sc-odometer');
      var odometer_wrap = wrap.select('.sc-odometer');

      wrap.attr('transform', 'translate('+ (margin.left/2 + margin.right/2 + prop(labelInset)) +','+ (margin.top + prop(labelInset)) +')');

      //------------------------------------------------------------
      // Definitions

      // set up the gradient constructor function
      model.gradientFill = function(d, i) {
        var gradientId = id + '-' + i;
        var params = {
          x: 0,
          y: 0,
          r: radius,
          s: ringWidth / 100,
          u: 'userSpaceOnUse'
        };
        var c = color(d, i);
        return gradient(d, gradientId, params, c, defs);
      };

      //------------------------------------------------------------
      // Append major data series grouping containers

      group_wrap.attr('transform', centerTx);

      var series_bind = group_wrap.selectAll('.sc-series').data(data);
      var series_entr = series_bind.enter().append('g').attr('class', 'sc-series');
      series_bind.exit().remove();
      var series = group_wrap.selectAll('.sc-series').merge(series_entr);

      series_entr
        .style('stroke', '#FFF')
        .style('stroke-width', 2)
        .style('stroke-opacity', 0)
        .on('mouseover', function(d, i, j) { //TODO: figure out why j works above, but not here
          d3.select(this).classed('hover', true);
        })
        .on('mouseout', function(d, i, j) {
          d3.select(this).classed('hover', false);
        });

      series
        .attr('class', function(d) { return classes(d, d.seriesIndex); })
        .attr('fill', function(d) { return fill(d, d.seriesIndex); })
        .classed('sc-active', function(d) { return d.active === 'active'; })
        .classed('sc-inactive', function(d) { return d.active === 'inactive'; });

      //------------------------------------------------------------
      // Gauge arcs

      var pieArc = d3.arc()
            .innerRadius(prop(ringWidth))
            .outerRadius(radius)
            .startAngle(startAngle)
            .endAngle(endAngle);

      var slice_bind = series.selectAll('g.sc-slice').data(
            function(s) { return s.values; },
            function(d) { return d.seriesIndex; }
          );
      slice_bind.exit().remove();
      var slice_entr = slice_bind.enter().append('g').attr('class', 'sc-slice');
      var slices = series.selectAll('g.sc-slice').merge(slice_entr);

      slice_entr.append('path')
        .attr('class', 'sc-base')
        .attr('d', pieArc)
        .on('mouseover', function(d, i) {
          d3.select(this).classed('hover', true);
          var eo = buildEventObject(d3.event, d, i);
          dispatch.call('elementMouseover', this, eo);
        })
        .on('mousemove', function(d, i) {
          var e = d3.event;
          dispatch.call('elementMousemove', this, e);
        })
        .on('mouseout', function(d, i) {
          d3.select(this).classed('hover', false);
          dispatch.call('elementMouseout', this);
        })
        .on('click', function(d, i) {
          d3.event.stopPropagation();
          var eo = buildEventObject(d3.event, d, i);
          dispatch.call('elementClick', this, eo);
        })
        .on('dblclick', function(d, i) {
          d3.event.stopPropagation();
          var eo = buildEventObject(d3.event, d, i);
          dispatch.call('elementDblClick', this, eo);
        });

      slices.select('.sc-base')
        .attr('d', pieArc)
        .style('stroke-opacity', 1);

      function buildEventObject(e, d, i) {
        return {
          point: d,
          index: i,
          e: d3.event,
          id: id
        };
      }

      //------------------------------------------------------------
      // Gauge labels

      var labelData = [{x: 0, y: minValue, y0: minValue, y1: minValue}].concat(data.map(function(d) {
        return d.values[0];
      }));

      labels_wrap.attr('transform', centerTx);

      var labels_bind = labels_wrap.selectAll('text').data(labelData);
      var labels_entr = labels_bind.enter().append('text');
      labels_bind.exit().remove();
      var labels = labels_wrap.selectAll('text').merge(labels_entr);

      labels
        .attr('transform', function(d) {
          return 'rotate(' + newAngle(d.y1) + ') translate(0,' + (prop(-1.5) - radius) + ')';
        })
        .text(function(d) {
          return d.y1;
        })
        .style('fill-opacity', labelOpacity)
        .style('text-anchor', 'middle')
        .style('font-size', prop(0.6) + 'em');

      if (showPointer) {

        //------------------------------------------------------------
        // Gauge pointer

        var pointerData = [
              [     Math.round(prop(pointerWidth) / 2), 0],
              [ 0, -Math.round(prop(pointerHeadLength))  ],
              [    -Math.round(prop(pointerWidth) / 2), 0],
              [ 0,  Math.round(prop(pointerWidth))       ],
              [     Math.round(prop(pointerWidth) / 2), 0]
            ];

        pointer_wrap.attr('transform', centerTx);

        var pointer_bind = pointer_wrap.selectAll('path').data([pointerData]);
        var pointer_entr = pointer_bind.enter().append('path')
              .attr('transform', 'rotate(' + minAngle + ')');
        pointer_bind.exit().remove();
        var pointer = pointer_wrap.selectAll('path').merge(pointer_entr);
        pointer.attr('d', d3.line());

        //------------------------------------------------------------
        // Odometer readout

        odometer_entr.append('text')
          .attr('class', 'sc-odom sc-odomText')
          .attr('x', 0)
          .attr('y', 0 )
          .style('text-anchor', 'middle')
          .style('stroke', 'none')
          .style('fill', 'black');

        odometer_wrap.select('.sc-odomText')
          .style('font-size', prop(0.7) + 'em')
          .text(pointerValue);

        odometer_entr.insert('path','.sc-odomText')
          .attr('class', 'sc-odom sc-odomBox')
          .attr('fill', '#EFF')
          .attr('stroke','black')
          .attr('stroke-width','2px')
          .attr('opacity', 0.8);

        odometer_wrap.call(calcOdomBoxSize);

      } else {
        pointer_wrap.selectAll('path').remove();
        odometer_wrap.select('.sc-odomText').remove();
        odometer_wrap.select('.sc-odomBox').remove();
      }

      //------------------------------------------------------------
      // private functions
      function setGaugePointer(d) {
        pointerValue = d;
        pointer.transition()
          .duration(duration)
          .ease(d3.easeElastic)
          .attr('transform', 'rotate(' + newAngle(d) + ')');
        odometer_wrap.select('.sc-odomText')
          .text(pointerValue);
        odometer_wrap.call(calcOdomBoxSize);
      }

      function calcOdomBoxSize(wrap) {
        var bbox = wrap.select('.sc-odomText').node().getBoundingClientRect();
        wrap.select('.sc-odomBox').attr('d', utility.roundedRectangle(
            -bbox.width / 2,
            -bbox.height + prop(1.5),
            bbox.width + prop(4),
            bbox.height + prop(2),
            prop(2)
          ));
        wrap.attr('transform', 'translate(' + radius + ',' + (margin.top + prop(70) + bbox.height) + ')');
      }


      function newAngle(d) {
        return minAngle + (scale(d) * range);
      }

      function startAngle(d) {
        // DNR (Math): simplify d.startAngle - ((rotateDegrees * Math.PI / 180) * (360 / arcDegrees)) * (arcDegrees / 360);
        // Pie: return d.startAngle * arcDegrees / 360 + utility.angleToRadians(rotateDegrees);
        return utility.angleToRadians(newAngle(d.y0));
      }

      function endAngle(d) {
        // Pie: return d.endAngle * arcDegrees / 360 + utility.angleToRadians(rotateDegrees);
        return utility.angleToRadians(newAngle(d.y1));
      }

      // Center translation
      function centerTx() {
        return 'translate(' + radius + ',' + radius + ')';
      }

      function labelOpacity(d, i) {
        var percent = (endAngle(d) - startAngle(d)) / (2 * Math.PI);
        return i === 0 || percent > labelThreshold ? 1 : 0;
      }

      model.setGaugePointer = setGaugePointer;

    });

    return model;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  model.dispatch = dispatch;

  model.id = function(_) {
    if (!arguments.length) { return id; }
    id = _;
    return model;
  };

  model.color = function(_) {
    if (!arguments.length) { return color; }
    color = _;
    return model;
  };
  model.fill = function(_) {
    if (!arguments.length) { return fill; }
    fill = _;
    return model;
  };
  model.classes = function(_) {
    if (!arguments.length) { return classes; }
    classes = _;
    return model;
  };
  model.gradient = function(_) {
    if (!arguments.length) { return gradient; }
    gradient = _;
    return model;
  };

  model.margin = function(_) {
    if (!arguments.length) { return margin; }
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
    return model;
  };

  model.width = function(_) {
    if (!arguments.length) { return width; }
    width = _;
    return model;
  };

  model.height = function(_) {
    if (!arguments.length) { return height; }
    height = _;
    return model;
  };

  model.x = function(_) {
    if (!arguments.length) { return getX; }
    getX = _;
    return model;
  };

  model.y = function(_) {
    if (!arguments.length) { return getY; }
    getY = utility.functor(_);
    return model;
  };

  model.getKey = function(_) {
    if (!arguments.length) { return getKey; }
    getKey = _;
    return model;
  };

  model.getValue = function(_) {
    if (!arguments.length) { return getValue; }
    getValue = _;
    return model;
  };

  model.getCount = function(_) {
    if (!arguments.length) { return getCount; }
    getCount = _;
    return model;
  };

  model.fmtKey = function(_) {
    if (!arguments.length) { return fmtKey; }
    fmtKey = _;
    return model;
  };

  model.fmtValue = function(_) {
    if (!arguments.length) { return fmtValue; }
    fmtValue = _;
    return model;
  };

  model.fmtCount = function(_) {
    if (!arguments.length) { return fmtCount; }
    fmtCount = _;
    return model;
  };

  model.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    return model;
  };

  model.delay = function(_) {
    if (!arguments.length) { return delay; }
    delay = _;
    return model;
  };

  model.duration = function(_) {
    if (!arguments.length) { return duration; }
    duration = _;
    return model;
  };

  model.locality = function(_) {
    if (!arguments.length) { return locality; }
    locality = utility.buildLocality(_);
    return model;
  };

  // GAUGE

  model.showLabels = function(_) {
    if (!arguments.length) { return showLabels; }
    showLabels = _;
    return model;
  };

  model.labelThreshold = function(_) {
    if (!arguments.length) { return labelThreshold; }
    labelThreshold = _;
    return model;
  };

  model.ringWidth = function(_) {
    if (!arguments.length) { return ringWidth; }
    ringWidth = _;
    return model;
  };
  model.pointerWidth = function(_) {
    if (!arguments.length) { return pointerWidth; }
    pointerWidth = _;
    return model;
  };
  model.pointerTailLength = function(_) {
    if (!arguments.length) { return pointerTailLength; }
    pointerTailLength = _;
    return model;
  };
  model.pointerHeadLength = function(_) {
    if (!arguments.length) { return pointerHeadLength; }
    pointerHeadLength = _;
    return model;
  };
  model.setPointer = function(_) {
    if (!arguments.length) { return model.setGaugePointer; }
    model.setGaugePointer(_);
    return model;
  };
  model.showPointer = function(_) {
    if (!arguments.length) { return showPointer; }
    showPointer = _;
    return model;
  };
  model.minValue = function(_) {
    if (!arguments.length) { return minValue; }
    minValue = _;
    return model;
  };
  model.maxValue = function(_) {
    if (!arguments.length) { return maxValue; }
    maxValue = _;
    return model;
  };
  model.minAngle = function(_) {
    if (!arguments.length) { return minAngle; }
    minAngle = _;
    return model;
  };
  model.maxAngle = function(_) {
    if (!arguments.length) { return maxAngle; }
    maxAngle = _;
    return model;
  };
  model.labelInset = function(_) {
    if (!arguments.length) { return labelInset; }
    labelInset = _;
    return model;
  };

  //============================================================

  return model;
}

function menu() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 10, right: 10, bottom: 15, left: 10},
      width = 0,
      height = 0,
      align = 'right',
      direction = 'ltr',
      position = 'start',
      radius = 6, // size of dot
      diameter = radius * 2, // diamter of dot plus stroke
      gutter = 10, // horizontal gap between keys
      spacing = 12, // vertical gap between keys
      textGap = 5, // gap between dot and label accounting for dot stroke
      equalColumns = true,
      showAll = false,
      showMenu = false,
      collapsed = false,
      rowsCount = 3, //number of rows to display if showAll = false
      enabled = false,
      strings = language(),
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID in case user doesn't select one
      getKey = function(d) {
        return d.key.length > 0 || (!isNaN(parseFloat(d.key)) && utility.isNumeric(d.key)) ? d.key : strings.noLabel;
      },
      color = function(d) {
        return utility.defaultColor()(d, d.seriesIndex);
      },
      classes = function(d) {
        return 'sc-series sc-series-' + d.seriesIndex;
      },
      dispatch = d3.dispatch('legendClick', 'legendMouseover', 'legendMouseout', 'toggleMenu', 'closeMenu');

  // Private Variables
  //------------------------------------------------------------

  var legendOpen = 0;

  var useScroll = false,
      scrollEnabled = true,
      scrollOffset = 0,
      overflowHandler = function() { return; };

  //============================================================

  function legend(selection) {

    selection.each(function(data) {

      var container = d3.select(this),
          keyWidths = [],
          legendHeight = 0,
          dropdownHeight = 0,
          type = '',
          inline = position === 'start' ? true : false,
          rtl = direction === 'rtl' ? true : false,
          lineSpacing = spacing * (inline ? 1 : 0.6),
          padding = gutter + (inline ? diameter + textGap : 0);

      if (!data || !data.length || !data.filter(function(d) { return !d.values || d.values.length; }).length) {
        return legend;
      }

      // enforce existence of series for static legend keys
      var iSeries = data.filter(function(d) { return d.hasOwnProperty('seriesIndex'); }).length;
      data.filter(function(d) { return !d.hasOwnProperty('seriesIndex'); }).map(function(d) {
        d.seriesIndex = iSeries;
        iSeries += 1;
      });

      enabled = true;

      type = !data[0].type || data[0].type === 'bar' ? 'bar' : 'line';
      align = rtl && align !== 'center' ? align === 'left' ? 'right' : 'left' : align;

      //------------------------------------------------------------
      // Setup containers and skeleton of legend

      var wrap_bind = container.selectAll('g.sc-wrap').data([data]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-wrap sc-menu');
      var wrap = container.select('g.sc-wrap').merge(wrap_entr);
      wrap.attr('transform', 'translate(0,0)');

      var defs_entr = wrap_entr.append('defs');
      var defs = wrap.select('defs');

      defs_entr.append('clipPath').attr('id', 'sc-edge-clip-' + id).append('rect');
      var clip = wrap.select('#sc-edge-clip-' + id + ' rect');

      wrap_entr.append('rect').attr('class', 'sc-menu-background');
      var back = wrap.select('.sc-menu-background');
      var backFilter = utility.dropShadow('menu_back_' + id, defs, {blur: 2});

      wrap_entr.append('text').attr('class', 'sc-menu-link');
      var link = wrap.select('.sc-menu-link');

      var mask_entr = wrap_entr.append('g').attr('class', 'sc-menu-mask');
      var mask = wrap.select('.sc-menu-mask');

      mask_entr.append('g').attr('class', 'sc-group');
      var g = wrap.select('.sc-group');

      var series_bind = g.selectAll('.sc-series').data(utility.identity, function(d) { return d.seriesIndex; });
      series_bind.exit().remove();
      var series_entr = series_bind.enter().append('g').attr('class', 'sc-series')
            .on('mouseover', function(d) {
              dispatch.call('legendMouseover', this, d);
            })
            .on('mouseout', function(d) {
              dispatch.call('legendMouseout', this, d);
            })
            .on('click', function(d) {
              d3.event.preventDefault();
              d3.event.stopPropagation();
              dispatch.call('legendClick', this, d);
            });
      var series = g.selectAll('.sc-series').merge(series_entr);
      series
          .attr('class', classes)
          .attr('fill', color)
          .attr('stroke', color);

      var rects_entr = series_entr.append('rect')
            .attr('x', (diameter + textGap) / -2)
            .attr('y', (diameter + lineSpacing) / -2)
            .attr('width', diameter + textGap)
            .attr('height', diameter + lineSpacing)
            .style('fill', '#FFE')
            .style('stroke-width', 0)
            .style('opacity', 0.1);
      var rects = series.selectAll('rect').merge(rects_entr);

      var circles_bind = series_entr.selectAll('circle').data(function(d) { return type === 'line' ? [d, d] : [d]; });
      circles_bind.exit().remove();
      var circles_entr = circles_bind.enter()
        .append('circle')
          .attr('r', radius)
          .style('stroke-width', '2px');
      var circles = series.selectAll('circle').merge(circles_entr);

      var line_bind = series_entr.selectAll('line').data(type === 'line' ? function(d) { return [d]; } : []);
      line_bind.exit().remove();
      var lines_entr = line_bind.enter()
        .append('line')
          .attr('x0', 0)
          .attr('y0', 0)
          .attr('y1', 0)
          .style('stroke-width', '4px');
      var lines = series.selectAll('line').merge(lines_entr);

      var texts_entr = series_entr
        .append('text')
          .attr('dx', 0);
      var texts = series.selectAll('text').merge(texts_entr);

      texts
        .attr('dy', inline ? '.36em' : '.71em')
        .text(getKey);

      //------------------------------------------------------------
      // Update legend attributes

      clip
        .attr('x', 0.5)
        .attr('y', 0.5)
        .attr('width', 0)
        .attr('height', 0);

      back
        .attr('x', 0.5)
        .attr('y', 0.5)
        .attr('width', 0)
        .attr('height', 0)
        .style('opacity', 0)
        .style('pointer-events', 'all')
        .on('click', function() {
          d3.event.stopPropagation();
        });

      link
        .text(legendOpen === 1 ? strings.close : strings.open)
        .attr('text-anchor', align === 'left' ? rtl ? 'end' : 'start' : rtl ? 'start' : 'end')
        .attr('dy', '.36em')
        .attr('dx', 0)
        .style('opacity', 0)
        .on('click', function(d, i) {
          d3.event.preventDefault();
          d3.event.stopPropagation();
          dispatch.call('toggleMenu', this, d, i);
        });

      series.classed('disabled', function(d) {
        return d.disabled;
      });

      //------------------------------------------------------------

      //TODO: add ability to add key to legend
      //TODO: have series display values on hover
      //var label = g.append('text').text('Probability:').attr('class','sc-series-label').attr('transform','translate(0,0)');

      // store legend label widths
      legend.calcMaxWidth = function() {
        keyWidths = [];

        g.style('display', 'inline');

        texts.each(function() {
          var textWidth = d3.select(this).node().getBoundingClientRect().width;
          keyWidths.push(Math.max(Math.floor(textWidth), (type === 'line' ? 50 : 20)));
        });

        legend.width(d3.sum(keyWidths) + keyWidths.length * padding - gutter);

        return legend.width();
      };

      legend.getLineHeight = function() {
        g.style('display', 'inline');
        var lineHeightBB = Math.floor(texts.node().getBoundingClientRect().height);
        return lineHeightBB;
      };

      legend.arrange = function(containerWidth) {

        if (keyWidths.length === 0) {
          this.calcMaxWidth();
        }

        function keyWidth(i) {
          return keyWidths[i] + padding;
        }
        function keyWidthNoGutter(i) {
          return keyWidths[i] + padding - gutter;
        }
        function sign(bool) {
          return bool ? 1 : -1;
        }

        var keys = keyWidths.length,
            rows = 1,
            cols = keys,
            columnWidths = [],
            keyPositions = [],
            maxWidth = containerWidth - margin.left - margin.right,
            maxHeight = height,
            maxRowWidth = 0,
            textHeight = this.getLineHeight(),
            lineHeight = diameter + (inline ? 0 : textHeight) + lineSpacing,
            menuMargin = {top: 7, right: 7, bottom: 7, left: 7}, // account for stroke width
            xpos = 0,
            ypos = 0,
            i,
            mod,
            shift;

        if (equalColumns) {

          //keep decreasing the number of keys per row until
          //legend width is less than the available width
          while (cols > 0) {
            columnWidths = [];

            for (i = 0; i < keys; i += 1) {
              if (keyWidth(i) > (columnWidths[i % cols] || 0)) {
                columnWidths[i % cols] = keyWidth(i);
              }
            }

            if (d3.sum(columnWidths) - gutter < maxWidth) {
              break;
            }
            cols -= 1;
          }
          cols = cols || 1;

          rows = Math.ceil(keys / cols);
          maxRowWidth = d3.sum(columnWidths) - gutter;

          for (i = 0; i < keys; i += 1) {
            mod = i % cols;

            if (inline) {
              if (mod === 0) {
                xpos = rtl ? maxRowWidth : 0;
              } else {
                xpos += columnWidths[mod - 1] * sign(!rtl);
              }
            } else {
              if (mod === 0) {
                xpos = (rtl ? maxRowWidth : 0) + (columnWidths[mod] - gutter) / 2 * sign(!rtl);
              } else {
                xpos += (columnWidths[mod - 1] + columnWidths[mod]) / 2 * sign(!rtl);
              }
            }

            ypos = Math.floor(i / cols) * lineHeight;
            keyPositions[i] = {x: xpos, y: ypos};
          }

        } else {

          if (rtl) {

            xpos = maxWidth;

            for (i = 0; i < keys; i += 1) {
              if (xpos - keyWidthNoGutter(i) < 0) {
                maxRowWidth = Math.max(maxRowWidth, keyWidthNoGutter(i));
                xpos = maxWidth;
                if (i) {
                  rows += 1;
                }
              }
              if (xpos - keyWidthNoGutter(i) > maxRowWidth) {
                maxRowWidth = xpos - keyWidthNoGutter(i);
              }
              keyPositions[i] = {x: xpos, y: (rows - 1) * (lineSpacing + diameter)};
              xpos -= keyWidth(i);
            }

          } else {

            xpos = 0;

            for (i = 0; i < keys; i += 1) {
              if (i && xpos + keyWidthNoGutter(i) > maxWidth) {
                xpos = 0;
                rows += 1;
              }
              if (xpos + keyWidthNoGutter(i) > maxRowWidth) {
                maxRowWidth = xpos + keyWidthNoGutter(i);
              }
              keyPositions[i] = {x: xpos, y: (rows - 1) * (lineSpacing + diameter)};
              xpos += keyWidth(i);
            }

          }

        }

        if (!showMenu && (showAll || rows <= rowsCount)) {

          legendOpen = 0;
          collapsed = false;
          useScroll = false;

          legend
            .width(margin.left + maxRowWidth + margin.right)
            .height(margin.top + rows * lineHeight - lineSpacing + margin.bottom);

          switch (align) {
            case 'left':
              shift = 0;
              break;
            case 'center':
              shift = (containerWidth - legend.width()) / 2;
              break;
            case 'right':
              shift = 0;
              break;
          }

          clip
            .attr('y', 0)
            .attr('width', legend.width())
            .attr('height', legend.height());

          back
            .attr('x', shift)
            .attr('width', legend.width())
            .attr('height', legend.height())
            .attr('rx', 0)
            .attr('ry', 0)
            .attr('filter', 'none')
            .style('display', 'inline')
            .style('opacity', 0);

          mask
            .attr('clip-path', 'none')
            .attr('transform', function() {
              var xpos = shift + margin.left + (inline ? radius * sign(!rtl) : 0),
                  ypos = margin.top + menuMargin.top;
              return 'translate(' + xpos + ',' + ypos + ')';
            });

          g
            .style('opacity', 1)
            .style('display', 'inline');

          series
            .attr('transform', function(d) {
              var pos = keyPositions[d.seriesIndex];
              return 'translate(' + pos.x + ',' + pos.y + ')';
            });

          rects
            .attr('x', function(d) {
              var xpos = 0;
              if (inline) {
                xpos = (diameter + gutter) / 2 * sign(rtl);
                xpos -= rtl ? keyWidth(d.seriesIndex) : 0;
              } else {
                xpos = keyWidth(d.seriesIndex) / -2;
              }
              return xpos;
            })
            .attr('width', function(d) {
              return keyWidth(d.seriesIndex);
            })
            .attr('height', lineHeight);

          circles
            .attr('r', function(d) {
              return d.type === 'dash' ? 0 : radius;
            })
            .attr('transform', function(d, i) {
              var xpos = inline || type === 'bar' ? 0 : radius * 3 * sign(i);
              return 'translate(' + xpos + ',0)';
            });

          lines
            .attr('x1', function(d) {
              return d.type === 'dash' ? radius * 8 : radius * 4;
            })
            .attr('transform', function(d) {
              var xpos = radius * (d.type === 'dash' ? -4 : -2);
              return 'translate(' + xpos + ',0)';
            })
            .style('stroke-dasharray', function(d) {
              return d.type === 'dash' ? '8, 8' : 'none';
            })
            .style('stroke-dashoffset', -4);

          texts
            .attr('dy', inline ? '.36em' : '.71em')
            .attr('text-anchor', position)
            .attr('transform', function() {
              var xpos = inline ? (radius + textGap) * sign(!rtl) : 0,
                  ypos = inline ? 0 : (diameter + lineSpacing) / 2;
              return 'translate(' + xpos + ',' + ypos + ')';
            });

        } else {

          collapsed = true;
          useScroll = true;

          legend
            .width(menuMargin.left + d3.max(keyWidths) + diameter + textGap + menuMargin.right)
            .height(margin.top + diameter + margin.top); //don't use bottom here because we want vertical centering

          legendHeight = menuMargin.top + diameter * keys + spacing * (keys - 1) + menuMargin.bottom;
          dropdownHeight = Math.min(maxHeight - legend.height(), legendHeight);

          clip
            .attr('x', 0.5 - menuMargin.top - radius)
            .attr('y', 0.5 - menuMargin.top - radius)
            .attr('width', legend.width())
            .attr('height', dropdownHeight);

          back
            .attr('x', 0.5)
            .attr('y', 0.5 + legend.height())
            .attr('width', legend.width())
            .attr('height', dropdownHeight)
            .attr('rx', 2)
            .attr('ry', 2)
            .attr('filter', backFilter)
            .style('opacity', legendOpen * 0.9)
            .style('display', legendOpen ? 'inline' : 'none');

          link
            .attr('transform', function() {
              var xpos = align === 'left' ? 0.5 : 0.5 + legend.width(),
                  ypos = margin.top + radius;
              return 'translate(' + xpos + ',' + ypos + ')';
            })
            .style('opacity', 1);

          mask
            .attr('clip-path', 'url(#sc-edge-clip-' + id + ')')
            .attr('transform', function() {
              var xpos = menuMargin.left + radius,
                  ypos = legend.height() + menuMargin.top + radius;
              return 'translate(' + xpos + ',' + ypos + ')';
            });

          g
            .style('opacity', legendOpen)
            .style('display', legendOpen ? 'inline' : 'none')
            .attr('transform', function() {
              var xpos = rtl ? d3.max(keyWidths) + radius : 0;
              return 'translate(' + xpos + ',0)';
            });

          series
            .attr('transform', function(d, i) {
              var ypos = i * (diameter + spacing);
              return 'translate(0,' + ypos + ')';
            });

          rects
            .attr('x', function(d) {
              var x = (diameter + gutter) / 2 * sign(rtl);
              x -= rtl ? keyWidth(d.seriesIndex) : 0;
              return x;
            })
            .attr('width', function(d) {
              return keyWidth(d.seriesIndex);
            })
            .attr('height', diameter + lineSpacing);

          circles
            .attr('r', function(d) {
              return d.type === 'dash' ? 0 : d.type === 'line' ? radius - 2 : radius;
            })
            .attr('transform', '');

          lines
            .attr('x1', 16)
            .attr('transform', 'translate(-8,0)')
            .style('stroke-dasharray', function(d) {
              return d.type === 'dash' ? '6, 4, 6' : 'none';
            })
            .style('stroke-dashoffset', 0);

          texts
            .attr('text-anchor', 'start')
            .attr('dy', '.36em')
            .attr('transform', function() {
              var xpos = (radius + textGap) * sign(!rtl);
              return 'translate(' + xpos + ',0)';
            });

        }

        //------------------------------------------------------------
        // Enable scrolling
        if (scrollEnabled) {
          var maxScroll = dropdownHeight - legendHeight;

          var assignScrollEvents = function(enable) {
            if (enable) {
              var zoom = d3.zoom().on('zoom', panLegend);
              back.call(zoom);
              g.call(zoom);
            } else {
              back.on('.zoom', null);
              g.on('.zoom', null);
            }
          };

          var panLegend = function() {
            var evt = d3.event;
            var src;
            var x = 0;
            var y = 0;
            var distance = 0;
            var translate = '';

            // we need click for handling legend toggle
            if (!evt || (evt.type !== 'click' && evt.type !== 'zoom')) {
              return;
            }
            src = evt.sourceEvent;

            // don't fire on events other than zoom and drag
            if (evt.type === 'zoom' && src) {
              if (src.type === 'wheel') {
                x = -src.deltaX;
                y = -src.deltaY;
                distance = scrollOffset + (Math.abs(x) > Math.abs(y) ? x : y);
              } else if (src.type === 'mousemove') {
                x = src.movementX;
                y = src.movementY;
                distance = scrollOffset + (Math.abs(x) > Math.abs(y) ? x : y);
              } else if (src.type === 'touchmove') {
                x = evt.transform.x;
                y = evt.transform.y;
                distance = (Math.abs(x) > Math.abs(y) ? x : y);
              }
            }

            // reset value defined in panMultibar();
            scrollOffset = Math.min(Math.max(distance, maxScroll), 0);
            translate = 'translate(' + (rtl ? d3.max(keyWidths) + radius : 0) + ',' + scrollOffset + ')';

            if (distance > 0 || distance < maxScroll) {
              overflowHandler(Math.abs(y) > Math.abs(x) ? y : 0);
            }

            g.attr('transform', translate);
          };

          assignScrollEvents(useScroll);
        }

      };

      //============================================================
      // Event Handling/Dispatching (in legend's scope)
      //------------------------------------------------------------

      function displayMenu() {
        back
          .style('opacity', legendOpen * 0.9)
          .style('display', legendOpen ? 'inline' : 'none');
        g
          .style('opacity', legendOpen)
          .style('display', legendOpen ? 'inline' : 'none');
        link
          .text(legendOpen === 1 ? strings.close : strings.open);
      }

      dispatch.on('toggleMenu', function() {
        d3.event.stopPropagation();
        legendOpen = 1 - legendOpen;
        displayMenu();
      });

      dispatch.on('closeMenu', function() {
        if (legendOpen === 1) {
          legendOpen = 0;
          displayMenu();
        }
      });

    });

    return legend;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  legend.dispatch = dispatch;

  legend.margin = function(_) {
    if (!arguments.length) { return margin; }
    margin.top    = typeof _.top    !== 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  !== 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom !== 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   !== 'undefined' ? _.left   : margin.left;
    return legend;
  };

  legend.width = function(_) {
    if (!arguments.length) {
      return width;
    }
    width = Math.round(_);
    return legend;
  };

  legend.height = function(_) {
    if (!arguments.length) {
      return height;
    }
    height = Math.round(_);
    return legend;
  };

  legend.id = function(_) {
    if (!arguments.length) {
      return id;
    }
    id = _;
    return legend;
  };

  legend.key = function(_) {
    if (!arguments.length) {
      return getKey;
    }
    getKey = _;
    return legend;
  };

  legend.color = function(_) {
    if (!arguments.length) {
      return color;
    }
    color = utility.getColor(_);
    return legend;
  };

  legend.classes = function(_) {
    if (!arguments.length) {
      return classes;
    }
    classes = _;
    return legend;
  };

  legend.align = function(_) {
    if (!arguments.length) {
      return align;
    }
    align = _;
    return legend;
  };

  legend.position = function(_) {
    if (!arguments.length) {
      return position;
    }
    position = _;
    return legend;
  };

  legend.showAll = function(_) {
    if (!arguments.length) { return showAll; }
    showAll = _;
    return legend;
  };

  legend.showMenu = function(_) {
    if (!arguments.length) { return showMenu; }
    showMenu = _;
    return legend;
  };

  legend.collapsed = function() {
    return collapsed;
  };

  legend.rowsCount = function(_) {
    if (!arguments.length) {
      return rowsCount;
    }
    rowsCount = _;
    return legend;
  };

  legend.spacing = function(_) {
    if (!arguments.length) {
      return spacing;
    }
    spacing = _;
    return legend;
  };

  legend.gutter = function(_) {
    if (!arguments.length) {
      return gutter;
    }
    gutter = _;
    return legend;
  };

  legend.radius = function(_) {
    if (!arguments.length) {
      return radius;
    }
    radius = _;
    return legend;
  };

  legend.strings = function(_) {
    if (!arguments.length) {
      return strings;
    }
    strings = _;
    return legend;
  };

  legend.equalColumns = function(_) {
    if (!arguments.length) {
      return equalColumns;
    }
    equalColumns = _;
    return legend;
  };

  legend.enabled = function(_) {
    if (!arguments.length) {
      return enabled;
    }
    enabled = _;
    return legend;
  };

  legend.direction = function(_) {
    if (!arguments.length) {
      return direction;
    }
    direction = _;
    return legend;
  };

  //============================================================


  return legend;
}

function headers() {
  var width = 960;
  var height = 500;

  var chart = null;
  var controls = menu();
  var legend = menu();

  var title = '';
  var controlsData = [];
  var legendData = [];

  var showTitle = false;
  var showControls = false;
  var showLegend = false;  // var clipEdge = false; // if true, masks lines within x and y scale

  var alignControls = 'left';
  var alignLegend = 'right';

  var direction = 'ltr';
  var strings = language();


  function model(selection) {
    selection.each(function() {

      var container = d3.select(this);
      var wrap = container.select('.sc-chart-wrap');
      var title_wrap = wrap.select('.sc-title-wrap');
      var controls_wrap = wrap.select('.sc-controls-wrap');
      var legend_wrap = wrap.select('.sc-legend-wrap');

      var margin = chart.margin();

      var xpos = 0,
          ypos = 0;

      // Header variables
      var maxControlsWidth = 0,
          maxLegendWidth = 0,
          widthRatio = 0,
          titleBBox = {width: 0, height: 0, top: 0, left: 0},
          titleHeight = 0,
          controlsHeight = 0,
          legendHeight = 0;



      // set title display option
      showTitle = showTitle && title && title.length > 0;

      title_wrap.select('.sc-title').remove();

      if (showTitle) {
        title_wrap
          .append('text')
            .attr('class', 'sc-title')
            .attr('x', direction === 'rtl' ? width : 0)
            .attr('y', 0)
            .attr('dy', '.75em')
            .attr('text-anchor', 'start')
            .attr('stroke', 'none')
            .attr('fill', 'black')
            .text(title);

        titleBBox = utility.getTextBBox(title_wrap.select('.sc-title'), true);
        // getBoundingClientRect is relative to viewport
        // we need relative to container
        titleBBox.top -= container.node().getBoundingClientRect().top;

        titleHeight = titleBBox.height;
      }

      if (showControls) {
        controls
          .id('controls_' + chart.id())
          .strings(strings.controls)
          .color(['#444'])
          .align(alignControls)
          .height(height - titleHeight);
        controls_wrap
          .datum(controlsData)
          .call(controls);

        maxControlsWidth = controls.calcMaxWidth();
      }

      if (showLegend) {
        legend
          .id('legend_' + chart.id())
          .strings(strings.legend)
          .align(alignLegend)
          .height(height - titleHeight);
        legend_wrap
          .datum(legendData)
          .call(legend);

        maxLegendWidth = legend.calcMaxWidth();
      }

      // calculate proportional available space
      widthRatio = width / (maxControlsWidth + maxLegendWidth);
      maxControlsWidth = Math.floor(maxControlsWidth * widthRatio);
      maxLegendWidth = Math.floor(maxLegendWidth * widthRatio);

      if (showControls) {
        controls
          .arrange(maxControlsWidth);
        maxLegendWidth = width - controls.width();
      }

      if (showLegend) {
        legend
          .arrange(maxLegendWidth);
        maxControlsWidth = width - legend.width();
      }

      if (showControls) {
        xpos = direction === 'rtl' ? width - controls.width() : 0;
        if (showTitle) {
          // align top of legend space at bottom of title
          ypos = titleBBox.height - margin.top + titleBBox.top;
        } else {
          // align top of legend keys at top margin
          ypos = 0 - controls.margin().top;
        }
        controls_wrap
          .attr('transform', utility.translation(xpos, ypos));

        controlsHeight = controls.height() - (showTitle ? 0 : controls.margin().top);
      }

      if (showLegend) {
        var legendLinkBBox = utility.getTextBBox(legend_wrap.select('.sc-menu-link')),
            legendSpace = width - titleBBox.width - 6,
            legendTop = showTitle && !showControls && legend.collapsed() && legendSpace > legendLinkBBox.width ? true : false;

        xpos = direction === 'rtl' || (!legend.collapsed() && alignLegend === 'center') ? 0 : width - legend.width();

        if (legendTop) {
          // center legend link at middle of legend space
          ypos = titleBBox.height - legend.height() / 2 - legendLinkBBox.height / 2;
          // shift up by title baseline offset
          ypos -= margin.top - titleBBox.top;
        } else if (showTitle) {
          // align top of legend space at bottom of title
          ypos = titleBBox.height - margin.top + titleBBox.top;
        } else {
          // align top of legend keys at top margin
          ypos = 0 - legend.margin().top;
        }
        legend_wrap
          .attr('transform', utility.translation(xpos, ypos));

        legendHeight = legendTop ? legend.margin().bottom : legend.height() - (showTitle ? 0 : legend.margin().top);
      }

      model.getHeight = function() {
        var headerHeight = titleHeight + Math.max(controlsHeight, legendHeight, 10);
        return headerHeight;
      };

    });

    return model;
  }

  model.controls = controls;
  model.legend = legend;

  model.chart = function(_) {
    if (!arguments.length) { return chart; }
    chart = _;
    return model;
  };

  model.width = function(_) {
    if (!arguments.length) { return width; }
    width = _;
    return model;
  };

  model.height = function(_) {
    if (!arguments.length) { return height; }
    height = _;
    return model;
  };

  model.title = function(_) {
    if (!arguments.length) { return title; }
    title = _;
    return model;
  };
  model.controlsData = function(_) {
    if (!arguments.length) { return controlsData; }
    controlsData = _;
    return model;
  };

  model.legendData = function(_) {
    if (!arguments.length) { return legendData; }
    legendData = _;
    return model;
  };

  model.showTitle = function(_) {
    if (!arguments.length) { return showTitle; }
    showTitle = _;
    return model;
  };

  model.showControls = function(_) {
    if (!arguments.length) { return showControls; }
    showControls = _;
    return model;
  };

  model.showLegend = function(_) {
    if (!arguments.length) { return showLegend; }
    showLegend = _;
    return model;
  };

  model.alignControls = function(_) {
    if (!arguments.length) { return alignControls; }
    alignControls = _;
    return model;
  };

  model.alignLegend = function(_) {
    if (!arguments.length) { return alignLegend; }
    alignLegend = _;
    return model;
  };

  model.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    legend.direction(_);
    controls.direction(_);
    return model;
  };

  model.strings = function(_) {
    if (!arguments.length) { return strings; }
    strings = language(_);
    legend.strings(strings.legend);
    controls.strings(strings.controls);
    return model;
  };

  return model;
}

function scatter() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var id = Math.floor(Math.random() * 100000), //Create semi-unique ID incase user doesn't select one
      width = 960,
      height = 500,
      margin = {top: 0, right: 0, bottom: 0, left: 0},
      color = function(d, i) { return utility.defaultColor()(d, d.seriesIndex); }, // chooses color
      gradient = utility.colorRadialGradient,
      fill = color,
      classes = function(d, i) { return 'sc-series sc-series-' + d.seriesIndex; },
      x = d3.scaleLinear(),
      y = d3.scaleLinear(),
      z = d3.scaleLinear(), //linear because d3.symbol.size is treated as area
      getX = function(d) { return d.x; }, // accessor to get the x value
      getY = function(d) { return d.y; }, // accessor to get the y value
      getZ = function(d) { return d.size || 1; }, // accessor to get the point size, set by public method .size()
      forceX = [], // List of numbers to Force into the X scale (ie. 0, or a max / min, etc.)
      forceY = [], // List of numbers to Force into the Y scale
      forceZ = [], // List of numbers to Force into the Size scale
      xDomain = null, // Override x domain (skips the calculation from data)
      yDomain = null, // Override y domain
      zDomain = null, // Override point size domain
      zRange = [1 * 1 * Math.PI, 5 * 5 * Math.PI],
      circleRadius = function(d, i) {
        // a = pi*r^2
        // a / pi = r^2
        // sqrt(a / pi) = r
        // 1 = 1 * pi , 5 = 25 * pi
        return Math.sqrt(z(getZ(d, i)) / Math.PI);
      }, // function to get the radius for voronoi point clips
      symbolSize = function(d, i) {
        return z(getZ(d, i));
      },
      getShape = function(d) { return d.shape || 'circle'; }, // accessor to get point shape
      locality = utility.buildLocality(),
      onlyCircles = true, // Set to false to use shapes

      interactive = true, // If true, plots a voronoi overlay for advanced point intersection
      pointActive = function(d) { return !d.notActive; }, // any points that return false will be filtered out
      padData = false, // If true, adds half a data points width to front and back, for lining up a line chart with a bar chart
      padDataOuter = 0.1, //outerPadding to imitate ordinal scale outer padding
      direction = 'ltr',
      clipEdge = false, // if true, masks points within x and y scale
      delay = 0,
      duration = 0,
      useVoronoi = true,
      clipVoronoi = true, // if true, masks each point with a circle... can turn off to slightly increase performance
      singlePoint = false,
      dispatch = d3.dispatch('elementClick', 'elementMouseover', 'elementMouseout', 'elementMousemove'),
      nice = false;

  //============================================================


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var x0, y0, z0, // used to store previous scales
      timeoutID,
      needsUpdate = false; // Flag for when the points are visually updating, but the interactive layer is behind, to disable tooltips

  //============================================================


  function model(selection) {
    selection.each(function(data) {

      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          container = d3.select(this);

      var t = d3.transition('scatter')
          .duration(duration)
          .ease(d3.easeLinear);

      needsUpdate = true;

      //------------------------------------------------------------
      // Setup Scales

      // remap and flatten the data for use in calculating the scales' domains
      // if we know xDomain and yDomain and zDomain, no need to calculate....
      // if Size is constant remember to set zDomain to speed up performance
      var seriesData = (xDomain && yDomain && zDomain) ? [] :
            d3.merge(
              data.map(function(d) {
                return d.values.map(function(d, i) {
                  return { x: getX(d, i), y: getY(d, i), size: getZ(d, i) };
                });
              })
            );

      model.resetDimensions = function(w, h) {
        width = w;
        height = h;
        availableWidth = w - margin.left - margin.right;
        availableHeight = h - margin.top - margin.bottom;
        resetScale();
      };

      function resetScale() {
        // WHEN GETX RETURN 1970, THIS FAILS, BECAUSE X IS A DATETIME SCALE
        // RESOLVE BY MAKING SURE GETX RETURN A DATE OBJECT WHEN X SCALE IS DATETIME

        x.domain(xDomain || d3.extent(seriesData.map(getX).concat(forceX)));
        y.domain(yDomain || d3.extent(seriesData.map(getY).concat(forceY)));

        if (padData && data[0]) {
          if (padDataOuter === -1) {
            // shift range so that largest bubble doesn't cover scales
            var largestPossible = Math.sqrt(zRange[1] / Math.PI);
            x.range([
              0 + largestPossible,
              availableWidth - largestPossible
            ]);
            y.range([
              availableHeight - largestPossible,
              0 + largestPossible
            ]);
          } else if (padDataOuter < 1) {
            // adjust range to line up with value bars
            x.range([
              (availableWidth * padDataOuter + availableWidth) / (2 * data[0].values.length),
              availableWidth - availableWidth * (1 + padDataOuter) / (2 * data[0].values.length)
            ]);
            y.range([availableHeight, 0]);
          } else {
            x.range([
              padDataOuter,
              availableWidth - padDataOuter
            ]);
            y.range([
              availableHeight - padDataOuter,
              padDataOuter
            ]);
          }
          // From original sucrose
          //x.range([
          //   availableWidth * .5 / data[0].values.length,
          //   availableWidth * (data[0].values.length - .5) / data[0].values.length
          // ]);
        } else {
          x.range([0, availableWidth]);
          y.range([availableHeight, 0]);
        }

        if (nice) {
          y.nice();
        }

        // If scale's domain don't have a range, slightly adjust to make one... so a chart can show a single data point
        singlePoint = (x.domain()[0] === x.domain()[1] || y.domain()[0] === y.domain()[1]);

        if (x.domain()[0] === x.domain()[1]) {
          x.domain()[0] ?
            x.domain([x.domain()[0] - x.domain()[0] * 0.1, x.domain()[1] + x.domain()[1] * 0.1]) :
            x.domain([-1, 1]);
        }

        if (y.domain()[0] === y.domain()[1]) {
          y.domain()[0] ?
            y.domain([y.domain()[0] - y.domain()[0] * 0.1, y.domain()[1] + y.domain()[1] * 0.1]) :
            y.domain([-1, 1]);
        }

        z.domain(zDomain || d3.extent(seriesData.map(function(d) { return d.size; }).concat(forceZ)))
         .range(zRange);

        if (z.domain().length < 2) {
          z.domain([0, z.domain()]);
        }

        x0 = x0 || x;
        y0 = y0 || y;
        z0 = z0 || z;
      }

      resetScale();

      //------------------------------------------------------------
      // Setup containers and skeleton of model

      var wrap_bind = container.selectAll('g.sc-wrap.sc-scatter').data([data]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-wrap sc-scatter');
      var wrap = container.select('.sc-wrap.sc-scatter').merge(wrap_entr);

      var defs_entr = wrap_entr.append('defs');
      var defs = wrap.select('defs');

      wrap_entr.append('g').attr('class', 'sc-group');
      var group_wrap = wrap.select('.sc-group');

      wrap_entr.append('g').attr('class', 'sc-point-paths');
      var paths_wrap = wrap.select('.sc-point-paths');

      wrap
        .classed('sc-single-point', singlePoint)
        .attr('transform', utility.translation(margin.left, margin.top));

      //------------------------------------------------------------

      defs_entr.append('clipPath')
        .attr('id', 'sc-edge-clip-' + id)
        .append('rect');
      defs_entr.append('clipPath')
        .attr('id', 'sc-points-clip-' + id)
        .attr('class', 'sc-point-clips');

      defs.select('#sc-edge-clip-' + id + ' rect')
          .attr('width', availableWidth)
          .attr('height', availableHeight);

      wrap.attr('clip-path', clipEdge ? 'url(#sc-edge-clip-' + id + ')' : '');

      // set up the gradient constructor function
      model.gradientFill = function(d, i) {
        var gradientId = id + '-' + i;
        var params = {
          x: 0.5,
          y: 0.5,
          r: 0.5,
          s: 0,
          u: 'objectBoundingBox'
        };
        var c = color(d, i);
        return gradient(d, gradientId, params, c, defs);
      };

      //------------------------------------------------------------
      // Series

      var series_bind = group_wrap.selectAll('.sc-series')
            .data(utility.identity, function(d) { return d.seriesIndex; });
      var series_entr = series_bind.enter().append('g')
            .attr('class', 'sc-series')
            .style('stroke-opacity', 1e-6)
            .style('fill-opacity', 1e-6);
      var series = group_wrap.selectAll('.sc-series').merge(series_entr);

      series
        .attr('class', function(d, i) { return classes(d, d.seriesIndex); })
        .attr('fill', function(d, i) { return fill(d, d.seriesIndex); })
        .attr('stroke', function(d, i) { return fill(d, d.seriesIndex); })
        .classed('hover', function(d) { return d.hover; });
      series
        .transition(t)
          .style('stroke-opacity', 1)
          .style('fill-opacity', 1);
      series_bind.exit()
        .transition(t)
          .style('stroke-opacity', 1e-6)
          .style('fill-opacity', 1e-6)
          .remove();

      //------------------------------------------------------------
      // Interactive Layer

      var points_bind;
      var points_entr;
      var points;

      if (onlyCircles) {

        points_bind = series.selectAll('circle.sc-point')
          .data(function(d) { return d.values; });
        points_entr = points_bind.enter().append('circle')
          .attr('class', function(d, i) { return 'sc-point sc-enter sc-point-' + i; })
          .attr('r', circleRadius);
        points = series.selectAll('.sc-point').merge(points_entr);

        points
          .filter(function(d) {
            return d3.select(this).classed('sc-enter');
          })
          .attr('cx', function(d, i) {
            return x(getX(d, i));
          })
          .attr('cy', function(d, i) {
            return y(0);
          });
        points
          .transition(t)
            .attr('cx', function(d, i) { return x(getX(d, i)); })
            .attr('cy', function(d, i) { return y(getY(d, i)); })
            .on('end', function(d) {
              d3.select(this)
                .classed('sc-enter', false)
                .classed('sc-active', function(d) {
                  return d.active === 'active';
                });
            });

        series_bind.exit()
          .transition(t).selectAll('.sc-point')
            .attr('cx', function(d, i) { return x(getX(d, i)); })
            .attr('cy', function(d, i) { return y(0); })
            .remove();

      } else {

        points_bind = series.selectAll('path.sc-point').data(function(d) { return d.values; });
        points_entr = points_bind.enter().append('path')
          .attr('class', function(d, i) { return 'sc-point sc-enter sc-point-' + i; })
          .attr('d',
            d3.symbol()
              .type(getShape)
              .size(symbolSize)
          );
        points = series.selectAll('.sc-point').merge(points_entr);

        points
          .filter(function(d) {
            return d3.select(this).classed('sc-enter');
          })
          .attr('transform', function(d, i) {
            return 'translate(' + x0(getX(d, i)) + ',' + y(0) + ')';
          });
        points
          .transition(t)
            .attr('transform', function(d, i) {
              return 'translate(' + x(getX(d, i)) + ',' + y(getY(d, i)) + ')';
            })
            .attr('d',
              d3.symbol()
                .type(getShape)
                .size(symbolSize)
            )
            .on('end', function(d) {
              d3.select(this)
                .classed('sc-enter', false)
                .classed('active', function(d) {
                  return d.active === 'active';
                });
            });

        series_bind.exit()
          .transition(t).selectAll('.sc-point')
            .attr('transform', function(d, i) {
              return 'translate(' + x(getX(d, i)) + ',' + y(0) + ')';
            })
            .remove();

      }

      function buildEventObject(e, p, i, s) {
        var eo = {
            pointIndex: i,
            point: p,
            seriesIndex: s.seriesIndex,
            series: s,
            groupIndex: p.group,
            id: id,
            e: e
          };
        return eo;
      }

      function updateInteractiveLayer() {

        if (!interactive) {
          return false;
        }

        //inject series, group and point index for reference into voronoi
        if (useVoronoi === true) {

          var vertices = d3.merge(data.map(function(series, seriesIndex) {
              return series.values
                .map(function(point, pointIndex) {
                  // *Adding noise to make duplicates very unlikely
                  // *Injecting series and point index for reference
                  /* *Adding a 'jitter' to the points, because there's an issue in d3.voronoi.
                   */
                  var pX = getX(point, pointIndex);
                  var pY = getY(point, pointIndex);
                  var groupIndex = point.group;

                  return [
                      x(pX) + Math.random() * 1e-4,
                      y(pY) + Math.random() * 1e-4,
                      point,
                      seriesIndex,
                      groupIndex,
                      pointIndex
                    ]; //temp hack to add noise until I think of a better way so there are no duplicates
                })
                .filter(function(pointArray, pointIndex) {
                  return pointActive(pointArray[4], pointIndex); // Issue #237.. move filter to after map, so pointIndex is correct!
                });
            })
          );

          if (vertices.length <= 3) {
            // Issue #283 - Adding 2 dummy points to the voronoi b/c voronoi requires min 3 points to work
            vertices.push([x.range()[0] - 20, y.range()[0] - 20, null, null, null, null]);
            vertices.push([x.range()[1] + 20, y.range()[1] + 20, null, null, null, null]);
            vertices.push([x.range()[0] - 20, y.range()[0] + 20, null, null, null, null]);
            vertices.push([x.range()[1] + 20, y.range()[1] - 20, null, null, null, null]);
          }

          try {
            var voronoi = d3.voronoi()
                  .extent([[-10, -10], [width + 10, height + 10]])
                  .polygons(vertices)
                  .map(function(d, i) {
                    return {
                      'data': d,
                      'seriesIndex': vertices[i][3],
                      'groupIndex': vertices[i][4],
                      'pointIndex': vertices[i][5]
                    };
                  })
                  .filter(function(d) { return d.seriesIndex !== null; });
          } catch (e) {
            useVoronoi = false;
            // eslint-disable-next-line
            console.warn('Sucrose: [ERROR] D3 Voronoi paths in line chart are disabled due to error.');
          }

        }

        if (useVoronoi) {

          if (clipVoronoi) {
            var clips_bind = wrap.select('#sc-points-clip-' + id).selectAll('circle').data(vertices);
            var clips_entr = clips_bind.enter().append('circle');
            var clips = wrap.select('#sc-points-clip-' + id).selectAll('circle').merge(clips_entr);
            clips_bind.exit().remove();

            clips
              .attr('cx', function(d) { return d[0]; })
              .attr('cy', function(d) { return d[1]; })
              .attr('r', function(d, i) {
                // Fallback to 25 which is the nvd3 default
                // This should only happen when we have less than 4 records and have to use dummy points
                return d[2] ? circleRadius(d[2], i) : 25;
              });

            paths_wrap
                .attr('clip-path', 'url(#sc-points-clip-' + id + ')');
          }

          var paths_bind = paths_wrap.selectAll('path').data(voronoi);
          var paths_entr = paths_bind.enter().append('path').attr('class', function(d, i) { return 'sc-path-' + i; });
          var paths = paths_wrap.selectAll('path').merge(paths_entr);
          paths_bind.exit().remove();

          paths
            .attr('d', function(d) { return d ? 'M' + d.data.join('L') + 'Z' : null; })
            .on('mouseover', function(d) {
              var s = data[d.seriesIndex];
              var i = d.pointIndex;
              var p = s.values[i];
              if (needsUpdate || !s) return 0;
              var eo = buildEventObject(d3.event, p, i, s);
              dispatch.call('elementMouseover', this, eo);
            })
            .on('mousemove', function(d) {
              var e = d3.event;
              dispatch.call('elementMousemove', this, e);
            })
            .on('mouseout', function(d) {
              var s = data[d.seriesIndex];
              var i = d.pointIndex;
              var p = s.values[i];
              if (needsUpdate || !s) return 0;
              var eo = buildEventObject(d3.event, p, i, s);
              dispatch.call('elementMouseout', this, eo);
            })
            .on('click', function(d) {
              var s = data[d.seriesIndex];
              var i = d.pointIndex;
              var p = s.values[i];
              if (needsUpdate || !s) return 0;
              var eo = buildEventObject(d3.event, p, i, s);
              dispatch.call('elementClick', this, eo);
            });

        } else {

          // add event handlers to points instead voronoi paths
          series.selectAll('.sc-point')
            //.data(dataWithPoints)
            .style('pointer-events', 'auto') // recaptivate events, disabled by css
            .on('mouseover', function(d, i) {
              var s = d3.select(this.parentNode).datum();
              var p = s.values[i];
              if (needsUpdate || !s) return 0; //check if this is a dummy point
              var eo = buildEventObject(d3.event, p, i, s);
              dispatch.call('elementMouseover', this, eo);
            })
            .on('mousemove', function(d, i) {
              var e = d3.event;
              dispatch.call('elementMousemove', this, e);
            })
            .on('mouseout', function(d, i) {
              var s = d3.select(this.parentNode).datum();
              var p = s.values[i];
              if (needsUpdate || !s) return 0; //check if this is a dummy point
              var eo = buildEventObject(d3.event, p, i, s);
              dispatch.call('elementMouseout', this, eo);
            })
            .on('click', function(d, i) {
              var s = d3.select(this.parentNode).datum();
              var p = s.values[i];
              if (needsUpdate || !s) return 0; //check if this is a dummy point
              var eo = buildEventObject(d3.event, p, i, s);
              dispatch.call('elementClick', this, eo);
            });

        }

        needsUpdate = false;
      }

      // Delay updating the invisible interactive layer for smoother animation
      clearTimeout(timeoutID); // stop repeat calls to updateInteractiveLayer
      timeoutID = setTimeout(updateInteractiveLayer, 300);

      //store old scales for use in transitions on update
      x0 = x.copy();
      y0 = y.copy();
      z0 = z.copy();

      //============================================================
      // Event Handling/Dispatching (in model's scope)
      //------------------------------------------------------------

      dispatch.on('elementMouseover.point', function(eo) {
        if (interactive) {
          container.select('.sc-series-' + eo.seriesIndex + ' .sc-point-' + eo.pointIndex)
            .classed('hover', true);
        }
      });

      dispatch.on('elementMouseout.point', function(eo) {
        if (interactive) {
          container.select('.sc-series-' + eo.seriesIndex + ' .sc-point-' + eo.pointIndex)
            .classed('hover', false);
        }
      });

    });

    return model;
  }

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  model.dispatch = dispatch;

  model.id = function(_) {
    if (!arguments.length) { return id; }
    id = _;
    return model;
  };
  model.color = function(_) {
    if (!arguments.length) { return color; }
    color = _;
    return model;
  };
  model.fill = function(_) {
    if (!arguments.length) { return fill; }
    fill = _;
    return model;
  };
  model.classes = function(_) {
    if (!arguments.length) { return classes; }
    classes = _;
    return model;
  };
  model.gradient = function(_) {
    if (!arguments.length) { return gradient; }
    gradient = _;
    return model;
  };

  model.x = function(_) {
    if (!arguments.length) { return getX; }
    getX = utility.functor(_);
    return model;
  };

  model.y = function(_) {
    if (!arguments.length) { return getY; }
    getY = utility.functor(_);
    return model;
  };

  model.z = function(_) {
    if (!arguments.length) { return getZ; }
    getZ = utility.functor(_);
    return model;
  };

  model.xScale = function(_) {
    if (!arguments.length) { return x; }
    x = _;
    return model;
  };

  model.yScale = function(_) {
    if (!arguments.length) { return y; }
    y = _;
    return model;
  };

  model.zScale = function(_) {
    if (!arguments.length) { return z; }
    z = _;
    return model;
  };

  model.xDomain = function(_) {
    if (!arguments.length) { return xDomain; }
    xDomain = _;
    return model;
  };

  model.yDomain = function(_) {
    if (!arguments.length) { return yDomain; }
    yDomain = _;
    return model;
  };

  model.zDomain = function(_) {
    if (!arguments.length) { return zDomain; }
    zDomain = _;
    return model;
  };

  model.forceX = function(_) {
    if (!arguments.length) { return forceX; }
    forceX = _;
    return model;
  };

  model.forceY = function(_) {
    if (!arguments.length) { return forceY; }
    forceY = _;
    return model;
  };

  model.forceZ = function(_) {
    if (!arguments.length) { return forceZ; }
    forceZ = _;
    return model;
  };

  model.size = function(_) {
    if (!arguments.length) { return getZ; }
    getZ = utility.functor(_);
    return model;
  };

  model.sizeRange = function(_) {
    if (!arguments.length) { return zRange; }
    zRange = _;
    return model;
  };
  model.sizeDomain = function(_) {
    if (!arguments.length) { return zDomain; }
    zDomain = _;
    return model;
  };
  model.forceSize = function(_) {
    if (!arguments.length) { return forceZ; }
    forceZ = _;
    return model;
  };

  model.margin = function(_) {
    if (!arguments.length) { return margin; }
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        margin[prop] = _[prop];
      }
    }
    return model;
  };

  model.width = function(_) {
    if (!arguments.length) { return width; }
    width = _;
    return model;
  };

  model.height = function(_) {
    if (!arguments.length) { return height; }
    height = _;
    return model;
  };

  model.interactive = function(_) {
    if (!arguments.length) { return interactive; }
    interactive = _;
    return model;
  };

  model.pointActive = function(_) {
    if (!arguments.length) { return pointActive; }
    pointActive = _;
    return model;
  };

  model.padData = function(_) {
    if (!arguments.length) { return padData; }
    padData = _;
    return model;
  };

  model.padDataOuter = function(_) {
    if (!arguments.length) { return padDataOuter; }
    padDataOuter = _;
    return model;
  };

  model.clipEdge = function(_) {
    if (!arguments.length) { return clipEdge; }
    clipEdge = _;
    return model;
  };

  model.clipVoronoi = function(_) {
    if (!arguments.length) { return clipVoronoi; }
    clipVoronoi = _;
    return model;
  };

  model.useVoronoi = function(_) {
    if (!arguments.length) { return useVoronoi; }
    useVoronoi = _;
    if (useVoronoi === false) {
        clipVoronoi = false;
    }
    return model;
  };

  model.circleRadius = function(_) {
    if (!arguments.length) { return circleRadius; }
    circleRadius = _;
    return model;
  };

  model.clipRadius = function(_) {
    if (!arguments.length) { return circleRadius; }
    circleRadius = _;
    return model;
  };

  model.shape = function(_) {
    if (!arguments.length) { return getShape; }
    getShape = _;
    return model;
  };

  model.onlyCircles = function(_) {
    if (!arguments.length) { return onlyCircles; }
    onlyCircles = _;
    return model;
  };

  model.singlePoint = function(_) {
    if (!arguments.length) { return singlePoint; }
    singlePoint = _;
    return model;
  };

  model.delay = function(_) {
    if (!arguments.length) { return delay; }
    delay = _;
    return model;
  };

  model.duration = function(_) {
    if (!arguments.length) { return duration; }
    duration = _;
    return model;
  };

  model.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    return model;
  };

  model.nice = function(_) {
    if (!arguments.length) { return nice; }
    nice = _;
    return model;
  };

  model.locality = function(_) {
    if (!arguments.length) { return locality; }
    locality = utility.buildLocality(_);
    return model;
  };

  //============================================================

  return model;
}

function line() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var points = scatter();

  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 960,
      height = 500,
      getX = function(d) { return d.x; }, // accessor to get the x value from a data point
      getY = function(d) { return d.y; }, // accessor to get the y value from a data point
      x, //can be accessed via points.xScale()
      y, //can be accessed via points.yScale()
      defined = function(d, i) { return !isNaN(getY(d, i)) && getY(d, i) !== null; }, // allows a line to be not continuous when it is not defined
      isArea = function(d) { return (d && d.area) || false; }, // decides if a line is an area or just a line
      interpolate = 'linear', // controls the line interpolation
      clipEdge = false, // if true, masks lines within x and y scale
      delay = 0, // transition
      duration = 0, // transition
      color = function(d, i) { return utility.defaultColor()(d, d.seriesIndex); },
      gradient = null,
      fill = color,
      classes = function(d, i) { return 'sc-series sc-series-' + d.seriesIndex; };


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  // var x0, y0; //used to store previous scales

  //============================================================

  function model(selection) {
    selection.each(function(data) {

      var container = d3.select(this);

      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom;

      var curve =
            interpolate === 'linear' ? d3.curveLinear :
            interpolate === 'cardinal' ? d3.curveCardinal :
            interpolate === 'monotone' ? d3.curveMonotoneX :
            interpolate === 'basis' ? d3.curveBasis : d3.curveNatural;

      var area = d3.area()
            .curve(curve)
            .defined(defined)
            .x(function(d, i) { return x(getX(d, i)); })
            .y0(function(d, i) { return y(getY(d, i)); })
            .y1(function(d, i) { return y(y.domain()[0] <= 0 ? y.domain()[1] >= 0 ? 0 : y.domain()[1] : y.domain()[0]); });

      var zero = d3.area()
            .curve(curve)
            .defined(defined)
            .x(function(d, i) { return x(getX(d, i)); })
            .y0(function(d, i) { return y(0); })
            .y1(function(d, i) { return y(y.domain()[0] <= 0 ? y.domain()[1] >= 0 ? 0 : y.domain()[1] : y.domain()[0]); });

      var tran = d3.transition('points')
            .duration(duration)
            .ease(d3.easeLinear);

      var id = points.id();

      //set up the gradient constructor function
      gradient = function(d, i, p) {
        return utility.colorLinearGradient(d, points.id() + '-' + i, p, color(d, i), wrap.select('defs'));
      };

      //------------------------------------------------------------
      // Setup Scales

      x = points.xScale();
      y = points.yScale();
      // x0 = x.copy();
      // y0 = y.copy();

      model.resetDimensions = function(w, h) {
        width = w;
        height = h;
        availableWidth = w - margin.left - margin.right;
        availableHeight = h - margin.top - margin.bottom;
        points.resetDimensions(w, h);
      };

      //------------------------------------------------------------
      // Setup containers and skeleton of model

      var wrap_bind = container.selectAll('g.sc-wrap.sc-line').data([data]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-wrap sc-line');
      var wrap = container.select('.sc-wrap.sc-line').merge(wrap_entr);

      var defs_entr = wrap_entr.append('defs');

      wrap_entr.append('g').attr('class', 'sc-group');
      var group_wrap = wrap.select('.sc-group');

      wrap_entr.append('g').attr('class', 'sc-scatter-wrap');
      var scatter_wrap = wrap.select('.sc-scatter-wrap');

      wrap.attr('transform', utility.translation(margin.left, margin.top));

      //------------------------------------------------------------

      defs_entr.append('clipPath').attr('id', 'sc-edge-clip-' + id)
        .append('rect');

      wrap.select('#sc-edge-clip-' + id + ' rect')
        .attr('width', availableWidth)
        .attr('height', availableHeight);

      wrap.attr('clip-path', clipEdge ? 'url(#sc-edge-clip-' + id + ')' : '');
      scatter_wrap.attr('clip-path', clipEdge ? 'url(#sc-edge-clip-' + id + ')' : '');

      //------------------------------------------------------------
      // Series

      var series_bind = group_wrap.selectAll('g.sc-series').data(data, function(d) { return d.seriesIndex; });
      var series_entr = series_bind.enter().append('g')
            .attr('class', 'sc-series')
            .style('stroke-opacity', 1e-6)
            .style('fill-opacity', 1e-6);
      var series = group_wrap.selectAll('.sc-series').merge(series_entr);

      series
        .classed('hover', function(d) { return d.hover; })
        .attr('class', classes)
        .attr('fill', color)
        .attr('stroke', color);
      series
        .transition(tran)
          .style('stroke-opacity', 1)
          .style('fill-opacity', 0.5);
      series_bind.exit()
        .transition(tran)
          .style('stroke-opacity', 1e-6)
          .style('fill-opacity', 1e-6)
          .remove();

      //------------------------------------------------------------
      // Points

      points
        .clipEdge(clipEdge)
        .width(availableWidth)
        .height(availableHeight);
      scatter_wrap.call(points);

      //------------------------------------------------------------
      // Areas

      var areas_bind = series.selectAll('path.sc-area').data(function(d) { return isArea(d) ? [d] : []; }); // this is done differently than lines because I need to check if series is an area
      var areas_entr = areas_bind.enter().append('path').attr('class', 'sc-area sc-enter');
      var areas = series.selectAll('.sc-area').merge(areas_entr);

      areas
        .filter(function(d) {
          return d3.select(this).classed('sc-enter');
        })
        .attr('d', function(d) {
          return zero.apply(this, [d.values]);
        });

      areas
        .transition(tran)
          .attr('d', function(d) {
            return area.apply(this, [d.values]);
          })
          .on('end', function(d) {
            d3.select(this).classed('sc-enter', false);
          });

      // we need this exit remove call here to support
      // toggle between lines and areas
      areas_bind.exit().remove();

      series_bind.exit()
        .transition(tran).selectAll('.sc-area')
          .attr('d', function(d) {
            return zero.apply(this, [d.values]);
          })
          .remove();

      //------------------------------------------------------------
      // Lines

      function lineData(d) {
        // if there are no values, return null
        if (!d.values || !d.values.length) {
          return [null];
        }
        // if there is more than one point, return all values
        if (d.values.length > 1) {
          return [d.values];
        }
        // if there is only one single point in data array
        // extend it horizontally in both directions
        var values = x.domain().map(function(x, i) {
            // if data point is array, then it should be returned as an array
            // the getX and getY methods handle the internal mechanics of positioning
            if (Array.isArray(d.values[0])) {
              return [x, d.values[0][1]];
            } else {
              // sometimes the line data point is an object
              // so the values should be returned as an array of objects
              var newValue = JSON.parse(JSON.stringify(d.values[0]));
              newValue.x = x;
              return newValue;
            }
          });
        return [values];
      }

      var lines_bind = series.selectAll('path.sc-line')
            .data(lineData, function(d) { return d.seriesIndex; });
      var lines_entr = lines_bind.enter().append('path')
            .attr('class', 'sc-line sc-enter');
      var lines = series.selectAll('.sc-line').merge(lines_entr);

      lines
        .filter(function(d) {
          return d3.select(this).classed('sc-enter');
        })
        .attr('d',
          d3.line()
            .curve(curve)
            .defined(defined)
            .x(function(d, i) { return x(getX(d, i)); })
            .y(function(d, i) { return y(0); })
        );
      lines
        .transition(tran)
          .attr('d',
            d3.line()
              .curve(curve)
              .defined(defined)
              .x(function(d, i) { return x(getX(d, i)); })
              .y(function(d, i) { return y(getY(d, i)); })
          )
          .on('end', function(d) {
            d3.select(this).classed('sc-enter', false);
          });
      series_bind.exit()
        .transition(tran).selectAll('.sc-line')
          .attr('d',
            d3.line()
              .curve(curve)
              .defined(defined)
              .x(function(d, i) { return x(getX(d, i)); })
              .y(function(d, i) { return y(0); })
          )
          .remove();

      //store old scales for use in transitions on update
      // x0 = x.copy();
      // y0 = y.copy();
    });

    return model;
  }

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  model.dispatch = points.dispatch;
  model.scatter = points;

  utility.rebind(model, points, 'id', 'interactive', 'size', 'xScale', 'yScale', 'zScale', 'xDomain', 'yDomain', 'sizeDomain', 'sizeRange', 'forceX', 'forceY', 'forceSize', 'useVoronoi', 'clipVoronoi', 'clipRadius', 'padData', 'padDataOuter', 'singlePoint', 'direction', 'nice', 'locality');

  model.color = function(_) {
    if (!arguments.length) { return color; }
    color = _;
    points.color(color);
    return model;
  };
  model.fill = function(_) {
    if (!arguments.length) { return fill; }
    fill = _;
    points.fill(fill);
    return model;
  };
  model.classes = function(_) {
    if (!arguments.length) { return classes; }
    classes = _;
    points.classes(classes);
    return model;
  };
  model.gradient = function(_) {
    if (!arguments.length) { return gradient; }
    gradient = _;
    return model;
  };

  model.margin = function(_) {
    if (!arguments.length) { return margin; }
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        margin[prop] = _[prop];
      }
    }
    return model;
  };
  model.width = function(_) {
    if (!arguments.length) { return width; }
    width = _;
    return model;
  };
  model.height = function(_) {
    if (!arguments.length) { return height; }
    height = _;
    return model;
  };

  model.x = function(_) {
    if (!arguments.length) { return getX; }
    getX = _;
    points.x(_);
    return model;
  };
  model.y = function(_) {
    if (!arguments.length) { return getY; }
    getY = _;
    points.y(_);
    return model;
  };

  model.delay = function(_) {
    if (!arguments.length) { return delay; }
    delay = _;
    return model;
  };
  model.duration = function(_) {
    if (!arguments.length) { return duration; }
    duration = _;
    points.duration(_);
    return model;
  };

  model.clipEdge = function(_) {
    if (!arguments.length) { return clipEdge; }
    clipEdge = _;
    return model;
  };

  model.interpolate = function(_) {
    if (!arguments.length) { return interpolate; }
    interpolate = _;
    return model;
  };

  model.defined = function(_) {
    if (!arguments.length) { return defined; }
    defined = _;
    return model;
  };

  model.isArea = function(_) {
    if (!arguments.length) { return isArea; }
    isArea = utility.functor(_);
    return model;
  };

  //============================================================

  return model;
}

function multibar() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 960,
      height = 500,
      x = d3.scaleBand(),
      y = d3.scaleLinear(),
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID in case user doesn't select one
      getX = function(d) { return d.x; },
      getY = function(d) { return d.y; },
      valueFormat = function(value, i, label) { return label || value; },
      getLabel = function(d, i) { return valueFormat(d.y, i, d.label); },
      locality = utility.buildLocality(),
      forceX = [],
      forceY = [0], // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do model.forceY([]) to remove
      stacked = true,
      disabled, // used in conjunction with barColor to communicate to multibarChart what series are disabled
      showValues = false,
      withLine = false,
      vertical = true,
      baseDimension = 60,
      direction = 'ltr',
      clipEdge = false, // if true, masks bars within x and y scale
      delay = 0, // transition
      duration = 0, // transition
      xDomain = null,
      yDomain = null,
      nice = false,
      color = function(d, i) { return utility.defaultColor()(d, d.seriesIndex); },
      gradient = utility.colorLinearGradient,
      fill = color,
      textureFill = false,
      barColor = null, // adding the ability to set the color for each rather than the whole group
      classes = function(d, i) { return 'sc-series sc-series-' + d.seriesIndex; },
      dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout', 'elementMousemove');

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var x0,
      y0; //used to store previous scales

  //============================================================

  function model(selection) {
    selection.each(function(data) {

      // baseDimension = stacked ? vertical ? 72 : 30 : 20;

      var container = d3.select(this),
          availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          dimX = vertical ? 'width' : 'height',
          dimY = vertical ? 'height' : 'width',
          valX = vertical ? 'x' : 'y',
          valY = vertical ? 'y' : 'x',
          seriesCount = 0,
          groupCount = 0,
          minSeries = 0,
          maxSeries = data.length - 1,
          verticalLabels = false,
          useWidth = false,
          labelPosition = showValues,
          labelsOutside = false,
          labelLengths = [],
          labelThickness = 0,
          labelData = [],
          seriesData = [],
          groupTotals = [];

      function sign(bool) {
        return bool ? 1 : -1;
      }
      function unique(x) {
        return x.reverse()
                .filter(function (e, i, x) { return x.indexOf(e, i + 1) === -1; })
                .reverse();
      }

      if (labelPosition) {
        if (stacked) {
          // var stack = d3.stack()
          //      .offset('zero')
          //      .keys(data.map(function(d) { return d.key; }))
          //      .value(function(d) { return d.key; });
          // data = stack(data);
          // stacked bars can't have label position 'top'
          if (labelPosition === 'top' || labelPosition === true) {
            labelPosition = 'end';
          }
        } else {
          // grouped bars can't have label position 'total'
          if (labelPosition === 'total') {
            labelPosition = 'top';
          } else if (labelPosition === true) {
            labelPosition = 'end';
          }
        }
        verticalLabels = vertical;
        labelsOutside = labelPosition === 'total' || labelPosition === 'top';
      }

      // restore code removed by SCR-19 but still needed to display totals for stacked bar
      if (stacked) {
        groupTotals = [];
        data[0].values.map(function(d, i) {
          var pos = 0;
          var neg = 0;
          data.map(function(d) {
            var f = d.values[i];
            f.size = Math.abs(f.y);
            if (f.y < 0) {
              f.y0 = neg - (vertical ? 0 : f.size);
              neg -= f.size;
            } else {
              f.y0 = pos + (vertical ? f.size : 0);
              pos += f.size;
            }
          });
          groupTotals[i] = {
            neg: {
              label: valueFormat(neg, i),
              y: neg
            },
            pos: {
              label: valueFormat(pos, i),
              y: pos
            }
          };
        });
      }

      //------------------------------------------------------------
      // Setup Scales

      model.resetDimensions = function(w, h) {
        width = w;
        height = h;
        availableWidth = w - margin.left - margin.right;
        availableHeight = h - margin.top - margin.bottom;
        resetScale();
      };

      // remap and flatten the data for use in calculating the scales' domains
      seriesData = d3.merge(data.map(function(d) {
          return d.values;
        }));

      seriesCount = data.length;
      groupCount = data[0].values.length;

      if (showValues) {
        data.forEach(function(series, s) {
          series.values.forEach(function(value, v) {
            // reset label if not defined
            value.label = getLabel(value);
          });
        });

        // this must be total because that is the only option that requires summing
        labelData = labelPosition === 'total' ?
          d3.merge(groupTotals.map(function(d) {
            return [d.neg, d.pos];
          })) :
          seriesData;

        labelLengths = utility.stringSetLengths(labelData.map(getLabel), container, 'sc-label-value');
        labelThickness = utility.stringSetThickness(['Xy'], container, 'sc-label-value')[0];

        var seriesExtents = d3.extent(data.map(function(d, i) { return d.seriesIndex; }));
        minSeries = seriesExtents[0];
        maxSeries = seriesExtents[1];
      }

      function resetScale() {
        var xDomain = xDomain || unique(seriesData.map(getX).concat(forceX));
        var maxX = vertical ? availableWidth : availableHeight,
            maxY = vertical ? availableHeight : availableWidth;

        var boundsWidth = stacked ? baseDimension : baseDimension * seriesCount + baseDimension,
            gap = baseDimension * (stacked ? 0.25 : 1),
            outerPadding = Math.max(0.25, (maxX - (groupCount * boundsWidth) - gap) / (2 * boundsWidth));

        x .domain(xDomain)
          .range([0, maxX])
          .paddingInner(withLine ? 0.3 : 0.25)
          .paddingOuter(outerPadding);

        var yDomain = yDomain || d3.extent(seriesData.map(function(d) {
                var posOffset = d.y0 + (vertical ? 0 : d.y);
                var negOffset = d.y0 + (vertical ? d.y : 0);
                return stacked ? (d.y > 0 ? posOffset : negOffset) : d.y;
              }).concat(forceY));
        var yRange = vertical ? [maxY, 0] : [0, maxY];

        y .domain(yDomain)
          .range(yRange);

        if (showValues) {
          // this must go here because barThickness varies based on x.bandwidth()
          verticalLabels = vertical && d3.max(labelLengths) + 8 > barThickness();
          useWidth = verticalLabels || !vertical;
        }

        //------------------------------------------------------------
        // recalculate y.range if grouped and show values

        if (labelsOutside) {
          var minBarY = 0, // top
              maxBarY = maxY, // bottom
              negValuePadding = 0,
              posValuePadding = 0;

          gap = vertical ? verticalLabels ? 2 : -2 : 2;

          labelData.forEach(function(label, l) {
            var labelDimension = useWidth ?
                  labelLengths[l] :
                  labelThickness;
            var value = parseFloat(label.y);

            // this the vertical pixel position of the bar top (or bottom for negative values)
            var labelY = y(value);
            var offset = 0;

            // d is sometimes numeric but sometimes a string
            // minBarY = 0 unless there are negative values
            if (vertical && value > 0 || !vertical && value < 0) {
              offset = labelY - labelDimension;
              if (offset < minBarY) {
                posValuePadding = labelDimension;
                minBarY = offset; // min because top of graph has y = 0
              }
            } else {
              offset = labelY + labelDimension;
              if (offset > maxBarY) {
                negValuePadding = labelDimension;
                maxBarY = offset; // max because top of graph has y = height
              }
            }
          });

          if (vertical) {
            y.range([
              maxY - (y.domain()[0] < 0 ? negValuePadding + gap + 2 : 0),
                      y.domain()[1] > 0 ? posValuePadding + gap : 0
            ]);
          } else {
            y.range([
                      y.domain()[0] < 0 ? posValuePadding + gap + 4 : 0,
              maxY - (y.domain()[1] > 0 ? negValuePadding + gap : 0)
            ]);
          }
        }

        if (nice) {
          y.nice();
        }

        x0 = x0 || x;
        y0 = y0 || y;
      }

      resetScale();

      //------------------------------------------------------------
      // Setup containers and skeleton of model

      var wrap_bind = container.selectAll('g.sc-wrap.sc-multibar').data([data]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-wrap sc-multibar');
      var wrap = container.select('.sc-wrap.sc-multibar').merge(wrap_entr);

      var defs_entr = wrap_entr.append('defs');
      var defs = wrap.select('defs');

      wrap.attr('transform', utility.translation(margin.left, margin.top));

      //------------------------------------------------------------
      // Definitions

      if (clipEdge) {
        defs_entr.append('clipPath')
          .attr('id', 'sc-edge-clip-' + id)
          .append('rect');
        defs.select('#sc-edge-clip-' + id + ' rect')
          .attr('width', availableWidth)
          .attr('height', availableHeight);
      }
      wrap.attr('clip-path', clipEdge ? 'url(#sc-edge-clip-' + id + ')' : '');

      if (textureFill) {
        var mask = utility.createTexture(defs_entr, id);
      }

      // set up the gradient constructor function
      model.gradientFill = function(d, i, params) {
        var gradientId = id + '-' + i;
        var c = color(d, i);
        return gradient(d, gradientId, params, c, defs);
      };
      var noGradient = fill === color;

      //------------------------------------------------------------

      var series_bind = wrap.selectAll('.sc-series').data(utility.identity);
      var series_entr = series_bind.enter().append('g')
            .attr('class', classes)
            .style('stroke-opacity', 1e-6)
            .style('fill-opacity', 1e-6);
      series_bind.exit().remove();
      var series = wrap.selectAll('.sc-series').merge(series_entr);

      // series_bind.exit()
      //   .style('stroke-opacity', 1e-6)
      //   .style('fill-opacity', 1e-6)
      //     .selectAll('g.sc-bar')
      //       .attr('y', function(d) {
      //         return stacked ? y0(d.y0) : y0(0);
      //       })
      //       .attr(dimX, 0)
      //       .remove();

      series
        .attr('fill', fill)
        .attr('class', classes)
        .classed('hover', function(d) { return d.hover; })
        .classed('sc-active', function(d) { return d.active === 'active'; })
        .classed('sc-inactive', function(d) { return d.active === 'inactive'; })
        .style('stroke-opacity', 1)
        .style('fill-opacity', 1);

      series
        .on('mouseover', function(d, i, j) {
          //TODO: figure out why j works above, but not here
          d3.select(this).classed('hover', true);
        })
        .on('mouseout', function(d, i, j) {
          d3.select(this).classed('hover', false);
        });

      //------------------------------------------------------------

      var bars_bind = series.selectAll('.sc-bar').data(function(d) { return d.values; });
      var bars_entr = bars_bind.enter().append('g').attr('class', 'sc-bar');
      bars_bind.exit().remove();
      var bars = series.selectAll('.sc-bar').merge(bars_entr);

      // The actual bar rectangle
      bars_entr.append('rect')
        .attr('class', 'sc-base')
        .style('fill', 'inherit')
        .attr('x', 0)
        .attr('y', 0);

      if (textureFill) {
        // For on click active bars
        bars_entr.append('rect')
          .attr('class', 'sc-texture')
          .attr('x', 0)
          .attr('y', 0)
          .style('mask', 'url(' + mask + ')');
      }

      // For label background
      bars_entr.append('rect')
        .attr('class', 'sc-label-box')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 0)
        .attr('height', 0)
        .attr('rx', 2)
        .attr('ry', 2)
        .style('fill', 'transparent')
        .style('stroke-width', 0)
        .style('fill-opacity', 0);
      var barBox = bars.select('.sc-label-box');

      // For label text
      bars_entr.append('text').attr('class', 'sc-label-value');
      var barText = bars.select('.sc-label-value');

      //------------------------------------------------------------
      function getContrastColor(d, i) {
        var fillColor = fill(d);
        var backColor = fillColor === 'inherit'
          ? d3.select('.' + classes(d, i).split(' ').join('.')).style('color')
          : fillColor;
        return utility.getTextContrast(backColor, i);
      }
      function barLength(d, i) {
        return Math.max(Math.round(Math.abs(y(getY(d, i)) - y(0))), 0);
      }
      function barThickness() {
        return x.bandwidth() / (stacked ? 1 : data.length);
      }
      function barTransform(d, i) {
        var trans;
        if (stacked) {
          trans = {
            x: Math.round(x(getX(d, i))),
            y: Math.round(y(d.y0))
          };
        } else {
          // i is the group index, seri is the virtual series index, seriesIndex is the actual index
          trans = {
            x: Math.round(d.seri * barThickness() + x(getX(d, i))),
            //TODO: clean this up
            y: Math.round(getY(d, i) < 0
              ? (vertical ? y(0) : y(getY(d, i)))
              : (vertical ? y(getY(d, i)) : y(0)))
          };
        }
        return 'translate(' + trans[valX] + ',' + trans[valY] + ')';
      }

      bars
        .attr('class', function(d, i) {
          return 'sc-bar ' + (getY(d, i) < 0 ? 'negative' : 'positive');
        })
        .classed('sc-active', function(d) { return d.active === 'active'; })
        .attr('transform', barTransform)
        .style('display', function(d, i) {
          return barLength(d, i) !== 0 ? 'inline' : 'none';
        });

      bars.select('rect.sc-base')
        .attr(valX, 0)
        .attr(dimY, barLength)
        .attr(dimX, barThickness);

      if (textureFill) {
        bars.select('rect.sc-texture')
          .attr(valX, 0)
          .attr(dimY, barLength)
          .attr(dimX, barThickness)
          .style('fill', getContrastColor);
      }

      //------------------------------------------------------------
      // Bar text: begin, middle, end, top

      function getLabelText(d, i) {
        // this must be total because that is the only option that requires summing
        var value = labelPosition === 'total' ?
          groupTotals[i][getY(d, i) < 0 ? 'neg' : 'pos'] :
          d;
        return getLabel(value);
      }
      function setLabelDimensions(d, i) {
        var bbox = this.getBoundingClientRect();
        var width = Math.floor(bbox.width);
        var height = Math.floor(bbox.height);
        d.labelWidth = d.labelWidth || (verticalLabels ? height : width) + 4;
        d.labelHeight = d.labelHeight || (verticalLabels ? width : height);
        d.barLength = barLength(d, i);
        d.barThickness = barThickness();
      }
      function getLabelAnchor(d, i) {
        var anchor = 'middle',
            negative = getY(d, i) < 0;
        if (useWidth) {
          switch (labelPosition) {
            case 'start':
              anchor = negative ? 'end' : 'start';
              break;
            case 'middle':
              anchor = 'middle';
              break;
            case 'end':
              anchor = negative ? 'start' : 'end';
              break;
            case 'top':
            case 'total':
              anchor = negative ? 'end' : 'start';
              break;
          }
          anchor = direction === 'rtl' && anchor !== 'middle' ? anchor === 'start' ? 'end' : 'start' : anchor;
        } else {
          anchor = 'middle';
        }
        return anchor;
      }
      function getLabelX(d, i) {
        var offset = 0,
            negative = getY(d, i) < 0 ? -1 : 1,
            shift = negative < 0;

        var padding = (4 + useWidth * 2) * negative;

        if (vertical && !verticalLabels) {
          offset = d.barThickness / 2;
        } else {
          switch (labelPosition) {
            case 'start':
              // vrt: neg 0 , pos -1
              // hrz: neg 1 , pos  0
              offset = d.barLength * (shift - verticalLabels) + padding;
              break;
            case 'middle':
              offset = d.barLength * (verticalLabels ? -1 : 1) / 2;
              break;
            case 'end':
              // vrt: neg -1 , pos 0.
              // hrz: neg  0 , pos 1;
              offset = d.barLength * (!verticalLabels - shift) - padding;
              break;
            case 'top':
            case 'total':
              offset = d.barLength * (!verticalLabels - shift) + 2 * negative;
              break;
          }
        }
        return offset;
      }
      function getLabelY(d, i) {
        var offset = 0,
            negative = getY(d, i) < 0 ? -1 : 1,
            shift = negative < 0;

        var padding = (
              d.labelHeight / 2 +
              (4 + verticalLabels * 2) * !labelsOutside
            ) * negative;

        if (useWidth) {
          offset = d.barThickness / 2;
        } else {
          switch (labelPosition) {
            case 'start':
              offset = d.barLength * (1 - shift) - padding;
              break;
            case 'middle':
              offset = d.barLength / 2;
              break;
            case 'end':
              offset = d.barLength * (0 + shift) + padding;
              break;
            case 'top':
            case 'total':
              offset = d.barLength * (0 + shift) - padding;
              break;
          }
        }
        return offset;
      }
      function getLabelFill(d, i, j) {
        return labelsOutside ? '#000' : getContrastColor(d, i);
      }
      function getLabelOpacity(d, i) {
        if (labelsOutside) {
          if (labelPosition === 'total' && stacked) {
            // hide non-total labels for stacked bar
            var y = getY(d, i);
            return (y <  0 && groupTotals[i].neg.y === d.y0 + (vertical ? y : 0)) ||
              (y >= 0 && groupTotals[i].pos.y === d.y0 + (vertical ? 0 : y)) ? 1 : 0;
          } else {
            return 1;
          }
        } else {
          var lengthOverlaps = d.barLength < (useWidth ? d.labelWidth : d.labelHeight) + 8;
          var thicknessOverlaps = d.barThickness < (useWidth ? d.labelHeight : d.labelWidth) + 4;
          return lengthOverlaps || thicknessOverlaps ? 0 : 1;
        }
      }

      function getLabelBoxX(d, i) {
        return getLabelBoxOffset(d, i, true);
      }
      function getLabelBoxY(d, i) {
        return getLabelBoxOffset(d, i, false);
      }
      function getLabelBoxOffset(d, i, isX) {
        var offset, pos, gap, shift, labelDim, barLength, isY;
        // if x, isX is true and gap is 4
        // if y, isX is false and gap is -4
        offset = 0;
        pos = getY(d, i) >= 0;
        gap = 4 * sign(isX) * sign(pos);

        //    neg  pos
        // x:  1    0
        // y:  0    1
        shift = isX === pos ? 0 : 1;

        // if get x and vertical or get y and horizontal
        if (!isX ^ vertical) {
          offset = (d.barThickness - (useWidth ? d.labelHeight : d.labelWidth)) / 2;
        } else {
          //       vert lbl    horz lbl
          // x:    height      width
          // y:    width       height
          // label width is bbox.w+4
          barLength = d.barLength - (useWidth ? d.labelWidth : d.labelHeight);

          switch (labelPosition) {
            case 'start':
              offset = barLength * (0 + shift) + gap;
              break;
            case 'middle':
              offset = barLength / 2;
              break;
            case 'end':
              offset = barLength * (1 - shift) - gap;
              break;
            case 'top':
            case 'total':
              labelDim = verticalLabels === isX ? d.labelHeight : d.labelWidth;
              offset = d.barLength * (1 - shift) - labelDim * (0 + shift);
              break;
          }
        }

        return offset;
      }
      function getLabelBoxWidth(d) {
        return verticalLabels ? d.labelHeight : d.labelWidth;
      }
      function getLabelBoxHeight(d) {
        return verticalLabels ? d.labelWidth : d.labelHeight;
      }
      function getLabelBoxFill(d, i) {
        return labelsOutside ? '#fff' : color(d, i);
      }

      if (showValues) {

        barText
          .text(getLabelText)
          .attr('transform', 'rotate(' + (0 - 90 * verticalLabels) + ')')
          .each(setLabelDimensions);

        barText
          .attr('dy', '0.35em')
          .attr('text-anchor', getLabelAnchor)
          .attr('x', getLabelX)
          .attr('y', getLabelY)
          .style('fill', getLabelFill)
          .style('fill-opacity', getLabelOpacity);

        barBox
          .attr('x', getLabelBoxX)
          .attr('y', getLabelBoxY)
          .attr('width', getLabelBoxWidth)
          .attr('height', getLabelBoxHeight)
          .style('fill', getLabelBoxFill)
          .style('fill-opacity', getLabelOpacity);

      } else {
        barText
          .text('')
          .style('fill-opacity', 0);

        bars
          .select('rect.label-box')
            .style('fill-opacity', 0);
      }

      //------------------------------------------------------------
      // Assign events

      function buildEventObject(e, d, i) {
        return {
          pointIndex: i,
          point: d,
          seriesIndex: d.seriesIndex,
          series: data[d.seri],
          groupIndex: d.groupIndex,
          id: id,
          e: e
        };
      }

      bars
        .on('mouseover', function(d, i) { //TODO: figure out why j works above, but not here
          var eo = buildEventObject(d3.event, d, i);
          dispatch.call('elementMouseover', this, eo);
        })
        .on('mousemove', function(d, i) {
          var e = d3.event;
          dispatch.call('elementMousemove', this, e);
        })
        .on('mouseout', function(d, i) {
          var eo = buildEventObject(d3.event, d, i);
          dispatch.call('elementMouseout', this, eo);
        })
        .on('click', function(d, i) {
          d3.event.stopPropagation();
          var eo = buildEventObject(d3.event, d, i);
          dispatch.call('elementClick', this, eo);
        })
        .on('dblclick', function(d, i) {
          d3.event.stopPropagation();
          var eo = buildEventObject(d3.event, d, i);
          dispatch.call('elementDblClick', this, eo);
        });

      // TODO: fix way of passing in a custom color function
      // if (barColor) {
      //   if (!disabled) {
      //     disabled = data.map(function() { return true; });
      //   }
      //   bars
      //     //.style('fill', barColor)
      //     //.style('stroke', barColor)
      //     //.style('fill', function(d,i,j) { return d3.rgb(barColor(d,i)).darker(j).toString(); })
      //     //.style('stroke', function(d,i,j) { return d3.rgb(barColor(d,i)).darker(j).toString(); })
      //     .style('fill', function(d, i, j) {
      //       return d3.rgb(barColor(d, i))
      //                .darker(disabled.map(function(d, i) { return i; })
      //                .filter(function(d, i) { return !disabled[i]; })[j])
      //                .toString();
      //     })
      //     .style('stroke', function(d, i, j) {
      //       return d3.rgb(barColor(d, i))
      //                .darker(disabled.map(function(d, i) { return i; })
      //                .filter(function(d, i) { return !disabled[i]; })[j])
      //                .toString();
      //     });
      // }

      //store old scales for use in transitions on update
      x0 = x.copy();
      y0 = y.copy();

    });

    return model;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  model.dispatch = dispatch;

  model.color = function(_) {
    if (!arguments.length) { return color; }
    color = _;
    return model;
  };
  model.fill = function(_) {
    if (!arguments.length) { return fill; }
    fill = _;
    return model;
  };
  model.classes = function(_) {
    if (!arguments.length) { return classes; }
    classes = _;
    return model;
  };
  model.gradient = function(_) {
    if (!arguments.length) { return gradient; }
    gradient = _;
    return model;
  };

  model.x = function(_) {
    if (!arguments.length) { return getX; }
    getX = _;
    return model;
  };

  model.y = function(_) {
    if (!arguments.length) { return getY; }
    getY = _;
    return model;
  };

  model.margin = function(_) {
    if (!arguments.length) { return margin; }
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        margin[prop] = _[prop];
      }
    }
    return model;
  };

  model.width = function(_) {
    if (!arguments.length) { return width; }
    width = _;
    return model;
  };

  model.height = function(_) {
    if (!arguments.length) { return height; }
    height = _;
    return model;
  };

  model.xScale = function(_) {
    if (!arguments.length) { return x; }
    x = _;
    return model;
  };

  model.yScale = function(_) {
    if (!arguments.length) { return y; }
    y = _;
    return model;
  };

  model.xDomain = function(_) {
    if (!arguments.length) { return xDomain; }
    xDomain = _;
    return model;
  };

  model.yDomain = function(_) {
    if (!arguments.length) { return yDomain; }
    yDomain = _;
    return model;
  };

  model.forceX = function(_) {
    if (!arguments.length) { return forceX; }
    forceX = _;
    return model;
  };

  model.forceY = function(_) {
    if (!arguments.length) { return forceY; }
    forceY = _;
    return model;
  };

  model.stacked = function(_) {
    if (!arguments.length) { return stacked; }
    stacked = _;
    return model;
  };

  model.barColor = function(_) {
    if (!arguments.length) { return barColor; }
    barColor = utility.getColor(_);
    return model;
  };

  model.disabled = function(_) {
    if (!arguments.length) { return disabled; }
    disabled = _;
    return model;
  };

  model.id = function(_) {
    if (!arguments.length) { return id; }
    id = _;
    return model;
  };

  model.delay = function(_) {
    if (!arguments.length) { return delay; }
    delay = _;
    return model;
  };

  model.duration = function(_) {
    if (!arguments.length) { return duration; }
    duration = _;
    return model;
  };

  model.clipEdge = function(_) {
    if (!arguments.length) { return clipEdge; }
    clipEdge = _;
    return model;
  };

  model.showValues = function(_) {
    if (!arguments.length) { return showValues; }
    showValues = isNaN(parseInt(_, 10)) ? _ : parseInt(_, 10) && true || false;
    return model;
  };

  model.valueFormat = function(_) {
    if (!arguments.length) { return valueFormat; }
    valueFormat = _;
    return model;
  };

  model.withLine = function(_) {
    if (!arguments.length) { return withLine; }
    withLine = _;
    return model;
  };

  model.vertical = function(_) {
    if (!arguments.length) { return vertical; }
    vertical = _;
    return model;
  };

  model.baseDimension = function(_) {
    if (!arguments.length) { return baseDimension; }
    baseDimension = _;
    return model;
  };

  model.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    return model;
  };

  model.textureFill = function(_) {
    if (!arguments.length) { return textureFill; }
    textureFill = _;
    return model;
  };

  model.nice = function(_) {
    if (!arguments.length) { return nice; }
    nice = _;
    return model;
  };

  model.locality = function(_) {
    if (!arguments.length) { return locality; }
    locality = utility.buildLocality(_);
    return model;
  };

  //============================================================

  return model;
}

function pie() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 500,
      height = 500,
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID in case user doesn't select one
      getKey = function(d) { return (d.series || d).key; },
      getValue = function(d, i) { return (d.series || d).value; },
      getCount = function(d, i) { return (d.series || d).count; },
      fmtKey = function(d) { return getKey(d); },
      fmtValue = function(d) { return getValue(d); },
      fmtCount = function(d) { return !isNaN(getCount(d)) ? (' (' + getCount(d) + ')') : ''; },
      locality = utility.buildLocality(),
      direction = 'ltr',
      delay = 0,
      duration = 0,
      color = function(d, i) { return utility.defaultColor()(d.series, d.seriesIndex); },
      gradient = utility.colorRadialGradient,
      fill = color,
      textureFill = false,
      classes = function(d, i) { return 'sc-series sc-series-' + d.seriesIndex; };

  var showLabels = true,
      showLeaders = true,
      pieLabelsOutside = true,
      donutLabelsOutside = true,
      labelThreshold = 0.01, //if slice percentage is under this, don't show label
      donut = false,
      hole = false,
      labelSunbeamLayout = false,
      leaderLength = 20,
      textOffset = 5,
      arcDegrees = 360,
      rotateDegrees = 0,
      donutRatio = 0.447,
      minRadius = 75,
      maxRadius = 250,
      dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout', 'elementMousemove');

  var holeFormat = function(hole_wrap, data) {
        var hole_bind = hole_wrap.selectAll('.sc-hole-container').data(data),
            hole_entr = hole_bind.enter().append('g').attr('class', 'sc-hole-container');
        hole_entr.append('text')
          .text(data)
          .attr('class', 'sc-pie-hole-value')
          .attr('dy', '.35em')
          .attr('text-anchor', 'middle')
          .style('font-size', '50px');
        hole_bind.exit().remove();
      };

  var startAngle = function(d) {
        // DNR (Math): simplify d.startAngle - ((rotateDegrees * Math.PI / 180) * (360 / arcDegrees)) * (arcDegrees / 360);
        return d.startAngle * arcDegrees / 360 + utility.angleToRadians(rotateDegrees);
      };
  var endAngle = function(d) {
        return d.endAngle * (arcDegrees / 360) + utility.angleToRadians(rotateDegrees);
      };

  var fixedRadius = function(model) { return null; };

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  // Setup the Pie model and choose the data element
  var pie = d3.pie()
        .sort(null)
        .value(getValue);

  //============================================================
  // Update model

  function model(selection) {
    selection.each(function(data) {

      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          container = d3.select(this);

      //------------------------------------------------------------
      // recalculate width and height based on label length

      var labelLengths = [],
          doLabels = showLabels && pieLabelsOutside ? true : false;

      if (doLabels) {
        labelLengths = utility.stringSetLengths(
            data.map(fmtKey),
            container,
            'sc-label'
          );
      }

      //------------------------------------------------------------
      // Setup containers and skeleton of model

      var wrap_bind = container.selectAll('g.sc-wrap').data([data]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-wrap sc-pie');
      var wrap = container.select('.sc-wrap.sc-pie').merge(wrap_entr);

      var defs_entr = wrap_entr.append('defs');
      var defs = wrap.select('defs');

      wrap_entr.append('g').attr('class', 'sc-group');
      var group_wrap = wrap.select('.sc-group');

      wrap_entr.append('g').attr('class', 'sc-hole-wrap');
      var hole_wrap = wrap.select('.sc-hole-wrap');

      wrap.attr('transform', utility.translation(margin.left, margin.top));

      //------------------------------------------------------------
      // Definitions

      if (textureFill) {
        var mask = utility.createTexture(defs_entr, id, -availableWidth / 2, -availableHeight / 2);
      }

      // set up the gradient constructor function
      model.gradientFill = function(d, i) {
        var gradientId = id + '-' + i;
        var params = {
          x: 0,
          y: 0,
          r: pieRadius,
          s: (donut ? (donutRatio * 100) + '%' : '0%'),
          u: 'userSpaceOnUse'
        };
        var c = color(d, i);
        return gradient(d, gradientId, params, c, defs);
      };

      //------------------------------------------------------------
      // Append major data series grouping containers

      var series_bind = group_wrap.selectAll('.sc-series').data(pie);
      var series_entr = series_bind.enter().append('g').attr('class', 'sc-series');
      series_bind.exit().remove();
      var series = group_wrap.selectAll('.sc-series').merge(series_entr);

      series_entr
        .style('stroke', '#FFF')
        .style('stroke-width', 2)
        .style('stroke-opacity', 0)
        .on('mouseover', function(d, i, j) { //TODO: figure out why j works above, but not here
          d3.select(this).classed('hover', true);
        })
        .on('mouseout', function(d, i, j) {
          d3.select(this).classed('hover', false);
        });

      series
        .attr('class', function(d) { return classes(d.data, d.data.seriesIndex); })
        .attr('fill', function(d) { return fill(d.data, d.data.seriesIndex); })
        .classed('sc-active', function(d) { return d.data.active === 'active'; })
        .classed('sc-inactive', function(d) { return d.data.active === 'inactive'; });

      //------------------------------------------------------------
      // Append polygons for funnel

      var slice_bind = series.selectAll('g.sc-slice').data(
            // I wish we didn't have to do this :-(
            function(s, i) {
              return s.data.values.map(function(v, j) {
                v.endAngle = s.endAngle;
                v.padAngle = s.padAngle;
                v.startAngle = s.startAngle;
                v.index = i;
                return v;
              });
            },
            function(d) { return d.seriesIndex; }
          );
      slice_bind.exit().remove();
      var slice_entr = slice_bind.enter().append('g').attr('class', 'sc-slice');
      var slices = series.selectAll('g.sc-slice').merge(slice_entr);

      slice_entr.append('path')
        .attr('class', 'sc-base')
        .each(function(d, i) {
          this._current = d;
        });

      if (textureFill) {
        // For on click active slices
        slice_entr.append('path')
          .attr('class', 'sc-texture')
          .each(function(d, i) {
            this._current = d;
          })
          .style('mask', 'url(' + mask + ')');
      }

      slice_entr
        .on('mouseover', function(d, i) {
          d3.select(this).classed('hover', true);
          var eo = buildEventObject(d3.event, d, i);
          dispatch.call('elementMouseover', this, eo);
        })
        .on('mousemove', function(d, i) {
          var e = d3.event;
          dispatch.call('elementMousemove', this, e);
        })
        .on('mouseout', function(d, i) {
          d3.select(this).classed('hover', false);
          dispatch.call('elementMouseout', this);
        })
        .on('click', function(d, i) {
          d3.event.stopPropagation();
          var eo = buildEventObject(d3.event, d, i);
          dispatch.call('elementClick', this, eo);
        })
        .on('dblclick', function(d, i) {
          d3.event.stopPropagation();
          var eo = buildEventObject(d3.event, d, i);
          dispatch.call('elementDblClick', this, eo);
        });

      //------------------------------------------------------------
      // Append containers for labels

      slice_entr.append('g')
        .attr('class', 'sc-label')
        .attr('transform', 'translate(0,0)');

      slice_entr.select('.sc-label')
        .append('rect')
        .style('fill-opacity', 0)
        .style('stroke-opacity', 0);
      slice_entr.select('.sc-label')
        .append('text')
        .style('fill-opacity', 0);

      slice_entr.append('polyline')
        .attr('class', 'sc-label-leader')
        .style('stroke-opacity', 0);

      //------------------------------------------------------------
      // UPDATE

      var maxWidthRadius = availableWidth / 2,
          maxHeightRadius = availableHeight / 2,
          extWidths = [],
          extHeights = [],
          verticalShift = 0,
          verticalReduction = doLabels ? 5 : 0,
          horizontalReduction = leaderLength + textOffset,
          holeOffset = 0;

      // side effect :: resets extWidths, extHeights
      slices.select('.sc-base').call(calcScalars, maxWidthRadius, maxHeightRadius);

      // Donut Hole Text
      hole_wrap.call(holeFormat, hole ? [hole] : []);

      if (hole) {
        holeOffset = calcHoleOffset();
        if (holeOffset > 0) {
          verticalReduction += holeOffset;
          verticalShift -= holeOffset / 2;
        }
      }

      var offsetHorizontal = availableWidth / 2;
      var offsetVertical = availableHeight / 2;

      //first adjust the leaderLength to be proportional to radius
      if (doLabels) {
        leaderLength = Math.max(Math.min(Math.min(calcMaxRadius()) / 12, 20), 10);
      }

      if (fixedRadius(model)) {
        minRadius = fixedRadius(model);
        maxRadius = fixedRadius(model);
      }

      var labelRadius = Math.min(Math.max(calcMaxRadius(), minRadius), maxRadius);
      var pieRadius = labelRadius - (doLabels ? leaderLength : 0);

      var ovA = (d3.max(extHeights) - d3.min(extHeights)) / 2 + d3.min(extHeights);
      var ovB = (labelRadius + verticalShift) / offsetVertical;
      offsetVertical += ovA * ovB + verticalShift / 2;

      var ohA = (d3.max(extWidths) - d3.min(extWidths)) / 2 - d3.max(extWidths);
      var ohB = labelRadius / offsetHorizontal;
      offsetHorizontal += ohA * ohB;

      group_wrap
        .attr('transform', 'translate(' + offsetHorizontal + ',' + offsetVertical + ')');
      hole_wrap
        .attr('transform', 'translate(' + offsetHorizontal + ',' + offsetVertical + ')');
      group_wrap.select(mask)
        .attr('x', -pieRadius / 2)
        .attr('y', -pieRadius / 2);

      var pieArc = d3.arc()
            .innerRadius(donut ? pieRadius * donutRatio : 0)
            .outerRadius(pieRadius)
            .startAngle(startAngle)
            .endAngle(endAngle);

      var labelArc = d3.arc()
            .innerRadius(0)
            .outerRadius(pieRadius)
            .startAngle(startAngle)
            .endAngle(endAngle);

      if (pieLabelsOutside) {
        if (!donut || donutLabelsOutside) {
          labelArc
            .innerRadius(labelRadius)
            .outerRadius(labelRadius);
        } else {
          labelArc
            .outerRadius(pieRadius * donutRatio);
        }
      }

      // removed d3 transition in MACAROON-133 because
      // there is a "Maximum call stack size exceeded at Date.toString" error
      // in PMSE that stops d3 from calling transitions
      // this may be a logger issue or some recursion somewhere in PMSE
      // slices.select('path').transition().duration(duration)
      //   .attr('d', arc)
      //   .attrTween('d', arcTween);

      slices.select('.sc-base')
        .attr('d', pieArc)
        .style('stroke-opacity', function(d) {
          return startAngle(d) === endAngle(d) ? 0 : 1;
        });

      if (textureFill) {
        slices.select('.sc-texture')
          .attr('d', pieArc)
          .style('stroke-opacity', function(d) {
            return startAngle(d) === endAngle(d) ? 0 : 1;
          })
          .style('fill', function(d, i) {
            var series = d.series || d;
            var index = series.seriesIndex || i;
            var fillColor = fill(series);
            var backColor = fillColor === 'inherit'
              ? d3.select('.' + classes(series, index).split(' ').join('.')).style('color')
              : fillColor;
            return utility.getTextContrast(backColor, index);
          });
      }

      //------------------------------------------------------------
      // Update label containers

      if (showLabels) {
        // This does the normal label
        slices.select('.sc-label')
          .attr('transform', function(d) {
            if (labelSunbeamLayout) {
              d.outerRadius = pieRadius + 10; // Set Outer Coordinate
              d.innerRadius = pieRadius + 15; // Set Inner Coordinate
              var rotateAngle = (startAngle(d) + endAngle(d)) / 2 * (180 / Math.PI);
              rotateAngle += 90 * alignedRight(d, labelArc);
              return 'translate(' + labelArc.centroid(d) + ') rotate(' + rotateAngle + ')';
            } else {
              var labelsPosition = labelArc.centroid(d),
                  leadOffset = showLeaders ? (leaderLength + textOffset) * alignedRight(d, labelArc) : 0;
              return 'translate(' + [labelsPosition[0] + leadOffset, labelsPosition[1]] + ')';
            }
          });

        slices.select('.sc-label text')
          .text(fmtKey)
          .attr('dy', '.35em')
          .style('fill', '#555')
          .style('fill-opacity', labelOpacity)
          .style('text-anchor', function(d) {
            //center the text on it's origin or begin/end if orthogonal aligned
            //labelSunbeamLayout ? ((d.startAngle + d.endAngle) / 2 < Math.PI ? 'start' : 'end') : 'middle'
            if (!pieLabelsOutside) {
              return 'middle';
            }
            var anchor = alignedRight(d, labelArc) === 1 ? 'start' : 'end';
            if (direction === 'rtl') {
              anchor = anchor === 'start' ? 'end' : 'start';
            }
            return anchor;
          });

        slices
          .each(function(d, i) {
            var theta, sin, labelLength, baseWidth, remainingWidth, label;
            if (labelLengths[i] > minRadius || labelRadius === minRadius) {
              theta = (startAngle(d) + endAngle(d)) / 2;
              sin = Math.abs(Math.sin(theta));
              labelLength = labelLengths[d.index];
              baseWidth = labelRadius * sin + leaderLength + textOffset + labelLength;
              remainingWidth = (availableWidth / 2 - offsetHorizontal) + availableWidth / 2 - baseWidth;
              if (remainingWidth < 0) {
                label = utility.stringEllipsify(fmtKey(d), container, labelLength + remainingWidth);
                d3.select(this).select('text').text(label);
              }
            }
          });

        if (!pieLabelsOutside) {
          slices.select('.sc-label')
            .each(function(d) {
              if (!labelOpacity(d)) {
                return;
              }
              var slice = d3.select(this),
                  textBox = slice.select('text').node().getBoundingClientRect();
              slice.select('rect')
                .attr('rx', 3)
                .attr('ry', 3)
                .attr('width', textBox.width + 10)
                .attr('height', textBox.height + 10)
                .attr('transform', function() {
                  return 'translate(' + [textBox.x - 5, textBox.y - 5] + ')';
                })
                .style('fill', '#FFF')
                .style('fill-opacity', labelOpacity);
            });
        } else if (showLeaders) {
          slices.select('.sc-label-leader')
            .attr('points', function(d) {
              if (!labelOpacity(d)) {
                // canvg needs at least 2 points because the lib doesnt have
                // any defensive code around an array with 1 element, it expects 2+ els
                return '0,0 0,0';
              }
              var outerArc = d3.arc()
                    .innerRadius(pieRadius)
                    .outerRadius(pieRadius)
                    .startAngle(startAngle)
                    .endAngle(endAngle);
              var leadOffset = showLeaders ? leaderLength * alignedRight(d, outerArc) : 0,
                  outerArcPoints = outerArc.centroid(d),
                  labelArcPoints = labelArc.centroid(d),
                  leadArcPoints = [labelArcPoints[0] + leadOffset, labelArcPoints[1]];
              return outerArcPoints + ' ' + labelArcPoints + ' ' + leadArcPoints;
            })
            .style('stroke', '#AAA')
            .style('fill', 'none')
            .style('stroke-opacity', labelOpacity);
        }
      } else {
        slices.select('.sc-label-leader').style('stroke-opacity', 0);
        slices.select('.sc-label rect').style('fill-opacity', 0);
        slices.select('.sc-label text').style('fill-opacity', 0);
      }

      //------------------------------------------------------------
      // Utility functions

      function buildEventObject(e, d, i) {
        return {
          id: id,
          key: fmtKey(d),
          value: getValue(d),
          count: getCount(d),
          data: d,
          series: d.series,
          seriesIndex: d.series.seriesIndex,
          e: e
        };
      }

      // calculate max and min height of slice vertices
      function calcScalars(slices, maxWidth, maxHeight) {
        var widths = [],
            heights = [],
            twoPi = 2 * Math.PI,
            north = 0,
            east = Math.PI / 2,
            south = Math.PI,
            west = 3 * Math.PI / 2,
            norm = 0;

        function normalize(a) {
          return (a + norm) % twoPi;
        }

        slices.each(function(d, i) {
          var aStart = startAngle(d) === 0 ? 0 : (startAngle(d) + twoPi) % twoPi,
              aEnd = endAngle(d) === 0 ? 0 : (endAngle(d) + twoPi) % twoPi;

          var wStart = Math.round(Math.sin(aStart) * 10000) / 10000,
              wEnd = Math.round(Math.sin(aEnd) * 10000) / 10000,
              hStart = Math.round(Math.cos(aStart) * 10000) / 10000,
              hEnd = Math.round(Math.cos(aEnd) * 10000) / 10000;

          // if angles go around the horn, normalize
          norm = aEnd < aStart ? twoPi - aStart : 0;

          if (aEnd === aStart) {
            aStart = 0;
            aEnd = twoPi;
          } else {
            aStart = normalize(aStart);
            aEnd = normalize(aEnd);
          }

          north = normalize(north);
          east = normalize(east);
          south = normalize(south);
          west = normalize(west);

          // North
          if (aStart % twoPi === 0 || aEnd % twoPi === 0) {
            heights.push(maxHeight);
            if (donut) {
              heights.push(maxHeight * donutRatio);
            }
          }
          // East
          if (aStart <= east && aEnd >= east) {
            widths.push(maxWidth);
            if (donut) {
              widths.push(maxWidth * donutRatio);
            }
          }
          // South
          if (aStart <= south && aEnd >= south) {
            heights.push(-maxHeight);
            if (donut) {
              heights.push(-maxHeight * donutRatio);
            }
          }
          // West
          if (aStart <= west && aEnd >= west) {
            widths.push(-maxWidth);
            if (donut) {
              widths.push(-maxWidth * donutRatio);
            }
          }

          widths.push(maxWidth * wStart);
          widths.push(maxWidth * wEnd);
          if (donut) {
            widths.push(maxWidth * donutRatio * wStart);
            widths.push(maxWidth * donutRatio * wEnd);
          } else {
            widths.push(0);
          }

          heights.push(maxHeight * hStart);
          heights.push(maxHeight * hEnd);
          if (donut) {
            heights.push(maxHeight * donutRatio * hStart);
            heights.push(maxHeight * donutRatio * hEnd);
          } else {
            heights.push(0);
          }
        });

        extWidths = d3.extent(widths);
        extHeights = d3.extent(heights);

        // scale up height radius to fill extents
        maxWidthRadius *= availableWidth / (d3.max(extWidths) - d3.min(extWidths));
        maxHeightRadius *= availableHeight / (d3.max(extHeights) - d3.min(extHeights));
      }

      // reduce width radius for width of labels
      function calcMaxRadius() {
        var widthRadius = [maxWidthRadius],
            heightRadius = [maxHeightRadius + leaderLength];

        series.select('.sc-base').each(function(d, i) {
          if (!labelOpacity(d)) {
            return;
          }

          var theta = (startAngle(d) + endAngle(d)) / 2,
              sin = Math.sin(theta),
              cos = Math.cos(theta),
              bW = maxWidthRadius - horizontalReduction - labelLengths[i],
              bH = maxHeightRadius - verticalReduction,
              rW = sin ? bW / sin : bW, //don't divide by zero, fool
              rH = cos ? bH / cos : bH;

          widthRadius.push(rW);
          heightRadius.push(rH);
        });

        var radius = d3.min(widthRadius.concat(heightRadius).concat([]), function(d) { return Math.abs(d); });

        return radius;
      }

      function calcHoleOffset() {
        var heightHoleHalf = hole_wrap.node().getBoundingClientRect().height * 0.30;
        var heightPieHalf = Math.abs(maxHeightRadius * d3.min(extHeights));
        var holeOffset = Math.round(heightHoleHalf - heightPieHalf);
        return holeOffset;
      }

      function labelOpacity(d) {
        var percent = (endAngle(d) - startAngle(d)) / (2 * Math.PI);
        return percent > labelThreshold ? 1 : 0;
      }

      function alignedRight(d, arc) {
        var circ = Math.PI * 2,
            midArc = ((startAngle(d) + endAngle(d)) / 2 + circ) % circ;
        return midArc > 0 && midArc < Math.PI ? 1 : -1;
      }

      function arcTween(d) {
        if (!donut) {
          d.innerRadius = 0;
        }
        var i = d3.interpolate(this._current, d);
        this._current = i(0);

        return function(t) {
          var iData = i(t);
          return pieArc(iData);
        };
      }

      function tweenPie(b) {
        b.innerRadius = 0;
        var i = d3.interpolate({startAngle: 0, endAngle: 0}, b);
        return function(t) {
          return pieArc(i(t));
        };
      }

    });

    return model;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  model.dispatch = dispatch;

  model.id = function(_) {
    if (!arguments.length) { return id; }
    id = _;
    return model;
  };

  model.color = function(_) {
    if (!arguments.length) { return color; }
    color = _;
    return model;
  };
  model.fill = function(_) {
    if (!arguments.length) { return fill; }
    fill = _;
    return model;
  };
  model.classes = function(_) {
    if (!arguments.length) { return classes; }
    classes = _;
    return model;
  };
  model.gradient = function(_) {
    if (!arguments.length) { return gradient; }
    gradient = _;
    return model;
  };

  model.margin = function(_) {
    if (!arguments.length) { return margin; }
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
    return model;
  };

  model.width = function(_) {
    if (!arguments.length) { return width; }
    width = _;
    return model;
  };

  model.height = function(_) {
    if (!arguments.length) { return height; }
    height = _;
    return model;
  };

  model.getKey = function(_) {
    if (!arguments.length) { return getKey; }
    getKey = _;
    return model;
  };

  model.getValue = function(_) {
    if (!arguments.length) { return getValue; }
    getValue = _;
    return model;
  };

  model.getCount = function(_) {
    if (!arguments.length) { return getCount; }
    getCount = _;
    return model;
  };

  model.fmtKey = function(_) {
    if (!arguments.length) { return fmtKey; }
    fmtKey = _;
    return model;
  };

  model.fmtValue = function(_) {
    if (!arguments.length) { return fmtValue; }
    fmtValue = _;
    return model;
  };

  model.fmtCount = function(_) {
    if (!arguments.length) { return fmtCount; }
    fmtCount = _;
    return model;
  };

  model.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    return model;
  };

  model.delay = function(_) {
    if (!arguments.length) { return delay; }
    delay = _;
    return model;
  };

  model.duration = function(_) {
    if (!arguments.length) { return duration; }
    duration = _;
    return model;
  };

  model.locality = function(_) {
    if (!arguments.length) { return locality; }
    locality = utility.buildLocality(_);
    return model;
  };

  model.textureFill = function(_) {
    if (!arguments.length) { return textureFill; }
    textureFill = _;
    return model;
  };

  // PIE

  model.showLabels = function(_) {
    if (!arguments.length) { return showLabels; }
    showLabels = _;
    return model;
  };

  model.labelSunbeamLayout = function(_) {
    if (!arguments.length) { return labelSunbeamLayout; }
    labelSunbeamLayout = _;
    return model;
  };

  model.donutLabelsOutside = function(_) {
    if (!arguments.length) { return donutLabelsOutside; }
    donutLabelsOutside = _;
    return model;
  };

  model.pieLabelsOutside = function(_) {
    if (!arguments.length) { return pieLabelsOutside; }
    pieLabelsOutside = _;
    return model;
  };

  model.showLeaders = function(_) {
    if (!arguments.length) { return showLeaders; }
    showLeaders = _;
    return model;
  };

  model.donut = function(_) {
    if (!arguments.length) { return donut; }
    donut = _;
    return model;
  };

  model.hole = function(_) {
    if (!arguments.length) { return hole; }
    hole = _;
    return model;
  };

  model.holeFormat = function(_) {
    if (!arguments.length) { return holeFormat; }
    holeFormat = utility.functor(_);
    return model;
  };

  model.donutRatio = function(_) {
    if (!arguments.length) { return donutRatio; }
    donutRatio = _;
    return model;
  };

  model.startAngle = function(_) {
    if (!arguments.length) { return startAngle; }
    startAngle = _;
    return model;
  };

  model.endAngle = function(_) {
    if (!arguments.length) { return endAngle; }
    endAngle = _;
    return model;
  };

  model.labelThreshold = function(_) {
    if (!arguments.length) { return labelThreshold; }
    labelThreshold = _;
    return model;
  };

  model.arcDegrees = function(_) {
    if (!arguments.length) { return arcDegrees; }
    arcDegrees = Math.max(Math.min(_, 360), 1);
    return model;
  };

  model.rotateDegrees = function(_) {
    if (!arguments.length) { return rotateDegrees; }
    rotateDegrees = _ % 360;
    return model;
  };

  model.minRadius = function(_) {
    if (!arguments.length) { return minRadius; }
    minRadius = _;
    return model;
  };

  model.maxRadius = function(_) {
    if (!arguments.length) { return maxRadius; }
    maxRadius = _;
    return model;
  };

  model.fixedRadius = function(_) {
    if (!arguments.length) { return fixedRadius; }
    fixedRadius = utility.functor(_);
    return model;
  };

  //============================================================

  return model;
}

function scroller() {

  //============================================================
  // Public Variables
  //------------------------------------------------------------

  var id,
      margin = {},
      vertical,
      width,
      height,
      minDimension,
      panHandler,
      overflowHandler,
      enable;

  //============================================================

  function scroll(g, g_entr, scroll_wrap, axis) {

    var defs = g.select('defs');
    var defs_entr = g_entr.select('defs');
    var axis_wrap = scroll_wrap.select('.sc-axis-wrap.sc-axis-x');
    var bars_wrap = scroll_wrap.select('.sc-bars-wrap');

    var scrollMask,
        scrollTarget,
        backShadows,
        foreShadows;

    var scrollOffset = 0;

    gradients_create();
    scrollMask_create();
    scrollTarget_create();
    backShadows_create();
    foreShadows_create();

    //------------------------------------------------------------
    // Privileged Methods

    // typically called by chart model
    scroll.render = function() {
      assignEvents();
      gradients_render();
      scrollMask_apply();
      backShadows_render();
      foreShadows_render();
    };

    // typically called by container resize
    scroll.resize = function(offset, overflow) {
      var labelOffset;
      var x, y;
      var scrollWidth, scrollHeight;
      var length, val;

      scrollOffset = offset;
      overflowHandler = overflow;

      // toggle enable dependent
      scroll.render();

      if (!enable) {
        return;
      }

      labelOffset = axis.labelThickness() + axis.tickPadding() / 2;
      x = vertical ? margin.left : labelOffset;
      y = margin.top;
      scrollWidth = width + (vertical ? 0 : margin[axis.orient()] - labelOffset);
      scrollHeight = height + (vertical ? margin[axis.orient()] - labelOffset : 0);
      length = vertical ? 'height' : 'width';
      val = vertical ? scrollHeight : scrollWidth;

      scrollMask_resize(width, height);
      scrollTarget_resize(x, y, scrollWidth, scrollHeight);
      backShadows_resize(x, y, width, height, length, val);
      foreShadows_resize(x, y, length, val);
    };

    // typically called by panHandler
    // returns scrollOffset
    scroll.pan = function(maxScroll) {
      var evt = d3.event;
      var src;
      var x = 0;
      var y = 0;
      var distance = 0;
      var translate = '';

      // we need click for handling legend toggle
      if (!evt || (evt.type !== 'click' && evt.type !== 'zoom')) {
        return 0;
      }
      src = evt.sourceEvent;

      // don't fire on events other than zoom and drag
      if (evt.type === 'zoom' && src) {
        if (src.type === 'wheel') {
          x = -src.deltaX;
          y = -src.deltaY;
          distance = scrollOffset + (Math.abs(x) > Math.abs(y) ? x : y);
        } else if (src.type === 'mousemove') {
          x = src.movementX;
          y = src.movementY;
          distance = scrollOffset + (Math.abs(x) > Math.abs(y) ? x : y);
        } else if (src.type === 'touchmove') {
          x = evt.transform.x;
          y = evt.transform.y;
          distance = (Math.abs(x) > Math.abs(y) ? x : y);
        }
      }

      // reset value defined in panMultibar();
      scrollOffset = Math.min(Math.max(distance, maxScroll), -1);
      translate = 'translate(' + (vertical ? scrollOffset + ',0' : '0,' + scrollOffset) + ')';

      if (distance > 0 || distance < maxScroll) {
        overflowHandler(Math.abs(y) > Math.abs(x) ? y : 0);
      }

      foreShadows
        .attr('transform', translate);
      bars_wrap
        .attr('transform', translate);
      axis_wrap.select('.sc-wrap.sc-axis')
        .attr('transform', translate);

      return scrollOffset;
    };

    //------------------------------------------------------------
    // Private Methods

    function assignEvents() {
      if (enable) {
        // var drag = d3.drag().on('drag', panHandler);
        // scroll_wrap.call(drag);
        // scrollTarget.call(drag);
        var zoom = d3.zoom().on('zoom', panHandler);
        scroll_wrap.call(zoom);
        scrollTarget.call(zoom);
      } else {
        // scroll_wrap.on('drag', null);
        // scrollTarget.on('drag', null);
        scroll_wrap.on('zoom', null);
        scrollTarget.on('zoom', null);
      }
    }

    /* Background gradients */
    function gradients_create() {
      defs_entr
        .append('linearGradient')
        .attr('class', 'sc-scroll-gradient')
        .attr('id', 'sc-back-gradient-prev-' + id);
      var bgpEnter = defs_entr.select('#sc-back-gradient-prev-' + id);

      defs_entr
        .append('linearGradient')
        .attr('class', 'sc-scroll-gradient')
        .attr('id', 'sc-back-gradient-more-' + id);
      var bgmEnter = defs_entr.select('#sc-back-gradient-more-' + id);

      bgpEnter
        .append('stop')
        .attr('stop-color', '#000')
        .attr('stop-opacity', '0.3')
        .attr('offset', 0);
      bgpEnter
        .append('stop')
        .attr('stop-color', '#FFF')
        .attr('stop-opacity', '0')
        .attr('offset', 1);
      bgmEnter
        .append('stop')
        .attr('stop-color', '#FFF')
        .attr('stop-opacity', '0')
        .attr('offset', 0);
      bgmEnter
        .append('stop')
        .attr('stop-color', '#000')
        .attr('stop-opacity', '0.3')
        .attr('offset', 1);

      /* Foreground gradients */
      defs_entr
        .append('linearGradient')
        .attr('class', 'sc-scroll-gradient')
        .attr('id', 'sc-fore-gradient-prev-' + id);
      var fgpEnter = defs_entr.select('#sc-fore-gradient-prev-' + id);

      defs_entr
        .append('linearGradient')
        .attr('class', 'sc-scroll-gradient')
        .attr('gradientUnits', 'objectBoundingBox')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('id', 'sc-fore-gradient-more-' + id);
      var fgmEnter = defs_entr.select('#sc-fore-gradient-more-' + id);

      fgpEnter
        .append('stop')
        .attr('stop-color', '#FFF')
        .attr('stop-opacity', '1')
        .attr('offset', 0);
      fgpEnter
        .append('stop')
        .attr('stop-color', '#FFF')
        .attr('stop-opacity', '0')
        .attr('offset', 1);
      fgmEnter
        .append('stop')
        .attr('stop-color', '#FFF')
        .attr('stop-opacity', '0')
        .attr('offset', 0);
      fgmEnter
        .append('stop')
        .attr('stop-color', '#FFF')
        .attr('stop-opacity', '1')
        .attr('offset', 1);

      defs.selectAll('.sc-scroll-gradient')
        .attr('gradientUnits', 'objectBoundingBox')
        .attr('x1', 0)
        .attr('y1', 0);
    }
    function gradients_render() {
      defs.selectAll('.sc-scroll-gradient')
        .attr('x2', vertical ? 1 : 0)
        .attr('y2', vertical ? 0 : 1);
    }

    /* Clipping mask for scroll window */
    function scrollMask_create() {
      defs_entr.append('clipPath')
        .attr('class', 'sc-scroll-mask')
        .attr('id', 'sc-edge-clip-' + id)
        .append('rect');
      scrollMask = defs.select('.sc-scroll-mask rect');
    }
    function scrollMask_apply() {
      scroll_wrap.attr('clip-path', enable ? 'url(#sc-edge-clip-' + id + ')' : '');
    }
    function scrollMask_resize(width, height) {
      scrollMask
        .attr('x', vertical ? 2 : -margin.left)
        .attr('y', vertical ? 0 : 2)
        .attr('width', width + (vertical ? -2 : margin.left))
        .attr('height', height + (vertical ? margin.bottom : -2));
    }

    /* Background rectangle for mouse events */
    function scrollTarget_create() {
      g_entr.select('.sc-background-wrap')
        .append('rect')
        .attr('class', 'sc-scroll-target')
        //.attr('fill', '#FFF');
        .attr('fill', 'transparent');
      scrollTarget = g.select('.sc-scroll-target');
    }
    function scrollTarget_resize(x, y, scrollWidth, scrollHeight) {
      scrollTarget
        .attr('x', x)
        .attr('y', y)
        .attr('width', scrollWidth)
        .attr('height', scrollHeight);
    }

    /* Background shadow rectangles */
    function backShadows_create() {
      var backShadows_entr = g_entr.select('.sc-background-wrap')
            .append('g')
            .attr('class', 'sc-back-shadow-wrap');
      backShadows_entr
        .append('rect')
        .attr('class', 'sc-back-shadow-prev');
      backShadows_entr
        .append('rect')
        .attr('class', 'sc-back-shadow-more');
      backShadows = g.select('.sc-back-shadow-wrap');
    }
    function backShadows_render() {
      var thickness = vertical ? 'width' : 'height';
      backShadows.select('rect.sc-back-shadow-prev')
        .attr('fill', enable ? 'url(#sc-back-gradient-prev-' + id + ')' : 'transparent')
        .attr(thickness, 7);
      backShadows.select('rect.sc-back-shadow-more')
        .attr('fill', enable ? 'url(#sc-back-gradient-more-' + id + ')' : 'transparent')
        .attr(thickness, 7);
    }
    function backShadows_resize(x, y, width, height, length, val) {
      backShadows.select('.sc-back-shadow-prev')
        .attr('x', x)
        .attr('y', y)
        .attr(length, val);
      backShadows.select('.sc-back-shadow-more')
        .attr('x', x + (vertical ? width - 5 : 1))
        .attr('y', y + (vertical ? 0 : height - 6))
        .attr(length, val);
    }

    /* Foreground shadow rectangles */
    function foreShadows_create() {
      var foreShadows_entr = g_entr.select('.sc-background-wrap')
            .insert('g')
            .attr('class', 'sc-fore-shadow-wrap');
      foreShadows_entr
        .append('rect')
        .attr('class', 'sc-fore-shadow-prev');
      foreShadows_entr
        .append('rect')
        .attr('class', 'sc-fore-shadow-more');
      foreShadows = g.select('.sc-fore-shadow-wrap');
    }
    function foreShadows_render() {
      var thickness = vertical ? 'width' : 'height';
      foreShadows.select('.sc-fore-shadow-prev')
        .attr('fill', enable ? 'url(#sc-fore-gradient-prev-' + id + ')' : 'transparent')
        .attr(thickness, 20);
      foreShadows.select('.sc-fore-shadow-more')
        .attr('fill', enable ? 'url(#sc-fore-gradient-more-' + id + ')' : 'transparent')
        .attr(thickness, 20);
    }
    function foreShadows_resize(x, y, length, val) {
      foreShadows.select('.sc-fore-shadow-prev')
        .attr('x', x + (vertical ? 1 : 0))
        .attr('y', y + (vertical ? 0 : 1))
        .attr(length, val);
      foreShadows.select('.sc-fore-shadow-more')
        .attr('x', x + (vertical ? minDimension - 17 : 0))
        .attr('y', y + (vertical ? 0 : minDimension - 19))
        .attr(length, val);
    }

    // return instance for method chaining
    return scroll;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  scroll.id = function(_) {
    if (!arguments.length) {
      return id;
    }
    id = _;
    return scroll;
  };

  scroll.margin = function(_) {
    if (!arguments.length) {
      return margin;
    }
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
    return scroll;
  };

  scroll.width = function(_) {
    if (!arguments.length) {
      return width;
    }
    width = _;
    return scroll;
  };

  scroll.height = function(_) {
    if (!arguments.length) {
      return height;
    }
    height = _;
    return scroll;
  };

  scroll.vertical = function(_) {
    if (!arguments.length) {
      return vertical;
    }
    vertical = _;
    return scroll;
  };

  scroll.minDimension = function(_) {
    if (!arguments.length) {
      return minDimension;
    }
    minDimension = _;
    return scroll;
  };

  scroll.panHandler = function(_) {
    if (!arguments.length) {
      return panHandler;
    }
    panHandler = utility.functor(_);
    return scroll;
  };

  scroll.enable = function(_) {
    if (!arguments.length) {
      return enable;
    }
    enable = _;
    return scroll;
  };

  //============================================================

  return scroll;
}

function table() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 2, right: 0, bottom: 2, left: 0},
      width = 0,
      height = 0,
      getX = function (d) { return d.x; },
      getY = function (d) { return d.y; },
      strings = language(),
      color = utility.getColor(['#000']);

  //============================================================


  function table(selection) {
    selection.each(function (chartData) {
      var container = d3.select(this);

      //------------------------------------------------------------

      var properties = chartData ? chartData.properties : {},
          data = (chartData && chartData.data) ? chartData.data.map(function (d, i) {
            return {
              'key': d.key || 'Undefined',
              'type': d.type || null,
              'disabled': d.disabled || false,
              'series': d.seriesIndex || i,
              'values': d._values || d.values
            };
          }) : null;

      var containerWidth = parseInt(container.style('width'), 10),
          containerHeight = parseInt(container.style('height'), 10);

      var labels = properties.groups ||
            d3.range(
              1,
              d3.max(data.map(function (d) { return d.values.length; })) + 1
            )
            .map(function (d) {
              return {'group': d, 'l': 'Group ' + d};
            });

      var singleSeries = d3.max(data.map(function (d) {
            return d.values.length;
          })) === 1;

      function displayNoData(d) {
        var hasData = d && d.length && d.filter(function (d) { return d.values.length; }).length,
            x = (containerWidth - margin.left - margin.right) / 2 + margin.left,
            y = (containerHeight - margin.top - margin.bottom) / 2 + margin.top;
        return utility.displayNoData(hasData, container, table.strings().noData, x, y);
      }
      // Check to see if there's nothing to show.
      if (displayNoData(data)) {
        return table;
      }
      //------------------------------------------------------------
      // Setup containers and skeleton of model

      var wrap_bind = container.selectAll('table').data([data]);
      var wrap_enter = wrap_bind.enter().append('table');
      wrap_bind.exit().remove();
      var wrap = container.selectAll('table').merge(wrap_enter);

      //------------------------------------------------------------
      var table_entr = wrap_enter.attr('class', 'sucrose');

      var thead_entr = table_entr.append('thead')
            .attr('class', 'sc-thead')
              .append('tr')
                .attr('class', 'sc-groups');
      var thead = wrap.select('.sc-groups').merge(thead_entr);
          thead_entr.append('th')
            .attr('class', 'sc-th sc-series-state')
            .text('Enabled');
          thead_entr.append('th')
            .attr('class', 'sc-th sc-series-keys')
            .text(properties.key || 'Series Key');

      var cols_bind = thead.selectAll('.sc-group').data(labels);
      var cols_entr = cols_bind.enter().append('th')
            .attr('class', 'sc-th sc-group');
          cols_bind.exit().remove();
          thead.selectAll('.sc-group').merge(cols_entr)
            .text(function (d) { return singleSeries ? 'Series Total' : d.l; });

        if (!singleSeries) {
          thead_entr
            .append('th').attr('class', 'sc-th sc-series-totals')
            .text('Series Total');
        }

      //------------------------------------------------------------

      var tfoot_entr = table_entr.append('tfoot')
            .attr('class', 'sc-tfoot')
              .append('tr')
                .attr('class', 'sc-sums');
      var tfoot = wrap.select('.sc-sums').merge(tfoot_entr);
          tfoot_entr.append('th')
            .attr('class', 'sc-th sc-group-sums')
            .text('');
          tfoot_entr.append('th')
            .attr('class', 'sc-th sc-group-sums')
            .text(singleSeries ? 'Sum' : 'Group Sums');

      var sums_bind = tfoot.selectAll('.sc-sum').data(function (d) {
              return d
                .filter(function (f) {
                  return !f.disabled;
                })
                .map(function (a) {
                  return a.values.map(function (b) { return getY(b); });
                })
                .reduce(function (p, c) {
                  return p.map(function (d, i) {
                    return d + c[i];
                  });
                });
              });
      var sums_entr = sums_bind.enter().append('th')
            .attr('class', 'sc-sum');
          sums_bind.exit().remove();
          tfoot.selectAll('.sc-sum').merge(sums_entr)
            .text(function (d) { return d; });

        if (!singleSeries) {
          tfoot_entr.append('th')
            .attr('class', 'sc-th sc-sum-total');
          tfoot.select('.sc-sum-total')
            .text(function (d) {
              return d
                .filter(function (f) {
                  return !f.disabled;
                })
                .map(function (a) {
                  return a.values
                    .map(function (b) { return getY(b); })
                    .reduce(function (p, c) {
                      return p + c;
                    });
                })
                .reduce(function (p, c) {
                  return p + c;
                });
            });
        }

      //------------------------------------------------------------

          table_entr.append('tbody')
            .attr('class', 'sc-tbody');

      var tbody = wrap.select('.sc-tbody');

      var rows_bind = tbody.selectAll('.sc-series').data(function (d) { return d; });
          rows_bind.exit().remove();
      var rows_entr = rows_bind.enter().append('tr')
            .attr('class', 'sc-series');
          rows_entr.append('td')
            .attr('class', 'sc-td sc-state')
            .attr('tabindex', -1)
            .attr('data-editable', false)
            .append('input')
              .attr('type', 'checkbox');
          rows_entr.append('td')
            .attr('class', 'sc-td sc-key');

      var series = tbody.selectAll('.sc-series').merge(rows_entr)
            .style('color', function (d) { return d.disabled ? '#ddd' : '#000'; })
            .style('text-decoration', function (d) { return d.disabled ? 'line-through' : 'inherit'; });
          series.select('.sc-state input')
            .property('checked', function (d) { return d.disabled ? false : true; });
          series.select('.sc-key')
            .text(function (d) { return d.key; });

      var cells_bind = series.selectAll('.sc-val').data(function (d, i) {
              return d.values.map(function (g, j) {
                  var val = Array.isArray(g) ?
                    {
                      0: g[0],
                      1: g[1]
                    } :
                    {
                      x: g.x,
                      y: g.y
                    };
                  val.series = i;
                  val.index = j;
                  return val;
                });
            });
      var cells_entr = cells_bind.enter().append('td')
            .attr('class', 'sc-td sc-val');
          cells_bind.exit().remove();
          tbody.selectAll('.sc-val').merge(cells_entr)
            .text(function (d) {
              return getY(d);
            });

        if (!singleSeries) {
          rows_entr.append('td')
            .attr('class', 'sc-td sc-total')
            .attr('tabindex', -1)
            .attr('data-editable', false);
          series.select('.sc-total')
            .text(function (d) {
              return d.values
                .map(function (d) { return getY(d); })
                .reduce(function (p, c) {
                  return p + c;
                });
            });
        }

    });

    return table;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  table.margin = function (_) {
    if (!arguments.length) { return margin; }
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        margin[prop] = _[prop];
      }
    }
    return table;
  };

  table.width = function (_) {
    if (!arguments.length) { return width; }
    width = _;
    return table;
  };

  table.height = function (_) {
    if (!arguments.length) { return height; }
    height = _;
    return table;
  };

  table.x = function (_) {
    if (!arguments.length) { return getX; }
    getX = utility.functor(_);
    return table;
  };

  table.y = function (_) {
    if (!arguments.length) { return getY; }
    getY = utility.functor(_);
    return table;
  };

  table.strings = function (_) {
    if (!arguments.length) { return strings; }
    strings = language(_);
    return table;
  };

  table.color = function (_) {
    if (!arguments.length) { return color; }
    color = utility.getColor(_);
    return table;
  };

  //============================================================


  return table;
}

function treemap() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 20, right: 0, bottom: 0, left: 0},
      width = 0,
      height = 0,
      x = d3.scaleLinear(), //can be accessed via model.xScale()
      y = d3.scaleLinear(), //can be accessed via model.yScale()
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID incase user doesn't select one
      getValue = function(d) { return d.size; }, // accessor to get the size value from a data point
      getKey = function(d) { return d.name; }, // accessor to get the name value from a data point
      groupBy = function(d) { return getKey(d); }, // accessor to get the name value from a data point
      clipEdge = true, // if true, masks lines within x and y scale
      duration = 0,
      delay = 0,
      leafClick = function(d, i) { return false; },
      // color = function(d, i) { return utility.defaultColor()(d, i); },
      color = d3.scaleOrdinal().range(
        d3.schemeCategory20.map(function(c) {
          c = d3.rgb(c);
          c.opacity = 0.6;
          return c;
        })
      ),
      gradient = utility.colorLinearGradient,
      fill = color,
      textureFill = false,
      classes = function(d, i) { return 'sc-child'; },
      direction = 'ltr',
      dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout', 'elementMousemove');


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var ROOT,
      TREE,
      NODES = [];

  // This is for data sets that don't include a colorIndex
  // Excludes leaves
  function reduceGroups(d) {
    var data = d.data ? d.data : d;
    var name = groupBy(data).toLowerCase();
    var i, l;
    if (name && NODES.indexOf(name) === -1) {
      NODES.push(name);
      if (data.children) {
        l = data.children.length;
        for (i = 0; i < l; i += 1) {
          reduceGroups(data.children[i]);
        }
      }
    }
    return NODES;
  }

  //============================================================
  // TODO:
  // 1. title,
  // 2. colors,
  // 3. legend data change remove,
  // 4. change groupby,
  // 5. contrasting text

  function model(selection) {
    selection.each(function(chartData) {

      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          container = d3.select(this),
          transitioning;

      function getColorIndex(d, i) {
        return d.colorIndex || NODES.indexOf(groupBy(d).toLowerCase()) || i;
      }

      // We only need to define TREE and NODES once on initial load
      // TREE is always available in its initial state and NODES is immutable
      TREE = TREE ||
        d3.hierarchy(chartData[0])
          .sum(function(d) { return getValue(d); })
          .sort(function(a, b) { return b.height - a.height || b.value - a.value; });

      NODES = NODES.length ? NODES : reduceGroups(TREE);

      // Recalcuate the treemap layout dimensions
      d3.treemap()
        .size([availableWidth, availableHeight])
        .round(false)(TREE);

      // We store the root on first render
      // which gets reused on resize
      // Transition will reset root when called
      ROOT = ROOT || TREE;

      x.domain([ROOT.x0, ROOT.x1])
       .range([0, availableWidth]);
      y.domain([ROOT.y0, ROOT.y1])
       .range([0, availableHeight]);

      //------------------------------------------------------------
      // Setup containers and skeleton of model

      var wrap_bind = container.selectAll('g.sc-wrap.sc-treemap').data([TREE]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-wrap sc-treemap');
      var wrap = container.select('.sc-wrap.sc-treemap').merge(wrap_entr);

      var defs_entr = wrap_entr.append('defs');
      var defs = wrap.select('defs');

      // wrap.attr('transform', utility.translation(margin.left, margin.top));

      //------------------------------------------------------------
      // Definitions

      defs_entr.append('clipPath')
        .attr('id', 'sc-edge-clip-' + id)
        .append('rect');
      defs.select('#sc-edge-clip-' + id + ' rect')
        .attr('width', width)
        .attr('height', height);
      wrap.attr('clip-path', clipEdge ? 'url(#sc-edge-clip-' + id + ')' : '');

      if (textureFill) {
        var mask = utility.createTexture(defs_entr, id);
      }

      // Set up the gradient constructor function
      model.gradientFill = function(d, i, params) {
        var gradientId = id + '-' + i;
        var c = color(d, getColorIndex(d.parent.data, i), NODES.length);
        return gradient(d, gradientId, params, c, defs);
      };

      //------------------------------------------------------------
      // Family Tree Path

      var treepath_bind = wrap_entr.selectAll('.sc-treepath').data([TREE]);
      var treepath_enter = treepath_bind.enter().append('g').attr('class', 'sc-treepath');
      var treepath = wrap.selectAll('.sc-treepath').merge(treepath_enter);

      treepath_enter.append('rect')
        .attr('class', 'sc-target')
        .on('click', function(d) {
          dispatch.call('chartClick', this, d);
          transition.call(this, d.parent);
        });

      treepath_enter.append('text')
        .attr('x', direction === 'rtl' ? width - 6 : 6)
        .attr('y', 6)
        .attr('dy', '.75em');

      treepath.select('.sc-target')
        .attr('width', width)
        .attr('height', margin.top);

      //------------------------------------------------------------
      // Main Model

      var gold = render();

      function render() {

        var grandparent_bind = wrap.selectAll('.sc-grandparent.sc-trans').data([ROOT]);
        var grandparent_entr = grandparent_bind.enter().append('g').attr('class', 'sc-grandparent sc-trans');
        var grandparent = wrap.selectAll('.sc-grandparent.sc-trans').merge(grandparent_entr);
        // We need to keep the old granparent around until transition ends
        // grandparent.exit().remove();

        grandparent
          .attr('transform', utility.translation(margin.left, margin.top))
          .lower();

        // Parent group
        var parents_bind = grandparent.selectAll('g.sc-parent').data(ROOT.children);
        var parents_entr = parents_bind.enter().append('g').classed('sc-parent', true);
        var parents = grandparent.selectAll('.sc-parent').merge(parents_entr);
        parents_bind.exit().remove();

        parents
          .classed('sc-active', function(d) { return d.active === 'active'; })
          .style('stroke-opacity', 1)
          .style('fill-opacity', 1);

        // Child rectangles
        var children_bind = parents.selectAll('rect.sc-child').data(function(d) { return d.children || [d]; });
        var children_entr = children_bind.enter().append('rect').attr('class', 'sc-child');
        var children = parents.selectAll('.sc-child').merge(children_entr);
        children_bind.exit().remove();

        if (textureFill) {
          // For on click active bars
          parents_entr.append('rect')
            .attr('class', 'sc-texture')
            .attr('x', 0)
            .attr('y', 0)
            .style('mask', 'url(' + mask + ')');
        }

        children
          .attr('class', function(d, i) {
            // console.log(d.parent);
            return classes(d, getColorIndex(d.parent.data, i));
          })
          .attr('fill', function(d, i) {
            return this.getAttribute('fill') || fill(d, getColorIndex(d.parent.data, i), NODES.length);
          })
            .call(rect);

        if (textureFill) {
          parents.select('rect.sc-texture')
            .style('fill', function(d, i) {
              var backColor = this.getAttribute('fill') || fill(d, getColorIndex(d.parent.data, i), NODES.length),
                  foreColor = utility.getTextContrast(backColor, i);
              return foreColor;
            })
              .call(rect);
        }

        // Parent labels
        var label_bind = parents.selectAll('text.sc-label').data(function(d) { return [d]; });
        var label_entr = label_bind.enter().append('text').attr('class', 'sc-label')
              .attr('dy', '.75em');
        var label = parents.selectAll('.sc-label').merge(label_entr);
        label_bind.exit().remove();

        label
          .text(function(d) {
            return getKey(d.data);  //groupBy(d);
          })
          .style('fill', function(d, i) {
            var backColor = this.getAttribute('fill') || fill(d, getColorIndex(d.data, i), NODES.length),
                foreColor = utility.getTextContrast(backColor, i);
            return foreColor;
          })
            .call(text);

        // Parent event target
        var target_bind = parents.selectAll('rect.sc-target').data(function(d) { return [d]; });
        var target_entr = target_bind.enter().append('rect').attr('class', 'sc-target');
        var target = parents.selectAll('.sc-target').merge(target_entr);
        target_bind.exit().remove();

        target
            .call(rect);

        // Family tree path
        treepath.selectAll('text')
          .datum(ROOT)
            .text(crumbs);

        treepath.selectAll('rect')
            .datum(ROOT);

        // -------------
        // Assign Events

        // Assign transition event for parents with children.
        target
          .filter(function(d) { return d.children; })
          .on('click', function(d) {
            if (d.parent)  {
              dispatch.call('chartClick', this, d.parent);
            }
            transition.call(this, d);
          });

        // Assign navigate event for parents without children (leaves).
        target
          .filter(function(d) { return !(d.children); })
          .on('click', function(d, i) {
            d3.event.stopPropagation();
            var eo = {
              d: d,
              i: i
            };
            dispatch.call('elementClick', this, eo);
          });

        // Tooltips
        target
          .on('mouseover', function(d, i) {
            d3.select(this).classed('hover', true);
            var eo = buildEventObject(d3.event, d, i);
            dispatch.call('elementMouseover', this, eo);
          })
          .on('mousemove', function(d, i) {
            var e = d3.event;
            dispatch.call('elementMousemove', this, e);
          })
          .on('mouseout', function(d, i) {
            d3.select(this).classed('hover', false);
            dispatch.call('elementMouseout', this);
          });

        children
          .on('mouseover', function(d, i) {
            d3.select(this).classed('hover', true);
            var eo = buildEventObject(d3.event, d, i);
            dispatch.call('elementMouseover', this, eo);
          })
          .on('mouseout', function(d, i) {
            d3.select(this).classed('hover', false);
            dispatch.call('elementMouseout', this);
          });

        return grandparent;
      }

      function buildEventObject(e, d, i) {
        return {
          label: getKey(d),
          value: getValue(d),
          point: d,
          pointIndex: i,
          e: d3.event,
          id: id
        };
      }

      function transition(d) {
        var direction;
        var tup;
        var tdn;
        var gnew;

        // cleanup tooltips
        dispatch.call('elementMouseout', this);

        // If we are already transitioning, wait
        if (transitioning || !d) { return; }

        // Reset the root which will be used by render
        ROOT = d;

        transitioning = true;

        gold.classed('sc-trans', false);

        direction = d3.select(this).classed('sc-target') ? 'out' : 'in';

        // Create transitions for in and out
        tup = d3.transition('treemap-out')
                    .duration(duration)
                    .ease(d3.easeCubicIn);
        tdn = d3.transition('treemap-in')
                    .duration(duration)
                    .ease(d3.easeCubicIn);

        // render the new treemap
        gnew = render();

        // Update the domain only after entering new elements
        x.domain([d.x0, d.x1]);
        y.domain([d.y0, d.y1]);

        // Enable anti-aliasing during the transition
        container.style('shape-rendering', null);

        // Fade-in entering text so start at zero
        gnew.selectAll('text').style('fill-opacity', 0);

        // Select existing text and rectangles with transition
        // anything called by this selection will be run
        // continously until transtion completes
        gnew.selectAll('text').transition(tdn).style('fill-opacity', 1).call(text);
        gnew.selectAll('rect').transition(tdn).style('fill-opacity', 1).call(rect);
        gold.selectAll('text').transition(tup).style('fill-opacity', 0).call(text).remove();
        gold.selectAll('rect').transition(tup).style('fill-opacity', 0).call(rect)
          .on('end', function(d, i) {
            transitioning = false;
            container.style('shape-rendering', 'crispEdges');
            gold.selectAll('*').interrupt('treemap-out');
            gold.remove();
            gold = gnew;
          });
      }

      function text(text) {
        text
          .attr('x', function(d) {
            var xpos = direction === 'rtl' ? -1 : 1;
            return x(d.x0) + 6 * xpos;
          })
          .attr('y', function(d) {
            return y(d.y0) + 6;
          });
      }

      function rect(rect) {
        rect
          .attr('x', function(d) {
            return x(d.x0);
          })
          .attr('y', function(d) { return y(d.y0); })
          .attr('width', function(d) {
            return x(d.x1) - x(d.x0);
          })
          .attr('height', function(d) { return y(d.y1) - y(d.y0); });
      }

      function crumbs(d) {
        if (d.parent) {
          return crumbs(d.parent) + ' / ' + getKey(d.data);
        }
        return getKey(d.data);
      }
    });

    return model;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  model.dispatch = dispatch;

  model.color = function(_) {
    if (!arguments.length) { return color; }
    color = _;
    return model;
  };
  model.fill = function(_) {
    if (!arguments.length) { return fill; }
    fill = _;
    return model;
  };
  model.classes = function(_) {
    if (!arguments.length) { return classes; }
    classes = _;
    return model;
  };
  model.gradient = function(_) {
    if (!arguments.length) { return gradient; }
    gradient = _;
    return model;
  };

  model.margin = function(_) {
    if (!arguments.length) { return margin; }
    margin.top    = typeof _.top    !== 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  !== 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom !== 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   !== 'undefined' ? _.left   : margin.left;
    return model;
  };

  model.width = function(_) {
    if (!arguments.length) { return width; }
    width = _;
    return model;
  };

  model.height = function(_) {
    if (!arguments.length) { return height; }
    height = _;
    return model;
  };

  model.xScale = function(_) {
    if (!arguments.length) { return x; }
    x = _;
    return model;
  };

  model.yScale = function(_) {
    if (!arguments.length) { return y; }
    y = _;
    return model;
  };

  model.leafClick = function(_) {
    if (!arguments.length) { return leafClick; }
    leafClick = _;
    return model;
  };

  model.getValue = function(_) {
    if (!arguments.length) { return getValue; }
    getValue = _;
    return model;
  };

  model.getKey = function(_) {
    if (!arguments.length) { return getKey; }
    getKey = _;
    return model;
  };

  model.groupBy = function(_) {
    if (!arguments.length) { return groupBy; }
    groupBy = _;
    return model;
  };

  model.groups = function(_) {
    if (!arguments.length) { return NODES; }
    NODES = _;
    return model;
  };

  model.duration = function(_) {
    if (!arguments.length) { return duration; }
    duration = _;
    return model;
  };

  model.delay = function(_) {
    if (!arguments.length) { return delay; }
    delay = _;
    return model;
  };

  model.id = function(_) {
    if (!arguments.length) { return id; }
    id = _;
    return model;
  };

  model.direction = function(_) {
    if (!arguments.length) {
      return direction;
    }
    direction = _;
    return model;
  };

  model.textureFill = function(_) {
    if (!arguments.length) { return textureFill; }
    textureFill = _;
    return model;
  };

  //============================================================


  return model;
}

/*-------------------
       MODELS
-------------------*/

var models = {
    area: area,
    axis: axis,
    funnel: funnel,
    gauge: gauge,
    headers: headers,
    line: line,
    menu: menu,
    multibar: multibar,
    pie: pie,
    scatter: scatter,
    scroller: scroller,
    table: table,
    treemap: treemap,
};

function areaChart() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 10, right: 10, bottom: 10, left: 10},
      width = null,
      height = null,
      direction = 'ltr',
      delay = 0,
      duration = 0,
      tooltips = true,
      state = {},
      strings = language();

  var dispatch = d3.dispatch(
        'chartClick', 'tooltipShow', 'tooltipHide', 'tooltipMove',
        'stateChange', 'changeState'
      );

  var pointRadius = 3;

  var xValueFormat = function(d, i, label, isDate, dateFormat) {
        // If ordinal, label is provided so use it.
        // If date or numeric use d.
        var value = label || d;
        if (isDate) {
          dateFormat = !dateFormat || dateFormat.indexOf('%') !== 0 ? '%x' : dateFormat;
          return utility.dateFormat(value, dateFormat, chart.locality());
        } else {
          return value;
        }
      };

  var yValueFormat = function(d, i, label, isCurrency, precision) {
        precision = isNaN(precision) ? 2 : precision;
        return utility.numberFormatSI(d, precision, isCurrency, chart.locality());
      };

  var tooltipContent = function(eo, properties) {
        var key = eo.seriesKey;
        var yIsCurrency = properties.yDataType === 'currency';
        var y = yValueFormat(eo[1], eo.pointIndex, null, yIsCurrency, 2);
        return '<p>' + key + ': ' + y + '</p>';
      };

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  // Chart components
  var model = area();
  var header = headers();
  var xAxis = axis();
  var yAxis = axis();
  var guide = line();

  var tt = null;
  var guidetips = null;

  model
    .clipEdge(true);
  header
    .showTitle(true)
    .showControls(false)
    .showLegend(true);
  guide
    .duration(0);


  //============================================================

  function chart(selection) {

    selection.each(function(chartData) {

      var that = this,
          container = d3.select(this),
          modelClass = 'area';

      var properties = chartData ? chartData.properties || {} : {},
          data = chartData ? chartData.data || null : null;

      var containerWidth = parseInt(container.style('width'), 10),
          containerHeight = parseInt(container.style('height'), 10);

      var availableWidth = width,
          availableHeight = height;

      var xIsDatetime = properties.xDataType === 'datetime' || false,
          yIsCurrency = properties.yDataType === 'currency' || false;

      var groupData = properties.groups,
          hasGroupData = Array.isArray(groupData) && groupData.length > 0,
          groupLabels = [],
          groupCount = 0,
          hasGroupLabels = false;

      var modelData = [],
          seriesCount = 0,
          totalAmount = 0;

      var padding = 0;

      var controlsData = [
        {key: 'Stacked', disabled: model.offset() !== 'zero'},
        {key: 'Stream', disabled: model.offset() !== 'wiggle'},
        {key: 'Expanded', disabled: model.offset() !== 'expand'}
      ];

      var x,
          y;

      chart.update = function() {
        container.transition().duration(duration).call(chart);
      };

      chart.container = this;


      //------------------------------------------------------------
      // Private method for displaying no data message.

      function displayNoData(data, msg) {
        var hasData = data && data.length && data.filter(function(series) {
          return !series.disabled && Array.isArray(series.values) && series.values.length;
        }).length;
        var x = (containerWidth - margin.left - margin.right) / 2 + margin.left;
        var y = (containerHeight - margin.top - margin.bottom) / 2 + margin.top;
        return utility.displayNoData(hasData, container, (msg || strings.noData), x, y);
      }

      // Check to see if there's nothing to show.
      if (displayNoData(data)) {
        return chart;
      }


      //------------------------------------------------------------
      // Process data

      // add series index to each data point for reference
      // and disable data series if total is zero
      data.forEach(function(series, s) {
        series.seriesIndex = s;
        series.key = series.key || strings.noLabel;
        series.total = d3.sum(series.values, function(value, v) {
          return model.y()(value, v);
        });

        // disabled if all values in series are zero
        // or the series was disabled by the legend
        series.disabled = series.disabled || series.total === 0;
      });

      // Remove disabled series data
      modelData = data
        .filter(function(series) {
          return !series.disabled;
        })
        .map(function(series, s) {
          // this is the iterative index, not the data index
          series.seri = s;
          return series;
        });

      seriesCount = modelData.length;

      // Display No Data message if there's nothing to show.
      if (displayNoData(modelData)) {
        return chart;
      }

      // -------------------------------------------
      // Get group data from properties or modelData

      function setGroupLabels(groupData) {
        // Get simple array of group labels for ticks
        groupLabels = groupData.map(function(group) {
            return group.label;
          });
        groupCount = groupLabels.length;
        hasGroupLabels = groupCount > 0;
      }

      if (hasGroupData) {

        // Calculate group totals and height
        // based on enabled data series
        groupData
          .forEach(function(group, g) {
            var label = typeof group.label === 'undefined' || group.label === '' ?
              strings.noLabel :
                xIsDatetime ?
                  utility.isNumeric(group.label) || group.label.indexOf('GMT') !== -1 ?
                    new Date(group.label) :
                    new Date(group.label + ' GMT') :
                  group.label;
            group.group = g,
            group.label = label;
            group.total = 0;

            //TODO: only sum enabled series
            // update group data with values
            modelData
              .forEach(function(series, s) {
              //TODO: there is a better way with map reduce?
                series.values
                  .filter(function(value, v) {
                    return value.group === g;
                  })
                  .forEach(function(value, v) {
                    group.total += value.y;
                  });
              });
          });

        setGroupLabels(groupData);

        totalAmount = d3.sum(groupData, function(group) {
          return group.total;
        });

      } else {

        groupLabels = d3
          .merge(modelData.map(function(series) {
            return series.values;
          }))
          .reduce(function(a, b) {
            if (a.indexOf(b.x) === -1) {
              a.push(b.x);
            }
            return a;
          }, [])
          .map(function(value, v) {
            return xIsDatetime ? new Date(value) : value;
          });

        groupCount = Math.min(Math.ceil(innerWidth / 100), groupLabels.length);

        totalAmount = d3.sum(modelData, function(series) {
          return series.total;
        });

      }


      //------------------------------------------------------------
      // Configure axis format functions

          //TODO: allow formatter to be set by data
      var xTickMaxWidth = 75,
          xDateFormat = null,
          xAxisFormat = null,
          yAxisFormat = null;

      var yAxisFormatProperties = {
        axis: null,
        maxmin: null
      };

      function setAxisFormatProperties(type, selection) {
        // i.e., 100 | 200 | 300
        var tickDatum = selection.map(function(t) {
            return d3.select(t).datum();
          });
        // i.e., 1 | 1000 | 1000000
        var decimal = d3.max(d3.extent(tickDatum), function(v) {
            return utility.siDecimal(Math.abs(v));
          });
        var precision = d3.max(tickDatum, function(v) {
            return utility.countSigFigsAfter(d3.formatPrefix('.2s', decimal)(v));
          });
        if (type === 'maxmin' && yAxisFormatProperties.axis) {
          precision = Math.max(yAxisFormatProperties.axis.precision, precision);
        }
        yAxisFormatProperties[type] = {
          decimal: decimal,
          precision: precision
        };
        return yAxisFormatProperties[type];
      }

      if (xIsDatetime) {
        xDateFormat = utility.getDateFormatUTC(groupLabels);
      }

      xAxisFormat = function(d, i, selection, type) {
        var group = hasGroupLabels ? groupLabels[i] : d;
        var label = xValueFormat(d, i, group, xIsDatetime, xDateFormat);
        return type === 'no-ellipsis' ?
          label :
          utility.stringEllipsify(label, container, xTickMaxWidth);
      };

      yAxisFormat = function(d, i, selection, type) {
        var props = yAxisFormatProperties[type] ||
              setAxisFormatProperties(type, selection);
        return yValueFormat(d, i, null, yIsCurrency, props.precision, props.decimal);
      };


      //------------------------------------------------------------
      // State persistence model

      state.disabled = modelData.map(function(d) { return !!d.disabled; });
      state.style = model.style();


      //------------------------------------------------------------
      // Setup Scales and Axes

      header
        .chart(chart)
        .title(properties.title)
        .controlsData(controlsData)
        .legendData(data);

      model
        .xDomain(null)  //?why null?
        .yDomain(null)
        .xScale(xIsDatetime ? d3.scaleTime() : d3.scaleLinear());

      x = model.xScale();
      y = model.yScale();

      xAxis
        .orient('bottom')
        .ticks(null)
        .tickValues(null)
        .scale(x)
        .tickPadding(6)
        .valueFormat(xAxisFormat)
        .highlightZero(false)
        .showMaxMin(xIsDatetime);

      yAxis
        .orient('left')
        .ticks(null)
        .scale(y)
        .tickPadding(6)
        .valueFormat(yAxisFormat)
        .highlightZero(true)
        .showMaxMin(true);

      guide
        .id(model.id())
        .useVoronoi(false)
        .clipEdge(false)
        .xScale(x)
        .yScale(y);


      //------------------------------------------------------------
      // Main chart wrappers

      var wrap_bind = container.selectAll('g.sc-chart-wrap').data([modelData]);
      var wrap_entr = wrap_bind.enter().append('g')
            .attr('class', 'sc-chart-wrap sc-chart-' + modelClass);
      var wrap = container.select('.sc-chart-wrap').merge(wrap_entr);

      wrap_entr.append('defs');
      var defs = wrap.select('defs');

      wrap_entr.append('g').attr('class', 'sc-background-wrap');
      var back_wrap = wrap.select('.sc-background-wrap');

      wrap_entr.append('g').attr('class', 'sc-title-wrap');

      wrap_entr.append('g').attr('class', 'sc-axis-wrap sc-axis-x');
      var xAxis_wrap = wrap.select('.sc-axis-wrap.sc-axis-x');
      wrap_entr.append('g').attr('class', 'sc-axis-wrap sc-axis-y');
      var yAxis_wrap = wrap.select('.sc-axis-wrap.sc-axis-y');

      wrap_entr.append('g').attr('class', 'sc-' + modelClass + '-wrap');
      var model_wrap = wrap.select('.sc-' + modelClass + '-wrap');

      wrap_entr.append('g').attr('class', 'sc-controls-wrap');
      wrap_entr.append('g').attr('class', 'sc-legend-wrap');

      wrap_entr.append('g').attr('class', 'sc-guide-wrap');
      var guide_wrap = wrap.select('.sc-guide-wrap');

      wrap.attr('transform', utility.translation(margin.left, margin.top));
      wrap_entr.select('.sc-background-wrap').append('rect')
        .attr('class', 'sc-background')
        .attr('x', -margin.left)
        .attr('y', -margin.top)
        .attr('fill', '#FFF');


      //------------------------------------------------------------
      // Main chart draw

      chart.render = function() {

        // Chart layout variables
        var renderWidth, renderHeight,
            innerMargin,
            innerWidth, innerHeight,
            headerHeight;

        var xpos = 0,
            ypos = 0;

        containerWidth = parseInt(container.style('width'), 10);
        containerHeight = parseInt(container.style('height'), 10);

        renderWidth = width || containerWidth || 960;
        renderHeight = height || containerHeight || 400;

        availableWidth = renderWidth - margin.left - margin.right;
        availableHeight = renderHeight - margin.top - margin.bottom;

        innerMargin = {top: 0, right: 0, bottom: 0, left: 0};
        innerWidth = availableWidth - innerMargin.left - innerMargin.right;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;

        back_wrap.select('.sc-background')
          .attr('width', renderWidth)
          .attr('height', renderHeight);

        xTickMaxWidth = Math.max(availableWidth * 0.2, 75);


        //------------------------------------------------------------
        // Title & Legend & Controls

        header
          .width(availableWidth)
          .height(availableHeight);

        container.call(header);

        // Recalc inner margins based on title, legend and control height
        headerHeight = header.getHeight();
        innerMargin.top += headerHeight;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;

        if (innerHeight < 100) {
          displayNoData(null, strings.displayError);
          return chart;
        }


        //------------------------------------------------------------
        // Main Chart Component(s)

        function getDimension(d) {
          if (d === 'width') {
            return innerWidth;
          } else if (d === 'height') {
            return innerHeight;
          } else {
            return 0;
          }
        }

        model
          .width(getDimension('width'))
          .height(getDimension('height'));
        model_wrap
          .datum(modelData)
          .call(model);


        //------------------------------------------------------------
        // Axes

        var yAxisMargin = {top: 0, right: 0, bottom: 0, left: 0},
            xAxisMargin = {top: 0, right: 0, bottom: 0, left: 0};

        function setInnerMargins() {
          xAxisMargin = xAxis.margin();
          yAxisMargin = yAxis.margin();
          innerMargin.left = Math.max(xAxisMargin.left, yAxisMargin.left);
          innerMargin.right = Math.max(xAxisMargin.right, yAxisMargin.right);
          innerMargin.top = Math.max(xAxisMargin.top, yAxisMargin.top);
          innerMargin.bottom = Math.max(xAxisMargin.bottom, yAxisMargin.bottom);
          setInnerDimensions();
        }

        function setInnerDimensions() {
          innerWidth = availableWidth - innerMargin.left - innerMargin.right;
          innerHeight = availableHeight - headerHeight - innerMargin.top - innerMargin.bottom;
          // Recalc chart dimensions and scales based on new inner dimensions
          model.resetDimensions(getDimension('width'), getDimension('height'));
        }

        function yAxisRender() {
          yAxis
            .ticks(model.offset() === 'wiggle' ? 0 : null)
            .tickSize(padding - innerWidth, 0)
            .margin(innerMargin);
          yAxis_wrap
            .call(yAxis);
          setInnerMargins();
        }

        function xAxisRender() {
          xAxis
            .tickSize(padding - innerHeight, 0)
            .margin(innerMargin);
          xAxis_wrap
            .call(xAxis);
          setInnerMargins();
        }

        // initial Y-Axis call
        yAxisRender();
        // initial X-Axis call
        xAxisRender();

        // recall Y-axis to set final size based on new dimensions
        yAxisRender();
        // recall X-axis to set final size based on new dimensions
        xAxisRender();
        // recall Y-axis to set final size based on new dimensions
        yAxisRender();

        // final call to lines based on new dimensions
        model_wrap
          .transition().duration(duration)
            .call(model);

        //------------------------------------------------------------
        // Guide Line

        // var middleDate = (x.domain()[0].getTime() + (x.domain()[1].getTime() - x.domain()[0].getTime()) / 2);
        var pointSize = Math.pow(3, 2) * Math.PI; // default size set to 3

        guide
          .width(innerWidth)
          .height(innerHeight)
          // .color(function() { return '#000'; })
          .size(pointSize)
          .sizeRange([pointSize, pointSize])
          .xDomain(x.domain()) // don't let scatter recalc domain from data
          .yDomain(y.domain()); // don't let scatter recalc domain from data

        guide_wrap
          .datum([{
            key:'guide',
            values: [
              {x: 0, y: 0},
              {x: 0, y: y.domain()[1]}
            ]
          }])
          .call(guide);

        chart.showTooltip = function(eo, offsetElement, properties) {
          var content = tooltipContent(eo, properties);
          return tooltip.show(eo.e, content, null, null, offsetElement);
        };

        chart.moveGuide = function(svg, container, eo) {
          var xpos = eo.data[0][0];
          var values = [{x: xpos, y: 0}]
                .concat(eo.data.map(function(d, i) { return {x: xpos, y: d[1]}; }))
                .concat([{x: xpos, y: y.domain()[1]}]);
          var guidePos = {
                clientX: eo.origin.left + x(xpos)
              };

          var xData = [xpos, 0];
              xData.e = eo.e;
              xData.seriesIndex = 0;
              xData.seriesKey = 'x';

          guide_wrap
            .datum([{
              key:'guide',
              values: values,
              seriesIndex: 0
            }])
            .call(guide);

          if (!guidetips) {
            guidetips = {};
            eo.data.forEach(function(d, i) {
              d.e = eo.e;
              guidetips[i] = chart.showTooltip(d, that.parentNode, properties);
            });
            guidetips['x'] = chart.showTooltip(xData, that.parentNode, properties);
          }

          // Line
          eo.data.forEach(function(d, i) {
            var content = tooltipContent(d, properties);
            guidePos.clientY = eo.origin.top + y(d[1]);
            d3.select(guidetips[i]).select('.tooltip-inner').html(content);
            tooltip.position(that.parentNode, guidetips[i], guidePos, 'e');
          });

          // Top date
          xData.forEach(function(d, i) {
            var xval = xValueFormat(d, i, xpos, xIsDatetime);
            guidePos.clientY = eo.origin.top;
            d3.select(guidetips['x']).select('.tooltip-inner').html(xval);
            tooltip.position(that.parentNode, guidetips['x'], guidePos, 's');
          });

        };

        //------------------------------------------------------------
        // Final repositioning

        innerMargin.top += headerHeight;

        xpos = innerMargin.left;
        ypos = innerMargin.top + (xAxis.orient() === 'bottom' ? innerHeight : 0);
        xAxis_wrap
          .attr('transform', utility.translation(xpos, ypos));

        xpos = innerMargin.left + (yAxis.orient() === 'left' ? 0 : innerWidth);
        ypos = innerMargin.top;
        yAxis_wrap
          .attr('transform', utility.translation(xpos, ypos));

        model_wrap
          .attr('transform', utility.translation(innerMargin.left, innerMargin.top));
        guide_wrap
          .attr('transform', utility.translation(innerMargin.left, innerMargin.top));

      };

      //============================================================

      chart.render();

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      //TODO: change legendClick to menuClick
      header.legend.dispatch.on('legendClick', function(series, i) {
        series.disabled = !series.disabled;

        // if there are no enabled data series, enable them all
        if (!data.filter(function(d) { return !d.disabled; }).length) {
          data.forEach(function(d) {
            d.disabled = false;
          });
        }
        state.disabled = data.map(function(d) { return !!d.disabled; });

        // on legend click, clear active cell state
        series.active = 'inactive';

        chart.update();
        dispatch.call('stateChange', this, state);
      });

      header.controls.dispatch.on('legendClick', function(control, i) {
        //if the option is currently enabled (i.e., selected)
        if (!control.disabled) {
          return;
        }

        //set the controls all to false
        controlsData.forEach(function(control) {
          control.disabled = true;
        });
        //activate the the selected control option
        control.disabled = false;

        switch (control.key) {
          case 'Stacked':
            model.style('stack');
            break;
          case 'Stream':
            model.style('stream');
            break;
          case 'Expanded':
            model.style('expand');
            break;
        }
        state.style = model.style();

        chart.render();
        dispatch.call('stateChange', this, state);
      });

      dispatch.on('tooltipShow', function(eo) {
        if (tooltips) {
          tt = true;
          guide_wrap.classed('hover', true);
        }
      });

      dispatch.on('tooltipMove', function(eo) {
        if (tt) {
          chart.moveGuide(that.parentNode, container, eo);
        }
      });

      dispatch.on('tooltipHide', function() {
        if (tooltips) {
          tt = false;
          tooltip.cleanup();
          guidetips = null;
          guide_wrap.classed('hover', false);
        }
      });

      model.dispatch.on('elementClick.toggle', function(e) {
        if (data.filter(function(d) { return !d.disabled; }).length === 1) {
          data = data.map(function(d) {
            d.disabled = false;
            return d;
          });
        } else {
          data = data.map(function(d,i) {
            d.disabled = (i !== e.seriesIndex);
            return d;
          });
        }

        state.disabled = data.map(function(d) { return !!d.disabled; });
        chart.update();
        dispatch.call('stateChange', this, state);
        dispatch.call('tooltipHide', this);
      });

      // Update chart from a state object passed to event handler
      dispatch.on('changeState', function(eo) {
        if (typeof eo.disabled !== 'undefined') {
          data.forEach(function(series, i) {
            series.disabled = eo.disabled[i];
          });
          state.disabled = eo.disabled;
        }

        if (typeof eo.style !== 'undefined') {
          model.style(eo.style);
          state.style = eo.style;
        }

        chart.update();
      });

      dispatch.on('chartClick', function() {
        if (header.controls.enabled()) {
          header.controls.dispatch.call('closeMenu', this);
        }
        if (header.legend.enabled()) {
          header.legend.dispatch.call('closeMenu', this);
        }
      });

      container.on('click', function() {
        d3.event.stopPropagation();
        dispatch.call('chartClick', this);
      });

    });

    return chart;
  }

  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  model.dispatch.on('elementMouseover.tooltip', function(eo) {
    dispatch.call('tooltipShow', this, eo);
  });

  model.dispatch.on('elementMousemove.tooltip', function(e) {
    dispatch.call('tooltipMove', this, e);
  });

  model.dispatch.on('elementMouseout.tooltip', function(eo) {
    // need eo for removing hover class on element
    dispatch.call('tooltipHide', this, eo);
  });

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.dispatch = dispatch;
  chart.area = model;
  chart.legend = header.legend;
  chart.controls = header.controls;
  chart.xAxis = xAxis;
  chart.xAxisLabel = xAxis.axisLabel;
  chart.yAxis = yAxis;
  chart.yAxisLabel = yAxis.axisLabel;
  chart.options = utility.optionsFunc.bind(chart);

  utility.rebind(chart, model,
    'id', 'x', 'y', 'xScale', 'yScale', 'xDomain', 'yDomain', 'forceX', 'forceY', 'clipEdge',
    'color', 'fill', 'classes', 'gradient', 'locality'
  );
  utility.rebind(chart, model, 'offset', 'order', 'style');
  utility.rebind(chart, header, 'showTitle', 'showControls', 'showLegend');
  utility.rebind(chart, xAxis, 'rotateTicks', 'reduceXTicks', 'staggerTicks', 'wrapTicks');

  chart.colorData = function(_) {
    var type = arguments[0],
        params = arguments[1] || {};
    var color = function(d) {
          return utility.defaultColor()(d, d.seriesIndex);
        };
    var classes = function(d) {
          return 'sc-series sc-series-' + d.seriesIndex;
        };

    switch (type) {
      case 'graduated':
        color = function(d) {
          return d3.interpolateHsl(d3.rgb(params.c1), d3.rgb(params.c2))(d.seriesIndex / params.l);
        };
        break;
      case 'class':
        color = function() {
          return 'inherit';
        };
        classes = function(d) {
          var i = d.seriesIndex;
          var iClass = (i * (params.step || 1)) % 14;
          iClass = (iClass > 9 ? '' : '0') + iClass;
          return 'sc-series sc-series-' + i + ' sc-fill' + iClass + ' sc-stroke' + iClass;
        };
        break;
      case 'data':
        color = function(d) {
          return utility.defaultColor()(d, d.seriesIndex);
        };
        classes = function(d) {
          var i = d.seriesIndex;
          return 'sc-series sc-series-' + i + (d.classes ? ' ' + d.classes : '');
        };
        break;
    }

    var fill = !params.gradient ? color : function(d, i) {
      var p = {
        orientation: params.orientation || 'horizontal',
        position: params.position || 'base'
      };
      return model.gradientFill(d, d.seriesIndex, p);
    };

    model.color(color);
    model.fill(fill);
    model.classes(classes);

    // don't enable this since controls get a custom function
    // controls.color(color);
    // controls.classes(classes);
    header.legend.color(color);
    header.legend.classes(classes);

    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) { return margin; }
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        margin[prop] = _[prop];
      }
    }
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) { return width; }
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) { return height; }
    height = _;
    return chart;
  };

  chart.tooltips = function(_) {
    if (!arguments.length) { return tooltips; }
    tooltips = _;
    return chart;
  };

  chart.tooltipContent = function(_) {
    if (!arguments.length) { return tooltipContent; }
    tooltipContent = _;
    return chart;
  };

  chart.state = function(_) {
    if (!arguments.length) { return state; }
    state = _;
    dispatch.call('stateChange', this, state);
    return chart;
  };

  chart.strings = function(_) {
    if (!arguments.length) { return strings; }
    strings = language(_);
    header.strings(strings);
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    model.direction(_);
    xAxis.direction(_);
    yAxis.direction(_);
    header.direction(_);
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) { return duration; }
    duration = _;
    model.duration(_);
    return chart;
  };

  chart.delay = function(_) {
    if (!arguments.length) { return delay; }
    delay = _;
    model.delay(_);
    return chart;
  };

  chart.xValueFormat = function(_) {
    if (!arguments.length) {
      return xValueFormat;
    }
    xValueFormat = _;
    return chart;
  };

  chart.yValueFormat = function(_) {
    if (!arguments.length) {
      return yValueFormat;
    }
    yValueFormat = _;
    return chart;
  };

  chart.pointRadius = function(_) {
    if (!arguments.length) { return pointRadius; }
    pointRadius = _;
    return chart;
  };

  //============================================================

  return chart;
}

function bubbleChart() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 10, right: 10, bottom: 10, left: 10},
      width = null,
      height = null,
      direction = 'ltr',
      delay = 0,
      duration = 0,
      tooltips = true,
      state = {},
      strings = language();

  var dispatch = d3.dispatch(
        'chartClick', 'elementClick', 'tooltipShow', 'tooltipHide', 'tooltipMove',
        'stateChange', 'changeState'
      );

  var getX = function(d) { return d.x; },
      getY = function(d) { return d.y; },
      forceY = [0]; // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do chart.forceY([]) to remove

  var groupBy = function(d) { return d.y; },
      filterBy = function(d) { return d.y; };

  var xValueFormat = function(d, i, label, isDate, dateFormat) {
        // If ordinal, label is provided so use it.
        // If date or numeric use d.
        var value = label || d;
        if (isDate) {
          dateFormat = !dateFormat || dateFormat.indexOf('%') !== 0 ? 'MM' : dateFormat;
          return utility.dateFormat(value, dateFormat, chart.locality());
        } else {
          return value;
        }
      };

  var yValueFormat = function(d, i, label, isCurrency, precision) {
        precision = isNaN(precision) ? 2 : precision;
        return utility.numberFormatSI(label, precision, isCurrency, chart.locality());
      };

  var tooltipContent = function(eo, properties) {
        var key = eo.series.key;
        var x = eo.point.x;
        var y = eo.point.y;
        return '<h3>' + key + '</h3>' +
               '<p>' + y + ' on ' + x + '</p>';
      };

  var seriesClick = function(data, eo, chart, labels) {
        return;
      };

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  // Chart components
  var model = scatter();
  var header = headers();
  var xAxis = axis();
  var yAxis = axis();

  var tt = null;

  var showTooltip = function(eo, offsetElement, properties) {
        var content = tooltipContent(eo, properties);
        var gravity = eo.value < 0 ?
          'n' :
          's';
        return tooltip.show(eo.e, content, gravity, null, offsetElement);
      };

  model
    .padData(true)
    .padDataOuter(-1)
    .size(function(d) { return d.y; })
    .sizeRange([256, 1024])
    .singlePoint(true);
  header
    .showTitle(true)
    .showControls(false)
    .showLegend(true)
    .alignLegend('center');


  //============================================================

  function chart(selection) {

    selection.each(function(chartData) {

      var that = this,
          container = d3.select(this),
          modelClass = 'bubble';

      var properties = chartData ? chartData.properties || {} : {},
          data = chartData ? chartData.data || [] : [];

      var containerWidth = parseInt(container.style('width'), 10),
          containerHeight = parseInt(container.style('height'), 10);

      var availableWidth = width,
          availableHeight = height;

      var xIsDatetime = properties.xDataType === 'datetime' || false,
          yIsCurrency = properties.yDataType === 'currency' || false;

      var modelData,
          nestedData,
          xDomain,
          yDomain,
          yValues,
          maxBubbleSize;

      var xAxisFormat = function(d, i, selection, noEllipsis) {
            return xValueFormat(d, i, d, xIsDatetime, '%B');
          };

      var yAxisFormat = function(d, i, selection, noEllipsis) {
            var label = yValues && Array.isArray(yValues) ?
                  yValues[i].key || d :
                  d;
            var width = Math.max(availableWidth * 0.2, 75);

            return isNaN(label) ?
              utility.stringEllipsify(label, container, width) :
              yValueFormat(d, i, label, yIsCurrency);
          };

      var controlsData = [];

      chart.update = function() {
        container.transition().duration(duration).call(chart);
      };

      chart.container = this;


      //------------------------------------------------------------
      // Private method for displaying no data message.

      function displayNoData(data, msg) {
        var hasData = data && data.length;
        var x = (containerWidth - margin.left - margin.right) / 2 + margin.left;
        var y = (containerHeight - margin.top - margin.bottom) / 2 + margin.top;
        return utility.displayNoData(hasData, container, (msg || strings.noData), x, y);
      }

      // Check to see if there's nothing to show.
      if (displayNoData(data)) {
        return chart;
      }


      //------------------------------------------------------------
      // Process data

      function getTimeDomain(data) {
        var timeExtent =
              d3.extent(
                d3.merge(
                  data.map(function(d) {
                    return d.values.map(function(d, i) {
                      return d3.timeParse('%Y-%m-%d')(getX(d));
                    });
                  })
                )
              );
        var timeRange = [
          d3.timeMonth.floor(timeExtent[0]),
          d3.timeDay.offset(d3.timeMonth.ceil(timeExtent[1]), -1)
        ];
        return timeRange;
      }

      // Calculate the x-axis ticks
      function getTimeTicks(timeDomain) {
        function daysInMonth(date) {
          return 32 - new Date(date.getFullYear(), date.getMonth(), 32).getDate();
        }
        var timeRange = d3.timeMonth.range(timeDomain[0], timeDomain[1]);
        var timeTicks =
              timeRange.map(function(d) {
                return d3.timeDay.offset(d3.timeMonth.floor(d), daysInMonth(d) / 2 - 1);
              });
        return timeTicks;
      }

      // Group data by groupBy function to prep data for calculating y-axis groups
      // and y scale value for points
      function getGroupTicks(data) {

        var groupedData = d3.nest()
              .key(groupBy)
              .entries(data);

        // Calculate y scale parameters
        var gHeight = 1000 / groupedData.length,
            gOffset = maxBubbleSize,
            gDomain = [0, 1],
            gRange = [0, 1],
            gScale = d3.scaleLinear().domain(gDomain).range(gRange),
            yValues = [],
            total = 0;

        // Calculate total for each data group and
        // point y value
        groupedData
          .map(function(s, i) {
            s.total = 0;

            s.values = s.values.sort(function(a, b) {
                return b.y < a.y ? -1 : b.y > a.y ? 1 : 0;
              })
              .map(function(p) {
                s.total += p.y;
                return p;
              });

            s.group = i;
            return s;
          })
          .sort(function(a, b) {
            return a.total < b.total ? -1 : a.total > b.total ? 1 : 0;
          })
          .map(function(s, i) {
            total += s.total;

            gDomain = d3.extent(s.values.map(function(p) { return p.y; }));
            gRange = [gHeight * i + gOffset, gHeight * (i + 1) - gOffset];
            gScale.domain(gDomain).range(gRange);

            s.values = s.values
              .map(function(p) {
                p.group = s.group;
                p.opportunity = p.y;
                p.y = gScale(p.opportunity);
                return p;
              });

            yValues.push({
              key: s.key,
              y: d3.min(s.values.map(function(p) { return p.y; }))
            });

            return s;
          });

        return yValues;
      }

      // set state.disabled
      state.disabled = data.map(function(d) { return !!d.disabled; });

      // Now that group calculations are done,
      // group the data by filter so that legend filters
      nestedData = d3.nest()
        .key(filterBy)
        .entries(data);

      //add series index to each data point for reference
      modelData = nestedData
        .sort(function(a, b) {
          //sort legend by key
          return parseInt(a.key, 10) < parseInt(b.key, 10) ? -1 : parseInt(a.key, 10) > parseInt(b.key, 10) ? 1 : 0;
        })
        .map(function(d, i) {
          d.seriesIndex = i;
          d.classes = d.values[0].classes;
          d.color = d.values[0].color;
          return d;
        });

      maxBubbleSize = Math.sqrt(model.sizeRange()[1] / Math.PI);


      //------------------------------------------------------------
      // Setup Scales and Axes

      header
        .chart(chart)
        .title(properties.title)
        .controlsData(controlsData)
        .legendData(modelData);
      header.legend
        .key(function(d) { return d.key + '%'; });

      xDomain = getTimeDomain(modelData);

      yValues = getGroupTicks(data);

      yDomain = d3.extent(
            d3.merge(
              modelData.map(function(d) {
                return d.values.map(function(d, i) {
                  return getY(d, i);
                });
              })
            ).concat(forceY)
          );


      //------------------------------------------------------------
      // Setup Scales and Axes

      xAxis
        .orient('bottom')
        .scale(model.xScale())
        .valueFormat(xAxisFormat)
        .ticks(d3.timeMonths, 1)
        .tickValues(getTimeTicks(xDomain))
        .tickSize(0)
        .tickPadding(4)
        .highlightZero(false)
        .showMaxMin(false);

      yAxis
        .orient('left')
        .scale(model.yScale())
        .valueFormat(yAxisFormat)
        .ticks(yValues.length)
        .tickValues(yValues.map(function(d, i) {
          return yValues[i].y;
        }))
        .tickPadding(7)
        .highlightZero(false)
        .showMaxMin(false);


      //------------------------------------------------------------
      // Main chart wrappers

      var wrap_bind = container.selectAll('g.sc-chart-wrap').data([modelData]);
      var wrap_entr = wrap_bind.enter().append('g')
            .attr('class', 'sc-chart-wrap sc-chart-' + modelClass);
      var wrap = container.select('.sc-chart-wrap').merge(wrap_entr);

      wrap_entr.append('defs');

      wrap_entr.append('g').attr('class', 'sc-background-wrap');
      var back_wrap = wrap.select('.sc-background-wrap');

      wrap_entr.append('g').attr('class', 'sc-title-wrap');

      wrap_entr.append('g').attr('class', 'sc-axis-wrap sc-axis-x');
      var xAxis_wrap = wrap.select('.sc-axis-wrap.sc-axis-x');
      wrap_entr.append('g').attr('class', 'sc-axis-wrap sc-axis-y');
      var yAxis_wrap = wrap.select('.sc-axis-wrap.sc-axis-y');

      wrap_entr.append('g').attr('class', 'sc-' + modelClass + '-wrap');
      var model_wrap = wrap.select('.sc-' + modelClass + '-wrap');

      wrap_entr.append('g').attr('class', 'sc-controls-wrap');
      wrap_entr.append('g').attr('class', 'sc-legend-wrap');

      wrap.attr('transform', utility.translation(margin.left, margin.top));
      wrap_entr.select('.sc-background-wrap').append('rect')
        .attr('class', 'sc-background')
        .attr('x', -margin.left)
        .attr('y', -margin.top)
        .attr('fill', '#FFF');


      //------------------------------------------------------------
      // Main chart draw

      chart.render = function() {

        // Chart layout variables
        var renderWidth, renderHeight,
            innerMargin,
            innerWidth, innerHeight,
            headerHeight;

        var xpos = 0,
            ypos = 0;

        containerWidth = parseInt(container.style('width'), 10);
        containerHeight = parseInt(container.style('height'), 10);

        renderWidth = width || containerWidth || 960;
        renderHeight = height || containerHeight || 400;

        availableWidth = renderWidth - margin.left - margin.right;
        availableHeight = renderHeight - margin.top - margin.bottom;

        innerMargin = {top: 0, right: 0, bottom: 0, left: 0};
        innerWidth = availableWidth - innerMargin.left - innerMargin.right;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;

        back_wrap.select('.sc-background')
          .attr('width', renderWidth)
          .attr('height', renderHeight);


        //------------------------------------------------------------
        // Title & Legend & Controls

        header
          .width(availableWidth)
          .height(availableHeight);

        container.call(header);

        // Recalc inner margins based on title, legend and control height
        headerHeight = header.getHeight();
        innerMargin.top += headerHeight;
        innerMargin.top += maxBubbleSize;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;

        if (innerHeight < 100) {
          displayNoData(null, strings.displayError);
          return chart;
        }


        //------------------------------------------------------------
        // Main Chart Component(s)

        model
          .width(innerWidth)
          .height(innerHeight)
          .id(chart.id())
          .xDomain(xDomain)
          .yDomain(yDomain);

        model_wrap
          .datum(modelData.filter(function(d) {
            return !d.disabled;
          }))
          .transition().duration(duration)
            .call(model);


        //------------------------------------------------------------
        // Axes

        var yAxisMargin = {top: 0, right: 0, bottom: 0, left: 0},
            xAxisMargin = {top: 0, right: 0, bottom: 0, left: 0};

        function setInnerMargins() {
          innerMargin.left = Math.max(xAxisMargin.left, yAxisMargin.left);
          innerMargin.right = Math.max(xAxisMargin.right, yAxisMargin.right);
          innerMargin.top = Math.max(xAxisMargin.top, yAxisMargin.top) + headerHeight;
          innerMargin.bottom = Math.max(xAxisMargin.bottom, yAxisMargin.bottom);
        }

        function setInnerDimensions() {
          innerWidth = availableWidth - innerMargin.left - innerMargin.right;
          innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;
          // Recalc chart dimensions and scales based on new inner dimensions
          model.resetDimensions(innerWidth, innerHeight);
        }

        // Y-Axis
        yAxis
          .margin(innerMargin);
        yAxis_wrap
          .call(yAxis);
        // reset inner dimensions
        yAxisMargin = yAxis.margin();
        setInnerMargins();
        setInnerDimensions();

        // X-Axis
        xAxis
          .tickSize(0)
          .margin(innerMargin);
        xAxis_wrap
          .call(xAxis);

        // reset inner dimensions
        xAxisMargin = xAxis.margin();
        setInnerMargins();
        setInnerDimensions();

        // recall y-axis, x-axis and lines to set final size based on new dimensions
        yAxis
          .tickSize(-innerWidth, 0)
          .margin(innerMargin);
        yAxis_wrap
          .call(yAxis);
        yAxis_wrap.select('path.domain')
          .attr('d', 'M0,0V0.5H0V' + innerHeight);

        // final call to lines based on new dimensions
        model_wrap
          .transition().duration(chart.delay())
            .call(model);


        //------------------------------------------------------------
        // Final repositioning

        xpos = innerMargin.left;
        ypos = innerMargin.top + (xAxis.orient() === 'bottom' ? innerHeight : 0);
        xAxis_wrap
          .attr('transform', utility.translation(xpos, ypos));

        xpos = innerMargin.left + (yAxis.orient() === 'left' ? 0 : innerWidth);
        ypos = innerMargin.top;
        yAxis_wrap
          .attr('transform', utility.translation(xpos, ypos));

        model_wrap
          .attr('transform', utility.translation(innerMargin.left, innerMargin.top));

      };

      //============================================================

      chart.render();

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      //TODO: change legendClick to menuClick
      header.legend.dispatch.on('legendClick', function(series, i) {
        series.disabled = !series.disabled;

        if (!modelData.filter(function(d) { return !d.disabled; }).length) {
          modelData.forEach(function(d) {
            d.disabled = false;
            container.selectAll('.sc-series').classed('disabled', false);
          });
        }

        state.disabled = modelData.map(function(d) { return !!d.disabled; });
        dispatch.call('stateChange', this, state);

        chart.update();
      });

      dispatch.on('tooltipShow', function(eo) {
        if (tooltips) {
          tt = showTooltip(eo, that.parentNode, properties);
        }
      });

      dispatch.on('tooltipMove', function(e) {
        if (tt) {
          tooltip.position(that.parentNode, tt, e, 's');
        }
      });

      dispatch.on('tooltipHide', function() {
        if (tooltips) {
          tooltip.cleanup();
        }
      });

      // Update chart from a state object passed to event handler
      dispatch.on('changeState', function(eo) {
        if (typeof eo.disabled !== 'undefined') {
          data.forEach(function(series, i) {
            series.disabled = eo.disabled[i];
          });
          state.disabled = eo.disabled;
        }

        chart.update();
      });

      dispatch.on('chartClick', function() {
        dispatch.call('tooltipHide', this);
        if (header.controls.enabled()) {
          header.controls.dispatch.call('closeMenu', this);
        }
        if (header.legend.enabled()) {
          header.legend.dispatch.call('closeMenu', this);
        }
      });

      model.dispatch.on('elementClick', function(eo) {
        dispatch.call('chartClick', this);
        seriesClick(data, eo, chart);
      });

      container.on('click', function() {
        d3.event.stopPropagation();
        dispatch.call('chartClick', this);
      });

    });

    return chart;
  }

  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  model.dispatch.on('elementMouseover.tooltip', function(eo) {
    dispatch.call('tooltipShow', this, eo);
  });

  model.dispatch.on('elementMousemove.tooltip', function(e) {
    dispatch.call('tooltipMove', this, e);
  });

  model.dispatch.on('elementMouseout.tooltip', function() {
    dispatch.call('tooltipHide', this);
  });

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.dispatch = dispatch;
  chart.scatter = model;
  chart.legend = header.legend;
  chart.controls = header.controls;
  chart.xAxis = xAxis;
  chart.xAxisLabel = xAxis.axisLabel;
  chart.yAxis = yAxis;
  chart.yAxisLabel = yAxis.axisLabel;
  chart.options = utility.optionsFunc.bind(chart);

  utility.rebind(chart, model,
    'id', 'x', 'y', 'xScale', 'yScale', 'xDomain', 'yDomain', 'forceX', 'forceY', 'clipEdge',
    'color', 'fill', 'classes', 'gradient', 'locality'
  );
  utility.rebind(chart, model, 'size', 'zScale', 'sizeDomain', 'forceSize', 'interactive', 'clipVoronoi', 'clipRadius');
  utility.rebind(chart, header, 'showTitle', 'showControls', 'showLegend');
  utility.rebind(chart, xAxis, 'rotateTicks', 'reduceXTicks', 'staggerTicks', 'wrapTicks');

  chart.colorData = function(_) {
    var type = arguments[0],
        params = arguments[1] || {};
    var color = function(d) {
          return utility.defaultColor()(d, d.seriesIndex);
        };
    var classes = function(d) {
          return 'sc-series sc-series-' + d.seriesIndex;
        };

    switch (type) {
      case 'graduated':
        color = function(d) {
          return d3.interpolateHsl(d3.rgb(params.c1), d3.rgb(params.c2))(d.seriesIndex / params.l);
        };
        break;
      case 'class':
        color = function() {
          return 'inherit';
        };
        classes = function(d) {
          var i = d.seriesIndex;
          var iClass = (i * (params.step || 1)) % 14;
          iClass = (iClass > 9 ? '' : '0') + iClass;
          return 'sc-series sc-series-' + i + ' sc-fill' + iClass + ' sc-stroke' + iClass;
        };
        break;
      case 'data':
        color = function(d) {
          return d.classes ? 'inherit' : d.color || utility.defaultColor()(d, d.seriesIndex);
        };
        classes = function(d) {
          var i = d.seriesIndex;
          return 'sc-series sc-series-' + i + (d.classes ? ' ' + d.classes : '');
        };
        break;
    }

    var fill = !params.gradient ? color : function(d, i) {
      return model.gradientFill(d, d.seriesIndex);
    };

    model.color(color);
    model.fill(fill);
    model.classes(classes);

    header.legend.color(color);
    header.legend.classes(classes);

    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) { return margin; }
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        margin[prop] = _[prop];
      }
    }
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) { return width; }
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) { return height; }
    height = _;
    return chart;
  };

  chart.tooltips = function(_) {
    if (!arguments.length) { return tooltips; }
    tooltips = _;
    return chart;
  };

  chart.tooltipContent = function(_) {
    if (!arguments.length) { return tooltipContent; }
    tooltipContent = _;
    return chart;
  };

  chart.state = function(_) {
    if (!arguments.length) { return state; }
    state = _;
    dispatch.call('stateChange', this, state);
    return chart;
  };

  chart.strings = function(_) {
    if (!arguments.length) { return strings; }
    strings = language(_);
    header.strings(strings);
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    model.direction(_);
    xAxis.direction(_);
    yAxis.direction(_);
    header.direction(_);
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) { return duration; }
    duration = _;
    model.duration(_);
    return chart;
  };

  chart.delay = function(_) {
    if (!arguments.length) { return delay; }
    delay = _;
    model.delay(_);
    return chart;
  };

  chart.xValueFormat = function(_) {
    if (!arguments.length) {
      return xValueFormat;
    }
    xValueFormat = _;
    return chart;
  };

  chart.yValueFormat = function(_) {
    if (!arguments.length) {
      return yValueFormat;
    }
    yValueFormat = _;
    return chart;
  };

  chart.seriesClick = function(_) {
    if (!arguments.length) { return seriesClick; }
    seriesClick = _;
    return chart;
  };

  chart.groupBy = function(_) {
    if (!arguments.length) {
      return groupBy;
    }
    groupBy = _;
    return chart;
  };

  chart.filterBy = function(_) {
    if (!arguments.length) {
      return filterBy;
    }
    filterBy = _;
    return chart;
  };

  //============================================================

  return chart;
}

function funnelChart() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 10, right: 10, bottom: 10, left: 10},
      width = null,
      height = null,
      direction = 'ltr',
      delay = 0,
      duration = 0,
      tooltips = true,
      state = {},
      exclusiveActive = true,
      strings = language();

  var dispatch = d3.dispatch('chartClick', 'elementClick', 'tooltipShow', 'tooltipHide', 'tooltipMove', 'stateChange', 'changeState');

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  // Chart components
  var model = funnel();
  var header = headers();

  var controlsData = [];

  var tt = null;

  var tooltipContent = function(eo, properties) {
        // var name = properties.seriesName || strings.tooltip.key;
        var y = model.getValue()(eo);
        var x = properties.total ? (y * 100 / properties.total).toFixed(1) : 100;
        var yIsCurrency = properties.yDataType === 'currency';
        var point = {
          key: model.fmtKey()(eo),
          label: yIsCurrency ? strings.tooltip.amount : strings.tooltip.count,
          value: utility.numberFormat(y, 2, yIsCurrency, chart.locality()),
          percent: utility.numberFormat(x, 2, false, chart.locality())
        };
        return tooltip.single(point, strings);
      };

  var showTooltip = function(eo, offsetElement, properties) {
        var content = tooltipContent(eo, properties);
        return tooltip.show(eo.e, content, null, null, offsetElement);
      };

  var seriesClick = function(data, e, chart) { return; };

  header
    .showTitle(true)
    .showControls(false)
    .showLegend(true)
    .alignLegend('center');


  //============================================================

  function chart(selection) {
    selection.each(function(chartData) {

      var that = this,
          container = d3.select(this),
          modelClass = 'funnel';

      var properties = chartData ? chartData.properties || {} : {},
          data = chartData ? chartData.data || null : null;

      var containerWidth = parseInt(container.style('width'), 10),
          containerHeight = parseInt(container.style('height'), 10);

      var xIsDatetime = properties.xDataType === 'datetime' || false,
          yIsCurrency = properties.yDataType === 'currency' || false;

      chart.update = function() {
        container.transition().duration(duration).call(chart);
      };

      chart.container = this;


      //------------------------------------------------------------
      // Private method for displaying no data message.

      function displayNoData(data, msg) {
        var hasData = data && data.length;
        var x = (containerWidth - margin.left - margin.right) / 2 + margin.left;
        var y = (containerHeight - margin.top - margin.bottom) / 2 + margin.top;
        return utility.displayNoData(hasData, container, (msg || strings.noData), x, y);
      }

      // Check to see if there's nothing to show.
      if (displayNoData(data)) {
        return chart;
      }


      //------------------------------------------------------------
      // Process data

      chart.setActiveState = function(series, state) {
        series.active = state;
      };

      chart.clearActive = function(reset) {
        data.forEach(function(s) {
          chart.setActiveState(s, reset || '');
        });
        delete state.active;
      };

      // accepts either an event object with actual series data or seriesIndex
      chart.seriesActivate = function(eo) {
        var series = eo.series || data[eo.seriesIndex];
        var activeState;
        if (!series) {
          return;
        }
        if (exclusiveActive) {
          // store toggle active state
          activeState = (
              typeof series.active === 'undefined' ||
              series.active === 'inactive' ||
              series.active === ''
            ) ? 'active' : '';
          // inactivate all series
          chart.clearActive(activeState === 'active' ? 'inactive' : '');
          // then activate the selected series
          chart.setActiveState(series, activeState);
          // set the state to a truthy map
          state.active = data.map(function(s) {
            return s.active === 'active';
          });
        } else {
          chart.dataSeriesActivate({series: series});
        }
      };

      // accepts either an event object with actual series data or seriesIndex
      chart.dataSeriesActivate = function(eo) {
        var series = eo.series;
        series.active = (!series.active || series.active === 'inactive') ? 'active' : 'inactive';
        // if you have activated a data series, inactivate the other non-active series
        if (series.active === 'active') {
          data
            .filter(function(d) {
              return d.active !== 'active';
            })
            .forEach(function(d) {
              d.active = 'inactive';
              return d;
            });
        }
        // if there are no active data series, inactivate them all
        if (!data.filter(function(d) { return d.active === 'active'; }).length) {
          chart.clearActive();
        }
      };

      // add series index to each data point for reference
      data.forEach(function(s, i) {
        s.seriesIndex = i;

        if (!s.values) {
          if (!s.value) {
            s.values = [];
          } else if (!isNaN(s.value)) {
            s.values = [{x: 0, y: parseInt(s.value, 10)}];
          }
        }

        s.values.forEach(function(p, j) {
          p.index = j;
          p.series = s;
          if (typeof p.value == 'undefined') {
            p.value = p.y;
          }
        });

        s.key = s.key || strings.noLabel;
        s.value = s.value || d3.sum(s.values, function(p) { return p.value; });
        s.count = s.count || s.values.length;
        s.disabled = s.disabled || s.value === 0;
      });

      // only sum enabled series
      var modelData = data.filter(function(d) { return !d.disabled; });

      if (!modelData.length) {
        modelData = [{values: []}]; // safety array
      }

      properties.count = d3.sum(modelData, function(d) { return d.count; });

      properties.total = d3.sum(modelData, function(d) { return d.value; });

      //set state.disabled
      state.disabled = data.map(function(d) { return !!d.disabled; });

      //------------------------------------------------------------
      // Display No Data message if there's nothing to show.

      if (!properties.total) {
        displayNoData();
        return chart;
      }

      header
        .chart(chart)
        .title(properties.title)
        .controlsData(controlsData)
        .legendData(data);

      //------------------------------------------------------------
      // Main chart wrappers

      var wrap_bind = container.selectAll('g.sc-chart-wrap').data([modelData]);
      var wrap_entr = wrap_bind.enter().append('g')
            .attr('class', 'sc-chart-wrap sc-chart-' + modelClass);
      var wrap = container.select('.sc-chart-wrap').merge(wrap_entr);

      wrap_entr.append('defs');
      var defs = wrap.select('defs');

      wrap_entr.append('g').attr('class', 'sc-background-wrap');
      var back_wrap = wrap.select('.sc-background-wrap');

      wrap_entr.append('g').attr('class', 'sc-title-wrap');

      wrap_entr.append('g').attr('class', 'sc-' + modelClass + '-wrap');
      var model_wrap = wrap.select('.sc-' + modelClass + '-wrap');

      wrap_entr.append('g').attr('class', 'sc-controls-wrap');
      wrap_entr.append('g').attr('class', 'sc-legend-wrap');

      wrap.attr('transform', utility.translation(margin.left, margin.top));
      wrap_entr.select('.sc-background-wrap').append('rect')
        .attr('class', 'sc-background')
        .attr('x', -margin.left)
        .attr('y', -margin.top)
        .attr('fill', '#FFF');


      //------------------------------------------------------------
      // Main chart draw

      chart.render = function() {

        // Chart layout variables
        var renderWidth, renderHeight,
            availableWidth, availableHeight,
            innerMargin,
            innerWidth, innerHeight,
            headerHeight;

        containerWidth = parseInt(container.style('width'), 10);
        containerHeight = parseInt(container.style('height'), 10);

        renderWidth = width || containerWidth || 960;
        renderHeight = height || containerHeight || 400;

        availableWidth = renderWidth - margin.left - margin.right;
        availableHeight = renderHeight - margin.top - margin.bottom;

        innerMargin = {top: 0, right: 0, bottom: 0, left: 0};
        innerWidth = availableWidth - innerMargin.left - innerMargin.right;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;

        back_wrap.select('.sc-background')
          .attr('width', renderWidth)
          .attr('height', renderHeight);


        //------------------------------------------------------------
        // Title & Legend & Controls

        header
          .width(availableWidth)
          .height(availableHeight);

        container.call(header);

        // Recalc inner margins based on title, legend and control height
        headerHeight = header.getHeight();
        innerMargin.top += headerHeight;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;

        if (innerHeight < 100) {
          displayNoData(null, strings.displayError);
          return chart;
        }


        //------------------------------------------------------------
        // Main Chart Component(s)

        model
          .width(innerWidth)
          .height(innerHeight);

        model_wrap
          .datum(modelData)
          .attr('transform', utility.translation(innerMargin.left, innerMargin.top))
          .transition().duration(duration)
            .call(model);

      };

      //============================================================

      chart.render();

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      header.legend.dispatch.on('legendClick', function(series, i) {
        series.disabled = !series.disabled;
        series.active = false;

        // if there are no enabled data series, enable them all
        if (!data.filter(function(d) { return !d.disabled; }).length) {
          data.forEach(function(d) {
            d.disabled = false;
          });
        }

        // if there are no active data series, activate them all
        if (!data.filter(function(d) { return d.active === 'active'; }).length) {
          data.forEach(function(d) {
            d.active = '';
          });
        }

        state.disabled = data.map(function(d) { return !!d.disabled; });
        dispatch.call('stateChange', this, state);

        chart.update();
      });

      dispatch.on('tooltipShow', function(eo) {
        if (tooltips) {
          tt = showTooltip(eo, that.parentNode, properties);
        }
      });

      dispatch.on('tooltipMove', function(e) {
        if (tt) {
          tooltip.position(that.parentNode, tt, e);
        }
      });

      dispatch.on('tooltipHide', function() {
        if (tooltips) {
          tooltip.cleanup();
        }
      });

      // Update chart from a state object passed to event handler
      dispatch.on('changeState', function(eo) {
        if (typeof eo.disabled !== 'undefined') {
          modelData.forEach(function(series, i) {
            series.disabled = eo.disabled[i];
          });
          state.disabled = eo.disabled;
        }

        chart.update();
      });

      dispatch.on('chartClick', function() {
        //dispatch.call('tooltipHide', this);
        if (header.controls.enabled()) {
          header.controls.dispatch.call('closeMenu', this);
        }
        if (header.legend.enabled()) {
          header.legend.dispatch.call('closeMenu', this);
        }
      });

      model.dispatch.on('elementClick', function(eo) {
        dispatch.call('chartClick', this);
        seriesClick(data, eo, chart);
      });

    });

    return chart;
  }


  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  model.dispatch.on('elementMouseover.tooltip', function(eo) {
    dispatch.call('tooltipShow', this, eo);
  });

  model.dispatch.on('elementMousemove.tooltip', function(e) {
    dispatch.call('tooltipMove', this, e);
  });

  model.dispatch.on('elementMouseout.tooltip', function() {
    dispatch.call('tooltipHide', this);
  });

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.dispatch = dispatch;
  chart.funnel = model;
  chart.legend = header.legend;
  chart.controls = header.controls;
  chart.options = utility.optionsFunc.bind(chart);

  utility.rebind(chart, model, 'id', 'color', 'fill', 'classes', 'gradient', 'locality', 'textureFill');
  utility.rebind(chart, model, 'getKey', 'getValue', 'getCount', 'fmtKey', 'fmtValue', 'fmtCount');
  utility.rebind(chart, model, 'yScale', 'yDomain', 'forceY', 'wrapLabels', 'minLabelWidth');
  utility.rebind(chart, header, 'showTitle', 'showControls', 'showLegend');

  chart.colorData = function(_) {
    var type = arguments[0],
        params = arguments[1] || {};
    var color = function(d, i) {
          return utility.defaultColor()(d, d.seriesIndex);
        };
    var classes = function(d, i) {
          return 'sc-series sc-series-' + d.seriesIndex;
        };

    switch (type) {
      case 'graduated':
        color = function(d, i) {
          return d3.interpolateHsl(d3.rgb(params.c1), d3.rgb(params.c2))(d.seriesIndex / params.l);
        };
        break;
      case 'class':
        color = function() {
          return 'inherit';
        };
        classes = function(d, i) {
          var iClass = (d.seriesIndex * (params.step || 1)) % 14;
          iClass = (iClass > 9 ? '' : '0') + iClass;
          return 'sc-series sc-series-' + d.seriesIndex + ' sc-fill' + iClass + ' sc-stroke' + iClass;
        };
        break;
      case 'data':
        color = function(d, i) {
          return utility.defaultColor()(d, d.seriesIndex);
        };
        classes = function(d, i) {
          return 'sc-series sc-series-' + d.seriesIndex + (d.classes ? ' ' + d.classes : '');
        };
        break;
    }

    var fill = !params.gradient ? color : function(d, i) {
      var p = {
        orientation: params.orientation || 'vertical',
        position: params.position || 'middle'
      };
      return model.gradientFill(d, d.seriesIndex, p);
    };

    model.color(color);
    model.fill(fill);
    model.classes(classes);

    // don't enable this since controls get a custom function
    // controls.color(color);
    // controls.classes(classes);
    header.legend.color(color);
    header.legend.classes(classes);

    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) { return margin; }
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        margin[prop] = _[prop];
      }
    }
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) { return width; }
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) { return height; }
    height = _;
    return chart;
  };

  chart.tooltips = function(_) {
    if (!arguments.length) { return tooltips; }
    tooltips = _;
    return chart;
  };

  chart.tooltipContent = function(_) {
    if (!arguments.length) { return tooltipContent; }
    tooltipContent = _;
    return chart;
  };

  chart.state = function(_) {
    if (!arguments.length) { return state; }
    state = _;
    dispatch.call('stateChange', this, state);
    return chart;
  };

  chart.strings = function(_) {
    if (!arguments.length) { return strings; }
    strings = language(_);
    header.strings(strings);
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    model.direction(_);
    header.direction(_);
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) { return duration; }
    duration = _;
    model.duration(_);
    return chart;
  };

  chart.delay = function(_) {
    if (!arguments.length) { return delay; }
    delay = _;
    model.delay(_);
    return chart;
  };

  chart.seriesClick = function(_) {
    if (!arguments.length) {
      return seriesClick;
    }
    seriesClick = _;
    return chart;
  };

  //============================================================

  return chart;
}

function gaugeChart() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 10, right: 10, bottom: 10, left: 10},
      width = null,
      height = null,
      direction = 'ltr',
      delay = 0,
      duration = 0,
      tooltips = true,
      state = {},
      strings = language();

  var dispatch = d3.dispatch('chartClick', 'tooltipShow', 'tooltipHide', 'tooltipMove', 'stateChange', 'changeState');

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  // Chart components
  var model = gauge();
  var header = headers();

  var controlsData = [];

  var tt = null;

  var tooltipContent = function(eo, properties) {
        var k = model.fmtKey()(eo.point.series);
        var x = model.getCount()(eo.point.series);
        var y = model.getValue()(eo.point.series);
        return '<h3>' + k + '</h3>' +
               '<p>' + y + ' on ' + x + '</p>';
      };

  var showTooltip = function(eo, offsetElement, properties) {
        var content = tooltipContent(eo, properties);
        return tooltip.show(eo.e, content, null, null, offsetElement);
      };

  header
    .showTitle(true)
    .showControls(false)
    .showLegend(true)
    .alignLegend('center');


  //============================================================

  function chart(selection) {

    selection.each(function(chartData) {

      var that = this,
          container = d3.select(this),
          modelClass = 'gauge';

      var properties = chartData ? chartData.properties || {} : {},
          data = chartData ? chartData.data || null : null;

      var containerWidth = parseInt(container.style('width'), 10),
          containerHeight = parseInt(container.style('height'), 10);

      var xIsDatetime = properties.xDataType === 'datetime' || false,
          yIsCurrency = properties.yDataType === 'currency' || false;

      chart.update = function() {
        container.transition().duration(duration).call(chart);
      };

      chart.container = this;


      //------------------------------------------------------------
      // Private method for displaying no data message.

      function displayNoData(data, msg) {
        var hasData = data && data.length;
        var x = (containerWidth - margin.left - margin.right) / 2 + margin.left;
        var y = (containerHeight - margin.top - margin.bottom) / 2 + margin.top;
        return utility.displayNoData(hasData, container, (msg || strings.noData), x, y);
      }

      // Check to see if there's nothing to show.
      if (displayNoData(data)) {
        return chart;
      }


      //------------------------------------------------------------
      // Process data

      var previousTick = 0;
      model.minValue(previousTick);

      // add series index to each data point for reference
      data.forEach(function(s, i) {
        var y = model.getValue()(s);
        s.seriesIndex = i;

        if (!y && !s.values) {
          s.values = [];
        } else if (utility.isNumeric(s.value)) {
          s.values = [{x: 0, y: y}];
        }
        s.values.forEach(function(p, j) {
          p.index = j;
          p.series = s;
          p.y0 = previousTick;
          p.y1 = previousTick + y;
        });

        s.value = y || d3.sum(s.values, function(p) { return model.getValue()(p); });
        s.count = s.count || s.values.length;
        s.disabled = s.disabled || s.value === 0;

        previousTick += y;
      });

      // only sum enabled series
      var modelData = data.filter(function(d, i) { return !d.disabled; });

      properties.count = d3.sum(modelData, function(d) { return d.count; });

      // no need for d3.max since previousTick holds this
      model.maxValue(previousTick);

      //set state.disabled
      state.disabled = data.map(function(d) { return !!d.disabled; });

      //------------------------------------------------------------
      // Display No Data message if there's nothing to show.

      if (displayNoData(modelData)) {
        return chart;
      }

      header
        .chart(chart)
        .title(properties.title)
        .controlsData(controlsData)
        .legendData(data);

      //------------------------------------------------------------
      // Main chart wrappers

      var wrap_bind = container.selectAll('g.sc-chart-wrap').data([modelData]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-chart-wrap sc-chart-' + modelClass);
      var wrap = container.select('.sc-chart-wrap').merge(wrap_entr);

      wrap_entr.append('defs');

      wrap_entr.append('g').attr('class', 'sc-background-wrap');
      var back_wrap = wrap.select('.sc-background-wrap');

      wrap_entr.append('g').attr('class', 'sc-title-wrap');

      wrap_entr.append('g').attr('class', 'sc-' + modelClass + '-wrap');
      var model_wrap = wrap.select('.sc-' + modelClass + '-wrap');

      wrap_entr.append('g').attr('class', 'sc-controls-wrap');
      wrap_entr.append('g').attr('class', 'sc-legend-wrap');

      wrap.attr('transform', utility.translation(margin.left, margin.top));
      wrap_entr.select('.sc-background-wrap').append('rect')
        .attr('class', 'sc-background')
        .attr('x', -margin.left)
        .attr('y', -margin.top)
        .attr('fill', '#FFF');


      //------------------------------------------------------------
      // Main chart draw

      chart.render = function() {

        // Chart layout variables
        var renderWidth, renderHeight,
            availableWidth, availableHeight,
            innerMargin,
            innerWidth, innerHeight,
            headerHeight;

        containerWidth = parseInt(container.style('width'), 10);
        containerHeight = parseInt(container.style('height'), 10);

        renderWidth = width || containerWidth || 960;
        renderHeight = height || containerHeight || 400;

        availableWidth = renderWidth - margin.left - margin.right;
        availableHeight = renderHeight - margin.top - margin.bottom;

        innerMargin = {top: 0, right: 0, bottom: 0, left: 0};
        innerWidth = availableWidth - innerMargin.left - innerMargin.right;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;

        back_wrap.select('.sc-background')
          .attr('width', renderWidth)
          .attr('height', renderHeight);


        //------------------------------------------------------------
        // Title & Legend & Controls

        header
          .width(availableWidth)
          .height(availableHeight);

        container.call(header);

        // Recalc inner margins based on title, legend and control height
        headerHeight = header.getHeight();
        innerMargin.top += headerHeight;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;

        if (innerHeight < 100) {
          displayNoData(null, strings.displayError);
          return chart;
        }


        //------------------------------------------------------------
        // Main Chart Component(s)

        model
          .width(innerWidth)
          .height(innerHeight);

        model_wrap
          .datum(modelData)
          .attr('transform', utility.translation(innerMargin.left, innerMargin.top))
          .transition().duration(duration)
            .call(model);

        model.setPointer(properties.value);
      };

      //============================================================

      chart.render();

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      dispatch.on('tooltipShow', function(eo) {
        if (tooltips) {
          tt = showTooltip(eo, that.parentNode, properties);
        }
      });

      dispatch.on('tooltipMove', function(e) {
        if (tt) {
          tooltip.position(that.parentNode, tt, e);
        }
      });

      dispatch.on('tooltipHide', function() {
        if (tooltips) {
          tooltip.cleanup();
        }
      });

      // Update chart from a state object passed to event handler
      dispatch.on('changeState', function(eo) {
        if (typeof eo.disabled !== 'undefined') {
          modelData.forEach(function(series, i) {
            series.disabled = eo.disabled[i];
          });
          state.disabled = eo.disabled;
        }

        chart.update();
      });

      dispatch.on('chartClick', function() {
        //dispatch.call('tooltipHide', this);
        if (header.controls.enabled()) {
          header.controls.dispatch.call('closeMenu', this);
        }
        if (header.legend.enabled()) {
          header.legend.dispatch.call('closeMenu', this);
        }
      });

    });

    return chart;
  }

  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  model.dispatch.on('elementMouseover.tooltip', function(eo) {
    dispatch.call('tooltipShow', this, eo);
  });

  model.dispatch.on('elementMousemove.tooltip', function(e) {
    dispatch.call('tooltipMove', this, e);
  });

  model.dispatch.on('elementMouseout.tooltip', function() {
    dispatch.call('tooltipHide', this);
  });

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.dispatch = dispatch;
  chart.gauge = model;
  chart.legend = header.legend;
  chart.controls = header.controls;
  chart.options = utility.optionsFunc.bind(chart);

  utility.rebind(chart, model, 'id', 'x', 'y', 'color', 'fill', 'classes', 'gradient', 'locality');
  utility.rebind(chart, model, 'getKey', 'getValue', 'getCount', 'fmtKey', 'fmtValue', 'fmtCount');
  utility.rebind(chart, model, 'showLabels', 'showPointer', 'setPointer', 'ringWidth', 'labelThreshold', 'maxValue', 'minValue');
  utility.rebind(chart, header, 'showTitle', 'showControls', 'showLegend');

  chart.colorData = function(_) {
    var type = arguments[0],
        params = arguments[1] || {};
    var color = function(d, i) {
          return utility.defaultColor()(d, d.seriesIndex);
        };
    var classes = function(d, i) {
          return 'sc-series sc-series-' + d.seriesIndex;
        };

    switch (type) {
      case 'graduated':
        color = function(d, i) {
          return d3.interpolateHsl(d3.rgb(params.c1), d3.rgb(params.c2))(d.seriesIndex / params.l);
        };
        break;
      case 'class':
        color = function() {
          return 'inherit';
        };
        classes = function(d, i) {
          var iClass = (d.seriesIndex * (params.step || 1)) % 14;
          iClass = (iClass > 9 ? '' : '0') + iClass;
          return 'sc-series sc-series-' + d.seriesIndex + ' sc-fill' + iClass + ' sc-stroke' + iClass;
        };
        break;
      case 'data':
        color = function(d, i) {
          return utility.defaultColor()(d, d.seriesIndex);
        };
        classes = function(d, i) {
          return 'sc-series sc-series-' + d.seriesIndex + (d.classes ? ' ' + d.classes : '');
        };
        break;
    }

    var fill = !params.gradient ? color : function(d, i) {
      return model.gradientFill(d, d.seriesIndex);
    };

    model.color(color);
    model.fill(fill);
    model.classes(classes);

    header.legend.color(color);
    header.legend.classes(classes);

    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) { return margin; }
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        margin[prop] = _[prop];
      }
    }
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) { return width; }
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) { return height; }
    height = _;
    return chart;
  };

  chart.tooltips = function(_) {
    if (!arguments.length) { return tooltips; }
    tooltips = _;
    return chart;
  };

  chart.tooltipContent = function(_) {
    if (!arguments.length) { return tooltipContent; }
    tooltipContent = _;
    return chart;
  };

  chart.state = function(_) {
    if (!arguments.length) { return state; }
    state = _;
    return chart;
  };

  chart.strings = function(_) {
    if (!arguments.length) { return strings; }
    strings = language(_);
    header.strings(strings);
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    model.direction(_);
    header.direction(_);
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) { return duration; }
    duration = _;
    model.duration(_);
    return chart;
  };

  chart.delay = function(_) {
    if (!arguments.length) { return delay; }
    delay = _;
    model.delay(_);
    return chart;
  };

  //============================================================

  return chart;
}

function globeChart() {

  // http://cldr.unicode.org/
  // http://www.geonames.org/countries/
  // http://www.naturalearthdata.com/downloads/
  // http://geojson.org/geojson-spec.html
  // http://bl.ocks.org/mbostock/4183330
  // http://bost.ocks.org/mike/map/
  // https://github.com/mbostock/topojson
  // https://github.com/mbostock/topojson/wiki/Command-Line-Reference
  // https://github.com/mbostock/us-atlas
  // https://github.com/mbostock/world-atlas
  // https://github.com/papandreou/node-cldr
  // https://github.com/melalj/topojson-map-generator
  // http://bl.ocks.org/mbostock/248bac3b8e354a9103c4#cubicInOut
  // https://www.jasondavies.com/maps/rotate/
  // https://www.jasondavies.com/maps/zoom/
  // http://www.kirupa.com/html5/animating_with_easing_functions_in_javascript.htm
  // http://www.jacklmoore.com/notes/mouse-position/

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var id = Math.floor(Math.random() * 10000), //Create semi-unique ID in case user doesn't select one,
      margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = null,
      height = null,
      showTitle = false,
      direction = 'ltr',
      tooltips = true,
      initialTilt = 0,
      initialRotate = 100,
      state = {},
      strings = language(),
      showLabels = true,
      autoSpin = false,
      showGraticule = true,
      gradient = null,
      world_map = [],
      country_map = {},
      country_labels = {},
      color = function(d, i) { return utility.defaultColor()(d, i); },
      classes = function(d, i) { return 'sc-country-' + i; },
      fill = color,
      dispatch = d3.dispatch('chartClick', 'tooltipShow', 'tooltipHide', 'tooltipMove', 'stateChange', 'changeState', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout');


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var projection = d3.geoOrthographic().precision(0.1);
  var path = d3.geoPath().projection(projection);
  var graticule = d3.geoGraticule();
  var colorLimit = 0;

  var tt = null;

  var tooltipContent = function(eo, properties) {
    return '<p><b>' + eo.name + '</b></p>' +
           '<p><b>Amount:</b> $' + d3.format(',.0f')(eo.amount) + '</p>';
  };

  function showTooltip(eo, offsetElement, properties) {
    var content = tooltipContent(eo, properties);
    return tooltip.show(eo.e, content, null, null, offsetElement);
  }

  var seriesClick = function(data, e, chart) {
    return;
  };

  //============================================================

  function chart(selection) {

    selection.each(function(chartData) {

      var that = this,
          container = d3.select(this),
          node = d3.select('#' + id + ' svg').node();

      var properties = chartData ? chartData.properties : {},
          data = chartData ? chartData.data : null;

      var containerWidth = parseInt(container.style('width'), 10),
          containerHeight = parseInt(container.style('height'), 10);

      var tooltips0 = tooltips,
          m0, n0, o0;

      // Globe variables
      var world,
          active_country = false,
          world_view = {rotate: [initialRotate, initialTilt], scale: 1, zoom: 1},
          country_view = {rotate: [null, null], scale: null, zoom: null},
          iRotation;

      // Chart layout variables
      var renderWidth, renderHeight, availableWidth, availableHeight;

      chart.container = this;

      gradient = gradient || function(d, i) {
        return utility.colorRadialGradient(d, i, 0, 0, '35%', '35%', color(d, i), defs);
      };

      //------------------------------------------------------------
      // Private method for displaying no data message.

      function displayNoData(data, msg) {
        var hasData = data && data.length;
        var x = (containerWidth - margin.left - margin.right) / 2 + margin.left;
        var y = (containerHeight - margin.top - margin.bottom) / 2 + margin.top;
        return utility.displayNoData(hasData, container, (msg || strings.noData), x, y);
      }

      // Check to see if there's nothing to show.
      if (displayNoData(data)) {
        return chart;
      }

      //------------------------------------------------------------
      // Process data
      var results = data[0];

      //------------------------------------------------------------
      // Setup svgs and skeleton of chart

      var wrap_bind = container.selectAll('g.sc-chart-wrap').data([1]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-chart-wrap sc-chart-globe');
      var wrap = container.select('.sc-chart-wrap').merge(wrap_entr);

      wrap_entr.append('defs');
      var defs = wrap.select('defs');

      wrap_entr.append('svg:rect')
        .attr('class', 'sc-chart-background')
        .attr('transform', utility.translation(margin.left, margin.top));
      var backg = wrap.select('.sc-chart-background');

      var globe_entr = wrap_entr.append('g').attr('class', 'sc-globe');
      var globe = wrap.select('.sc-globe');

      globe_entr.append('path')
        .datum({type: 'Sphere'})
        .attr('class', 'sphere');
      var sphere = d3.select('.sphere');

      if (showGraticule) {
        globe_entr.append('path')
          .datum(graticule)
          .attr('class', 'graticule');
        var grid = d3.select('.graticule');
      }

      // zoom and pan
      var zoom = d3.zoom()
            .on('start', zoomStart)
            .on('zoom', zoomMove)
            .on('end', zoomEnd);
      globe.call(zoom);

      sphere
        .on('click', function () {
          unLoadCountry();
        });

      function zoomStart() {
        m0 = normalizeOffset(d3.event.sourceEvent);
        n0 = projection.invert(m0);
        o0 = projection.rotate();

        if (tooltips) {
          tooltip.cleanup();
          tooltips = false;
        }

        if (autoSpin) {
          clearInterval(iRotation);
        }
      }

      function zoomMove() {
        if (!m0) {
          return;
        }
        var scale = calcScale(d3.event.transform.k);
        var m1, n1, o1;

        m1 = normalizeOffset(d3.event.sourceEvent);
        n1 = projection.invert(m1);

        if (!n1[0]) {
          return;
        }

        o1 = [o0[0] + n1[0] - n0[0], (country_view.rotate[1] || world_view.rotate[1])];
        o0 = [o1[0], o1[1]];

        projection
          .rotate(o1)
          .scale(scale);

        refresh();
      }

      function zoomEnd() {
        m0 = null;
        tooltips = tooltips0;
      }

      function normalizeOffset(e) {
        var rect = node.getBoundingClientRect(),
            offsetX = (e ? e.clientX || 0 : 0) - rect.left,
            offsetY = (e ? e.clientY || 0 : 0) - rect.top;
        return [offsetX, offsetY];
      }

      //------------------------------------------------------------
      // Main chart draw methods

      chart.update = function() {
        container.transition().call(chart);
      };

      chart.resize = function () {
        var scale, translate;
        calcDimensions();
        scale = calcScale(projection.scale());
        translate = calcTranslate();
        backg
          .attr('width', availableWidth)
          .attr('height', availableHeight);
        projection
          .scale(scale)
          .translate(translate);
        refresh();
      };

      chart.render = function() {
        calcDimensions();

        projection
          .translate(calcTranslate())
          .rotate(world_view.rotate)
          .scale(calcScale(world_view.scale));

        path.projection(projection);

        sphere
          .attr('d', path);

        if (showGraticule) {
          grid
            .attr('d', path);
        }

        backg
          .attr('width', availableWidth)
          .attr('height', availableHeight);

        refresh();
      };

      //============================================================

      chart.render();

      loadChart(world_map, 'countries');

      if (autoSpin) {
        iRotation = setInterval(spin, 10);
      }

      //------------------------------------------------------------
      // Internal functions

      function calcDimensions() {
        renderWidth = width || parseInt(container.style('width'), 10) || 960;
        renderHeight = height || parseInt(container.style('height'), 10) || 400;
        availableWidth = renderWidth - margin.left - margin.right;
        availableHeight = renderHeight - margin.top - margin.bottom;
      }

      function calcScale(s) {
        var scale = Math.min(Math.max(s, 0.75), 3),
            size = Math.min(availableHeight, availableWidth) / 2;
        return scale * size;
      }

      function calcTranslate() {
        return [availableWidth / 2 + margin.left, availableHeight / 2 + margin.top];
      }

      function loadChart(data, type) {
        colorLimit = results._total;

        var world_bind = globe_entr.append('g').attr('class', type)
              .selectAll('path').data(data);
        var world_entr = world_bind.enter().append('path')
              .attr('d', clip)
              .attr('class', classes)
              .style('fill', function (d, i) {
                d.amount = amount(d);
                return fill(d, d.properties.mapcolor13 || i);
              });
        world = globe.selectAll('path').merge(world_entr);

        world_entr
          .on('click', loadCountry)
          .on('mouseover', function (d, i, j) {
            if (!d.properties) {
              return;
            }
            var eo = buildEventObject(d3.event, d, i, j);
            dispatch.call('tooltipShow', this, eo);
          })
          .on('mousemove', function(d, i, j) {
            var e = d3.event;
            dispatch.call('tooltipMove', this, e);
          })
          .on('mouseout', function () {
            dispatch.call('tooltipHide', this);
          });

        function buildEventObject(e, d, i, j) {
          var eo = {
              point: d,
              e: e,
              name: (country_labels[d.properties.iso_a2] || d.properties.name),
              amount: amount(d)
          };
          return eo;
        }
      }

      function loadCountry(d) {
        if (active_country == d3.select(this)) {
          return;
        }

        unLoadCountry();

        // If we have country-specific geographic features.
        if (!country_map[d.id]) {
          return;
        }

        if (tooltips) {
          tooltip.cleanup();
        }

        var centroid = d3.geoCentroid(d);
        var bounds = path.bounds(d);
        var hscale = availableWidth  / (bounds[1][0] - bounds[0][0]);
        var vscale = availableHeight / (bounds[1][1] - bounds[0][1]);
        var scale = Math.min(availableWidth * hscale, availableHeight * vscale) / 2;
        var rotate = [-centroid[0], -centroid[1]];

        world_view = {
          rotate: projection.rotate(),
          scale: projection.scale()
        };

        projection
          .rotate(rotate)
          .scale(scale);

        country_view = {
          rotate: projection.rotate(),
          scale: projection.scale()
        };

        // Flatten the results and include the state-level
        // results so that we don't need complex tooltip logic.
        var obj = region_results(d);
        obj.parent = results;
        results = obj;
        colorLimit = results._total;

        active_country = d3.select(this);
        loadChart(country_map[d.id], 'states');
        active_country.style('display', 'none');

        refresh();
      }

      function unLoadCountry() {
        if (!active_country) {
          return;
        }

        projection
          .rotate(world_view.rotate)
          .scale(world_view.scale);

        country_view = {
          rotate: [null, null],
          scale: null
        };

        results = results.parent;
        colorLimit = results._total;

        active_country.style('display', 'inline');
        d3.select('.states').remove();
        active_country = false;

        refresh();
      }

      function region_results(d) {
        return (
          results._values[d.id] ||
          results._values[d.properties.name] ||
          {'_total': 0}
        );
      }

      function amount(d) {
        return region_results(d)._total || 0;
      }

      function spin() {
        var o0 = projection.rotate(),
            m1 = [10, 0],
            o1 = [o0[0] + m1[0] / 8, initialTilt];
        rotate(o1);
      }

      function rotate(o) {
        projection.rotate(o);
        refresh();
      }

      function refresh(duration) {
        globe.selectAll('path')
          .attr('d', clip);
      }

      function clip(d) {
        return path(d) || 'M0,0Z';
      }

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      dispatch.on('tooltipShow', function(eo) {
          if (tooltips) {
            tt = showTooltip(eo, that.parentNode, properties);
          }
        });

      dispatch.on('tooltipMove', function(e) {
          if (tt) {
            tooltip.position(that.parentNode, tt, e, 's');
          }
        });

      dispatch.on('tooltipHide', function() {
          if (tooltips) {
            tooltip.cleanup();
          }
        });

      // Update chart from a state object passed to event handler
      dispatch.on('changeState', function(eo) {
          //TODO: handle active country

          container.transition().call(chart);
        });

      // dispatch.on('chartClick', function() {
      //     if (controls.enabled()) {
      //       controls.dispatch.call('closeMenu', this);
      //     }
      //     if (legend.enabled()) {
      //       legend.dispatch.call('closeMenu', this);
      //     }
      //   });

    });

    return chart;
  }

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;
  chart.projection = projection;
  chart.path = path;
  chart.graticule = graticule;
  chart.options = utility.optionsFunc.bind(chart);

  chart.margin = function(_) {
    if (!arguments.length) {
      return margin;
    }
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        margin[prop] = _[prop];
      }
    }
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
  };

  chart.tooltips = function(_) {
    if (!arguments.length) {
      return tooltips;
    }
    tooltips = _;
    return chart;
  };

  chart.tooltipContent = function(_) {
    if (!arguments.length) {
      return tooltipContent;
    }
    tooltipContent = _;
    return chart;
  };

  chart.state = function(_) {
    if (!arguments.length) {
      return state;
    }
    state = _;
    return chart;
  };

  chart.strings = function(_) {
    if (!arguments.length) {
      return strings;
    }
    strings = language(_);
    return chart;
  };

  chart.showTitle = function(_) {
    if (!arguments.length) {
      return showTitle;
    }
    showTitle = _;
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    return chart;
  };

  chart.id = function(_) {
    if (!arguments.length) return id;
    id = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = _;
    return chart;
  };
  chart.fill = function(_) {
    if (!arguments.length) return fill;
    fill = _;
    return chart;
  };
  chart.classes = function(_) {
    if (!arguments.length) return classes;
    classes = _;
    return chart;
  };


  chart.colorData = function(_) {
    var type = arguments[0],
        params = arguments[1] || {};
    var color = function(d, i) {
          return utility.defaultColor()(d, i);
        };
    var classes = function(d, i) {
          return 'sc-country-' + i + (d.classes ? ' ' + d.classes : '');
        };

    switch (type) {
      case 'graduated':
        color = function(d, i) {
          return d3.interpolateHsl(d3.rgb(params.c1), d3.rgb(params.c2))(i / params.l);
        };
        break;
      case 'class':
        color = function() {
          return '';
        };
        classes = function(d, i) {
          var iClass = (i * (params.step || 1)) % 14;
          iClass = (iClass > 9 ? '' : '0') + iClass; //TODO: use d3.format
          return 'sc-country-' + i + ' sc-fill' + iClass;
        };
        break;
      case 'data':
        color = function(d, i) {
          var r = d.amount || 0;
          return d3.interpolateHsl(d3.rgb(params.c1), d3.rgb(params.c2))(r / colorLimit);
        };
        break;
    }
    var fill = (!params.gradient) ? color : function(d, i) {
          return chart.gradient()(d, i);
        };

    chart.color(color);
    chart.classes(classes);
    chart.fill(fill);

    return chart;
  };

  chart.gradient = function(_) {
    if (!arguments.length) return gradient;
    gradient = _;
    return chart;
  };

  chart.showLabels = function(_) {
    if (!arguments.length) return showLabels;
    showLabels = _;
    return chart;
  };

  chart.autoSpin = function(_) {
    if (!arguments.length) return autoSpin;
    autoSpin = _;
    return chart;
  };

  chart.worldMap = function(_) {
    if (!arguments.length) {
      return world_map;
    }
    world_map = _;
    return chart;
  };

  chart.countryMap = function(_) {
    if (!arguments.length) {
      return country_map;
    }
    country_map = _;
    return chart;
  };

  chart.countryLabels = function(_) {
    if (!arguments.length) {
      return country_labels;
    }
    country_labels = _;
    return chart;
  };

  chart.seriesClick = function(_) {
    if (!arguments.length) {
      return seriesClick;
    }
    seriesClick = _;
    return chart;
  };

  //============================================================

  return chart;
}

function lineChart() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 10, right: 10, bottom: 10, left: 10},
      width = null,
      height = null,
      direction = 'ltr',
      delay = 0,
      duration = 0,
      tooltips = true,
      state = {},
      strings = language();

  var dispatch = d3.dispatch(
        'chartClick', 'elementClick', 'tooltipShow', 'tooltipHide', 'tooltipMove',
        'stateChange', 'changeState'
      );

  var pointRadius = 3;
  var locale = {};

  var xValueFormat = function(d, i, label, isDate, dateFormat) {
        // If ordinal, label is provided so use it.
        // If date or numeric use d.
        var value = label || d;
        var formatter;
        if (isDate) {
          formatter = !dateFormat || dateFormat.indexOf('%') !== 0 ? '%x' : dateFormat;
          return utility.dateFormat(value, formatter, locale);
        } else {
          return value;
        }
      };

  var yValueFormat = function(d, i, isCurrency, precision, si) {
        return utility.numberFormatSIFixed(d, precision, isCurrency, locale, si);
      };

  var tooltipContent = function(eo, properties) {
        // the event object group is set by event dispatcher if x is ordinal
        var group = eo.group || {};
        // this is the ordinal index [0+1..n+1] or value index [0..n]
        var x = eo.point.x;
        var y = eo.point.y;
        var xIsDatetime = properties.xDataType === 'datetime';
        var yIsCurrency = properties.yDataType === 'currency';
        // var value = yValueFormat(y, eo.seriesIndex, null, yIsCurrency, 2);
        // we can't use yValueFormat because it needs SI units for axis
        // for tooltip, we want the full value
        var point = {
          seriesName: properties.seriesName || strings.tooltip.key,
          seriesLabel: eo.series.key,
          groupName: properties.groupName || (xIsDatetime ? strings.tooltip.date : strings.tooltip.group),
          groupLabel: xValueFormat(x, eo.pointIndex, group.label, xIsDatetime, '%x'),
          valueName: yIsCurrency ? strings.tooltip.amount : strings.tooltip.count,
          valueLabel: utility.numberFormat(y, null, yIsCurrency, locale)
        };

        var percent;
        if (eo.group && utility.isNumeric(eo.group._height)) {
          percent = Math.abs(y * 100 / eo.group._height).toFixed(1);
          point.percent = utility.numberFormat(percent, 2, false, locale);
        }

        return tooltip.multi(point, strings);
      };

  var seriesClick = function(data, eo, chart, labels) {
        return;
      };

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  // Chart components
  var model = line();
  var header = headers();
  var xAxis = axis();
  var yAxis = axis();

  var tt = null;

  var showTooltip = function(eo, offsetElement, properties) {
        var content = tooltipContent(eo, properties);
        var gravity = eo.value < 0 ?
          'n' :
          's';
        return tooltip.show(eo.e, content, gravity, null, offsetElement);
      };

  model
    .clipEdge(true);
  header
    .showTitle(true)
    .showControls(true)
    .showLegend(true);


  //============================================================

  function chart(selection) {

    selection.each(function(chartData) {

      var that = this,
          container = d3.select(this),
          modelClass = 'line';

      var properties = chartData ? chartData.properties || {} : {},
          data = chartData ? chartData.data || null : null;

      var containerWidth = parseInt(container.style('width'), 10),
          containerHeight = parseInt(container.style('height'), 10);

      var availableWidth = width,
          availableHeight = height;

      var xIsDatetime = properties.xDataType === 'datetime' || false,
          xIsNumeric = properties.xDataType === 'numeric' || false,
          yIsCurrency = properties.yDataType === 'currency' || false;

      var groupData = properties.groups,
          hasGroupData = Array.isArray(groupData) && groupData.length > 0,
          groupLabels = [],
          groupCount = 0,
          hasGroupLabels = false;

      var modelData = [],
          seriesCount = 0,
          totalAmount = 0;

      var padding = (model.padData() ? pointRadius : 0);
      var singlePoint = false;

      var controlsData = [
        {key: 'Linear', disabled: model.interpolate() !== 'linear'},
        {key: 'Basis', disabled: model.interpolate() !== 'basis'},
        {key: 'Monotone', disabled: model.interpolate() !== 'monotone'},
        {key: 'Cardinal', disabled: model.interpolate() !== 'cardinal'},
        {key: 'Line', disabled: model.isArea()() === true},
        {key: 'Area', disabled: model.isArea()() === false}
      ];

      chart.update = function() {
        container.transition().duration(duration).call(chart);
      };

      chart.setActiveState = function(series, state) {
        series.active = state;
        series.values.forEach(function(v) {
          v.active = state;
        });
      };

      chart.clearActive = function(reset) {
        data.forEach(function(s) {
          chart.setActiveState(s, reset || '');
        });
        delete state.active;
      };

      // only accepts an event object with seriesIndex
      chart.cellActivate = function(eo) {
        // seriesClick is defined outside chart scope, so when it calls
        // cellActivate, it only has access to (data, eo, chart, labels)
        var cell = data[eo.seriesIndex].values[eo.pointIndex];
        var activeState;
        if (!cell) {
          return;
        }
        // store toggle active state
        activeState = (
            typeof cell.active === 'undefined' ||
            cell.active === 'inactive' ||
            cell.active === ''
          ) ? 'active' : '';
        // unset entire active state first
        chart.clearActive();
        cell.active = activeState;
      };

      // accepts either an event object with actual series data or seriesIndex
      chart.seriesActivate = function(eo) {
        var series = eo.series || data[eo.seriesIndex];
        var activeState;
        if (!series) {
          return;
        }
        // store toggle active state
        activeState = (
            typeof series.active === 'undefined' ||
            series.active === 'inactive' ||
            series.active === ''
          ) ? 'active' : '';
        // inactivate all series
        chart.clearActive(activeState === 'active' ? 'inactive' : '');
        // then activate the selected series
        chart.setActiveState(series, activeState);
        // set the state to a truthy map
        state.active = data.map(function(s) {
          return s.active === 'active';
        });
      };

      // accepts either an event object with actual series data or seriesIndex
      chart.dataSeriesActivate = function(eo) {
        var series = eo.series || data[eo.seriesIndex];
        var activeState;
        if (!series) {
          return;
        }
        // toggle active state
        activeState = (
            typeof series.active === 'undefined' ||
            series.active === 'inactive' ||
            series.active === ''
          ) ? 'active' : 'inactive';
        if (activeState === 'active') {
          // if you have activated a data series,
          chart.seriesActivate(eo);
        } else {
          // if there are no active data series, unset entire active state
          chart.clearActive();
        }
      };

      chart.container = this;


      //------------------------------------------------------------
      // Private method for displaying no data message.

      function displayNoData(data, msg) {
        var hasData = data && data.length && data.filter(function(series) {
          return !series.disabled && Array.isArray(series.values) && series.values.length;
        }).length;
        var x = (containerWidth - margin.left - margin.right) / 2 + margin.left;
        var y = (containerHeight - margin.top - margin.bottom) / 2 + margin.top;
        return utility.displayNoData(hasData, container, (msg || strings.noData), x, y);
      }

      // Check to see if there's nothing to show.
      if (displayNoData(data)) {
        return chart;
      }


      //------------------------------------------------------------
      // Process data

      locale = chart.locality();

      // add series index to each data point for reference
      // and disable data series if total is zero
      data.forEach(function(series, s) {
        series.seriesIndex = s;
        series.key = series.key || strings.noLabel;
        series.total = d3.sum(series.values, function(value, v) {
          // if data is ordinal, add group based on x not index
          value.group = hasGroupData ? value.x - 1 : v;
          return value.y;
        });

        // disabled if all values in series are zero
        // or the series was disabled by the legend
        series.disabled = series.disabled || series.total === 0;
      });

      // Remove disabled series data
      modelData = data
        .filter(function(series) {
          return !series.disabled;
        })
        .map(function(series, s) {
          // this is the iterative index, not the data index called seriesIndex
          series.seri = s;
          return series;
        });

      seriesCount = modelData.length;

      // Display No Data message if there's nothing to show.
      if (displayNoData(modelData)) {
        return chart;
      }

      // -------------------------------------------
      // Get group data from properties or modelData

      function setGroupLabels(groupData) {
        // Get simple array of group labels for ticks
        groupLabels = groupData.map(function(group) {
            return group.label;
          });
        groupCount = groupLabels.length;
        hasGroupLabels = groupCount > 0;
      }

      if (hasGroupData) {

        // Calculate group totals and height
        // based on enabled data series
        groupData
          .forEach(function(group, g) {
            var label = typeof group.label === 'undefined' || group.label === ''
              ? strings.noLabel
              : !xIsDatetime
                ? group.label
                : utility.isNumeric(group.label) || group.label.indexOf('GMT') !== -1
                  ? new Date(group.label)
                  : new Date(group.label + ' GMT');
            group.group = g,
            group.label = label;
            group.total = 0;

            //TODO: only sum enabled series
            // update group data with values
            modelData
              .forEach(function(series, s) {
              //TODO: there is a better way with map reduce?
                series.values
                  .filter(function(value, v) {
                    return value.group === g;
                  })
                  .forEach(function(value, v) {
                    group.total += value.y;
                  });
              });
          });

        setGroupLabels(groupData);

        totalAmount = d3.sum(groupData, function(group) {
          return group.total;
        });

      } else {

        groupLabels = d3
          .merge(modelData.map(function(series) {
            return series.values;
          }))
          .reduce(function(a, b) {
            if (a.indexOf(b.x) === -1) {
              a.push(b.x);
            }
            return a;
          }, [])
          .map(function(value, v) {
            return xIsDatetime ? new Date(value) : value;
          });

        groupCount = Math.min(Math.ceil(innerWidth / 100), groupLabels.length);

        totalAmount = d3.sum(modelData, function(series) {
          return series.total;
        });

      }


      //------------------------------------------------------------
      // Configure axis format functions

          //TODO: allow formatter to be set by data
      var xTickMaxWidth = 75,
          xDateFormat = null,
          xAxisFormat = null,
          yAxisFormat = null;

      var yAxisFormatProperties = {
        axis: null,
        maxmin: null
      };

      function setAxisFormatProperties(type, selection) {
        // i.e., [100, 200, 300]
        var tickDatum = selection.map(function(t) {
            return d3.select(t).datum();
          });
        // i.e., 1 | 1000 | 1000000
        var decimal = d3.max(d3.extent(tickDatum), function(v) {
            return utility.siDecimal(Math.abs(v));
          });
        // number of significant figures after the decimal
        var precision = d3.max(tickDatum, function(v) {
            var numberString = d3.formatPrefix('.2s', decimal)(v);
            return utility.countSigFigsAfter(numberString);
          });
        if (type === 'maxmin' && yAxisFormatProperties.axis) {
          precision = Math.max(yAxisFormatProperties.axis.precision, precision);
        }
        yAxisFormatProperties[type] = {
          decimal: decimal,
          precision: precision
        };
        return yAxisFormatProperties[type];
      }

      if (xIsDatetime) {
        xDateFormat = utility.getDateFormatUTC(groupLabels);
      }

      xAxisFormat = function(value, v, selection, type) {
        //NOTE: there isn't  always groupLabels
        var groupLabel = hasGroupLabels ? groupLabels[v] : value;
        var label = xValueFormat(value, v, groupLabel, xIsDatetime, xDateFormat);
        return type === 'no-ellipsis' ?
          label :
          utility.stringEllipsify(label, container, xTickMaxWidth);
      };

      yAxisFormat = function(value, v, selection, type) {
        var props = yAxisFormatProperties[type] || setAxisFormatProperties(type, selection);
        return yValueFormat(value, v, yIsCurrency, props.precision, props.decimal);
      };


      //------------------------------------------------------------
      // State persistence model

      state.disabled = modelData.map(function(d) { return !!d.disabled; });
      state.interpolate = model.interpolate();
      state.isArea = model.isArea()();


      //------------------------------------------------------------
      // Set component attributes

      header
        .chart(chart)
        .title(properties.title)
        .controlsData(controlsData)
        .legendData(data);

      // Are all data series single points
      singlePoint = d3.max(modelData, function(d) {
          return d.values.length;
        }) === 1;

      var pointSize = Math.pow(pointRadius, 2) * Math.PI * (singlePoint ? 3 : 1);

      model
        //TODO: we need to reconsider use of padData
        // .padData(singlePoint ? false : true)
        // .padDataOuter(-1)
        // set x-scale as time instead of linear
        // .xScale(xIsDatetime && !groupLabels.length ? d3.scaleTime() : d3.scaleLinear()) //TODO: why && !groupLabels.length?
        // .xScale(hasGroupData ? d3.scaleBand() : xIsDatetime ? d3.scaleTime() : d3.scaleLinear())
        .xScale(xIsDatetime ? d3.scaleTime() : d3.scaleLinear())
        .singlePoint(singlePoint)
        .size(pointSize) // default size set to 3
        .sizeRange([pointSize, pointSize])
        .sizeDomain([pointSize, pointSize]); //set to speed up calculation, needs to be unset if there is a custom size accessor

      if (singlePoint) {

        var xValues = d3.merge(modelData.map(function(d) {
                return d.values.map(function(d, i) {
                  return model.x()(d, i);
                });
              }))
              .reduce(function(p, c) {
                if (p.indexOf(c) < 0) p.push(c);
                return p;
              }, [])
              .sort(function(a, b) {
                return a - b;
              });
        var xExtents = d3.extent(xValues);
        var xOffset = 1 * (xIsDatetime && !groupLabels.length ? 86400000 : 1);

        var yValues = d3.merge(modelData.map(function(d) {
                return d.values.map(function(d, i) {
                  return model.y()(d, i);
                });
              }));
        var yExtents = d3.extent(yValues);
        var yOffset = modelData.length === 1 ? 2 : Math.min((yExtents[1] - yExtents[0]) / modelData.length, yExtents[0]);

        model
          .xDomain([
            xExtents[0] - xOffset,
            xExtents[1] + xOffset
          ])
          .yDomain([
            yExtents[0] - yOffset,
            yExtents[1] + yOffset
          ]);

        xAxis
          .orient('bottom')
          .ticks(xValues.length)
          .tickValues(xValues)
          .highlightZero(false)
          .showMaxMin(false);

        yAxis
          .orient('left')
          .ticks(singlePoint ? 5 : null) //TODO: why 5?
          .highlightZero(false)
          .showMaxMin(false);

      } else {

        model
          .xDomain(null)
          .yDomain(null); //?why null? so scatter will be forced to calc

        xAxis
          .orient('bottom')
          //NOTE: be careful of this. If the x value is ordinal, then the values
          // should be [1...n]. If the x value is numeric, then the values are
          // zero indexed as [0..n-1]
          .tickValues(hasGroupLabels ? d3.range(1, groupCount + 1) : null)
          .ticks(hasGroupLabels ? groupCount : null)
          // .ticks(groupCount)
          .highlightZero(false)
          .showMaxMin(hasGroupLabels ? false : true);

        yAxis
          .orient('left')
          .ticks(null)
          .highlightZero(true)
          .showMaxMin(true);

      }

      xAxis
        .scale(model.xScale())
        .tickPadding(6)
        .valueFormat(xAxisFormat);

      yAxis
        .scale(model.yScale())
        .tickPadding(6)
        .valueFormat(yAxisFormat);


      //------------------------------------------------------------
      // Main chart wrappers

      var wrap_bind = container.selectAll('g.sc-chart-wrap').data([modelData]);
      var wrap_entr = wrap_bind.enter().append('g')
            .attr('class', 'sc-chart-wrap sc-chart-' + modelClass);
      var wrap = container.select('.sc-chart-wrap').merge(wrap_entr);

      wrap_entr.append('defs');

      wrap_entr.append('g').attr('class', 'sc-background-wrap');
      var back_wrap = wrap.select('.sc-background-wrap');

      wrap_entr.append('g').attr('class', 'sc-title-wrap');

      wrap_entr.append('g').attr('class', 'sc-axis-wrap sc-axis-x');
      var xAxis_wrap = wrap.select('.sc-axis-wrap.sc-axis-x');
      wrap_entr.append('g').attr('class', 'sc-axis-wrap sc-axis-y');
      var yAxis_wrap = wrap.select('.sc-axis-wrap.sc-axis-y');

      wrap_entr.append('g').attr('class', 'sc-' + modelClass + '-wrap');
      var model_wrap = wrap.select('.sc-' + modelClass + '-wrap');

      wrap_entr.append('g').attr('class', 'sc-controls-wrap');
      wrap_entr.append('g').attr('class', 'sc-legend-wrap');

      wrap.attr('transform', utility.translation(margin.left, margin.top));
      wrap_entr.select('.sc-background-wrap').append('rect')
        .attr('class', 'sc-background')
        .attr('x', -margin.left)
        .attr('y', -margin.top)
        .attr('fill', '#FFF');


      //------------------------------------------------------------
      // Main chart draw

      chart.render = function() {

        // Chart layout variables
        var renderWidth, renderHeight,
            innerMargin,
            innerWidth, innerHeight,
            headerHeight;

        var xpos = 0,
            ypos = 0;

        containerWidth = parseInt(container.style('width'), 10);
        containerHeight = parseInt(container.style('height'), 10);

        renderWidth = width || containerWidth || 960;
        renderHeight = height || containerHeight || 400;

        availableWidth = renderWidth - margin.left - margin.right;
        availableHeight = renderHeight - margin.top - margin.bottom;

        innerMargin = {top: 0, right: 0, bottom: 0, left: 0};
        innerWidth = availableWidth - innerMargin.left - innerMargin.right;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;

        back_wrap.select('.sc-background')
          .attr('width', renderWidth)
          .attr('height', renderHeight);

        xTickMaxWidth = Math.max(availableWidth * 0.2, 75);


        //------------------------------------------------------------
        // Title & Legend & Controls

        header
          .width(availableWidth)
          .height(availableHeight);

        container.call(header);

        // Recalc inner margins based on title, legend and control height
        headerHeight = header.getHeight();
        innerMargin.top += headerHeight;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;

        if (innerHeight < 100) {
          displayNoData(null, strings.displayError);
          return chart;
        }


        //------------------------------------------------------------
        // Main Chart Component(s)

        function getDimension(d) {
          if (d === 'width') {
            return innerWidth;
          } else if (d === 'height') {
            return innerHeight;
          } else {
            return 0;
          }
        }

        model
          .width(getDimension('width'))
          .height(getDimension('height'));
        model_wrap
          .datum(modelData)
          .call(model);


        //------------------------------------------------------------
        // Axes

        var yAxisMargin = {top: 0, right: 0, bottom: 0, left: 0},
            xAxisMargin = {top: 0, right: 0, bottom: 0, left: 0};

        function setInnerMargins() {
          xAxisMargin = xAxis.margin();
          yAxisMargin = yAxis.margin();
          innerMargin.left = Math.max(xAxisMargin.left, yAxisMargin.left);
          innerMargin.right = Math.max(xAxisMargin.right, yAxisMargin.right);
          innerMargin.top = Math.max(xAxisMargin.top, yAxisMargin.top);
          innerMargin.bottom = Math.max(xAxisMargin.bottom, yAxisMargin.bottom);
          setInnerDimensions();
        }

        function setInnerDimensions() {
          innerWidth = availableWidth - innerMargin.left - innerMargin.right;
          innerHeight = availableHeight - headerHeight - innerMargin.top - innerMargin.bottom;
          // Recalc chart dimensions and scales based on new inner dimensions
          model.resetDimensions(getDimension('width'), getDimension('height'));
        }

        function yAxisRender() {
          yAxis
            .tickSize(padding - innerWidth, 0)
            .margin(innerMargin);
          yAxis_wrap
            .call(yAxis);
          setInnerMargins();
        }

        function xAxisRender() {
          xAxis
            .tickSize(padding - innerHeight, 0)
            .margin(innerMargin);
          xAxis_wrap
            .call(xAxis);
          setInnerMargins();
        }

        // initial Y-Axis call
        yAxisRender();
        // initial X-Axis call
        xAxisRender();

        // recall Y-axis to set final size based on new dimensions
        yAxisRender();
        // recall X-axis to set final size based on new dimensions
        xAxisRender();
        // recall Y-axis to set final size based on new dimensions
        yAxisRender();

        // final call to lines based on new dimensions
        model_wrap
          .transition().duration(duration)
            .call(model);


        //------------------------------------------------------------
        // Final repositioning

        innerMargin.top += headerHeight;

        xpos = innerMargin.left;
        ypos = innerMargin.top + (xAxis.orient() === 'bottom' ? innerHeight : 0);
        xAxis_wrap
          .attr('transform', utility.translation(xpos, ypos));

        xpos = innerMargin.left + (yAxis.orient() === 'left' ? 0 : innerWidth);
        ypos = innerMargin.top;
        yAxis_wrap
          .attr('transform', utility.translation(xpos, ypos));

        model_wrap
          .attr('transform', utility.translation(innerMargin.left, innerMargin.top));

      };

      //============================================================

      chart.render();

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      //TODO: change legendClick to menuClick
      header.legend.dispatch.on('legendClick', function(series, i) {
        series.disabled = !series.disabled;

        // if there are no enabled data series, enable them all
        if (!data.filter(function(d) { return !d.disabled; }).length) {
          data.forEach(function(d) {
            d.disabled = false;
          });
        }
        state.disabled = data.map(function(d) { return !!d.disabled; });

        // on legend click, clear active cell state
        series.active = 'inactive';
        series.values.forEach(function(d) {
          d.active = 'inactive';
        });
        // if there are no active data series, unset active state
        if (!data.filter(function(d) { return d.active === 'active'; }).length) {
          chart.clearActive();
        }
        state.active = data.map(function(d) { return !!d.active; });

        chart.update();
        dispatch.call('stateChange', this, state);
      });

      header.controls.dispatch.on('legendClick', function(control, i) {
        //if the option is currently enabled (i.e., selected)
        if (!control.disabled) {
          return;
        }

        //set the controls all to false
        controlsData.forEach(function(control) {
          control.disabled = true;
        });
        //activate the the selected control option
        control.disabled = false;

        switch (control.key) {
          case 'Basis':
            model.interpolate('basis');
            break;
          case 'Linear':
            model.interpolate('linear');
            break;
          case 'Monotone':
            model.interpolate('monotone');
            break;
          case 'Cardinal':
            model.interpolate('cardinal');
            break;
          case 'Line':
            model.isArea(false);
            break;
          case 'Area':
            model.isArea(true);
            break;
        }
        state.interpolate = model.interpolate();
        state.isArea = model.isArea();

        chart.update();
        dispatch.call('stateChange', this, state);
      });

      dispatch.on('tooltipShow', function(eo) {
        if (tooltips) {
          if (hasGroupLabels) {
            // set the group rather than pass entire groupData
            eo.group = groupData[eo.groupIndex];
          }
          tt = showTooltip(eo, that.parentNode, properties);
        }
      });

      dispatch.on('tooltipMove', function(e) {
        if (tt) {
          tooltip.position(that.parentNode, tt, e, 's');
        }
      });

      dispatch.on('tooltipHide', function() {
        if (tooltips) {
          tooltip.cleanup();
        }
      });

      // Update chart from a state object passed to event handler
      dispatch.on('changeState', function(eo) {
        if (typeof eo.disabled !== 'undefined') {
          data.forEach(function(series, i) {
            series.disabled = eo.disabled[i];
          });
          state.disabled = eo.disabled;
        }

        if (typeof eo.interpolate !== 'undefined') {
          model.interpolate(eo.interpolate);
          state.interpolate = eo.interpolate;
        }

        if (typeof eo.isArea !== 'undefined') {
          model.isArea(eo.isArea);
          state.isArea = eo.isArea;
        }

        chart.update();
      });

      dispatch.on('chartClick', function() {
        //dispatch.call('tooltipHide', this);
        if (header.controls.enabled()) {
          header.controls.dispatch.call('closeMenu', this);
        }
        if (header.legend.enabled()) {
          header.legend.dispatch.call('closeMenu', this);
        }
      });

      model.dispatch.on('elementClick', function(eo) {
        if (hasGroupLabels && eo.groupIndex) {
          // set the group rather than pass entire groupData
          eo.group = groupData[eo.groupIndex];
        }
        dispatch.call('chartClick', this);
        model.dispatch.call('elementMouseout', this, eo);
        seriesClick(data, eo, chart, groupLabels);
      });

      container.on('click', function() {
        d3.event.stopPropagation();
        dispatch.call('chartClick', this);
      });

    });

    return chart;
  }

  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  model.dispatch.on('elementMouseover.tooltip', function(eo) {
    dispatch.call('tooltipShow', this, eo);
  });

  model.dispatch.on('elementMousemove.tooltip', function(e) {
    dispatch.call('tooltipMove', this, e);
  });

  model.dispatch.on('elementMouseout.tooltip', function(eo) {
    // need eo for removing hover class on element
    dispatch.call('tooltipHide', this, eo);
  });

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.dispatch = dispatch;
  chart.lines = model;
  chart.legend = header.legend;
  chart.controls = header.controls;
  chart.xAxis = xAxis;
  chart.xAxisLabel = xAxis.axisLabel;
  chart.yAxis = yAxis;
  chart.yAxisLabel = yAxis.axisLabel;
  chart.options = utility.optionsFunc.bind(chart);

  utility.rebind(chart, model,
    'id', 'x', 'y', 'xScale', 'yScale', 'xDomain', 'yDomain', 'forceX', 'forceY', 'clipEdge',
    'color', 'fill', 'classes', 'gradient', 'locality'
  );
  utility.rebind(chart, model, 'defined', 'isArea', 'interpolate', 'size', 'clipVoronoi', 'useVoronoi', 'interactive', 'nice');
  utility.rebind(chart, header, 'showTitle', 'showControls', 'showLegend');
  utility.rebind(chart, xAxis, 'rotateTicks', 'reduceXTicks', 'staggerTicks', 'wrapTicks');

  chart.colorData = function(_) {
    var type = arguments[0],
        params = arguments[1] || {};
    var color = function(d) {
          return utility.defaultColor()(d, d.seriesIndex);
        };
    var classes = function(d) {
          return 'sc-series sc-series-' + d.seriesIndex;
        };

    switch (type) {
      case 'graduated':
        color = function(d) {
          return d3.interpolateHsl(d3.rgb(params.c1), d3.rgb(params.c2))(d.seriesIndex / params.l);
        };
        break;
      case 'class':
        color = function() {
          return 'inherit';
        };
        classes = function(d) {
          var i = d.seriesIndex;
          var iClass = (i * (params.step || 1)) % 14;
          iClass = (iClass > 9 ? '' : '0') + iClass;
          return 'sc-series sc-series-' + i + ' sc-fill' + iClass + ' sc-stroke' + iClass;
        };
        break;
      case 'data':
        color = function(d) {
          return utility.defaultColor()(d, d.seriesIndex);
        };
        classes = function(d) {
          var i = d.seriesIndex;
          return 'sc-series sc-series-' + i + (d.classes ? ' ' + d.classes : '');
        };
        break;
    }

    model.color(color);
    model.fill(color);
    model.classes(classes);

    // don't enable this since controls get a custom function
    // controls.color(color);
    // controls.classes(classes);
    header.legend.color(color);
    header.legend.classes(classes);

    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) { return margin; }
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        margin[prop] = _[prop];
      }
    }
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) { return width; }
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) { return height; }
    height = _;
    return chart;
  };

  chart.tooltips = function(_) {
    if (!arguments.length) { return tooltips; }
    tooltips = _;
    return chart;
  };

  chart.tooltipContent = function(_) {
    if (!arguments.length) { return tooltipContent; }
    tooltipContent = _;
    return chart;
  };

  chart.state = function(_) {
    if (!arguments.length) { return state; }
    state = _;
    dispatch.call('stateChange', this, state);
    return chart;
  };

  chart.strings = function(_) {
    if (!arguments.length) { return strings; }
    strings = language(_);
    header.strings(strings);
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    model.direction(_);
    xAxis.direction(_);
    yAxis.direction(_);
    header.direction(_);
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) { return duration; }
    duration = _;
    model.duration(_);
    return chart;
  };

  chart.delay = function(_) {
    if (!arguments.length) { return delay; }
    delay = _;
    model.delay(_);
    return chart;
  };

  chart.xValueFormat = function(_) {
    if (!arguments.length) {
      return xValueFormat;
    }
    xValueFormat = _;
    return chart;
  };

  chart.yValueFormat = function(_) {
    if (!arguments.length) {
      return yValueFormat;
    }
    yValueFormat = _;
    return chart;
  };

  chart.seriesClick = function(_) {
    if (!arguments.length) { return seriesClick; }
    seriesClick = _;
    return chart;
  };

  chart.pointRadius = function(_) {
    if (!arguments.length) { return pointRadius; }
    pointRadius = _;
    return chart;
  };

  //============================================================

  return chart;
}

var transform = (function() {

  function getArrayX(d) {
    return d[0];
  }
  function getArrayY(d) {
    return d[1];
  }
  function getObjectX(d) {
    return d.x;
  }
  function getObjectY(d) {
    return d.y;
  }
  function getIndexX(d, i) {
    return i;
  }
  function getValueY(d) {
    return d;
  }

  function hasValue(d) {
    //true => {y: 11} || {value: 11}
    return d.hasOwnProperty('value') || d.hasOwnProperty('y');
  }

  function hasValues(series) {
    //true => [{}, {}] || [[], []]
    return Array.isArray(series.values) && series.values.length;
  }

  function hasSingleValue(series) {
    //true => [{}]
    return hasValues(series) && series.values.length === 1;
  }

  function dataHasValues(type, data) {
    var valuesTypes = ['multibar', 'line', 'area', 'pie', 'funnel', 'gauge'];
    return valuesTypes.indexOf(type) !== -1 &&
      Array.isArray(data) &&
      data.filter(function(series) {
        return hasValues(series) || hasValue(series);
      }).length > 0;
  }

  function dataHasGroups(type, groups) {
    var valueTypes = ['multibar', 'line', 'area'];
    return valueTypes.indexOf(type) !== -1 && Array.isArray(groups) && groups.length > 0;
  }

  function isArrayOfArrays(values) {
    return Array.isArray(values) && values.length > 0 && Array.isArray(values[0]);
  }

  function isArrayOfObjects(values) {
    return Array.isArray(values) && values.length > 0 && hasValue(values[0]);
  }

  function pickLabel(d) {
    // d can be {label:'abc'} ['abc'] or 'abc'
    // var l = [].concat(label)[0];
    return typeof d !== 'undefined' && String(d.hasOwnProperty('label') ? d.label : d).toString() || strNoLabel;
  }

  function getKey(d) {
    return typeof d !== 'undefined' && d.hasOwnProperty('key') ? String(d.key).toString() || strNoLabel : pickLabel(d);
  }

  function preserveAttributes(series, d) {
    if (series.hasOwnProperty('disabled')) {
      d.disabled = series.disabled;
    }
    if (series.hasOwnProperty('color')) {
      d.color = series.color;
    }
    if (series.hasOwnProperty('classes')) {
      d.classes = series.classes;
    }
  }


  //TODO: needs to get current language
  var strNoLabel = language().translate('noLabel');

  var transformData = function(json, chartType, barType) {
    var properties = json.properties ? Array.isArray(json.properties) ? json.properties[0] : json.properties : {},
        seriesData = [],
        data = [],
        groupData = [];

    var valuesAreArrays = false,
        valuesAreObjects = false,
        valuesAreDiscrete = false;

    var xIsDatetime = properties.xDataType === 'datetime' || false,
        xIsNumeric = properties.xDataType === 'numeric' || false;

    var xIsOrdinal = false;

    var getX, getY, parseX, parseY;


    //============================================================
    // Common Functions
    //------------------------------------------------------------
    //TODO: make these public methods for reuse/testing

    // build group from faw Sugar data values values
    function getGroup(d, i) {
      var g = {
        group: i + 1,
        label: pickLabel(d) // either "One" for d.label
      };
      // raw data values [20, 40, 60] get summed
      if (d.values) {
        g.total = sumValues(d);
      }
      return g;
    }

    function sumValues(d) {
      var sum = 0;
      if (d.hasOwnProperty('value')) {
        sum = d.value;
      } else if (d.hasOwnProperty('y')) {
        sum = d.y;
      } else if (d.hasOwnProperty('values')) {
        sum = d3.sum(d.values, parseY);
      } else if (utility.isNumeric(d)) {
        sum = d;
      }
      return sum;
      // 0 is default value if reducing an empty list
      // return d.values ? d.values.reduce(function(a, b) { return a + parseFloat(b); }, 0) : 0;
    }

    function valueMap(v, i) {
      var vo = valuesAreObjects ? v : {};
      vo.x = parseX(v, i);
      vo.y = parseY(v, i);
      return vo;
    }

    // update x and y in value
    function valueReduce(a, c) {
      return c.values.map(function(value, v) {
          var vo = valuesAreObjects ? value : {};
          var y = getY(value, v) + getY(a.values[v], v);
          vo.x = parseX(value, v);
          vo.y = parseFloat(y);
          return vo;
        });
    }

    function seriesMap(series) {
      var d, values;
      values = series.values.map(valueMap);
      d = {
        key: getKey(series),
        values: values
      };
      preserveAttributes(series, d);
      return d;
    }

    function discreteMapIdentity(series, i, data) {
      var d, values;
      values = data.map(function(v, j) {
        var value = v.values[0];
        if (i === j) {
          return valueMap(value, j);
        } else {
          return {
            x: parseX(value, j),
            y: 0
          };
        }
      });
      d = {
        key: getKey(series),
        values: values
      };
      preserveAttributes(series, d);
      return d;
    }

    function discreteMap(series, i) {
      var d, values;
      values = [valueMap(series.values[i] || series.values[0], i)];
      d = {
        key: getKey(series),
        values: values
      };
      preserveAttributes(series, d);
      return d;
    }

    function processCSVData(properties, csv) {
      // json.values => [
      //   ["Year", "A", "B", "C"],
      //   [1970, 0.3, 2, 0.1],
      //   [1971, 0.5, 2, 0.1],
      //   [1972, 0.7, 3, 0.2]
      // ]
      var seriesKeys, transposeData;

      // the first row is a row of strings
      // then extract first row header labels as series keys
      seriesKeys = properties.keys || csv.shift().splice(1);
      // keys => ["A", "B", "C"]

      // reset groupData because it will be rebuilt from values
      //artifact, boo
      //TODO: should we set group total to gvalue?
      groupData = [];
      // something like:
      // groupData => ["One", "Two", "Three"]

      // json.values => [
      //   [1970, 0.3, 2, 0.1],
      //   [1971, 0.5, 2, 0.1],
      //   [1972, 0.7, 3, 0.2]
      // ]
      transposeData = d3.transpose(
          csv.map(function(row, i) {
            // this is a row => [1970, 0.7, 3, 0.2]
            // this is a row => ["One", 0.7, 3, 0.2]

            // extract first column as x value
            // var x = row.splice(0, 1)[0];
            var x = row.shift();

            if (!xIsDatetime && !xIsNumeric) {
              // extract the first column into the properties category label array
              // {group: i, label: x}
              groupData.push(getGroup(x, i));
              // not needed
              // xIsOrdinal = true;
            }

            return row.map(function(value) {
                // row => [0.7, 3, 0.2]]
                // first column is datetime or is numeric
                if (xIsDatetime || xIsNumeric) {
                  // if x is an integer date then treating as integer
                  // is ok because xDataType will force formatting on render
                  // what about "June 1970"
                  return [x, value];
                }
                // ... or is ordinal
                // increment
                else {
                  return [i + 1, value];
                }
              });
          })
        );

      seriesData = seriesKeys.map(function(key, i) {
          return {
              key: key,
              values: transposeData[i]
            };
        });
    }

    //============================================================
    // Parse Json data

    // json.values = [[],[],[]]
    if (isArrayOfArrays(json.values)) {
      // process CSV values with seriesData and groupData artifacts
      processCSVData(properties, json.values);
    } else {
      if (json.values) {
        // process Sugar report data
        seriesData = json.values;
        groupData = json.label || [];
      } else {
        // process Standard Data Model (SDM)
        seriesData = json.data;
        groupData = properties.groups || properties.labels || properties.label || [];
      }
    }

    xIsOrdinal = dataHasGroups(chartType, groupData);
    // Wrong!! true for line but not discrete multibar
     // && groupData.length === seriesData[0].values.length;


    //============================================================
    // Main

    if (dataHasValues(chartType, seriesData)) {
      // json.values => [[0,20],[1,20]]
      valuesAreArrays = isArrayOfArrays(seriesData[0].values);
      // or SDM => [{x:1,y:20},{x:2,y:40}]
      valuesAreObjects = isArrayOfObjects(seriesData[0].values);
      getX = valuesAreArrays ? getArrayX : valuesAreObjects ? getObjectX : getIndexX;
      getY = valuesAreArrays ? getArrayY : valuesAreObjects ? getObjectY : getValueY;
      valuesAreDiscrete = areValuesDiscrete(seriesData, groupData, getX, getY);

      parseX = xIsOrdinal
        ? function(d, i) {
          // expand x for each series
          // [['a'],['b'],['c']] =>
          // [[0,'a'],[1,'b'],[2,'c']]
          return i + 1;
        }
        : xIsDatetime
          ? function(d, i) {
            var x, dateString, date;
            x = getX(d, i);
            // x => 1970, x => '1/1/1980', x => '1980-1-1', x => 1138683600000
            // if the date value provided is a year
            // append day and month parts to get correct UTC offset
            // x = x + '-1-1';
            // else if x is an integer date then treating as integer
            // is ok because xDataType will force formatting on render
            dateString = x.toString().length === 4 ? '1/1/' + x.toString() : x;
            if (typeof dateString === 'string' && dateString.indexOf('GMT') === -1) {
              dateString += ' GMT';
            }
            date = new Date(dateString);
            return date.valueOf();
          }
          : xIsNumeric
          // convert flat array to indexed arrays
          // [['a','b'],['c','d']] => [[[0,'a'],[1,'b']],[[0,'c'],[1,'d']]]
          // function(d, i, j) {
          //   return j + 1;
          // } :
            ? function(d, i) {
              return parseFloat(getX(d, i));
            }
            : function(d, i) {
              return getX(d, i);
            };
      parseY = function(d, i) {
        return parseFloat(getY(d, i));
      };

      switch (chartType) {

        case 'multibar':
          // basic
          if (barType === 'basic') {
            if (seriesData.length === 1) {
              // json = [
              //   {key: 'series1', values: [{x:1, y:5}, {x:2, y:8}, {x:3, y:1}]}
              // ]
              data = seriesData.map(seriesMap);
            } else {
              // json = [
              //   {key: 'series1', values: [{x:1, y:5}, {x:2, y:8}, {x:3, y:1}]},
              //   {key: 'series2', values: [{x:1, y:3}, {x:2, y:4}, {x:3, y:7}]}
              // ]
              data = [{
                key: properties.key || 'Series 0',
                values: seriesData.reduce(valueReduce)
              }];
            }
            properties.colorLength = data[0].values.length;
          }
          // discrete
          else if (valuesAreDiscrete) {
            // [
            //   {key: series1, values: [{x:1, y:5}]},
            //   {key: series2, values: [{x:2, y:8}]}
            // ]
            data = seriesData.map(discreteMap);
          }
          // all others
          else {
            data = seriesData.map(seriesMap);
          }

          break;

        case 'gauge':
        case 'pie':
          data = seriesData.map(function(series) {
              var d;
              d = {
                key: getKey(series),
                // can be:
                // values: [20, 40, 60]
                // values: [{y:20}, {y:40}, {y:60}]
                value: sumValues(series)
              };
              preserveAttributes(series, d);
              return d;
            });
          break;

        case 'funnel':
          data = seriesData.reverse().map(function(series, s) {
              var y, d;
              y = d3.sum(series.values, getY);
              d = {
                key: getKey(series),
                values: [{
                  series: s,
                  x: 0,
                  y: y,
                  y0: 0
                }]
              };
              preserveAttributes(series, d);
              return d;
            });
          break;

        case 'area':
        case 'line':
          // convert array of arrays into array of objects
          data = seriesData.map(seriesMap);
          break;
      }

      getX = getObjectX;
      getY = getObjectY;

      // Multibar process data routine
        // // add series index to each data point for reference
        // data.forEach(function(series, s) {
        //   // make sure untrimmed values array exists
        //   // and set immutable series values
        //   if (!series._values) {
        //     //      then we set d.x&y to d.data.x&y
        //     series._values = series.values.map(function(value, v) {
        //       return {
        //         'x': value.x,
        //         'y': value.y
        //       };
        //     });
        //   }
        //   series.values = series._values.map(function(value, v) {
        //       return {
        //         'seriesIndex': series.seriesIndex,
        //         'group': v,
        //         'color': typeof series.color !== 'undefined' ? series.color : '',
        //         'x': model.x()(value, v),
        //         'y': model.y()(value, v),
        //         'y0': value.y + (s > 0 ? data[series.seriesIndex - 1].values[v].y0 : 0),
        //         'active': typeof series.active !== 'undefined' ? series.active : ''
        //       };
        //     });
      // });

      // don't override json.properties entirely, just modify/append
      if (dataHasGroups(chartType, groupData)) {
        properties.groups = groupData.map(getGroup);
      } else {
        delete properties.groups;
      }
      if (!properties.hasOwnProperty('colorLength')) {
        properties.colorLength = data.length;
      }

      // post process data for total and disabled states
      data.forEach(function(series, s) {
        series.seriesIndex = s;
        series.total = sumValues(series);
        // disabled if all values in series are zero
        // or the series was disabled by the legend
        if (!series.total) {
          series.disabled = true;
        }
      });

    } else {

      switch (chartType) {
        case 'bubble':
          if (!json.data) {
            var salesStageMap = {
                  'Negotiation/Review': 'Negotiat./Review',
                  'Perception Analysis': 'Percept. Analysis',
                  'Proposal/Price Quote': 'Proposal/Quote',
                  'Id. Decision Makers': 'Id. Deciders'
                };
            properties = {
                title: 'Bubble Chart Data',
                yDataType: 'string',
                xDataType: 'datetime',
                colorLength: json.records.length
              };
            data = json.records.map(function (d) {
                return {
                  id: d.id,
                  x: d.date_closed,
                  y: Math.round(parseInt(d.likely_case, 10) / parseFloat(d.base_rate)),
                  shape: 'circle',
                  account_name: d.account_name,
                  assigned_user_name: d.assigned_user_name,
                  sales_stage: d.sales_stage,
                  sales_stage_short: salesStageMap[d.sales_stage] || d.sales_stage,
                  probability: parseInt(d.probability, 10),
                  base_amount: parseInt(d.likely_case, 10),
                  currency_symbol: '$'
                };
              });
          } else {
            properties = json.properties;
            data = json.data;
          }
          break;

        case 'pareto':
          properties = json.properties;
          data = json.data;
          break;
      }
    }


    //============================================================
    // Return chart data

    return {
      properties: properties,
      data: data
    };
  };

  var areValuesDiscrete = function(data, groups, getX, getY) {
    var uniqueX = null;
    var identityY = null;
    var hasGroupData = Array.isArray(groups) && groups.length > 0 && groups.length === data.length;

    function xIsUnique(data, getX) {
      return data.reduce(function(aS, cS) {
          return cS.values.reduce(function(aV, cV) {
              var x = getX(cV);
              if (aV.indexOf(x) === -1) {
                aV.push(x);
              }
              return aV;
            }, aS);
        }, []).length === data.length;
    }

    function yIsIdentity(data, getY) {
      // data length is same as values length
      return data.length === data[0].values.length &&
        // all series have a max of one value that is not zero
        data.filter(function(series) {
          return series.values.filter(function(value) {
              return getY(value) !== 0;
            }).length <= 1;
        }).length === data.length;
    }

    function seriesKeyMatchesGroupLabel(series, groups, i) {
      return getKey(series) === pickLabel(groups[i]);
    }

    function xValuesAreUnique(d, getX) {
      return uniqueX === null ? xIsUnique(d, getX) : uniqueX;
    }
    function yValuesAreIdentity(d, getY) {
      return identityY === null ? yIsIdentity(d, getY) : identityY;
    }

    return data.reduce(function(a, c, i) {
        if (!a) {
          return false;
        }
        // pie chart: {key: 'Series A', y: 11}
        return hasValue(c) ||
          ( // Sugar discrete only: {key: 'Series A', values: [11]}
            // or SCM {key: 'Series A', values: [{x:1, y:11}]}
            hasSingleValue(c) &&
            ( // Sugar implied ordinal where series key equals group label
              (hasGroupData && seriesKeyMatchesGroupLabel(c, groups, i)) ||
              // or [{key: 'Series A', values: [{x:1, y:11}]}, {key: 'Series B', values: [{x:2, y:7}]}]
              xValuesAreUnique(data, getX)
            )
          ) ||
          ( // CSV datetime or numeric because they don't have groups
            // or Sugar implied ordinal where series key equals group label
            // and only the nth value in nth series is not zero
            (!hasGroupData || seriesKeyMatchesGroupLabel(c, groups, i)) &&
            yValuesAreIdentity(data, getY)
          );
      }, true);
  };

  transformData.areValuesDiscrete = areValuesDiscrete;

  return transformData;
})();

function multibarChart() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 10, right: 10, bottom: 10, left: 10},
      width = null,
      height = null,
      direction = 'ltr',
      delay = 0,
      duration = 0,
      tooltips = true,
      state = {},
      strings = language();

  var dispatch = d3.dispatch(
        'chartClick', 'elementClick', 'tooltipShow', 'tooltipHide', 'tooltipMove',
        'stateChange', 'changeState'
      );

  var vertical = true,
      scrollEnabled = true,
      hideEmptyGroups = true,
      overflowHandler = function(d) { return; };
  var locale = {};

  var xValueFormat = function(d, i, label, isDate, dateFormat) {
        // If ordinal, label is provided so use it.
        // If date or numeric use d.
        var value = label || d;
        var formatter;
        if (isDate) {
          formatter = !dateFormat || dateFormat.indexOf('%') !== 0 ? '%x' : dateFormat;
          return utility.dateFormat(value, formatter, locale);
        } else {
          return value;
        }
      };

  var yValueFormat = function(d, i, isCurrency, precision, si) {
        return utility.numberFormatSIFixed(d, precision, isCurrency, locale, si);
      };

  var valueFormat = function(d, i, label, isCurrency) {
        return label || utility.numberFormatSI(d, 0, isCurrency, locale);
      };

  var tooltipContent = function(eo, properties) {
        // the event object group is set by event dispatcher if x is ordinal
        var group = eo.group || {};
        // this is the ordinal index [0+1..n+1] or value index [0..n]
        var x = eo.point.x;
        var y = eo.point.y;
        var xIsDatetime = properties.xDataType === 'datetime';
        var yIsCurrency = properties.yDataType === 'currency';
        // var valueLabel = yValueFormat(y, eo.seriesIndex, null, yIsCurrency, 2);
        // we can't use yValueFormat because it needs SI units for axis
        // for tooltip, we want the full value
        var point = {
          seriesName: properties.seriesName || strings.tooltip.key,
          seriesLabel: eo.series.key,
          groupName: properties.groupName || (xIsDatetime ? strings.tooltip.date : strings.tooltip.group),
          groupLabel: xValueFormat(x, eo.pointIndex, group.label, xIsDatetime, '%x'),
          valueName: yIsCurrency ? strings.tooltip.amount : strings.tooltip.count,
          valueLabel: utility.numberFormat(y, null, yIsCurrency, locale)
        };

        var percent;
        if (eo.group && utility.isNumeric(eo.group._height)) {
          percent = Math.abs(y * 100 / eo.group._height).toFixed(1);
          point.percent = utility.numberFormat(percent, 2, false, locale);
        }

        return tooltip.multi(point, strings);
      };

  var seriesClick = function(data, eo, chart, labels) {
        return;
      };

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  // Chart components
  var model = multibar();
  var header = headers();
  var xAxis = axis();
  var yAxis = axis();

  // Scroll variables
  var useScroll = false;
  var scrollOffset = 0;
  var scroll = scroller().id(model.id());

  var tt = null;

  var showTooltip = function(eo, offsetElement, properties) {
        var content = tooltipContent(eo, properties);
        var gravity = eo.value < 0 ?
              vertical ? 'n' : 'e' :
              vertical ? 's' : 'w';
        return tooltip.show(eo.e, content, gravity, null, offsetElement);
      };

  header
    .showTitle(true)
    .showControls(true)
    .showLegend(true);


  //============================================================

  function chart(selection) {

    selection.each(function(chartData) {

      var that = this,
          container = d3.select(this),
          modelClass = vertical ? 'multibar' : 'multibar-horizontal';

      var properties = chartData ? chartData.properties || {} : {},
          data = chartData ? chartData.data || null : null;

      var containerWidth = parseInt(container.style('width'), 10),
          containerHeight = parseInt(container.style('height'), 10);

      var availableWidth = width,
          availableHeight = height;

      var xIsDatetime = properties.xDataType === 'datetime' || false,
          xIsNumeric = properties.xDataType === 'numeric' || false,
          yIsCurrency = properties.yDataType === 'currency' || false;

      var groupData = properties.groups,
          hasGroupData = Array.isArray(groupData) && groupData.length > 0,
          groupLabels = [],
          groupCount = 0,
          hasGroupLabels = false,
          isDiscrete = false;

      var modelData = [],
          seriesCount = 0,
          totalAmount = 0;

      var baseDimension = model.stacked() ? vertical ? 72 : 32 : 32;

      var controlsData = [
        {key: 'Grouped', disabled: model.stacked()},
        {key: 'Stacked', disabled: !model.stacked()}
      ];

      chart.update = function() {
        container.transition().duration(duration).call(chart);
      };

      chart.setActiveState = function(series, state) {
        series.active = state;
        series.values.forEach(function(v) {
          v.active = state;
        });
      };

      chart.clearActive = function(reset) {
        data.forEach(function(s) {
          chart.setActiveState(s, reset || '');
        });
        delete state.active;
      };

      // only accepts an event object with seriesIndex
      chart.cellActivate = function(eo) {
        // seriesClick is defined outside chart scope, so when it calls
        // cellActivate, it only has access to (data, eo, chart, labels)
        var cell = data[eo.seriesIndex].values[eo.pointIndex];
        var activeState;
        if (!cell) {
          return;
        }
        // store toggle active state
        activeState = (
            typeof cell.active === 'undefined' ||
            cell.active === 'inactive' ||
            cell.active === ''
          ) ? 'active' : '';
        // unset entire active state first
        chart.clearActive();
        cell.active = activeState;
      };

      // accepts either an event object with actual series data or seriesIndex
      chart.seriesActivate = function(eo) {
        var series = eo.series || data[eo.seriesIndex];
        var activeState;
        if (!series) {
          return;
        }
        // store toggle active state
        activeState = (
            typeof series.active === 'undefined' ||
            series.active === 'inactive' ||
            series.active === ''
          ) ? 'active' : '';
        // inactivate all series
        chart.clearActive(activeState === 'active' ? 'inactive' : '');
        // then activate the selected series
        chart.setActiveState(series, activeState);
        // set the state to a truthy map
        state.active = data.map(function(s) {
          return s.active === 'active';
        });
      };

      // accepts either an event object with actual series data or seriesIndex
      chart.dataSeriesActivate = function(eo) {
        var series = eo.series || data[eo.seriesIndex];
        var activeState;
        if (!series) {
          return;
        }
        // toggle active state
        activeState = (
            typeof series.active === 'undefined' ||
            series.active === 'inactive' ||
            series.active === ''
          ) ? 'active' : 'inactive';
        if (activeState === 'active') {
          // if you have activated a data series,
          chart.seriesActivate(eo);
        } else {
          // if there are no active data series, unset entire active state
          chart.clearActive();
        }
      };

      chart.container = this;


      //------------------------------------------------------------
      // Private method for displaying no data message.

      function displayNoData(data, msg) {
        var hasData = data && data.length && data.filter(function(series) {
          return !series.disabled && Array.isArray(series.values) && series.values.length;
        }).length;
        var x = (containerWidth - margin.left - margin.right) / 2 + margin.left;
        var y = (containerHeight - margin.top - margin.bottom) / 2 + margin.top;
        return utility.displayNoData(hasData, container, (msg || strings.noData), x, y);
      }

      // Check to see if there's nothing to show.
      if (displayNoData(data)) {
        return chart;
      }


      //------------------------------------------------------------
      // Process data

      locale = chart.locality();

      function getSeriesValues(value, i) {
        var d = {
          x: value.x,
          y: value.y
        };
        if (typeof value.label !== 'undefined') {
          d.label = value.label;
        }
        if (value.active) {
          d.active = value.active;
        }
        return d;
      }

      // add series index to each data point for reference
      // and disable data series if total is zero
      data
        .forEach(function(series, s) {
          // make sure untrimmed values array exists
          // and set immutable series values
          // 'x' & 'y', 'label' and 'active' are the only attributes allowed in values
          if (!series._values) {
            series._values = series.values.map(getSeriesValues);
          }

          series.seriesIndex = s;
          series.key = series.key || strings.noLabel;
          series.total = d3.sum(series._values, function(value, v) {
            return value.y;
          });

          // disabled if all values in series are zero
          // or the series was disabled by the legend
          series.disabled = series.disabled || series.total === 0;
        });

      // Remove disabled series data
      modelData = data
        .filter(function(series) {
          return !series.disabled;
        })
        .map(function(series, s) {
          // this is the iterative index, not the data index called seriesIndex
          series.seri = s;

          // reconstruct values referencing series attributes and stack
          series.values = series._values.map(function(value, v) {
              var d = getSeriesValues(value, v);
              d.groupIndex = xIsDatetime || xIsNumeric ? v : value.x - 1;
              d.seriesIndex = series.seriesIndex;
              d.seri = series.seri;
              d.color = series.color || '';
              return d;
            });

          return series;
        });

      seriesCount = modelData.length;

      // Display No Data message if there's nothing to show.
      if (displayNoData(modelData)) {
        return chart;
      }

      // -------------------------------------------
      // Get group data from properties or modelData

      function setGroupLabels(groupData) {
        // Get simple array of group labels for ticks
        groupLabels = groupData.map(function(group) {
            return group.label;
          });
        groupCount = groupLabels.length;
        hasGroupLabels = groupCount > 0;
      }

      if (hasGroupData) {

        // Calculate group totals and height
        // based on enabled data series
        groupData
          .forEach(function(group, g) {
            var label = typeof group.label === 'undefined' || group.label === ''
              ? strings.noLabel
              : !xIsDatetime
                ? group.label
                : utility.isNumeric(group.label) || group.label.indexOf('GMT') !== -1
                  ? new Date(group.label)
                  : new Date(group.label + ' GMT');
            group.group = g,
            group.label = label;
            group.total = 0;
            group._height = 0;
          });

      } else {
        // support for uneven value lengths
        // groupData = d3
        // .merge(modelData.map(function(series) {
        //   return series.values;
        // }))
        // .reduce(function(a, b) {
        //   if (a.indexOf(b.x) === -1) {
        //     a.push(b.x);
        //   }
        //   return a;
        // }, [])
        groupData = modelData[0].values.map(function(value, v) {
            return {
              group: v,
              label: xIsDatetime ? new Date(value.x) : value.x,
              total: 0,
              _height: 0
            };
          });
      }

      setGroupLabels(groupData);

      isDiscrete = transform.areValuesDiscrete(modelData, groupData, model.x(), model.y());

      // Calculate group totals and height
      // based on enabled data series
      groupData
        .forEach(function(group, g) {
          var pos = 0;
          var neg = 0;

          //TODO: only sum enabled series
          // update group data with values
          modelData
            .forEach(function(series, s) {
              //TODO: there is a better way with map reduce?
              series.values
                .filter(function(value, v) {
                  return value.groupIndex === g;
                })
                .forEach(function(value, v) {
                  value.size = Math.abs(value.y);
                  group._height += value.size;
                  group.total += value.y;
                  if (value.y < 0) {
                    value.y0 = (isDiscrete ? 0 : neg) - (vertical ? 0 : value.size);
                    neg -= value.size;
                  } else {
                    value.y0 = (isDiscrete ? 0 : pos) + (vertical ? value.size : 0);
                    pos += value.size;
                  }
                });
            });

          group.neg = {
              label: valueFormat(neg),
              y: neg
            };
          group.pos = {
              label: valueFormat(pos),
              y: pos
            };
        });

      if (hideEmptyGroups) {
        // build a trimmed array for active group only labels
        setGroupLabels(groupData.filter(function(group, g) {
          return group._height !== 0;
        }));

        // build a discrete array of data values for the multibar
        // based on enabled data series
        // referencing the groupData
        modelData
          .forEach(function(series, s) {
            // reset series values to exlcude values for
            // groups that have all zero values
            // this is why we need to preserve series._values
            series.values = series.values
              .filter(function(value, v) {
                return groupData[value.groupIndex]._height !== 0;
              })
              .map(function(value, v) {
                // this is the new iterative index, not the data index
                // value.seri = series.seri;
                return value;
              });
            return series;
          });

        // Display No Data message if there's nothing to show.
        if (displayNoData(modelData)) {
          return chart;
        }
      }

      totalAmount = d3.sum(groupData, function(group) {
        return group.total;
      });


      //------------------------------------------------------------
      // Configure axis and bar format functions

          //TODO: allow formatter to be set by data
      var xTickMaxWidth = 75,
          xDateFormat = null,
          xAxisFormat = null,
          yAxisFormat = null,
          barFormat = null,
          maxGroup = 0;

      var valuesAreIntegers = d3.max(d3.merge(modelData.map(function(series) {
            return series.values.map(function(value) {
              var y = model.y()(value);
              return utility.countSigFigsAfter(y);
            });
          }))) === 0;

      if (valuesAreIntegers) {
        maxGroup = d3.max(groupData, function(group) {
          return group.total;
        });
      }

      var yAxisFormatProperties = {
        axis: null,
        maxmin: null
      };

      function setAxisFormatProperties(type, selection) {
        // i.e., [100, 200, 300]
        var tickDatum = selection.map(function(t) {
            return d3.select(t).datum();
          });
        // i.e., 1 | 1000 | 1000000
        var decimal = d3.max(d3.extent(tickDatum), function(v) {
            return utility.siDecimal(Math.abs(v));
          });
        // number of significant figures after the decimal
        var precision = d3.max(tickDatum, function(v) {
            var numberString = d3.formatPrefix('.2s', decimal)(v);
            return utility.countSigFigsAfter(numberString);
          });
        if (type === 'maxmin' && yAxisFormatProperties.axis) {
          precision = Math.max(yAxisFormatProperties.axis.precision, precision);
        }
        yAxisFormatProperties[type] = {
          decimal: decimal,
          precision: precision
        };
        return yAxisFormatProperties[type];
      }

      if (xIsDatetime) {
        xDateFormat = utility.getDateFormatUTC(groupLabels);
      }

      xAxisFormat = function(value, v, selection, type) {
        //NOTE: there isn't  always groupLabels
        var groupLabel = hasGroupLabels ? groupLabels[v] : value;
        var label = xValueFormat(value, v, groupLabel, xIsDatetime, xDateFormat);
        return type === 'no-ellipsis' ?
          label :
          utility.stringEllipsify(label, container, xTickMaxWidth);
      };

      yAxisFormat = function(value, v, selection, type) {
        var props = yAxisFormatProperties[type] || setAxisFormatProperties(type, selection);
        return yValueFormat(value, v, yIsCurrency, props.precision, props.decimal);
      };

      barFormat = function(value, v, label) {
        return valueFormat(value, v, label, yIsCurrency);
      };


      //------------------------------------------------------------
      // State persistence model

      state.disabled = modelData.map(function(d) { return !!d.disabled; });
      state.active = modelData.map(function(d) { return d.active === 'active'; });
      state.stacked = model.stacked();


      //------------------------------------------------------------
      // Set component attributes

      header
        .chart(chart)
        .title(properties.title)
        .controlsData(controlsData)
        .legendData(data);

      // we want the bar value label to not show decimals (confirm) with SI
      model
        .valueFormat(barFormat);

      // any time orient is called it resets the d3-axis model and has to be reconfigured
      xAxis
        .orient(vertical ? 'bottom' : 'left')
        .scale(model.xScale())
        .valueFormat(xAxisFormat)
        .tickSize(0)
        .tickPadding(4)
        .highlightZero(false)
        .showMaxMin(false);

      yAxis
        .orient(vertical ? 'left' : 'bottom')
        .scale(model.yScale())
        .valueFormat(yAxisFormat)
        .tickPadding(4)
        .showMaxMin(true);


      //------------------------------------------------------------
      // Main chart wrappers

      var wrap_bind = container.selectAll('g.sc-chart-wrap').data([modelData]);
      var wrap_entr = wrap_bind.enter().append('g')
            .attr('class', 'sc-chart-wrap sc-chart-' + modelClass);
      var wrap = container.select('.sc-chart-wrap').merge(wrap_entr);

      wrap_entr.append('defs');
      var defs = wrap.select('defs');

      wrap_entr.append('g').attr('class', 'sc-background-wrap');
      var back_wrap = wrap.select('.sc-background-wrap');

      wrap_entr.append('g').attr('class', 'sc-title-wrap');

      wrap_entr.append('g').attr('class', 'sc-axis-wrap sc-axis-y');
      var yAxis_wrap = wrap.select('.sc-axis-wrap.sc-axis-y');

      /* Append scroll group with chart mask */
      wrap_entr.append('g').attr('class', 'sc-scroll-wrap');
      var scroll_wrap = wrap.select('.sc-scroll-wrap');

      wrap_entr.select('.sc-scroll-wrap').append('g')
        .attr('class', 'sc-axis-wrap sc-axis-x');
      var xAxis_wrap = wrap.select('.sc-axis-wrap.sc-axis-x');

      wrap_entr.select('.sc-scroll-wrap').append('g')
        .attr('class', 'sc-bars-wrap');
      var model_wrap = wrap.select('.sc-bars-wrap');

      wrap_entr.append('g').attr('class', 'sc-controls-wrap');
      wrap_entr.append('g').attr('class', 'sc-legend-wrap');

      wrap.attr('transform', utility.translation(margin.left, margin.top));
      if (scrollEnabled) {
        scroll(wrap, wrap_entr, scroll_wrap, xAxis);
      } else {
        wrap_entr.select('.sc-background-wrap').append('rect')
          .attr('class', 'sc-background')
          .attr('x', -margin.left)
          .attr('y', -margin.top)
          .attr('fill', '#FFF');
      }


      //------------------------------------------------------------
      // Main chart draw

      chart.render = function() {

        // Chart layout variables
        var renderWidth, renderHeight,
            innerMargin,
            innerWidth, innerHeight,
            headerHeight;

        var xpos = 0,
            ypos = 0;

        containerWidth = parseInt(container.style('width'), 10);
        containerHeight = parseInt(container.style('height'), 10);

        renderWidth = width || containerWidth || 960;
        renderHeight = height || containerHeight || 400;

        availableWidth = renderWidth - margin.left - margin.right;
        availableHeight = renderHeight - margin.top - margin.bottom;

        innerMargin = {top: 0, right: 0, bottom: 0, left: 0};
        innerWidth = availableWidth - innerMargin.left - innerMargin.right;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;

        back_wrap.select('.sc-background')
          .attr('width', renderWidth)
          .attr('height', renderHeight);


        //------------------------------------------------------------
        // Title & Legend & Controls

        header
          .width(availableWidth)
          .height(availableHeight);

        container.call(header);

        // Recalc inner margins based on title, legend and control height
        headerHeight = header.getHeight();
        innerMargin.top += headerHeight;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;

        if (innerHeight < 100) {
          displayNoData(null, strings.displayError);
          return chart;
        }


        //------------------------------------------------------------
        // Scroll variables
        // for stacked, baseDimension is width of bar plus 1/4 of bar for gap
        // for grouped, baseDimension is width of bar plus width of one bar for gap
        var boundsWidth = state.stacked ?
              baseDimension :
              baseDimension * seriesCount + baseDimension;
        var gap = baseDimension * (state.stacked ? 0.25 : 1);
        var minDimension = groupCount * boundsWidth + gap;

        xTickMaxWidth = Math.max(vertical ? baseDimension * 2 : availableWidth * 0.2, 75);


        //------------------------------------------------------------
        // Main Chart Component(s)

        function getDimension(d) {
          if (d === 'width') {
            return vertical && scrollEnabled ?
              Math.max(innerWidth, minDimension) :
              innerWidth;
          } else if (d === 'height') {
            return !vertical && scrollEnabled ?
              Math.max(innerHeight, minDimension) :
              innerHeight;
          } else {
            return 0;
          }
        }

        model
          .vertical(vertical)
          .baseDimension(baseDimension)
          .disabled(data.map(function(series) { return series.disabled; }))
          .width(getDimension('width'))
          .height(getDimension('height'));
        model_wrap
          .datum(modelData)
          .call(model);


        //------------------------------------------------------------
        // Axes

        var yAxisMargin = {top: 0, right: 0, bottom: 0, left: 0},
            xAxisMargin = {top: 0, right: 0, bottom: 0, left: 0};

        function setInnerMargins() {
          xAxisMargin = xAxis.margin();
          yAxisMargin = yAxis.margin();
          innerMargin.left = Math.max(xAxisMargin.left, yAxisMargin.left);
          innerMargin.right = Math.max(xAxisMargin.right, yAxisMargin.right);
          innerMargin.top = Math.max(xAxisMargin.top, yAxisMargin.top);
          innerMargin.bottom = Math.max(xAxisMargin.bottom, yAxisMargin.bottom);
          setInnerDimensions();
        }

        function setInnerDimensions() {
          innerWidth = availableWidth - innerMargin.left - innerMargin.right;
          innerHeight = availableHeight - headerHeight - innerMargin.top - innerMargin.bottom;
          // Recalc chart dimensions and scales based on new inner dimensions
          model.resetDimensions(getDimension('width'), getDimension('height'));
        }

        function yAxisRender() {
          yAxis
            .ticks(valuesAreIntegers && maxGroup < 10 ? maxGroup : innerHeight / 48)
            .tickSize(vertical ? -innerWidth : -innerHeight, 0)
            .margin(innerMargin);
          yAxis_wrap
            .call(yAxis);
          setInnerMargins();
        }

        function xAxisRender() {
          xAxis
            .tickSize(0)
            .margin(innerMargin);
          xAxis_wrap
            .call(xAxis);
          setInnerMargins();
        }

        // initial Y-Axis call
        yAxisRender();
        // initial X-Axis call
        xAxisRender();

        // recall Y-axis to set final size based on new dimensions
        yAxisRender();
        // recall X-axis to set final size based on new dimensions
        xAxisRender();
        // recall Y-axis to set final size based on new dimensions
        yAxisRender();

        // final call to lines based on new dimensions
        model_wrap
          .transition().duration(duration)
            .call(model);


        //------------------------------------------------------------
        // Final repositioning

        innerMargin.top += headerHeight;

        xpos = (vertical || xAxis.orient() === 'left' ? 0 : innerWidth);
        ypos = (vertical && xAxis.orient() === 'bottom' ? innerHeight + 2 : -2);
        xAxis_wrap
          .attr('transform', utility.translation(xpos, ypos));

        xpos = innerMargin.left + (vertical || yAxis.orient() === 'bottom' ? 0 : innerWidth);
        ypos = innerMargin.top + (vertical || yAxis.orient() === 'left' ? 0 : innerHeight);
        yAxis_wrap
          .attr('transform', utility.translation(xpos, ypos));

        scroll_wrap
          .attr('transform', utility.translation(innerMargin.left, innerMargin.top));


        //------------------------------------------------------------
        // Enable scrolling

        if (scrollEnabled) {

          useScroll = minDimension > (vertical ? innerWidth : innerHeight);

          xAxis_wrap.select('.sc-axislabel')
            .attr('x', (vertical ? innerWidth : -innerHeight) / 2);

          var maxScroll = (vertical ? innerWidth : innerHeight) - minDimension;
          var panMultibar = function() {
                var x;
                dispatch.call('tooltipHide', this);
                scrollOffset = scroll.pan(maxScroll);
                x = vertical ?
                  innerWidth - scrollOffset * 2 :
                  scrollOffset * 2 - innerHeight;
                x = x / 2;
                xAxis_wrap.select('.sc-axislabel')
                  .attr('x', x);
              };

          scroll
            .enable(useScroll)
            .width(innerWidth)
            .height(innerHeight)
            .margin(innerMargin)
            .minDimension(minDimension)
            .vertical(vertical)
            .panHandler(panMultibar)
            .resize(scrollOffset, overflowHandler);

          // initial call to zoom in case of scrolled bars on window resize
          scroll.panHandler()();
        }

      };

      //============================================================

      chart.render();

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      //TODO: change legendClick to menuClick
      header.legend.dispatch.on('legendClick', function(series, i) {
        series.disabled = !series.disabled;

        // if there are no enabled data series, enable them all
        if (!data.filter(function(d) { return !d.disabled; }).length) {
          data.forEach(function(d) {
            d.disabled = false;
          });
        }
        state.disabled = data.map(function(d) { return !!d.disabled; });

        // on legend click, clear active cell state
        series.active = 'inactive';
        series.values.forEach(function(d) {
          d.active = 'inactive';
        });
        // if there are no active data series, unset active state
        if (!data.filter(function(d) { return d.active === 'active'; }).length) {
          chart.clearActive();
        }
        state.active = data.map(function(d) { return !!d.active; });

        chart.update();
        dispatch.call('stateChange', this, state);
      });

      header.controls.dispatch.on('legendClick', function(control, i) {
        //if the option is currently enabled (i.e., selected)
        if (!control.disabled) {
          return;
        }

        //set the controls all to false
        controlsData.forEach(function(control) {
          control.disabled = true;
        });
        //activate the the selected control option
        control.disabled = false;

        //TODO: update model through stateChange
        model.stacked(control.key === 'Grouped' ? false : true);
        state.stacked = model.stacked();

        chart.update();
        dispatch.call('stateChange', this, state);
      });

      dispatch.on('tooltipShow', function(eo) {
        if (tooltips) {
          if (hasGroupLabels) {
            // set the group rather than pass entire groupData
            eo.group = groupData[eo.groupIndex];
          }
          tt = showTooltip(eo, that.parentNode, properties);
        }
      });

      dispatch.on('tooltipMove', function(e) {
        if (tt) {
          tooltip.position(that.parentNode, tt, e, vertical ? 's' : 'w');
        }
      });

      dispatch.on('tooltipHide', function() {
        if (tooltips) {
          tooltip.cleanup();
        }
      });

      // Update chart from a state object passed to event handler
      dispatch.on('changeState', function(eo) {
        if (typeof eo.disabled !== 'undefined') {
          data.forEach(function(series, i) {
            series.disabled = eo.disabled[i];
          });
          state.disabled = eo.disabled;
        }

        if (typeof eo.active !== 'undefined') {
          data.forEach(function(series, i) {
            series.active = eo.active[i] ? 'active' : 'inactive';
            series.values.forEach(function(value) {
              value.active = series.active;
            });
          });
          state.active = eo.active;
          // if there are no active data series, unset active state
          if (!data.filter(function(series) { return series.active === 'active'; }).length) {
            chart.clearActive();
          }
        }

        if (typeof eo.stacked !== 'undefined') {
          model.stacked(eo.stacked);
          state.stacked = eo.stacked;
        }

        chart.update();
      });

      dispatch.on('chartClick', function() {
        //dispatch.call('tooltipHide', this);
        if (header.controls.enabled()) {
          header.controls.dispatch.call('closeMenu', this);
        }
        if (header.legend.enabled()) {
          header.legend.dispatch.call('closeMenu', this);
        }
      });

      model.dispatch.on('elementClick', function(eo) {
        if (hasGroupLabels && eo.groupIndex) {
          // set the group rather than pass entire groupData
          eo.group = groupData[eo.groupIndex];
        }
        dispatch.call('chartClick', this);
        seriesClick(data, eo, chart, groupLabels);
      });

      container.on('click', function() {
        d3.event.stopPropagation();
        dispatch.call('chartClick', this);
      });

    });

    return chart;
  }

  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  model.dispatch.on('elementMouseover.tooltip', function(eo) {
    dispatch.call('tooltipShow', this, eo);
  });

  model.dispatch.on('elementMousemove.tooltip', function(e) {
    dispatch.call('tooltipMove', this, e);
  });

  model.dispatch.on('elementMouseout.tooltip', function(eo) {
    // need eo for removing hover class on element
    dispatch.call('tooltipHide', this, eo);
  });

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.dispatch = dispatch;
  chart.multibar = model;
  chart.legend = header.legend;
  chart.controls = header.controls;
  chart.xAxis = xAxis;
  chart.xAxisLabel = xAxis.axisLabel;
  chart.yAxis = yAxis;
  chart.yAxisLabel = yAxis.axisLabel;
  chart.options = utility.optionsFunc.bind(chart);

  utility.rebind(chart, model,
    'id', 'x', 'y', 'xScale', 'yScale', 'xDomain', 'yDomain', 'forceX', 'forceY', 'clipEdge',
    'color', 'fill', 'classes', 'gradient', 'locality'
  );
  utility.rebind(chart, model, 'stacked', 'showValues', 'nice', 'textureFill');
  utility.rebind(chart, header, 'showTitle', 'showControls', 'showLegend');
  utility.rebind(chart, xAxis, 'rotateTicks', 'reduceXTicks', 'staggerTicks', 'wrapTicks');

  chart.colorData = function(_) {
    var type = arguments[0],
        params = arguments[1] || {};
    var color = function(d) {
          return utility.defaultColor()(d, d.seriesIndex);
        };
    var classes = function(d) {
          return 'sc-series sc-series-' + d.seriesIndex;
        };

    switch (type) {
      case 'graduated':
        color = function(d) {
          return d3.interpolateHsl(d3.rgb(params.c1), d3.rgb(params.c2))(d.seriesIndex / params.l);
        };
        break;
      case 'class':
        color = function() {
          return 'inherit';
        };
        classes = function(d) {
          var i = d.seriesIndex;
          var iClass = (i * (params.step || 1)) % 14;
          iClass = (iClass > 9 ? '' : '0') + iClass;
          return 'sc-series sc-series-' + i + ' sc-fill' + iClass + ' sc-stroke' + iClass;
        };
        break;
      case 'data':
        color = function(d) {
          return utility.defaultColor()(d, d.seriesIndex);
        };
        classes = function(d) {
          return 'sc-series sc-series-' + d.seriesIndex + (d.classes ? ' ' + d.classes : '');
        };
        break;
    }

    var fill = !params.gradient ? color : function(d) {
      var p = {
            orientation: params.orientation || (vertical ? 'vertical' : 'horizontal'),
            position: params.position || 'middle'
          };
      return model.gradientFill(d, d.seriesIndex, p);
    };

    model.color(color);
    model.fill(fill);
    model.classes(classes);

    // don't enable this since controls get a custom function
    // controls.color(color);
    // controls.classes(classes);
    header.legend.color(color);
    header.legend.classes(classes);

    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) { return margin; }
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        margin[prop] = _[prop];
      }
    }
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) { return width; }
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) { return height; }
    height = _;
    return chart;
  };

  chart.tooltips = function(_) {
    if (!arguments.length) { return tooltips; }
    tooltips = _;
    return chart;
  };

  chart.tooltipContent = function(_) {
    if (!arguments.length) { return tooltipContent; }
    tooltipContent = _;
    return chart;
  };

  chart.state = function(_) {
    if (!arguments.length) { return state; }
    state = _;
    dispatch.call('stateChange', this, state);
    return chart;
  };

  chart.strings = function(_) {
    if (!arguments.length) { return strings; }
    strings = language(_);
    header.strings(strings);
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    model.direction(_);
    xAxis.direction(_);
    yAxis.direction(_);
    header.direction(_);
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) { return duration; }
    duration = _;
    model.duration(_);
    return chart;
  };

  chart.delay = function(_) {
    if (!arguments.length) { return delay; }
    delay = _;
    model.delay(_);
    return chart;
  };

  chart.valueFormat = function(_) {
    if (!arguments.length) {
      return valueFormat;
    }
    valueFormat = _;
    return chart;
  };

  chart.xValueFormat = function(_) {
    if (!arguments.length) {
      return xValueFormat;
    }
    xValueFormat = _;
    return chart;
  };

  chart.yValueFormat = function(_) {
    if (!arguments.length) {
      return yValueFormat;
    }
    yValueFormat = _;
    return chart;
  };

  chart.seriesClick = function(_) {
    if (!arguments.length) { return seriesClick; }
    seriesClick = _;
    return chart;
  };

  chart.vertical = function(_) {
    if (!arguments.length) { return vertical; }
    vertical = _;
    return chart;
  };

  chart.allowScroll = function(_) {
    if (!arguments.length) { return scrollEnabled; }
    scrollEnabled = _;
    return chart;
  };

  chart.hideEmptyGroups = function(_) {
    if (!arguments.length) { return hideEmptyGroups; }
    hideEmptyGroups = _;
    return chart;
  };

  chart.overflowHandler = function(_) {
    if (!arguments.length) { return overflowHandler; }
    overflowHandler = utility.functor(_);
    return chart;
  };

  //============================================================

  return chart;
}

function paretoChart() {
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------
  var defaultStrings = {
        barLegend: {close: 'Hide bar legend', open: 'Show bar legend', noLabel: 'undefined'},
        lineLegend: {close: 'Hide line legend', open: 'Show line legend', noLabel: 'undefined'}
      };
  var margin = {top: 10, right: 10, bottom: 10, left: 10},
      width = null,
      height = null,
      showTitle = false,
      showLegend = true,
      direction = 'ltr',
      tooltips = true,
      clipEdge = false, // if true, masks lines within x and y scale
      delay = 0, // transition
      duration = 0, // transition
      state = {},
      strings = language(defaultStrings),
      getX = function(d) { return d.x; },
      getY = function(d) { return d.y; },
      locality = utility.buildLocality();

  var dispatch = d3.dispatch('chartClick', 'tooltipShow', 'tooltipHide', 'tooltipMove', 'stateChange', 'changeState');

  var xValueFormat = function(d, i, label, isDate) {
        return isDate ?
          utility.dateFormat(label, '%x', chart.locality()) :
          label;
      };

  var yValueFormat = function(d, i, label, isCurrency) {
        var precision = 2;
        return utility.numberFormatSI(d, precision, isCurrency, chart.locality());
      };

  var quotaValueFormat = yValueFormat;

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var bars = multibar()
      .stacked(true)
      .clipEdge(false)
      .withLine(true)
      .nice(false),
    linesBackground = line()
      .color(function(d, i) { return '#FFF'; })
      .fill(function(d, i) { return '#FFF'; })
      .useVoronoi(false)
      .nice(false),
    lines = line()
      .useVoronoi(false)
      .color('data')
      .nice(false),
    xAxis = axis(),
    yAxis = axis(),
    barLegend = menu()
      .align('left')
      .position('middle'),
    lineLegend = menu()
      .align('right')
      .position('middle');

  var tt = null;

  var tooltipBar = function(key, x, y, e, graph) {
        return '<p><b>' + key + '</b></p>' +
               '<p><b>' + y + '</b></p>' +
               '<p><b>' + x + '%</b></p>';
      };
  var tooltipLine = function(key, x, y, e, graph) {
        return '<p><p>' + key + ': <b>' + y + '</b></p>';
      };
  var tooltipQuota = function(key, x, y, e, graph) {
        return '<p>' + e.key + ': <b>' + y + '</b></p>';
      };

  var showTooltip = function(eo, offsetElement, groupData) {
        var key = eo.series.key,
            per = (eo.point.y * 100 / groupData[eo.pointIndex].t).toFixed(1),
            amt = lines.y()(eo.point, eo.pointIndex),
            content = eo.series.type === 'bar' ? tooltipBar(key, per, amt, eo, chart) : tooltipLine(key, per, amt, eo, chart);

        return tooltip.show(eo.e, content, 's', null, offsetElement);
      };

  var showQuotaTooltip = function(eo, offsetElement) {
        var content = tooltipQuota(eo.key, 0, eo.val, eo, chart);
        return tooltip.show(eo.e, content, 's', null, offsetElement);
      };

  var seriesClick = function(data, eo, chart, container) {
        return;
      };

  //============================================================

  function chart(selection) {

    selection.each(function(chartData) {

      var that = this,
          container = d3.select(this),
          modelClass = 'pareto';

      var properties = chartData ? chartData.properties || {} : {},
          data = chartData ? chartData.data || null : null;

      var containerWidth = parseInt(container.style('width'), 10),
          containerHeight = parseInt(container.style('height'), 10);

      var pointSize = Math.pow(6, 2) * Math.PI, // set default point size to 6
          xIsDatetime = properties.xDataType === 'datetime' || false,
          yIsCurrency = properties.yDataType === 'currency' || false;

      var baseDimension = bars.stacked() ? 72 : 32;

      var xAxisFormat = function(d, i, selection, noEllipsis) {
            // Set axis to use trimmed array rather than data
            var label = groupLabels && Array.isArray(groupLabels) ?
                  groupLabels[i] || d:
                  d;
            var value = xValueFormat(d, i, label, xIsDatetime);
            var width = Math.max(baseDimension * 2, 75);

            return !noEllipsis ?
              utility.stringEllipsify(value, container, width) :
              value;
          };

      var yAxisFormat = function(d, i, selection, noEllipsis) {
            return yValueFormat(d, i, null, yIsCurrency);
          };

      var x,
          y;

      chart.update = function() {
        container.transition().call(chart);
      };

      chart.container = this;

      //------------------------------------------------------------
      // Private method for displaying no data message.

      function displayNoData(data, msg) {
        var hasData = data && data.length && data.filter(function(series) {
          return !series.disabled && Array.isArray(series.values) && series.values.length;
        }).length;
        var x = (containerWidth - margin.left - margin.right) / 2 + margin.left;
        var y = (containerHeight - margin.top - margin.bottom) / 2 + margin.top;
        return utility.displayNoData(hasData, container, (msg || strings.noData), x, y);
      }

      // Check to see if there's nothing to show.
      if (displayNoData(data)) {
        return chart;
      }


      //------------------------------------------------------------
      // Process data

      chart.dataSeriesActivate = function(eo) {
        var series = eo.series;

        series.active = (!series.active || series.active === 'inactive') ? 'active' : 'inactive';
        series.values.map(function(d) {
          d.active = series.active;
        });

        // if you have activated a data series, inactivate the rest
        if (series.active === 'active') {
          data
            .filter(function(d) {
              return d.active !== 'active';
            })
            .map(function(d) {
              d.active = 'inactive';
              d.values.map(function(d) {
                d.active = 'inactive';
              });
              return d;
            });
        }

        // if there are no active data series, activate them all
        if (!data.filter(function(d) { return d.active === 'active'; }).length) {
          data
            .map(function(d) {
              d.active = '';
              d.values.map(function(d) {
                d.active = '';
              });
              container.selectAll('.sc-series').classed('sc-inactive', false);
              return d;
            });
        }

        container.call(chart);
      };

      // add series index to each data point for reference
      data.forEach(function(series, s) {
        // make sure untrimmed values array exists
        // and set immutable series values
        if (!series._values) {
          series._values = series.values.map(function(value, v) {
            return {
              'x': Array.isArray(value) ? value[0] : value.x,
              'y': Array.isArray(value) ? value[1] : value.y
            };
          });
        }
      });

      var barData = data
            .filter(function(d) {
              return !d.type || d.type === 'bar';
            })
            .map(function(series, s) {
              series.seriesIndex = s;
              series.values = series._values.map(function(value, v) {
                  return {
                      'group': v,
                      'seriesIndex': series.seriesIndex,
                      'color': typeof series.color !== 'undefined' ? series.color : '',
                      'x': bars.x()(value, v),
                      'y': bars.y()(value, v),
                      'y0': value.y + (s > 0 ? data[series.seriesIndex - 1].values[v].y0 : 0),
                      'active': typeof series.active !== 'undefined' ? series.active : '' // do not eval d.active because it can be false
                    };
                });
              series.key = series.key || strings.noLabel;
              series.total = d3.sum(series._values, function(value, v) {
                return value.y;
              });
              // disabled if all values in series are zero
              // or the series was disabled by the legend
              series.disabled = series.disabled || series.total === 0;
              return series;
            })
            .filter(function(d) {
              return !d.disabled;
            })
            .map(function(series, s) {
              series.seri = s;
              series.values
                .forEach(function(value, v) {
                  value.seri = series.seri;
                });
              return series;
            });

      if (displayNoData(barData)) {
        return chart;
      }

      var lineData = data
            .filter(function(d) {
              return d.type === 'line';
            })
            .map(function(series, s) {
              series.seriesIndex = s;

              if (!bars.stacked()) {

                series.values = series._values.map(function(value, v) {
                  return {
                    'seriesIndex': series.seriesIndex,
                    'color': typeof series.color !== 'undefined' ? series.color : '',
                    'x': lines.x()(value, v) + (series.seriesIndex - v) * 0.25,
                    'y': lines.y()(value, v)
                  };
                });

              } else {

                series.values.forEach(function(value) {
                  value.y = 0;
                });

                barData.map(function(barSeries) {
                    barSeries.values.map(function(value, v) {
                      series.values[v].y += bars.y()(value, v);
                    });
                  });

                series.values.forEach(function(value, v) {
                  if (v > 0) {
                    value.y += series.values[v - 1].y;
                  }
                });

              }

              return series;
            })
            .filter(function(d) {
              return !d.disabled;
            })
            .map(function(series, s) {
              series.seri = s;
              series.values
                .forEach(function(value, v) {
                  value.seri = series.seri;
                });
              return series;
            });

      var groupData = properties.groupData,
          groupLabels = groupData.map(function(d) {
            return [].concat(d.l)[0] || strings.noLabel;
          });

      var quotaValue = properties.quota || 0,
          quotaLabel = properties.quotaLabel || '';

      var targetQuotaValue = properties.targetQuota || 0,
          targetQuotaLabel = properties.targetQuotaLabel || '';

      //------------------------------------------------------------
      // Legend data

      var barLegendData = data
            .filter(function(d) {
              return !d.type || d.type === 'bar';
            });

      var lineLegendData = data
            .filter(function(d) {
              return d.type === 'line';
            });

      lineLegendData.push({
        'key': quotaLabel,
        'type': 'dash',
        'color': '#444',
        'seriesIndex': lineLegendData.length,
        'values': {'seriesIndex': lineLegendData.length, 'x': 0, 'y': 0}
      });

      if (targetQuotaValue > 0) {
        lineLegendData.push({
          'key': targetQuotaLabel,
          'type': 'dash',
          'color': '#777',
          'seriesIndex': lineLegendData.length,
          'values': {'seriesIndex': lineLegendData.length + 1, 'x': 0, 'y': 0}
        });
      }

      var seriesX = data
            .filter(function(d) {
              return !d.disabled;
            })
            .map(function(d) {
              return d._values.map(function(d, i) {
                return getX(d, i);
              });
            });

      var seriesY = data
            .map(function(d) {
              return d._values.map(function(d, i) {
                return getY(d, i);
              });
            });

      // set title display option
      showTitle = showTitle && properties.title && properties.title.length;

      //------------------------------------------------------------
      // Setup Scales

      x = bars.xScale();
      y = bars.yScale();

      xAxis
        .orient('bottom')
        .scale(x)
        .valueFormat(xAxisFormat)
        .tickSize(0)
        .tickPadding(4)
        .highlightZero(false)
        .showMaxMin(false);

      yAxis
        .orient('left')
        .scale(y)
        .valueFormat(yAxisFormat)
        .tickPadding(7)
        .showMaxMin(true);

      //------------------------------------------------------------
      // Main chart draw

      chart.render = function() {

        containerWidth = parseInt(container.style('width'), 10);
        containerHeight = parseInt(container.style('height'), 10);

        // Chart layout variables
        var renderWidth, renderHeight,
            availableWidth, availableHeight,
            innerMargin,
            innerWidth, innerHeight;

        renderWidth = width || containerWidth || 960;
        renderHeight = height || containerHeight || 400;
        availableWidth = renderWidth - margin.left - margin.right;
        availableHeight = renderHeight - margin.top - margin.bottom;
        innerMargin = {top: 0, right: 0, bottom: 0, left: 0};
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;
        innerWidth = availableWidth - innerMargin.left - innerMargin.right;

        // Header variables
        var maxBarLegendWidth = 0,
            maxLineLegendWidth = 0,
            widthRatio = 0,
            headerHeight = 0,
            titleBBox = {width: 0, height: 0};

        //------------------------------------------------------------
        // Setup containers and skeleton of chart

        var wrap_bind = container.selectAll('g.sc-chart-wrap').data([data]);
        var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-chart-wrap sc-chart-' + modelClass);
        var wrap = container.select('.sc-chart-wrap').merge(wrap_entr);

        wrap_entr.append('defs');

        wrap_entr.append('g').attr('class', 'sc-background-wrap');
        var back_wrap = wrap.select('.sc-background-wrap');

        wrap_entr.append('g').attr('class', 'sc-title-wrap');
        var title_wrap = wrap.select('.sc-title-wrap');

        wrap_entr.append('g').attr('class', 'sc-axis-wrap sc-axis-x');
        var xAxis_wrap = wrap.select('.sc-axis-wrap.sc-axis-x');
        wrap_entr.append('g').attr('class', 'sc-axis-wrap sc-axis-y');
        var yAxis_wrap = wrap.select('.sc-axis-wrap.sc-axis-y');

        wrap_entr.append('g').attr('class', 'sc-bars-wrap');
        var bars_wrap = wrap.select('.sc-bars-wrap');
        wrap_entr.append('g').attr('class', 'sc-quota-wrap');
        var quota_wrap = wrap.select('.sc-quota-wrap');

        wrap_entr.append('g').attr('class', 'sc-lines-wrap1');
        var lines_wrap1 = wrap.select('.sc-lines-wrap1');
        wrap_entr.append('g').attr('class', 'sc-lines-wrap2');
        var lines_wrap2 = wrap.select('.sc-lines-wrap2');

        wrap_entr.append('g').attr('class', 'sc-legend-wrap sc-bar-legend');
        var barLegend_wrap = wrap.select('.sc-legend-wrap.sc-bar-legend');
        wrap_entr.append('g').attr('class', 'sc-legend-wrap sc-line-legend');
        var lineLegend_wrap = wrap.select('.sc-legend-wrap.sc-line-legend');

        wrap.attr('transform', utility.translation(margin.left, margin.top));
        wrap_entr.select('.sc-background-wrap').append('rect')
          .attr('x', -margin.left)
          .attr('y', -margin.top)
          .attr('width', renderWidth)
          .attr('height', renderHeight)
          .attr('fill', '#FFF');

        //------------------------------------------------------------
        // Title & Legends

        title_wrap.select('.sc-title').remove();

        if (showTitle) {
          title_wrap
            .append('text')
            .attr('class', 'sc-title')
            .attr('x', direction === 'rtl' ? availableWidth : 0)
            .attr('y', 0)
            .attr('dy', '.75em')
            .attr('text-anchor', 'start')
            .attr('stroke', 'none')
            .attr('fill', 'black')
            .text(properties.title);

          titleBBox = utility.getTextBBox(title_wrap.select('.sc-title'));
          headerHeight += titleBBox.height;
        }

        if (showLegend) {
          // bar series legend
          barLegend
            .id('barlegend_' + chart.id())
            .strings(strings.barLegend)
            .align('left')
            .height(availableHeight - innerMargin.top);
          barLegend_wrap
            .datum(barLegendData)
            .call(barLegend);

          maxBarLegendWidth = barLegend.calcMaxWidth();

          // line series legend
          lineLegend
            .id('linelegend_' + chart.id())
            .strings(strings.lineLegend)
            .align('right')
            .height(availableHeight - innerMargin.top);
          lineLegend_wrap
            .datum(lineLegendData)
            .call(lineLegend);

          maxLineLegendWidth = lineLegend.calcMaxWidth();

          // calculate proportional available space
          widthRatio = availableWidth / (maxBarLegendWidth + maxLineLegendWidth);

          barLegend
            .arrange(Math.floor(widthRatio * maxBarLegendWidth));

          lineLegend
            .arrange(Math.floor(widthRatio * maxLineLegendWidth));

          barLegend_wrap
            .attr('transform', 'translate(' + (direction === 'rtl' ? availableWidth - barLegend.width() : 0) + ',' + innerMargin.top + ')');
          lineLegend_wrap
            .attr('transform', 'translate(' + (direction === 'rtl' ? 0 : availableWidth - lineLegend.width()) + ',' + innerMargin.top + ')');
        }

        // Recalculate inner margins based on legend size
        headerHeight += Math.max(barLegend.height(), lineLegend.height()) + 4;
        innerHeight = availableHeight - headerHeight - innerMargin.top - innerMargin.bottom;

        //------------------------------------------------------------
        // Initial call of Main Chart Components

        var limitY = Math.max(d3.max(d3.merge(seriesY)), quotaValue, targetQuotaValue || 0);
        var forceY = [0, Math.ceil(limitY * 0.1) * 10];

        // Main Bar Chart
        bars
          .width(innerWidth)
          .height(innerHeight)
          .forceY(forceY)
          .id(chart.id());
        bars_wrap
          .datum(barData)
          .call(bars);

        var outerPadding = x(1) + x.bandwidth() / (bars.stacked() || lineData.length === 1 ? 2 : 4);

        // Main Line Chart
        linesBackground
          .margin({top: 0, right: outerPadding, bottom: 0, left: outerPadding})
          .width(innerWidth)
          .height(innerHeight)
          .forceY(forceY)
          .useVoronoi(false)
          .id('outline_' + chart.id());
        lines
          .margin({top: 0, right: outerPadding, bottom: 0, left: outerPadding})
          .width(innerWidth)
          .height(innerHeight)
          .forceY(forceY)
          .useVoronoi(false)
          .size(pointSize)
          .sizeRange([pointSize, pointSize])
          .sizeDomain([pointSize, pointSize])
          .id('foreground_' + chart.id());
        lines_wrap1
          .datum(lineData)
          .call(linesBackground);
        lines_wrap2
          .datum(lineData)
          .call(lines);

        // Axes
        xAxis_wrap
          .call(xAxis);

        yAxis_wrap
          .style('opacity', barData.length ? 1 : 0)
          .call(yAxis);

        var xAxisMargin = xAxis.margin();
        var yAxisMargin = yAxis.margin();

        var quotaTextWidth = 0,
            quotaTextHeight = 14;

        function setInnerMargins() {
          innerMargin.left = Math.max(quotaTextWidth, xAxisMargin.left, yAxisMargin.left);
          innerMargin.right = Math.max(xAxisMargin.right, yAxisMargin.right);
          innerMargin.top = Math.max(xAxisMargin.top, yAxisMargin.top) + headerHeight;
          innerMargin.bottom = Math.max(xAxisMargin.bottom, yAxisMargin.bottom);
          setInnerDimensions();
        }

        function setInnerDimensions() {
          innerWidth = availableWidth - innerMargin.left - innerMargin.right;
          innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;
          // Recalc chart dimensions and scales based on new inner dimensions
          bars.resetDimensions(innerWidth, innerHeight);
        }

        //------------------------------------------------------------
        // Quota Line

        quota_wrap.selectAll('line').remove();
        yAxis_wrap.selectAll('text.sc-quota-value').remove();
        yAxis_wrap.selectAll('text.sc-target-quota-value').remove();

        // Target Quota Line
        if (targetQuotaValue > 0) {
          quota_wrap.append('line')
            .attr('class', 'sc-quota-target')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', innerWidth)
            .attr('y2', 0)
            .attr('transform', 'translate(0,' + y(targetQuotaValue) + ')')
            .style('stroke-dasharray', '8, 8');

          quota_wrap.append('line')
            .datum({key: targetQuotaLabel, val: targetQuotaValue})
            .attr('class', 'sc-quota-target sc-quota-background')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', innerWidth)
            .attr('y2', 0)
            .attr('transform', 'translate(0,' + y(targetQuotaValue) + ')');

          // Target Quota line label
          yAxis_wrap.append('text')
            .text(quotaValueFormat(targetQuotaValue, 2, true))
            .attr('class', 'sc-target-quota-value')
            .attr('dy', '.36em')
            .attr('dx', '0')
            .attr('text-anchor', direction === 'rtl' ? 'start' : 'end')
            .attr('transform', 'translate(' + (0 - yAxis.tickPadding()) + ',' + y(targetQuotaValue) + ')');

          quotaTextWidth = Math.round(
            wrap.select('text.sc-target-quota-value').node().getBoundingClientRect().width + yAxis.tickPadding()
          );
        }

        if (quotaValue > 0) {
          quota_wrap.append('line')
            .attr('class', 'sc-quota-line')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', innerWidth)
            .attr('y2', 0)
            .attr('transform', 'translate(0,' + y(quotaValue) + ')')
            .style('stroke-dasharray', '8, 8');

          quota_wrap.append('line')
            .datum({key: quotaLabel, val: quotaValue})
            .attr('class', 'sc-quota-line sc-quota-background')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', innerWidth)
            .attr('y2', 0)
            .attr('transform', 'translate(0,' + y(quotaValue) + ')');

          // Quota line label
          yAxis_wrap.append('text')
            .text(quotaValueFormat(quotaValue, 2, true))
            .attr('class', 'sc-quota-value')
            .attr('dy', '.36em')
            .attr('dx', '0')
            .attr('text-anchor', direction === 'rtl' ? 'start' : 'end')
            .attr('transform', 'translate(' + -yAxis.tickPadding() + ',' + y(quotaValue) + ')');

          quotaTextWidth = Math.max(
            quotaTextWidth,
            Math.round(
              wrap.select('text.sc-quota-value').node().getBoundingClientRect().width + yAxis.tickPadding()
            )
          );
        }

        //------------------------------------------------------------
        // Calculate intial dimensions based on first Axis call

        // Temporarily reset inner dimensions
        setInnerMargins();

        //------------------------------------------------------------
        // Recall Main Chart and Axis

        bars
          .width(innerWidth)
          .height(innerHeight);
        bars_wrap
          .call(bars);

        xAxis_wrap
          .call(xAxis);
        yAxis_wrap
          .call(yAxis);

        //------------------------------------------------------------
        // Recalculate final dimensions based on new Axis size
        outerPadding = x(1) + x.bandwidth() / (bars.stacked() ? 2 : lineData.length * 2);

        xAxisMargin = xAxis.margin();
        yAxisMargin = yAxis.margin();

        setInnerMargins();

        //------------------------------------------------------------
        // Recall Main Chart Components based on final dimensions

        var transform = utility.translation(innerMargin.left, innerMargin.top);

        bars
          .width(innerWidth)
          .height(innerHeight);

        bars_wrap
          .attr('transform', transform)
          .call(bars);


        linesBackground
          .margin({top: 0, right: outerPadding, bottom: 0, left: outerPadding})
          .width(innerWidth)
          .height(innerHeight);
        lines
          .margin({top: 0, right: outerPadding, bottom: 0, left: outerPadding})
          .width(innerWidth)
          .height(innerHeight);

        lines_wrap1
          .attr('transform', transform)
          .call(linesBackground);
        lines_wrap2
          .attr('transform', transform)
          .call(lines);


        quota_wrap
          .attr('transform', transform)
          .selectAll('line')
            .attr('x2', innerWidth);

        xAxis_wrap
          .attr('transform', 'translate(' + innerMargin.left + ',' + (xAxis.orient() === 'bottom' ? innerHeight + innerMargin.top : innerMargin.top) + ')')
          .call(xAxis);

        yAxis
          .ticks(Math.ceil(innerHeight / 48))
          .tickSize(-innerWidth, 0);

        yAxis_wrap
          .attr('transform', 'translate(' + (yAxis.orient() === 'left' ? innerMargin.left : innerMargin.left + innerWidth) + ',' + innerMargin.top + ')')
          .call(yAxis);

        if (targetQuotaValue > 0) {

          quota_wrap.selectAll('line.sc-quota-target')
            .attr('x2', innerWidth)
            .attr('transform', 'translate(0,' + y(targetQuotaValue) + ')');

          yAxis_wrap.select('text.sc-target-quota-value')
            .attr('transform', 'translate(' + (0 - yAxis.tickPadding()) + ',' + y(targetQuotaValue) + ')');

          quotaTextHeight = Math.round(parseInt(wrap.select('text.sc-target-quota-value').node().getBoundingClientRect().height, 10) / 1.15);

          //check if tick lines overlap quota values, if so, hide the values that overlap
          yAxis_wrap.selectAll('g.tick, g.sc-axisMaxMin')
            .each(function(d, i) {
              if (Math.abs(y(d) - y(targetQuotaValue)) <= quotaTextHeight) {
                d3.select(this).style('opacity', 0);
              }
            });
        }

        if (quotaValue > 0) {

          quota_wrap.selectAll('line.sc-quota-line')
            .attr('x2', innerWidth)
            .attr('transform', 'translate(0,' + y(quotaValue) + ')');
          yAxis_wrap.select('text.sc-quota-value')
            .attr('transform', 'translate(' + (0 - yAxis.tickPadding()) + ',' + y(quotaValue) + ')');

          quotaTextHeight = Math.round(parseInt(wrap.select('text.sc-quota-value').node().getBoundingClientRect().height, 10) / 1.15);

          //check if tick lines overlap quota values, if so, hide the values that overlap
          yAxis_wrap.selectAll('g.tick, g.sc-axisMaxMin')
            .each(function(d, i) {
              if (Math.abs(y(d) - y(quotaValue)) <= quotaTextHeight) {
                d3.select(this).style('opacity', 0);
              }
            });

          // if there is a quota and an adjusted quota
          // check to see if the adjusted collides
          if (targetQuotaValue > 0) {
            if (Math.abs(y(quotaValue) - y(targetQuotaValue)) <= quotaTextHeight) {
              yAxis_wrap.select('.sc-target-quota-value').style('opacity', 0);
            }
          }
        }

        quota_wrap.selectAll('line.sc-quota-background')
          .on('mouseover', function(d) {
            if (tooltips) {
              var eo = {
                  val: d.val,
                  key: d.key,
                  e: d3.event
              };
              tt = showQuotaTooltip(eo, that.parentNode);
            }
          })
          .on('mousemove', function() {
            var e = d3.event;
            dispatch.call('tooltipMove', this, e);
          })
          .on('mouseout', function() {
            dispatch.call('tooltipHide', this);
          });

      };

      //============================================================

      chart.render();

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      barLegend.dispatch.on('legendClick', function(d, i) {
        var selectedSeries = d.seriesIndex;

        //swap bar disabled
        d.disabled = !d.disabled;
        //swap line disabled for same series
        if (!chart.stacked()) {
          data.filter(function(d) {
              return d.seriesIndex === selectedSeries && d.type === 'line';
            }).map(function(d) {
              d.disabled = !d.disabled;
              return d;
            });
        }
        // if there are no enabled data series, enable them all
        if (!data.filter(function(d) {
          return !d.disabled && d.type === 'bar';
        }).length) {
          data.map(function(d) {
            d.disabled = false;
            return d;
          });
        }
        container.call(chart);
      });

      dispatch.on('tooltipShow', function(eo) {
        if (tooltips) {
          tt = showTooltip(eo, that.parentNode, groupData);
        }
      });

      dispatch.on('tooltipMove', function(e) {
        if (tt) {
          tooltip.position(that.parentNode, tt, e, 's');
        }
      });

      dispatch.on('tooltipHide', function() {
        if (tooltips) {
          tooltip.cleanup();
        }
      });

      // Update chart from a state object passed to event handler
      dispatch.on('changeState', function(eo) {
        if (typeof eo.disabled !== 'undefined') {
          data.forEach(function(series, i) {
            series.disabled = eo.disabled[i];
          });
          state.disabled = eo.disabled;
        }

        if (typeof eo.stacked !== 'undefined') {
          bars.stacked(eo.stacked);
          state.stacked = eo.stacked;
        }

        container.transition().call(chart);
      });

      dispatch.on('chartClick', function() {
        if (barLegend.enabled()) {
          barLegend.dispatch.call('closeMenu', this);
        }
        if (lineLegend.enabled()) {
          lineLegend.dispatch.call('closeMenu', this);
        }
      });

      bars.dispatch.on('elementClick', function(eo) {
        dispatch.call('chartClick', this);
        seriesClick(data, eo, chart, container);
      });

    });

    return chart;
  }

  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  lines.dispatch.on('elementMouseover.tooltip', function(eo) {
    dispatch.call('tooltipShow', this, eo);
  });

  lines.dispatch.on('elementMousemove.tooltip', function(e) {
    dispatch.call('tooltipMove', this, e);
  });

  lines.dispatch.on('elementMouseout.tooltip', function() {
    dispatch.call('tooltipHide', this);
  });

  bars.dispatch.on('elementMouseover.tooltip', function(eo) {
    dispatch.call('tooltipShow', this, eo);
  });

  bars.dispatch.on('elementMousemove.tooltip', function(e) {
    dispatch.call('tooltipMove', this, e);
  });

  bars.dispatch.on('elementMouseout.tooltip', function() {
    dispatch.call('tooltipHide', this);
  });

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.dispatch = dispatch;
  chart.linesBackground = linesBackground;
  chart.lines = lines;
  chart.multibar = bars;
  chart.barLegend = barLegend;
  chart.lineLegend = lineLegend;
  chart.xAxis = xAxis;
  chart.xAxisLabel = xAxis.axisLabel;
  chart.yAxis = yAxis;
  chart.yAxisLabel = yAxis.axisLabel;
  chart.options = utility.optionsFunc.bind(chart);

  utility.rebind(chart, bars, 'id', 'xScale', 'yScale', 'xDomain', 'yDomain', 'forceY', 'color', 'fill', 'classes', 'gradient');
  utility.rebind(chart, bars, 'stacked', 'showValues', 'valueFormat', 'nice', 'textureFill');
  utility.rebind(chart, xAxis, 'rotateTicks', 'staggerTicks', 'wrapTicks', 'reduceXTicks');

  chart.colorData = function(_) {
    var type = arguments[0],
        params = arguments[1] || {};
    var barColor = function(d) {
          return utility.defaultColor()(d, d.seriesIndex);
        };
    var barClasses = function(d, i) {
          return 'sc-series sc-series-' + d.seriesIndex;
        };
    var lineColor = function(d, i) {
      var p = params.lineColor ? params.lineColor : {
        c1: '#1A8221',
        c2: '#62B464',
        l: 1
      };
      return d.color || d3.interpolateHsl(d3.rgb(p.c1), d3.rgb(p.c2))(d.seriesIndex / 2);
    };
    var lineClasses = function(d, i) {
          return 'sc-series sc-series-' + d.seriesIndex;
        };

    switch (type) {
      case 'graduated':
        barColor = function(d) {
          return d3.interpolateHsl(d3.rgb(params.barColor.c1), d3.rgb(params.barColor.c2))(d.seriesIndex / params.barColor.l);
        };
        break;
      case 'class':
        barColor = function() {
          return 'inherit';
        };
        barClasses = function(d) {
          var i = d.seriesIndex;
          var iClass = (i * (params.step || 1)) % 14;
          iClass = (iClass > 9 ? '' : '0') + iClass;
          return 'sc-series sc-series-' + i + ' sc-fill' + iClass;
        };
        lineClasses = function(d) {
          var i = d.seriesIndex;
          var iClass = (i * (params.step || 1)) % 14;
          iClass = (iClass > 9 ? '' : '0') + iClass;
          return 'sc-series sc-series-' + i + ' sc-fill' + iClass + ' sc-stroke' + iClass;
        };
        break;
      case 'data':
        barColor = function(d) {
          return d.classes ? 'inherit' : d.color || utility.defaultColor()(d, d.seriesIndex);
        };
        barClasses = function(d) {
          return 'sc-series sc-series-' + d.seriesIndex + (d.classes ? ' ' + d.classes : '');
        };
        lineClasses = function(d) {
          return 'sc-series sc-series-' + d.seriesIndex + (d.classes ? ' ' + d.classes : '');
        };
        break;
    }

    var barFill = !params.gradient ? barColor : function(d) {
      var p = {
            orientation: params.orientation || 'vertical',
            position: params.position || 'middle'
          };
      return bars.gradientFill(d, d.seriesIndex, p);
    };

    bars.color(barColor);
    bars.fill(barFill);
    bars.classes(barClasses);

    lines.color(lineColor);
    lines.fill(lineColor);
    lines.classes(lineClasses);

    barLegend.color(barColor);
    barLegend.classes(barClasses);

    lineLegend.color(lineColor);
    lineLegend.classes(lineClasses);

    return chart;
  };

  chart.x = function(_) {
    if (!arguments.length) { return getX; }
    getX = _;
    lines.x(_);
    bars.x(_);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) { return getY; }
    getY = _;
    lines.y(_);
    bars.y(_);
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) { return margin; }
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        margin[prop] = _[prop];
      }
    }
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) { return width; }
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) { return height; }
    height = _;
    return chart;
  };

  chart.showTitle = function(_) {
    if (!arguments.length) { return showTitle; }
    showTitle = _;
    return chart;
  };

  chart.showLegend = function(_) {
    if (!arguments.length) { return showLegend; }
    showLegend = _;
    return chart;
  };

  chart.tooltipBar = function(_) {
    if (!arguments.length) { return tooltipBar; }
    tooltipBar = _;
    return chart;
  };

  chart.tooltipLine = function(_) {
    if (!arguments.length) { return tooltipLine; }
    tooltipLine = _;
    return chart;
  };

  chart.tooltipQuota = function(_) {
    if (!arguments.length) { return tooltipQuota; }
    tooltipQuota = _;
    return chart;
  };

  chart.tooltips = function(_) {
    if (!arguments.length) { return tooltips; }
    tooltips = _;
    return chart;
  };

  chart.clipEdge = function(_) {
    if (!arguments.length) { return clipEdge; }
    clipEdge = _;
    bars.clipEdge(_);
    linesBackground.clipEdge(_);
    lines.clipEdge(_);
    return chart;
  };

  chart.state = function(_) {
    if (!arguments.length) { return state; }
    state = _;
    return chart;
  };

  chart.strings = function(_) {
    if (!arguments.length) { return strings; }
    if (!_.barLegend) {
      _.barLegend = defaultStrings.barLegend;
    }
    if (!_.lineLegend) {
      _.lineLegend = defaultStrings.lineLegend;
    }
    strings = language(_);
    barLegend.strings(strings.barLegend);
    lineLegend.strings(strings.lineLegend);
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    bars.direction(_);
    xAxis.direction(_);
    yAxis.direction(_);
    barLegend.direction(_);
    lineLegend.direction(_);
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) { return duration; }
    duration = _;
    bars.duration(_);
    linesBackground.duration(_);
    lines.duration(_);
    return chart;
  };

  chart.delay = function(_) {
    if (!arguments.length) { return delay; }
    delay = _;
    bars.delay(_);
    linesBackground.delay(_);
    lines.delay(_);
    return chart;
  };

  chart.seriesClick = function(_) {
    if (!arguments.length) { return seriesClick; }
    seriesClick = _;
    return chart;
  };

  // Deprecated as of 0.6.5. Use color instead...
  chart.colorFill = function(_) {
    return chart;
  };

  chart.xValueFormat = function(_) {
    if (!arguments.length) {
      return xValueFormat;
    }
    xValueFormat = _;
    return chart;
  };

  chart.yValueFormat = function(_) {
    if (!arguments.length) {
      return yValueFormat;
    }
    yValueFormat = _;
    return chart;
  };

  chart.quotaValueFormat = function(_) {
      if (!arguments.length) {
          return quotaValueFormat;
      }
      quotaValueFormat = _;
      return chart;
  };

  chart.locality = function(_) {
    if (!arguments.length) { return locality; }
    locality = utility.buildLocality(_);
    bars.locality(_);
    linesBackground.locality(_);
    return chart;
  };
  //============================================================

  return chart;
}

function pieChart() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 10, right: 10, bottom: 10, left: 10},
      width = null,
      height = null,
      direction = 'ltr',
      delay = 0,
      duration = 0,
      tooltips = true,
      state = {},
      exclusiveActive = true,
      strings = language();

  var dispatch = d3.dispatch('chartClick', 'elementClick', 'tooltipShow', 'tooltipHide', 'tooltipMove', 'stateChange', 'changeState');

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  // Chart components
  var model = pie();
  var header = headers();

  var controlsData = [];

  var tt = null;

  var tooltipContent = function(eo, properties) {
        // var label = properties.seriesLabel || strings.tooltip.key;
        var y = model.getValue()(eo);
        var x = properties.total ? (y * 100 / properties.total).toFixed(1) : 100;
        var yIsCurrency = properties.yDataType === 'currency';
        var point = {
          key: model.fmtKey()(eo),
          label: yIsCurrency ? strings.tooltip.amount : strings.tooltip.count,
          value: utility.numberFormat(y, 2, yIsCurrency, chart.locality()),
          percent: utility.numberFormat(x, 2, false, chart.locality())
        };
        return tooltip.single(point, strings);
      };

  var showTooltip = function(eo, offsetElement, properties) {
        var content = tooltipContent(eo, properties);
        return tooltip.show(eo.e, content, null, null, offsetElement);
      };

  var seriesClick = function(data, e, chart) { return; };

  header
    .showTitle(true)
    .showControls(false)
    .showLegend(true)
    .alignLegend('center');


  //============================================================

  function chart(selection) {
    selection.each(function(chartData) {

      var that = this,
          container = d3.select(this),
          modelClass = 'pie';

      var properties = chartData ? chartData.properties || {} : {},
          data = chartData ? chartData.data || null : null;

      var containerWidth = parseInt(container.style('width'), 10),
          containerHeight = parseInt(container.style('height'), 10);

      var xIsDatetime = properties.xDataType === 'datetime' || false,
          yIsCurrency = properties.yDataType === 'currency' || false;

      chart.update = function() {
        container.transition().duration(duration).call(chart);
      };

      chart.container = this;


      //------------------------------------------------------------
      // Private method for displaying no data message.

      function displayNoData(data, msg) {
        var hasData = data && data.length;
        var x = (containerWidth - margin.left - margin.right) / 2 + margin.left;
        var y = (containerHeight - margin.top - margin.bottom) / 2 + margin.top;
        return utility.displayNoData(hasData, container, (msg || strings.noData), x, y);
      }

      // Check to see if there's nothing to show.
      if (displayNoData(data)) {
        return chart;
      }


      //------------------------------------------------------------
      // Process data

      chart.setActiveState = function(series, state) {
        series.active = state;
      };

      chart.clearActive = function(reset) {
        data.forEach(function(s) {
          chart.setActiveState(s, reset || '');
        });
        delete state.active;
      };

      // accepts either an event object with actual series data or seriesIndex
      chart.seriesActivate = function(eo) {
        var series = eo.series || data[eo.seriesIndex];
        var activeState;
        if (!series) {
          return;
        }
        if (exclusiveActive) {
          // store toggle active state
          activeState = (
              typeof series.active === 'undefined' ||
              series.active === 'inactive' ||
              series.active === ''
            ) ? 'active' : '';
          // inactivate all series
          chart.clearActive(activeState === 'active' ? 'inactive' : '');
          // then activate the selected series
          chart.setActiveState(series, activeState);
          // set the state to a truthy map
          state.active = data.map(function(s) {
            return s.active === 'active';
          });
        } else {
          chart.dataSeriesActivate({series: series});
        }
      };

      // accepts either an event object with actual series data or seriesIndex
      chart.dataSeriesActivate = function(eo) {
        var series = eo.series;
        series.active = (!series.active || series.active === 'inactive') ? 'active' : 'inactive';
        // if you have activated a data series, inactivate the other non-active series
        if (series.active === 'active') {
          data
            .filter(function(d) {
              return d.active !== 'active';
            })
            .forEach(function(d) {
              d.active = 'inactive';
              return d;
            });
        }
        // if there are no active data series, inactivate them all
        if (!data.filter(function(d) { return d.active === 'active'; }).length) {
          chart.clearActive();
        }
      };

      // add series index to each data point for reference
      data.forEach(function(s, i) {
        s.seriesIndex = i;

        if (!s.values) {
          if (!s.value) {
            s.values = [];
          } else if (!isNaN(s.value)) {
            s.values = [{x: 0, y: parseInt(s.value, 10)}];
          }
        }

        s.values.forEach(function(p, j) {
          p.index = i;
          p.series = s;
          if (typeof p.value == 'undefined') {
            p.value = p.y;
          }
        });

        s.key = s.key || strings.noLabel;
        s.value = s.value || d3.sum(s.values, function(p) { return p.value; });
        s.count = s.count || s.values.length;
        s.disabled = s.disabled || s.value === 0;
      });

      // only sum enabled series
      var modelData = data.filter(function(d) { return !d.disabled; });

      if (!modelData.length) {
        modelData = [{values: []}]; // safety array
      }

      properties.count = d3.sum(modelData, function(d) { return d.count; });

      properties.total = d3.sum(modelData, function(d) { return d.value; });

      //set state.disabled
      state.disabled = data.map(function(d) { return !!d.disabled; });

      //------------------------------------------------------------
      // Display No Data message if there's nothing to show.

      if (!properties.total) {
        displayNoData();
        return chart;
      }

      header
        .chart(chart)
        .title(properties.title)
        .controlsData(controlsData)
        .legendData(data);

      //------------------------------------------------------------
      // Main chart wrappers

      var wrap_bind = container.selectAll('g.sc-chart-wrap').data([modelData]);
      var wrap_entr = wrap_bind.enter().append('g')
            .attr('class', 'sc-chart-wrap sc-chart-' + modelClass);
      var wrap = container.select('.sc-chart-wrap').merge(wrap_entr);

      wrap_entr.append('defs');
      var defs = wrap.select('defs');

      wrap_entr.append('g').attr('class', 'sc-background-wrap');
      var back_wrap = wrap.select('.sc-background-wrap');

      wrap_entr.append('g').attr('class', 'sc-title-wrap');

      wrap_entr.append('g').attr('class', 'sc-' + modelClass + '-wrap');
      var model_wrap = wrap.select('.sc-' + modelClass + '-wrap');

      wrap_entr.append('g').attr('class', 'sc-controls-wrap');
      wrap_entr.append('g').attr('class', 'sc-legend-wrap');

      wrap.attr('transform', utility.translation(margin.left, margin.top));
      wrap_entr.select('.sc-background-wrap').append('rect')
        .attr('class', 'sc-background')
        .attr('x', -margin.left)
        .attr('y', -margin.top)
        .attr('fill', '#FFF');


      //------------------------------------------------------------
      // Main chart draw

      chart.render = function() {

        // Chart layout variables
        var renderWidth, renderHeight,
            availableWidth, availableHeight,
            innerMargin,
            innerWidth, innerHeight,
            headerHeight;

        containerWidth = parseInt(container.style('width'), 10);
        containerHeight = parseInt(container.style('height'), 10);

        renderWidth = width || containerWidth || 960;
        renderHeight = height || containerHeight || 400;

        availableWidth = renderWidth - margin.left - margin.right;
        availableHeight = renderHeight - margin.top - margin.bottom;

        innerMargin = {top: 0, right: 0, bottom: 0, left: 0};
        innerWidth = availableWidth - innerMargin.left - innerMargin.right;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;

        back_wrap.select('.sc-background')
          .attr('width', renderWidth)
          .attr('height', renderHeight);


        //------------------------------------------------------------
        // Title & Legend & Controls

        header
          .width(availableWidth)
          .height(availableHeight);

        container.call(header);

        // Recalc inner margins based on title, legend and control height
        headerHeight = header.getHeight();
        innerMargin.top += headerHeight;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;

        if (innerHeight < 100) {
          displayNoData(null, strings.displayError);
          return chart;
        }


        //------------------------------------------------------------
        // Main Chart Component(s)

        model
          .width(innerWidth)
          .height(innerHeight);

        model_wrap
          .datum(modelData)
          .attr('transform', utility.translation(innerMargin.left, innerMargin.top))
          .transition().duration(duration)
            .call(model);

      };

      //============================================================

      chart.render();

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      header.legend.dispatch.on('legendClick', function(series, i) {
        series.disabled = !series.disabled;
        series.active = false;

        // if there are no enabled data series, enable them all
        if (!data.filter(function(d) { return !d.disabled; }).length) {
          data.forEach(function(d) {
            d.disabled = false;
          });
        }

        // if there are no active data series, activate them all
        if (!data.filter(function(d) { return d.active === 'active'; }).length) {
          data.forEach(function(d) {
            d.active = '';
          });
        }

        state.disabled = data.map(function(d) { return !!d.disabled; });
        dispatch.call('stateChange', this, state);

        chart.update();
      });

      dispatch.on('tooltipShow', function(eo) {
        if (tooltips) {
          tt = showTooltip(eo, that.parentNode, properties);
        }
      });

      dispatch.on('tooltipMove', function(e) {
        if (tt) {
          tooltip.position(that.parentNode, tt, e);
        }
      });

      dispatch.on('tooltipHide', function() {
        if (tooltips) {
          tooltip.cleanup();
        }
      });

      // Update chart from a state object passed to event handler
      dispatch.on('changeState', function(eo) {
        if (typeof eo.disabled !== 'undefined') {
          modelData.forEach(function(series, i) {
            series.disabled = eo.disabled[i];
          });
          state.disabled = eo.disabled;
        }

        chart.update();
      });

      dispatch.on('chartClick', function() {
        //dispatch.call('tooltipHide', this);
        if (header.controls.enabled()) {
          header.controls.dispatch.call('closeMenu', this);
        }
        if (header.legend.enabled()) {
          header.legend.dispatch.call('closeMenu', this);
        }
      });

      model.dispatch.on('elementClick', function(eo) {
        dispatch.call('chartClick', this);
        seriesClick(data, eo, chart);
      });

    });

    return chart;
  }


  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  model.dispatch.on('elementMouseover.tooltip', function(eo) {
    dispatch.call('tooltipShow', this, eo);
  });

  model.dispatch.on('elementMousemove.tooltip', function(e) {
    dispatch.call('tooltipMove', this, e);
  });

  model.dispatch.on('elementMouseout.tooltip', function() {
    dispatch.call('tooltipHide', this);
  });

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.dispatch = dispatch;
  chart.pie = model;
  chart.legend = header.legend;
  chart.controls = header.controls;
  chart.options = utility.optionsFunc.bind(chart);

  utility.rebind(chart, model, 'id', 'color', 'fill', 'classes', 'gradient', 'locality', 'textureFill');
  utility.rebind(chart, model, 'getKey', 'getValue', 'getCount', 'fmtKey', 'fmtValue', 'fmtCount');
  utility.rebind(chart, model, 'showLabels', 'showLeaders', 'donutLabelsOutside', 'pieLabelsOutside', 'labelThreshold');
  utility.rebind(chart, model, 'arcDegrees', 'rotateDegrees', 'minRadius', 'maxRadius', 'fixedRadius', 'startAngle', 'endAngle', 'donut', 'hole', 'holeFormat', 'donutRatio');
  utility.rebind(chart, header, 'showTitle', 'showControls', 'showLegend');

  chart.colorData = function(_) {
    var type = arguments[0],
        params = arguments[1] || {};
    var color = function(d, i) {
          return utility.defaultColor()(d, d.seriesIndex);
        };
    var classes = function(d, i) {
          return 'sc-series sc-series-' + d.seriesIndex;
        };

    switch (type) {
      case 'graduated':
        color = function(d, i) {
          return d3.interpolateHsl(d3.rgb(params.c1), d3.rgb(params.c2))(d.seriesIndex / params.l);
        };
        break;
      case 'class':
        color = function() {
          return 'inherit';
        };
        classes = function(d, i) {
          var iClass = (d.seriesIndex * (params.step || 1)) % 14;
          iClass = (iClass > 9 ? '' : '0') + iClass;
          return 'sc-series sc-series-' + d.seriesIndex + ' sc-fill' + iClass + ' sc-stroke' + iClass;
        };
        break;
      case 'data':
        color = function(d, i) {
          return utility.defaultColor()(d, d.seriesIndex);
        };
        classes = function(d, i) {
          return 'sc-series sc-series-' + d.seriesIndex + (d.classes ? ' ' + d.classes : '');
        };
        break;
    }

    var fill = !params.gradient ? color : function(d, i) {
      return model.gradientFill(d, d.seriesIndex);
    };

    model.color(color);
    model.fill(fill);
    model.classes(classes);

    // don't enable this since controls get a custom function
    // controls.color(color);
    // controls.classes(classes);
    header.legend.color(color);
    header.legend.classes(classes);

    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) { return margin; }
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        margin[prop] = _[prop];
      }
    }
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) { return width; }
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) { return height; }
    height = _;
    return chart;
  };

  chart.tooltips = function(_) {
    if (!arguments.length) { return tooltips; }
    tooltips = _;
    return chart;
  };

  chart.tooltipContent = function(_) {
    if (!arguments.length) { return tooltipContent; }
    tooltipContent = _;
    return chart;
  };

  chart.state = function(_) {
    if (!arguments.length) { return state; }
    state = _;
    return chart;
  };

  chart.strings = function(_) {
    if (!arguments.length) { return strings; }
    strings = language(_);
    header.strings(strings);
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    model.direction(_);
    header.direction(_);
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) { return duration; }
    duration = _;
    model.duration(_);
    return chart;
  };

  chart.delay = function(_) {
    if (!arguments.length) { return delay; }
    delay = _;
    model.delay(_);
    return chart;
  };

  chart.seriesClick = function(_) {
    if (!arguments.length) {
      return seriesClick;
    }
    seriesClick = _;
    return chart;
  };

  //============================================================

  return chart;
}

function treeChart() {
  // issues: 1. zoom slider doesn't zoom on chart center

  // all hail, stepheneb
  // https://gist.github.com/1182434
  // http://mbostock.github.com/d3/talk/20111018/tree.html
  // https://groups.google.com/forum/#!topic/d3-js/-qUd_jcyGTw/discussion
  // http://ajaxian.com/archives/foreignobject-hey-youve-got-html-in-my-svg
  // [possible improvements @ http://bl.ocks.org/robschmuecker/7880033]

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  // specific to org chart
  var margin = {'top': 10, 'right': 10, 'bottom': 10, 'left': 10}, // this is the distance from the edges of the svg to the chart,
      width = null,
      height = null,
      r = 6,
      duration = 0,
      zoomExtents = {'min': 0.25, 'max': 2},
      nodeSize = {'width': 100, 'height': 50},
      nodeImgPath = '../img/',
      nodeRenderer = function(d) { return '<div class="sc-tree-node"></div>'; },
      zoomCallback = function(d) { return; },
      nodeCallback = function(d) { return; },
      nodeClick = function(d) { return; },
      horizontal = false;

  var id = Math.floor(Math.random() * 10000), //Create semi-unique ID in case user doesn't select one,
      color = function(d, i) { return utility.defaultColor()(d, i); },
      fill = function(d, i) { return color(d, i); },

      // setX = function(d, v) { d.x = v; },
      setY = function(d, v) { d.y = v; },
      setX0 = function(d, v) { d.data.x0 = v; },
      setY0 = function(d, v) { d.data.y0 = v; },

      getX = function(d) { return horizontal ? d.y : d.x; },
      getY = function(d) { return horizontal ? d.x : d.y; },
      getX0 = function(d) { return horizontal ? d.data.y0 : d.data.x0; },
      getY0 = function(d) { return horizontal ? d.data.x0 : d.data.y0; },

      getId = function(d) { return d.id || d.data.id; },
      getCardId = function(d) { return 'card-' + getId(d); },

      useClass = false,
      clipEdge = true,
      showLabels = true,
      dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout');

  //============================================================

  function chart(selection) {
    selection.each(function(data) {

      var container = d3.select(this);

      // trunk is either the entire tree (data)
      // or a pruning created by chart.filter()
      var trunk = data;

      var tran = d3.transition('tree')
            .duration(duration)
            .ease(d3.easeLinear);

      var root = null;
      var nodeData = null;
      var linkData = null;
      var zoom = null;

      var dendrogram = d3.tree()
            .size([null, null])
            .nodeSize([(horizontal ? nodeSize.height : nodeSize.width), 1])
            .separation(function separation(a, b) {
              return a.parent == b.parent ? 1 : 1;
            });

      var availableSize = { // the size of the svg container minus margin
            'width': parseInt(container.style('width'), 10) - margin.left - margin.right,
            'height': parseInt(container.style('height'), 10) - margin.top - margin.bottom
          };

      //------------------------------------------------------------
      // Setup svgs and skeleton of chart

      var wrap_bind = container.selectAll('g.sc-chart-wrap').data([1]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-chart-wrap sc-chart-tree');
      var wrap = container.select('.sc-chart-wrap').merge(wrap_entr);

      var defs_entr = wrap_entr.append('defs');
      var defs = wrap.select('defs').merge(defs_entr);
      var nodeShadow = utility.dropShadow('node_back_' + id, defs, {blur: 2});

      defs_entr.append('clipPath').attr('id', 'sc-edge-clip-' + id).append('rect');
      var clipPath = defs.select('#sc-edge-clip-' + id + ' rect');
      clipPath
        .attr('width', availableSize.width)
        .attr('height', availableSize.height)
        .attr('x', margin.left)
        .attr('y', margin.top);
      wrap.attr('clip-path', clipEdge ? 'url(#sc-edge-clip-' + id + ')' : '');

      wrap_entr.append('rect')
        .attr('class', 'sc-chart-background')
        .attr('width', availableSize.width)
        .attr('height', availableSize.height)
        .attr('transform', utility.translation(margin.left, margin.top))
        .style('fill', 'transparent');
      var backg = wrap.select('.sc-chart-background');

      var g_entr = wrap_entr.append('g').attr('class', 'sc-tree-wrap');
      var g_wrap = wrap.select('.sc-tree-wrap');

      g_entr.append('g').attr('class', 'sc-wrap sc-tree');
      var tree_wrap = wrap.select('.sc-wrap.sc-tree');

      function grow(seed) {
        root = d3.hierarchy(seed, function(d) {
          return d.children;
        });

        dendrogram(root); // apply tree structure to data

        nodeData = root.descendants();

        nodeData.forEach(function(d) {
          setY(d, d.depth * 2 * (horizontal ? nodeSize.width : nodeSize.height));
        });

        linkData = nodeData.slice(1);
      }

      function foliate(limb) {
        setX0(limb, getX(limb));
        setY0(limb, getY(limb));
        if (limb.children && limb.children.length) {
          limb.children.forEach(foliate);
        }
      }

      function diagonal(d, p) {
        var dy = getY(d) - (horizontal ? 0 : nodeSize.height - r * 3),
            dx = getX(d) - (horizontal ? nodeSize.width - r * 2 : 0),
            py = getY(p),
            px = getX(p),
            cdx = horizontal ? (dx + px) / 2 : dx,
            cdy = horizontal ? dy : (dy + py) / 2,
            cpx = horizontal ? (dx + px) / 2 : px,
            cpy = horizontal ? py : (dy + py) / 2;
        return 'M' + dx + ',' + dy
             + 'C' + cdx + ',' + cdy
             + ' ' + cpx + ',' + cpy
             + ' ' + px + ',' + py;
      }

      // Toggle children.
      function toggle(branch) {
        if (branch.children) {
          branch._children = branch.children;
          branch.children = null;
        } else {
          branch.children = branch._children;
          branch._children = null;
        }
      }

      // Click tree node.
      function leafClick(leaf) {
        toggle(leaf.data);
        chart.update(leaf);
      }

      // Get the card id
      function getNodeId(d) {
        var id = 'node-' + getId(d);
        return id;
      }

      // Get the link id
      function getLinkId(d) {
        var id = 'link-' + (d.parent ? getId(d.parent) : 0) + '-' + getId(d);
        return id;
      }


      chart.setZoom = function() {
        zoom = d3.zoom()
          .scaleExtent([zoomExtents.min, zoomExtents.max])
          .on('zoom', function() {
            g_wrap.attr('transform', 'translate(' + d3.event.transform.x + ',' + d3.event.transform.y + ')scale(' + d3.event.transform.k + ')');
            zoomCallback(d3.event.transform.k);
          });
      };
      chart.unsetZoom = function(argument) {
        zoom.on('zoom', null);
      };
      chart.resetZoom = function() {
        wrap.call(zoom.transform, d3.zoomIdentity);
      };

      chart.orientation = function(orientation) {
        horizontal = (orientation === 'horizontal' || !horizontal ? true : false);
        dendrogram.nodeSize([(horizontal ? nodeSize.height : nodeSize.width), 1]);
        chart.update(root);
      };

      chart.showall = function() {
        function expandAll(d) {
          if (d._children && d._children.length) {
              d.children = d._children;
              d._children = null;
          }
          if (d.children && d.children.length) {
            d.children.forEach(expandAll);
          }
        }
        trunk = data;
        expandAll(trunk);
        chart.update(root);
      };

      chart.zoomStep = function(step) {
        var transform = d3.zoomTransform(wrap.node());
        var level = transform.k + step;
        return this.zoomLevel(level);
      };

      chart.zoomLevel = function(level) {
        var transform = d3.zoomTransform(wrap.node());
        var scale = Math.min(Math.max(level, zoomExtents.min), zoomExtents.max);
        var prevScale = transform.k;
        var prevTrans = [transform.x, transform.y];

        var treeBBox = backg.node().getBoundingClientRect();
        var size = [
              treeBBox.width,
              treeBBox.height
            ];

        var offset = [
              (size[0] - size[0] * scale) / 2,
              (size[1] - size[1] * scale) / 2
            ];

        var shift = [
              scale * (prevTrans[0] - (size[0] - size[0] * prevScale) / 2) / prevScale,
              scale * (prevTrans[1] - (size[1] - size[1] * prevScale) / 2) / prevScale
            ];

        var translate = [
              offset[0] + shift[0],
              offset[1] + shift[1]
            ];

        var t = d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale);

        wrap.call(zoom.transform, t);

        return scale;
      };

      chart.zoomScale = function() {
        var transform = d3.zoomTransform(wrap.node());
        return transform.k;
      };

      chart.filter = function(node) {
        var found = false;

        function prune(d) {
          if (getId(d) === node) {
            trunk = d;
            found = true;
          } else if (!found && d.children) {
            d.children.forEach(prune);
          }
        }

        // Initialize the display to show a few nodes.
        // Start with the original data and set a new trunk.
        prune(data);

        chart.update(root);
      };

      // source is either root or a selected node
      chart.update = function(source) {
        var target = {x: 0, y: 0};

        function initial(d) {
          // if the source is root
          if (getId(source) === getId(root)) {
            return diagonal(root, root);
          } else {
            var node = {x: getX0(source), y: getY0(source)};
            return diagonal(node, node);
          }
        }
        function extend(branch) {
          return diagonal(branch, branch.parent);
        }
        function retract() {
          return diagonal(target, target);
        }

        grow(trunk);

        var nodeOffsetX = (horizontal ? r - nodeSize.width : nodeSize.width / -2) + 'px';
        var nodeOffsetY = (horizontal ? (r - nodeSize.height) / 2 : r * 2 - nodeSize.height) + 'px';

        // Update the nodes…
        var nodes_bind = tree_wrap.selectAll('g.sc-card').data(nodeData, getId);

        // Enter any new nodes at the parent's previous position.
        var nodes_entr;
        nodes_entr = nodes_bind.enter().insert('g')
          .attr('class', 'sc-card')
          .attr('id', getNodeId)
          .attr('opacity', function(d) {
            return getId(source) === getId(d) ? 1 : 0;
          })
          .attr('transform', function(d) {
            // if the source is root
            if (getId(source) === getId(root)) {
              return 'translate(' + getX(root) + ',' + getY(root) + ')';
            } else {
              return 'translate(' + (horizontal ? getY0(source) : getX0(source)) + ',' + (horizontal ? getX0(source) : getY0(source)) + ')';
            }
          });

        // For each node create a shape for node content display
        // Create <use> nodes in defs
        nodes_entr.each(function(d) {
          var nodeObject;
          var nodeContent;
          if (!defs.select('#' + getCardId(d)).empty()) {
            return;
          }
          nodeObject = defs.append('svg')
            .attr('class', 'sc-foreign-object')
            .attr('id', getCardId(d))
            .attr('version', '1.1')
            .attr('xmlns', 'http://www.w3.org/2000/svg')
            .attr('xmlns:xlink', 'http://www.w3.org/1999/xlink')
            .attr('x', nodeOffsetX)
            .attr('y', nodeOffsetY)
            .attr('width', nodeSize.width + 'px')
            .attr('height', nodeSize.height + 'px')
            .attr('viewBox', '0 0 ' + nodeSize.width + ' ' + nodeSize.height)
            .attr('xml:space', 'preserve');

          nodeContent = nodeObject.append('g')
            .attr('class', 'sc-tree-node-content')
            .attr('transform', 'translate(' + r + ',' + r + ')');

          nodeRenderer(nodeContent, d, nodeSize.width - r * 2, nodeSize.height - r * 3);
        });

        // Apply node content from <use>
        nodes_entr.append('use')
          .attr('xlink:href', function(d) {
            return '#' + getCardId(d);
          })
          .attr('filter', nodeShadow)
          .on('click', nodeClick);

        // Transition nodes to their new position.
        var nodes;
        nodes = tree_wrap.selectAll('g.sc-card').merge(nodes_entr);
        nodes.transition(tran).duration(duration)
          .attr('opacity', 1)
          .attr('transform', function(d) {
            if (getId(source) === getId(d)) {
              target = {x: horizontal ? getY(d) : getX(d), y: horizontal ? getX(d) : getY(d)};
            }
            return 'translate(' + getX(d) + ',' + getY(d) + ')';
          })
          .on('end', nodeCallback);

        // Transition exiting nodes to the parent's new position.
        var nodes_exit;
        nodes_exit = nodes_bind.exit().transition(tran).duration(duration)
          .attr('opacity', 0)
          .attr('transform', function(d) {
            return 'translate(' + getX0(source) + ',' + getY0(source) + ')';
          })
          .remove();
        nodes_exit.selectAll('.sc-expcoll')
          .style('stroke-opacity', 1e-6);

        defs.selectAll('.sc-foreign-object')
            .attr('x', nodeOffsetX)
            .attr('y', nodeOffsetY);

        // Update the node expand/collapse circle
        var xc_enter;
        xc_enter = nodes_entr.append('g').attr('class', 'sc-expcoll')
          .style('opacity', 1e-6)
          .on('click', leafClick);
        xc_enter.append('circle').attr('class', 'sc-circ-back')
          .attr('r', r);
        xc_enter.append('line').attr('class', 'sc-line-vert')
          .attr('x1', 0).attr('y1', 0.5 - r).attr('x2', 0).attr('y2', r - 0.5)
          .style('stroke', '#bbb');
        xc_enter.append('line').attr('class', 'sc-line-hrzn')
          .attr('x1', 0.5 - r).attr('y1', 0).attr('x2', r - 0.5).attr('y2', 0)
          .style('stroke', '#fff');

        var xc;
        xc = tree_wrap.selectAll('g.sc-expcoll').merge(xc_enter);
        xc.style('opacity', function(d) {
            return ((d.data.children && d.data.children.length) || (d.data._children && d.data._children.length)) ? 1 : 0;
          });
        xc.select('.sc-circ-back')
          .style('fill', function(d) {
            return (d.data._children && d.data._children.length) ? '#777' : (d.data.children ? '#bbb' : 'none');
          });
        xc.select('.sc-line-vert')
          .style('stroke', function(d) {
            return (d.data._children && d.data._children.length) ? '#fff' : '#bbb';
          });


        // Update the links
        var links_bind = tree_wrap.selectAll('path.link').data(linkData, getLinkId);
            // Enter any new links at the parent's previous position.
        var links_entr = links_bind.enter().insert('path', 'g')
              .attr('d', initial)
              .attr('class', 'link')
              .attr('id', getLinkId)
              .attr('opacity', 0);

        var links;
        links = tree_wrap.selectAll('path.link').merge(links_entr);
        // Transition links to their new position.
        links.transition(tran).duration(duration)
          .attr('d', extend)
          .attr('opacity', 1);
        // Transition exiting nodes to the parent's new position.
        links_bind.exit().transition(tran).duration(duration)
          .attr('d', retract)
          .attr('opacity', 0)
          .remove();


        // Stash the old positions for transition.
        foliate(root);

        chart.resize(getId(source) === getId(root));
      };

      chart.render = function() {
        chart.resize(true);
      };

      // This resizes and repositions the .sc-tree group to fit in the container
      // with a zoom and translate set to identity
      chart.resize = function(initial) {
        initial = typeof initial === 'undefined' ? true : initial;

        chart.resetZoom();

        // the size of the svg container minus margin
        availableSize = {
          'width': parseInt(container.style('width'), 10) - margin.left - margin.right,
          'height': parseInt(container.style('height'), 10) - margin.top - margin.bottom
        };

        // the size of the chart itself
        var size = [
              Math.abs(d3.min(nodeData, getX)) + Math.abs(d3.max(nodeData, getX)) + nodeSize.width,
              Math.abs(d3.min(nodeData, getY)) + Math.abs(d3.max(nodeData, getY)) + nodeSize.height
            ];

        // initial chart scale to fit chart in container
        var xScale = availableSize.width / size[0],
            yScale = availableSize.height / size[1],
            scale = d3.min([xScale, yScale]);

        // initial chart translation to position chart in the center of container
        var center = [
              Math.abs(d3.min(nodeData, getX)) +
                (xScale < yScale ? 0 : (availableSize.width / scale - size[0]) / 2),
              Math.abs(d3.min(nodeData, getY)) +
                (xScale < yScale ? (availableSize.height / scale - size[1]) / 2 : 0)
            ];

        var offset = [
              nodeSize.width / (horizontal ? 1 : 2),
              nodeSize.height / (horizontal ? 2 : 1)
            ];

        var translate = [
              (center[0] + offset[0]) * scale + margin.left / (horizontal ? 2 : 1),
              (center[1] + offset[1]) * scale + margin.top / (horizontal ? 1 : 2)
            ];

        clipPath
          .attr('width', availableSize.width)
          .attr('height', availableSize.height);

        backg
          .attr('width', availableSize.width)
          .attr('height', availableSize.height);

        // TODO: do we need to interrupt transitions on resize to prevent Too late... error?
        // tree_wrap.interrupt().selectAll('*').interrupt();

        tree_wrap
          .transition(tran).duration(initial ? 0 : duration)
          .attr('transform', 'translate(' + translate + ')scale(' + scale + ')');
      };


      chart.setZoom();
      wrap.call(zoom);

      // Compute the new tree layout root
      grow(trunk);
      // Then preset X0/Y0 values for transformations
      // Note: these cannot be combined because of chart.update
      // which doesn't repopulate X0/Y0 until after render
      foliate(root);

      chart.update(root);

    });

    return chart;
  }

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;
  chart.options = utility.optionsFunc.bind(chart);

  chart.id = function(_) {
    if (!arguments.length) { return id; }
    id = _;
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) { return margin; }
    margin = _;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) { return width; }
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) { return height; }
    height = _;
    return chart;
  };

  chart.x = function(_) {
    if (!arguments.length) { return getX; }
    getX = _;
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) { return getY; }
    getY = utility.functor(_);
    return chart;
  };

  chart.showLabels = function(_) {
    if (!arguments.length) { return showLabels; }
    showLabels = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) { return color; }
    color = _;
    return chart;
  };
  chart.fill = function(_) {
    if (!arguments.length) { return fill; }
    fill = _;
    return chart;
  };
  chart.useClass = function(_) {
    if (!arguments.length) { return useClass; }
    useClass = _;
    return chart;
  };

  // ORG

  chart.radius = function(_) {
    if (!arguments.length) { return r; }
    r = _;
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) { return duration; }
    duration = _;
    return chart;
  };

  chart.zoomExtents = function(_) {
    if (!arguments.length) { return zoomExtents; }
    zoomExtents = _;
    return chart;
  };

  chart.zoomCallback = function(_) {
    if (!arguments.length) { return zoomCallback; }
    zoomCallback = _;
    return chart;
  };

  chart.nodeSize = function(_) {
    if (!arguments.length) { return nodeSize; }
    nodeSize = _;
    return chart;
  };

  chart.nodeImgPath = function(_) {
    if (!arguments.length) { return nodeImgPath; }
    nodeImgPath = _;
    return chart;
  };

  chart.nodeRenderer = function(_) {
    if (!arguments.length) { return nodeRenderer; }
    nodeRenderer = _;
    return chart;
  };

  chart.nodeCallback = function(_) {
    if (!arguments.length) { return nodeCallback; }
    nodeCallback = _;
    return chart;
  };

  chart.nodeClick = function(_) {
    if (!arguments.length) { return nodeClick; }
    nodeClick = _;
    return chart;
  };

  chart.horizontal = function(_) {
    if (!arguments.length) { return horizontal; }
    horizontal = _;
    return chart;
  };

  chart.getId = function(_) {
    if (!arguments.length) { return getId; }
    getId = _;
    return chart;
  };

  chart.getCardId = function(_) {
    if (!arguments.length) { return getCardId; }
    getCardId = _;
    return chart;
  };

  //============================================================

  return chart;
}

function treemapChart() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 10, right: 10, bottom: 10, left: 10},
      width = null,
      height = null,
      direction = 'ltr',
      delay = 0,
      duration = 0,
      tooltips = true,
      colorData = 'default',
      //create a clone of the d3 array
      colorArray = d3.scaleOrdinal(d3.schemeCategory20).range().map(utility.identity),
      state = {},
      strings = language();

  var dispatch = d3.dispatch(
        'chartClick', 'elementClick', 'tooltipShow', 'tooltipHide', 'tooltipMove',
        'elementMousemove'
      );

  var tooltipContent = function(point, properties) {
        var tt = '<h3>' + point.data.name + '</h3>' +
                 '<p>' + utility.numberFormatSI(point.value) + '</p>';
        return tt;
      };

  var seriesClick = function(data, i, chart) {
        return;
      };

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  // Chart components
  var model = treemap();
  var header = headers();

  var controlsData = [];
  var tt = null;

  var showTooltip = function(eo, offsetElement, properties) {
        var content = tooltipContent(eo.point, properties);
        return tooltip.show(eo.e, content, null, null, offsetElement);
      };

  header
    .showTitle(true)
    .showControls(false)
    .showLegend(false);


  //============================================================

  function chart(selection) {
    selection.each(function(chartData) {

      var that = this,
          container = d3.select(this),
          modelClass = 'treemap';

      var properties = {};
      var data = [chartData];

      var containerWidth = parseInt(container.style('width'), 10),
          containerHeight = parseInt(container.style('height'), 10);

      chart.update = function() {
        container.transition().duration(duration).call(chart);
      };

      chart.setActiveState = function(child, state) {
        child.active = state;
        // series.values.forEach(function(v) {
        //   v.active = state;
        // });
      };

      chart.clearActive = function(d) {
        var parent = d || data;
        if (parent.children) {
          parent.children.forEach(function(child) {
            chart.setActiveState(child, '');
          });
        }
      };

      chart.cellActivate = function(eo) {
        // seriesClick is defined outside chart scope, so when it calls
        // cellActivate, it only has access to (data, eo, chart)
        var cell = eo.d;
        var activeState;

        if (!cell) {
          return;
        }

        // store toggle active state
        activeState = (
            typeof cell.active === 'undefined' ||
            cell.active === 'inactive' ||
            cell.active === ''
          ) ? 'active' : '';

        // unset entire active state first
        chart.clearActive(cell.parent);

        cell.active = activeState;

        chart.render();
      };

      chart.container = this;


      //------------------------------------------------------------
      // Private method for displaying no data message.

      function displayNoData(data, msg) {
        var hasData = data && data.length && data.filter(function(series) {
          return series && series.children && series.children.length;
        }).length;
        var x = (containerWidth - margin.left - margin.right) / 2 + margin.left;
        var y = (containerHeight - margin.top - margin.bottom) / 2 + margin.top;
        return utility.displayNoData(hasData, container, (msg || strings.noData), x, y);
      }

      // Check to see if there's nothing to show.
      if (displayNoData(data)) {
        return chart;
      }


      //------------------------------------------------------------
      // Process data

      // only sum enabled series
      var modelData = data.filter(function(d) { return !d.disabled; });

      //remove existing colors from default color array, if any
      // if (colorData === 'data') {
      //   removeColors(data[0]);
      // }

      //------------------------------------------------------------
      // Display No Data message if there's nothing to show.

      if (!modelData.length) {
        displayNoData();
        return chart;
      }

      header
        .chart(chart)
        .title(properties.title)
        .controlsData(controlsData)
        .legendData(data);

      //------------------------------------------------------------
      // Main chart wrappers

      var wrap_bind = container.selectAll('g.sc-chart-wrap').data([modelData]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-chart-wrap sc-chart-' + modelClass);
      var wrap = container.select('.sc-chart-wrap').merge(wrap_entr);

      wrap_entr.append('defs');

      wrap_entr.append('g').attr('class', 'sc-background-wrap');
      var back_wrap = wrap.select('.sc-background-wrap');

      wrap_entr.append('g').attr('class', 'sc-title-wrap');

      wrap_entr.append('g').attr('class', 'sc-' + modelClass + '-wrap');
      var model_wrap = wrap.select('.sc-' + modelClass + '-wrap');

      wrap_entr.append('g').attr('class', 'sc-controls-wrap');
      wrap_entr.append('g').attr('class', 'sc-legend-wrap');

      wrap.attr('transform', utility.translation(margin.left, margin.top));
      wrap_entr.select('.sc-background-wrap').append('rect')
        .attr('class', 'sc-background')
        .attr('x', -margin.left)
        .attr('y', -margin.top)
        .attr('fill', '#FFF');


      //------------------------------------------------------------
      // Main chart draw

      chart.render = function() {

        // Chart layout variables
        var renderWidth, renderHeight,
            availableWidth, availableHeight,
            innerMargin,
            innerWidth, innerHeight,
            headerHeight;

        containerWidth = parseInt(container.style('width'), 10);
        containerHeight = parseInt(container.style('height'), 10);

        renderWidth = width || containerWidth || 960;
        renderHeight = height || containerHeight || 400;

        availableWidth = renderWidth - margin.left - margin.right;
        availableHeight = renderHeight - margin.top - margin.bottom;

        innerMargin = {top: 0, right: 0, bottom: 0, left: 0};
        innerWidth = availableWidth - innerMargin.left - innerMargin.right;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;

        back_wrap.select('.sc-background')
          .attr('width', renderWidth)
          .attr('height', renderHeight);


        //------------------------------------------------------------
        // Title & Legend & Controls

        header
          .width(availableWidth)
          .height(availableHeight);

        container.call(header);

        // Recalc inner margins based on title, legend and control height
        headerHeight = header.getHeight();
        // innerMargin.top += headerHeight;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;

        if (innerHeight < 100) {
          displayNoData(null, strings.displayError);
          return chart;
        }


        //------------------------------------------------------------
        // Main Chart Component(s)

        model
          .width(innerWidth)
          .height(innerHeight);

        model_wrap
          .datum(modelData)
          .attr('transform', utility.translation(innerMargin.left, innerMargin.top))
          .transition().duration(duration)
            .call(model);

      };

      //============================================================

      chart.render();

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      header.legend.dispatch.on('legendClick', function(series, i) {
        series.disabled = !series.disabled;

        // if there are no enabled data series, enable them all
        if (!data.filter(function(d) { return !d.disabled; }).length) {
          data.forEach(function(d) {
            d.disabled = false;
          });
        }

        chart.update();
      });

      dispatch.on('tooltipShow', function(eo) {
        if (tooltips) {
          tt = showTooltip(eo, that.parentNode);
        }
      });

      dispatch.on('tooltipMove', function(e) {
        if (tt) {
          tooltip.position(that.parentNode, tt, e);
        }
      });

      dispatch.on('tooltipHide', function() {
        if (tooltips) {
          tooltip.cleanup();
        }
      });

      model.dispatch.on('chartClick', function(eo) {
        if (eo.children) {
          chart.clearActive(eo);
        }
      });

      model.dispatch.on('elementClick', function(eo) {
        seriesClick(data, eo, chart);
      });


      //============================================================

      // function removeColors(d) {
      //   var i, l;
      //   if (d.color && colorArray.indexOf(d.color) !== -1) {
      //     colorArray.splice(colorArray.indexOf(d.color), 1);
      //   }
      //   if (d.children) {
      //     l = d.children.length;
      //     for (i = 0; i < l; i += 1) {
      //       removeColors(d.children[i]);
      //     }
      //   }
      // }

    });

    return chart;
  }


  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  model.dispatch.on('elementMouseover.tooltip', function(eo) {
    dispatch.call('tooltipShow', this, eo);
  });

  model.dispatch.on('elementMousemove.tooltip', function(e) {
    dispatch.call('tooltipMove', this, e);
  });

  model.dispatch.on('elementMouseout.tooltip', function() {
    dispatch.call('tooltipHide', this);
  });

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.dispatch = dispatch;
  chart.treemap = model;
  chart.legend = header.legend;
  chart.options = utility.optionsFunc.bind(chart);

  utility.rebind(chart, model, 'id', 'color', 'fill', 'classes', 'gradient');
  utility.rebind(chart, model, 'leafClick', 'getValue', 'getKey', 'textureFill');
  utility.rebind(chart, header, 'showTitle', 'showControls', 'showLegend');

  chart.colorData = function(_) {
    if (!arguments.length) { return colorData; }

    var type = arguments[0],
        params = arguments[1] || {};
    var color = function(d, i) {
          var c = (type === 'data' && d.color) ? {color: d.color} : {};
          return utility.getColor(colorArray)(c, i);
        };
    var classes = function(d, i) {
          return 'sc-child';
        };

    switch (type) {
      case 'graduated':
        color = function(d, i, l) {
          return d3.interpolateHsl(d3.rgb(params.c1), d3.rgb(params.c2))(i / l);
        };
        break;
      case 'class':
        color = function() {
          return 'inherit';
        };
        classes = function(d, i) {
          var iClass = (i * (params.step || 1)) % 14;
          iClass = (iClass > 9 ? '' : '0') + iClass;
          return 'sc-child ' + (d.className || 'sc-fill' + iClass);
        };
        break;
    }

    var fill = !params.gradient ? color : function(d, i) {
      var p = {
        orientation: params.orientation || 'horizontal',
        position: params.position || 'base'
      };
      return model.gradientFill(d, i, p);
    };

    model.color(color);
    model.fill(fill);
    model.classes(classes);

    header.legend.color(color);
    header.legend.classes(classes);

    colorData = arguments[0];

    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) { return margin; }
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        margin[prop] = _[prop];
      }
    }
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) { return width; }
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) { return height; }
    height = _;
    return chart;
  };

  chart.tooltips = function(_) {
    if (!arguments.length) { return tooltips; }
    tooltips = _;
    return chart;
  };

  chart.tooltipContent = function(_) {
    if (!arguments.length) { return tooltipContent; }
    tooltipContent = _;
    return chart;
  };

  chart.strings = function(_) {
    if (!arguments.length) { return strings; }
    strings = language(_);
    header.strings(strings);
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    model.direction(_);
    header.direction(_);
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) { return duration; }
    duration = _;
    model.duration(_);
    return chart;
  };

  chart.delay = function(_) {
    if (!arguments.length) { return delay; }
    delay = _;
    model.delay(_);
    return chart;
  };

  chart.seriesClick = function(_) {
    if (!arguments.length) { return seriesClick; }
    seriesClick = _;
    return chart;
  };

  //============================================================

  return chart;
}

/*-------------------
       CHARTS
-------------------*/

var charts = {
    areaChart: areaChart,
    bubbleChart: bubbleChart,
    funnelChart: funnelChart,
    gaugeChart: gaugeChart,
    globeChart: globeChart,
    lineChart: lineChart,
    multibarChart: multibarChart,
    paretoChart: paretoChart,
    pieChart: pieChart,
    treeChart: treeChart,
    treemapChart: treemapChart,
};

// false & scr are substitution variables for rollup
var version = '0.8.2'; // set by rollup script from package.json
var build = 'scr'; // set scr for sucrose and sgr for Sugar
var development = false; // set false when in production

exports.version = version;
exports.build = build;
exports.development = development;
exports.utility = utility;
exports.tooltip = tooltip;
exports.language = language;
exports.models = models;
exports.charts = charts;
exports.transform = transform;

Object.defineProperty(exports, '__esModule', { value: true });

})));
