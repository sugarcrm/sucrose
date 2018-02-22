import d3 from 'd3';

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

export default utility;
