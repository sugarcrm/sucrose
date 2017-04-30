/* Copyright (c) 2017 SugarCRM Inc. Licensed by SugarCRM under the Apache 2.0 license. */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('./d3v4.js'), require('d3fc-rebind')) :
	typeof define === 'function' && define.amd ? define(['exports', 'd3v4', 'd3fc-rebind'], factory) :
	(factory((global.sucrose = global.sucrose || {}),global.d3v4,global.fc));
}(this, (function (exports,d3,fc) { 'use strict';

d3 = 'default' in d3 ? d3['default'] : d3;
fc = 'default' in fc ? fc['default'] : fc;

var version = "0.5.5";

/*-------------------
      UTILITIES
-------------------*/
const utility = {};

utility.strip = function(s) {
  return s.replace(/(\s|&)/g,'');
};

utility.identity = function(d) {
  return d;
};

utility.functor = function functor(v) {
  return typeof v === "function" ? v : function() {
    return v;
  };
};

utility.daysInMonth = function(month, year) {
  return (new Date(year, month+1, 0)).getDate();
};

utility.windowSize = function () {
  // Sane defaults
  var size = {width: 640, height: 480};

  // Earlier IE uses Doc.body
  if (document.body && document.body.offsetWidth) {
      size.width = document.body.offsetWidth;
      size.height = document.body.offsetHeight;
  }

  // IE can use depending on mode it is in
  if (document.compatMode === 'CSS1Compat' &&
      document.documentElement &&
      document.documentElement.offsetWidth ) {
      size.width = document.documentElement.offsetWidth;
      size.height = document.documentElement.offsetHeight;
  }

  // Most recent browsers use
  if (window.innerWidth && window.innerHeight) {
      size.width = window.innerWidth;
      size.height = window.innerHeight;
  }
  return (size);
};

// Easy way to bind multiple functions to window.onresize
  // TODO: give a way to remove a function after its bound, other than removing alkl of them
  // utility.windowResize = function (fun)
  // {
  //   var oldresize = window.onresize;

  //   window.onresize = function (e) {
  //     if (typeof oldresize == 'function') oldresize(e);
  //     fun(e);
  //   }
// }

utility.windowResize = function (fun) {
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

utility.windowUnResize = function (fun) {
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

utility.resizeOnPrint = function (fn) {
  if (window.matchMedia) {
      var mediaQueryList = window.matchMedia('print');
      mediaQueryList.addListener(function (mql) {
          if (mql.matches) {
              fn();
          }
      });
  } else if (window.attachEvent) {
    window.attachEvent("onbeforeprint", fn);
  } else {
    window.onbeforeprint = fn;
  }
  //TODO: allow for a second call back to undo using
  //window.attachEvent("onafterprint", fn);
};

utility.unResizeOnPrint = function (fn) {
  if (window.matchMedia) {
      var mediaQueryList = window.matchMedia('print');
      mediaQueryList.removeListener(function (mql) {
          if (mql.matches) {
              fn();
          }
      });
  } else if (window.detachEvent) {
    window.detachEvent("onbeforeprint", fn);
  } else {
    window.onbeforeprint = null;
  }
};

// Backwards compatible way to implement more d3-like coloring of graphs.
// If passed an array, wrap it in a function which implements the old default
// behavior
utility.getColor = function (color) {
  if (!arguments.length) {
    //if you pass in nothing, get default colors back
    return utility.defaultColor();
  }

  if (Array.isArray(color)) {
    return function (d, i) {
      return d.color || color[i % color.length];
    };
  } else if (Object.prototype.toString.call(color) === '[object String]') {
    return function(s) {
      return d.color || '#' + color.replace('#', '');
    }
  } else {
    return color;
      // can't really help it if someone passes rubbish as color
      // or color is already a function
  }
};

// Default color chooser uses the index of an object as before.
utility.defaultColor = function () {
  var colors = d3.scaleOrdinal(d3.schemeCategory20).range();
  return function (d, i) {
    return d.color || colors[i % colors.length];
  };
};

// Returns a color function that takes the result of 'getKey' for each series and
// looks for a corresponding color from the dictionary,
utility.customTheme = function (dictionary, getKey, defaultColors) {
  getKey = getKey || function (series) { return series.key; }; // use default series.key if getKey is undefined
  defaultColors = defaultColors || d3.scaleOrdinal(d3.schemeCategory20).range(); //default color function

  var defIndex = defaultColors.length; //current default color (going in reverse)

  return function (series, index) {
    var key = getKey(series);

    if (!defIndex) defIndex = defaultColors.length; //used all the default colors, start over

    if (typeof dictionary[key] !== "undefined") {
      return (typeof dictionary[key] === "function") ? dictionary[key]() : dictionary[key];
    } else {
      return defaultColors[--defIndex]; // no match in dictionary, use default color
    }
  };
};

// From the PJAX example on d3js.org, while this is not really directly needed
// it's a very cool method for doing pjax, I may expand upon it a little bit,
// open to suggestions on anything that may be useful
utility.pjax = function (links, content) {
  d3.selectAll(links).on("click", function () {
    history.pushState(this.href, this.textContent, this.href);
    load(this.href);
    d3.event.preventDefault();
  });

  function load(href) {
    d3.html(href, function (fragment) {
      var target = d3.select(content).node();
      target.parentNode.replaceChild(d3.select(fragment).select(content).node(), target);
      utility.pjax(links, content);
    });
  }

  d3.select(window).on("popstate", function () {
    if (d3.event.state) { load(d3.event.state); }
  });
};

/* Numbers that are undefined, null or NaN, convert them to zeros.
*/
utility.NaNtoZero = function(n) {
  if (typeof n !== 'number'
      || isNaN(n)
      || n === null
      || n === Infinity) return 0;

  return n;
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
  if (args) {
    d3.map(args).forEach((function(key,value) {
      if (typeof this[key] === "function") {
         this[key](value);
      }
    }).bind(this));
  }
  return this;
};

//gradient color
utility.colorLinearGradient = function (d, i, p, c, defs) {
  var id = 'lg_gradient_' + i;
  var grad = defs.select('#' + id);
  if ( grad.empty() )
  {
    if (p.position === 'middle')
    {
      utility.createLinearGradient( id, p, defs, [
        { 'offset': '0%',  'stop-color': d3.rgb(c).darker().toString(),  'stop-opacity': 1 },
        { 'offset': '20%', 'stop-color': d3.rgb(c).toString(), 'stop-opacity': 1 },
        { 'offset': '50%', 'stop-color': d3.rgb(c).brighter().toString(), 'stop-opacity': 1 },
        { 'offset': '80%', 'stop-color': d3.rgb(c).toString(), 'stop-opacity': 1 },
        { 'offset': '100%','stop-color': d3.rgb(c).darker().toString(),  'stop-opacity': 1 }
      ]);
    }
    else
    {
      utility.createLinearGradient( id, p, defs, [
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
utility.createLinearGradient = function (id, params, defs, stops) {
  var x2 = params.orientation === 'horizontal' ? '0%' : '100%';
  var y2 = params.orientation === 'horizontal' ? '100%' : '0%';
  var attrs, stop;
  var grad = defs.append('linearGradient')
        .attr('id', id)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', x2 )
        .attr('y2', y2 )
        //.attr('gradientUnits', 'userSpaceOnUse')objectBoundingBox
        .attr('spreadMethod', 'pad');
  for (var i=0; i<stops.length; i+=1)
  {
    attrs = stops[i];
    stop = grad.append('stop');
    for (var a in attrs)
    {
      if ( attrs.hasOwnProperty(a) ) {
        stop.attr(a, attrs[a]);
      }
    }
  }
};

utility.colorRadialGradient = function (d, i, p, c, defs) {
  var id = 'rg_gradient_' + i;
  var grad = defs.select('#' + id);
  if ( grad.empty() )
  {
    utility.createRadialGradient( id, p, defs, [
      { 'offset': p.s, 'stop-color': d3.rgb(c).brighter().toString(), 'stop-opacity': 1 },
      { 'offset': '100%','stop-color': d3.rgb(c).darker().toString(), 'stop-opacity': 1 }
    ]);
  }
  return 'url(#' + id + ')';
};

utility.createRadialGradient = function (id, params, defs, stops) {
  var attrs, stop;
  var grad = defs.append('radialGradient')
        .attr('id', id)
        .attr('r', params.r)
        .attr('cx', params.x)
        .attr('cy', params.y)
        .attr('gradientUnits', params.u)
        .attr('spreadMethod', 'pad');
  for (var i=0; i<stops.length; i+=1)
  {
    attrs = stops[i];
    stop = grad.append('stop');
    for (var a in attrs)
    {
      if ( attrs.hasOwnProperty(a) ) {
        stop.attr(a, attrs[a]);
      }
    }
  }
};

utility.getAbsoluteXY = function (element) {
  var viewportElement = document.documentElement;
  var box = element.getBoundingClientRect();
  var scrollLeft = viewportElement.scrollLeft + document.body.scrollLeft;
  var scrollTop = viewportElement.scrollTop + document.body.scrollTop;
  var x = box.left + scrollLeft;
  var y = box.top + scrollTop;

  return {'left': x, 'top': y};
};

// Creates a rectangle with rounded corners
utility.roundedRectangle = function (x, y, width, height, radius) {
  return "M" + x + "," + y +
       "h" + (width - radius * 2) +
       "a" + radius + "," + radius + " 0 0 1 " + radius + "," + radius +
       "v" + (height - 2 - radius * 2) +
       "a" + radius + "," + radius + " 0 0 1 " + -radius + "," + radius +
       "h" + (radius * 2 - width) +
       "a" + -radius + "," + radius + " 0 0 1 " + -radius + "," + -radius +
       "v" + ( -height + radius * 2 + 2 ) +
       "a" + radius + "," + radius + " 0 0 1 " + radius + "," + -radius +
       "z";
};

utility.dropShadow = function (id, defs, options) {
  var opt = options || {}
    , h = opt.height || '130%'
    , o = opt.offset || 2
    , b = opt.blur || 1;

  if (defs.select('#' + id).empty()) {
    var filter = defs.append('filter')
          .attr('id',id)
          .attr('height',h);
    var offset = filter.append('feOffset')
          .attr('in','SourceGraphic')
          .attr('result','offsetBlur')
          .attr('dx',o)
          .attr('dy',o); //how much to offset
    var color = filter.append('feColorMatrix')
          .attr('in','offsetBlur')
          .attr('result','matrixOut')
          .attr('type','matrix')
          .attr('values','1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0');
    var blur = filter.append('feGaussianBlur')
          .attr('in','matrixOut')
          .attr('result','blurOut')
          .attr('stdDeviation',b); //stdDeviation is how much to blur
    var merge = filter.append('feMerge');
        merge.append('feMergeNode'); //this contains the offset blurred image
        merge.append('feMergeNode')
          .attr('in','SourceGraphic'); //this contains the element that the filter is applied to
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

utility.stringSetLengths = function(_data, _container, _format, classes, styles) {
  var lengths = [],
      txt = _container.select('.tmp-text-strings').select('text');
  if (txt.empty()) {
    txt = _container.append('g').attr('class', 'tmp-text-strings').append('text');
  }
  txt.classed(classes, true);
  txt.style('display', 'inline');
  _data.forEach(function(d, i) {
      txt.text(_format(d, i));
      lengths.push(txt.node().getBoundingClientRect().width);
    });
  txt.text('').attr('class', 'tmp-text-strings').style('display', 'none');
  return lengths;
};

utility.stringSetThickness = function(_data, _container, _format, classes, styles) {
  var thicknesses = [],
      txt = _container.select('.tmp-text-strings').select('text');
  if (txt.empty()) {
    txt = _container.append('g').attr('class', 'tmp-text-strings').append('text');
  }
  txt.classed(classes, true);
  txt.style('display', 'inline');
  _data.forEach(function(d, i) {
      txt.text(_format(d, i));
      thicknesses.push(txt.node().getBoundingClientRect().height);
    });
  txt.text('').attr('class', 'tmp-text-strings').style('display', 'none');
  return thicknesses;
};

utility.maxStringSetLength = function(_data, _container, _format) {
  var lengths = utility.stringSetLengths(_data, _container, _format);
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
  var bbox = text.node().getBoundingClientRect(),
      size = {
        width: floats ? bbox.width : parseInt(bbox.width, 10),
        height: floats ? bbox.height : parseInt(bbox.height, 10)
      };
  return size;
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

utility.isRTLChar = function(c) {
  var rtlChars_ = '\u0591-\u07FF\uFB1D-\uFDFF\uFE70-\uFEFC',
      rtlCharReg_ = new RegExp('[' + rtlChars_ + ']');
  return rtlCharReg_.test(c);
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

utility.createTexture = function(defs, id, x, y) {
  var texture = '#sc-diagonalHatch-' + id,
      mask = '#sc-textureMask-' + id;

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

// utility.numberFormatSI = function(d, p, c, l) {
  //     var fmtr, spec, si;
  //     if (isNaN(d)) {
  //         return d;
  //     }
  //     p = typeof p === 'undefined' ? 2 : p;
  //     c = typeof c === 'undefined' ? false : !!c;
  //     fmtr = typeof l === 'undefined' ? d3.format : d3.formatLocale(l).format;
  //     d = Math.round(d * 10 * p) / 10 * p;
  //     spec = c ? '$,' : ',';
  //     if (c && d < 1000 && d !== parseInt(d, 10)) {
  //         spec += '.2f';
  //     }
  //     if (d < 1 && d > -1) {
  //         spec += '.2s';
  //     }
  //     return fmtr(spec)(d);
// };

utility.numberFormatSI = function(d, p, c, l) {
  var fmtr, spec;
  if (isNaN(d) || d === 0) {
      return d;
  }
  p = typeof p === 'undefined' ? 2 : p;
  c = typeof c === 'undefined' ? false : !!c;
  fmtr = typeof l === 'undefined' ? d3.format : d3.formatLocale(l).format;
  spec = c ? '$,' : ',';
  // spec += '.' + 2 + 'r';
  if (c && d < 1000 && d !== parseInt(d, 10)) {
    spec += '.2s';
  } else if (Math.abs(d) > 1 && Math.abs(d) <= 1000) {
    d = p === 0 ? Math.round(d) : Math.round(d * 10 * p) / (10 * p);
  } else {
    spec += '.' + p + 's';
  }
  if (d > -1 && d < 1) {
    return fmtr(spec)(d);
  }
  return fmtr(spec)(d);
};

utility.round = function(x, n) {
  // Sigh...
  var ten_n = Math.pow(10,n);
  return Math.round(x * ten_n) / ten_n;
};

utility.numberFormatRound = function(d, p, c, l) {
  var fmtr, spec;
  if (isNaN(d)) {
    return d;
  }
  c = typeof c === 'undefined' ? false : !!c;
  p = typeof p === 'undefined' ? c ? 2 : 0 : p;
  fmtr = typeof l === 'undefined' ? d3.format : d3.formatLocale(l).format;
  spec = c ? '$,.' + p + 'f' : ',';
  return fmtr(spec)(d);
};

utility.isValidDate = function(d) {
  var testDate;
  if (!d) {
    return false;
  }
  testDate = new Date(d);
  return testDate instanceof Date && !isNaN(testDate.valueOf());
};

utility.dateFormat = function(d, p, l) {
  var date, locale, spec, fmtr;
  date = new Date(d);
  if (!(date instanceof Date) || isNaN(date.valueOf())) {
    return d;
  }
  if (l && l.hasOwnProperty('timeFormat')) {
    // Use rebuilt locale
    spec = p.indexOf('%') !== -1 ? p : '%x';
    fmtr = l.timeFormat;
  } else {
    // Ensure locality object has all needed properties
    // TODO: this is expensive so consider removing
    locale = utility.buildLocality(l);
    fmtr = d3.timeFormatLocale(locale).format;
    spec = p.indexOf('%') !== -1 ? p : locale[p] || '%x';
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
        'dateTime': '%B %-d, %Y at %X %p GMT%Z', //%c
        'date': '%b %-d, %Y', //%x
        'time': '%-I:%M:%S', //%X
        'periods': ['AM', 'PM'],
        'days': ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        'shortDays': ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        'months': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        'shortMonths': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        // Custom patterns
        'full': '%A, %c',
        'long': '%c',
        'medium': '%x, %X %p',
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

  for (var key in locale) {
    var d;
    if (l.hasOwnProperty(key)) {
      d = locale[key];
      definition[key] = !deep || !Array.isArray(d) ? d : unfer(d);
    }
  }

  return definition;
};

utility.displayNoData = function (hasData, container, label, x, y) {
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

const tooltip = {};

tooltip.show = function(evt, content, gravity, dist, container, classes) {

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
  wrapper.className = 'tooltip xy-tooltip in';

  wrapper.appendChild(inner);
  wrapper.appendChild(arrow);
  container.appendChild(wrapper);

  tooltip.position(container, wrapper, evt, gravity, dist);
  wrapper.style.opacity = 1;

  return wrapper;
};

tooltip.cleanup = function() {
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
};

tooltip.position = function(container, wrapper, evt, gravity, dist) {
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
};

function stackearea() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 960,
      height = 500,
      getX = function(d) { return d.x; }, // accessor to get the x value from a data point
      getY = function(d) { return d.y; }, // accessor to get the y value from a data point
      id = Math.floor(Math.random() * 100000), //Create semi-unique ID incase user doesn't select one
      x = d3.scaleLinear(), //can be accessed via chart.xScale()
      y = d3.scaleLinear(), //can be accessed via chart.yScale()
      clipEdge = false, // if true, masks lines within x and y scale
      delay = 0, // transition
      duration = 300, // transition
      locality = utility.buildLocality(),
      style = 'stack',
      offset = 'zero',
      order = 'default',
      interpolate = 'linear',  // controls the line interpolation
      xDomain = null, // Override x domain (skips the calculation from data)
      yDomain = null, // Override y domain
      color = function(d, i) { return utility.defaultColor()(d, d.seriesIndex); },
      gradient = null,
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
  var x0 = x.copy();
  var y0 = y.copy();

  //============================================================

  function chart(selection) {
    selection.each(function(chartData) {

      var container = d3.select(this);

      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom;

      var curve =
            interpolate === 'linear' ? d3.curveLinear :
            interpolate === 'cardinal' ? d3.curveCardinal :
            interpolate === 'monotone' ? d3.curveMonotoneX :
            interpolate === 'basis' ? d3.curveBasis : d3.curveNatural;

      var stackOffset = [d3.stackOffsetNone, d3.stackOffsetWiggle, d3.stackOffsetExpand, d3.stackOffsetSilhouette]
                        [['zero', 'wiggle', 'expand', 'silhouette'].indexOf(offset)];

      var stackOrder = [d3.stackOrderNone, d3.stackOrderInsideOut]
                       [['default', 'inside-out'].indexOf(order)];

      // gradient constructor function
      gradient = function(d, i, p) {
        return utility.colorLinearGradient(d, chart.id() + '-' + i, p, color(d, i), wrap.select('defs'));
      };

      //------------------------------------------------------------
      // Process data

      var stack = d3.stack()
            .offset(stackOffset)
            .order(stackOrder)
            .value(function(d, k) { return d[k]; });

      var indexedData = {};
      chartData.forEach(function(s, i) {
        s.values.forEach(function(p, j) {
          var x = p[0];
          var y = p[1];
          if (!indexedData[x]) {
            indexedData[x] = [];
            indexedData[x].date = x;
          }
          indexedData[x].push(y);
        });
      });
      var keys = d3.keys(indexedData);
      var dates = keys.map(function(d) { return parseInt(d, 10); });
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

      var area = d3.area()
            .curve(curve)
            .x(function(d) { return x(d.data.date); })
            .y0(function(d) { return y(d[0]); })
            .y1(function(d) { return y(d[1]); });

      var areaEnter = d3.area()
            .curve(curve)
            .x(function(d) { return x(d.data.date); })
            .y0(function(d, i) {
              var d0 = data0 ? data0[d.si0] : null;
              return (d0 && d0[i]) ? y0(d0[i][1]) : y0(0);
            })
            .y1(function(d, i) {
              var d0 = data0 ? data0[d.si0] : null;
              return (d0 && d0[i]) ? y0(d0[i][1]) : y0(0);
            });

      var areaExit = d3.area()
            .curve(curve)
            .x(function(d) { return x(d.data.date); })
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

      x.domain(d3.extent(dates)).range([0, availableWidth]);
      y.domain([0, max - min]).range([availableHeight, 0]);

      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap_bind = container.selectAll('g.sc-wrap.sc-stackedarea').data([data]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-wrap sc-stackedarea');
      var wrap = container.select('.sc-wrap.sc-stackedarea').merge(wrap_entr);

      var defs_entr = wrap_entr.append('defs');

      wrap_entr.append('g').attr('class', 'sc-group');
      var group_wrap = wrap.select('.sc-group');

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      //------------------------------------------------------------

      defs_entr.append('clipPath').attr('id', 'sc-edge-clip-' + id)
        .append('rect');

      wrap.select('#sc-edge-clip-' + id + ' rect')
        .attr('width', availableWidth)
        .attr('height', availableHeight);

      wrap.attr('clip-path', clipEdge ? 'url(#sc-edge-clip-' + id + ')' : '');

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
            points: d,
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
          var index = Math.round((xpos * dates.length) / availableWidth) - 1;
          eo.data = data.map(function(d,i) {
            var point = [d[index].data.date, d[index][1]];
            point.seriesKey = d.key;
            point.seriesIndex = d.seriesIndex;
            return point;
          });
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

    });

    return chart;
  }

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;

  chart.id = function(_) {
    if (!arguments.length) { return id; }
    id = _;
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
  chart.classes = function(_) {
    if (!arguments.length) { return classes; }
    classes = _;
    return chart;
  };
  chart.gradient = function(_) {
    if (!arguments.length) { return gradient; }
    gradient = _;
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

  chart.x = function(_) {
    if (!arguments.length) { return getX; }
    getX = _;
    return chart;
  };
  chart.y = function(_) {
    if (!arguments.length) { return getY; }
    getY = _;
    return chart;
  };
  chart.xScale = function(_) {
    if (!arguments.length) { return x; }
    x = _;
    return chart;
  };
  chart.yScale = function(_) {
    if (!arguments.length) { return y; }
    y = _;
    return chart;
  };
  chart.xDomain = function(_) {
    if (!arguments.length) { return xDomain; }
    xDomain = _;
    return chart;
  };
  chart.yDomain = function(_) {
    if (!arguments.length) { return yDomain; }
    yDomain = _;
    return chart;
  };
  chart.forceX = function(_) {
    if (!arguments.length) { return forceX; }
    forceX = _;
    return chart;
  };
  chart.forceY = function(_) {
    if (!arguments.length) { return forceY; }
    forceY = _;
    return chart;
  };

  chart.delay = function(_) {
    if (!arguments.length) { return delay; }
    delay = _;
    return chart;
  };
  chart.duration = function(_) {
    if (!arguments.length) { return duration; }
    duration = _;
    return chart;
  };

  chart.locality = function(_) {
    if (!arguments.length) { return locality; }
    locality = utility.buildLocality(_);
    return chart;
  };
  chart.clipEdge = function(_) {
    if (!arguments.length) { return clipEdge; }
    clipEdge = _;
    return chart;
  };

  chart.interpolate = function(_) {
    if (!arguments.length) { return interpolate; }
    interpolate = _;
    return chart;
  };
  chart.offset = function(_) {
    if (!arguments.length) { return offset; }
    offset = _;
    return chart;
  };
  chart.order = function(_) {
    if (!arguments.length) { return order; }
    order = _;
    return chart;
  };
  //shortcut for offset + order
  chart.style = function(_) {
    if (!arguments.length) { return style; }
    style = _;

    switch (style) {
      case 'stack':
        chart.offset('zero');
        chart.order('default');
        break;
      case 'stream':
        chart.offset('wiggle');
        chart.order('inside-out');
        break;
      case 'stream-center':
          chart.offset('silhouette');
          chart.order('inside-out');
          break;
      case 'expand':
        chart.offset('expand');
        chart.order('default');
        break;
    }

    return chart;
  };

  //============================================================

  return chart;
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

  var tickValues, tickSubdivide, tickSize, tickPadding, tickFormat, tickSizeInner, tickSizeOuter;

  // Public Read-only Variables
  //------------------------------------------------------------
  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      thickness = 0;

  var axis = d3.axisBottom();

  // Private Variables
  //------------------------------------------------------------
  var scale0;

  //============================================================

  function chart(selection) {
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
          tickSpacing = 0,
          labelThickness = 0;

      var tickDimensions = [],
          tickDimensionsHash = {},
          tickValueArray = [],
          minTickDimensions = {},
          maxTickDimensions = {};

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

      // test to see if rotateTicks was passed as a boolean
      if (rotateTicks && !isFinite(String(rotateTicks))) {
        rotateTicks = 30;
      }

      // ordinal scales do not have max-min values
      if (hasRangeBand) {
        showMaxMin = false;
      }

      //------------------------------------------------------------
      // Setup containers and skeleton of chart

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

      axisMaxMin_entr.append('text').style('opacity', 0);
      axisMaxMin_entr.append('line').style('opacity', 0);

      if (showMaxMin) {
        axisMaxMin.select('text')
          .text(function(d, i, selection) {
            return axis.tickFormat()(d, i, selection, false);
          });
      }

      // Get all axes and maxmin tick text for text handling functions
      var tickText = wrap.selectAll('g.tick, g.sc-axisMaxMin').select('text')
            .filter(function(d) {
              return this.getBoundingClientRect().width;
            })
            .each(function(d, i) {
              tickValueArray.push(d3.select(this).text());
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
        resetTicks();

        tickText
          .style('text-anchor', rtlTextAnchor(textAnchor || (isMirrored() ? 'start' : 'end')));
      } else {
        //Not needed but keep for now
        // if (reduceXTicks) {
        //   axisTicks.each(function(d, i) {
        //       d3.select(this).selectAll('text,line')
        //         .style('opacity', i % Math.ceil(data[0].values.length / (scaleWidth / 100)) !== 0 ? 0 : 1);
        //     });
        // }
        resetTicks();
        recalcMargin();

        if (labelCollision(1)) {

          // if wrap is enabled, try it first (for ordinal scales only)
          if (wrapTicks) {
            resetTicks();
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
            resetTicks();
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
            resetTicks();
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

        // only show max line
        axisMaxMin.select('line')
          .attr('x1', 0)
          .attr('y1', 0)
          .attr('y2', vertical ? 0 : (axis.tickSize() - marginCalc.bottom) * reflect)
          .attr('x2', vertical ? axis.tickSize() * reflect : 0)
          .style('opacity', function(d, i) {
            return isMirrored() ? (i ? 0 : 1) : (i ? 1 : 0);
          });

        //check if max and min overlap other values, if so, hide the values that overlap
        axisTicks.each(function(d, i) {
            var tick = d3.select(this),
                dim = tickDimensionsHash['key-' + d.toString()],
                collision = false;

            if (vertical) {
              collision = dim.bottom > minTickDimensions.top || dim.top < maxTickDimensions.bottom;
              tick.select('line')
                .style('opacity', 1 - collision);
            } else if (rotateSucceeded) {
              collision = false;
            } else if (staggerSucceeded) {
              collision = (dim.left < minTickDimensions.right + tickGap || dim.right > maxTickDimensions.left + tickGap) &&
                          (dim.bottom < minTickDimensions.top || dim.top > maxTickDimensions.bottom);
            } else {
              collision = dim.left < minTickDimensions.right + tickGap || dim.right > maxTickDimensions.left + tickGap;
            }

            tick.select('text')
              .style('opacity', 1 - collision);
            // accounts for minor floating point errors... though could be problematic if the scale is EXTREMELY SMALL
            // if (d < 1e-10 && d > -1e-10) { // Don't remove the ZERO line!!
            //   tick.select('line')
            //     .style('opacity', 0);
            // }
          });

      } else {

        //highlight zero line ... Maybe should not be an option and should just be in CSS?
        axisTicks
          .filter(function(d) {
            // this is because sometimes the 0 tick is a very small fraction, TODO: think of cleaner technique
            // return !parseFloat(Math.round(d * 100000) / 1000000);
            return scaleCalc(d) === extent[0 + isMirrored()];
          })
          .classed('zero', highlightZero);

        // hide zero line if same as domain line
        axisTicks.select('line')
          .style('opacity', function(d, i) {
            return scaleCalc(d) === extent[0 + isMirrored()] ? 0 : 1;
          });

      }

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

      function getRangeExtent() {
        return typeof scaleCalc.rangeExtent === 'function' ? scaleCalc.rangeExtent() : scaleCalc.range();
      }

      function getBarWidth() {
        return hasRangeBand ? scaleCalc.bandwidth() : 0;
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
        tickDimensionsHash = {};

        // reposition max/min ticks before calculating bbox
        if (showMaxMin) {
          axisMaxMin
            .style('opacity', 1)
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
                height: parseInt(bbox.height / 1.2, 10),
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
            tickDimensionsHash['key-' + d.key.toString()] = d;
          });
        minTickDimensions = tickDimensions[0];
        maxTickDimensions = tickDimensions[tickDimensions.length - 1];
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

          axis
            .scale(scaleCalc);
          wrap.call(axis);
        }
      }

      function resetTicks() {
        marginCalc = {top: 0, right: 0, bottom: 0, left: 0};

        scaleCalc = scale.copy();
        extent = getRangeExtent();
        scaleWidth = Math.abs(extent[1] - extent[0]);

        axis
          .scale(scale);

        wrap.call(axis);

        tickText.selectAll('tspan').remove();
        tickText
          .attr('dy', vertical ? '.32em' : 0.355 + 0.355 * reflect + 'em')
          .attr('x', vertical ? axis.tickPadding() * reflect : 0)
          .attr('y', vertical ? 0 : axis.tickPadding() * reflect)
          .attr('transform', 'translate(0,0)')
          .text(function(d, i) { return tickValueArray[i]; })
          .style('text-anchor', 'middle')
          .style('opacity', 1);

        calcMaxLabelSizes();
        setThickness();
      }

      function handleWrap() {
        var tickSpacing = getTickSpacing();

        tickText.each(function(d, i) {
          var textContent = axis.tickFormat()(d, i, selection, true),
              textNode = d3.select(this),
              isDate = utility.isValidDate(textContent),
              textArray = (textContent && textContent !== '' ? isDate ? textContent : textContent.replace('/', '/ ') : []).split(' '),
              i = 0,
              l = textArray.length,
              dy = reflect === 1 ? 0.71 : -1; // TODO: wrong. fails on reflect with 3 lines of wrap

          // reset the tick text conent
          this.textContent = '';

          var textString,
              textSpan = textNode.append('tspan')
                .text(textArray[i] + ' ')
                .attr('dy', dy + 'em')
                .attr('x', 0);

          // reset vars
          i += 1;
          dy = 1; // TODO: wrong. fails on reflect with 3 lines of wrap

          while (i < l) {
            textSpan = textNode.append('tspan')
              .text(textArray[i] + ' ')
              .attr('dy', dy + 'em')
              .attr('x', 0);

            i += 1;

            while (i < l) {
              textString = textSpan.text();
              textSpan.text(textString + ' ' + textArray[i]);
              //TODO: this is different than collision test
              if (this.getBoundingClientRect().width <= tickSpacing) {
                i += 1;
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
            var yOffset = tickDimensionsHash['key-' + d.toString()].index % 2 * (maxLabelHeight + 2);
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
            //Convert to radians before calculating sin.
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
        thickness += cos * 11;
      }

      //------------------------------------------------------------
      // Public functions

      chart.resizeTickLines = function(dim) {
        wrap.selectAll('g.tick, g.sc-axisMaxMin').select('line')
          .attr(vertical ? 'x2' : 'y2', dim * reflect);
      };

      chart.labelThickness = function() {
        return labelThickness;
      };

    });

    return chart;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.axis = axis;

  // fc.rebind(chart, axis, 'tickValues', 'tickSubdivide', 'tickSize', 'tickPadding', 'tickFormat');
  fc.rebind(chart, scale, 'domain', 'range'); //these are also accessible by chart.scale(), but added common ones directly for ease of use

  // read only
  chart.width = function(_) {
    if (!arguments.length) {
      return thickness;
    }
    return chart;
  };

  // read only
  chart.height = function(_) {
    if (!arguments.length) {
      return thickness;
    }
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) {
      return margin;
    }
    margin = _;
    return chart;
  };

  chart.ticks = function(_) {
    if (!arguments.length) {
      return ticks;
    }
    ticks = _;
    return chart;
  };

  chart.axisLabel = function(_) {
    if (!arguments.length) {
      return axisLabelText;
    }
    axisLabelText = _;
    return chart;
  };

  chart.showMaxMin = function(_) {
    if (!arguments.length) {
      return showMaxMin;
    }
    showMaxMin = _;
    return chart;
  };

  chart.highlightZero = function(_) {
    if (!arguments.length) {
      return highlightZero;
    }
    highlightZero = _;
    return chart;
  };

  chart.wrapTicks = function(_) {
    if (!arguments.length) {
      return wrapTicks;
    }
    wrapTicks = _;
    return chart;
  };

  chart.rotateTicks = function(_) {
    if (!arguments.length) {
      return rotateTicks;
    }
    rotateTicks = _;
    return chart;
  };

  chart.staggerTicks = function(_) {
    if (!arguments.length) {
      return staggerTicks;
    }
    staggerTicks = _;
    return chart;
  };

  chart.reduceXTicks = function(_) {
    if (!arguments.length) {
      return reduceXTicks;
    }
    reduceXTicks = _;
    return chart;
  };

  chart.rotateYLabel = function(_) {
    if (!arguments.length) {
      return rotateYLabel;
    }
    rotateYLabel = _;
    return chart;
  };

  chart.axisLabelDistance = function(_) {
    if (!arguments.length) {
      return axisLabelDistance;
    }
    axisLabelDistance = _;
    return chart;
  };

  chart.maxLabelWidth = function(_) {
    if (!arguments.length) {
      return maxLabelWidth;
    }
    maxLabelWidth = _;
    return chart;
  };

  chart.textAnchor = function(_) {
    if (!arguments.length) {
      return textAnchor;
    }
    textAnchor = _;
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) {
      return direction;
    }
    direction = _;
    return chart;
  };

  chart.orient = function(_) {
    if (!arguments.length) {
      return orient;
    }
    orient = _;
    axis = orient === 'bottom' ? d3.axisBottom() :
           orient === 'right' ? d3.axisRight() :
           orient === 'left' ? d3.axisLeft() :
           orient === 'top' ? d3.axisTop() : d3.axisBottom();
    return chart;
  };

  // d3 properties extended
  chart.scale = function(_) {
    if (!arguments.length) {
      return scale;
    }
    scale = _;
    axis.scale(scale);
    hasRangeBand = typeof scale.padding === 'function';
    fc.rebind(chart, scale, 'domain', 'range');
    return chart;
  };
  chart.tickValues = function(_) {
    if (!arguments.length) {
      return tickValues;
    }
    tickValues = _;
    axis.tickValues(_);
    return chart;
  };
  chart.tickSize = function(_) {
    if (!arguments.length) {
      return tickSize;
    }
    tickSize = _;
    axis.tickSize(_);
    return chart;
  };
  chart.tickPadding = function(_) {
    if (!arguments.length) {
      return tickPadding;
    }
    tickPadding = _;
    axis.tickPadding(_);
    return chart;
  };
  chart.tickFormat = function(_) {
    if (!arguments.length) {
      return tickFormat || axis.tickFormat();
    }
    tickFormat = _;
    axis.tickFormat(_);
    return chart;
  };
  chart.valueFormat = function(_) {
    if (!arguments.length) {
      return valueFormat || axis.tickFormat();
    }
    valueFormat = _;
    axis.tickFormat(_);
    return chart;
  };
  chart.tickSizeInner = function(_) {
    if (!arguments.length) {
      return tickSizeInner;
    }
    tickSizeInner = _;
    axis.tickSizeInner(_);
    return chart;
  };
  chart.tickSizeOuter = function(_) {
    if (!arguments.length) {
      return tickSizeOuter;
    }
    tickSizeOuter = _;
    axis.tickSizeOuter(_);
    return chart;
  };

  //============================================================

  return chart;
}

function funnel() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 960,
      height = 500,
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID in case user doesn't select one
      getX = function(d) { return d.x; },
      getY = function(d) { return d.y; },
      getH = function(d) { return d.height; },
      getKey = function(d) { return d.key; },
      getValue = function(d, i) { return d.value; },
      fmtKey = function(d) { return getKey(d.series || d); },
      fmtValue = function(d) { return getValue(d.series || d); },
      fmtCount = function(d) { return (' (' + (d.series.count || d.count) + ')').replace(' ()', ''); },
      locality = utility.buildLocality(),
      direction = 'ltr',
      delay = 0,
      duration = 0,
      color = function(d, i) { return utility.defaultColor()(d.series, d.seriesIndex); },
      gradient = null,
      fill = color,
      textureFill = false,
      classes = function(d, i) { return 'sc-series sc-series-' + d.seriesIndex; };

  var r = 0.3, // ratio of width to height (or slope)
      y = d3.scaleLinear(),
      yDomain,
      forceY = [0], // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do chart.forceY([]) to remove
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
  // Update chart

  function chart(selection) {
    selection.each(function(data) {

      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          container = d3.select(this);

      var labelGap = 5,
          labelSpace = 5,
          labelOffset = 0,
          funnelTotal = 0,
          funnelOffset = 0;

      //sum the values for each data element
      funnelTotal = d3.sum(data, function(d) { return d.value; });

      //set up the gradient constructor function
      gradient = function(d, i, p) {
        return utility.colorLinearGradient(d, id + '-' + i, p, color(d, i), wrap.select('defs'));
      };

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
      // Setup containers and skeleton of chart
      var wrap_bind = container.selectAll('g.sc-wrap').data([data]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-wrap sc-funnel');
      var wrap = container.select('.sc-wrap.sc-funnel').merge(wrap_entr);

      var defs_entr = wrap_entr.append('defs');

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      //------------------------------------------------------------
      // Definitions

      if (textureFill) {
        var mask = utility.createTexture(defs_entr, id);
      }

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
        // For on click active bars
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
        var d0 = 0;

        // Top to bottom
        for (var groups = sideLabels.nodes(), j = groups.length - 1; j >= 0; --j) {
          var d = d3.select(groups[j]).data()[0];
          if (d) {
            if (!d0) {
              d.labelBottom = d.labelTop + d.labelHeight + labelSpace;
              d0 = d.labelBottom;
              continue;
            }

            d.labelTop = Math.max(d0, d.labelTop);
            d.labelBottom = d.labelTop + d.labelHeight + labelSpace;
            d0 = d.labelBottom;
          }
        }

        // And then...
        if (d0 && d0 - labelSpace > d3.max(y.range())) {

          d0 = 0;

          // Bottom to top
          for (var groups = sideLabels.nodes(), j = 0, m = groups.length; j < m; ++j) {
            var d = d3.select(groups[j]).data()[0];
            if (d) {
              if (!d0) {
                d.labelBottom = calculatedHeight - 1;
                d.labelTop = d.labelBottom - d.labelHeight;
                d0 = d.labelTop;
                continue;
              }

              d.labelBottom = Math.min(d0, d.labelBottom);
              d.labelTop = d.labelBottom - d.labelHeight - labelSpace;
              d0 = d.labelTop;
            }
          }

          // ok, FINALLY, so if we are above the top of the funnel,
          // we need to lower them all back down
          if (d0 < 0) {
            sideLabels.each(function(d, i) {
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
          value: fmtValue(d),
          count: fmtCount(d),
          data: d,
          series: d.series,
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

        while (word = words.pop()) {
          line.push(word);
          lbl.text(line.join(' '));

          if (lbl.node().getComputedTextLength() > maxWidth && line.length > 1) {
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
              scalar = d.labelBottom >= sliceBottom ? 1 : 0,
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
        var backColor = d3.select(this.parentNode).style('fill');
        return utility.getTextContrast(backColor, i);
      }

      function fmtDirection(d) {
        var m = utility.isRTLChar(d.slice(-1)),
            dir = m ? 'rtl' : 'ltr';
        return 'ltr';
      }

      function fmtLabel(txt, classes, dy, anchor, fill) {
        txt
          .attr('x', 0)
          .attr('y', 0)
          .attr('dy', dy + 'em')
          .attr('class', classes)
          .attr('direction', function() {
            return fmtDirection(txt.text());
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
            .style('fill-opacity', 1);
        });
      }

    });

    return chart;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;

  chart.id = function(_) {
    if (!arguments.length) { return id; }
    id = _;
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
  chart.classes = function(_) {
    if (!arguments.length) { return classes; }
    classes = _;
    return chart;
  };
  chart.gradient = function(_) {
    if (!arguments.length) { return gradient; }
    gradient = _;
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) { return margin; }
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
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

  chart.getKey = function(_) {
    if (!arguments.length) { return getKey; }
    getKey = _;
    return chart;
  };

  chart.getValue = function(_) {
    if (!arguments.length) { return getValue; }
    getValue = _;
    return chart;
  };

  chart.fmtKey = function(_) {
    if (!arguments.length) { return fmtKey; }
    fmtKey = _;
    return chart;
  };

  chart.fmtValue = function(_) {
    if (!arguments.length) { return fmtValue; }
    fmtValue = _;
    return chart;
  };

  chart.fmtCount = function(_) {
    if (!arguments.length) { return fmtCount; }
    fmtCount = _;
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    return chart;
  };

  chart.delay = function(_) {
    if (!arguments.length) { return delay; }
    delay = _;
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) { return duration; }
    duration = _;
    return chart;
  };

  chart.textureFill = function(_) {
    if (!arguments.length) { return textureFill; }
    textureFill = _;
    return chart;
  };

  chart.locality = function(_) {
    if (!arguments.length) { return locality; }
    locality = utility.buildLocality(_);
    return chart;
  };

  chart.xScale = function(_) {
    if (!arguments.length) { return x; }
    x = _;
    return chart;
  };

  chart.yScale = function(_) {
    if (!arguments.length) { return y; }
    y = _;
    return chart;
  };

  chart.yDomain = function(_) {
    if (!arguments.length) { return yDomain; }
    yDomain = _;
    return chart;
  };

  chart.forceY = function(_) {
    if (!arguments.length) { return forceY; }
    forceY = _;
    return chart;
  };

  chart.wrapLabels = function(_) {
    if (!arguments.length) { return wrapLabels; }
    wrapLabels = _;
    return chart;
  };

  chart.minLabelWidth = function(_) {
    if (!arguments.length) { return minLabelWidth; }
    minLabelWidth = _;
    return chart;
  };

  //============================================================

  return chart;
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
      getY = function(d) { return d.y; },
      getKey = function(d) { return typeof d.key === 'undefined' ? d : d.key; },
      getValue = function(d, i) { return isNaN(d.value) ? d : d.value; },
      getCount = function(d, i) { return isNaN(d.count) ? d : d.count; },
      getValues = function(d) { return d.values; },
      fmtKey = function(d) { return getKey(d); },
      fmtValue = function(d) { return getValue(d); },
      fmtCount = function(d) { return (' (' + getCount(d) + ')').replace(' ()', ''); },
      locality = utility.buildLocality(),
      direction = 'ltr',
      clipEdge = true,
      delay = 0,
      duration = 720,
      color = function (d, i) { return utility.defaultColor()(d, d.seriesIndex); },
      gradient = null,
      fill = color,
      classes = function (d, i) { return 'sc-slice sc-series-' + d.seriesIndex; },
      dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout', 'elementMousemove');

  var ringWidth = 50,
      showLabels = true,
      showPointer = true,
      pointerWidth = 5,
      pointerTailLength = 5,
      pointerHeadLength = 90,
      pointerValue = 0,
      minValue = 0,
      maxValue = 10,
      minAngle = -90,
      maxAngle = 90,
      labelInset = 10;

  //colorScale = d3.scaleLinear().domain([0, .5, 1].map(d3.interpolate(min, max))).range(["green", "yellow", "red"]);

  //============================================================
  // Update chart

  function chart(selection) {

    selection.each(function(data) {

      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          container = d3.select(this);

      //set up the gradient constructor function
      gradient = function(d, i) {
        var params = {x: 0, y: 0, r: radius, s: ringWidth / 100, u: 'userSpaceOnUse'};
        return utility.colorRadialGradient( d, id + '-' + i, params, color(d, i), wrap.select('defs') );
      };

      var radius = Math.min((availableWidth / 2), availableHeight) / ((100 + labelInset) / 100),
          range = maxAngle - minAngle,
          scale = d3.scaleLinear().range([0, 1]).domain([minValue, maxValue]),
          previousTick = 0,
          arcData = data.map( function(d, i){
            var rtn = {
                  key: d.key,
                  seriesIndex: d.seriesIndex,
                  y0: previousTick,
                  y1: d.y,
                  color: d.color,
                  classes: d.classes,
                  values: d.values
                };
            previousTick = d.y;
            return rtn;
          }),
          prop = function(d) { return d * radius / 100; };

      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap_bind = container.selectAll('g.sc-wrap').data([data]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class','sc-wrap sc-gauge');
      var wrap = container.select('.sc-wrap.sc-gauge').merge(wrap_entr);

      var defs_entr = wrap_entr.append('defs');

      wrap_entr.append('g').attr('class', 'sc-group');
      var gauge_wrap = wrap.select('.sc-group');

      wrap_entr.append('g').attr('class', 'sc-labels');
      var labels_wrap = wrap.select('.sc-labels');

      wrap_entr.append('g').attr('class', 'sc-pointer');
      var pointer_wrap = wrap.select('.sc-pointer');

      var odometer_entr = wrap_entr.append('g').attr('class', 'sc-odometer');
      var odometer_wrap = wrap.select('.sc-odometer');

      wrap.attr('transform', 'translate('+ (margin.left/2 + margin.right/2 + prop(labelInset)) +','+ (margin.top + prop(labelInset)) +')');

      //------------------------------------------------------------
      // Append major data series grouping containers

      gauge_wrap.attr('transform', centerTx);

      var series_bind = gauge_wrap.selectAll('.sc-series').data(arcData);
      var series_entr = series_bind.enter().append('g').attr('class', 'sc-series');
      series_bind.exit().remove();
      var series = gauge_wrap.selectAll('.sc-series').merge(series_entr);

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
            .startAngle(function(d, i) {
              return deg2rad(newAngle(d.y0));
            })
            .endAngle(function(d, i) {
              return deg2rad(newAngle(d.y1));
            });

      var slice_bind = series.selectAll('g.sc-slice').data(
            function(s, i) {
              return s.values.map(function(v, j) {
                v.y0 = s.y0;
                v.y1 = s.y1;
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

      var labelData = [0].concat(data.map(getY));

      labels_wrap.attr('transform', centerTx);

      var labels_bind = labels_wrap.selectAll('text').data(labelData);
      var labels_entr = labels_bind.enter().append('text');
      labels_bind.exit().remove();
      var labels = labels_wrap.selectAll('text').merge(labels_entr);

      labels
        .attr('transform', function(d) {
          return 'rotate(' + newAngle(d) + ') translate(0,' + (prop(-1.5) - radius) + ')';
        })
        .text(utility.identity)
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

      function deg2rad(deg) {
        return deg * Math.PI / 180;
      }

      function newAngle(d) {
        return minAngle + (scale(d) * range);
      }

      // Center translation
      function centerTx() {
        return 'translate(' + radius + ',' + radius + ')';
      }

      chart.setGaugePointer = setGaugePointer;

    });

    return chart;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;

  chart.id = function(_) {
    if (!arguments.length) { return id; }
    id = _;
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
  chart.classes = function(_) {
    if (!arguments.length) { return classes; }
    classes = _;
    return chart;
  };
  chart.gradient = function(_) {
    if (!arguments.length) { return gradient; }
    gradient = _;
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) { return margin; }
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
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

  chart.getKey = function(_) {
    if (!arguments.length) { return getKey; }
    getKey = _;
    return chart;
  };

  chart.getValue = function(_) {
    if (!arguments.length) { return getValue; }
    getValue = _;
    return chart;
  };

  chart.getCount = function(_) {
    if (!arguments.length) { return getCount; }
    getCount = _;
    return chart;
  };

  chart.fmtKey = function(_) {
    if (!arguments.length) { return fmtKey; }
    fmtKey = _;
    return chart;
  };

  chart.fmtValue = function(_) {
    if (!arguments.length) { return fmtValue; }
    fmtValue = _;
    return chart;
  };

  chart.fmtCount = function(_) {
    if (!arguments.length) { return fmtCount; }
    fmtCount = _;
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    return chart;
  };

  chart.delay = function(_) {
    if (!arguments.length) { return delay; }
    delay = _;
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) { return duration; }
    duration = _;
    return chart;
  };

  chart.locality = function(_) {
    if (!arguments.length) { return locality; }
    locality = utility.buildLocality(_);
    return chart;
  };

  chart.values = function(_) {
    if (!arguments.length) { return getValues; }
    getValues = _;
    return chart;
  };

  // GAUGE

  chart.showLabels = function(_) {
    if (!arguments.length) { return showLabels; }
    showLabels = _;
    return chart;
  };

  chart.labelThreshold = function(_) {
    if (!arguments.length) { return labelThreshold; }
    labelThreshold = _;
    return chart;
  };

  chart.ringWidth = function(_) {
    if (!arguments.length) { return ringWidth; }
    ringWidth = _;
    return chart;
  };
  chart.pointerWidth = function(_) {
    if (!arguments.length) { return pointerWidth; }
    pointerWidth = _;
    return chart;
  };
  chart.pointerTailLength = function(_) {
    if (!arguments.length) { return pointerTailLength; }
    pointerTailLength = _;
    return chart;
  };
  chart.pointerHeadLength = function(_) {
    if (!arguments.length) { return pointerHeadLength; }
    pointerHeadLength = _;
    return chart;
  };
  chart.setPointer = function(_) {
    if (!arguments.length) { return chart.setGaugePointer; }
    chart.setGaugePointer(_);
    return chart;
  };
  chart.showPointer = function(_) {
    if (!arguments.length) { return showPointer; }
    showPointer = _;
    return chart;
  };
  chart.minValue = function(_) {
    if (!arguments.length) { return minValue; }
    minValue = _;
    return chart;
  };
  chart.maxValue = function(_) {
    if (!arguments.length) { return maxValue; }
    maxValue = _;
    return chart;
  };
  chart.minAngle = function(_) {
    if (!arguments.length) { return minAngle; }
    minAngle = _;
    return chart;
  };
  chart.maxAngle = function(_) {
    if (!arguments.length) { return maxAngle; }
    maxAngle = _;
    return chart;
  };
  chart.labelInset = function(_) {
    if (!arguments.length) { return labelInset; }
    labelInset = _;
    return chart;
  };
  chart.isRendered = function(_) {
    return (svg !== undefined);
  };

  //============================================================

  return chart;
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
      strings = {
        close: 'Hide legend',
        type: 'Show legend',
        noLabel: 'undefined'
      },
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID in case user doesn't select one
      getKey = function(d) {
        return d.key.length > 0 || (!isNaN(parseFloat(d.key)) && isFinite(d.key)) ? d.key : legend.strings().noLabel;
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
      overflowHandler = function(d) { return; };

  //============================================================

  function legend(selection) {

    selection.each(function(data) {

      var container = d3.select(this),
          containerWidth = width,
          containerHeight = height,
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
      data.filter(function(d) { return !d.hasOwnProperty('seriesIndex'); }).map(function(d, i) {
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
      var backFilter = utility.dropShadow('legend_back_' + id, defs, {blur: 2});

      wrap_entr.append('text').attr('class', 'sc-menu-link');
      var link = wrap.select('.sc-menu-link');

      var mask_entr = wrap_entr.append('g').attr('class', 'sc-menu-mask');
      var mask = wrap.select('.sc-menu-mask');

      mask_entr.append('g').attr('class', 'sc-group');
      var g = wrap.select('.sc-group');

      var series_bind = g.selectAll('.sc-series').data(utility.identity, function(d) { return d.seriesIndex; });
      series_bind.exit().remove();
      var series_entr = series_bind.enter().append('g').attr('class', 'sc-series')
            .on('mouseover', function(d, i) {
              dispatch.call('legendMouseover', this, d);
            })
            .on('mouseout', function(d, i) {
              dispatch.call('legendMouseout', this, d);
            })
            .on('click', function(d, i) {
              d3.event.preventDefault();
              d3.event.stopPropagation();
              dispatch.call('legendClick', this, d);
            });
      var series = g.selectAll('.sc-series').merge(series_entr);

      series
          .attr('class', classes)
          .attr('fill', color)
          .attr('stroke', color);
      series_entr
        .append('rect')
          .attr('x', (diameter + textGap) / -2)
          .attr('y', (diameter + lineSpacing) / -2)
          .attr('width', diameter + textGap)
          .attr('height', diameter + lineSpacing)
          .style('fill', '#FFE')
          .style('stroke-width', 0)
          .style('opacity', 0.1);

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

      var texts_entr = series_entr.append('text')
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
        .on('click', function(d, i) {
          d3.event.stopPropagation();
        });

      link
        .text(legendOpen === 1 ? legend.strings().close : legend.strings().open)
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

        texts.each(function(d, i) {
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
            maxRowWidth = 0,
            minRowWidth = 0,
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
            .attr('transform', function(d, i) {
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

          series.select('rect')
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
            .attr('transform', function(d) {
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
          dropdownHeight = Math.min(containerHeight - legend.height(), legendHeight);

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
            .attr('transform', function(d, i) {
              var xpos = align === 'left' ? 0.5 : 0.5 + legend.width(),
                  ypos = margin.top + radius;
              return 'translate(' + xpos + ',' + ypos + ')';
            })
            .style('opacity', 1);

          mask
            .attr('clip-path', 'url(#sc-edge-clip-' + id + ')')
            .attr('transform', function(d, i) {
              var xpos = menuMargin.left + radius,
                  ypos = legend.height() + menuMargin.top + radius;
              return 'translate(' + xpos + ',' + ypos + ')';
            });

          g
            .style('opacity', legendOpen)
            .style('display', legendOpen ? 'inline' : 'none')
            .attr('transform', function(d, i) {
              var xpos = rtl ? d3.max(keyWidths) + radius : 0;
              return 'translate(' + xpos + ',0)';
            });

          series
            .attr('transform', function(d, i) {
              var ypos = i * (diameter + spacing);
              return 'translate(0,' + ypos + ')';
            });

          series.select('rect')
            .attr('x', function(d) {
              var w = (diameter + gutter) / 2 * sign(rtl);
              w -= rtl ? keyWidth(d.seriesIndex) : 0;
              return w;
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
            .attr('transform', function(d) {
              var xpos = (radius + textGap) * sign(!rtl);
              return 'translate(' + xpos + ',0)';
            });

        }

        //------------------------------------------------------------
        // Enable scrolling
        if (scrollEnabled) {
          var diff = dropdownHeight - legendHeight;

          var assignScrollEvents = function(enable) {
            if (enable) {

              var zoom = d3.zoom()
                    .on('zoom', panLegend);
              var drag = d3.drag()
                    .subject(utility.identity)
                    .on('drag', panLegend);

              back.call(zoom);
              g.call(zoom);

              back.call(drag);
              g.call(drag);

            } else {

              back
                  .on("mousedown.zoom", null)
                  .on("mousewheel.zoom", null)
                  .on("mousemove.zoom", null)
                  .on("DOMMouseScroll.zoom", null)
                  .on("dblclick.zoom", null)
                  .on("touchstart.zoom", null)
                  .on("touchmove.zoom", null)
                  .on("touchend.zoom", null)
                  .on("wheel.zoom", null);
              g
                  .on("mousedown.zoom", null)
                  .on("mousewheel.zoom", null)
                  .on("mousemove.zoom", null)
                  .on("DOMMouseScroll.zoom", null)
                  .on("dblclick.zoom", null)
                  .on("touchstart.zoom", null)
                  .on("touchmove.zoom", null)
                  .on("touchend.zoom", null)
                  .on("wheel.zoom", null);

              back
                  .on("mousedown.drag", null)
                  .on("mousewheel.drag", null)
                  .on("mousemove.drag", null)
                  .on("DOMMouseScroll.drag", null)
                  .on("dblclick.drag", null)
                  .on("touchstart.drag", null)
                  .on("touchmove.drag", null)
                  .on("touchend.drag", null)
                  .on("wheel.drag", null);
              g
                  .on("mousedown.drag", null)
                  .on("mousewheel.drag", null)
                  .on("mousemove.drag", null)
                  .on("DOMMouseScroll.drag", null)
                  .on("dblclick.drag", null)
                  .on("touchstart.drag", null)
                  .on("touchmove.drag", null)
                  .on("touchend.drag", null)
                  .on("wheel.drag", null);
            }
          };

          var panLegend = function() {
            var distance = 0,
                overflowDistance = 0,
                translate = '',
                x = 0,
                y = 0;

            // don't fire on events other than zoom and drag
            // we need click for handling legend toggle
            if (d3.event) {
              if (d3.event.type === 'zoom' && d3.event.sourceEvent) {
                x = d3.event.sourceEvent.deltaX || 0;
                y = d3.event.sourceEvent.deltaY || 0;
                distance = (Math.abs(x) > Math.abs(y) ? x : y) * -1;
              } else if (d3.event.type === 'drag') {
                x = d3.event.dx || 0;
                y = d3.event.dy || 0;
                distance = y;
              } else if (d3.event.type !== 'click') {
                return 0;
              }
              overflowDistance = (Math.abs(y) > Math.abs(x) ? y : 0);
            }

            // reset value defined in panMultibar();
            scrollOffset = Math.min(Math.max(scrollOffset + distance, diff), 0);
            translate = 'translate(' + (rtl ? d3.max(keyWidths) + radius : 0) + ',' + scrollOffset + ')';

            if (scrollOffset + distance > 0 || scrollOffset + distance < diff) {
              overflowHandler(overflowDistance);
            }

            g.attr('transform', translate);
          };

          assignScrollEvents(useScroll);
        }

      };

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      function displayMenu() {
        back
          .style('opacity', legendOpen * 0.9)
          .style('display', legendOpen ? 'inline' : 'none');
        g
          .style('opacity', legendOpen)
          .style('display', legendOpen ? 'inline' : 'none');
        link
          .text(legendOpen === 1 ? legend.strings().close : legend.strings().open);
      }

      dispatch.on('toggleMenu', function(d) {
        d3.event.stopPropagation();
        legendOpen = 1 - legendOpen;
        displayMenu();
      });

      dispatch.on('closeMenu', function(d) {
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

  legend.collapsed = function(_) {
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

function scatter() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var id = Math.floor(Math.random() * 100000), //Create semi-unique ID incase user doesn't select one
      width = 960,
      height = 500,
      margin = {top: 0, right: 0, bottom: 0, left: 0},
      color = function(d, i) { return utility.defaultColor()(d, d.seriesIndex); }, // chooses color
      gradient = null,
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
      clipEdge = false, // if true, masks points within x and y scale
      delay = 0,
      duration = 300,
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


  function chart(selection) {
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
      var seriesData = (xDomain && yDomain && zDomain) ? [] : // if we know xDomain and yDomain and zDomain, no need to calculate.... if Size is constant remember to set zDomain to speed up performance
            d3.merge(
              data.map(function(d) {
                return d.values.map(function(d, i) {
                  return { x: getX(d, i), y: getY(d, i), size: getZ(d, i) };
                });
              })
            );

      chart.resetDimensions = function(w, h) {
        width = w;
        height = h;
        availableWidth = w - margin.left - margin.right;
        availableHeight = h - margin.top - margin.bottom;
        resetScale();
      };

      function resetScale() {
        x.domain(xDomain || d3.extent(seriesData.map(function(d) { return d.x; }).concat(forceX)));
        y.domain(yDomain || d3.extent(seriesData.map(function(d) { return d.y; }).concat(forceY)));

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
      // Setup containers and skeleton of chart

      var wrap_bind = container.selectAll('g.sc-wrap.sc-scatter').data([data]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-wrap sc-scatter');
      var wrap = container.select('.sc-wrap.sc-scatter').merge(wrap_entr);

      var defs_entr = wrap_entr.append('defs');

      //set up the gradient constructor function
      gradient = function(d, i) {
        return utility.colorRadialGradient(d, id + '-' + i, {x: 0.5, y: 0.5, r: 0.5, s: 0, u: 'objectBoundingBox'}, color(d, i), wrap.select('defs'));
      };

      wrap_entr.append('g').attr('class', 'sc-group');
      var group_wrap = wrap.select('.sc-group');

      wrap_entr.append('g').attr('class', 'sc-point-paths');
      var paths_wrap = wrap.select('.sc-point-paths');

      wrap
        .classed('sc-single-point', singlePoint)
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      //------------------------------------------------------------

      defs_entr.append('clipPath')
        .attr('id', 'sc-edge-clip-' + id)
        .append('rect');
      defs_entr.append('clipPath')
        .attr('id', 'sc-points-clip-' + id)
        .attr('class', 'sc-point-clips');

      wrap.select('#sc-edge-clip-' + id + ' rect')
          .attr('width', availableWidth)
          .attr('height', availableHeight);

      wrap.attr('clip-path', clipEdge ? 'url(#sc-edge-clip-' + id + ')' : '');

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

      if (onlyCircles) {

        var points_bind = series.selectAll('circle.sc-point')
              .data(function(d) { return d.values; });
        var points_entr = points_bind.enter().append('circle')
              .attr('class', function(d, i) { return 'sc-point sc-enter sc-point-' + i; })
              .attr('r', circleRadius);
        var points = series.selectAll('.sc-point').merge(points_entr);

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
              d3.select(this).classed('sc-enter', false);
            });

        series_bind.exit()
          .transition(t).selectAll('.sc-point')
            .attr('cx', function(d, i) { return x(getX(d, i)); })
            .attr('cy', function(d, i) { return y(0); })
            .remove();

      } else {

        var points_bind = series.selectAll('path.sc-point').data(function(d) { return d.values; });
        var points_enter = points_bind.enter().append('path')
              .attr('class', function(d, i) { return 'sc-point sc-enter sc-point-' + i; })
              .attr('d',
                d3.symbol()
                  .type(getShape)
                  .size(symbolSize)
              );
        var points = series.selectAll('.sc-point').merge(points_entr);

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
            );

        series_bind.exit()
          .transition(t).selectAll('.sc-point')
            .attr('transform', function(d, i) {
              return 'translate(' + x(getX(d, i)) + ',' + y(0) + ')';
            })
            .remove();

      }

      function buildEventObject(e, d, i, s) {
        return {
            series: s,
            point: s.values[i],
            pointIndex: i,
            seriesIndex: s.seriesIndex,
            id: id,
            e: e
          };
      }

      function updateInteractiveLayer() {

        if (!interactive) {
          return false;
        }

        //inject series and point index for reference into voronoi
        if (useVoronoi === true) {

          var vertices = d3.merge(data.map(function(group, groupIndex) {
              return group.values
                .map(function(point, pointIndex) {
                  // *Adding noise to make duplicates very unlikely
                  // *Injecting series and point index for reference
                  /* *Adding a 'jitter' to the points, because there's an issue in d3.voronoi.
                   */
                  var pX = getX(point, pointIndex);
                  var pY = getY(point, pointIndex);

                  return [x(pX) + Math.random() * 1e-4,
                          y(pY) + Math.random() * 1e-4,
                      groupIndex,
                      pointIndex, point]; //temp hack to add noise until I think of a better way so there are no duplicates
                })
                .filter(function(pointArray, pointIndex) {
                  return pointActive(pointArray[4], pointIndex); // Issue #237.. move filter to after map, so pointIndex is correct!
                });
            })
          );

          if (clipVoronoi) {
            var clips_bind = wrap.select('#sc-points-clip-' + id).selectAll('circle').data(vertices);
            var clips_entr = clips_bind.enter().append('circle');
            var clips = wrap.select('#sc-points-clip-' + id).selectAll('circle').merge(clips_entr);

            clips
              .attr('cx', function(d) { return d[0] })
              .attr('cy', function(d) { return d[1] })
              .attr('r', function(d, i) {
                return circleRadius(d[4], i);
              });
            clips_bind.exit().remove();

            paths_wrap
                .attr('clip-path', 'url(#sc-points-clip-' + id + ')');
          }

          if (vertices.length <= 3) {
            // Issue #283 - Adding 2 dummy points to the voronoi b/c voronoi requires min 3 points to work
            vertices.push([x.range()[0] - 20, y.range()[0] - 20, null, null]);
            vertices.push([x.range()[1] + 20, y.range()[1] + 20, null, null]);
            vertices.push([x.range()[0] - 20, y.range()[0] + 20, null, null]);
            vertices.push([x.range()[1] + 20, y.range()[1] - 20, null, null]);
          }

          var voronoi = d3.voronoi()
                .extent([[-10, -10], [width + 10, height + 10]])
                .polygons(vertices)
                .map(function(d, i) {
                  return {
                    'data': d,
                    'seriesIndex': vertices[i][2],
                    'pointIndex': vertices[i][3]
                  };
                })
                .filter(function(d) { return d.seriesIndex !== null; });

          var paths_bind = paths_wrap.selectAll('path').data(voronoi);
          var paths_entr = paths_bind.enter().append('path').attr('class', function(d, i) { return 'sc-path-' + i; });
          var paths = paths_wrap.selectAll('path').merge(paths_entr);

          paths
            .attr('d', function(d) { return d ? 'M' + d.data.join('L') + 'Z' : null; });
          paths_bind.exit().remove();

          paths
            .on('mouseover', function(d) {
              if (needsUpdate || !data[d.seriesIndex]) return 0;
              var eo = buildEventObject(d3.event, d, d.pointIndex, data[d.seriesIndex]);
              dispatch.call('elementMouseover', this, eo);
            })
            .on('mousemove', function(d, i) {
              var e = d3.event;
              dispatch.call('elementMousemove', this, e);
            })
            .on('mouseout', function(d, i) {
              if (needsUpdate || !data[d.seriesIndex]) return 0;
              var eo = buildEventObject(d3.event, d, d.pointIndex, data[d.seriesIndex]);
              dispatch.call('elementMouseout', this, eo);
            })
            .on('click', function(d) {
              if (needsUpdate || !data[d.seriesIndex]) return 0;
              var eo = buildEventObject(d3.event, d, d.pointIndex, data[d.seriesIndex]);
              dispatch.call('elementClick', this, eo);
            });

        } else {

          // add event handlers to points instead voronoi paths
          series.selectAll('.sc-point')
            //.data(dataWithPoints)
            .style('pointer-events', 'auto') // recaptivate events, disabled by css
            .on('mouseover', function(d, i) {
              if (needsUpdate || !data[d.seriesIndex]) return 0; //check if this is a dummy point
              var eo = buildEventObject(d3.event, d, i, data[d.seriesIndex]);
              dispatch.call('elementMouseover', this, eo);
            })
            .on('mousemove', function(d, i) {
              var e = d3.event;
              dispatch.call('elementMousemove', this, e);
            })
            .on('mouseout', function(d, i) {
              if (needsUpdate || !data[d.seriesIndex]) return 0; //check if this is a dummy point
              var eo = buildEventObject(d3.event, d, i, data[d.seriesIndex]);
              dispatch.call('elementMouseout', this, eo);
            })
            .on('click', function(d, i) {
              if (needsUpdate || !data[d.seriesIndex]) return 0; //check if this is a dummy point
              var eo = buildEventObject(d3.event, d, i, data[d.seriesIndex]);
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
      // Event Handling/Dispatching (in chart's scope)
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

    return chart;
  }

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;

  chart.id = function(_) {
    if (!arguments.length) { return id; }
    id = _;
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
  chart.classes = function(_) {
    if (!arguments.length) { return classes; }
    classes = _;
    return chart;
  };
  chart.gradient = function(_) {
    if (!arguments.length) { return gradient; }
    gradient = _;
    return chart;
  };

  chart.x = function(_) {
    if (!arguments.length) { return getX; }
    getX = utility.functor(_);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) { return getY; }
    getY = utility.functor(_);
    return chart;
  };

  chart.z = function(_) {
    if (!arguments.length) { return getZ; }
    getZ = utility.functor(_);
    return chart;
  };

  chart.xScale = function(_) {
    if (!arguments.length) { return x; }
    x = _;
    return chart;
  };

  chart.yScale = function(_) {
    if (!arguments.length) { return y; }
    y = _;
    return chart;
  };

  chart.zScale = function(_) {
    if (!arguments.length) { return z; }
    z = _;
    return chart;
  };

  chart.xDomain = function(_) {
    if (!arguments.length) { return xDomain; }
    xDomain = _;
    return chart;
  };

  chart.yDomain = function(_) {
    if (!arguments.length) { return yDomain; }
    yDomain = _;
    return chart;
  };

  chart.zDomain = function(_) {
    if (!arguments.length) { return zDomain; }
    zDomain = _;
    return chart;
  };

  chart.forceX = function(_) {
    if (!arguments.length) { return forceX; }
    forceX = _;
    return chart;
  };

  chart.forceY = function(_) {
    if (!arguments.length) { return forceY; }
    forceY = _;
    return chart;
  };

  chart.forceZ = function(_) {
    if (!arguments.length) { return forceZ; }
    forceZ = _;
    return chart;
  };

  chart.size = function(_) {
    if (!arguments.length) { return getZ; }
    getZ = utility.functor(_);
    return chart;
  };

  chart.sizeRange = function(_) {
    if (!arguments.length) { return zRange; }
    zRange = _;
    return chart;
  };
  chart.sizeDomain = function(_) {
    if (!arguments.length) { return sizeDomain; }
    zDomain = _;
    return chart;
  };
  chart.forceSize = function(_) {
    if (!arguments.length) { return forceZ; }
    forceZ = _;
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

  chart.interactive = function(_) {
    if (!arguments.length) { return interactive; }
    interactive = _;
    return chart;
  };

  chart.pointActive = function(_) {
    if (!arguments.length) { return pointActive; }
    pointActive = _;
    return chart;
  };

  chart.padData = function(_) {
    if (!arguments.length) { return padData; }
    padData = _;
    return chart;
  };

  chart.padDataOuter = function(_) {
    if (!arguments.length) { return padDataOuter; }
    padDataOuter = _;
    return chart;
  };

  chart.clipEdge = function(_) {
    if (!arguments.length) { return clipEdge; }
    clipEdge = _;
    return chart;
  };

  chart.clipVoronoi = function(_) {
    if (!arguments.length) { return clipVoronoi; }
    clipVoronoi = _;
    return chart;
  };

  chart.useVoronoi = function(_) {
    if (!arguments.length) { return useVoronoi; }
    useVoronoi = _;
    if (useVoronoi === false) {
        clipVoronoi = false;
    }
    return chart;
  };

  chart.circleRadius = function(_) {
    if (!arguments.length) { return circleRadius; }
    circleRadius = _;
    return chart;
  };

  chart.clipRadius = function(_) {
    if (!arguments.length) { return circleRadius; }
    circleRadius = _;
    return chart;
  };

  chart.shape = function(_) {
    if (!arguments.length) { return getShape; }
    getShape = _;
    return chart;
  };

  chart.onlyCircles = function(_) {
    if (!arguments.length) { return onlyCircles; }
    onlyCircles = _;
    return chart;
  };

  chart.singlePoint = function(_) {
    if (!arguments.length) { return singlePoint; }
    singlePoint = _;
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) { return duration; }
    duration = _;
    return chart;
  };

  chart.nice = function(_) {
    if (!arguments.length) { return nice; }
    nice = _;
    return chart;
  };

  chart.locality = function(_) {
    if (!arguments.length) { return locality; }
    locality = utility.buildLocality(_);
    return chart;
  };

  //============================================================

  return chart;
}

function line() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var model = scatter();

  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 960,
      height = 500,
      getX = function(d) { return d.x; }, // accessor to get the x value from a data point
      getY = function(d) { return d.y; }, // accessor to get the y value from a data point
      x, //can be accessed via chart.xScale()
      y, //can be accessed via chart.yScale()
      defined = function(d, i) { return !isNaN(getY(d, i)) && getY(d, i) !== null; }, // allows a line to be not continuous when it is not defined
      isArea = function(d) { return (d && d.area) || false; }, // decides if a line is an area or just a line
      interpolate = 'linear', // controls the line interpolation
      clipEdge = false, // if true, masks lines within x and y scale
      delay = 0, // transition
      duration = 300, // transition
      color = function(d, i) { return utility.defaultColor()(d, d.seriesIndex); },
      gradient = null,
      fill = color,
      classes = function(d, i) { return 'sc-series sc-series-' + d.seriesIndex; };


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  // var x0, y0; //used to store previous scales

  //============================================================

  function chart(selection) {
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

      var tran = d3.transition('scatter')
            .duration(duration)
            .ease(d3.easeLinear);

      var id = model.id();

      //set up the gradient constructor function
      gradient = function(d, i, p) {
        return utility.colorLinearGradient(d, chart.id() + '-' + i, p, color(d, i), wrap.select('defs'));
      };

      //------------------------------------------------------------
      // Setup Scales

      x = model.xScale();
      y = model.yScale();
      // x0 = x.copy();
      // y0 = y.copy();

      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap_bind = container.selectAll('g.sc-wrap.sc-line').data([data]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-wrap sc-line');
      var wrap = container.select('.sc-wrap.sc-line').merge(wrap_entr);

      var defs_entr = wrap_entr.append('defs');

      wrap_entr.append('g').attr('class', 'sc-group');
      var group_wrap = wrap.select('.sc-group');

      wrap_entr.append('g').attr('class', 'sc-scatter-wrap');
      var scatter_wrap = wrap.select('.sc-scatter-wrap');

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

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

      model
        .clipEdge(clipEdge)
        .width(availableWidth)
        .height(availableHeight);
      scatter_wrap.call(model);

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

    return chart;
  }

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = model.dispatch;
  chart.scatter = model;

  fc.rebind(chart, model, 'id', 'interactive', 'size', 'xScale', 'yScale', 'zScale', 'xDomain', 'yDomain', 'sizeDomain', 'sizeRange', 'forceX', 'forceY', 'forceSize', 'useVoronoi', 'clipVoronoi', 'clipRadius', 'padData', 'padDataOuter', 'singlePoint', 'nice', 'locality');

  chart.color = function(_) {
    if (!arguments.length) { return color; }
    color = _;
    model.color(color);
    return chart;
  };
  chart.fill = function(_) {
    if (!arguments.length) { return fill; }
    fill = _;
    model.fill(fill);
    return chart;
  };
  chart.classes = function(_) {
    if (!arguments.length) { return classes; }
    classes = _;
    model.classes(classes);
    return chart;
  };
  chart.gradient = function(_) {
    if (!arguments.length) { return gradient; }
    gradient = _;
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

  chart.x = function(_) {
    if (!arguments.length) { return getX; }
    getX = _;
    model.x(_);
    return chart;
  };
  chart.y = function(_) {
    if (!arguments.length) { return getY; }
    getY = _;
    model.y(_);
    return chart;
  };

  chart.delay = function(_) {
    if (!arguments.length) { return delay; }
    delay = _;
    return chart;
  };
  chart.duration = function(_) {
    if (!arguments.length) { return duration; }
    duration = _;
    model.duration(_);
    return chart;
  };

  chart.clipEdge = function(_) {
    if (!arguments.length) { return clipEdge; }
    clipEdge = _;
    return chart;
  };

  chart.interpolate = function(_) {
    if (!arguments.length) { return interpolate; }
    interpolate = _;
    return chart;
  };

  chart.defined = function(_) {
    if (!arguments.length) { return defined; }
    defined = _;
    return chart;
  };

  chart.isArea = function(_) {
    if (!arguments.length) { return isArea; }
    isArea = utility.functor(_);
    return chart;
  };

  //============================================================

  return chart;
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
      locality = utility.buildLocality(),
      forceY = [0], // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do chart.forceY([]) to remove
      stacked = true,
      barColor = null, // adding the ability to set the color for each rather than the whole group
      disabled, // used in conjunction with barColor to communicate to multibarChart what series are disabled
      showValues = false,
      valueFormat = function(d) { return d; },
      withLine = false,
      vertical = true,
      baseDimension = 60,
      direction = 'ltr',
      clipEdge = false, // if true, masks bars within x and y scale
      delay = 0, // transition
      duration = 300, // transition
      xDomain,
      yDomain,
      nice = false,
      color = function(d, i) { return utility.defaultColor()(d, d.seriesIndex); },
      gradient = null,
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

  function chart(selection) {
    selection.each(function(data) {

      // baseDimension = stacked ? vertical ? 72 : 30 : 20;

      var container = d3.select(this),
          orientation = vertical ? 'vertical' : 'horizontal',
          availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          dimX = vertical ? 'width' : 'height',
          dimY = vertical ? 'height' : 'width',
          dimLabel = vertical ? 'width' : 'height',
          valX = vertical ? 'x' : 'y',
          valY = vertical ? 'y' : 'x',
          seriesCount = 0,
          groupCount = 0,
          minSeries = 0,
          maxSeries = data.length - 1,
          verticalLabels = false,
          labelPosition = showValues,
          labelLengths = [],
          labelThickness = 0;

      function barLength(d, i) {
        return Math.max(Math.round(Math.abs(y(getY(d, i)) - y(0))), 0);
      }
      function barThickness() {
        return x.bandwidth() / (stacked ? 1 : data.length);
      }
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
      } else if (labelPosition) {
        // grouped bars can't have label position 'total'
        if (labelPosition === 'total') {
          labelPosition = 'top';
        } else if (labelPosition === true) {
          labelPosition = 'end';
        }
        verticalLabels = vertical;
      }

      //------------------------------------------------------------
      // HACK for negative value stacking
      if (stacked) {
        var groupTotals = [];
        data[0].values.map(function(d, i) {
          var posBase = 0,
              negBase = 0;
          data.map(function(d) {
            var f = d.values[i];
            f.size = Math.abs(f.y);
            if (f.y < 0) {
              f.y0 = negBase - (vertical ? 0 : f.size);
              negBase -= f.size;
            } else {
              f.y0 = posBase + (vertical ? f.size : 0);
              posBase += f.size;
            }
          });
          groupTotals[i] = {neg: negBase, pos: posBase};
        });
      }

      //------------------------------------------------------------
      // Setup Scales

      // remap and flatten the data for use in calculating the scales' domains
      var seriesData = d3.merge(data.map(function(d) {
              return d.values.map(function(d, i) {
                return {x: getX(d, i), y: getY(d, i), y0: d.y0, y0: d.y0};
              });
            }));

      groupCount = data[0].values.length;
      seriesCount = data.length;

      if (showValues) {
        var labelData = labelPosition === 'total' && stacked ?
              groupTotals.map(function(d) { return d.neg; }).concat(
                groupTotals.map(function(d) { return d.pos; })
              ) :
              seriesData.map(getY);

        var seriesExtents = d3.extent(data.map(function(d, i) { return d.seriesIndex; }));
        minSeries = seriesExtents[0];
        maxSeries = seriesExtents[1];

        labelLengths = utility.stringSetLengths(
            labelData,
            container,
            valueFormat,
            'sc-label-value'
          );

        labelThickness = utility.stringSetThickness(
            ['Xy'],
            container,
            valueFormat,
            'sc-label-value'
          )[0];
      }

      chart.resetDimensions = function(w, h) {
        width = w;
        height = h;
        availableWidth = w - margin.left - margin.right;
        availableHeight = h - margin.top - margin.bottom;
        resetScale();
      };

      function unique(x) {
        return x.reverse()
                .filter(function (e, i, x) { return x.indexOf(e, i+1) === -1; })
                .reverse();
      }

      function resetScale() {
        var xDomain = xDomain || unique(seriesData.map(getX));
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
                var posOffset = (vertical ? 0 : d.y),
                    negOffset = (vertical ? d.y : 0);
                return stacked ? (d.y > 0 ? d.y0 + posOffset : d.y0 + negOffset) : d.y;
              }).concat(forceY));

        var yRange = vertical ? [availableHeight, 0] : [0, availableWidth];

        // initial set of y scale based on full dimension
        y .domain(yDomain)
          .range(yRange);


        if (showValues) {
          // this must go here because barThickness varies
          if (vertical && stacked && d3.max(labelLengths) + 8 > barThickness()) {
            verticalLabels = true;
          }
          //       vlbl   hlbl
          // vrt:   N      Y
          // hrz:   N      N
          dimLabel = vertical && !verticalLabels ? 'labelHeight' : 'labelWidth';
        }

        //------------------------------------------------------------
        // recalculate y.range if grouped and show values

        if (labelPosition === 'top' || labelPosition === 'total') {
          var maxBarLength = maxY,
              minBarLength = 0,
              maxValuePadding = 0,
              minValuePadding = 0,
              gap = vertical ? verticalLabels ? 2 : -2 : 2;

          labelData.forEach(function(d, i) {
            var labelDim = labelPosition === 'total' && stacked && vertical && !verticalLabels ? labelThickness : labelLengths[i];
            if (vertical && d > 0 || !vertical && d < 0) {
              if (y(d) - labelDim < minBarLength) {
                minBarLength = y(d) - labelDim;
                minValuePadding = labelDim;
              }
            } else {
              if (y(d) + labelDim > maxBarLength) {
                maxBarLength = y(d) + labelDim;
                maxValuePadding = labelDim;
              }
            }
          });

          if (vertical) {
            y.range([
              maxY - (y.domain()[0] < 0 ? maxValuePadding + gap + 2 : 0),
                      y.domain()[1] > 0 ? minValuePadding + gap : 0
            ]);
          } else {
            y.range([
                      y.domain()[0] < 0 ? minValuePadding + gap + 4 : 0,
              maxY - (y.domain()[1] > 0 ? maxValuePadding + gap : 0)
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
      // Setup containers and skeleton of chart

      var wrap_bind = container.selectAll('g.sc-wrap.sc-multibar').data([data]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-wrap sc-multibar');
      var wrap = container.select('.sc-wrap.sc-multibar').merge(wrap_entr);

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      //set up the gradient constructor function
      gradient = function(d, i, p) {
        return utility.colorLinearGradient(d, id + '-' + i, p, color(d, i), wrap.select('defs'));
      };

      //------------------------------------------------------------
      // Definitions

      var defs_entr = wrap_entr.append('defs');

      if (clipEdge) {
        defs_entr.append('clipPath')
          .attr('id', 'sc-edge-clip-' + id)
          .append('rect');
        wrap.select('#sc-edge-clip-' + id + ' rect')
          .attr('width', availableWidth)
          .attr('height', availableHeight);
      }
      wrap.attr('clip-path', clipEdge ? 'url(#sc-edge-clip-' + id + ')' : '');


      if (textureFill) {
        var mask = utility.createTexture(defs_entr, id);
      }

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
        .attr('class', function(d,i) { return classes(d,i); })
        .classed('hover', function(d) { return d.hover; })
        .classed('sc-active', function(d) { return d.active === 'active'; })
        .classed('sc-inactive', function(d) { return d.active === 'inactive'; })
        .style('stroke-opacity', 1)
        .style('fill-opacity', 1);

      series
        .on('mouseover', function(d, i, j) { //TODO: figure out why j works above, but not here
          d3.select(this).classed('hover', true);
        })
        .on('mouseout', function(d, i, j) {
          d3.select(this).classed('hover', false);
        });

      //------------------------------------------------------------

      var bars_bind = series.selectAll('.sc-bar').data(function(d) { return d.values; });
      var bars_entr = bars_bind.enter().append('g')
            .attr('class', 'sc-bar');
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

      // For label text
      var barText_entr = bars_entr.append('text') // TODO: should this be inside labelPosition?
        .attr('class', 'sc-label-value');
      var barText = bars.select('.sc-label-value').merge(barText_entr);

      //------------------------------------------------------------

      bars
        .attr('class', function(d, i) {
          return 'sc-bar ' + (getY(d, i) < 0 ? 'negative' : 'positive');
        })
        .attr('transform', function(d, i) {
          var trans = stacked ? {
                x: Math.round(x(getX(d, i))),
                y: Math.round(y(d.y0))
              } :
              { x: Math.round(d.seri * barThickness() + x(getX(d, i))),
                y: Math.round(getY(d, i) < 0 ? (vertical ? y(0) : y(getY(d, i))) : (vertical ? y(getY(d, i)) : y(0)))
              };
          return 'translate(' + trans[valX] + ',' + trans[valY] + ')';
        });

      bars
        .select('rect.sc-base')
          .attr(valX, 0)
          .attr(dimY, barLength)
          .attr(dimX, barThickness);

      if (textureFill) {
        bars
          .select('rect.sc-texture')
            .attr(valX, 0)
            .attr(dimY, barLength)
            .attr(dimX, barThickness)
            .classed('sc-active', function(d) { return d.active === 'active'; })
            .style('fill', function(d, i) {
              var backColor = fill(d),
                  foreColor = utility.getTextContrast(backColor, i);
              return foreColor;
            });
      }

      //------------------------------------------------------------
      // Assign events

      function buildEventObject(e, d, i) {
        return {
            value: getY(d, i),
            point: d,
            series: data[d.seriesIndex],
            pointIndex: i,
            seriesIndex: d.seriesIndex,
            groupIndex: d.group,
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
      // Bar text: begin, middle, end, top

      if (showValues) {

          barText
            .text(function(d, i) {
              var val = labelPosition === 'total' && stacked ?
                getY(d, i) < 0 ?
                  groupTotals[i].neg :
                  groupTotals[i].pos :
                getY(d, i);
              return valueFormat(val);
            })
            .each(function(d, i) {
              var bbox = this.getBoundingClientRect();
              d.labelWidth = Math.floor(bbox.width) + 4;
              d.labelHeight = Math.floor(bbox.height);
              d.barLength = barLength(d, i);
              d.barThickness = barThickness();
            });

          barText
            .attr('dy', '0.35em')
            .attr('text-anchor', function(d, i) {
              var anchor = 'middle',
                  negative = getY(d, i) < 0;
              if (vertical && !verticalLabels) {
                anchor = 'middle';
              } else {
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
              }
              return anchor;
            })
            .attr('transform', 'rotate(' + (verticalLabels ? -90 : 0) + ' 0,0)')
            .attr('x', function(d, i) {
              var offset = 0,
                  negative = getY(d, i) < 0 ? -1 : 1,
                  shift = negative < 0,
                  padding = (4 + (verticalLabels || !vertical) * 2) * negative;

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
            })
            .attr('y', function(d, i) {
              var offset = 0,
                  negative = getY(d, i) < 0 ? -1 : 1,
                  shift = negative < 0,
                  padding = (d.labelHeight / 2 + (4 + verticalLabels * 2) * (labelPosition === 'total' ? 0 : 1)) * negative;

              if (vertical && !verticalLabels) {
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
                  case 'total':
                    offset = d.barLength * (0 + shift) + padding * -1;
                    break;
                }
              } else {
                offset = d.barThickness / 2;
              }
              return offset;
            })
            .style('fill', function(d, i, j) {
              if (labelPosition === 'top' || labelPosition === 'total') {
                return '#000';
              }
              // var backColor = d3.select(this.previousSibling).style('fill'),
              var backColor = fill(d),
                  textColor = utility.getTextContrast(backColor, i);
              return textColor;
            })
            .style('fill-opacity', function(d, i) {
              if (labelPosition === 'total') {
                if (d.seriesIndex !== minSeries && d.seriesIndex !== maxSeries) {
                  return 0;
                }
                var y = getY(d, i);
                return (y <  0 && groupTotals[i].neg === d.y0 + (vertical ? y : 0)) ||
                       (y >= 0 && groupTotals[i].pos === d.y0 + (vertical ? 0 : y)) ? 1 : 0;
              } else {
                var lengthOverlaps = d.barLength < (!vertical || verticalLabels ? d.labelWidth : d.labelHeight) + 8,
                    thicknessOverlaps = d.barThickness < (!vertical || verticalLabels ? d.labelHeight : d.labelWidth) + 4;
                return labelPosition !== 'top' && (lengthOverlaps || thicknessOverlaps) ? 0 : 1;
              }
            });

          function getLabelBoxOffset(d, i, s, gap) {
            var offset = 0,
                negative = getY(d, i) < 0 ? -1 : 1,
                shift = s === negative < 0 ? 1 : 0,
                barLength = d.barLength - d[dimLabel];
            if (s ? vertical : !vertical) {
              offset = (d.barThickness - (verticalLabels === s ? d.labelHeight : d.labelWidth)) / 2;
            } else {
              switch (labelPosition) {
                case 'start':
                  offset = barLength * (0 + shift) + gap * negative;
                  break;
                case 'middle':
                  offset = barLength / 2;
                  break;
                case 'end':
                  offset = barLength * (1 - shift) - gap * negative;
                  break;
                case 'top':
                  offset = d.barLength * (1 - shift) - d.labelWidth * (0 + shift);
                  break;
                case 'total':
                  offset = d.barLength * (1 - shift) - (verticalLabels === s ? d.labelHeight : d.labelWidth) * (0 + shift);
                  break;
              }
            }

            return offset;
          }

          //------------------------------------------------------------
          // Label background box
          // bars.filter(function(d, i) {
          //     return labelPosition === 'total' && stacked ? (d.seriesIndex !== minSeries && d.seriesIndex !== maxSeries) : false;
          //   })
          //   .select('rect.sc-label-box')
          //       .style('fill-opacity', 0);
          if (labelPosition === 'total' && stacked) {
            bars.select('rect.sc-label-box')
              .style('fill-opacity', 0);
          }
          bars.filter(function(d, i) {
              return labelPosition === 'total' && stacked ? (d.seriesIndex === minSeries || d.seriesIndex === maxSeries) : true;
            })
            .select('rect.sc-label-box')
                .attr('x', function(d, i) {
                  return getLabelBoxOffset(d, i, true, 4);
                })
                .attr('y', function(d, i) {
                  return getLabelBoxOffset(d, i, false, -4);
                })
                .attr('width', function(d, i) {
                  return verticalLabels ? d.labelHeight : d.labelWidth;
                })
                .attr('height', function(d, i) {
                  return verticalLabels ? d.labelWidth : d.labelHeight;
                })
                .style('fill', function(d, i) {
                  return labelPosition === 'top' || labelPosition === 'total' ? '#fff' : fill(d, i);
                })
                .style('fill-opacity', function(d, i) {
                  var lengthOverlaps = d.barLength < (!vertical || verticalLabels ? d.labelWidth : d.labelHeight) + 8,
                      thicknessOverlaps = d.barThickness < (!vertical || verticalLabels ? d.labelHeight : d.labelWidth) + 4;
                  return labelPosition !== 'top' && (lengthOverlaps || thicknessOverlaps) ? 0 : 1;
                });

      } else {
        barText
          .text('')
          .style('fill-opacity', 0);

        bars
          .select('rect.label-box')
            .style('fill-opacity', 0);
      }

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

    return chart;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;

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
  chart.classes = function(_) {
    if (!arguments.length) { return classes; }
    classes = _;
    return chart;
  };
  chart.gradient = function(_) {
    if (!arguments.length) { return gradient; }
    gradient = _;
    return chart;
  };

  chart.x = function(_) {
    if (!arguments.length) { return getX; }
    getX = _;
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) { return getY; }
    getY = _;
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

  chart.xScale = function(_) {
    if (!arguments.length) { return x; }
    x = _;
    return chart;
  };

  chart.yScale = function(_) {
    if (!arguments.length) { return y; }
    y = _;
    return chart;
  };

  chart.xDomain = function(_) {
    if (!arguments.length) { return xDomain; }
    xDomain = _;
    return chart;
  };

  chart.yDomain = function(_) {
    if (!arguments.length) { return yDomain; }
    yDomain = _;
    return chart;
  };

  chart.forceY = function(_) {
    if (!arguments.length) { return forceY; }
    forceY = _;
    return chart;
  };

  chart.stacked = function(_) {
    if (!arguments.length) { return stacked; }
    stacked = _;
    return chart;
  };

  chart.barColor = function(_) {
    if (!arguments.length) { return barColor; }
    barColor = utility.getColor(_);
    return chart;
  };

  chart.disabled = function(_) {
    if (!arguments.length) { return disabled; }
    disabled = _;
    return chart;
  };

  chart.id = function(_) {
    if (!arguments.length) { return id; }
    id = _;
    return chart;
  };

  chart.delay = function(_) {
    if (!arguments.length) { return delay; }
    delay = _;
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) { return duration; }
    duration = _;
    return chart;
  };

  chart.clipEdge = function(_) {
    if (!arguments.length) { return clipEdge; }
    clipEdge = _;
    return chart;
  };

  chart.showValues = function(_) {
    if (!arguments.length) { return showValues; }
    showValues = isNaN(parseInt(_, 10)) ? _ : parseInt(_, 10) && true || false;
    return chart;
  };

  chart.valueFormat = function(_) {
    if (!arguments.length) { return valueFormat; }
    valueFormat = _;
    return chart;
  };

  chart.withLine = function(_) {
    if (!arguments.length) { return withLine; }
    withLine = _;
    return chart;
  };

  chart.vertical = function(_) {
    if (!arguments.length) { return vertical; }
    vertical = _;
    return chart;
  };

  chart.baseDimension = function(_) {
    if (!arguments.length) { return baseDimension; }
    baseDimension = _;
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    return chart;
  };

  chart.nice = function(_) {
    if (!arguments.length) { return nice; }
    nice = _;
    return chart;
  };

  chart.textureFill = function(_) {
    if (!arguments.length) { return textureFill; }
    textureFill = _;
    return chart;
  };

  chart.locality = function(_) {
    if (!arguments.length) { return locality; }
    locality = utility.buildLocality(_);
    return chart;
  };

  //============================================================

  return chart;
}

function pie() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 500,
      height = 500,
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID in case user doesn't select one
      getX = function(d) { return d.x; },
      getY = function(d) { return d.y; },
      getKey = function(d) { return d.key; },
      getValue = function(d, i) { return d.value; },
      fmtKey = function(d) { return getKey(d.series || d); },
      fmtValue = function(d) { return getValue(d.series || d); },
      fmtCount = function(d) { return (' (' + (d.series.count || d.count) + ')').replace(' ()', ''); },
      locality = utility.buildLocality(),
      direction = 'ltr',
      delay = 0,
      duration = 0,
      color = function(d, i) { return utility.defaultColor()(d.series, d.seriesIndex); },
      gradient = null,
      fill = color,
      textureFill = false,
      classes = function(d, i) { return 'sc-series sc-series-' + d.seriesIndex; },
      dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout', 'elementMousemove');

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
      maxRadius = 250;

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
        return d.endAngle * arcDegrees / 360 + utility.angleToRadians(rotateDegrees);
      };

  var fixedRadius = function(chart) { return null; };

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  // Setup the Pie chart and choose the data element
  var pie = d3.pie()
        .sort(null)
        .value(getValue);

  //============================================================
  // Update chart

  function chart(selection) {

    selection.each(function(data) {

      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          container = d3.select(this);

      //set up the gradient constructor function
      gradient = function(d, i) {
        var params = {x: 0, y: 0, r: pieRadius, s: (donut ? (donutRatio * 100) + '%' : '0%'), u: 'userSpaceOnUse'};
        return utility.colorRadialGradient(d, id + '-' + i, params, color(d, i), wrap.select('defs'));
      };

      //------------------------------------------------------------
      // recalculate width and height based on label length

      var labelLengths = [],
          doLabels = showLabels && pieLabelsOutside ? true : false;

      if (doLabels) {
        labelLengths = utility.stringSetLengths(
            data,
            container,
            fmtKey,
            'sc-label'
          );
      }

      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap_bind = container.selectAll('g.sc-wrap').data([data]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-wrap sc-pie');
      var wrap = container.select('.sc-wrap.sc-pie').merge(wrap_entr);

      var defs_entr = wrap_entr.append('defs');

      wrap_entr.append('g').attr('class', 'sc-group');
      var group_wrap = wrap.select('.sc-group');

      wrap_entr.append('g').attr('class', 'sc-hole-wrap');
      var hole_wrap = wrap.select('.sc-hole-wrap');

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      //------------------------------------------------------------
      // Definitions

      if (textureFill) {
        var mask = utility.createTexture(defs_entr, id, -availableWidth / 2, -availableHeight / 2);
      }

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
          horizontalShift = 0,
          horizontalReduction = leaderLength + textOffset;

      // side effect :: resets extWidths, extHeights
      slices.select('.sc-base').call(calcScalars, maxWidthRadius, maxHeightRadius);

      // Donut Hole Text
      hole_wrap.call(holeFormat, hole ? [hole] : []);

      if (hole) {
        var heightHoleHalf = hole_wrap.node().getBoundingClientRect().height * 0.30,
            heightPieHalf = Math.abs(maxHeightRadius * d3.min(extHeights)),
            holeOffset = Math.round(heightHoleHalf - heightPieHalf);

        if (holeOffset > 0) {
          verticalReduction += holeOffset;
          verticalShift -= holeOffset / 2;
        }
      }

      var offsetHorizontal = availableWidth / 2,
          offsetVertical = availableHeight / 2;

      //first adjust the leaderLength to be proportional to radius
      if (doLabels) {
        leaderLength = Math.max(Math.min(Math.min(calcMaxRadius()) / 12, 20), 10);
      }

      if (fixedRadius(chart)) {
        minRadius = fixedRadius(chart);
        maxRadius = fixedRadius(chart);
      }

      var labelRadius = Math.min(Math.max(calcMaxRadius(), minRadius), maxRadius),
          pieRadius = labelRadius - (doLabels ? leaderLength : 0);

      offsetVertical += ((d3.max(extHeights) - d3.min(extHeights)) / 2 + d3.min(extHeights)) * ((labelRadius + verticalShift) / offsetVertical);
      offsetHorizontal += ((d3.max(extWidths) - d3.min(extWidths)) / 2 - d3.max(extWidths)) * (labelRadius / offsetHorizontal);
      offsetVertical += verticalShift / 2;

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
            var backColor = d3.select(this.parentNode).style('fill');
            return utility.getTextContrast(backColor, i);
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
            if (labelLengths[i] > minRadius || labelRadius === minRadius) {
              var theta = (startAngle(d) + endAngle(d)) / 2,
                  sin = Math.abs(Math.sin(theta)),
                  bW = labelRadius * sin + leaderLength + textOffset + labelLengths[i],
                  rW = (availableWidth / 2 - offsetHorizontal) + availableWidth / 2 - bW;
              if (rW < 0) {
                var label = utility.stringEllipsify(fmtKey(d), container, labelLengths[i] + rW);
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
          value: fmtValue(d),
          count: fmtCount(d),
          data: d,
          series: d.series,
          e: e
        };
      }

      // calculate max and min height of slice vertices
      function calcScalars(slices, maxWidth, maxHeight) {
        var widths = [],
            heights = [],
            Pi = Math.PI,
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
          var aStart = (startAngle(d) + twoPi) % twoPi,
              aEnd = (endAngle(d) + twoPi) % twoPi;

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

      function labelOpacity(d) {
        var percent = (endAngle(d) - startAngle(d)) / (2 * Math.PI);
        return percent > labelThreshold ? 1 : 0;
      }

      function alignedRight(d, arc) {
        var circ = Math.PI * 2,
            midArc = ((startAngle(d) + endAngle(d)) / 2 + circ) % circ;
        return midArc > 0 && midArc < Math.PI ? 1 : -1;
      }

      

    });

    return chart;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;

  chart.id = function(_) {
    if (!arguments.length) { return id; }
    id = _;
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
  chart.classes = function(_) {
    if (!arguments.length) { return classes; }
    classes = _;
    return chart;
  };
  chart.gradient = function(_) {
    if (!arguments.length) { return gradient; }
    gradient = _;
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) { return margin; }
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
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

  chart.getKey = function(_) {
    if (!arguments.length) { return getKey; }
    getKey = _;
    return chart;
  };

  chart.getValue = function(_) {
    if (!arguments.length) { return getValue; }
    getValue = _;
    return chart;
  };

  chart.fmtKey = function(_) {
    if (!arguments.length) { return fmtKey; }
    fmtKey = _;
    return chart;
  };

  chart.fmtValue = function(_) {
    if (!arguments.length) { return fmtValue; }
    fmtValue = _;
    return chart;
  };

  chart.fmtCount = function(_) {
    if (!arguments.length) { return fmtCount; }
    fmtCount = _;
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    return chart;
  };

  chart.delay = function(_) {
    if (!arguments.length) { return delay; }
    delay = _;
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) { return duration; }
    duration = _;
    return chart;
  };

  chart.locality = function(_) {
    if (!arguments.length) { return locality; }
    locality = utility.buildLocality(_);
    return chart;
  };

  chart.values = function(_) {
    if (!arguments.length) { return getValues; }
    getValues = _;
    return chart;
  };

  chart.textureFill = function(_) {
    if (!arguments.length) { return textureFill; }
    textureFill = _;
    return chart;
  };

  // PIE

  chart.showLabels = function(_) {
    if (!arguments.length) { return showLabels; }
    showLabels = _;
    return chart;
  };

  chart.labelSunbeamLayout = function(_) {
    if (!arguments.length) { return labelSunbeamLayout; }
    labelSunbeamLayout = _;
    return chart;
  };

  chart.donutLabelsOutside = function(_) {
    if (!arguments.length) { return donutLabelsOutside; }
    donutLabelsOutside = _;
    return chart;
  };

  chart.pieLabelsOutside = function(_) {
    if (!arguments.length) { return pieLabelsOutside; }
    pieLabelsOutside = _;
    return chart;
  };

  chart.showLeaders = function(_) {
    if (!arguments.length) { return showLeaders; }
    showLeaders = _;
    return chart;
  };

  chart.donut = function(_) {
    if (!arguments.length) { return donut; }
    donut = _;
    return chart;
  };

  chart.hole = function(_) {
    if (!arguments.length) { return hole; }
    hole = _;
    return chart;
  };

  chart.holeFormat = function(_) {
    if (!arguments.length) { return holeFormat; }
    holeFormat = utility.functor(_);
    return chart;
  };

  chart.donutRatio = function(_) {
    if (!arguments.length) { return donutRatio; }
    donutRatio = _;
    return chart;
  };

  chart.startAngle = function(_) {
    if (!arguments.length) { return startAngle; }
    startAngle = _;
    return chart;
  };

  chart.endAngle = function(_) {
    if (!arguments.length) { return endAngle; }
    endAngle = _;
    return chart;
  };

  chart.labelThreshold = function(_) {
    if (!arguments.length) { return labelThreshold; }
    labelThreshold = _;
    return chart;
  };

  chart.arcDegrees = function(_) {
    if (!arguments.length) { return arcDegrees; }
    arcDegrees = Math.max(Math.min(_, 360), 1);
    return chart;
  };

  chart.rotateDegrees = function(_) {
    if (!arguments.length) { return rotateDegrees; }
    rotateDegrees = _ % 360;
    return chart;
  };

  chart.minRadius = function(_) {
    if (!arguments.length) { return minRadius; }
    minRadius = _;
    return chart;
  };

  chart.maxRadius = function(_) {
    if (!arguments.length) { return maxRadius; }
    maxRadius = _;
    return chart;
  };

  chart.fixedRadius = function(_) {
    if (!arguments.length) { return fixedRadius; }
    fixedRadius = utility.functor(_);
    return chart;
  };

  //============================================================

  return chart;
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
    scroll.pan = function(diff) {
      var distance = 0,
          overflowDistance = 0,
          translate = '',
          x = 0,
          y = 0;

      // don't fire on events other than zoom and drag
      // we need click for handling legend toggle
      if (d3.event) {
        if (d3.event.type === 'zoom' && d3.event.sourceEvent) {
          x = d3.event.sourceEvent.deltaX || 0;
          y = d3.event.sourceEvent.deltaY || 0;
          distance = (Math.abs(x) > Math.abs(y) ? x : y) * -1;
        } else if (d3.event.type === 'drag') {
          x = d3.event.dx || 0;
          y = d3.event.dy || 0;
          distance = vertical ? x : y;
        } else if (d3.event.type !== 'click') {
          return 0;
        }
        overflowDistance = (Math.abs(y) > Math.abs(x) ? y : 0);
      }

      // reset value defined in panMultibar();
      scrollOffset = Math.min(Math.max(scrollOffset + distance, diff), -1);
      translate = 'translate(' + (vertical ? scrollOffset + ',0' : '0,' + scrollOffset) + ')';

      if (scrollOffset + distance > 0 || scrollOffset + distance < diff) {
        overflowHandler(overflowDistance);
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

        var zoom = d3.zoom()
              .on('zoom', panHandler);
        var drag = d3.drag()
              .subject(function(d) { return d; })
              .on('drag', panHandler);

        scroll_wrap
          .call(zoom);
        scrollTarget
          .call(zoom);

        scroll_wrap
          .call(drag);
        scrollTarget
          .call(drag);

      } else {

        scroll_wrap.on('.zoom', null);
        scrollTarget.on('.zoom', null);

        scroll_wrap.on('.drag', null);
        scrollTarget.on('.drag', null);

        // scroll_wrap
        //     .on('mousedown.zoom', null)
        //     .on('mousewheel.zoom', null)
        //     .on('mousemove.zoom', null)
        //     .on('DOMMouseScroll.zoom', null)
        //     .on('dblclick.zoom', null)
        //     .on('touchstart.zoom', null)
        //     .on('touchmove.zoom', null)
        //     .on('touchend.zoom', null)
        //     .on('wheel.zoom', null);
        // scrollTarget
        //     .on('mousedown.zoom', null)
        //     .on('mousewheel.zoom', null)
        //     .on('mousemove.zoom', null)
        //     .on('DOMMouseScroll.zoom', null)
        //     .on('dblclick.zoom', null)
        //     .on('touchstart.zoom', null)
        //     .on('touchmove.zoom', null)
        //     .on('touchend.zoom', null)
        //     .on('wheel.zoom', null);

        // scroll_wrap
        //     .on('mousedown.drag', null)
        //     .on('mousewheel.drag', null)
        //     .on('mousemove.drag', null)
        //     .on('DOMMouseScroll.drag', null)
        //     .on('dblclick.drag', null)
        //     .on('touchstart.drag', null)
        //     .on('touchmove.drag', null)
        //     .on('touchend.drag', null)
        //     .on('wheel.drag', null);
        // scrollTarget
        //     .on('mousedown.drag', null)
        //     .on('mousewheel.drag', null)
        //     .on('mousemove.drag', null)
        //     .on('DOMMouseScroll.drag', null)
        //     .on('dblclick.drag', null)
        //     .on('touchstart.drag', null)
        //     .on('touchmove.drag', null)
        //     .on('touchend.drag', null)
        //     .on('wheel.drag', null);
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
      g_entr.select('.sc-scroll-background')
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
      var backShadows_entr = g_entr.select('.sc-scroll-background')
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
      var foreShadows_entr = g_entr.select('.sc-scroll-background')
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
      animate = true,
      getX = function (d) { return d.x; },
      getY = function (d) { return d.y; },
      strings = {
        legend: {close: 'Hide legend', open: 'Show legend'},
        controls: {close: 'Hide controls', open: 'Show controls'},
        noData: 'No Data Available.',
        noLabel: 'undefined'
      },
      color = utility.getColor(['#000']);

  //============================================================


  function chart(selection) {
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

      var labels = properties.labels ||
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
        return utility.displayNoData(hasData, container, chart.strings().noData, x, y);
      }
      // Check to see if there's nothing to show.
      if (displayNoData(data)) {
        return chart;
      }
      //------------------------------------------------------------
      // Setup containers and skeleton of chart

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

    return chart;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.margin = function (_) {
    if (!arguments.length) return margin;
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
    return chart;
  };

  chart.width = function (_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  chart.height = function (_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
  };

  chart.x = function (_) {
    if (!arguments.length) return getX;
    getX = utility.functor(_);
    return chart;
  };

  chart.y = function (_) {
    if (!arguments.length) return getY;
    getY = utility.functor(_);
    return chart;
  };

  chart.strings = function (_) {
    if (!arguments.length) {
      return strings;
    }
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        strings[prop] = _[prop];
      }
    }
    return chart;
  };

  chart.color = function (_) {
    if (!arguments.length) return color;
    color = utility.getColor(_);
    return chart;
  };

  //============================================================


  return chart;
}

function treemap() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 20, right: 0, bottom: 0, left: 0},
      width = 0,
      height = 0,
      x = d3.scaleLinear(), //can be accessed via chart.xScale()
      y = d3.scaleLinear(), //can be accessed via chart.yScale()
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID incase user doesn't select one
      getValue = function(d) { return d.size; }, // accessor to get the size value from a data point
      getKey = function(d) { return d.name; }, // accessor to get the name value from a data point
      groupBy = function(d) { return getKey(d); }, // accessor to get the name value from a data point
      clipEdge = true, // if true, masks lines within x and y scale
      duration = 500,
      leafClick = function() { return false; },
      // color = function(d, i) { return utility.defaultColor()(d, i); },
      color = d3.scaleOrdinal().range(
                d3.schemeCategory20.map(function(c) {
                  c = d3.rgb(c);
                  c.opacity = 0.6;
                  return c;
                })
              ),
      gradient = null,
      fill = color,
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
    var name = groupBy(data);
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

  function chart(selection) {
    selection.each(function(chartData) {

      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          container = d3.select(this),
          transitioning;

      // Set up the gradient constructor function
      gradient = function(d, i, p) {
        var iColor = (d.parent.data.colorIndex || NODES.indexOf(groupBy(d.parent.data)) || i);
        return utility.colorLinearGradient(
          d,
          id + '-' + i,
          p,
          color(d, iColor, NODES.length),
          wrap.select('defs')
        );
      };

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
        .round(false)
          (TREE);

      // We store the root on first render
      // which gets reused on resize
      // Transition will reset root when called
      ROOT = ROOT || TREE;

      x.domain([ROOT.x0, ROOT.x1])
       .range([0, availableWidth]);
      y.domain([ROOT.y0, ROOT.y1])
       .range([0, availableHeight]);

      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap_bind = container.selectAll('g.sc-wrap.sc-treemap').data([TREE]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-wrap sc-treemap');
      var wrap = container.select('.sc-wrap.sc-treemap').merge(wrap_entr);

      var defs_entr = wrap_entr.append('defs');

      // wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      //------------------------------------------------------------
      // Clip Path

      defs_entr.append('clipPath')
        .attr('id', 'sc-edge-clip-' + id)
        .append('rect');
      wrap.select('#sc-edge-clip-' + id + ' rect')
        .attr('width', width)
        .attr('height', height);
      wrap.attr('clip-path', clipEdge ? 'url(#sc-edge-clip-' + id + ')' : '');

      //------------------------------------------------------------
      // Family Tree Path

      var treepath_bind = wrap_entr.selectAll('.sc-treepath').data([TREE]);
      var treepath_enter = treepath_bind.enter().append('g').attr('class', 'sc-treepath');
      var treepath = wrap.selectAll('.sc-treepath').merge(treepath_enter);

      treepath_enter.append('rect')
        .attr('class', 'sc-target')
        .on('click', transition);

      treepath_enter.append('text')
        .attr('x', direction === 'rtl' ? width - 6 : 6)
        .attr('y', 6)
        .attr('dy', '.75em');

      treepath.select('.sc-target')
        .attr('width', width)
        .attr('height', margin.top);

      //------------------------------------------------------------
      // Main Chart

      var gold = render();

      function render() {

        var grandparent_bind = wrap.selectAll('.sc-grandparent.sc-trans').data([ROOT]);
        var grandparent_entr = grandparent_bind.enter().append('g').attr('class', 'sc-grandparent sc-trans');
        var grandparent = wrap.selectAll('.sc-grandparent.sc-trans').merge(grandparent_entr);
        // We need to keep the old granparent around until transition ends
        // grandparent.exit().remove();

        grandparent
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
          .lower();

        // Parent group
        var parents_bind = grandparent.selectAll('g.sc-parent').data(ROOT.children);
        var parents_entr = parents_bind.enter().append('g').classed('sc-parent', true);
        var parents = grandparent.selectAll('.sc-parent').merge(parents_entr);
        parents_bind.exit().remove();

        // Child rectangles
        var children_bind = parents.selectAll('rect.sc-child').data(function(d) { return d.children || [d]; });
        var children_entr = children_bind.enter().append('rect').attr('class', 'sc-child');
        var children = parents.selectAll('.sc-child').merge(children_entr);
        children_bind.exit().remove();

        children
          .attr('class', classes)
          .attr('fill', function(d, i) {
            // while (d.depth > 1) {
            //   d = d.parent;
            // }
            // return color(groupBy(d));
            var iColor = (d.parent.data.colorIndex || NODES.indexOf(getKey(d.parent.data)) || i);
            return this.getAttribute('fill') || fill(d, iColor, NODES.length);
          })
            .call(rect);

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
            .data([ROOT.parent]);

        // -------------
        // Assign Events

        // Assign transition event for parents with children.
        target
          .filter(function(d) { return d.children; })
          .on('click', transition);

        // Assign navigate event for parents without children (leaves).
        target
          .filter(function(d) { return !(d.children); })
          .on('click', leafClick);

        // Tooltips
        target
          .on('mouseover', function(d, i) {
            d3.select(this).classed('hover', true);
            var eo = {
              point: d,
              pointIndex: i,
              id: id,
              e: d3.event
            };
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
            var eo = {
                label: getKey(d),
                value: getValue(d),
                point: d,
                pointIndex: i,
                e: d3.event,
                id: id
            };
            dispatch.call('elementMouseover', this, eo);
          })
          .on('mouseout', function(d, i) {
            d3.select(this).classed('hover', false);
            dispatch.call('elementMouseout', this);
          });

        return grandparent;
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

    return chart;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;

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
  chart.classes = function(_) {
    if (!arguments.length) { return classes; }
    classes = _;
    return chart;
  };
  chart.gradient = function(_) {
    if (!arguments.length) { return gradient; }
    gradient = _;
    return chart;
  };

  chart.x = function(_) {
    if (!arguments.length) { return getX; }
    getX = _;
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) { return getY; }
    getY = _;
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) { return margin; }
    margin.top    = typeof _.top    !== 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  !== 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom !== 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   !== 'undefined' ? _.left   : margin.left;
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

  chart.xScale = function(_) {
    if (!arguments.length) { return x; }
    x = _;
    return chart;
  };

  chart.yScale = function(_) {
    if (!arguments.length) { return y; }
    y = _;
    return chart;
  };

  chart.xDomain = function(_) {
    if (!arguments.length) { return xDomain; }
    xDomain = _;
    return chart;
  };

  chart.yDomain = function(_) {
    if (!arguments.length) { return yDomain; }
    yDomain = _;
    return chart;
  };

  chart.leafClick = function(_) {
    if (!arguments.length) { return leafClick; }
    leafClick = _;
    return chart;
  };

  chart.getValue = function(_) {
    if (!arguments.length) { return getValue; }
    getValue = _;
    return chart;
  };

  chart.getKey = function(_) {
    if (!arguments.length) { return getKey; }
    getKey = _;
    return chart;
  };

  chart.groupBy = function(_) {
    if (!arguments.length) { return groupBy; }
    groupBy = _;
    return chart;
  };

  chart.groups = function(_) {
    if (!arguments.length) { return NODES; }
    NODES = _;
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) { return duration; }
    duration = _;
    return chart;
  };

  chart.id = function(_) {
    if (!arguments.length) { return id; }
    id = _;
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) {
      return direction;
    }
    direction = _;
    return chart;
  };

  //============================================================


  return chart;
}

/*-------------------
       MODELS
-------------------*/

const models = {
    area: stackearea,
    axis: axis,
    funnel: funnel,
    gauge: gauge,
    line: line,
    menu: menu,
    multibar: multibar,
    pie: pie,
    scatter: scatter,
    scroller: scroller,
    table: table,
    treemap: treemap,
};

function stackeareaChart() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 10, right: 10, bottom: 10, left: 10},
      width = null,
      height = null,
      showTitle = false,
      showControls = false,
      showLegend = true,
      direction = 'ltr',
      delay = 0,
      duration = 0,
      tooltips = true,
      guidetips = null,
      x,
      y,
      state = {},
      strings = {
        legend: {close: 'Hide legend', open: 'Show legend'},
        controls: {close: 'Hide controls', open: 'Show controls'},
        noData: 'No Data Available.',
        noLabel: 'undefined'
      },
      pointRadius = 3,
      dispatch = d3.dispatch('chartClick', 'tooltipShow', 'tooltipHide', 'tooltipMove', 'stateChange', 'changeState');

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var model = stackearea()
        .clipEdge(true),
      xAxis = axis(),
      yAxis = axis(),
      legend = menu()
        .align('right'),
      controls = menu()
        .align('left')
        .color(['#444']),
      guide = line().duration(0);

  var tt = null;

  var tooltipContent = function(key, x, y, e, graph) {
        return '<p>' + key + ': ' + y + '</p>';
      };

  //============================================================

  function chart(selection) {

    selection.each(function(chartData) {

      var that = this,
          container = d3.select(this),
          modelClass = 'area';

      var properties = chartData ? chartData.properties : {},
          data = chartData ? chartData.data : null,
          labels = properties.labels ? properties.labels.map(function(d) { return d.l || d; }) : [];

      var containerWidth = parseInt(container.style('width'), 10),
          containerHeight = parseInt(container.style('height'), 10);

      var modelData = [],
          xTickLabels = [],
          totalAmount = 0,
          singlePoint = false,
          showMaxMin = false,
          isArrayData = true,
          xIsDatetime = chartData.properties.xDataType === 'datetime' || false,
          yIsCurrency = chartData.properties.yDataType === 'currency' || false;

      var xValueFormat = function(d, i, selection, noEllipsis) {
            var label = xIsDatetime ?
                          utility.dateFormat(d, 'yMMMM', chart.locality()) :
                          isNaN(parseInt(d, 10)) || !xTickLabels || !Array.isArray(xTickLabels) ?
                            d :
                            xTickLabels[parseInt(d, 10)];
            return label;
          };

      var yValueFormat = function(d) {
            return utility.numberFormatSI(d, 2, yIsCurrency, chart.locality());
          };

      chart.update = function() {
        container.transition().duration(duration).call(chart);
      };

      chart.container = this;

      //------------------------------------------------------------
      // Private method for displaying no data message.

      function displayNoData(d) {
        var hasData = d && d.length && d.filter(function(d) { return d.values && d.values.length; }).length,
            x = (containerWidth - margin.left - margin.right) / 2 + margin.left,
            y = (containerHeight - margin.top - margin.bottom) / 2 + margin.top;
        return utility.displayNoData(hasData, container, chart.strings().noData, x, y);
      }

      // Check to see if there's nothing to show.
      if (displayNoData(data)) {
        return chart;
      }

      //------------------------------------------------------------
      // Process data

      isArrayData = Array.isArray(data[0].values[0]);
      if (isArrayData) {
        model.x(function(d) { return d ? d[0] : 0; });
        model.y(function(d) { return d ? d[1] : 0; });
      } else {
        model.x(function(d) { return d.x; });
        model.y(function(d) { return d.y; });
      }

      // set title display option
      showTitle = showTitle && properties.title;

      // add series index to each data point for reference
      // and disable data series if total is zero
      data.map(function(d, i) {
        d.seriesIndex = i;
        d.total = d3.sum(d.values, function(d, i) {
          return model.y()(d, i);
        });
        if (!d.total) {
          d.disabled = true;
        }
      });

      xTickLabels = properties.labels ?
          properties.labels.map(function(d) { return [].concat(d.l)[0] || chart.strings().noLabel; }) :
          [];

      // TODO: what if the dimension is a numerical range?
      // xValuesAreDates = xTickLabels.length ?
      //       utility.isValidDate(xTickLabels[0]) :
      //       utility.isValidDate(model.x()(data[0].values[0]));
      // xValuesAreDates = isArrayData && utility.isValidDate(data[0].values[0][0]);

      // SAVE FOR LATER
      // isOrdinalSeries = !xValuesAreDates && labels.length > 0 && d3.min(modelData, function(d) {
      //   return d3.min(d.values, function(d, i) {
      //     return model.x()(d, i);
      //   });
      // }) > 0;

      modelData = data.filter(function(d) {
          return !d.disabled;
        });

      // safety array
      modelData = modelData.length ? modelData : [{series: 0, total: 0, disabled: true, values: []}];

      totalAmount = d3.sum(modelData, function(d) {
          return d.total;
        });

      //------------------------------------------------------------
      // Display No Data message if there's nothing to show.

      if (!totalAmount) {
        displayNoData();
        return chart;
      }

      // set state.disabled
      state.disabled = modelData.map(function(d) { return !!d.disabled; });
      state.style = model.style();

      var controlsData = [
        { key: 'Stacked', disabled: model.offset() !== 'zero' },
        { key: 'Stream', disabled: model.offset() !== 'wiggle' },
        { key: 'Expanded', disabled: model.offset() !== 'expand' }
      ];

      //------------------------------------------------------------
      // Setup Scales and Axes

      model
        .id(chart.id())
        .xDomain(null)  //?why null?
        .yDomain(null)
        .xScale(xIsDatetime ? d3.scaleTime() : d3.scaleLinear());

      x = model.xScale();
      y = model.yScale();

      xAxis
        .orient('bottom')
        .ticks(null)
        .tickValues(null)
        .showMaxMin(xIsDatetime)
        .highlightZero(false)
        .scale(x)
        .tickPadding(6)
        .valueFormat(xValueFormat);
      yAxis
        .orient('left')
        .ticks(null)
        .showMaxMin(true)
        .highlightZero(true)
        .scale(y)
        .tickPadding(6)
        .valueFormat(yValueFormat);

      guide
        .id(chart.id())
        .useVoronoi(false)
        .clipEdge(false)
        .xScale(x)
        .yScale(y);

      //------------------------------------------------------------
      // Main chart wrappers

      var wrap_bind = container.selectAll('g.sc-chart-wrap').data([modelData]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-chart-wrap sc-chart-' + modelClass);
      var wrap = container.select('.sc-chart-wrap').merge(wrap_entr);

      wrap_entr.append('rect').attr('class', 'sc-background')
        .attr('x', -margin.left)
        .attr('y', -margin.top)
        .attr('fill', '#FFF');

      wrap_entr.append('g').attr('class', 'sc-title-wrap');
      var title_wrap = wrap.select('.sc-title-wrap');

      wrap_entr.append('g').attr('class', 'sc-axis-wrap sc-axis-x');
      var xAxis_wrap = wrap.select('.sc-axis-wrap.sc-axis-x');
      wrap_entr.append('g').attr('class', 'sc-axis-wrap sc-axis-y');
      var yAxis_wrap = wrap.select('.sc-axis-wrap.sc-axis-y');

      wrap_entr.append('g').attr('class', 'sc-' + modelClass + '-wrap');
      var model_wrap = wrap.select('.sc-' + modelClass + '-wrap');

      wrap_entr.append('g').attr('class', 'sc-controls-wrap');
      var controls_wrap = wrap.select('.sc-controls-wrap');
      wrap_entr.append('g').attr('class', 'sc-legend-wrap');
      var legend_wrap = wrap.select('.sc-legend-wrap');

      wrap_entr.append('g').attr('class', 'sc-guide-wrap');
      var guide_wrap = wrap.select('.sc-guide-wrap');

      //------------------------------------------------------------
      // Main chart draw

      chart.render = function() {

        // Chart layout variables
        var renderWidth, renderHeight,
            availableWidth, availableHeight,
            innerMargin,
            innerWidth, innerHeight;

        containerWidth = parseInt(container.style('width'), 10);
        containerHeight = parseInt(container.style('height'), 10);

        renderWidth = width || containerWidth || 960;
        renderHeight = height || containerHeight || 400;

        availableWidth = renderWidth - margin.left - margin.right;
        availableHeight = renderHeight - margin.top - margin.bottom;

        innerMargin = {top: 0, right: 0, bottom: 0, left: 0};
        innerWidth = availableWidth - innerMargin.left - innerMargin.right;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;

        wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        wrap.select('.sc-background')
          .attr('width', renderWidth)
          .attr('height', renderHeight);

        //------------------------------------------------------------
        // Title & Legend & Controls

        // Header variables
        var maxControlsWidth = 0,
            maxLegendWidth = 0,
            widthRatio = 0,
            headerHeight = 0,
            titleBBox = {width: 0, height: 0},
            controlsHeight = 0,
            legendHeight = 0,
            trans = '';

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

        if (showControls) {
          controls
            .id('controls_' + chart.id())
            .strings(chart.strings().controls)
            .align('left')
            .height(availableHeight - headerHeight);
          controls_wrap
            .datum(controlsData)
            .call(controls);

          maxControlsWidth = controls.calcMaxWidth();
        }
        if (showLegend) {
          legend
            .id('legend_' + chart.id())
            .strings(chart.strings().legend)
            .align('right')
            .height(availableHeight - headerHeight);
          legend_wrap
            .datum(data)
            .call(legend);

          maxLegendWidth = legend.calcMaxWidth();
        }

        // calculate proportional available space
        widthRatio = availableWidth / (maxControlsWidth + maxLegendWidth);
        maxControlsWidth = Math.floor(maxControlsWidth * widthRatio);
        maxLegendWidth = Math.floor(maxLegendWidth * widthRatio);

        if (showControls) {
          controls
            .arrange(maxControlsWidth);
          maxLegendWidth = availableWidth - controls.width();
        }
        if (showLegend) {
          legend
            .arrange(maxLegendWidth);
          maxControlsWidth = availableWidth - legend.width();
        }

        if (showControls) {
          var xpos = direction === 'rtl' ? availableWidth - controls.width() : 0,
              ypos = showTitle ? titleBBox.height : - controls.margin().top;
          controls_wrap
            .attr('transform', 'translate(' + xpos + ',' + ypos + ')');
          controlsHeight = controls.height();
        }
        if (showLegend) {
          var legendLinkBBox = utility.getTextBBox(legend_wrap.select('.sc-menu-link')),
              legendSpace = availableWidth - titleBBox.width - 6,
              legendTop = showTitle && !showControls && legend.collapsed() && legendSpace > legendLinkBBox.width ? true : false,
              xpos = direction === 'rtl' ? 0 : availableWidth - legend.width(),
              ypos = titleBBox.height;
          if (legendTop) {
            ypos = titleBBox.height - legend.height() / 2 - legendLinkBBox.height / 2;
          } else if (!showTitle) {
            ypos = - legend.margin().top;
          }
          legend_wrap
            .attr('transform', 'translate(' + xpos + ',' + ypos + ')');
          legendHeight = legendTop ? 12 : legend.height();
        }

        // Recalc inner margins based on legend and control height
        headerHeight += Math.max(controlsHeight, legendHeight);
        innerHeight = availableHeight - headerHeight - innerMargin.top - innerMargin.bottom;

        //------------------------------------------------------------
        // Main Chart Component(s)

        model
          .width(innerWidth)
          .height(innerHeight);
        model_wrap
          .datum(modelData)
          .call(model);

        //------------------------------------------------------------
        // Axes

        var yAxisMargin = {top: 0, right: 0, bottom: 0, left: 0},
            xAxisMargin = {top: 0, right: 0, bottom: 0, left: 0};

        function setInnerMargins() {
          innerMargin.left = Math.max(xAxisMargin.left, yAxisMargin.left);
          innerMargin.right = Math.max(xAxisMargin.right, yAxisMargin.right);
          innerMargin.top = Math.max(xAxisMargin.top, yAxisMargin.top);
          innerMargin.bottom = Math.max(xAxisMargin.bottom, yAxisMargin.bottom);
        }

        function setInnerDimensions() {
          innerWidth = availableWidth - innerMargin.left - innerMargin.right;
          innerHeight = availableHeight - headerHeight - innerMargin.top - innerMargin.bottom;
          // Recalc chart dimensions and scales based on new inner dimensions
          model.width(innerWidth).height(innerHeight);
          // This resets the scales for the whole chart
          // unfortunately we can't call this without until line instance is called
          // model.scatter.resetDimensions(innerWidth, innerHeight);
          x.range([0, innerWidth]);
          y.range([innerHeight, 0]);
        }

        // Y-Axis
        yAxis
          .margin(innerMargin)
          .tickFormat(function(d, i) {
            return yAxis.valueFormat()(d, yIsCurrency);
          });
        yAxis_wrap
          .call(yAxis);
        // reset inner dimensions
        yAxisMargin = yAxis.margin();
        setInnerMargins();
        setInnerDimensions();

        // X-Axis
        // resize ticks based on new dimensions
        xAxis
          .tickSize(-innerHeight, 0)
          .margin(innerMargin)
          .tickFormat(function(d, i, noEllipsis) {
            return xAxis.valueFormat()(d - !isArrayData, xTickLabels, xIsDatetime);
          });
        xAxis_wrap
          .call(xAxis);
        xAxisMargin = xAxis.margin();
        setInnerMargins();
        setInnerDimensions();
        // xAxis
        //  .resizeTickLines(-innerHeight);

        // recall y-axis, x-axis and lines to set final size based on new dimensions
        yAxis
          .ticks(model.offset() === 'wiggle' ? 0 : null)
          .tickSize(-innerWidth, 0)
          .margin(innerMargin);
        yAxis_wrap
          .call(yAxis);

        xAxis
          .tickSize(-innerHeight, 0)
          .margin(innerMargin);
        xAxis_wrap
          .call(xAxis);

        model
          .width(innerWidth)
          .height(innerHeight);
        model_wrap
          .datum(modelData)
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

        chart.showTooltip = function(eo, offsetElement) {
          var key = eo.seriesKey,
              x = xValueFormat(model.x()(eo)),
              y = yValueFormat(model.y()(eo)),
              content = tooltipContent(key, x, y, eo, chart);
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
              guidetips[i] = chart.showTooltip(d, that.parentNode);
            });
            guidetips['x'] = chart.showTooltip(xData, that.parentNode);
          }

          // Line
          eo.data.forEach(function(d, i) {
            var key = d.seriesKey,
                xval = xValueFormat(model.x()(d)),
                yval = yValueFormat(model.y()(d)),
                content = tooltipContent(key, xval, yval, d, chart);
            guidePos.clientY = eo.origin.top + y(d[1]);
            d3.select(guidetips[i]).select('.tooltip-inner').html(content);
            tooltip.position(that.parentNode, guidetips[i], guidePos, 'e');
          });

          // Top date
          xData.forEach(function(d, i) {
            var xval = xValueFormat(xpos);
            guidePos.clientY = eo.origin.top;
            d3.select(guidetips['x']).select('.tooltip-inner').html(xval);
            tooltip.position(that.parentNode, guidetips['x'], guidePos, 's');
          });

        };

        //------------------------------------------------------------
        // Final repositioning

        innerMargin.top += headerHeight;

        trans = innerMargin.left + ',';
        trans += innerMargin.top + (xAxis.orient() === 'bottom' ? innerHeight : 0);
        xAxis_wrap
          .attr('transform', 'translate(' + trans + ')');

        trans = innerMargin.left + (yAxis.orient() === 'left' ? 0 : innerWidth) + ',';
        trans += innerMargin.top;
        yAxis_wrap
          .attr('transform', 'translate(' + trans + ')');

        trans = innerMargin.left + ',' + innerMargin.top;
        model_wrap
          .attr('transform', 'translate(' + trans + ')');
        guide_wrap
          .attr('transform', 'translate(' + trans + ')');

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

      };

      //============================================================

      chart.render();

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

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
        dispatch.call('stateChange', this, state);
        dispatch.call('tooltipHide', this);

        container.transition().duration(duration).call(chart);
      });

      legend.dispatch.on('legendClick', function(d, i) {
        d.disabled = !d.disabled;

        if (!data.filter(function(d) { return !d.disabled; }).length) {
          data.map(function(d) {
            d.disabled = false;
            container.selectAll('.sc-series').classed('disabled', false);
            return d;
          });
        }

        state.disabled = data.map(function(d) { return !!d.disabled; });
        dispatch.call('stateChange', this, state);

        container.transition().duration(duration).call(chart);
      });

      controls.dispatch.on('legendClick', function(d, i) {
        //if the option is currently enabled (i.e., selected)
        if (!d.disabled) {
          return;
        }

        //set the controls all to false
        controlsData = controlsData.map(function(s) {
          s.disabled = true;
          return s;
        });
        //activate the the selected control option
        d.disabled = false;

        switch (d.key) {
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
        dispatch.call('stateChange', this, state);

        container.transition().duration(duration).call(chart);
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

        container.transition().duration(duration).call(chart);
      });

      dispatch.on('chartClick', function() {
        if (controls.enabled()) {
          controls.dispatch.call('closeMenu', this);
        }
        if (legend.enabled()) {
          legend.dispatch.call('closeMenu', this);
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
  chart.stacked = model;
  chart.legend = legend;
  chart.controls = controls;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  fc.rebind(chart, model, 'id', 'x', 'y', 'xScale', 'yScale', 'xDomain', 'yDomain', 'forceX', 'forceY', 'clipEdge', 'delay', 'color', 'fill', 'classes', 'gradient', 'locality');
  fc.rebind(chart, model, 'offset', 'order', 'style');
  fc.rebind(chart, xAxis, 'rotateTicks', 'reduceXTicks', 'staggerTicks', 'wrapTicks');

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

    var fill = (!params.gradient) ? color : function(d, i) {
      var p = {orientation: params.orientation || 'horizontal', position: params.position || 'base'};
      return model.gradient()(d, d.seriesIndex, p);
    };

    model.color(color);
    model.fill(fill);
    model.classes(classes);

    // don't enable this since controls get a custom function
    // controls.color(color);
    // controls.classes(classes);
    legend.color(color);
    legend.classes(classes);

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

  chart.showControls = function(_) {
    if (!arguments.length) { return showControls; }
    showControls = _;
    return chart;
  };

  chart.showLegend = function(_) {
    if (!arguments.length) { return showLegend; }
    showLegend = _;
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
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        strings[prop] = _[prop];
      }
    }
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    xAxis.direction(_);
    yAxis.direction(_);
    legend.direction(_);
    controls.direction(_);
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

function bubbleChart() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 10, right: 10, bottom: 10, left: 10},
      width = null,
      height = null,
      showTitle = false,
      showControls = false,
      showLegend = true,
      direction = 'ltr',
      getX = function(d) { return d.x; },
      getY = function(d) { return d.y; },
      forceY = [0], // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do chart.forceY([]) to remove
      xDomain,
      yDomain,
      delay = 200,
      duration = 0,
      groupBy = function(d) { return d.y; },
      filterBy = function(d) { return d.y; },
      clipEdge = false, // if true, masks lines within x and y scale
      seriesLength = 0,
      reduceYTicks = false, // if false a tick will show for every data point
      format = d3.timeFormat('%Y-%m-%d'),
      tooltips = true,
      x,
      y,
      state = {},
      strings = {
        legend: {close: 'Hide legend', open: 'Show legend'},
        controls: {close: 'Hide controls', open: 'Show controls'},
        noData: 'No Data Available.',
        noLabel: 'undefined'
      },
      dispatch = d3.dispatch('chartClick', 'elementClick', 'tooltipShow', 'tooltipHide', 'tooltipMove', 'stateChange', 'changeState');

  var xValueFormat = function(d, i, label, isDate) {
        return isDate ?
          utility.dateFormat(label, 'MMM', chart.locality()) :
          label;
      };

  var yValueFormat = function(d, i, label, isCurrency) {
        var precision = 2;
        return utility.numberFormatSI(label, precision, isCurrency, chart.locality());
      };

  //============================================================
  // Private Variables
  //------------------------------------------------------------


  var model = scatter()
        .padData(true)
        .padDataOuter(-1)
        .size(function(d) { return d.y; })
        .sizeRange([256, 1024])
        .singlePoint(true),
      xAxis = axis(),
      yAxis = axis(),
      legend = menu()
        .align('center')
        .key(function(d) { return d.key + '%'; });

  var tt = null;

  var tooltipContent = function(key, x, y, e, graph) {
        return '<h3>' + key + '</h3>' +
               '<p>' + y + ' on ' + x + '</p>';
      };

  var showTooltip = function(eo, offsetElement, properties) {
    var key = eo.series.key,
        x = eo.point.x,
        y = eo.point.y,
        content = tooltipContent(key, x, y, eo, chart),
        gravity = eo.value < 0 ? 'n' : 's';

    return tooltip.show(eo.e, content, gravity, null, offsetElement);
  };

  var seriesClick = function(data, e, chart) { return; };

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
          timeExtent,
          xD,
          yD,
          yValues;

      var xAxisValueFormat = function(d, i, selection, noEllipsis) {
            return xValueFormat(d, i, d, xIsDatetime);
          };

      var yAxisValueFormat = function(d, i, selection, noEllipsis) {
            var label = yValues && Array.isArray(yValues) ?
                  yValues[i].key || d :
                  d;
            var width = Math.max(availableWidth * 0.2, 75);

            return isNaN(label) ?
              utility.stringEllipsify(label, container, width) :
              yValueFormat(d, i, label, yIsCurrency);
          };

      chart.update = function() {
        container.transition().duration(duration).call(chart);
      };

      chart.container = this;

      //------------------------------------------------------------
      // Private method for displaying no data message.

      function displayNoData(d) {
        var hasData = d && d.length,
            x = (containerWidth - margin.left - margin.right) / 2 + margin.left,
            y = (containerHeight - margin.top - margin.bottom) / 2 + margin.top;
        return utility.displayNoData(hasData, container, chart.strings().noData, x, y);
      }

      // Check to see if there's nothing to show.
      if (displayNoData(data)) {
        return chart;
      }

      //------------------------------------------------------------
      // Process data

      // set title display option
      showTitle = showTitle && properties.title;

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
            gOffset = gHeight * 0.25,
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
      var nestedData = d3.nest()
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

      xD = getTimeDomain(modelData);

      yValues = getGroupTicks(data);

      yD = d3.extent(
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

      x = model.xScale();
      y = model.yScale();

      xAxis
        .orient('bottom')
        .scale(x)
        .valueFormat(xAxisValueFormat)
        .ticks(d3.timeMonths, 1)
        .tickValues(getTimeTicks(xD))
        .tickSize(0)
        .tickPadding(4)
        .highlightZero(false)
        .showMaxMin(false);
      yAxis
        .orient('left')
        .scale(y)
        .valueFormat(yAxisValueFormat)
        .ticks(yValues.length)
        .tickValues(yValues.map(function(d, i) {
          return yValues[i].y;
        }))
        .tickPadding(7)
        .highlightZero(false)
        .showMaxMin(false);

      //------------------------------------------------------------
      // Main chart draw

      chart.render = function() {

        // Chart layout variables
        var renderWidth, renderHeight,
            innerMargin,
            innerWidth, innerHeight;

        containerWidth = parseInt(container.style('width'), 10);
        containerHeight = parseInt(container.style('height'), 10);

        renderWidth = width || containerWidth || 960;
        renderHeight = height || containerHeight || 400;

        availableWidth = renderWidth - margin.left - margin.right;
        availableHeight = renderHeight - margin.top - margin.bottom;

        innerMargin = {top: 0, right: 0, bottom: 0, left: 0};
        innerWidth = availableWidth - innerMargin.left - innerMargin.right;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;

        // Header variables
        var maxBubbleSize = Math.sqrt(model.sizeRange()[1] / Math.PI),
            headerHeight = 0,
            titleBBox = {width: 0, height: 0},
            legendHeight = 0,
            trans = '';

        //------------------------------------------------------------
        // Setup containers and skeleton of chart

        var wrap_bind = container.selectAll('g.sc-chart-wrap').data([modelData]);
        var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-chart-wrap sc-chart-' + modelClass);
        var wrap = container.select('.sc-chart-wrap').merge(wrap_entr);

        wrap_entr.append('rect').attr('class', 'sc-background')
          .attr('x', -margin.left)
          .attr('y', -margin.top)
          .attr('fill', '#FFF');

        wrap.select('.sc-background')
          .attr('width', renderWidth)
          .attr('height', renderHeight);

        wrap_entr.append('g').attr('class', 'sc-title-wrap');
        var title_wrap = wrap.select('.sc-title-wrap');

        wrap_entr.append('g').attr('class', 'sc-axis-wrap sc-axis-x');
        var xAxis_wrap = wrap.select('.sc-axis-wrap.sc-axis-x');

        wrap_entr.append('g').attr('class', 'sc-axis-wrap sc-axis-y');
        var yAxis_wrap = wrap.select('.sc-axis-wrap.sc-axis-y');

        wrap_entr.append('g').attr('class', 'sc-' + modelClass + '-wrap');
        var model_wrap = wrap.select('.sc-' + modelClass + '-wrap');

        wrap_entr.append('g').attr('class', 'sc-legend-wrap');
        var legend_wrap = wrap.select('.sc-legend-wrap');

        wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        //------------------------------------------------------------
        // Title & Legend

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
          legend
            .id('legend_' + chart.id())
            .strings(chart.strings().legend)
            .align('center')
            .height(availableHeight - headerHeight);
          legend_wrap
            .datum(modelData)
            .call(legend);
          legend
            .arrange(availableWidth);

          var legendLinkBBox = utility.getTextBBox(legend_wrap.select('.sc-menu-link')),
              legendSpace = availableWidth - titleBBox.width - 6,
              legendTop = showTitle && legend.collapsed() && legendSpace > legendLinkBBox.width ? true : false,
              xpos = direction === 'rtl' || !legend.collapsed() ? 0 : availableWidth - legend.width(),
              ypos = titleBBox.height;

          if (legendTop) {
            ypos = titleBBox.height - legend.height() / 2 - legendLinkBBox.height / 2;
          } else if (!showTitle) {
            ypos = - legend.margin().top;
          }

          legend_wrap
            .attr('transform', 'translate(' + xpos + ',' + ypos + ')');

          headerHeight += legendTop ? 12 : legend.height();
        }

        // Recalc inner margins based on legend and control height
        innerHeight = availableHeight - headerHeight - innerMargin.top - innerMargin.bottom;

        //------------------------------------------------------------
        // Main Chart Components

        model
          .width(innerWidth)
          .height(innerHeight)
          .id(chart.id())
          .xDomain(xD)
          .yDomain(yD);

        model_wrap
          .datum(modelData.filter(function(d) {
            return !d.disabled;
          }))
          .transition().duration(duration)
            .call(model);

        innerMargin.top += maxBubbleSize;

        //------------------------------------------------------------
        // Setup Axes

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

        // recall y-axis to set final size based on new dimensions
        yAxis
          .tickSize(-innerWidth, 0)
          .margin(innerMargin);
        yAxis_wrap
          .call(yAxis);
        yAxis_wrap.select('path.domain')
          .attr('d', "M0,0V0.5H0V" + innerHeight);

        // final call to lines based on new dimensions
        model_wrap
          .transition().duration(chart.delay())
            .call(model);

        //------------------------------------------------------------
        // Final repositioning

        trans = innerMargin.left + ',';
        trans += innerMargin.top + (xAxis.orient() === 'bottom' ? innerHeight : 0);
        xAxis_wrap
          .attr('transform', 'translate(' + trans + ')');

        trans = innerMargin.left + (yAxis.orient() === 'left' ? 0 : innerWidth) + ',';
        trans += innerMargin.top;
        yAxis_wrap
          .attr('transform', 'translate(' + trans + ')');

        model_wrap
          .attr('transform', 'translate(' + innerMargin.left + ',' + innerMargin.top + ')');

      };

      //============================================================

      chart.render();

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      legend.dispatch.on('legendClick', function(d, i) {
        d.disabled = !d.disabled;

        if (!modelData.filter(function(d) { return !d.disabled; }).length) {
          modelData.map(function(d) {
            d.disabled = false;
            container.selectAll('.sc-series').classed('disabled', false);
            return d;
          });
        }

        state.disabled = modelData.map(function(d) { return !!d.disabled; });
        dispatch.call('stateChange', this, state);

        container.transition().call(chart.render);
      });

      dispatch.on('tooltipShow', function(eo) {
        if (tooltips) {
          tt = showTooltip(eo, that.parentNode);
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

        container.transition().call(chart);
      });

      dispatch.on('chartClick', function() {
        dispatch.call('tooltipHide', this);
        if (legend.enabled()) {
          legend.dispatch.call('closeMenu', this);
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
  chart.scatter = model;
  chart.legend = legend;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  fc.rebind(chart, model, 'id', 'x', 'y', 'xScale', 'yScale', 'xDomain', 'yDomain', 'forceX', 'forceY', 'clipEdge', 'color', 'fill', 'classes', 'gradient', 'locality');
  fc.rebind(chart, model, 'size', 'zScale', 'sizeDomain', 'forceSize', 'interactive', 'clipVoronoi', 'clipRadius');
  fc.rebind(chart, xAxis, 'rotateTicks', 'reduceXTicks', 'staggerTicks', 'wrapTicks');

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
          return 'sc-series sc-series-' + d.seriesIndex + ' sc-fill' + iClass;
        };
        break;
      case 'data':
        color = function(d, i) {
          return d.classes ? 'inherit' : d.color || utility.defaultColor()(d, d.seriesIndex);
        };
        classes = function(d, i) {
          return 'sc-series sc-series-' + d.seriesIndex + (d.classes ? ' ' + d.classes : '');
        };
        break;
    }

    var fill = (!params.gradient) ? color : function(d, i) {
      return model.gradient()(d, d.seriesIndex);
    };

    model.color(color);
    model.fill(fill);
    model.classes(classes);

    legend.color(color);
    legend.classes(classes);

    return chart;
  };

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
    if (!arguments.length) {
      return width;
    }
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) {
      return height;
    }
    height = _;
    return chart;
  };

  chart.showTitle = function(_) {
    if (!arguments.length) {
      return showTitle;
    }
    showTitle = _;
    return chart;
  };

  chart.showLegend = function(_) {
    if (!arguments.length) {
      return showLegend;
    }
    showLegend = _;
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
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        strings[prop] = _[prop];
      }
    }
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) {
      return direction;
    }
    direction = _;
    // model.direction(_);
    xAxis.direction(_);
    yAxis.direction(_);
    legend.direction(_);
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) {
      return duration;
    }
    duration = _;
    model.duration(_);
    return chart;
  };

  chart.delay = function(_) {
    if (!arguments.length) {
      return delay;
    }
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

  chart.colorFill = function(_) {
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
      showTitle = false,
      showControls = false,
      showLegend = true,
      direction = 'ltr',
      delay = 0,
      duration = 0,
      tooltips = true,
      state = {},
      strings = {
        legend: {close: 'Hide legend', open: 'Show legend'},
        controls: {close: 'Hide controls', open: 'Show controls'},
        noData: 'No Data Available.',
        noLabel: 'undefined'
      },
      dispatch = d3.dispatch('chartClick', 'elementClick', 'tooltipShow', 'tooltipHide', 'tooltipMove', 'stateChange', 'changeState');

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var model = funnel(),
      controls = menu().align('center'),
      legend = menu().align('center');

  var tt = null;

  var tooltipContent = function(key, x, y, e, graph) {
        return '<h3>' + key + '</h3>' +
               '<p>' + y + ' on ' + x + '</p>';
      };

  var showTooltip = function(eo, offsetElement, properties) {
        var key = model.getKey()(eo),
            y = model.getValue()(eo),
            x = properties.total ? (y * 100 / properties.total).toFixed(1) : 100,
            content = tooltipContent(key, x, y, eo, chart);

        return tooltip.show(eo.e, content, null, null, offsetElement);
      };

  var seriesClick = function(data, e, chart) { return; };

  //============================================================

  function chart(selection) {

    selection.each(function(chartData) {

      var that = this,
          container = d3.select(this),
          modelClass = 'funnel';

      var properties = chartData ? chartData.properties : {},
          data = chartData ? chartData.data : null;

      var containerWidth = parseInt(container.style('width'), 10),
          containerHeight = parseInt(container.style('height'), 10);

      var xIsDatetime = chartData.properties.xDataType === 'datetime' || false,
          yIsCurrency = chartData.properties.yDataType === 'currency' || false;

      chart.update = function() {
        container.transition().duration(duration).call(chart);
      };

      chart.container = this;

      //------------------------------------------------------------
      // Private method for displaying no data message.

      function displayNoData(d) {
        var hasData = d && d.length,
            x = (containerWidth - margin.left - margin.right) / 2 + margin.left,
            y = (containerHeight - margin.top - margin.bottom) / 2 + margin.top;
        return utility.displayNoData(hasData, container, chart.strings().noData, x, y);
      }

      // Check to see if there's nothing to show.
      if (displayNoData(data)) {
        return chart;
      }

      //------------------------------------------------------------
      // Process data

      chart.clearActive = function() {
        data.map(function(d) {
          d.active = '';
          d.values[0].active = '';
          container.selectAll('.nv-series').classed('nv-inactive', false);
          return d;
        });
      };

      chart.seriesActivate = function(eo) {
        chart.dataSeriesActivate({series: data[eo.seriesIndex]});
      };

      chart.dataSeriesActivate = function(eo) {
        var series = eo.series;

        series.active = (!series.active || series.active === 'inactive') ? 'active' : 'inactive';

        // if you have activated a data series, inactivate the rest
        if (series.active === 'active') {
          data
            .filter(function(d) {
              return d.active !== 'active';
            })
            .map(function(d) {
              d.active = 'inactive';
              return d;
            });
        }

        // if there are no active data series, inactivate them all
        if (!data.filter(function(d) { return d.active === 'active'; }).length) {
          chart.clearActive();
        }

        container.call(chart);
      };

      // add series index to each data point for reference
      data.forEach(function(s, i) {
        var y = model.y();
        s.seriesIndex = i;

        if (!s.value && !s.values) {
          s.values = [];
        } else if (!isNaN(s.value)) {
          s.values = [{x: 0, y: parseInt(s.value, 10)}];
        }
        s.values.forEach(function(p, j) {
          p.index = j;
          p.series = s;
          if (typeof p.value == 'undefined') {
            p.value = y(p);
          }
        });

        s.value = s.value || d3.sum(s.values, function(p) { return p.value; });
        s.count = s.count || s.values.length;
        s.disabled = s.disabled || s.value === 0;
      });

      // only sum enabled series
      var modelData = data.filter(function(d, i) { return !d.disabled; });

      if (!modelData.length) {
        modelData = [{values: []}]; // safety array
      }

      properties.count = d3.sum(modelData, function(d) { return d.count; });

      properties.total = d3.sum(modelData, function(d) { return d.value; });

      // set title display option
      showTitle = showTitle && properties.title.length;

      //set state.disabled
      state.disabled = data.map(function(d) { return !!d.disabled; });

      //------------------------------------------------------------
      // Display No Data message if there's nothing to show.

      if (!properties.total) {
        displayNoData();
        return chart;
      }

      //------------------------------------------------------------
      // Main chart wrappers

      var wrap_bind = container.selectAll('g.sc-chart-wrap').data([modelData]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-chart-wrap sc-chart-' + modelClass);
      var wrap = container.select('.sc-chart-wrap').merge(wrap_entr);

      wrap_entr.append('rect').attr('class', 'sc-background')
        .attr('x', -margin.left)
        .attr('y', -margin.top)
        .attr('fill', '#FFF');

      wrap_entr.append('g').attr('class', 'sc-title-wrap');
      var title_wrap = wrap.select('.sc-title-wrap');

      wrap_entr.append('g').attr('class', 'sc-' + modelClass + '-wrap');
      var model_wrap = wrap.select('.sc-' + modelClass + '-wrap');

      wrap_entr.append('g').attr('class', 'sc-controls-wrap');
      var controls_wrap = wrap.select('.sc-controls-wrap');
      wrap_entr.append('g').attr('class', 'sc-legend-wrap');
      var legend_wrap = wrap.select('.sc-legend-wrap');

      //------------------------------------------------------------
      // Main chart draw

      chart.render = function() {

        // Chart layout variables
        var renderWidth, renderHeight,
            availableWidth, availableHeight,
            innerMargin,
            innerWidth, innerHeight;

        containerWidth = parseInt(container.style('width'), 10);
        containerHeight = parseInt(container.style('height'), 10);

        renderWidth = width || containerWidth || 960;
        renderHeight = height || containerHeight || 400;

        availableWidth = renderWidth - margin.left - margin.right;
        availableHeight = renderHeight - margin.top - margin.bottom;

        innerMargin = {top: 0, right: 0, bottom: 0, left: 0};
        innerWidth = availableWidth - innerMargin.left - innerMargin.right;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;

        wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        wrap.select('.sc-background')
          .attr('width', renderWidth)
          .attr('height', renderHeight);

        //------------------------------------------------------------
        // Title & Legend & Controls

        // Header variables
        var maxControlsWidth = 0,
            maxLegendWidth = 0,
            widthRatio = 0,
            headerHeight = 0,
            titleBBox = {width: 0, height: 0},
            controlsHeight = 0,
            legendHeight = 0,
            trans = '';

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
          legend
            .id('legend_' + chart.id())
            .strings(chart.strings().legend)
            .align('center')
            .height(availableHeight - innerMargin.top);
          legend_wrap
            .datum(data)
            .call(legend);
          legend
            .arrange(availableWidth);

          var legendLinkBBox = utility.getTextBBox(legend_wrap.select('.sc-menu-link')),
              legendSpace = availableWidth - titleBBox.width - 6,
              legendTop = showTitle && legend.collapsed() && legendSpace > legendLinkBBox.width ? true : false,
              xpos = direction === 'rtl' || !legend.collapsed() ? 0 : availableWidth - legend.width(),
              ypos = titleBBox.height;

          if (legendTop) {
            ypos = titleBBox.height - legend.height() / 2 - legendLinkBBox.height / 2;
          } else if (!showTitle) {
            ypos = - legend.margin().top;
          }

          legend_wrap
            .attr('transform', 'translate(' + xpos + ',' + ypos + ')');

          legendHeight = legendTop ? 12 : legend.height() - (showTitle ? 0 : legend.margin().top);
        }

        // Recalc inner margins based on title and legend height
        headerHeight += legendHeight;
        innerMargin.top += headerHeight;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;
        innerWidth = availableWidth - innerMargin.left - innerMargin.right;

        //------------------------------------------------------------
        // Main Chart Component(s)

        model
          .width(innerWidth)
          .height(innerHeight);

        model_wrap
          .datum(modelData)
          .attr('transform', 'translate(' + innerMargin.left + ',' + innerMargin.top + ')')
          .transition().duration(duration)
            .call(model);

      };

      //============================================================

      chart.render();

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      legend.dispatch.on('legendClick', function(d, i) {
        d.disabled = !d.disabled;
        d.active = false;

        // if there are no enabled data series, enable them all
        if (!data.filter(function(d) { return !d.disabled; }).length) {
          data.map(function(d) {
            d.disabled = false;
            return d;
          });
        }

        // if there are no active data series, activate them all
        if (!data.filter(function(d) { return d.active === 'active'; }).length) {
          data.map(function(d) {
            d.active = '';
            return d;
          });
        }

        state.disabled = data.map(function(d) { return !!d.disabled; });
        dispatch.call('stateChange', this, state);

        container.transition().duration(duration).call(chart);
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

        container.transition().duration(duration).call(chart);
      });

      dispatch.on('chartClick', function() {
        //dispatch.call('tooltipHide', this);
        if (controls.enabled()) {
          controls.dispatch.call('closeMenu', this);
        }
        if (legend.enabled()) {
          legend.dispatch.call('closeMenu', this);
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
  chart.legend = legend;
  chart.controls = controls;

  fc.rebind(chart, model, 'id', 'x', 'y', 'color', 'fill', 'classes', 'gradient', 'locality', 'textureFill');
  fc.rebind(chart, model, 'getKey', 'getValue', 'fmtKey', 'fmtValue', 'fmtCount');
  fc.rebind(chart, model, 'xScale', 'yScale', 'yDomain', 'forceY', 'wrapLabels', 'minLabelWidth');

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
          return 'sc-series sc-series-' + d.seriesIndex + ' sc-fill' + iClass;
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

    var fill = (!params.gradient) ? color : function(d, i) {
      var p = {orientation: params.orientation || 'vertical', position: params.position || 'middle'};
      return model.gradient()(d, d.seriesIndex, p);
    };

    model.color(color);
    model.fill(fill);
    model.classes(classes);

    legend.color(color);
    legend.classes(classes);

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

  chart.showControls = function(_) {
    if (!arguments.length) { return showControls; }
    showControls = _;
    return chart;
  };

  chart.showLegend = function(_) {
    if (!arguments.length) { return showLegend; }
    showLegend = _;
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
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        strings[prop] = _[prop];
      }
    }
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    model.direction(_);
    legend.direction(_);
    controls.direction(_);
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

  chart.colorFill = function(_) {
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
      showTitle = false,
      showLegend = true,
      direction = 'ltr',
      delay = 0,
      duration = 0,
      tooltips = true,
      state = {},
      x,
      y, //can be accessed via chart.yScale()
      strings = {
        legend: {close: 'Hide legend', open: 'Show legend'},
        noData: 'No Data Available.',
        noLabel: 'undefined'
      },
      dispatch = d3.dispatch('chartClick', 'tooltipShow', 'tooltipHide', 'tooltipMove', 'stateChange', 'changeState');

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var model = gauge(),
      legend = menu().align('center');

  var tt = null;

  var tooltipContent = function(key, x, y, e, graph) {
        return '<h3>' + key + '</h3>' +
               '<p>' + y + ' on ' + x + '</p>';
      };

  var showTooltip = function(eo, offsetElement, properties) {
        var key = model.fmtKey()(eo.point.series),
            x = model.getCount()(eo.point.series),
            y = model.getValue()(eo.point.y1 - eo.point.y0),
            content = tooltipContent(key, x, y, eo.e, chart);
        return tooltip.show(eo.e, content, null, null, offsetElement);
      };

  //============================================================

  function chart(selection) {

    selection.each(function(chartData) {

      var that = this,
          container = d3.select(this),
          modelClass = 'gauge';

      var properties = chartData ? chartData.properties : {},
          data = chartData ? chartData.data : null;

      var containerWidth = parseInt(container.style('width'), 10),
          containerHeight = parseInt(container.style('height'), 10);

      var xIsDatetime = chartData.properties.xDataType === 'datetime' || false,
          yIsCurrency = chartData.properties.yDataType === 'currency' || false;

      chart.update = function() {
        container.transition().duration(duration).call(chart);
      };

      chart.container = this;

      //------------------------------------------------------------
      // Private method for displaying no data message.

      function displayNoData(d) {
        var hasData = d && d.length,
            x = (containerWidth - margin.left - margin.right) / 2 + margin.left,
            y = (containerHeight - margin.top - margin.bottom) / 2 + margin.top;
        return utility.displayNoData(hasData, container, chart.strings().noData, x, y);
      }

      // Check to see if there's nothing to show.
      if (displayNoData(data)) {
        return chart;
      }

      //------------------------------------------------------------
      // Process data

      //add series index to each data point for reference
      data.forEach(function(s, i) {
        var y = model.y();
        s.seriesIndex = i;
        s.value = y(s);
        if (!s.value && !s.values) {
          s.values = [];
        } else if (!isNaN(s.value)) {
          s.values = [{x: 0, y: parseInt(s.value, 10)}];
        }
        s.values.forEach(function(p, j) {
          p.index = j;
          p.series = s;
          if (typeof p.value == 'undefined') {
            p.value = y(p);
          }
        });

        s.value = s.value || d3.sum(s.values, function(p) { return p.value; });
        s.count = s.count || s.values.length;
        s.disabled = s.disabled || s.value === 0;
      });

      // only sum enabled series
      var modelData = data.filter(function(d, i) { return !d.disabled; });

      if (!modelData.length) {
        modelData = [{values: []}]; // safety array
      }

      properties.count = d3.sum(modelData, function(d) { return d.count; });

      properties.total = d3.sum(modelData, function(d) { return d.value; });

      // set title display option
      showTitle = showTitle && properties.title.length;

      //set state.disabled
      state.disabled = data.map(function(d) { return !!d.disabled; });

      //------------------------------------------------------------
      // Display No Data message if there's nothing to show.

      if (!properties.total) {
        displayNoData();
        return chart;
      }

      //------------------------------------------------------------
      // Main chart wrappers

      var wrap_bind = container.selectAll('g.sc-chart-wrap').data([modelData]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-chart-wrap sc-chart-' + modelClass);
      var wrap = container.select('.sc-chart-wrap').merge(wrap_entr);

      wrap_entr.append('rect').attr('class', 'sc-background')
        .attr('x', -margin.left)
        .attr('y', -margin.top)
        .attr('fill', '#FFF');

      wrap_entr.append('g').attr('class', 'sc-title-wrap');
      var title_wrap = wrap.select('.sc-title-wrap');

      wrap_entr.append('g').attr('class', 'sc-' + modelClass + '-wrap');
      var model_wrap = wrap.select('.sc-' + modelClass + '-wrap');

      wrap_entr.append('g').attr('class', 'sc-legend-wrap');
      var legend_wrap = wrap.select('.sc-legend-wrap');

      //------------------------------------------------------------
      // Main chart draw

      chart.render = function() {

        // Chart layout variables
        var renderWidth, renderHeight,
            availableWidth, availableHeight,
            innerMargin,
            innerWidth, innerHeight;

        containerWidth = parseInt(container.style('width'), 10);
        containerHeight = parseInt(container.style('height'), 10);

        renderWidth = width || containerWidth || 960;
        renderHeight = height || containerHeight || 400;

        availableWidth = renderWidth - margin.left - margin.right;
        availableHeight = renderHeight - margin.top - margin.bottom;

        innerMargin = {top: 0, right: 0, bottom: 0, left: 0};
        innerWidth = availableWidth - innerMargin.left - innerMargin.right;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;

        wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        wrap.select('.sc-background')
          .attr('width', renderWidth)
          .attr('height', renderHeight);

        //------------------------------------------------------------
        // Title & Legend & Controls

        // Header variables
        var maxLegendWidth = 0,
            headerHeight = 0,
            titleBBox = {width: 0, height: 0},
            legendHeight = 0,
            trans = '';

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
          legend
            .id('legend_' + chart.id())
            .strings(chart.strings().legend)
            .align('center')
            .height(availableHeight - innerMargin.top);
          legend_wrap
            .datum(data)
            .call(legend);
          legend
            .arrange(availableWidth);

          var legendLinkBBox = utility.getTextBBox(legend_wrap.select('.sc-menu-link')),
              legendSpace = availableWidth - titleBBox.width - 6,
              legendTop = showTitle && legend.collapsed() && legendSpace > legendLinkBBox.width ? true : false,
              xpos = direction === 'rtl' || !legend.collapsed() ? 0 : availableWidth - legend.width(),
              ypos = titleBBox.height;

          if (legendTop) {
            ypos = titleBBox.height - legend.height() / 2 - legendLinkBBox.height / 2;
          } else if (!showTitle) {
            ypos = - legend.margin().top;
          }

          legend_wrap
            .attr('transform', 'translate(' + xpos + ',' + ypos + ')');

          legendHeight = legendTop ? 12 : legend.height() - (showTitle ? 0 : legend.margin().top);
        }

        // Recalc inner margins based on title and legend height
        headerHeight += legendHeight;
        innerMargin.top += headerHeight;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;
        innerWidth = availableWidth - innerMargin.left - innerMargin.right;

        //------------------------------------------------------------
        // Main Chart Component(s)

        model
          .width(innerWidth)
          .height(innerHeight);

        model_wrap
          .datum(modelData)
          .attr('transform', 'translate(' + innerMargin.left + ',' + innerMargin.top + ')')
          .transition().duration(duration)
            .call(model);

        model.setPointer(properties.total);
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

        container.transition().duration(duration).call(chart);
      });

      dispatch.on('chartClick', function() {
        if (legend.enabled()) {
          legend.dispatch.call('closeMenu', this);
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
  chart.legend = legend;

  fc.rebind(chart, model, 'id', 'x', 'y', 'color', 'fill', 'classes', 'gradient', 'locality');
  fc.rebind(chart, model, 'getKey', 'getValue', 'getCount', 'fmtKey', 'fmtValue', 'fmtCount');
  fc.rebind(chart, model, 'values', 'showLabels', 'showPointer', 'setPointer', 'ringWidth', 'labelThreshold', 'maxValue', 'minValue');

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
          return 'sc-series sc-series-' + d.seriesIndex + ' sc-fill' + iClass;
        };
        break;
      case 'data':
        color = function(d, i) {
          return d.classes ? 'inherit' : d.color || utility.defaultColor()(d, d.seriesIndex);
        };
        classes = function(d, i) {
          return 'sc-series sc-series-' + d.seriesIndex + (d.classes ? ' ' + d.classes : '');
        };
        break;
    }

    var fill = (!params.gradient) ? color : function(d, i) {
      return model.gradient()(d, d.seriesIndex);
    };

    model.color(color);
    model.fill(fill);
    model.classes(classes);

    legend.color(color);
    legend.classes(classes);

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
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        strings[prop] = _[prop];
      }
    }
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    model.direction(_);
    legend.direction(_);
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
      showControls = false,
      showLegend = true,
      direction = 'ltr',
      tooltips = true,
      initialTilt = 0,
      initialRotate = 100,
      x,
      y,
      state = {},
      strings = {
        legend: {close: 'Hide legend', open: 'Show legend'},
        controls: {close: 'Hide controls', open: 'Show controls'},
        noData: 'No Data Available.'
      },
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

  function tooltipContent(d) {
    return '<p><b>' + d.name + '</b></p>' +
           '<p><b>Amount:</b> $' + d3.format(',.0f')(d.amount) + '</p>';
  }

  function showTooltip(eo, offsetElement) {
    var content = tooltipContent(eo);
    tt = tooltip.show(eo.e, content, null, null, offsetElement);
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

      // Header variables
      var maxControlsWidth = 0,
          maxLegendWidth = 0,
          widthRatio = 0,
          headerHeight = 0,
          titleBBox = {width: 0, height: 0},
          controlsHeight = 0,
          legendHeight = 0,
          trans = '';

      // Globe variables
      var world,
          active_country = false,
          world_view = {rotate: [initialRotate, initialTilt], scale: 1, zoom: 1},
          country_view = {rotate: [null, null], scale: null, zoom: null},
          iRotation;

      // Chart layout variables
      var renderWidth, renderHeight, availableWidth, availableHeight;

      chart.container = this;

      gradient = function(d, i) {
        return utility.colorRadialGradient(d, i, 0, 0, '35%', '35%', color(d, i), defs);
      };

      //------------------------------------------------------------
      // Private method for displaying no data message.

      function displayNoData(d) {
        var hasData = d && d.length,
            x, y;
        if (hasData) return false;
        x = (containerWidth - margin.left - margin.right) / 2 + margin.left;
        y = (containerHeight - margin.top - margin.bottom) / 2 + margin.top;
        return utility.displayNoData(hasData, container, chart.strings().noData, x, y);
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
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
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
          {"_total": 0}
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
            showTooltip(eo, that.parentNode);
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
  chart.gradient = function(_) {
    if (!arguments.length) return gradient;
    gradient = _;
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
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        strings[prop] = _[prop];
      }
    }
    return chart;
  };

  chart.values = function(_) {
    if (!arguments.length) return getValues;
    getValues = _;
    return chart;
  };

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = _;
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = utility.functor(_);
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

  chart.id = function(_) {
    if (!arguments.length) return id;
    id = _;
    return chart;
  };

  chart.valueFormat = function(_) {
    if (!arguments.length) return valueFormat;
    valueFormat = _;
    return chart;
  };

  chart.showTitle = function(_) {
    if (!arguments.length) {
      return showTitle;
    }
    showTitle = _;
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
      showTitle = false,
      showControls = false,
      showLegend = true,
      direction = 'ltr',
      delay = 0,
      duration = 0,
      tooltips = true,
      x,
      y,
      state = {},
      strings = {
        legend: {close: 'Hide legend', open: 'Show legend'},
        controls: {close: 'Hide controls', open: 'Show controls'},
        noData: 'No Data Available.',
        noLabel: 'undefined'
      },
      pointRadius = 3,
      dispatch = d3.dispatch('chartClick', 'tooltipShow', 'tooltipHide', 'tooltipMove', 'stateChange', 'changeState');

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var model = line()
        .clipEdge(true),
      xAxis = axis(),
      yAxis = axis(),
      legend = menu()
        .align('right'),
      controls = menu()
        .align('left')
        .color(['#444']);

  var tt = null;

  var tooltipContent = function(key, x, y, e, graph) {
        return '<h3>' + key + '</h3>' +
               '<p>' + y + ' on ' + x + '</p>';
      };

  var showTooltip = function(eo, offsetElement) {
        var key = eo.series.key,
            x = model.x()(eo.point, eo.pointIndex),
            y = model.y()(eo.point, eo.pointIndex),
            content = tooltipContent(key, x, y, eo, chart);

        tt = tooltip.show(eo.e, content, null, null, offsetElement);
      };

  //============================================================

  function chart(selection) {

    selection.each(function(chartData) {

      var that = this,
          container = d3.select(this),
          modelClass = 'line';

      var properties = chartData ? chartData.properties : {},
          data = chartData ? chartData.data : null,
          labels = properties.labels ? properties.labels.map(function(d) { return d.l || d; }) : [];

      var containerWidth = parseInt(container.style('width'), 10),
          containerHeight = parseInt(container.style('height'), 10);

      var modelData = [],
          xTickLabels = [],
          totalAmount = 0,
          singlePoint = false,
          showMaxMin = false,
          isArrayData = true,
          xIsDatetime = chartData.properties.xDataType === 'datetime' || false,
          yIsCurrency = chartData.properties.yDataType === 'currency' || false;

      var xValueFormat = function(d, i, selection, noEllipsis) {
            var value = xTickLabels && Array.isArray(xTickLabels) && !isNaN(parseInt(d, 10)) ?
                          xTickLabels[parseInt(d, 10)] || d :
                          d;
            var label = xIsDatetime ?
                          utility.dateFormat(value, '%x', chart.locality()) :
                          value;
            return label;
          };

      var yValueFormat = function(d, i, selection, noEllipsis) {
            return utility.numberFormatSI(d, 2, yIsCurrency, chart.locality());
          };

      chart.update = function() {
        container.transition().duration(duration).call(chart);
      };

      chart.container = this;

      //------------------------------------------------------------
      // Private method for displaying no data message.

      function displayNoData(d) {
        var hasData = d && d.length && d.filter(function(d) { return d.values && d.values.length; }).length,
            x = (containerWidth - margin.left - margin.right) / 2 + margin.left,
            y = (containerHeight - margin.top - margin.bottom) / 2 + margin.top;
        return utility.displayNoData(hasData, container, chart.strings().noData, x, y);
      }

      // Check to see if there's nothing to show.
      if (displayNoData(data)) {
        return chart;
      }

      //------------------------------------------------------------
      // Process data

      isArrayData = Array.isArray(data[0].values[0]);
      if (isArrayData) {
        model.x(function(d) { return d ? d[0] : 0; });
        model.y(function(d) { return d ? d[1] : 0; });
      } else {
        model.x(function(d) { return d.x; });
        model.y(function(d) { return d.y; });
      }

      // set title display option
      showTitle = showTitle && properties.title;

      // add series index to each data point for reference
      // and disable data series if total is zero
      data.map(function(d, i) {
        d.seriesIndex = i;
        d.total = d3.sum(d.values, function(d, i) {
          return model.y()(d, i);
        });
        if (!d.total) {
          d.disabled = true;
        }
      });

      xTickLabels = properties.labels ?
          properties.labels.map(function(d) { return [].concat(d.l)[0] || chart.strings().noLabel; }) :
          [];

      // TODO: what if the dimension is a numerical range?
      // xValuesAreDates = xTickLabels.length ?
      //       utility.isValidDate(xTickLabels[0]) :
      //       utility.isValidDate(model.x()(data[0].values[0]));
      // xValuesAreDates = isArrayData && utility.isValidDate(data[0].values[0][0]);

      // SAVE FOR LATER
      // isOrdinalSeries = !xValuesAreDates && labels.length > 0 && d3.min(modelData, function(d) {
      //   return d3.min(d.values, function(d, i) {
      //     return model.x()(d, i);
      //   });
      // }) > 0;

      modelData = data.filter(function(d) {
          return !d.disabled;
        });

      // safety array
      modelData = modelData.length ? modelData : [{series: 0, total: 0, disabled: true, values: []}];

      totalAmount = d3.sum(modelData, function(d) {
          return d.total;
        });

      //------------------------------------------------------------
      // Display No Data message if there's nothing to show.

      if (!totalAmount) {
        displayNoData();
        return chart;
      }

      // set state.disabled
      state.disabled = modelData.map(function(d) { return !!d.disabled; });
      state.interpolate = model.interpolate();
      state.isArea = model.isArea()();

      var controlsData = [
        { key: 'Linear', disabled: model.interpolate() !== 'linear' },
        { key: 'Basis', disabled: model.interpolate() !== 'basis' },
        { key: 'Monotone', disabled: model.interpolate() !== 'monotone' },
        { key: 'Cardinal', disabled: model.interpolate() !== 'cardinal' },
        { key: 'Line', disabled: model.isArea()() === true },
        { key: 'Area', disabled: model.isArea()() === false }
      ];

      //------------------------------------------------------------
      // Setup Scales and Axes

      // Are all data series single points
      singlePoint = d3.max(modelData, function(d) {
          return d.values.length;
        }) === 1;

      var pointSize = Math.pow(pointRadius, 2) * Math.PI * (singlePoint ? 3 : 1);

      model
        .id(chart.id())
        //TODO: we need to reconsider use of padData
        // .padData(singlePoint ? false : true)
        // .padDataOuter(-1)
        // set x-scale as time instead of linear
        .xScale(xIsDatetime && !xTickLabels.length ? d3.scaleTime() : d3.scaleLinear())
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
              }),
            xExtents = d3.extent(xValues),
            xOffset = 1 * (xIsDatetime && !xTickLabels.length ? 86400000 : 1);

        var yValues = d3.merge(modelData.map(function(d) {
                return d.values.map(function(d, i) {
                  return model.y()(d, i);
                });
              })),
            yExtents = d3.extent(yValues),
            yOffset = modelData.length === 1 ? 2 : Math.min((yExtents[1] - yExtents[0]) / modelData.length, yExtents[0]);

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
          .showMaxMin(false)
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
          .xDomain(null)  //?why null?
          .yDomain(null);
        xAxis
          .orient('bottom')
          .ticks(null)
          .tickValues(null)
          .highlightZero(false)
          .showMaxMin(xIsDatetime);
        yAxis
          .orient('left')
          .ticks(null)
          .highlightZero(true)
          .showMaxMin(true);

      }

      x = model.xScale();
      y = model.yScale();

      xAxis
        .scale(x)
        .valueFormat(xValueFormat)
        .tickPadding(6);
      yAxis
        .scale(y)
        .valueFormat(yValueFormat)
        .tickPadding(6);

      //------------------------------------------------------------
      // Main chart wrappers

      var wrap_bind = container.selectAll('g.sc-chart-wrap').data([modelData]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-chart-wrap sc-chart-' + modelClass);
      var wrap = container.select('.sc-chart-wrap').merge(wrap_entr);

      wrap_entr.append('rect').attr('class', 'sc-background')
        .attr('x', -margin.left)
        .attr('y', -margin.top)
        .attr('fill', '#FFF');

      wrap_entr.append('g').attr('class', 'sc-title-wrap');
      var title_wrap = wrap.select('.sc-title-wrap');

      wrap_entr.append('g').attr('class', 'sc-axis-wrap sc-axis-x');
      var xAxis_wrap = wrap.select('.sc-axis-wrap.sc-axis-x');
      wrap_entr.append('g').attr('class', 'sc-axis-wrap sc-axis-y');
      var yAxis_wrap = wrap.select('.sc-axis-wrap.sc-axis-y');

      wrap_entr.append('g').attr('class', 'sc-' + modelClass + '-wrap');
      var model_wrap = wrap.select('.sc-' + modelClass + '-wrap');

      wrap_entr.append('g').attr('class', 'sc-controls-wrap');
      var controls_wrap = wrap.select('.sc-controls-wrap');
      wrap_entr.append('g').attr('class', 'sc-legend-wrap');
      var legend_wrap = wrap.select('.sc-legend-wrap');

      //------------------------------------------------------------
      // Main chart draw

      chart.render = function() {

        // Chart layout variables
        var renderWidth, renderHeight,
            availableWidth, availableHeight,
            innerMargin,
            innerWidth, innerHeight;

        containerWidth = parseInt(container.style('width'), 10);
        containerHeight = parseInt(container.style('height'), 10);

        renderWidth = width || containerWidth || 960;
        renderHeight = height || containerHeight || 400;

        availableWidth = renderWidth - margin.left - margin.right;
        availableHeight = renderHeight - margin.top - margin.bottom;

        innerMargin = {top: 0, right: 0, bottom: 0, left: 0};
        innerWidth = availableWidth - innerMargin.left - innerMargin.right;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;

        wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        wrap.select('.sc-background')
          .attr('width', renderWidth)
          .attr('height', renderHeight);

        //------------------------------------------------------------
        // Title & Legend & Controls

        // Header variables
        var maxControlsWidth = 0,
            maxLegendWidth = 0,
            widthRatio = 0,
            headerHeight = 0,
            titleBBox = {width: 0, height: 0},
            controlsHeight = 0,
            legendHeight = 0,
            trans = '';

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

        if (showControls) {
          controls
            .id('controls_' + chart.id())
            .strings(chart.strings().controls)
            .align('left')
            .height(availableHeight - headerHeight);
          controls_wrap
            .datum(controlsData)
            .call(controls);

          maxControlsWidth = controls.calcMaxWidth();
        }
        if (showLegend) {
          legend
            .id('legend_' + chart.id())
            .strings(chart.strings().legend)
            .align('right')
            .height(availableHeight - headerHeight);
          legend_wrap
            .datum(data)
            .call(legend);

          maxLegendWidth = legend.calcMaxWidth();
        }

        // calculate proportional available space
        widthRatio = availableWidth / (maxControlsWidth + maxLegendWidth);
        maxControlsWidth = Math.floor(maxControlsWidth * widthRatio);
        maxLegendWidth = Math.floor(maxLegendWidth * widthRatio);

        if (showControls) {
          controls
            .arrange(maxControlsWidth);
          maxLegendWidth = availableWidth - controls.width();
        }
        if (showLegend) {
          legend
            .arrange(maxLegendWidth);
          maxControlsWidth = availableWidth - legend.width();
        }

        if (showControls) {
          var xpos = direction === 'rtl' ? availableWidth - controls.width() : 0,
              ypos = showTitle ? titleBBox.height : - controls.margin().top;
          controls_wrap
            .attr('transform', 'translate(' + xpos + ',' + ypos + ')');
          controlsHeight = controls.height();
        }
        if (showLegend) {
          var legendLinkBBox = utility.getTextBBox(legend_wrap.select('.sc-menu-link')),
              legendSpace = availableWidth - titleBBox.width - 6,
              legendTop = showTitle && !showControls && legend.collapsed() && legendSpace > legendLinkBBox.width ? true : false,
              xpos = direction === 'rtl' ? 0 : availableWidth - legend.width(),
              ypos = titleBBox.height;
          if (legendTop) {
            ypos = titleBBox.height - legend.height() / 2 - legendLinkBBox.height / 2;
          } else if (!showTitle) {
            ypos = - legend.margin().top;
          }
          legend_wrap
            .attr('transform', 'translate(' + xpos + ',' + ypos + ')');
          legendHeight = legendTop ? 12 : legend.height();
        }

        // Recalc inner margins based on legend and control height
        headerHeight += Math.max(controlsHeight, legendHeight);
        innerHeight = availableHeight - headerHeight - innerMargin.top - innerMargin.bottom;

        //------------------------------------------------------------
        // Main Chart Component(s)

        model
          .width(innerWidth)
          .height(innerHeight);
        model_wrap
          .datum(modelData)
          .call(model);

        //------------------------------------------------------------
        // Axes

        var yAxisMargin = {top: 0, right: 0, bottom: 0, left: 0},
            xAxisMargin = {top: 0, right: 0, bottom: 0, left: 0};

        function setInnerMargins() {
          innerMargin.left = Math.max(xAxisMargin.left, yAxisMargin.left);
          innerMargin.right = Math.max(xAxisMargin.right, yAxisMargin.right);
          innerMargin.top = Math.max(xAxisMargin.top, yAxisMargin.top);
          innerMargin.bottom = Math.max(xAxisMargin.bottom, yAxisMargin.bottom);
        }

        function setInnerDimensions() {
          innerWidth = availableWidth - innerMargin.left - innerMargin.right;
          innerHeight = availableHeight - headerHeight - innerMargin.top - innerMargin.bottom;
          // Recalc chart dimensions and scales based on new inner dimensions
          model.width(innerWidth).height(innerHeight);
          // This resets the scales for the whole chart
          // unfortunately we can't call this without until line instance is called
          model.scatter.resetDimensions(innerWidth, innerHeight);
        }

        // Y-Axis
        yAxis
          .margin(innerMargin)
          .tickFormat(function(d, i) {
            return yAxis.valueFormat()(d, yIsCurrency);
          });
        yAxis_wrap
          .call(yAxis);
        // reset inner dimensions
        yAxisMargin = yAxis.margin();
        setInnerMargins();
        setInnerDimensions();

        // X-Axis
        // resize ticks based on new dimensions
        xAxis
          .tickSize(-innerHeight + (model.padData() ? pointRadius : 0), 0)
          .margin(innerMargin)
          .tickFormat(function(d, i, noEllipsis) {
            return xAxis.valueFormat()(d - !isArrayData, xTickLabels, xIsDatetime);
          });
        xAxis_wrap
          .call(xAxis);
        xAxisMargin = xAxis.margin();
        setInnerMargins();
        setInnerDimensions();
        // xAxis
        //  .resizeTickLines(-innerHeight + (model.padData() ? pointRadius : 0));

        // recall y-axis, x-axis and lines to set final size based on new dimensions
        yAxis
          .tickSize(-innerWidth + (model.padData() ? pointRadius : 0), 0)
          .margin(innerMargin);
        yAxis_wrap
          .call(yAxis);

        xAxis
          .tickSize(-innerHeight + (model.padData() ? pointRadius : 0), 0)
          .margin(innerMargin);
        xAxis_wrap
          .call(xAxis);

        model
          .width(innerWidth)
          .height(innerHeight);
        model_wrap
          .datum(modelData)
          .call(model);

        // final call to lines based on new dimensions
        // model_wrap
        //   .transition().duration(duration)
        //     .call(model);

        //------------------------------------------------------------
        // Final repositioning

        innerMargin.top += headerHeight;

        trans = innerMargin.left + ',';
        trans += innerMargin.top + (xAxis.orient() === 'bottom' ? innerHeight : 0);
        xAxis_wrap
          .attr('transform', 'translate(' + trans + ')');

        trans = innerMargin.left + (yAxis.orient() === 'left' ? 0 : innerWidth) + ',';
        trans += innerMargin.top;
        yAxis_wrap
          .attr('transform', 'translate(' + trans + ')');

        trans = innerMargin.left + ',' + innerMargin.top;
        model_wrap
          .attr('transform', 'translate(' + trans + ')');

      };

      //============================================================

      chart.render();

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      legend.dispatch.on('legendClick', function(d, i) {
        d.disabled = !d.disabled;

        if (!data.filter(function(d) { return !d.disabled; }).length) {
          data.map(function(d) {
            d.disabled = false;
            container.selectAll('.sc-series').classed('disabled', false);
            return d;
          });
        }

        state.disabled = data.map(function(d) { return !!d.disabled; });
        dispatch.call('stateChange', this, state);

        container.transition().duration(duration).call(chart);
      });

      controls.dispatch.on('legendClick', function(d, i) {
        //if the option is currently enabled (i.e., selected)
        if (!d.disabled) {
          return;
        }

        //set the controls all to false
        controlsData = controlsData.map(function(s) {
          s.disabled = true;
          return s;
        });
        //activate the the selected control option
        d.disabled = false;

        switch (d.key) {
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
        dispatch.call('stateChange', this, state);

        container.transition().duration(duration).call(chart);
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

        if (typeof eo.interpolate !== 'undefined') {
          model.interpolate(eo.interpolate);
          state.interpolate = eo.interpolate;
        }

        if (typeof eo.isArea !== 'undefined') {
          model.isArea(eo.isArea);
          state.isArea = eo.isArea;
        }

        container.transition().duration(duration).call(chart);
      });

      dispatch.on('chartClick', function() {
        //dispatch.call('tooltipHide', this);
        if (controls.enabled()) {
          controls.dispatch.call('closeMenu', this);
        }
        if (legend.enabled()) {
          legend.dispatch.call('closeMenu', this);
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
  chart.legend = legend;
  chart.controls = controls;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  fc.rebind(chart, model, 'id', 'x', 'y', 'xScale', 'yScale', 'xDomain', 'yDomain', 'forceX', 'forceY', 'clipEdge', 'color', 'fill', 'classes', 'gradient', 'locality');
  fc.rebind(chart, model, 'defined', 'isArea', 'interpolate', 'size', 'clipVoronoi', 'useVoronoi', 'interactive', 'nice');
  fc.rebind(chart, xAxis, 'rotateTicks', 'reduceXTicks', 'staggerTicks', 'wrapTicks');

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

    var fill = (!params.gradient) ? color : function(d, i) {
      return model.gradient()(d, d.seriesIndex);
    };

    model.color(color);
    model.fill(fill);
    model.classes(classes);

    // don't enable this since controls get a custom function
    // controls.color(color);
    // controls.classes(classes);
    legend.color(color);
    legend.classes(classes);

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

  chart.showControls = function(_) {
    if (!arguments.length) { return showControls; }
    showControls = _;
    return chart;
  };

  chart.showLegend = function(_) {
    if (!arguments.length) { return showLegend; }
    showLegend = _;
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
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        strings[prop] = _[prop];
      }
    }
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    xAxis.direction(_);
    yAxis.direction(_);
    legend.direction(_);
    controls.direction(_);
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

function multibarChart() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 10, right: 10, bottom: 10, left: 10},
      width = null,
      height = null,
      showTitle = false,
      showControls = false,
      showLegend = true,
      direction = 'ltr',
      tooltips = true,
      x,
      y,
      delay = 0,
      duration = 0,
      state = {},
      strings = {
        legend: {close: 'Hide legend', open: 'Show legend'},
        controls: {close: 'Hide controls', open: 'Show controls'},
        noData: 'No Data Available.',
        noLabel: 'undefined'
      },
      vertical = true,
      scrollEnabled = true,
      overflowHandler = function(d) { return; },
      hideEmptyGroups = true,
      dispatch = d3.dispatch('chartClick', 'elementClick', 'tooltipShow', 'tooltipHide', 'tooltipMove', 'stateChange', 'changeState');

  var xValueFormat = function(d, i, label, isDate) {
        return isDate ?
          utility.dateFormat(label, '%x', chart.locality()) :
          label;
      };

  var yValueFormat = function(d, i, label, isCurrency) {
        var precision = 2;
        return utility.numberFormatSI(d, precision, isCurrency, chart.locality());
      };

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  // Scroll variables
  var useScroll = false,
      scrollOffset = 0;

  var model = multibar().stacked(false).clipEdge(false);
  var xAxis = axis(); //.orient('bottom'),
  var yAxis = axis(); //.orient('left'),
  var controls = menu().color(['#444']);
  var legend = menu();

  var tt = null;

  var tooltipContent = function(eo, graph) {
        var key = eo.group.label,
            y = eo.point.y,
            x = Math.abs(y * 100 / eo.group._height).toFixed(1);
        return '<h3>' + key + '</h3>' +
               '<p>' + y + ' on ' + x + '</p>';
      };

  var showTooltip = function(eo, offsetElement) {
        var content = tooltipContent(eo, chart),
            gravity = eo.value < 0 ?
              vertical ? 'n' : 'e' :
              vertical ? 's' : 'w';

        return tooltip.show(eo.e, content, gravity, null, offsetElement);
      };

  var seriesClick = function(data, e, chart, labels) {
        return;
      };

  //============================================================

  function chart(selection) {

    selection.each(function(chartData) {

      var that = this,
          container = d3.select(this),
          modelClass = vertical ? 'multibar' : 'multibar-horizontal';

      var properties = chartData ? chartData.properties : {},
          data = chartData ? chartData.data : null;

      var containerWidth = parseInt(container.style('width'), 10),
          containerHeight = parseInt(container.style('height'), 10);

      var availableWidth = width,
          availableHeight = height;

      var xIsDatetime = properties.xDataType === 'datetime' || false,
          yIsCurrency = properties.yDataType === 'currency' || false;

      var seriesData = [],
          seriesCount = 0,
          groupData = [],
          groupLabels = [],
          groupCount = 0,
          totalAmount = 0,
          hasData = false;

      var baseDimension = model.stacked() ? vertical ? 72 : 32 : 32;

      var xAxisValueFormat = function(d, i, selection, noEllipsis) {
            // Set axis to use trimmed array rather than data
            var label = groupLabels && Array.isArray(groupLabels) ?
                  groupLabels[i] || d:
                  d;
            // format as date if isDate
            var value = xValueFormat(d, i, label, xIsDatetime);
            var width = Math.max(vertical ?
                  baseDimension * 2 :
                  availableWidth * 0.2, 75);

            return !noEllipsis ?
              utility.stringEllipsify(value, container, width) :
              value;
          };

      var yAxisValueFormat = function(d, i, selection, noEllipsis) {
            return yValueFormat(d, i, null, yIsCurrency);
          };

      chart.update = function() {
        container.transition().duration(duration).call(chart);
      };

      chart.container = this;

      //------------------------------------------------------------
      // Private method for displaying no data message.

      function displayNoData(d) {
        var hasData = d && d.length && d.filter(function(d) { return d.values && d.values.length; }).length,
            x = (containerWidth - margin.left - margin.right) / 2 + margin.left,
            y = (containerHeight - margin.top - margin.bottom) / 2 + margin.top;
        return utility.displayNoData(hasData, container, chart.strings().noData, x, y);
      }

      // Check to see if there's nothing to show.
      if (displayNoData(data)) {
        return chart;
      }

      //------------------------------------------------------------
      // Process data

      chart.clearActive = function() {
        data.forEach(function(d) {
          d.active = '';
          d.values.map(function(d) {
            d.active = '';
          });
        });
        delete state.active;
      };

      chart.cellActivate = function(eo) {
        data[eo.seriesIndex].values[eo.groupIndex].active = 'active';
        chart.render();
      };

      chart.seriesActivate = function(eo) {
        chart.dataSeriesActivate({series: data[eo.seriesIndex]});
      };

      chart.dataSeriesActivate = function(eo) {
        var series = eo.series;

        // series.active = (!series.active || series.active === 'inactive') ? 'active' : 'inactive';
        series.active = (typeof series.active === 'undefined' || series.active === 'inactive' || series.active === '') ? 'active' : 'inactive';

        series.values.map(function(d) {
          d.active = series.active;
        });

        // if you have activated a data series, inactivate the other non-active series
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

        // if there are no active data series, unset active state
        if (!data.filter(function(d) { return d.active === 'active'; }).length) {
          chart.clearActive();
        } else {
          state.active = data.map(function(d) { return typeof d.active === 'undefined' || d.active === 'active'; });
        }

        // container.call(chart);
        chart.render();
      };

      // add series index to each data point for reference
      data.forEach(function(series, s) {
        // make sure untrimmed values array exists
        // and set immutable series values
        if (!series._values) {
          series._values = series.values.map(function(value, v) {
            return {
              'x': value.x,
              'y': value.y
            };
          });
        }

        series.seriesIndex = s;

        series.values = series._values.map(function(value, v) {
            return {
                  'seriesIndex': series.seriesIndex,
                  'group': v,
                  'color': typeof series.color !== 'undefined' ? series.color : '',
                  'x': model.x()(value, v),
                  'y': model.y()(value, v),
                  'y0': value.y + (s > 0 ? data[series.seriesIndex - 1].values[v].y0 : 0),
                  'active': typeof series.active !== 'undefined' ? series.active : ''
                };
          });

        series.total = d3.sum(series.values, function(value, v) {
            return value.y;
          });

        // disabled if all values in series are zero
        // or the series was disabled by the legend
        series.disabled = series.disabled || series.total === 0;
        // inherit values from series
        series.values.forEach(function(value, v) {
          // do not eval d.active because it can be false
          value.active = typeof series.active !== 'undefined' ? series.active : '';
        });
      });

      seriesData = data
        .filter(function(series, s) {
          return !series.disabled && (!series.type || series.type === 'bar');
        })
        .map(function(series, s) {
          series.seri = s;
          series.values
            .forEach(function(value, v) {
              value.seri = series.seri;
            });
          return series;
        });

      seriesCount = seriesData.length;
      hasData = seriesCount > 0;

      // update groupTotal amounts based on enabled data series
      groupData = properties.groups.map(function(group, g) {
          group.total = 0;
          group._height = 0;
          // only sum enabled series
          seriesData
            .forEach(function(series, s) {
              series.values
                .filter(function(value, v) {
                  return value.group === g;
                })
                .forEach(function(value, v) {
                  group.total += value.y;
                  group._height += Math.abs(value.y);
                });
            });
          return group;
        });

      totalAmount = d3.sum(groupData, function(group) { return group.total; });

      // build a trimmed array for active group only labels
      groupLabels = groupData
        .filter(function(group, g) {
          return hideEmptyGroups ? group._height !== 0 : true;
        })
        .map(function(group) {
          return group.l || group.label || chart.strings().noLabel;
        });

      groupCount = groupLabels.length;

      if (hideEmptyGroups) {
        // build a discrete array of data values for the multibar
        // based on enabled data series
        seriesData.forEach(function(series, s) {
          //reset series values to exlcude values for
          //groups that have all zero values
          series.values = series.values
            .filter(function(value, v) {
              return groupData[v]._height !== 0;
            })
            .map(function(value, v) {
              return {
                'seri': series.seri,
                'seriesIndex': value.seriesIndex,
                'group': value.group,
                'color': value.color,
                'x': (v + 1),
                'y': value.y,
                'y0': value.y0,
                'active': value.active
              };
            });
          return series;
        });
      }
            // return {
            //       'seriesIndex': series.seriesIndex,
            //       'group': v,
            //       'color': typeof series.color !== 'undefined' ? series.color : '',
            //       'x': model.x()(value, v),
            //       'y': model.y()(value, v),
            //       'y0': value.y + (s > 0 ? data[series.seriesIndex - 1].values[v].y0 : 0),
            //       'active': typeof series.active !== 'undefined' ? series.active : ''
            //     };
      //------------------------------------------------------------
      // Display No Data message if there's nothing to show.

      if (!hasData) {
        displayNoData();
        return chart;
      }

      // safety array
      if (!seriesData.length) {
        seriesData = [{values: []}];
      }

      // set state.disabled
      state.disabled = data.map(function(d) { return !!d.disabled; });
      state.active = data.map(function(d) { return d.active === 'active'; });
      state.stacked = model.stacked();

      // set title display option
      showTitle = showTitle && properties.title;

      var controlsData = [
        { key: 'Grouped', disabled: state.stacked },
        { key: 'Stacked', disabled: !state.stacked }
      ];

      //------------------------------------------------------------
      // Setup Scales and Axes

      x = model.xScale();
      y = model.yScale();

      xAxis
        .orient(vertical ? 'bottom' : 'left') // any time orient is called it resets the d3-axis model and has to be reconfigured
        .scale(x)
        .valueFormat(xAxisValueFormat)
        .tickSize(0)
        .tickPadding(4)
        .highlightZero(false)
        .showMaxMin(false);

      yAxis
        .orient(vertical ? 'left' : 'bottom')
        .scale(y)
        .valueFormat(yAxisValueFormat)
        .tickPadding(4)
        .showMaxMin(true);

      //------------------------------------------------------------
      // Main chart wrappers

      var wrap_bind = container.selectAll('g.sc-chart-wrap').data([data]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-chart-wrap sc-chart-' + modelClass);
      var wrap = container.select('.sc-chart-wrap').merge(wrap_entr);

      /* Clipping box for scroll */
      wrap_entr.append('defs');

      /* Container for scroll elements */
      wrap_entr.append('g').attr('class', 'sc-scroll-background');

      wrap_entr.append('g').attr('class', 'sc-title-wrap');
      var title_wrap = wrap.select('.sc-title-wrap');

      wrap_entr.append('g').attr('class', 'sc-axis-wrap sc-axis-y');
      var yAxis_wrap = wrap.select('.sc-axis-wrap.sc-axis-y');

      /* Append scroll group with chart mask */
      wrap_entr.append('g').attr('class', 'sc-scroll-wrap');
      var scroll_wrap = wrap.select('.sc-scroll-wrap');

      wrap_entr.select('.sc-scroll-wrap').append('g').attr('class', 'sc-axis-wrap sc-axis-x');
      var xAxis_wrap = wrap.select('.sc-axis-wrap.sc-axis-x');

      wrap_entr.select('.sc-scroll-wrap').append('g').attr('class', 'sc-bars-wrap');
      var model_wrap = wrap.select('.sc-bars-wrap');

      wrap_entr.append('g').attr('class', 'sc-controls-wrap');
      var controls_wrap = wrap.select('.sc-controls-wrap');
      wrap_entr.append('g').attr('class', 'sc-legend-wrap');
      var legend_wrap = wrap.select('.sc-legend-wrap');

      if (scrollEnabled) {
        var scroll = scroller()
          .id(chart.id())
          .vertical(vertical);
        scroll(wrap, wrap_entr, scroll_wrap, xAxis);
      }

      //------------------------------------------------------------
      // Main chart draw

      chart.render = function() {

        // Chart layout variables
        var renderWidth, renderHeight,
            innerMargin,
            innerWidth, innerHeight;

        containerWidth = parseInt(container.style('width'), 10);
        containerHeight = parseInt(container.style('height'), 10);

        renderWidth = width || containerWidth || 960;
        renderHeight = height || containerHeight || 400;

        availableWidth = renderWidth - margin.left - margin.right;
        availableHeight = renderHeight - margin.top - margin.bottom;

        innerMargin = {top: 0, right: 0, bottom: 0, left: 0};
        innerWidth = availableWidth - innerMargin.left - innerMargin.right;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;

        // Scroll variables
        // for stacked, baseDimension is width of bar plus 1/4 of bar for gap
        // for grouped, baseDimension is width of bar plus width of one bar for gap
        var boundsWidth = state.stacked ? baseDimension : baseDimension * seriesCount + baseDimension,
            gap = baseDimension * (state.stacked ? 0.25 : 1),
            minDimension = groupCount * boundsWidth + gap;

        wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        //------------------------------------------------------------
        // Title & Legend & Controls

        // Header variables
        var maxControlsWidth = 0,
            maxLegendWidth = 0,
            widthRatio = 0,
            headerHeight = 0,
            titleBBox = {width: 0, height: 0},
            controlsHeight = 0,
            legendHeight = 0,
            trans = '';

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

        if (showControls) {
          controls
            .id('controls_' + chart.id())
            .strings(chart.strings().controls)
            .align('left')
            .height(availableHeight - headerHeight);
          controls_wrap
            .datum(controlsData)
            .call(controls);

          maxControlsWidth = controls.calcMaxWidth();
        }
        if (showLegend) {
          if (model.barColor()) {
            data.forEach(function(series, i) {
              series.color = d3.rgb('#ccc').darker(i * 1.5).toString();
            });
          }

          legend
            .id('legend_' + chart.id())
            .strings(chart.strings().legend)
            .align('right')
            .height(availableHeight - headerHeight);

          legend_wrap
            .datum(data)
            .call(legend);

          maxLegendWidth = legend.calcMaxWidth();
        }

        // calculate proportional available space
        widthRatio = availableWidth / (maxControlsWidth + maxLegendWidth);
        maxControlsWidth = Math.floor(maxControlsWidth * widthRatio);
        maxLegendWidth = Math.floor(maxLegendWidth * widthRatio);

        if (showControls) {
          controls
            .arrange(maxControlsWidth);
          maxLegendWidth = availableWidth - controls.width();
        }
        if (showLegend) {
          legend
            .arrange(maxLegendWidth);
          maxControlsWidth = availableWidth - legend.width();
        }

        if (showControls) {
          var xpos = direction === 'rtl' ? availableWidth - controls.width() : 0,
              ypos = showTitle ? titleBBox.height : - controls.margin().top;
          controls_wrap
            .attr('transform', 'translate(' + xpos + ',' + ypos + ')');
          controlsHeight = controls.height() - (showTitle ? 0 : controls.margin().top);
        }
        if (showLegend) {
          var legendLinkBBox = utility.getTextBBox(legend_wrap.select('.sc-menu-link')),
              legendSpace = availableWidth - titleBBox.width - 6,
              legendTop = showTitle && !showControls && legend.collapsed() && legendSpace > legendLinkBBox.width ? true : false,
              xpos = direction === 'rtl' ? 0 : availableWidth - legend.width(),
              ypos = titleBBox.height;
          if (legendTop) {
            ypos = titleBBox.height - legend.height() / 2 - legendLinkBBox.height / 2;
          } else if (!showTitle) {
            ypos = - legend.margin().top;
          }
          legend_wrap
            .attr('transform', 'translate(' + xpos + ',' + ypos + ')');
          legendHeight = legendTop ? 12 : legend.height() - (showTitle ? 0 : legend.margin().top);
        }

        // Recalc inner margins based on legend and control height
        headerHeight += Math.max(controlsHeight, legendHeight);
        innerMargin.top += headerHeight;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;
        innerWidth = availableWidth - innerMargin.left - innerMargin.right;

        //------------------------------------------------------------
        // Main Chart Component(s)

        function getDimension(d) {
          if (d === 'width') {
            return vertical && scrollEnabled ? Math.max(innerWidth, minDimension) : innerWidth;
          } else if (d === 'height') {
            return !vertical && scrollEnabled ? Math.max(innerHeight, minDimension) : innerHeight;
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
          .data([seriesData])
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
          setInnerDimensions();
        }

        function setInnerDimensions() {
          innerWidth = availableWidth - innerMargin.left - innerMargin.right;
          innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;
          // Recalc chart dimensions and scales based on new inner dimensions
          model.resetDimensions(getDimension('width'), getDimension('height'));
        }

        // Y-Axis
        yAxis
          .margin(innerMargin)
          .ticks(innerHeight / 48);
        yAxis_wrap
          .call(yAxis);
        // reset inner dimensions
        yAxisMargin = yAxis.margin();
        setInnerMargins();

        // X-Axis
        xAxis
          .margin(innerMargin)
          .ticks(groupCount);
        trans = innerMargin.left + ',';
        trans += innerMargin.top + (xAxis.orient() === 'bottom' ? innerHeight : 0);
        xAxis_wrap
          .attr('transform', 'translate(' + trans + ')')
            .call(xAxis);
        // reset inner dimensions
        xAxisMargin = xAxis.margin();
        setInnerMargins();

        // resize ticks based on new dimensions
        xAxis
          .tickSize(0)
          .margin(innerMargin);
        xAxis_wrap
          .call(xAxis);

        // reset inner dimensions
        xAxisMargin = xAxis.margin();
        setInnerMargins();

        // recall y-axis to set final size based on new dimensions
        yAxis
          .tickSize(vertical ? -innerWidth : -innerHeight, 0)
          .margin(innerMargin);
        yAxis_wrap
          .call(yAxis);

        // reset inner dimensions
        yAxisMargin = yAxis.margin();
        setInnerMargins();

        // final call to lines based on new dimensions
        model_wrap
          .transition()
            .call(model);

        //------------------------------------------------------------
        // Final repositioning


        trans = (vertical || xAxis.orient() === 'left' ? 0 : innerWidth) + ',';
        trans += (vertical && xAxis.orient() === 'bottom' ? innerHeight + 2 : -2);
        xAxis_wrap
          .attr('transform', 'translate(' + trans + ')');

        trans = innerMargin.left + (vertical || yAxis.orient() === 'bottom' ? 0 : innerWidth) + ',';
        trans += innerMargin.top + (vertical || yAxis.orient() === 'left' ? 0 : innerHeight);
        yAxis_wrap
          .attr('transform', 'translate(' + trans + ')');

        scroll_wrap
          .attr('transform', 'translate(' + innerMargin.left + ',' + innerMargin.top + ')');

        //------------------------------------------------------------
        // Enable scrolling

        if (scrollEnabled) {

          useScroll = minDimension > (vertical ? innerWidth : innerHeight);

          xAxis_wrap.select('.sc-axislabel')
            .attr('x', (vertical ? innerWidth : -innerHeight) / 2);

          var diff = (vertical ? innerWidth : innerHeight) - minDimension;
          var panMultibar = function() {
                dispatch.call('tooltipHide', this);
                scrollOffset = scroll.pan(diff);
                xAxis_wrap.select('.sc-axislabel')
                  .attr('x', (vertical ? innerWidth - scrollOffset * 2 : scrollOffset * 2 - innerHeight) / 2);
              };

          scroll
            .enable(useScroll)
            .width(innerWidth)
            .height(innerHeight)
            .margin(innerMargin)
            .minDimension(minDimension)
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

      legend.dispatch.on('legendClick', function(series, i) {
        series.disabled = !series.disabled;
        series.active = 'inactive';
        series.values.map(function(d) {
          d.active = 'inactive';
        });

        if (hideEmptyGroups) {
          data.map(function(m, j) {
            m._values.map(function(v, k) {
              v.disabled = (k === i ? series.disabled : v.disabled ? true : false);
              return v;
            });
            return m;
          });
        }

        // if there are no enabled data series, enable them all
        if (!data.filter(function(d) { return !d.disabled; }).length) {
          data.map(function(d) {
            d.disabled = false;
            return d;
          });
        }

        // if there are no active data series, unset active state
        if (!data.filter(function(d) { return d.active === 'active'; }).length) {
          chart.clearActive();
        }

        // state.disabled = data.map(function(d) { return !!d.disabled; });
        chart.update();
        dispatch.call('stateChange', this, state);

        // container.transition().duration(duration).call(chart);
      });

      controls.dispatch.on('legendClick', function(d, i) {
        //if the option is currently enabled (i.e., selected)
        if (!d.disabled) {
          return;
        }

        //set the controls all to false
        controlsData = controlsData.map(function(s) {
          s.disabled = true;
          return s;
        });
        //activate the the selected control option
        d.disabled = false;

        switch (d.key) {
          case 'Grouped':
            model.stacked(false);
            break;
          case 'Stacked':
            model.stacked(true);
            break;
        }

        state.stacked = model.stacked();
        chart.update();
        dispatch.call('stateChange', this, state);

        // container.transition().duration(duration).call(chart);
      });

      dispatch.on('tooltipShow', function(eo) {
        if (tooltips) {
          eo.group = groupData[eo.groupIndex];
          tt = showTooltip(eo, that.parentNode, groupData);
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
            series.values.map(function(d) {
              d.active = series.active;
            });
          });
          state.active = eo.active;
          // if there are no active data series, unset active state
          if (!data.filter(function(d) { return d.active === 'active'; }).length) {
            chart.clearActive();
          }
        }

        if (typeof eo.stacked !== 'undefined') {
          model.stacked(eo.stacked);
          state.stacked = eo.stacked;
        }

        // container.transition().duration(duration).call(chart);
        chart.render();
      });

      dispatch.on('chartClick', function() {
        //dispatch.call('tooltipHide', this);
        if (controls.enabled()) {
          controls.dispatch.call('closeMenu', this);
        }
        if (legend.enabled()) {
          legend.dispatch.call('closeMenu', this);
        }
      });

      model.dispatch.on('elementClick', function(eo) {
        dispatch.call('chartClick', this);
        seriesClick(data, eo, chart, groupLabels);
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
  chart.multibar = model;
  chart.legend = legend;
  chart.controls = controls;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  fc.rebind(chart, model, 'id', 'x', 'y', 'xScale', 'yScale', 'xDomain', 'yDomain', 'forceY', 'clipEdge', 'color', 'fill', 'classes', 'gradient', 'locality');
  fc.rebind(chart, model, 'stacked', 'showValues', 'valueFormat', 'nice', 'textureFill');
  fc.rebind(chart, xAxis, 'rotateTicks', 'reduceXTicks', 'staggerTicks', 'wrapTicks');

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
          return 'sc-series sc-series-' + d.seriesIndex + ' sc-fill' + iClass;
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

    var fill = (!params.gradient) ? color : function(d, i) {
      var p = {orientation: params.orientation || (vertical ? 'vertical' : 'horizontal'), position: params.position || 'middle'};
      return model.gradient()(d, d.seriesIndex, p);
    };

    model.color(color);
    model.fill(fill);
    model.classes(classes);

    // don't enable this since controls get a custom function
    // controls.color(color);
    // controls.classes(classes);
    legend.color(color);
    legend.classes(classes);

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

  chart.showControls = function(_) {
    if (!arguments.length) { return showControls; }
    showControls = _;
    return chart;
  };

  chart.showLegend = function(_) {
    if (!arguments.length) { return showLegend; }
    showLegend = _;
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
    dispatch.stateChange(state);
    return chart;
  };

  chart.strings = function(_) {
    if (!arguments.length) { return strings; }
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        strings[prop] = _[prop];
      }
    }
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    model.direction(_);
    xAxis.direction(_);
    yAxis.direction(_);
    legend.direction(_);
    controls.direction(_);
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

  chart.overflowHandler = function(_) {
    if (!arguments.length) { return overflowHandler; }
    overflowHandler = utility.functor(_);
    return chart;
  };

  chart.hideEmptyGroups = function(_) {
    if (!arguments.length) { return hideEmptyGroups; }
    hideEmptyGroups = _;
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

  //============================================================

  return chart;
}

function paretoChart() {
  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 10, right: 10, bottom: 10, left: 10},
      width = null,
      height = null,
      showTitle = false,
      showControls = false,
      showLegend = true,
      direction = 'ltr',
      tooltips = true,
      x,
      y,
      clipEdge = false, // if true, masks lines within x and y scale
      delay = 0, // transition
      duration = 300, // transition
      state = {},
      strings = {
        barlegend: {close: 'Hide bar legend', open: 'Show bar legend'},
        linelegend: {close: 'Hide line legend', open: 'Show line legend'},
        controls: {close: 'Hide controls', open: 'Show controls'},
        noData: 'No Data Available.',
        noLabel: 'undefined'
      },
      getX = function(d) { return d.x; },
      getY = function(d) { return d.y; },
      locality = utility.buildLocality(),
      dispatch = d3.dispatch('chartClick', 'tooltipShow', 'tooltipHide', 'tooltipMove', 'stateChange', 'changeState');

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

  var getAbsoluteXY = function(element) {
        var viewportElement = document.documentElement,
          box = element.getBoundingClientRect(),
          scrollLeft = viewportElement.scrollLeft + document.body.scrollLeft,
          scrollTop = viewportElement.scrollTop + document.body.scrollTop,
          x = box.left + scrollLeft,
          y = box.top + scrollTop;

        return {'x': x, 'y': y};
      };

  //============================================================

  function chart(selection) {

    selection.each(function(chartData) {

      var that = this,
          container = d3.select(this),
          modelClass = 'pareto';

      var properties = chartData ? chartData.properties : {},
          data = chartData ? chartData.data : null;

      var containerWidth = parseInt(container.style('width'), 10),
          containerHeight = parseInt(container.style('height'), 10);

      var maxBarLegendWidth = 0,
          maxLineLegendWidth = 0,
          widthRatio = 0,
          headerHeight = 0,
          pointSize = Math.pow(6, 2) * Math.PI, // set default point size to 6
          xIsDatetime = chartData.properties.xDataType === 'datetime' || false,
          yIsCurrency = chartData.properties.yDataType === 'currency' || false;

      var baseDimension = bars.stacked() ? 72 : 32;

      var xAxisValueFormat = function(d, i, selection, noEllipsis) {
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

      var yAxisValueFormat = function(d, i, selection, noEllipsis) {
            return yValueFormat(d, i, null, yIsCurrency);
            return value;
          };

      chart.update = function() {
        container.transition().call(chart);
      };

      chart.container = this;

      //------------------------------------------------------------
      // Private method for displaying no data message.

      function displayNoData(d) {
        var hasData = d && d.length && d.filter(function(d) { return d.values && d.values.length; }).length,
            x = (containerWidth - margin.left - margin.right) / 2 + margin.left,
            y = (containerHeight - margin.top - margin.bottom) / 2 + margin.top;
        return utility.displayNoData(hasData, container, chart.strings().noData, x, y);
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
      barData = barData.length ? barData : [{values: []}];

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
      lineData = lineData.length ? lineData : [{values: []}];

      var groupData = properties.groupData,
          groupLabels = groupData.map(function(d) {
            return [].concat(d.l)[0] || chart.strings().noLabel;
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
      showTitle = showTitle && properties.title;

      //------------------------------------------------------------
      // Setup Scales

      x = bars.xScale();
      y = bars.yScale();

      xAxis
        .orient('bottom')
        .scale(x)
        .valueFormat(xAxisValueFormat)
        .tickSize(0)
        .tickPadding(4)
        .highlightZero(false)
        .showMaxMin(false);

      yAxis
        .orient('left')
        .scale(y)
        .valueFormat(yAxisValueFormat)
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
        var maxControlsWidth = 0,
            maxLegendWidth = 0,
            widthRatio = 0,
            headerHeight = 0,
            titleBBox = {width: 0, height: 0},
            controlsHeight = 0,
            legendHeight = 0,
            trans = '';

        //------------------------------------------------------------
        // Setup containers and skeleton of chart

        var wrap_bind = container.selectAll('g.sc-chart-wrap').data([data]);
        var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-chart-wrap sc-chart-' + modelClass);
        var wrap = container.select('.sc-chart-wrap').merge(wrap_entr);

        wrap_entr.append('rect').attr('class', 'sc-background')
          .attr('x', -margin.left)
          .attr('y', -margin.top)
          .attr('width', renderWidth)
          .attr('height', renderHeight)
          .attr('fill', '#FFF');

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

        wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

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
            .strings(chart.strings().barlegend)
            .align('left')
            .height(availableHeight - innerMargin.top);
          barLegend_wrap
            .datum(barLegendData)
            .call(barLegend);

          maxBarLegendWidth = barLegend.calcMaxWidth();

          // line series legend
          lineLegend
            .id('linelegend_' + chart.id())
            .strings(chart.strings().linelegend)
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

        var transform = 'translate(' + innerMargin.left + ',' + innerMargin.top + ')';

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
            wrap.selectAll('.sc-series').classed('disabled', false);
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
  chart.yAxis = yAxis;

  fc.rebind(chart, bars, 'id', 'xScale', 'yScale', 'xDomain', 'yDomain', 'forceY', 'color', 'fill', 'classes', 'gradient');
  fc.rebind(chart, bars, 'stacked', 'showValues', 'valueFormat', 'nice', 'textureFill');
  fc.rebind(chart, xAxis, 'rotateTicks', 'reduceXTicks', 'staggerTicks', 'wrapTicks');

  chart.colorData = function(_) {
    var type = arguments[0],
      params = arguments[1] || {};
    var barColor = function(d, i) {
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
        barColor = function(d, i) {
          return d3.interpolateHsl(d3.rgb(params.barColor.c1), d3.rgb(params.barColor.c2))(d.seriesIndex / params.barColor.l);
        };
        break;
      case 'class':
        barColor = function() {
          return 'inherit';
        };
        barClasses = function(d, i) {
          var iClass = (d.seriesIndex * (params.step || 1)) % 14;
          iClass = (iClass > 9 ? '' : '0') + iClass;
          return 'sc-series sc-series-' + d.seriesIndex + ' sc-fill' + iClass;
        };
        lineClasses = function(d, i) {
          var iClass = (d.seriesIndex * (params.step || 1)) % 14;
          iClass = (iClass > 9 ? '' : '0') + iClass;
          return 'sc-series sc-series-' + d.seriesIndex + ' sc-fill' + iClass + ' sc-stroke' + iClass;
        };
        break;
      case 'data':
        barColor = function(d, i) {
          return d.classes ? 'inherit' : d.color || utility.defaultColor()(d, d.seriesIndex);
        };
        barClasses = function(d, i) {
          return 'sc-series sc-series-' + d.seriesIndex + (d.classes ? ' ' + d.classes : '');
        };
        lineClasses = function(d, i) {
          return 'sc-series sc-series-' + d.seriesIndex + (d.classes ? ' ' + d.classes : '');
        };
        break;
    }

    var barFill = (!params.gradient) ? barColor : function(d, i) {
      var p = {orientation: params.orientation || 'vertical', position: params.position || 'middle'};
      return bars.gradient()(d, d.seriesIndex, p);
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

  chart.showControls = function(_) {
    if (!arguments.length) { return false; }
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

  chart.tooltipContent = function(_) {
    if (!arguments.length) { return tooltipContent; }
    tooltipContent = _;
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
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        strings[prop] = _[prop];
      }
    }
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
      showTitle = false,
      showControls = false,
      showLegend = true,
      direction = 'ltr',
      delay = 0,
      duration = 0,
      tooltips = true,
      state = {},
      strings = {
        legend: {close: 'Hide legend', open: 'Show legend'},
        controls: {close: 'Hide controls', open: 'Show controls'},
        noData: 'No Data Available.',
        noLabel: 'undefined'
      },
      dispatch = d3.dispatch('chartClick', 'elementClick', 'tooltipShow', 'tooltipHide', 'tooltipMove', 'stateChange', 'changeState');

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var model = pie(),
      controls = menu().align('center'),
      legend = menu().align('center');

  var tt = null;

  var tooltipContent = function(key, x, y, e, graph) {
        return '<h3>' + key + '</h3>' +
               '<p>' + y + ' on ' + x + '</p>';
      };

  var showTooltip = function(eo, offsetElement, properties) {
        var key = model.getKey()(eo),
            y = model.getValue()(eo),
            x = properties.total ? (y * 100 / properties.total).toFixed(1) : 100,
            content = tooltipContent(key, x, y, eo, chart);

        return tooltip.show(eo.e, content, null, null, offsetElement);
      };

  var seriesClick = function(data, e, chart) { return; };

  //============================================================

  function chart(selection) {

    selection.each(function(chartData) {

      var that = this,
          container = d3.select(this),
          modelClass = 'pie';

      var properties = chartData ? chartData.properties : {},
          data = chartData ? chartData.data : null;

      var containerWidth = parseInt(container.style('width'), 10),
          containerHeight = parseInt(container.style('height'), 10);

      var xIsDatetime = chartData.properties.xDataType === 'datetime' || false,
          yIsCurrency = chartData.properties.yDataType === 'currency' || false;

      chart.update = function() {
        container.transition().duration(duration).call(chart);
      };

      chart.container = this;

      //------------------------------------------------------------
      // Private method for displaying no data message.

      function displayNoData(d) {
        var hasData = d && d.length,
            x = (containerWidth - margin.left - margin.right) / 2 + margin.left,
            y = (containerHeight - margin.top - margin.bottom) / 2 + margin.top;
        return utility.displayNoData(hasData, container, chart.strings().noData, x, y);
      }

      // Check to see if there's nothing to show.
      if (displayNoData(data)) {
        return chart;
      }

      //------------------------------------------------------------
      // Process data

      chart.clearActive = function() {
        data.map(function(d) {
          d.active = '';
          container.selectAll('.nv-series').classed('nv-inactive', false);
          return d;
        });
      };

      chart.seriesActivate = function(eo) {
        chart.dataSeriesActivate({series: data[eo.seriesIndex]});
      };

      chart.dataSeriesActivate = function(eo) {
        var series = eo.series;

        series.active = (!series.active || series.active === 'inactive') ? 'active' : 'inactive';

        // if you have activated a data series, inactivate the rest
        if (series.active === 'active') {
          data
            .filter(function(d) {
              return d.active !== 'active';
            })
            .map(function(d) {
              d.active = 'inactive';
              return d;
            });
        }

        // if there are no active data series, inactivate them all
        if (!data.filter(function(d) { return d.active === 'active'; }).length) {
          chart.clearActive();
        }

        container.call(chart);
      };

      // add series index to each data point for reference
      data.forEach(function(s, i) {
        var y = model.y();
        s.seriesIndex = i;

        if (!s.value && !s.values) {
          s.values = [];
        } else if (!isNaN(s.value)) {
          s.values = [{x: 0, y: parseInt(s.value, 10)}];
        }
        s.values.forEach(function(p, j) {
          p.index = j;
          p.series = s;
          if (typeof p.value == 'undefined') {
            p.value = y(p);
          }
        });

        s.value = s.value || d3.sum(s.values, function(p) { return p.value; });
        s.count = s.count || s.values.length;
        s.disabled = s.disabled || s.value === 0;
      });

      // only sum enabled series
      var modelData = data.filter(function(d, i) { return !d.disabled; });

      if (!modelData.length) {
        modelData = [{values: []}]; // safety array
      }

      properties.count = d3.sum(modelData, function(d) { return d.count; });

      properties.total = d3.sum(modelData, function(d) { return d.value; });

      // set title display option
      showTitle = showTitle && properties.title.length;

      //set state.disabled
      state.disabled = data.map(function(d) { return !!d.disabled; });

      //------------------------------------------------------------
      // Display No Data message if there's nothing to show.

      if (!properties.total) {
        displayNoData();
        return chart;
      }

      //------------------------------------------------------------
      // Main chart wrappers

      var wrap_bind = container.selectAll('g.sc-chart-wrap').data([modelData]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-chart-wrap sc-chart-' + modelClass);
      var wrap = container.select('.sc-chart-wrap').merge(wrap_entr);

      wrap_entr.append('rect').attr('class', 'sc-background')
        .attr('x', -margin.left)
        .attr('y', -margin.top)
        .attr('fill', '#FFF');

      wrap_entr.append('g').attr('class', 'sc-title-wrap');
      var title_wrap = wrap.select('.sc-title-wrap');

      wrap_entr.append('g').attr('class', 'sc-' + modelClass + '-wrap');
      var model_wrap = wrap.select('.sc-' + modelClass + '-wrap');

      wrap_entr.append('g').attr('class', 'sc-controls-wrap');
      var controls_wrap = wrap.select('.sc-controls-wrap');
      wrap_entr.append('g').attr('class', 'sc-legend-wrap');
      var legend_wrap = wrap.select('.sc-legend-wrap');

      //------------------------------------------------------------
      // Main chart draw

      chart.render = function() {

        // Chart layout variables
        var renderWidth, renderHeight,
            availableWidth, availableHeight,
            innerMargin,
            innerWidth, innerHeight;

        containerWidth = parseInt(container.style('width'), 10);
        containerHeight = parseInt(container.style('height'), 10);

        renderWidth = width || containerWidth || 960;
        renderHeight = height || containerHeight || 400;

        availableWidth = renderWidth - margin.left - margin.right;
        availableHeight = renderHeight - margin.top - margin.bottom;

        innerMargin = {top: 0, right: 0, bottom: 0, left: 0};
        innerWidth = availableWidth - innerMargin.left - innerMargin.right;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;

        wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        wrap.select('.sc-background')
          .attr('width', renderWidth)
          .attr('height', renderHeight);

        //------------------------------------------------------------
        // Title & Legend & Controls

        // Header variables
        var maxControlsWidth = 0,
            maxLegendWidth = 0,
            widthRatio = 0,
            headerHeight = 0,
            titleBBox = {width: 0, height: 0},
            controlsHeight = 0,
            legendHeight = 0,
            trans = '';

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
          legend
            .id('legend_' + chart.id())
            .strings(chart.strings().legend)
            .align('center')
            .height(availableHeight - innerMargin.top);
          legend_wrap
            .datum(data)
            .call(legend);
          legend
            .arrange(availableWidth);

          var legendLinkBBox = utility.getTextBBox(legend_wrap.select('.sc-menu-link')),
              legendSpace = availableWidth - titleBBox.width - 6,
              legendTop = showTitle && legend.collapsed() && legendSpace > legendLinkBBox.width ? true : false,
              xpos = direction === 'rtl' || !legend.collapsed() ? 0 : availableWidth - legend.width(),
              ypos = titleBBox.height;

          if (legendTop) {
            ypos = titleBBox.height - legend.height() / 2 - legendLinkBBox.height / 2;
          } else if (!showTitle) {
            ypos = - legend.margin().top;
          }

          legend_wrap
            .attr('transform', 'translate(' + xpos + ',' + ypos + ')');

          legendHeight = legendTop ? 12 : legend.height() - (showTitle ? 0 : legend.margin().top);
        }

        // Recalc inner margins based on title and legend height
        headerHeight += legendHeight;
        innerMargin.top += headerHeight;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;
        innerWidth = availableWidth - innerMargin.left - innerMargin.right;

        //------------------------------------------------------------
        // Main Chart Component(s)

        model
          .width(innerWidth)
          .height(innerHeight);

        model_wrap
          .datum(modelData)
          .attr('transform', 'translate(' + innerMargin.left + ',' + innerMargin.top + ')')
          .transition().duration(duration)
            .call(model);

      };

      //============================================================

      chart.render();

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      legend.dispatch.on('legendClick', function(d, i) {
        d.disabled = !d.disabled;
        d.active = false;

        // if there are no enabled data series, enable them all
        if (!data.filter(function(d) { return !d.disabled; }).length) {
          data.map(function(d) {
            d.disabled = false;
            return d;
          });
        }

        // if there are no active data series, activate them all
        if (!data.filter(function(d) { return d.active === 'active'; }).length) {
          data.map(function(d) {
            d.active = '';
            return d;
          });
        }

        state.disabled = data.map(function(d) { return !!d.disabled; });
        dispatch.call('stateChange', this, state);

        container.transition().duration(duration).call(chart);
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

        container.transition().duration(duration).call(chart);
      });

      dispatch.on('chartClick', function() {
        //dispatch.call('tooltipHide', this);
        if (controls.enabled()) {
          controls.dispatch.call('closeMenu', this);
        }
        if (legend.enabled()) {
          legend.dispatch.call('closeMenu', this);
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
  chart.legend = legend;
  chart.controls = controls;

  fc.rebind(chart, model, 'id', 'x', 'y', 'color', 'fill', 'classes', 'gradient', 'locality', 'textureFill');
  fc.rebind(chart, model, 'getKey', 'getValue', 'fmtKey', 'fmtValue', 'fmtCount');
  fc.rebind(chart, model, 'values', 'showLabels', 'showLeaders', 'donutLabelsOutside', 'pieLabelsOutside', 'labelThreshold');
  fc.rebind(chart, model, 'arcDegrees', 'rotateDegrees', 'minRadius', 'maxRadius', 'fixedRadius', 'startAngle', 'endAngle', 'donut', 'hole', 'holeFormat', 'donutRatio');

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
          return 'sc-series sc-series-' + d.seriesIndex + ' sc-fill' + iClass;
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

    var fill = (!params.gradient) ? color : function(d, i) {
      return model.gradient()(d, d.seriesIndex);
    };

    model.color(color);
    model.fill(fill);
    model.classes(classes);

    legend.color(color);
    legend.classes(classes);

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

  chart.showControls = function(_) {
    if (!arguments.length) { return showControls; }
    showControls = _;
    return chart;
  };

  chart.showLegend = function(_) {
    if (!arguments.length) { return showLegend; }
    showLegend = _;
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
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        strings[prop] = _[prop];
      }
    }
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    model.direction(_);
    legend.direction(_);
    controls.direction(_);
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

  chart.colorFill = function(_) {
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
      duration = 300,
      zoomExtents = {'min': 0.25, 'max': 2},
      nodeSize = {'width': 100, 'height': 50},
      nodeImgPath = '../img/',
      nodeRenderer = function(d) { return '<div class="sc-tree-node"></div>'; },
      zoomCallback = function(d) { return; },
      nodeCallback = function(d) { return; },
      nodeClick = function(d) { return; },
      horizontal = false;

  var id = Math.floor(Math.random() * 10000), //Create semi-unique ID in case user doesn't select one,
      color = function (d, i) { return utility.defaultColor()(d, i); },
      fill = function(d, i) { return color(d,i); },
      gradient = function(d, i) { return color(d,i); },

      setX = function(d, v) { d.x = v; },
      setY = function(d, v) { d.y = v; },
      setX0 = function(d, v) { d.data.x0 = v; },
      setY0 = function(d, v) { d.data.y0 = v; },

      getX = function(d) { return horizontal ? d.y : d.x; },
      getY = function(d) { return horizontal ? d.x : d.y; },
      getX0 = function(d) { return horizontal ? d.data.y0 : d.data.x0; },
      getY0 = function(d) { return horizontal ? d.data.x0 : d.data.y0; },

      getId = function(d) { return d.id || d.data.id; },

      fillGradient = function(d, i) {
          return utility.colorRadialGradient(d, i, 0, 0, '35%', '35%', color(d, i), wrap.select('defs'));
      },
      useClass = false,
      clipEdge = true,
      showLabels = true,
      dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout');

  //============================================================

  function chart(selection)
  {
    selection.each(function(data) {

      var that = this,
          container = d3.select(this);

      var tran = d3.transition('tree')
            .duration(duration)
            .ease(d3.easeLinear);

      var zoom = null;
      chart.setZoom = function() {
        zoom = d3.zoom()
          .scaleExtent([zoomExtents.min, zoomExtents.max])
          .on('zoom', function() {
            tree_wrap.attr('transform', 'translate(' + d3.event.transform.x + ',' + d3.event.transform.y + ')scale(' + d3.event.transform.k + ')');
            zoomCallback(d3.event.scale);
          });
      };
      chart.unsetZoom = function(argument) {
        zoom.on('zoom', null);
      };
      chart.resetZoom = function() {
        // chart.unSetZoom();
        // chart.setZoom();
        wrap.call(zoom.transform, d3.zoomIdentity);
        // tree_wrap.attr('transform', d3.zoomIdentity);
      };
      chart.setZoom();

      //------------------------------------------------------------
      // Setup svgs and skeleton of chart

      var availableSize = { // the size of the svg container minus margin
            'width': parseInt(container.style('width'), 10) - margin.left - margin.right,
            'height': parseInt(container.style('height'), 10) - margin.top - margin.bottom
          };

      var wrap_bind = container.selectAll('g.sc-chart-wrap').data([1]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-chart-wrap sc-chart-tree');
      var wrap = container.select('.sc-chart-wrap').merge(wrap_entr);

      wrap.call(zoom);

      var defs_entr = wrap_entr.append('defs');
      var defs = wrap.select('defs').merge(defs_entr);
      var node_shadow = utility.dropShadow('node_back_' + id, defs, {blur: 2});

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
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .style('fill', 'transparent');
      var backg = wrap.select('.sc-chart-background');

      var g_entr = wrap_entr.append('g').attr('class', 'sc-wrap');
      var tree_wrap = wrap.select('.sc-wrap');

      g_entr.append('g').attr('class', 'sc-tree');
      var treeChart = wrap.select('.sc-tree');

      var root = null;
      var nodeData = null;
      var linkData = null;
      var tree = d3.tree()
            .size([null, null])
            .nodeSize([(horizontal ? nodeSize.height : nodeSize.width), 1])
            .separation(function separation(a, b) {
              return a.parent == b.parent ? 1 : 1;
            });

      function grow() {
        root = d3.hierarchy(data, function(d) {
          return d.children;
        });

        tree(root); // apply tree structure to data

        nodeData = root.descendants();

        nodeData.forEach(function(d) {
          setY(d, d.depth * 2 * (horizontal ? nodeSize.width : nodeSize.height));
        });

        linkData = nodeData.slice(1);
      }

      function populate0(d) {
        setX0(d, getX(d));
        setY0(d, getY(d));
        if (d.children && d.children.length) {
          d.children.forEach(populate0);
        }
      }

      // Compute the new tree layout
      grow();
      // Then preset X0/Y0 values for transformations
      // Note: these cannot be combined because of chart.update
      // which doesn't repopulate X0/Y0 until after render
      populate0(root);

      chart.orientation = function(orientation) {
        horizontal = (orientation === 'horizontal' || !horizontal ? true : false);
        tree.nodeSize([(horizontal ? nodeSize.height : nodeSize.width), 1]);
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
        expandAll(data);
        chart.update(root);
      };

      chart.zoomStep = function(step) {
        var level = zoom.scale() + step;
        return this.zoomLevel(level);
      };

      chart.zoomLevel = function(level) {

        var scale = Math.min(Math.max(level, zoomExtents.min), zoomExtents.max),

            prevScale = zoom.scale(),
            prevTrans = zoom.translate(),
            treeBBox = backg.node().getBoundingClientRect();

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

        zoom.translate(translate).scale(scale);
        tree_wrap.attr('transform', 'translate(' + translate + ')scale(' + scale + ')');

        return scale;
      };

      chart.zoomScale = function() {
        return zoom.scale();
      };

      chart.filter = function(node) {
        var _data = {},
            found = false;

        function findNode(d) {
          if (getId(d) === node) {
            _data = d;
            found = true;
          } else if (!found && d.children) {
            d.children.forEach(findNode);
          }
        }

        // Initialize the display to show a few nodes.
        findNode(data);

        // _data.x0 = 0;
        // _data.y0 = 0;

        data = _data;

        grow();
        chart.update(root);
      };

      // source is either root or a selected node
      chart.update = function(source) {
        var target = {x: 0, y: 0};
        function diagonal(d, p) {
          var dy = getY(d) - (horizontal ? 0 : nodeSize.height - r * 3),
              dx = getX(d) - (horizontal ? nodeSize.width - r * 2 : 0),
              py = getY(p),
              px = getX(p),
              cdx = horizontal ? (dx + px) / 2 : dx,
              cdy = horizontal ? dy : (dy + py) / 2,
              cpx = horizontal ? (dx + px) / 2 : px,
              cpy = horizontal ? py : (dy + py) / 2;
          return "M" + dx + "," + dy
               + "C" + cdx + "," + cdy
               + " " + cpx + "," + cpy
               + " " + px + "," + py;
        }
        function initial(d) {
          // if the source is root
          if (getId(source) === getId(root)) {
            return diagonal(root, root);
          } else {
            var node = {x: getX0(source), y: getY0(source)};
            return diagonal(node, node);
          }
        }
        function extend(d) {
          return diagonal(d, d.parent);
        }
        function retract(d) {
          return diagonal(target, target);
        }

        // Toggle children.
        function toggle(data) {
          if (data.children) {
            data._children = data.children;
            data.children = null;
          } else {
            data.children = data._children;
            data._children = null;
          }
        }

        // Click tree node.
        function leafClick(d) {
          toggle(d.data);
          chart.update(d);
        }

        // Get the card id
        function getCardId(d) {
          var id = 'card-' + getId(d);
          return id;
        }

        // Get the link id
        function getLinkId(d) {
          var id = 'link-' + (d.parent ? getId(d.parent) : 0) + '-' + getId(d);
          return id;
        }

        grow();

        var nodeOffsetX = (horizontal ? r - nodeSize.width : nodeSize.width / -2) + 'px',
            nodeOffsetY = (horizontal ? (r - nodeSize.height) / 2 : r * 2 - nodeSize.height) + 'px';

        // Update the nodes…
        var nodes_bind = treeChart.selectAll('g.sc-card').data(nodeData, getId);

        // Enter any new nodes at the parent's previous position.
        var nodes_entr = nodes_bind.enter().insert('g')
              .attr('class', 'sc-card')
              .attr('id', getCardId)
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
            nodes_entr.each(function(d) {
              if (defs.select('#myshape-' + getId(d)).empty()) {
                var nodeObject = defs.append('svg').attr('class', 'sc-foreign-object')
                      .attr('id', 'myshape-' + getId(d))
                      .attr('version', '1.1')
                      .attr('xmlns', 'http://www.w3.org/2000/svg')
                      .attr('xmlns:xlink', 'http://www.w3.org/1999/xlink')
                      .attr('x', nodeOffsetX)
                      .attr('y', nodeOffsetY)
                      .attr('width', nodeSize.width + 'px')
                      .attr('height', nodeSize.height + 'px')
                      .attr('viewBox', '0 0 ' + nodeSize.width + ' ' + nodeSize.height)
                      .attr('xml:space', 'preserve');

                var nodeContent = nodeObject.append('g').attr('class', 'sc-tree-node-content')
                      .attr('transform', 'translate(' + r + ',' + r + ')');

                nodeRenderer(nodeContent, d, nodeSize.width - r * 2, nodeSize.height - r * 3);

                nodeContent.on('click', nodeClick);

                nodeCallback(nodeObject);
              }
            });
            // node content
            nodes_entr.append('use')
              .attr('xlink:href', function(d) {
                return '#myshape-' + getId(d);
              })
              .attr('filter', node_shadow);

        // node circle
        var xcCircle = nodes_entr.append('g').attr('class', 'sc-expcoll')
              .style('opacity', 1e-6)
              .on('click', leafClick);
            xcCircle.append('circle').attr('class', 'sc-circ-back')
              .attr('r', r);
            xcCircle.append('line').attr('class', 'sc-line-vert')
              .attr('x1', 0).attr('y1', 0.5 - r).attr('x2', 0).attr('y2', r - 0.5)
              .style('stroke', '#bbb');
            xcCircle.append('line').attr('class', 'sc-line-hrzn')
              .attr('x1', 0.5 - r).attr('y1', 0).attr('x2', r - 0.5).attr('y2', 0)
              .style('stroke', '#fff');

        //Transition nodes to their new position.
        var nodes = treeChart.selectAll('g.sc-card').merge(nodes_entr);
            nodes.transition(tran).duration(duration)
              .attr('opacity', 1)
              .attr('transform', function(d) {
                if (getId(source) === getId(d)) {
                  target = {x: horizontal ? getY(d) : getX(d), y: horizontal ? getX(d) : getY(d)};
                }
                return 'translate(' + getX(d) + ',' + getY(d) + ')';
              });
            nodes.select('.sc-expcoll')
              .style('opacity', function(d) {
                return ((d.data.children && d.data.children.length) || (d.data._children && d.data._children.length)) ? 1 : 0;
              });
            nodes.select('.sc-circ-back')
              .style('fill', function(d) {
                return (d.data._children && d.data._children.length) ? '#777' : (d.data.children ? '#bbb' : 'none');
              });
            nodes.select('.sc-line-vert')
              .style('stroke', function(d) {
                return (d.data._children && d.data._children.length) ? '#fff' : '#bbb';
              });
            nodes.each(function(d) {
              container.select('#myshape-' + getId(d))
                .attr('x', nodeOffsetX)
                .attr('y', nodeOffsetY);
            });

        // Transition exiting nodes to the parent's new position.
        var nodes_exit = nodes_bind.exit().transition(tran).duration(duration)
              .attr('opacity', 0)
              .attr('transform', function(d) {
                return 'translate(' + getX(target) + ',' + getY(target) + ')';
              })
              .remove();
            nodes_exit.selectAll('.sc-expcoll')
              .style('stroke-opacity', 1e-6);
            nodes_exit.selectAll('.sc-foreign-object')
              .attr('width', 1)
              .attr('height', 1)
              .attr('x', -1)
              .attr('y', -1);

        // Update the links
        var links_bind = treeChart.selectAll('path.link').data(linkData, getLinkId);
            // Enter any new links at the parent's previous position.
        var links_entr = links_bind.enter().insert('path', 'g')
              .attr('d', initial)
              .attr('class', 'link')
              .attr('id', getLinkId)
              .attr('opacity', 0);

        var links = treeChart.selectAll('path.link').merge(links_entr);
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
        populate0(root);

        chart.resize(getId(source) === getId(root));
      };

      chart.render = function() {
        chart.resize(true);
      };

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
        // treeChart.interrupt().selectAll("*").interrupt();

        treeChart
          .transition(tran).duration(initial ? 0 : duration)
          .attr('transform', 'translate(' + translate + ')scale(' + scale + ')');
      };

      chart.gradient(fillGradient);

      chart.update(root);

    });

    return chart;
  }

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;

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
  chart.gradient = function(_) {
    if (!arguments.length) { return gradient; }
    gradient = _;
    return chart;
  };
  chart.useClass = function(_) {
    if (!arguments.length) { return useClass; }
    useClass = _;
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

  chart.values = function(_) {
    if (!arguments.length) { return getValues; }
    getValues = _;
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

  chart.id = function(_) {
    if (!arguments.length) { return id; }
    id = _;
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

  chart.margin = function(_) {
    if (!arguments.length) { return margin; }
    margin = _;
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
      showTitle = false,
      showLegend = false,
      direction = 'ltr',
      tooltips = true,
      colorData = 'default',
      //create a clone of the d3 array
      colorArray = d3.scaleOrdinal(d3.schemeCategory20).range().map(utility.identity),
      x, //can be accessed via chart.xScale()
      y, //can be accessed via chart.yScale()
      strings = {
        legend: {close: 'Hide legend', open: 'Show legend'},
        controls: {close: 'Hide controls', open: 'Show controls'},
        noData: 'No Data Available.',
        noLabel: 'undefined'
      },
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'tooltipMove', 'elementMousemove');

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var model = treemap(),
      legend = menu();

  var tt = null;

  var tooltipContent = function(point) {
        var tt = '<h3>' + point.data.name + '</h3>' +
                 '<p>' + utility.numberFormatSI(point.value) + '</p>';
        return tt;
      };

  var showTooltip = function(eo, offsetElement) {
        var content = tooltipContent(eo.point);
        return tooltip.show(eo.e, content, null, null, offsetElement);
      };

  //============================================================

  function chart(selection) {
    selection.each(function(chartData) {

      var that = this,
          container = d3.select(this);

      var data = [chartData];

      var containerWidth = parseInt(container.style('width'), 10),
          containerHeight = parseInt(container.style('height'), 10);

      chart.update = function() { container.transition().duration(300).call(chart); };
      chart.container = this;

      //------------------------------------------------------------
      // Private method for displaying no data message.

      function displayNoData(d) {
        var hasData = d && d.length && d.filter(function(d) { return d && d.children && d.children.length; }).length,
            x = (containerWidth - margin.left - margin.right) / 2 + margin.left,
            y = (containerHeight - margin.top - margin.bottom) / 2 + margin.top;
        return utility.displayNoData(hasData, container, chart.strings().noData, x, y);
      }

      // Check to see if there's nothing to show.
      if (displayNoData(data)) {
        return chart;
      }

      //------------------------------------------------------------

      //remove existing colors from default color array, if any
      // if (colorData === 'data') {
      //   removeColors(data[0]);
      // }

      //------------------------------------------------------------
      // Main chart draw

      chart.render = function() {

        containerWidth = parseInt(container.style('width'), 10);
        containerHeight = parseInt(container.style('height'), 10);

        // Chart layout variables
        var renderWidth, renderHeight,
            availableWidth, availableHeight;

        renderWidth = width || containerWidth || 960;
        renderHeight = height || containerHeight || 400;
        availableWidth = renderWidth - margin.left - margin.right;
        availableHeight = renderHeight - margin.top - margin.bottom;

        // Header variables
        var maxControlsWidth = 0,
            maxLegendWidth = 0,
            widthRatio = 0,
            headerHeight = 0,
            titleBBox = {width: 0, height: 0},
            controlsHeight = 0,
            legendHeight = 0,
            trans = '';

        //------------------------------------------------------------
        // Setup containers and skeleton of chart

        var wrap_bind = container.selectAll('g.sc-chart-wrap').data(data);
        var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-chart-wrap sc-chart-treemap');
        var wrap = container.select('.sc-chart-wrap').merge(wrap_entr);

        wrap_entr.append('rect').attr('class', 'sc-background')
          .attr('x', -margin.left)
          .attr('y', -margin.top)
          .attr('fill', '#FFF');

        wrap.select('.sc-background')
          .attr('width', renderWidth)
          .attr('height', renderHeight);

        wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        //------------------------------------------------------------
        // Title & Legend

        var titleHeight = 0,
            legendHeight = 0;

        if (showLegend) {
          g_entr.append('g').attr('class', 'sc-legendWrap');

          legend
            .id('legend_' + chart.id())
            .strings(chart.strings().legend)
            .width(availableWidth + margin.left)
            .height(availableHeight);

          g.select('.sc-legendWrap')
            .datum(data)
            .call(legend);

          legendHeight = legend.height() + 10;

          if (margin.top !== legendHeight + titleHeight) {
            margin.top = legendHeight + titleHeight;
            availableHeight = renderHeight - margin.top - margin.bottom;
          }

          g.select('.sc-legendWrap')
            .attr('transform', 'translate(' + (-margin.left) + ',' + (-margin.top) + ')');
        }

        if (showTitle && properties.title) {
          g_entr.append('g').attr('class', 'sc-title-wrap');

          g.select('.sc-title').remove();

          g.select('.sc-title-wrap')
            .append('text')
              .attr('class', 'sc-title')
              .attr('x', 0)
              .attr('y', 0)
              .attr('text-anchor', 'start')
              .text(properties.title)
              .attr('stroke', 'none')
              .attr('fill', 'black');

          titleHeight = parseInt(g.select('.sc-title').style('height'), 10) +
            parseInt(g.select('.sc-title').style('margin-top'), 10) +
            parseInt(g.select('.sc-title').style('margin-bottom'), 10);

          if (margin.top !== titleHeight + legendHeight) {
            margin.top = titleHeight + legendHeight;
            availableHeight = renderHeight - margin.top - margin.bottom;
          }

          g.select('.sc-title-wrap')
            .attr('transform', 'translate(0,' + (-margin.top + parseInt(g.select('.sc-title').style('height'), 10)) + ')');
        }

        //------------------------------------------------------------
        // Main Chart Component(s)

        model
          .width(availableWidth)
          .height(availableHeight);

        wrap
          .datum(data.filter(function(d) { return !d.disabled; }))
          .transition()
            .call(model);

      };

      //============================================================

      chart.render();

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      legend.dispatch.on('legendClick', function(d, i) {
        d.disabled = !d.disabled;

        if (!data.filter(function(d) { return !d.disabled; }).length) {
          data.map(function(d) {
            d.disabled = false;
            wrap.selectAll('.sc-series').classed('disabled', false);
            return d;
          });
        }

        container.transition().duration(300).call(chart);
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

  model.dispatch.on('elementMouseover', function(eo) {
    dispatch.call('tooltipShow', this, eo);
  });

  model.dispatch.on('elementMousemove', function(e) {
    dispatch.call('tooltipMove', this, e);
  });

  model.dispatch.on('elementMouseout', function() {
    dispatch.call('tooltipHide', this);
  });

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.dispatch = dispatch;
  chart.legend = legend;
  chart.treemap = model;

  fc.rebind(chart, model, 'x', 'y', 'xDomain', 'yDomain', 'id', 'delay', 'leafClick', 'getValue', 'getKey', 'groups', 'duration', 'color', 'fill', 'classes', 'gradient', 'direction');

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

    var fill = (!params.gradient) ? color : function(d, i) {
      var p = {orientation: params.orientation || 'horizontal', position: params.position || 'base'};
      return model.gradient()(d, i, p);
    };

    model.color(color);
    model.fill(fill);
    model.classes(classes);

    legend.color(color);
    legend.classes(classes);

    colorData = arguments[0];

    return chart;
  };

  chart.x = function(_) {
    if (!arguments.length) { return getX; }
    getX = _;
    model.x(_);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) { return getY; }
    getY = _;
    model.y(_);
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) { return margin; }
    margin.top    = typeof _.top    !== 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  !== 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom !== 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   !== 'undefined' ? _.left   : margin.left;
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
    if (!arguments.length) {
      return strings;
    }
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        strings[prop] = _[prop];
      }
    }
    return chart;
  };

  //============================================================

  return chart;
}

/*-------------------
       CHARTS
-------------------*/

const charts = {
    areaChart: stackeareaChart,
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
const dev = false; // set false when in production
const build = 'scr'; // set scr for sucrose and sgr for Sugar

exports.development = dev;
exports.build = build;
exports.version = version;
exports.utility = utility;
exports.utils = utility;
exports.tooltip = tooltip;
exports.models = models;
exports.charts = charts;

Object.defineProperty(exports, '__esModule', { value: true });

})));
