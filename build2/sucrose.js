(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3')) :
  typeof define === 'function' && define.amd ? define(['exports', 'd3'], factory) :
  (factory((global.sucrose = global.sucrose || {}),global.d3));
}(this, (function (exports,d3$1) { 'use strict';

d3$1 = 'default' in d3$1 ? d3$1['default'] : d3$1;

var regexify = (strsOrRegexes) =>
    strsOrRegexes.map((strOrRegex) =>
        typeof strOrRegex === 'string' ? new RegExp(`^${strOrRegex}$`) : strOrRegex
    );

var include = (...inclusions) => {
    inclusions = regexify(inclusions);
    return (name) =>
      inclusions.some((inclusion) => inclusion.test(name)) && name;
};

const createTransform = (transforms) =>
    (name) => transforms.reduce(
        (name, fn) => name && fn(name),
        name
    );

const createReboundMethod = (target, source, name) => {
    const method = source[name];
    if (typeof method !== 'function') {
        throw new Error(`Attempt to rebind ${name} which isn't a function on the source object`);
    }
    return (...args) => {
        var value = method.apply(source, args);
        return value === source ? target : value;
    };
};

var rebindAll = (target, source, ...transforms) => {
    const transform = createTransform(transforms);
    for (const name of Object.keys(source)) {
        const result = transform(name);
        if (result) {
            target[result] = createReboundMethod(target, source, name);
        }
    }
    return target;
};

var rebind = (target, source, ...names) =>
    rebindAll(target, source, include(...names));

var exclude = (...exclusions) => {
    exclusions = regexify(exclusions);
    return (name) =>
        exclusions.every((exclusion) => !exclusion.test(name)) && name;
};

var includeMap = (mappings) => (name) => mappings[name];

const capitalizeFirstLetter = (str) => str[0].toUpperCase() + str.slice(1);

var prefix = (prefix) => (name) => prefix + capitalizeFirstLetter(name);

var utils = {};

utils.strip = function(s) {
  return s.replace(/(\s|&)/g,'');
};

utils.identity = function(d) {
  return d;
};

utils.functor = function functor(v) {
  return typeof v === "function" ? v : function() {
    return v;
  };
};

utils.daysInMonth = function(month, year) {
  return (new Date(year, month+1, 0)).getDate();
};

utils.windowSize = function () {
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
// utils.windowResize = function (fun)
// {
//   var oldresize = window.onresize;

//   window.onresize = function (e) {
//     if (typeof oldresize == 'function') oldresize(e);
//     fun(e);
//   }
// }

utils.windowResize = function (fun) {
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

utils.windowUnResize = function (fun) {
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

utils.resizeOnPrint = function (fn) {
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

utils.unResizeOnPrint = function (fn) {
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
utils.getColor = function (color) {
    if (!arguments.length) {
      //if you pass in nothing, get default colors back
      return utils.defaultColor();
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
utils.defaultColor = function () {
    var colors = d3$1.scaleOrdinal(d3$1.schemeCategory20).range();
    return function (d, i) {
      return d.color || colors[i % colors.length];
    };
};


// Returns a color function that takes the result of 'getKey' for each series and
// looks for a corresponding color from the dictionary,
utils.customTheme = function (dictionary, getKey, defaultColors) {
  getKey = getKey || function (series) { return series.key; }; // use default series.key if getKey is undefined
  defaultColors = defaultColors || d3$1.scaleOrdinal(d3$1.schemeCategory20).range(); //default color function

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
utils.pjax = function (links, content) {
  d3$1.selectAll(links).on("click", function () {
    history.pushState(this.href, this.textContent, this.href);
    load(this.href);
    d3$1.event.preventDefault();
  });

  function load(href) {
    d3$1.html(href, function (fragment) {
      var target = d3$1.select(content).node();
      target.parentNode.replaceChild(d3$1.select(fragment).select(content).node(), target);
      utils.pjax(links, content);
    });
  }

  d3$1.select(window).on("popstate", function () {
    if (d3$1.event.state) { load(d3$1.event.state); }
  });
};

/* Numbers that are undefined, null or NaN, convert them to zeros.
*/
utils.NaNtoZero = function(n) {
    if (typeof n !== 'number'
        || isNaN(n)
        || n === null
        || n === Infinity) return 0;

    return n;
};

/*
Snippet of code you can insert into each utils.models.* to give you the ability to
do things like:
chart.options({
  showXAxis: true,
  tooltips: true
});

To enable in the chart:
chart.options = utils.optionsFunc.bind(chart);
*/
utils.optionsFunc = function(args) {
    if (args) {
      d3$1.map(args).forEach((function(key,value) {
        if (typeof this[key] === "function") {
           this[key](value);
        }
      }).bind(this));
    }
    return this;
};


//SUGAR ADDITIONS

//gradient color
utils.colorLinearGradient = function (d, i, p, c, defs) {
  var id = 'lg_gradient_' + i;
  var grad = defs.select('#' + id);
  if ( grad.empty() )
  {
    if (p.position === 'middle')
    {
      utils.createLinearGradient( id, p, defs, [
        { 'offset': '0%',  'stop-color': d3$1.rgb(c).darker().toString(),  'stop-opacity': 1 },
        { 'offset': '20%', 'stop-color': d3$1.rgb(c).toString(), 'stop-opacity': 1 },
        { 'offset': '50%', 'stop-color': d3$1.rgb(c).brighter().toString(), 'stop-opacity': 1 },
        { 'offset': '80%', 'stop-color': d3$1.rgb(c).toString(), 'stop-opacity': 1 },
        { 'offset': '100%','stop-color': d3$1.rgb(c).darker().toString(),  'stop-opacity': 1 }
      ]);
    }
    else
    {
      utils.createLinearGradient( id, p, defs, [
        { 'offset': '0%',  'stop-color': d3$1.rgb(c).darker().toString(),  'stop-opacity': 1 },
        { 'offset': '50%', 'stop-color': d3$1.rgb(c).toString(), 'stop-opacity': 1 },
        { 'offset': '100%','stop-color': d3$1.rgb(c).brighter().toString(), 'stop-opacity': 1 }
      ]);
    }
  }
  return 'url(#'+ id +')';
};

// defs:definition container
// id:dynamic id for arc
// radius:outer edge of gradient
// stops: an array of attribute objects
utils.createLinearGradient = function (id, params, defs, stops) {
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

utils.colorRadialGradient = function (d, i, p, c, defs) {
  var id = 'rg_gradient_' + i;
  var grad = defs.select('#' + id);
  if ( grad.empty() )
  {
    utils.createRadialGradient( id, p, defs, [
      { 'offset': p.s, 'stop-color': d3$1.rgb(c).brighter().toString(), 'stop-opacity': 1 },
      { 'offset': '100%','stop-color': d3$1.rgb(c).darker().toString(), 'stop-opacity': 1 }
    ]);
  }
  return 'url(#' + id + ')';
};

utils.createRadialGradient = function (id, params, defs, stops) {
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

utils.getAbsoluteXY = function (element) {
  var viewportElement = document.documentElement;
  var box = element.getBoundingClientRect();
  var scrollLeft = viewportElement.scrollLeft + document.body.scrollLeft;
  var scrollTop = viewportElement.scrollTop + document.body.scrollTop;
  var x = box.left + scrollLeft;
  var y = box.top + scrollTop;

  return {'left': x, 'top': y};
};

// Creates a rectangle with rounded corners
utils.roundedRectangle = function (x, y, width, height, radius) {
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

utils.dropShadow = function (id, defs, options) {
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
//   <rect width="90" height="90" stroke="green" stroke-width="3"
//   fill="yellow" filter="url(#f1)" />
// </svg>

utils.stringSetLengths = function(_data, _container, _format, classes, styles) {
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

utils.stringSetThickness = function(_data, _container, _format, classes, styles) {
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

utils.maxStringSetLength = function(_data, _container, _format) {
  var lengths = utils.stringSetLengths(_data, _container, _format);
  return d3$1.max(lengths);
};

utils.stringEllipsify = function(_string, _container, _length) {
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

utils.getTextBBox = function(text, floats) {
  var bbox = text.node().getBoundingClientRect(),
      size = {
        width: floats ? bbox.width : parseInt(bbox.width, 10),
        height: floats ? bbox.height : parseInt(bbox.height, 10)
      };
  return size;
};

utils.getTextContrast = function(c, i, callback) {
  var back = c,
      backLab = d3$1.lab(back),
      backLumen = backLab.l,
      textLumen = backLumen > 60 ?
        backLab.darker(4 + (backLumen - 75) / 25).l : // (50..100)[1 to 3.5]
        backLab.brighter(4 + (18 - backLumen) / 25).l, // (0..50)[3.5..1]
      textLab = d3$1.lab(textLumen, 0, 0),
      text = textLab.toString();
  if (callback) {
    callback(backLab, textLab);
  }
  return text;
};

utils.isRTLChar = function(c) {
  var rtlChars_ = '\u0591-\u07FF\uFB1D-\uFDFF\uFE70-\uFEFC',
      rtlCharReg_ = new RegExp('[' + rtlChars_ + ']');
  return rtlCharReg_.test(c);
};

utils.polarToCartesian = function(centerX, centerY, radius, angleInDegrees) {
  var angleInRadians = utils.angleToRadians(angleInDegrees);
  var x = centerX + radius * Math.cos(angleInRadians);
  var y = centerY + radius * Math.sin(angleInRadians);
  return [x, y];
};

utils.angleToRadians = function(angleInDegrees) {
  return angleInDegrees * Math.PI / 180.0;
};

utils.angleToDegrees = function(angleInRadians) {
  return angleInRadians * 180.0 / Math.PI;
};

utils.createTexture = function(defs, id, x, y) {
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

// utils.numberFormatSI = function(d, p, c, l) {
//     var fmtr, spec, si;
//     if (isNaN(d)) {
//         return d;
//     }
//     p = typeof p === 'undefined' ? 2 : p;
//     c = typeof c === 'undefined' ? false : !!c;
//     fmtr = typeof l === 'undefined' ? d3.format : d3.formatLocale(l).format;
//     // d = d3.round(d, p);
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

utils.numberFormatSI = function(d, p, c, l) {
    var fmtr, spec;
    if (isNaN(d) || d === 0) {
        return d;
    }
    p = typeof p === 'undefined' ? 2 : p;
    c = typeof c === 'undefined' ? false : !!c;
    fmtr = typeof l === 'undefined' ? d3$1.format : d3$1.formatLocale(l).format;
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

utils.numberFormatRound = function(d, p, c, l) {
    var fmtr, spec;
    if (isNaN(d)) {
      return d;
    }
    c = typeof c === 'undefined' ? false : !!c;
    p = typeof p === 'undefined' ? c ? 2 : 0 : p;
    fmtr = typeof l === 'undefined' ? d3$1.format : d3$1.formatLocale(l).format;
    spec = c ? '$,.' + p + 'f' : ',';
    return fmtr(spec)(d);
};

utils.isValidDate = function(d) {
    var testDate;
    if (!d) {
      return false;
    }
    testDate = new Date(d);
    return testDate instanceof Date && !isNaN(testDate.valueOf());
};

utils.dateFormat = function(d, p, l) {
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
      locale = utils.buildLocality(l);
      fmtr = d3$1.timeFormatLocale(locale).format;
      spec = p.indexOf('%') !== -1 ? p : locale[p] || '%x';
      // TODO: if not explicit pattern provided, we should use .multi()
    }
    return fmtr(spec)(date);
};

utils.buildLocality = function(l, d) {
    var locale = l || {},
        deep = !!d,
        unfer = function(a) {
          return a.join('|').split('|').map(function(b) {
            return !(b) ? '' : isNaN(b) ? b : +b;
          });
        },
        definition = {
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

utils.displayNoData = function (hasData, container, label, x, y) {
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
      .text(utils.identity);
    container.selectAll('.sc-chart-wrap').remove();
    return true;
  } else {
    return false;
  }
};


// export {utils as default};

// import d3 from 'd3';
var legend = function() {

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
        return utils.defaultColor()(d, d.seriesIndex);
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
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-wrap sc-legend');
      var wrap = container.select('g.sc-wrap').merge(wrap_entr);
      wrap.attr('transform', 'translate(0,0)');

      var defs_entr = wrap_entr.append('defs');
      var defs = wrap.select('defs');

      defs_entr.append('clipPath').attr('id', 'sc-edge-clip-' + id).append('rect');
      var clip = wrap.select('#sc-edge-clip-' + id + ' rect');

      wrap_entr.append('rect').attr('class', 'sc-legend-background');
      var back = wrap.select('.sc-legend-background');
      var backFilter = utils.dropShadow('legend_back_' + id, defs, {blur: 2});

      wrap_entr.append('text').attr('class', 'sc-legend-link');
      var link = wrap.select('.sc-legend-link');

      var mask_entr = wrap_entr.append('g').attr('class', 'sc-legend-mask');
      var mask = wrap.select('.sc-legend-mask');

      mask_entr.append('g').attr('class', 'sc-group');
      var g = wrap.select('.sc-group');

      var series_bind = g.selectAll('.sc-series').data(utils.identity, function(d) { return d.seriesIndex; });
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
                    .subject(utils.identity)
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
    color = utils.getColor(_);
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
};

// import d3 from 'd3';
var funnel = function() {

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
      locality = utils.buildLocality(),
      direction = 'ltr',
      delay = 0,
      duration = 0,
      color = function(d, i) { return utils.defaultColor()(d.series, d.seriesIndex); },
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
      chart.gradient = function(d, i, p) {
        return utils.colorLinearGradient(d, id + '-' + i, p, color(d, i), wrap.select('defs'));
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
      var wrap = container.select('.sc-wrap').merge(wrap_entr);

      var defs_entr = wrap_entr.append('defs');

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      //------------------------------------------------------------
      // Definitions

      if (textureFill) {
        var mask = utils.createTexture(defs_entr, id);
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

        lbl.text(utils.stringEllipsify(text, container, maxWidth))
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
        return utils.getTextContrast(backColor, i);
      }

      function fmtDirection(d) {
        var m = utils.isRTLChar(d.slice(-1)),
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
    if (!arguments.length) {
      return id;
    }
    id = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) {
      return color;
    }
    color = _;
    return chart;
  };
  chart.fill = function(_) {
    if (!arguments.length) {
      return fill;
    }
    fill = _;
    return chart;
  };
  chart.classes = function(_) {
    if (!arguments.length) {
      return classes;
    }
    classes = _;
    return chart;
  };
  chart.gradient = function(_) {
    if (!arguments.length) {
      return gradient;
    }
    chart.gradient = _;
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) {
      return margin;
    }
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
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

  chart.x = function(_) {
    if (!arguments.length) {
      return getX;
    }
    getX = _;
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) {
      return getY;
    }
    getY = utils.functor(_);
    return chart;
  };

  chart.getKey = function(_) {
    if (!arguments.length) {
      return getKey;
    }
    getKey = _;
    return chart;
  };

  chart.getValue = function(_) {
    if (!arguments.length) {
      return getValue;
    }
    getValue = _;
    return chart;
  };

  chart.fmtKey = function(_) {
    if (!arguments.length) {
      return fmtKey;
    }
    fmtKey = _;
    return chart;
  };

  chart.fmtValue = function(_) {
    if (!arguments.length) {
      return fmtValue;
    }
    fmtValue = _;
    return chart;
  };

  chart.fmtCount = function(_) {
    if (!arguments.length) {
      return fmtCount;
    }
    fmtCount = _;
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) {
      return direction;
    }
    direction = _;
    return chart;
  };

  chart.delay = function(_) {
    if (!arguments.length) {
      return delay;
    }
    delay = _;
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) {
      return duration;
    }
    duration = _;
    return chart;
  };

  chart.textureFill = function(_) {
    if (!arguments.length) {
      return textureFill;
    }
    textureFill = _;
    return chart;
  };

  chart.locality = function(_) {
    if (!arguments.length) {
      return locality;
    }
    locality = utils.buildLocality(_);
    return chart;
  };

  chart.xScale = function(_) {
    if (!arguments.length) {
      return x;
    }
    x = _;
    return chart;
  };

  chart.yScale = function(_) {
    if (!arguments.length) {
      return y;
    }
    y = _;
    return chart;
  };

  chart.yDomain = function(_) {
    if (!arguments.length) {
      return yDomain;
    }
    yDomain = _;
    return chart;
  };

  chart.forceY = function(_) {
    if (!arguments.length) {
      return forceY;
    }
    forceY = _;
    return chart;
  };

  chart.wrapLabels = function(_) {
    if (!arguments.length) {
      return wrapLabels;
    }
    wrapLabels = _;
    return chart;
  };

  chart.minLabelWidth = function(_) {
    if (!arguments.length) {
      return minLabelWidth;
    }
    minLabelWidth = _;
    return chart;
  };

  //============================================================

  return chart;
};

// import d3 from 'd3';
var funnelChart = function() {

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
      tooltip = null,
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

  var funnel$$1 = sucrose.funnel(),
      model = funnel$$1,
      controls = sucrose.legend().align('center'),
      legend$$1 = sucrose.legend().align('center');

  var tooltipContent = function(key, x, y, e, graph) {
        return '<h3>' + key + '</h3>' +
               '<p>' + y + ' on ' + x + '</p>';
      };

  var showTooltip = function(eo, offsetElement, properties) {
        var key = model.getKey()(eo),
            y = model.getValue()(eo),
            x = properties.total ? (y * 100 / properties.total).toFixed(1) : 100,
            content = tooltipContent(key, x, y, eo, chart);

        return sucrose.tooltip.show(eo.e, content, null, null, offsetElement);
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
        return utils.displayNoData(hasData, container, chart.strings().noData, x, y);
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
          data.map(function(d) {
            d.active = '';
            return d;
          });
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

          titleBBox = utils.getTextBBox(title_wrap.select('.sc-title'));
          headerHeight += titleBBox.height;
        }

        if (showLegend) {
          legend$$1
            .id('legend_' + chart.id())
            .strings(chart.strings().legend)
            .align('center')
            .height(availableHeight - innerMargin.top);
          legend_wrap
            .datum(data)
            .call(legend$$1);
          legend$$1
            .arrange(availableWidth);

          var legendLinkBBox = utils.getTextBBox(legend_wrap.select('.sc-legend-link')),
              legendSpace = availableWidth - titleBBox.width - 6,
              legendTop = showTitle && legend$$1.collapsed() && legendSpace > legendLinkBBox.width ? true : false,
              xpos = direction === 'rtl' || !legend$$1.collapsed() ? 0 : availableWidth - legend$$1.width(),
              ypos = titleBBox.height;

          if (legendTop) {
            ypos = titleBBox.height - legend$$1.height() / 2 - legendLinkBBox.height / 2;
          } else if (!showTitle) {
            ypos = - legend$$1.margin().top;
          }

          legend_wrap
            .attr('transform', 'translate(' + xpos + ',' + ypos + ')');

          legendHeight = legendTop ? 12 : legend$$1.height() - (showTitle ? 0 : legend$$1.margin().top);
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

      legend$$1.dispatch.on('legendClick', function(d, i) {
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
          tooltip = showTooltip(eo, that.parentNode, properties);
        }
      });

      dispatch.on('tooltipMove', function(e) {
        if (tooltip) {
          sucrose.tooltip.position(that.parentNode, tooltip, e);
        }
      });

      dispatch.on('tooltipHide', function() {
        if (tooltips) {
          sucrose.tooltip.cleanup();
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
        if (legend$$1.enabled()) {
          legend$$1.dispatch.call('closeMenu', this);
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
  chart.funnel = funnel$$1;
  chart.legend = legend$$1;
  chart.controls = controls;

  fc.rebind(chart, model, 'id', 'x', 'y', 'color', 'fill', 'classes', 'gradient', 'locality', 'textureFill');
  fc.rebind(chart, model, 'getKey', 'getValue', 'fmtKey', 'fmtValue', 'fmtCount');
  fc.rebind(chart, funnel$$1, 'xScale', 'yScale', 'yDomain', 'forceY', 'wrapLabels', 'minLabelWidth');

  chart.colorData = function(_) {
    var type = arguments[0],
        params = arguments[1] || {};
    var color = function(d, i) {
          return utils.defaultColor()(d, d.seriesIndex);
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
          return utils.defaultColor()(d, d.seriesIndex);
        };
        classes = function(d, i) {
          return 'sc-series sc-series-' + d.seriesIndex + (d.classes ? ' ' + d.classes : '');
        };
        break;
    }

    var fill = (!params.gradient) ? color : function(d, i) {
      var p = {orientation: params.orientation || 'vertical', position: params.position || 'middle'};
      return model.gradient(d, d.seriesIndex, p);
    };

    model.color(color);
    model.fill(fill);
    model.classes(classes);

    legend$$1.color(color);
    legend$$1.classes(classes);

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

  chart.tooltip = function(_) {
    if (!arguments.length) { return tooltip; }
    tooltip = _;
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
    legend$$1.direction(_);
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
};

var ver = "0.0.2"; //change to 0.0.3 when ready
var dev = false; //set false when in production
var asdf = d3$1.select('div');

exports.version = ver;
exports.development = dev;
exports.utils = utils;
exports.legend = legend;
exports.funnel = funnel;
exports.funnelChart = funnelChart;
exports.rebind = rebind;
exports.rebindAll = rebindAll;
exports.exclude = exclude;
exports.include = include;
exports.includeMap = includeMap;
exports.prefix = prefix;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3Vjcm9zZS5qcyIsInNvdXJjZXMiOlsiLi4vbm9kZV9tb2R1bGVzL2QzZmMtcmViaW5kL3NyYy90cmFuc2Zvcm0vcmVnZXhpZnkuanMiLCIuLi9ub2RlX21vZHVsZXMvZDNmYy1yZWJpbmQvc3JjL3RyYW5zZm9ybS9pbmNsdWRlLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2QzZmMtcmViaW5kL3NyYy9yZWJpbmRBbGwuanMiLCIuLi9ub2RlX21vZHVsZXMvZDNmYy1yZWJpbmQvc3JjL3JlYmluZC5qcyIsIi4uL25vZGVfbW9kdWxlcy9kM2ZjLXJlYmluZC9zcmMvdHJhbnNmb3JtL2V4Y2x1ZGUuanMiLCIuLi9ub2RlX21vZHVsZXMvZDNmYy1yZWJpbmQvc3JjL3RyYW5zZm9ybS9pbmNsdWRlTWFwLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2QzZmMtcmViaW5kL3NyYy90cmFuc2Zvcm0vcHJlZml4LmpzIiwiLi4vc3JjL3V0aWxzLmpzIiwiLi4vc3JjL21vZGVscy9sZWdlbmQuanMiLCIuLi9zcmMvbW9kZWxzL2Z1bm5lbC5qcyIsIi4uL3NyYy9tb2RlbHMvZnVubmVsQ2hhcnQuanMiLCIuLi9zcmMvbWFpbi5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZGVmYXVsdCAoc3Ryc09yUmVnZXhlcykgPT5cbiAgICBzdHJzT3JSZWdleGVzLm1hcCgoc3RyT3JSZWdleCkgPT5cbiAgICAgICAgdHlwZW9mIHN0ck9yUmVnZXggPT09ICdzdHJpbmcnID8gbmV3IFJlZ0V4cChgXiR7c3RyT3JSZWdleH0kYCkgOiBzdHJPclJlZ2V4XG4gICAgKTtcbiIsImltcG9ydCByZWdleGlmeSBmcm9tICcuL3JlZ2V4aWZ5JztcblxuZXhwb3J0IGRlZmF1bHQgKC4uLmluY2x1c2lvbnMpID0+IHtcbiAgICBpbmNsdXNpb25zID0gcmVnZXhpZnkoaW5jbHVzaW9ucyk7XG4gICAgcmV0dXJuIChuYW1lKSA9PlxuICAgICAgaW5jbHVzaW9ucy5zb21lKChpbmNsdXNpb24pID0+IGluY2x1c2lvbi50ZXN0KG5hbWUpKSAmJiBuYW1lO1xufTtcbiIsImNvbnN0IGNyZWF0ZVRyYW5zZm9ybSA9ICh0cmFuc2Zvcm1zKSA9PlxuICAgIChuYW1lKSA9PiB0cmFuc2Zvcm1zLnJlZHVjZShcbiAgICAgICAgKG5hbWUsIGZuKSA9PiBuYW1lICYmIGZuKG5hbWUpLFxuICAgICAgICBuYW1lXG4gICAgKTtcblxuY29uc3QgY3JlYXRlUmVib3VuZE1ldGhvZCA9ICh0YXJnZXQsIHNvdXJjZSwgbmFtZSkgPT4ge1xuICAgIGNvbnN0IG1ldGhvZCA9IHNvdXJjZVtuYW1lXTtcbiAgICBpZiAodHlwZW9mIG1ldGhvZCAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEF0dGVtcHQgdG8gcmViaW5kICR7bmFtZX0gd2hpY2ggaXNuJ3QgYSBmdW5jdGlvbiBvbiB0aGUgc291cmNlIG9iamVjdGApO1xuICAgIH1cbiAgICByZXR1cm4gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgdmFyIHZhbHVlID0gbWV0aG9kLmFwcGx5KHNvdXJjZSwgYXJncyk7XG4gICAgICAgIHJldHVybiB2YWx1ZSA9PT0gc291cmNlID8gdGFyZ2V0IDogdmFsdWU7XG4gICAgfTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0ICh0YXJnZXQsIHNvdXJjZSwgLi4udHJhbnNmb3JtcykgPT4ge1xuICAgIGNvbnN0IHRyYW5zZm9ybSA9IGNyZWF0ZVRyYW5zZm9ybSh0cmFuc2Zvcm1zKTtcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgT2JqZWN0LmtleXMoc291cmNlKSkge1xuICAgICAgICBjb25zdCByZXN1bHQgPSB0cmFuc2Zvcm0obmFtZSk7XG4gICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgIHRhcmdldFtyZXN1bHRdID0gY3JlYXRlUmVib3VuZE1ldGhvZCh0YXJnZXQsIHNvdXJjZSwgbmFtZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldDtcbn07XG4iLCJpbXBvcnQgaW5jbHVkZSBmcm9tICcuL3RyYW5zZm9ybS9pbmNsdWRlJztcbmltcG9ydCByZWJpbmRBbGwgZnJvbSAnLi9yZWJpbmRBbGwnO1xuXG5leHBvcnQgZGVmYXVsdCAodGFyZ2V0LCBzb3VyY2UsIC4uLm5hbWVzKSA9PlxuICAgIHJlYmluZEFsbCh0YXJnZXQsIHNvdXJjZSwgaW5jbHVkZSguLi5uYW1lcykpO1xuIiwiaW1wb3J0IHJlZ2V4aWZ5IGZyb20gJy4vcmVnZXhpZnknO1xuXG5leHBvcnQgZGVmYXVsdCAoLi4uZXhjbHVzaW9ucykgPT4ge1xuICAgIGV4Y2x1c2lvbnMgPSByZWdleGlmeShleGNsdXNpb25zKTtcbiAgICByZXR1cm4gKG5hbWUpID0+XG4gICAgICAgIGV4Y2x1c2lvbnMuZXZlcnkoKGV4Y2x1c2lvbikgPT4gIWV4Y2x1c2lvbi50ZXN0KG5hbWUpKSAmJiBuYW1lO1xufTtcbiIsImV4cG9ydCBkZWZhdWx0IChtYXBwaW5ncykgPT4gKG5hbWUpID0+IG1hcHBpbmdzW25hbWVdO1xuIiwiY29uc3QgY2FwaXRhbGl6ZUZpcnN0TGV0dGVyID0gKHN0cikgPT4gc3RyWzBdLnRvVXBwZXJDYXNlKCkgKyBzdHIuc2xpY2UoMSk7XG5cbmV4cG9ydCBkZWZhdWx0IChwcmVmaXgpID0+IChuYW1lKSA9PiBwcmVmaXggKyBjYXBpdGFsaXplRmlyc3RMZXR0ZXIobmFtZSk7XG4iLCJpbXBvcnQgZDMgZnJvbSAnZDMnO1xuXG52YXIgdXRpbHMgPSB7fTtcblxudXRpbHMuc3RyaXAgPSBmdW5jdGlvbihzKSB7XG4gIHJldHVybiBzLnJlcGxhY2UoLyhcXHN8JikvZywnJyk7XG59O1xuXG51dGlscy5pZGVudGl0eSA9IGZ1bmN0aW9uKGQpIHtcbiAgcmV0dXJuIGQ7XG59O1xuXG51dGlscy5mdW5jdG9yID0gZnVuY3Rpb24gZnVuY3Rvcih2KSB7XG4gIHJldHVybiB0eXBlb2YgdiA9PT0gXCJmdW5jdGlvblwiID8gdiA6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB2O1xuICB9O1xufTtcblxudXRpbHMuZGF5c0luTW9udGggPSBmdW5jdGlvbihtb250aCwgeWVhcikge1xuICByZXR1cm4gKG5ldyBEYXRlKHllYXIsIG1vbnRoKzEsIDApKS5nZXREYXRlKCk7XG59O1xuXG51dGlscy53aW5kb3dTaXplID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIFNhbmUgZGVmYXVsdHNcbiAgICB2YXIgc2l6ZSA9IHt3aWR0aDogNjQwLCBoZWlnaHQ6IDQ4MH07XG5cbiAgICAvLyBFYXJsaWVyIElFIHVzZXMgRG9jLmJvZHlcbiAgICBpZiAoZG9jdW1lbnQuYm9keSAmJiBkb2N1bWVudC5ib2R5Lm9mZnNldFdpZHRoKSB7XG4gICAgICAgIHNpemUud2lkdGggPSBkb2N1bWVudC5ib2R5Lm9mZnNldFdpZHRoO1xuICAgICAgICBzaXplLmhlaWdodCA9IGRvY3VtZW50LmJvZHkub2Zmc2V0SGVpZ2h0O1xuICAgIH1cblxuICAgIC8vIElFIGNhbiB1c2UgZGVwZW5kaW5nIG9uIG1vZGUgaXQgaXMgaW5cbiAgICBpZiAoZG9jdW1lbnQuY29tcGF0TW9kZSA9PT0gJ0NTUzFDb21wYXQnICYmXG4gICAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCAmJlxuICAgICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQub2Zmc2V0V2lkdGggKSB7XG4gICAgICAgIHNpemUud2lkdGggPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQub2Zmc2V0V2lkdGg7XG4gICAgICAgIHNpemUuaGVpZ2h0ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50Lm9mZnNldEhlaWdodDtcbiAgICB9XG5cbiAgICAvLyBNb3N0IHJlY2VudCBicm93c2VycyB1c2VcbiAgICBpZiAod2luZG93LmlubmVyV2lkdGggJiYgd2luZG93LmlubmVySGVpZ2h0KSB7XG4gICAgICAgIHNpemUud2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aDtcbiAgICAgICAgc2l6ZS5oZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgfVxuICAgIHJldHVybiAoc2l6ZSk7XG59O1xuXG4vLyBFYXN5IHdheSB0byBiaW5kIG11bHRpcGxlIGZ1bmN0aW9ucyB0byB3aW5kb3cub25yZXNpemVcbi8vIFRPRE86IGdpdmUgYSB3YXkgdG8gcmVtb3ZlIGEgZnVuY3Rpb24gYWZ0ZXIgaXRzIGJvdW5kLCBvdGhlciB0aGFuIHJlbW92aW5nIGFsa2wgb2YgdGhlbVxuLy8gdXRpbHMud2luZG93UmVzaXplID0gZnVuY3Rpb24gKGZ1bilcbi8vIHtcbi8vICAgdmFyIG9sZHJlc2l6ZSA9IHdpbmRvdy5vbnJlc2l6ZTtcblxuLy8gICB3aW5kb3cub25yZXNpemUgPSBmdW5jdGlvbiAoZSkge1xuLy8gICAgIGlmICh0eXBlb2Ygb2xkcmVzaXplID09ICdmdW5jdGlvbicpIG9sZHJlc2l6ZShlKTtcbi8vICAgICBmdW4oZSk7XG4vLyAgIH1cbi8vIH1cblxudXRpbHMud2luZG93UmVzaXplID0gZnVuY3Rpb24gKGZ1bikge1xuICBpZiAod2luZG93LmF0dGFjaEV2ZW50KSB7XG4gICAgICB3aW5kb3cuYXR0YWNoRXZlbnQoJ29ucmVzaXplJywgZnVuKTtcbiAgfVxuICBlbHNlIGlmICh3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcikge1xuICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIGZ1biwgdHJ1ZSk7XG4gIH1cbiAgZWxzZSB7XG4gICAgICAvL1RoZSBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgSmF2YXNjcmlwdCBldmVudCBiaW5kaW5nXG4gIH1cbn07XG5cbnV0aWxzLndpbmRvd1VuUmVzaXplID0gZnVuY3Rpb24gKGZ1bikge1xuICBpZiAod2luZG93LmRldGFjaEV2ZW50KSB7XG4gICAgICB3aW5kb3cuZGV0YWNoRXZlbnQoJ29ucmVzaXplJywgZnVuKTtcbiAgfVxuICBlbHNlIGlmICh3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcikge1xuICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIGZ1biwgdHJ1ZSk7XG4gIH1cbiAgZWxzZSB7XG4gICAgICAvL1RoZSBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgSmF2YXNjcmlwdCBldmVudCBiaW5kaW5nXG4gIH1cbn07XG5cbnV0aWxzLnJlc2l6ZU9uUHJpbnQgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICBpZiAod2luZG93Lm1hdGNoTWVkaWEpIHtcbiAgICAgICAgdmFyIG1lZGlhUXVlcnlMaXN0ID0gd2luZG93Lm1hdGNoTWVkaWEoJ3ByaW50Jyk7XG4gICAgICAgIG1lZGlhUXVlcnlMaXN0LmFkZExpc3RlbmVyKGZ1bmN0aW9uIChtcWwpIHtcbiAgICAgICAgICAgIGlmIChtcWwubWF0Y2hlcykge1xuICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAod2luZG93LmF0dGFjaEV2ZW50KSB7XG4gICAgICB3aW5kb3cuYXR0YWNoRXZlbnQoXCJvbmJlZm9yZXByaW50XCIsIGZuKTtcbiAgICB9IGVsc2Uge1xuICAgICAgd2luZG93Lm9uYmVmb3JlcHJpbnQgPSBmbjtcbiAgICB9XG4gICAgLy9UT0RPOiBhbGxvdyBmb3IgYSBzZWNvbmQgY2FsbCBiYWNrIHRvIHVuZG8gdXNpbmdcbiAgICAvL3dpbmRvdy5hdHRhY2hFdmVudChcIm9uYWZ0ZXJwcmludFwiLCBmbik7XG59O1xuXG51dGlscy51blJlc2l6ZU9uUHJpbnQgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICBpZiAod2luZG93Lm1hdGNoTWVkaWEpIHtcbiAgICAgICAgdmFyIG1lZGlhUXVlcnlMaXN0ID0gd2luZG93Lm1hdGNoTWVkaWEoJ3ByaW50Jyk7XG4gICAgICAgIG1lZGlhUXVlcnlMaXN0LnJlbW92ZUxpc3RlbmVyKGZ1bmN0aW9uIChtcWwpIHtcbiAgICAgICAgICAgIGlmIChtcWwubWF0Y2hlcykge1xuICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAod2luZG93LmRldGFjaEV2ZW50KSB7XG4gICAgICB3aW5kb3cuZGV0YWNoRXZlbnQoXCJvbmJlZm9yZXByaW50XCIsIGZuKTtcbiAgICB9IGVsc2Uge1xuICAgICAgd2luZG93Lm9uYmVmb3JlcHJpbnQgPSBudWxsO1xuICAgIH1cbn07XG5cbi8vIEJhY2t3YXJkcyBjb21wYXRpYmxlIHdheSB0byBpbXBsZW1lbnQgbW9yZSBkMy1saWtlIGNvbG9yaW5nIG9mIGdyYXBocy5cbi8vIElmIHBhc3NlZCBhbiBhcnJheSwgd3JhcCBpdCBpbiBhIGZ1bmN0aW9uIHdoaWNoIGltcGxlbWVudHMgdGhlIG9sZCBkZWZhdWx0XG4vLyBiZWhhdmlvclxudXRpbHMuZ2V0Q29sb3IgPSBmdW5jdGlvbiAoY29sb3IpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vaWYgeW91IHBhc3MgaW4gbm90aGluZywgZ2V0IGRlZmF1bHQgY29sb3JzIGJhY2tcbiAgICAgIHJldHVybiB1dGlscy5kZWZhdWx0Q29sb3IoKTtcbiAgICB9XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShjb2xvcikpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbiAoZCwgaSkge1xuICAgICAgICByZXR1cm4gZC5jb2xvciB8fCBjb2xvcltpICUgY29sb3IubGVuZ3RoXTtcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoY29sb3IpID09PSAnW29iamVjdCBTdHJpbmddJykge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKHMpIHtcbiAgICAgICAgcmV0dXJuIGQuY29sb3IgfHwgJyMnICsgY29sb3IucmVwbGFjZSgnIycsICcnKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGNvbG9yO1xuICAgICAgICAvLyBjYW4ndCByZWFsbHkgaGVscCBpdCBpZiBzb21lb25lIHBhc3NlcyBydWJiaXNoIGFzIGNvbG9yXG4gICAgICAgIC8vIG9yIGNvbG9yIGlzIGFscmVhZHkgYSBmdW5jdGlvblxuICAgIH1cbn07XG5cbi8vIERlZmF1bHQgY29sb3IgY2hvb3NlciB1c2VzIHRoZSBpbmRleCBvZiBhbiBvYmplY3QgYXMgYmVmb3JlLlxudXRpbHMuZGVmYXVsdENvbG9yID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBjb2xvcnMgPSBkMy5zY2FsZU9yZGluYWwoZDMuc2NoZW1lQ2F0ZWdvcnkyMCkucmFuZ2UoKTtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGQsIGkpIHtcbiAgICAgIHJldHVybiBkLmNvbG9yIHx8IGNvbG9yc1tpICUgY29sb3JzLmxlbmd0aF07XG4gICAgfTtcbn07XG5cblxuLy8gUmV0dXJucyBhIGNvbG9yIGZ1bmN0aW9uIHRoYXQgdGFrZXMgdGhlIHJlc3VsdCBvZiAnZ2V0S2V5JyBmb3IgZWFjaCBzZXJpZXMgYW5kXG4vLyBsb29rcyBmb3IgYSBjb3JyZXNwb25kaW5nIGNvbG9yIGZyb20gdGhlIGRpY3Rpb25hcnksXG51dGlscy5jdXN0b21UaGVtZSA9IGZ1bmN0aW9uIChkaWN0aW9uYXJ5LCBnZXRLZXksIGRlZmF1bHRDb2xvcnMpIHtcbiAgZ2V0S2V5ID0gZ2V0S2V5IHx8IGZ1bmN0aW9uIChzZXJpZXMpIHsgcmV0dXJuIHNlcmllcy5rZXk7IH07IC8vIHVzZSBkZWZhdWx0IHNlcmllcy5rZXkgaWYgZ2V0S2V5IGlzIHVuZGVmaW5lZFxuICBkZWZhdWx0Q29sb3JzID0gZGVmYXVsdENvbG9ycyB8fCBkMy5zY2FsZU9yZGluYWwoZDMuc2NoZW1lQ2F0ZWdvcnkyMCkucmFuZ2UoKTsgLy9kZWZhdWx0IGNvbG9yIGZ1bmN0aW9uXG5cbiAgdmFyIGRlZkluZGV4ID0gZGVmYXVsdENvbG9ycy5sZW5ndGg7IC8vY3VycmVudCBkZWZhdWx0IGNvbG9yIChnb2luZyBpbiByZXZlcnNlKVxuXG4gIHJldHVybiBmdW5jdGlvbiAoc2VyaWVzLCBpbmRleCkge1xuICAgIHZhciBrZXkgPSBnZXRLZXkoc2VyaWVzKTtcblxuICAgIGlmICghZGVmSW5kZXgpIGRlZkluZGV4ID0gZGVmYXVsdENvbG9ycy5sZW5ndGg7IC8vdXNlZCBhbGwgdGhlIGRlZmF1bHQgY29sb3JzLCBzdGFydCBvdmVyXG5cbiAgICBpZiAodHlwZW9mIGRpY3Rpb25hcnlba2V5XSAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgcmV0dXJuICh0eXBlb2YgZGljdGlvbmFyeVtrZXldID09PSBcImZ1bmN0aW9uXCIpID8gZGljdGlvbmFyeVtrZXldKCkgOiBkaWN0aW9uYXJ5W2tleV07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBkZWZhdWx0Q29sb3JzWy0tZGVmSW5kZXhdOyAvLyBubyBtYXRjaCBpbiBkaWN0aW9uYXJ5LCB1c2UgZGVmYXVsdCBjb2xvclxuICAgIH1cbiAgfTtcbn07XG5cblxuXG4vLyBGcm9tIHRoZSBQSkFYIGV4YW1wbGUgb24gZDNqcy5vcmcsIHdoaWxlIHRoaXMgaXMgbm90IHJlYWxseSBkaXJlY3RseSBuZWVkZWRcbi8vIGl0J3MgYSB2ZXJ5IGNvb2wgbWV0aG9kIGZvciBkb2luZyBwamF4LCBJIG1heSBleHBhbmQgdXBvbiBpdCBhIGxpdHRsZSBiaXQsXG4vLyBvcGVuIHRvIHN1Z2dlc3Rpb25zIG9uIGFueXRoaW5nIHRoYXQgbWF5IGJlIHVzZWZ1bFxudXRpbHMucGpheCA9IGZ1bmN0aW9uIChsaW5rcywgY29udGVudCkge1xuICBkMy5zZWxlY3RBbGwobGlua3MpLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xuICAgIGhpc3RvcnkucHVzaFN0YXRlKHRoaXMuaHJlZiwgdGhpcy50ZXh0Q29udGVudCwgdGhpcy5ocmVmKTtcbiAgICBsb2FkKHRoaXMuaHJlZik7XG4gICAgZDMuZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgfSk7XG5cbiAgZnVuY3Rpb24gbG9hZChocmVmKSB7XG4gICAgZDMuaHRtbChocmVmLCBmdW5jdGlvbiAoZnJhZ21lbnQpIHtcbiAgICAgIHZhciB0YXJnZXQgPSBkMy5zZWxlY3QoY29udGVudCkubm9kZSgpO1xuICAgICAgdGFyZ2V0LnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKGQzLnNlbGVjdChmcmFnbWVudCkuc2VsZWN0KGNvbnRlbnQpLm5vZGUoKSwgdGFyZ2V0KTtcbiAgICAgIHV0aWxzLnBqYXgobGlua3MsIGNvbnRlbnQpO1xuICAgIH0pO1xuICB9XG5cbiAgZDMuc2VsZWN0KHdpbmRvdykub24oXCJwb3BzdGF0ZVwiLCBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGQzLmV2ZW50LnN0YXRlKSB7IGxvYWQoZDMuZXZlbnQuc3RhdGUpOyB9XG4gIH0pO1xufTtcblxuLyogTnVtYmVycyB0aGF0IGFyZSB1bmRlZmluZWQsIG51bGwgb3IgTmFOLCBjb252ZXJ0IHRoZW0gdG8gemVyb3MuXG4qL1xudXRpbHMuTmFOdG9aZXJvID0gZnVuY3Rpb24obikge1xuICAgIGlmICh0eXBlb2YgbiAhPT0gJ251bWJlcidcbiAgICAgICAgfHwgaXNOYU4obilcbiAgICAgICAgfHwgbiA9PT0gbnVsbFxuICAgICAgICB8fCBuID09PSBJbmZpbml0eSkgcmV0dXJuIDA7XG5cbiAgICByZXR1cm4gbjtcbn07XG5cbi8qXG5TbmlwcGV0IG9mIGNvZGUgeW91IGNhbiBpbnNlcnQgaW50byBlYWNoIHV0aWxzLm1vZGVscy4qIHRvIGdpdmUgeW91IHRoZSBhYmlsaXR5IHRvXG5kbyB0aGluZ3MgbGlrZTpcbmNoYXJ0Lm9wdGlvbnMoe1xuICBzaG93WEF4aXM6IHRydWUsXG4gIHRvb2x0aXBzOiB0cnVlXG59KTtcblxuVG8gZW5hYmxlIGluIHRoZSBjaGFydDpcbmNoYXJ0Lm9wdGlvbnMgPSB1dGlscy5vcHRpb25zRnVuYy5iaW5kKGNoYXJ0KTtcbiovXG51dGlscy5vcHRpb25zRnVuYyA9IGZ1bmN0aW9uKGFyZ3MpIHtcbiAgICBpZiAoYXJncykge1xuICAgICAgZDMubWFwKGFyZ3MpLmZvckVhY2goKGZ1bmN0aW9uKGtleSx2YWx1ZSkge1xuICAgICAgICBpZiAodHlwZW9mIHRoaXNba2V5XSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgIHRoaXNba2V5XSh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0pLmJpbmQodGhpcykpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cblxuLy9TVUdBUiBBRERJVElPTlNcblxuLy9ncmFkaWVudCBjb2xvclxudXRpbHMuY29sb3JMaW5lYXJHcmFkaWVudCA9IGZ1bmN0aW9uIChkLCBpLCBwLCBjLCBkZWZzKSB7XG4gIHZhciBpZCA9ICdsZ19ncmFkaWVudF8nICsgaTtcbiAgdmFyIGdyYWQgPSBkZWZzLnNlbGVjdCgnIycgKyBpZCk7XG4gIGlmICggZ3JhZC5lbXB0eSgpIClcbiAge1xuICAgIGlmIChwLnBvc2l0aW9uID09PSAnbWlkZGxlJylcbiAgICB7XG4gICAgICB1dGlscy5jcmVhdGVMaW5lYXJHcmFkaWVudCggaWQsIHAsIGRlZnMsIFtcbiAgICAgICAgeyAnb2Zmc2V0JzogJzAlJywgICdzdG9wLWNvbG9yJzogZDMucmdiKGMpLmRhcmtlcigpLnRvU3RyaW5nKCksICAnc3RvcC1vcGFjaXR5JzogMSB9LFxuICAgICAgICB7ICdvZmZzZXQnOiAnMjAlJywgJ3N0b3AtY29sb3InOiBkMy5yZ2IoYykudG9TdHJpbmcoKSwgJ3N0b3Atb3BhY2l0eSc6IDEgfSxcbiAgICAgICAgeyAnb2Zmc2V0JzogJzUwJScsICdzdG9wLWNvbG9yJzogZDMucmdiKGMpLmJyaWdodGVyKCkudG9TdHJpbmcoKSwgJ3N0b3Atb3BhY2l0eSc6IDEgfSxcbiAgICAgICAgeyAnb2Zmc2V0JzogJzgwJScsICdzdG9wLWNvbG9yJzogZDMucmdiKGMpLnRvU3RyaW5nKCksICdzdG9wLW9wYWNpdHknOiAxIH0sXG4gICAgICAgIHsgJ29mZnNldCc6ICcxMDAlJywnc3RvcC1jb2xvcic6IGQzLnJnYihjKS5kYXJrZXIoKS50b1N0cmluZygpLCAgJ3N0b3Atb3BhY2l0eSc6IDEgfVxuICAgICAgXSk7XG4gICAgfVxuICAgIGVsc2VcbiAgICB7XG4gICAgICB1dGlscy5jcmVhdGVMaW5lYXJHcmFkaWVudCggaWQsIHAsIGRlZnMsIFtcbiAgICAgICAgeyAnb2Zmc2V0JzogJzAlJywgICdzdG9wLWNvbG9yJzogZDMucmdiKGMpLmRhcmtlcigpLnRvU3RyaW5nKCksICAnc3RvcC1vcGFjaXR5JzogMSB9LFxuICAgICAgICB7ICdvZmZzZXQnOiAnNTAlJywgJ3N0b3AtY29sb3InOiBkMy5yZ2IoYykudG9TdHJpbmcoKSwgJ3N0b3Atb3BhY2l0eSc6IDEgfSxcbiAgICAgICAgeyAnb2Zmc2V0JzogJzEwMCUnLCdzdG9wLWNvbG9yJzogZDMucmdiKGMpLmJyaWdodGVyKCkudG9TdHJpbmcoKSwgJ3N0b3Atb3BhY2l0eSc6IDEgfVxuICAgICAgXSk7XG4gICAgfVxuICB9XG4gIHJldHVybiAndXJsKCMnKyBpZCArJyknO1xufTtcblxuLy8gZGVmczpkZWZpbml0aW9uIGNvbnRhaW5lclxuLy8gaWQ6ZHluYW1pYyBpZCBmb3IgYXJjXG4vLyByYWRpdXM6b3V0ZXIgZWRnZSBvZiBncmFkaWVudFxuLy8gc3RvcHM6IGFuIGFycmF5IG9mIGF0dHJpYnV0ZSBvYmplY3RzXG51dGlscy5jcmVhdGVMaW5lYXJHcmFkaWVudCA9IGZ1bmN0aW9uIChpZCwgcGFyYW1zLCBkZWZzLCBzdG9wcykge1xuICB2YXIgeDIgPSBwYXJhbXMub3JpZW50YXRpb24gPT09ICdob3Jpem9udGFsJyA/ICcwJScgOiAnMTAwJSc7XG4gIHZhciB5MiA9IHBhcmFtcy5vcmllbnRhdGlvbiA9PT0gJ2hvcml6b250YWwnID8gJzEwMCUnIDogJzAlJztcbiAgdmFyIGF0dHJzLCBzdG9wO1xuICB2YXIgZ3JhZCA9IGRlZnMuYXBwZW5kKCdsaW5lYXJHcmFkaWVudCcpXG4gICAgICAgIC5hdHRyKCdpZCcsIGlkKVxuICAgICAgICAuYXR0cigneDEnLCAnMCUnKVxuICAgICAgICAuYXR0cigneTEnLCAnMCUnKVxuICAgICAgICAuYXR0cigneDInLCB4MiApXG4gICAgICAgIC5hdHRyKCd5MicsIHkyIClcbiAgICAgICAgLy8uYXR0cignZ3JhZGllbnRVbml0cycsICd1c2VyU3BhY2VPblVzZScpb2JqZWN0Qm91bmRpbmdCb3hcbiAgICAgICAgLmF0dHIoJ3NwcmVhZE1ldGhvZCcsICdwYWQnKTtcbiAgZm9yICh2YXIgaT0wOyBpPHN0b3BzLmxlbmd0aDsgaSs9MSlcbiAge1xuICAgIGF0dHJzID0gc3RvcHNbaV07XG4gICAgc3RvcCA9IGdyYWQuYXBwZW5kKCdzdG9wJyk7XG4gICAgZm9yICh2YXIgYSBpbiBhdHRycylcbiAgICB7XG4gICAgICBpZiAoIGF0dHJzLmhhc093blByb3BlcnR5KGEpICkge1xuICAgICAgICBzdG9wLmF0dHIoYSwgYXR0cnNbYV0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxudXRpbHMuY29sb3JSYWRpYWxHcmFkaWVudCA9IGZ1bmN0aW9uIChkLCBpLCBwLCBjLCBkZWZzKSB7XG4gIHZhciBpZCA9ICdyZ19ncmFkaWVudF8nICsgaTtcbiAgdmFyIGdyYWQgPSBkZWZzLnNlbGVjdCgnIycgKyBpZCk7XG4gIGlmICggZ3JhZC5lbXB0eSgpIClcbiAge1xuICAgIHV0aWxzLmNyZWF0ZVJhZGlhbEdyYWRpZW50KCBpZCwgcCwgZGVmcywgW1xuICAgICAgeyAnb2Zmc2V0JzogcC5zLCAnc3RvcC1jb2xvcic6IGQzLnJnYihjKS5icmlnaHRlcigpLnRvU3RyaW5nKCksICdzdG9wLW9wYWNpdHknOiAxIH0sXG4gICAgICB7ICdvZmZzZXQnOiAnMTAwJScsJ3N0b3AtY29sb3InOiBkMy5yZ2IoYykuZGFya2VyKCkudG9TdHJpbmcoKSwgJ3N0b3Atb3BhY2l0eSc6IDEgfVxuICAgIF0pO1xuICB9XG4gIHJldHVybiAndXJsKCMnICsgaWQgKyAnKSc7XG59O1xuXG51dGlscy5jcmVhdGVSYWRpYWxHcmFkaWVudCA9IGZ1bmN0aW9uIChpZCwgcGFyYW1zLCBkZWZzLCBzdG9wcykge1xuICB2YXIgYXR0cnMsIHN0b3A7XG4gIHZhciBncmFkID0gZGVmcy5hcHBlbmQoJ3JhZGlhbEdyYWRpZW50JylcbiAgICAgICAgLmF0dHIoJ2lkJywgaWQpXG4gICAgICAgIC5hdHRyKCdyJywgcGFyYW1zLnIpXG4gICAgICAgIC5hdHRyKCdjeCcsIHBhcmFtcy54KVxuICAgICAgICAuYXR0cignY3knLCBwYXJhbXMueSlcbiAgICAgICAgLmF0dHIoJ2dyYWRpZW50VW5pdHMnLCBwYXJhbXMudSlcbiAgICAgICAgLmF0dHIoJ3NwcmVhZE1ldGhvZCcsICdwYWQnKTtcbiAgZm9yICh2YXIgaT0wOyBpPHN0b3BzLmxlbmd0aDsgaSs9MSlcbiAge1xuICAgIGF0dHJzID0gc3RvcHNbaV07XG4gICAgc3RvcCA9IGdyYWQuYXBwZW5kKCdzdG9wJyk7XG4gICAgZm9yICh2YXIgYSBpbiBhdHRycylcbiAgICB7XG4gICAgICBpZiAoIGF0dHJzLmhhc093blByb3BlcnR5KGEpICkge1xuICAgICAgICBzdG9wLmF0dHIoYSwgYXR0cnNbYV0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxudXRpbHMuZ2V0QWJzb2x1dGVYWSA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gIHZhciB2aWV3cG9ydEVsZW1lbnQgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gIHZhciBib3ggPSBlbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICB2YXIgc2Nyb2xsTGVmdCA9IHZpZXdwb3J0RWxlbWVudC5zY3JvbGxMZWZ0ICsgZG9jdW1lbnQuYm9keS5zY3JvbGxMZWZ0O1xuICB2YXIgc2Nyb2xsVG9wID0gdmlld3BvcnRFbGVtZW50LnNjcm9sbFRvcCArIGRvY3VtZW50LmJvZHkuc2Nyb2xsVG9wO1xuICB2YXIgeCA9IGJveC5sZWZ0ICsgc2Nyb2xsTGVmdDtcbiAgdmFyIHkgPSBib3gudG9wICsgc2Nyb2xsVG9wO1xuXG4gIHJldHVybiB7J2xlZnQnOiB4LCAndG9wJzogeX07XG59O1xuXG4vLyBDcmVhdGVzIGEgcmVjdGFuZ2xlIHdpdGggcm91bmRlZCBjb3JuZXJzXG51dGlscy5yb3VuZGVkUmVjdGFuZ2xlID0gZnVuY3Rpb24gKHgsIHksIHdpZHRoLCBoZWlnaHQsIHJhZGl1cykge1xuICByZXR1cm4gXCJNXCIgKyB4ICsgXCIsXCIgKyB5ICtcbiAgICAgICBcImhcIiArICh3aWR0aCAtIHJhZGl1cyAqIDIpICtcbiAgICAgICBcImFcIiArIHJhZGl1cyArIFwiLFwiICsgcmFkaXVzICsgXCIgMCAwIDEgXCIgKyByYWRpdXMgKyBcIixcIiArIHJhZGl1cyArXG4gICAgICAgXCJ2XCIgKyAoaGVpZ2h0IC0gMiAtIHJhZGl1cyAqIDIpICtcbiAgICAgICBcImFcIiArIHJhZGl1cyArIFwiLFwiICsgcmFkaXVzICsgXCIgMCAwIDEgXCIgKyAtcmFkaXVzICsgXCIsXCIgKyByYWRpdXMgK1xuICAgICAgIFwiaFwiICsgKHJhZGl1cyAqIDIgLSB3aWR0aCkgK1xuICAgICAgIFwiYVwiICsgLXJhZGl1cyArIFwiLFwiICsgcmFkaXVzICsgXCIgMCAwIDEgXCIgKyAtcmFkaXVzICsgXCIsXCIgKyAtcmFkaXVzICtcbiAgICAgICBcInZcIiArICggLWhlaWdodCArIHJhZGl1cyAqIDIgKyAyICkgK1xuICAgICAgIFwiYVwiICsgcmFkaXVzICsgXCIsXCIgKyByYWRpdXMgKyBcIiAwIDAgMSBcIiArIHJhZGl1cyArIFwiLFwiICsgLXJhZGl1cyArXG4gICAgICAgXCJ6XCI7XG59O1xuXG51dGlscy5kcm9wU2hhZG93ID0gZnVuY3Rpb24gKGlkLCBkZWZzLCBvcHRpb25zKSB7XG4gIHZhciBvcHQgPSBvcHRpb25zIHx8IHt9XG4gICAgLCBoID0gb3B0LmhlaWdodCB8fCAnMTMwJSdcbiAgICAsIG8gPSBvcHQub2Zmc2V0IHx8IDJcbiAgICAsIGIgPSBvcHQuYmx1ciB8fCAxO1xuXG4gIGlmIChkZWZzLnNlbGVjdCgnIycgKyBpZCkuZW1wdHkoKSkge1xuICAgIHZhciBmaWx0ZXIgPSBkZWZzLmFwcGVuZCgnZmlsdGVyJylcbiAgICAgICAgICAuYXR0cignaWQnLGlkKVxuICAgICAgICAgIC5hdHRyKCdoZWlnaHQnLGgpO1xuICAgIHZhciBvZmZzZXQgPSBmaWx0ZXIuYXBwZW5kKCdmZU9mZnNldCcpXG4gICAgICAgICAgLmF0dHIoJ2luJywnU291cmNlR3JhcGhpYycpXG4gICAgICAgICAgLmF0dHIoJ3Jlc3VsdCcsJ29mZnNldEJsdXInKVxuICAgICAgICAgIC5hdHRyKCdkeCcsbylcbiAgICAgICAgICAuYXR0cignZHknLG8pOyAvL2hvdyBtdWNoIHRvIG9mZnNldFxuICAgIHZhciBjb2xvciA9IGZpbHRlci5hcHBlbmQoJ2ZlQ29sb3JNYXRyaXgnKVxuICAgICAgICAgIC5hdHRyKCdpbicsJ29mZnNldEJsdXInKVxuICAgICAgICAgIC5hdHRyKCdyZXN1bHQnLCdtYXRyaXhPdXQnKVxuICAgICAgICAgIC5hdHRyKCd0eXBlJywnbWF0cml4JylcbiAgICAgICAgICAuYXR0cigndmFsdWVzJywnMSAwIDAgMCAwICAwIDEgMCAwIDAgIDAgMCAxIDAgMCAgMCAwIDAgMSAwJyk7XG4gICAgdmFyIGJsdXIgPSBmaWx0ZXIuYXBwZW5kKCdmZUdhdXNzaWFuQmx1cicpXG4gICAgICAgICAgLmF0dHIoJ2luJywnbWF0cml4T3V0JylcbiAgICAgICAgICAuYXR0cigncmVzdWx0JywnYmx1ck91dCcpXG4gICAgICAgICAgLmF0dHIoJ3N0ZERldmlhdGlvbicsYik7IC8vc3RkRGV2aWF0aW9uIGlzIGhvdyBtdWNoIHRvIGJsdXJcbiAgICB2YXIgbWVyZ2UgPSBmaWx0ZXIuYXBwZW5kKCdmZU1lcmdlJyk7XG4gICAgICAgIG1lcmdlLmFwcGVuZCgnZmVNZXJnZU5vZGUnKTsgLy90aGlzIGNvbnRhaW5zIHRoZSBvZmZzZXQgYmx1cnJlZCBpbWFnZVxuICAgICAgICBtZXJnZS5hcHBlbmQoJ2ZlTWVyZ2VOb2RlJylcbiAgICAgICAgICAuYXR0cignaW4nLCdTb3VyY2VHcmFwaGljJyk7IC8vdGhpcyBjb250YWlucyB0aGUgZWxlbWVudCB0aGF0IHRoZSBmaWx0ZXIgaXMgYXBwbGllZCB0b1xuICB9XG4gIHJldHVybiAndXJsKCMnICsgaWQgKyAnKSc7XG59O1xuLy8gPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgdmVyc2lvbj1cIjEuMVwiPlxuLy8gICA8ZGVmcz5cbi8vICAgICA8ZmlsdGVyIGlkPVwiZjFcIiB4PVwiMFwiIHk9XCIwXCIgd2lkdGg9XCIyMDAlXCIgaGVpZ2h0PVwiMjAwJVwiPlxuLy8gICAgICAgPGZlT2Zmc2V0IHJlc3VsdD1cIm9mZk91dFwiIGluPVwiU291cmNlR3JhcGhpY1wiIGR4PVwiMjBcIiBkeT1cIjIwXCIgLz5cbi8vICAgICAgIDxmZUNvbG9yTWF0cml4IHJlc3VsdD1cIm1hdHJpeE91dFwiIGluPVwib2ZmT3V0XCIgdHlwZT1cIm1hdHJpeFwiXG4vLyAgICAgICB2YWx1ZXM9XCIwLjIgMCAwIDAgMCAwIDAuMiAwIDAgMCAwIDAgMC4yIDAgMCAwIDAgMCAxIDBcIiAvPlxuLy8gICAgICAgPGZlR2F1c3NpYW5CbHVyIHJlc3VsdD1cImJsdXJPdXRcIiBpbj1cIm1hdHJpeE91dFwiIHN0ZERldmlhdGlvbj1cIjEwXCIgLz5cbi8vICAgICAgIDxmZUJsZW5kIGluPVwiU291cmNlR3JhcGhpY1wiIGluMj1cImJsdXJPdXRcIiBtb2RlPVwibm9ybWFsXCIgLz5cbi8vICAgICA8L2ZpbHRlcj5cbi8vICAgPC9kZWZzPlxuLy8gICA8cmVjdCB3aWR0aD1cIjkwXCIgaGVpZ2h0PVwiOTBcIiBzdHJva2U9XCJncmVlblwiIHN0cm9rZS13aWR0aD1cIjNcIlxuLy8gICBmaWxsPVwieWVsbG93XCIgZmlsdGVyPVwidXJsKCNmMSlcIiAvPlxuLy8gPC9zdmc+XG5cbnV0aWxzLnN0cmluZ1NldExlbmd0aHMgPSBmdW5jdGlvbihfZGF0YSwgX2NvbnRhaW5lciwgX2Zvcm1hdCwgY2xhc3Nlcywgc3R5bGVzKSB7XG4gIHZhciBsZW5ndGhzID0gW10sXG4gICAgICB0eHQgPSBfY29udGFpbmVyLnNlbGVjdCgnLnRtcC10ZXh0LXN0cmluZ3MnKS5zZWxlY3QoJ3RleHQnKTtcbiAgaWYgKHR4dC5lbXB0eSgpKSB7XG4gICAgdHh0ID0gX2NvbnRhaW5lci5hcHBlbmQoJ2cnKS5hdHRyKCdjbGFzcycsICd0bXAtdGV4dC1zdHJpbmdzJykuYXBwZW5kKCd0ZXh0Jyk7XG4gIH1cbiAgdHh0LmNsYXNzZWQoY2xhc3NlcywgdHJ1ZSk7XG4gIHR4dC5zdHlsZSgnZGlzcGxheScsICdpbmxpbmUnKTtcbiAgX2RhdGEuZm9yRWFjaChmdW5jdGlvbihkLCBpKSB7XG4gICAgICB0eHQudGV4dChfZm9ybWF0KGQsIGkpKTtcbiAgICAgIGxlbmd0aHMucHVzaCh0eHQubm9kZSgpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLndpZHRoKTtcbiAgICB9KTtcbiAgdHh0LnRleHQoJycpLmF0dHIoJ2NsYXNzJywgJ3RtcC10ZXh0LXN0cmluZ3MnKS5zdHlsZSgnZGlzcGxheScsICdub25lJyk7XG4gIHJldHVybiBsZW5ndGhzO1xufTtcblxudXRpbHMuc3RyaW5nU2V0VGhpY2tuZXNzID0gZnVuY3Rpb24oX2RhdGEsIF9jb250YWluZXIsIF9mb3JtYXQsIGNsYXNzZXMsIHN0eWxlcykge1xuICB2YXIgdGhpY2tuZXNzZXMgPSBbXSxcbiAgICAgIHR4dCA9IF9jb250YWluZXIuc2VsZWN0KCcudG1wLXRleHQtc3RyaW5ncycpLnNlbGVjdCgndGV4dCcpO1xuICBpZiAodHh0LmVtcHR5KCkpIHtcbiAgICB0eHQgPSBfY29udGFpbmVyLmFwcGVuZCgnZycpLmF0dHIoJ2NsYXNzJywgJ3RtcC10ZXh0LXN0cmluZ3MnKS5hcHBlbmQoJ3RleHQnKTtcbiAgfVxuICB0eHQuY2xhc3NlZChjbGFzc2VzLCB0cnVlKTtcbiAgdHh0LnN0eWxlKCdkaXNwbGF5JywgJ2lubGluZScpO1xuICBfZGF0YS5mb3JFYWNoKGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgIHR4dC50ZXh0KF9mb3JtYXQoZCwgaSkpO1xuICAgICAgdGhpY2tuZXNzZXMucHVzaCh0eHQubm9kZSgpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmhlaWdodCk7XG4gICAgfSk7XG4gIHR4dC50ZXh0KCcnKS5hdHRyKCdjbGFzcycsICd0bXAtdGV4dC1zdHJpbmdzJykuc3R5bGUoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICByZXR1cm4gdGhpY2tuZXNzZXM7XG59O1xuXG51dGlscy5tYXhTdHJpbmdTZXRMZW5ndGggPSBmdW5jdGlvbihfZGF0YSwgX2NvbnRhaW5lciwgX2Zvcm1hdCkge1xuICB2YXIgbGVuZ3RocyA9IHV0aWxzLnN0cmluZ1NldExlbmd0aHMoX2RhdGEsIF9jb250YWluZXIsIF9mb3JtYXQpO1xuICByZXR1cm4gZDMubWF4KGxlbmd0aHMpO1xufTtcblxudXRpbHMuc3RyaW5nRWxsaXBzaWZ5ID0gZnVuY3Rpb24oX3N0cmluZywgX2NvbnRhaW5lciwgX2xlbmd0aCkge1xuICB2YXIgdHh0ID0gX2NvbnRhaW5lci5zZWxlY3QoJy50bXAtdGV4dC1zdHJpbmdzJykuc2VsZWN0KCd0ZXh0JyksXG4gICAgICBzdHIgPSBfc3RyaW5nLFxuICAgICAgbGVuID0gMCxcbiAgICAgIGVsbCA9IDAsXG4gICAgICBzdHJMZW4gPSAwO1xuICBpZiAodHh0LmVtcHR5KCkpIHtcbiAgICB0eHQgPSBfY29udGFpbmVyLmFwcGVuZCgnZycpLmF0dHIoJ2NsYXNzJywgJ3RtcC10ZXh0LXN0cmluZ3MnKS5hcHBlbmQoJ3RleHQnKTtcbiAgfVxuICB0eHQuc3R5bGUoJ2Rpc3BsYXknLCAnaW5saW5lJyk7XG4gIHR4dC50ZXh0KCcuLi4nKTtcbiAgZWxsID0gdHh0Lm5vZGUoKS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS53aWR0aDtcbiAgdHh0LnRleHQoc3RyKTtcbiAgbGVuID0gdHh0Lm5vZGUoKS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS53aWR0aDtcbiAgc3RyTGVuID0gbGVuO1xuICB3aGlsZSAobGVuID4gX2xlbmd0aCAmJiBsZW4gPiAzMCkge1xuICAgIHN0ciA9IHN0ci5zbGljZSgwLCAtMSk7XG4gICAgdHh0LnRleHQoc3RyKTtcbiAgICBsZW4gPSB0eHQubm9kZSgpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLndpZHRoICsgZWxsO1xuICB9XG4gIHR4dC50ZXh0KCcnKTtcbiAgcmV0dXJuIHN0ciArIChzdHJMZW4gPiBfbGVuZ3RoID8gJy4uLicgOiAnJyk7XG59O1xuXG51dGlscy5nZXRUZXh0QkJveCA9IGZ1bmN0aW9uKHRleHQsIGZsb2F0cykge1xuICB2YXIgYmJveCA9IHRleHQubm9kZSgpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgICAgc2l6ZSA9IHtcbiAgICAgICAgd2lkdGg6IGZsb2F0cyA/IGJib3gud2lkdGggOiBwYXJzZUludChiYm94LndpZHRoLCAxMCksXG4gICAgICAgIGhlaWdodDogZmxvYXRzID8gYmJveC5oZWlnaHQgOiBwYXJzZUludChiYm94LmhlaWdodCwgMTApXG4gICAgICB9O1xuICByZXR1cm4gc2l6ZTtcbn07XG5cbnV0aWxzLmdldFRleHRDb250cmFzdCA9IGZ1bmN0aW9uKGMsIGksIGNhbGxiYWNrKSB7XG4gIHZhciBiYWNrID0gYyxcbiAgICAgIGJhY2tMYWIgPSBkMy5sYWIoYmFjayksXG4gICAgICBiYWNrTHVtZW4gPSBiYWNrTGFiLmwsXG4gICAgICB0ZXh0THVtZW4gPSBiYWNrTHVtZW4gPiA2MCA/XG4gICAgICAgIGJhY2tMYWIuZGFya2VyKDQgKyAoYmFja0x1bWVuIC0gNzUpIC8gMjUpLmwgOiAvLyAoNTAuLjEwMClbMSB0byAzLjVdXG4gICAgICAgIGJhY2tMYWIuYnJpZ2h0ZXIoNCArICgxOCAtIGJhY2tMdW1lbikgLyAyNSkubCwgLy8gKDAuLjUwKVszLjUuLjFdXG4gICAgICB0ZXh0TGFiID0gZDMubGFiKHRleHRMdW1lbiwgMCwgMCksXG4gICAgICB0ZXh0ID0gdGV4dExhYi50b1N0cmluZygpO1xuICBpZiAoY2FsbGJhY2spIHtcbiAgICBjYWxsYmFjayhiYWNrTGFiLCB0ZXh0TGFiKTtcbiAgfVxuICByZXR1cm4gdGV4dDtcbn07XG5cbnV0aWxzLmlzUlRMQ2hhciA9IGZ1bmN0aW9uKGMpIHtcbiAgdmFyIHJ0bENoYXJzXyA9ICdcXHUwNTkxLVxcdTA3RkZcXHVGQjFELVxcdUZERkZcXHVGRTcwLVxcdUZFRkMnLFxuICAgICAgcnRsQ2hhclJlZ18gPSBuZXcgUmVnRXhwKCdbJyArIHJ0bENoYXJzXyArICddJyk7XG4gIHJldHVybiBydGxDaGFyUmVnXy50ZXN0KGMpO1xufTtcblxudXRpbHMucG9sYXJUb0NhcnRlc2lhbiA9IGZ1bmN0aW9uKGNlbnRlclgsIGNlbnRlclksIHJhZGl1cywgYW5nbGVJbkRlZ3JlZXMpIHtcbiAgdmFyIGFuZ2xlSW5SYWRpYW5zID0gdXRpbHMuYW5nbGVUb1JhZGlhbnMoYW5nbGVJbkRlZ3JlZXMpO1xuICB2YXIgeCA9IGNlbnRlclggKyByYWRpdXMgKiBNYXRoLmNvcyhhbmdsZUluUmFkaWFucyk7XG4gIHZhciB5ID0gY2VudGVyWSArIHJhZGl1cyAqIE1hdGguc2luKGFuZ2xlSW5SYWRpYW5zKTtcbiAgcmV0dXJuIFt4LCB5XTtcbn07XG5cbnV0aWxzLmFuZ2xlVG9SYWRpYW5zID0gZnVuY3Rpb24oYW5nbGVJbkRlZ3JlZXMpIHtcbiAgcmV0dXJuIGFuZ2xlSW5EZWdyZWVzICogTWF0aC5QSSAvIDE4MC4wO1xufTtcblxudXRpbHMuYW5nbGVUb0RlZ3JlZXMgPSBmdW5jdGlvbihhbmdsZUluUmFkaWFucykge1xuICByZXR1cm4gYW5nbGVJblJhZGlhbnMgKiAxODAuMCAvIE1hdGguUEk7XG59O1xuXG51dGlscy5jcmVhdGVUZXh0dXJlID0gZnVuY3Rpb24oZGVmcywgaWQsIHgsIHkpIHtcbiAgdmFyIHRleHR1cmUgPSAnI3NjLWRpYWdvbmFsSGF0Y2gtJyArIGlkLFxuICAgICAgbWFzayA9ICcjc2MtdGV4dHVyZU1hc2stJyArIGlkO1xuXG4gIGRlZnNcbiAgICAuYXBwZW5kKCdwYXR0ZXJuJylcbiAgICAgIC5hdHRyKCdpZCcsICdzYy1kaWFnb25hbEhhdGNoLScgKyBpZClcbiAgICAgIC5hdHRyKCdwYXR0ZXJuVW5pdHMnLCAndXNlclNwYWNlT25Vc2UnKVxuICAgICAgLmF0dHIoJ3dpZHRoJywgOClcbiAgICAgIC5hdHRyKCdoZWlnaHQnLCA4KVxuICAgICAgLmFwcGVuZCgncGF0aCcpXG4gICAgICAgIC5hdHRyKCdkJywgJ00tMSwxIGwyLC0yIE0wLDggbDgsLTggTTcsOSBsMSwtMScpXG4gICAgICAgIC5hdHRyKCdjbGFzcycsICd0ZXh0dXJlLWxpbmUnKVxuICAgICAgICAvLyAuYXR0cignY2xhc3MnLCBjbGFzc2VzKVxuICAgICAgICAvLyAuYXR0cignc3Ryb2tlJywgZmlsbClcbiAgICAgICAgLmF0dHIoJ3N0cm9rZScsICcjZmZmJylcbiAgICAgICAgLmF0dHIoJ3N0cm9rZS1saW5lY2FwJywgJ3NxdWFyZScpO1xuXG4gIGRlZnNcbiAgICAuYXBwZW5kKCdtYXNrJylcbiAgICAgIC5hdHRyKCdpZCcsICdzYy10ZXh0dXJlTWFzay0nICsgaWQpXG4gICAgICAuYXR0cigneCcsIDApXG4gICAgICAuYXR0cigneScsIDApXG4gICAgICAuYXR0cignd2lkdGgnLCAnMTAwJScpXG4gICAgICAuYXR0cignaGVpZ2h0JywgJzEwMCUnKVxuICAgICAgLmFwcGVuZCgncmVjdCcpXG4gICAgICAgIC5hdHRyKCd4JywgeCB8fCAwKVxuICAgICAgICAuYXR0cigneScsIHkgfHwgLTEpXG4gICAgICAgIC5hdHRyKCd3aWR0aCcsICcxMDAlJylcbiAgICAgICAgLmF0dHIoJ2hlaWdodCcsICcxMDAlJylcbiAgICAgICAgLmF0dHIoJ2ZpbGwnLCAndXJsKCcgKyB0ZXh0dXJlICsgJyknKTtcblxuICByZXR1cm4gbWFzaztcbn07XG5cbi8vIHV0aWxzLm51bWJlckZvcm1hdFNJID0gZnVuY3Rpb24oZCwgcCwgYywgbCkge1xuLy8gICAgIHZhciBmbXRyLCBzcGVjLCBzaTtcbi8vICAgICBpZiAoaXNOYU4oZCkpIHtcbi8vICAgICAgICAgcmV0dXJuIGQ7XG4vLyAgICAgfVxuLy8gICAgIHAgPSB0eXBlb2YgcCA9PT0gJ3VuZGVmaW5lZCcgPyAyIDogcDtcbi8vICAgICBjID0gdHlwZW9mIGMgPT09ICd1bmRlZmluZWQnID8gZmFsc2UgOiAhIWM7XG4vLyAgICAgZm10ciA9IHR5cGVvZiBsID09PSAndW5kZWZpbmVkJyA/IGQzLmZvcm1hdCA6IGQzLmZvcm1hdExvY2FsZShsKS5mb3JtYXQ7XG4vLyAgICAgLy8gZCA9IGQzLnJvdW5kKGQsIHApO1xuLy8gICAgIGQgPSBNYXRoLnJvdW5kKGQgKiAxMCAqIHApIC8gMTAgKiBwO1xuLy8gICAgIHNwZWMgPSBjID8gJyQsJyA6ICcsJztcbi8vICAgICBpZiAoYyAmJiBkIDwgMTAwMCAmJiBkICE9PSBwYXJzZUludChkLCAxMCkpIHtcbi8vICAgICAgICAgc3BlYyArPSAnLjJmJztcbi8vICAgICB9XG4vLyAgICAgaWYgKGQgPCAxICYmIGQgPiAtMSkge1xuLy8gICAgICAgICBzcGVjICs9ICcuMnMnO1xuLy8gICAgIH1cbi8vICAgICByZXR1cm4gZm10cihzcGVjKShkKTtcbi8vIH07XG5cbnV0aWxzLm51bWJlckZvcm1hdFNJID0gZnVuY3Rpb24oZCwgcCwgYywgbCkge1xuICAgIHZhciBmbXRyLCBzcGVjO1xuICAgIGlmIChpc05hTihkKSB8fCBkID09PSAwKSB7XG4gICAgICAgIHJldHVybiBkO1xuICAgIH1cbiAgICBwID0gdHlwZW9mIHAgPT09ICd1bmRlZmluZWQnID8gMiA6IHA7XG4gICAgYyA9IHR5cGVvZiBjID09PSAndW5kZWZpbmVkJyA/IGZhbHNlIDogISFjO1xuICAgIGZtdHIgPSB0eXBlb2YgbCA9PT0gJ3VuZGVmaW5lZCcgPyBkMy5mb3JtYXQgOiBkMy5mb3JtYXRMb2NhbGUobCkuZm9ybWF0O1xuICAgIHNwZWMgPSBjID8gJyQsJyA6ICcsJztcbiAgICAvLyBzcGVjICs9ICcuJyArIDIgKyAncic7XG4gICAgaWYgKGMgJiYgZCA8IDEwMDAgJiYgZCAhPT0gcGFyc2VJbnQoZCwgMTApKSB7XG4gICAgICBzcGVjICs9ICcuMnMnO1xuICAgIH0gZWxzZSBpZiAoTWF0aC5hYnMoZCkgPiAxICYmIE1hdGguYWJzKGQpIDw9IDEwMDApIHtcbiAgICAgIGQgPSBwID09PSAwID8gTWF0aC5yb3VuZChkKSA6IE1hdGgucm91bmQoZCAqIDEwICogcCkgLyAoMTAgKiBwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3BlYyArPSAnLicgKyBwICsgJ3MnO1xuICAgIH1cbiAgICBpZiAoZCA+IC0xICYmIGQgPCAxKSB7XG4gICAgICByZXR1cm4gZm10cihzcGVjKShkKTtcbiAgICB9XG4gICAgcmV0dXJuIGZtdHIoc3BlYykoZCk7XG59O1xuXG51dGlscy5udW1iZXJGb3JtYXRSb3VuZCA9IGZ1bmN0aW9uKGQsIHAsIGMsIGwpIHtcbiAgICB2YXIgZm10ciwgc3BlYztcbiAgICBpZiAoaXNOYU4oZCkpIHtcbiAgICAgIHJldHVybiBkO1xuICAgIH1cbiAgICBjID0gdHlwZW9mIGMgPT09ICd1bmRlZmluZWQnID8gZmFsc2UgOiAhIWM7XG4gICAgcCA9IHR5cGVvZiBwID09PSAndW5kZWZpbmVkJyA/IGMgPyAyIDogMCA6IHA7XG4gICAgZm10ciA9IHR5cGVvZiBsID09PSAndW5kZWZpbmVkJyA/IGQzLmZvcm1hdCA6IGQzLmZvcm1hdExvY2FsZShsKS5mb3JtYXQ7XG4gICAgc3BlYyA9IGMgPyAnJCwuJyArIHAgKyAnZicgOiAnLCc7XG4gICAgcmV0dXJuIGZtdHIoc3BlYykoZCk7XG59O1xuXG51dGlscy5pc1ZhbGlkRGF0ZSA9IGZ1bmN0aW9uKGQpIHtcbiAgICB2YXIgdGVzdERhdGU7XG4gICAgaWYgKCFkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHRlc3REYXRlID0gbmV3IERhdGUoZCk7XG4gICAgcmV0dXJuIHRlc3REYXRlIGluc3RhbmNlb2YgRGF0ZSAmJiAhaXNOYU4odGVzdERhdGUudmFsdWVPZigpKTtcbn07XG5cbnV0aWxzLmRhdGVGb3JtYXQgPSBmdW5jdGlvbihkLCBwLCBsKSB7XG4gICAgdmFyIGRhdGUsIGxvY2FsZSwgc3BlYywgZm10cjtcbiAgICBkYXRlID0gbmV3IERhdGUoZCk7XG4gICAgaWYgKCEoZGF0ZSBpbnN0YW5jZW9mIERhdGUpIHx8IGlzTmFOKGRhdGUudmFsdWVPZigpKSkge1xuICAgICAgcmV0dXJuIGQ7XG4gICAgfVxuICAgIGlmIChsICYmIGwuaGFzT3duUHJvcGVydHkoJ3RpbWVGb3JtYXQnKSkge1xuICAgICAgLy8gVXNlIHJlYnVpbHQgbG9jYWxlXG4gICAgICBzcGVjID0gcC5pbmRleE9mKCclJykgIT09IC0xID8gcCA6ICcleCc7XG4gICAgICBmbXRyID0gbC50aW1lRm9ybWF0O1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBFbnN1cmUgbG9jYWxpdHkgb2JqZWN0IGhhcyBhbGwgbmVlZGVkIHByb3BlcnRpZXNcbiAgICAgIC8vIFRPRE86IHRoaXMgaXMgZXhwZW5zaXZlIHNvIGNvbnNpZGVyIHJlbW92aW5nXG4gICAgICBsb2NhbGUgPSB1dGlscy5idWlsZExvY2FsaXR5KGwpO1xuICAgICAgZm10ciA9IGQzLnRpbWVGb3JtYXRMb2NhbGUobG9jYWxlKS5mb3JtYXQ7XG4gICAgICBzcGVjID0gcC5pbmRleE9mKCclJykgIT09IC0xID8gcCA6IGxvY2FsZVtwXSB8fCAnJXgnO1xuICAgICAgLy8gVE9ETzogaWYgbm90IGV4cGxpY2l0IHBhdHRlcm4gcHJvdmlkZWQsIHdlIHNob3VsZCB1c2UgLm11bHRpKClcbiAgICB9XG4gICAgcmV0dXJuIGZtdHIoc3BlYykoZGF0ZSk7XG59O1xuXG51dGlscy5idWlsZExvY2FsaXR5ID0gZnVuY3Rpb24obCwgZCkge1xuICAgIHZhciBsb2NhbGUgPSBsIHx8IHt9LFxuICAgICAgICBkZWVwID0gISFkLFxuICAgICAgICB1bmZlciA9IGZ1bmN0aW9uKGEpIHtcbiAgICAgICAgICByZXR1cm4gYS5qb2luKCd8Jykuc3BsaXQoJ3wnKS5tYXAoZnVuY3Rpb24oYikge1xuICAgICAgICAgICAgcmV0dXJuICEoYikgPyAnJyA6IGlzTmFOKGIpID8gYiA6ICtiO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICBkZWZpbml0aW9uID0ge1xuICAgICAgICAgICdkZWNpbWFsJzogJy4nLFxuICAgICAgICAgICd0aG91c2FuZHMnOiAnLCcsXG4gICAgICAgICAgJ2dyb3VwaW5nJzogWzNdLFxuICAgICAgICAgICdjdXJyZW5jeSc6IFsnJCcsICcnXSxcbiAgICAgICAgICAnZGF0ZVRpbWUnOiAnJUIgJS1kLCAlWSBhdCAlWCAlcCBHTVQlWicsIC8vJWNcbiAgICAgICAgICAnZGF0ZSc6ICclYiAlLWQsICVZJywgLy8leFxuICAgICAgICAgICd0aW1lJzogJyUtSTolTTolUycsIC8vJVhcbiAgICAgICAgICAncGVyaW9kcyc6IFsnQU0nLCAnUE0nXSxcbiAgICAgICAgICAnZGF5cyc6IFsnU3VuZGF5JywgJ01vbmRheScsICdUdWVzZGF5JywgJ1dlZG5lc2RheScsICdUaHVyc2RheScsICdGcmlkYXknLCAnU2F0dXJkYXknXSxcbiAgICAgICAgICAnc2hvcnREYXlzJzogWydTdW4nLCAnTW9uJywgJ1R1ZScsICdXZWQnLCAnVGh1JywgJ0ZyaScsICdTYXQnXSxcbiAgICAgICAgICAnbW9udGhzJzogWydKYW51YXJ5JywgJ0ZlYnJ1YXJ5JywgJ01hcmNoJywgJ0FwcmlsJywgJ01heScsICdKdW5lJywgJ0p1bHknLCAnQXVndXN0JywgJ1NlcHRlbWJlcicsICdPY3RvYmVyJywgJ05vdmVtYmVyJywgJ0RlY2VtYmVyJ10sXG4gICAgICAgICAgJ3Nob3J0TW9udGhzJzogWydKYW4nLCAnRmViJywgJ01hcicsICdBcHInLCAnTWF5JywgJ0p1bicsICdKdWwnLCAnQXVnJywgJ1NlcCcsICdPY3QnLCAnTm92JywgJ0RlYyddLFxuICAgICAgICAgIC8vIEN1c3RvbSBwYXR0ZXJuc1xuICAgICAgICAgICdmdWxsJzogJyVBLCAlYycsXG4gICAgICAgICAgJ2xvbmcnOiAnJWMnLFxuICAgICAgICAgICdtZWRpdW0nOiAnJXgsICVYICVwJyxcbiAgICAgICAgICAnc2hvcnQnOiAnJS1tLyUtZC8leSwgJS1JOiVNICVwJyxcbiAgICAgICAgICAneU1NTUVkJzogJyVhLCAleCcsXG4gICAgICAgICAgJ3lNRWQnOiAnJWEsICUtbS8lLWQvJVknLFxuICAgICAgICAgICd5TU1NTWQnOiAnJUIgJS1kLCAlWScsXG4gICAgICAgICAgJ3lNTU1kJzogJyV4JyxcbiAgICAgICAgICAneU1kJzogJyUtbS8lLWQvJVknLFxuICAgICAgICAgICd5TU1NTSc6ICclQiAlWScsXG4gICAgICAgICAgJ3lNTU0nOiAnJWIgJVknLFxuICAgICAgICAgICdNTU1kJzogJyViICUtZCcsXG4gICAgICAgICAgJ01NTU0nOiAnJUInLFxuICAgICAgICAgICdNTU0nOiAnJWInLFxuICAgICAgICAgICd5JzogJyVZJ1xuICAgICAgICB9O1xuXG4gICAgZm9yICh2YXIga2V5IGluIGxvY2FsZSkge1xuICAgICAgdmFyIGQ7XG4gICAgICBpZiAobC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIGQgPSBsb2NhbGVba2V5XTtcbiAgICAgICAgZGVmaW5pdGlvbltrZXldID0gIWRlZXAgfHwgIUFycmF5LmlzQXJyYXkoZCkgPyBkIDogdW5mZXIoZCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlZmluaXRpb247XG59XG5cbnV0aWxzLmRpc3BsYXlOb0RhdGEgPSBmdW5jdGlvbiAoaGFzRGF0YSwgY29udGFpbmVyLCBsYWJlbCwgeCwgeSkge1xuICB2YXIgZGF0YSA9IGhhc0RhdGEgPyBbXSA6IFtsYWJlbF07XG4gIHZhciBub0RhdGFfYmluZCA9IGNvbnRhaW5lci5zZWxlY3RBbGwoJy5zYy1uby1kYXRhJykuZGF0YShkYXRhKTtcbiAgdmFyIG5vRGF0YV9lbnRyID0gbm9EYXRhX2JpbmQuZW50ZXIoKS5hcHBlbmQoJ3RleHQnKVxuICAgICAgICAuYXR0cignY2xhc3MnLCAnc2Mtbm8tZGF0YScpXG4gICAgICAgIC5hdHRyKCdkeScsICctLjdlbScpXG4gICAgICAgIC5zdHlsZSgndGV4dC1hbmNob3InLCAnbWlkZGxlJyk7XG4gIHZhciBub0RhdGEgPSBjb250YWluZXIuc2VsZWN0QWxsKCcuc2Mtbm8tZGF0YScpLm1lcmdlKG5vRGF0YV9lbnRyKTtcbiAgbm9EYXRhX2JpbmQuZXhpdCgpLnJlbW92ZSgpO1xuICBpZiAoISFkYXRhLmxlbmd0aCkge1xuICAgIG5vRGF0YVxuICAgICAgLmF0dHIoJ3gnLCB4KVxuICAgICAgLmF0dHIoJ3knLCB5KVxuICAgICAgLnRleHQodXRpbHMuaWRlbnRpdHkpO1xuICAgIGNvbnRhaW5lci5zZWxlY3RBbGwoJy5zYy1jaGFydC13cmFwJykucmVtb3ZlKCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCB1dGlscztcbi8vIGV4cG9ydCB7dXRpbHMgYXMgZGVmYXVsdH07XG4iLCIvLyBpbXBvcnQgZDMgZnJvbSAnZDMnO1xuaW1wb3J0IHV0aWxzIGZyb20gJy4uL3V0aWxzLmpzJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gUHVibGljIFZhcmlhYmxlcyB3aXRoIERlZmF1bHQgU2V0dGluZ3NcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICB2YXIgbWFyZ2luID0ge3RvcDogMTAsIHJpZ2h0OiAxMCwgYm90dG9tOiAxNSwgbGVmdDogMTB9LFxuICAgICAgd2lkdGggPSAwLFxuICAgICAgaGVpZ2h0ID0gMCxcbiAgICAgIGFsaWduID0gJ3JpZ2h0JyxcbiAgICAgIGRpcmVjdGlvbiA9ICdsdHInLFxuICAgICAgcG9zaXRpb24gPSAnc3RhcnQnLFxuICAgICAgcmFkaXVzID0gNiwgLy8gc2l6ZSBvZiBkb3RcbiAgICAgIGRpYW1ldGVyID0gcmFkaXVzICogMiwgLy8gZGlhbXRlciBvZiBkb3QgcGx1cyBzdHJva2VcbiAgICAgIGd1dHRlciA9IDEwLCAvLyBob3Jpem9udGFsIGdhcCBiZXR3ZWVuIGtleXNcbiAgICAgIHNwYWNpbmcgPSAxMiwgLy8gdmVydGljYWwgZ2FwIGJldHdlZW4ga2V5c1xuICAgICAgdGV4dEdhcCA9IDUsIC8vIGdhcCBiZXR3ZWVuIGRvdCBhbmQgbGFiZWwgYWNjb3VudGluZyBmb3IgZG90IHN0cm9rZVxuICAgICAgZXF1YWxDb2x1bW5zID0gdHJ1ZSxcbiAgICAgIHNob3dBbGwgPSBmYWxzZSxcbiAgICAgIHNob3dNZW51ID0gZmFsc2UsXG4gICAgICBjb2xsYXBzZWQgPSBmYWxzZSxcbiAgICAgIHJvd3NDb3VudCA9IDMsIC8vbnVtYmVyIG9mIHJvd3MgdG8gZGlzcGxheSBpZiBzaG93QWxsID0gZmFsc2VcbiAgICAgIGVuYWJsZWQgPSBmYWxzZSxcbiAgICAgIHN0cmluZ3MgPSB7XG4gICAgICAgIGNsb3NlOiAnSGlkZSBsZWdlbmQnLFxuICAgICAgICB0eXBlOiAnU2hvdyBsZWdlbmQnLFxuICAgICAgICBub0xhYmVsOiAndW5kZWZpbmVkJ1xuICAgICAgfSxcbiAgICAgIGlkID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMDApLCAvL0NyZWF0ZSBzZW1pLXVuaXF1ZSBJRCBpbiBjYXNlIHVzZXIgZG9lc24ndCBzZWxlY3Qgb25lXG4gICAgICBnZXRLZXkgPSBmdW5jdGlvbihkKSB7XG4gICAgICAgIHJldHVybiBkLmtleS5sZW5ndGggPiAwIHx8ICghaXNOYU4ocGFyc2VGbG9hdChkLmtleSkpICYmIGlzRmluaXRlKGQua2V5KSkgPyBkLmtleSA6IGxlZ2VuZC5zdHJpbmdzKCkubm9MYWJlbDtcbiAgICAgIH0sXG4gICAgICBjb2xvciA9IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgcmV0dXJuIHV0aWxzLmRlZmF1bHRDb2xvcigpKGQsIGQuc2VyaWVzSW5kZXgpO1xuICAgICAgfSxcbiAgICAgIGNsYXNzZXMgPSBmdW5jdGlvbihkKSB7XG4gICAgICAgIHJldHVybiAnc2Mtc2VyaWVzIHNjLXNlcmllcy0nICsgZC5zZXJpZXNJbmRleDtcbiAgICAgIH0sXG4gICAgICBkaXNwYXRjaCA9IGQzLmRpc3BhdGNoKCdsZWdlbmRDbGljaycsICdsZWdlbmRNb3VzZW92ZXInLCAnbGVnZW5kTW91c2VvdXQnLCAndG9nZ2xlTWVudScsICdjbG9zZU1lbnUnKTtcblxuICAvLyBQcml2YXRlIFZhcmlhYmxlc1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHZhciBsZWdlbmRPcGVuID0gMDtcblxuICB2YXIgdXNlU2Nyb2xsID0gZmFsc2UsXG4gICAgICBzY3JvbGxFbmFibGVkID0gdHJ1ZSxcbiAgICAgIHNjcm9sbE9mZnNldCA9IDAsXG4gICAgICBvdmVyZmxvd0hhbmRsZXIgPSBmdW5jdGlvbihkKSB7IHJldHVybjsgfTtcblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gIGZ1bmN0aW9uIGxlZ2VuZChzZWxlY3Rpb24pIHtcblxuICAgIHNlbGVjdGlvbi5lYWNoKGZ1bmN0aW9uKGRhdGEpIHtcblxuICAgICAgdmFyIGNvbnRhaW5lciA9IGQzLnNlbGVjdCh0aGlzKSxcbiAgICAgICAgICBjb250YWluZXJXaWR0aCA9IHdpZHRoLFxuICAgICAgICAgIGNvbnRhaW5lckhlaWdodCA9IGhlaWdodCxcbiAgICAgICAgICBrZXlXaWR0aHMgPSBbXSxcbiAgICAgICAgICBsZWdlbmRIZWlnaHQgPSAwLFxuICAgICAgICAgIGRyb3Bkb3duSGVpZ2h0ID0gMCxcbiAgICAgICAgICB0eXBlID0gJycsXG4gICAgICAgICAgaW5saW5lID0gcG9zaXRpb24gPT09ICdzdGFydCcgPyB0cnVlIDogZmFsc2UsXG4gICAgICAgICAgcnRsID0gZGlyZWN0aW9uID09PSAncnRsJyA/IHRydWUgOiBmYWxzZSxcbiAgICAgICAgICBsaW5lU3BhY2luZyA9IHNwYWNpbmcgKiAoaW5saW5lID8gMSA6IDAuNiksXG4gICAgICAgICAgcGFkZGluZyA9IGd1dHRlciArIChpbmxpbmUgPyBkaWFtZXRlciArIHRleHRHYXAgOiAwKTtcblxuICAgICAgaWYgKCFkYXRhIHx8ICFkYXRhLmxlbmd0aCB8fCAhZGF0YS5maWx0ZXIoZnVuY3Rpb24oZCkgeyByZXR1cm4gIWQudmFsdWVzIHx8IGQudmFsdWVzLmxlbmd0aDsgfSkubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBsZWdlbmQ7XG4gICAgICB9XG5cbiAgICAgIC8vIGVuZm9yY2UgZXhpc3RlbmNlIG9mIHNlcmllcyBmb3Igc3RhdGljIGxlZ2VuZCBrZXlzXG4gICAgICB2YXIgaVNlcmllcyA9IGRhdGEuZmlsdGVyKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuaGFzT3duUHJvcGVydHkoJ3Nlcmllc0luZGV4Jyk7IH0pLmxlbmd0aDtcbiAgICAgIGRhdGEuZmlsdGVyKGZ1bmN0aW9uKGQpIHsgcmV0dXJuICFkLmhhc093blByb3BlcnR5KCdzZXJpZXNJbmRleCcpOyB9KS5tYXAoZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICBkLnNlcmllc0luZGV4ID0gaVNlcmllcztcbiAgICAgICAgaVNlcmllcyArPSAxO1xuICAgICAgfSk7XG5cbiAgICAgIGVuYWJsZWQgPSB0cnVlO1xuXG4gICAgICB0eXBlID0gIWRhdGFbMF0udHlwZSB8fCBkYXRhWzBdLnR5cGUgPT09ICdiYXInID8gJ2JhcicgOiAnbGluZSc7XG4gICAgICBhbGlnbiA9IHJ0bCAmJiBhbGlnbiAhPT0gJ2NlbnRlcicgPyBhbGlnbiA9PT0gJ2xlZnQnID8gJ3JpZ2h0JyA6ICdsZWZ0JyA6IGFsaWduO1xuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgLy8gU2V0dXAgY29udGFpbmVycyBhbmQgc2tlbGV0b24gb2YgbGVnZW5kXG5cbiAgICAgIHZhciB3cmFwX2JpbmQgPSBjb250YWluZXIuc2VsZWN0QWxsKCdnLnNjLXdyYXAnKS5kYXRhKFtkYXRhXSk7XG4gICAgICB2YXIgd3JhcF9lbnRyID0gd3JhcF9iaW5kLmVudGVyKCkuYXBwZW5kKCdnJykuYXR0cignY2xhc3MnLCAnc2Mtd3JhcCBzYy1sZWdlbmQnKTtcbiAgICAgIHZhciB3cmFwID0gY29udGFpbmVyLnNlbGVjdCgnZy5zYy13cmFwJykubWVyZ2Uod3JhcF9lbnRyKTtcbiAgICAgIHdyYXAuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgwLDApJyk7XG5cbiAgICAgIHZhciBkZWZzX2VudHIgPSB3cmFwX2VudHIuYXBwZW5kKCdkZWZzJyk7XG4gICAgICB2YXIgZGVmcyA9IHdyYXAuc2VsZWN0KCdkZWZzJyk7XG5cbiAgICAgIGRlZnNfZW50ci5hcHBlbmQoJ2NsaXBQYXRoJykuYXR0cignaWQnLCAnc2MtZWRnZS1jbGlwLScgKyBpZCkuYXBwZW5kKCdyZWN0Jyk7XG4gICAgICB2YXIgY2xpcCA9IHdyYXAuc2VsZWN0KCcjc2MtZWRnZS1jbGlwLScgKyBpZCArICcgcmVjdCcpO1xuXG4gICAgICB3cmFwX2VudHIuYXBwZW5kKCdyZWN0JykuYXR0cignY2xhc3MnLCAnc2MtbGVnZW5kLWJhY2tncm91bmQnKTtcbiAgICAgIHZhciBiYWNrID0gd3JhcC5zZWxlY3QoJy5zYy1sZWdlbmQtYmFja2dyb3VuZCcpO1xuICAgICAgdmFyIGJhY2tGaWx0ZXIgPSB1dGlscy5kcm9wU2hhZG93KCdsZWdlbmRfYmFja18nICsgaWQsIGRlZnMsIHtibHVyOiAyfSk7XG5cbiAgICAgIHdyYXBfZW50ci5hcHBlbmQoJ3RleHQnKS5hdHRyKCdjbGFzcycsICdzYy1sZWdlbmQtbGluaycpO1xuICAgICAgdmFyIGxpbmsgPSB3cmFwLnNlbGVjdCgnLnNjLWxlZ2VuZC1saW5rJyk7XG5cbiAgICAgIHZhciBtYXNrX2VudHIgPSB3cmFwX2VudHIuYXBwZW5kKCdnJykuYXR0cignY2xhc3MnLCAnc2MtbGVnZW5kLW1hc2snKTtcbiAgICAgIHZhciBtYXNrID0gd3JhcC5zZWxlY3QoJy5zYy1sZWdlbmQtbWFzaycpO1xuXG4gICAgICBtYXNrX2VudHIuYXBwZW5kKCdnJykuYXR0cignY2xhc3MnLCAnc2MtZ3JvdXAnKTtcbiAgICAgIHZhciBnID0gd3JhcC5zZWxlY3QoJy5zYy1ncm91cCcpO1xuXG4gICAgICB2YXIgc2VyaWVzX2JpbmQgPSBnLnNlbGVjdEFsbCgnLnNjLXNlcmllcycpLmRhdGEodXRpbHMuaWRlbnRpdHksIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuc2VyaWVzSW5kZXg7IH0pO1xuICAgICAgc2VyaWVzX2JpbmQuZXhpdCgpLnJlbW92ZSgpO1xuICAgICAgdmFyIHNlcmllc19lbnRyID0gc2VyaWVzX2JpbmQuZW50ZXIoKS5hcHBlbmQoJ2cnKS5hdHRyKCdjbGFzcycsICdzYy1zZXJpZXMnKVxuICAgICAgICAgICAgLm9uKCdtb3VzZW92ZXInLCBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgICAgIGRpc3BhdGNoLmNhbGwoJ2xlZ2VuZE1vdXNlb3ZlcicsIHRoaXMsIGQpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5vbignbW91c2VvdXQnLCBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgICAgIGRpc3BhdGNoLmNhbGwoJ2xlZ2VuZE1vdXNlb3V0JywgdGhpcywgZCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLm9uKCdjbGljaycsIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgICAgICAgZDMuZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgZDMuZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgIGRpc3BhdGNoLmNhbGwoJ2xlZ2VuZENsaWNrJywgdGhpcywgZCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgIHZhciBzZXJpZXMgPSBnLnNlbGVjdEFsbCgnLnNjLXNlcmllcycpLm1lcmdlKHNlcmllc19lbnRyKTtcblxuICAgICAgc2VyaWVzXG4gICAgICAgICAgLmF0dHIoJ2NsYXNzJywgY2xhc3NlcylcbiAgICAgICAgICAuYXR0cignZmlsbCcsIGNvbG9yKVxuICAgICAgICAgIC5hdHRyKCdzdHJva2UnLCBjb2xvcilcbiAgICAgIHNlcmllc19lbnRyXG4gICAgICAgIC5hcHBlbmQoJ3JlY3QnKVxuICAgICAgICAgIC5hdHRyKCd4JywgKGRpYW1ldGVyICsgdGV4dEdhcCkgLyAtMilcbiAgICAgICAgICAuYXR0cigneScsIChkaWFtZXRlciArIGxpbmVTcGFjaW5nKSAvIC0yKVxuICAgICAgICAgIC5hdHRyKCd3aWR0aCcsIGRpYW1ldGVyICsgdGV4dEdhcClcbiAgICAgICAgICAuYXR0cignaGVpZ2h0JywgZGlhbWV0ZXIgKyBsaW5lU3BhY2luZylcbiAgICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAnI0ZGRScpXG4gICAgICAgICAgLnN0eWxlKCdzdHJva2Utd2lkdGgnLCAwKVxuICAgICAgICAgIC5zdHlsZSgnb3BhY2l0eScsIDAuMSk7XG5cbiAgICAgIHZhciBjaXJjbGVzX2JpbmQgPSBzZXJpZXNfZW50ci5zZWxlY3RBbGwoJ2NpcmNsZScpLmRhdGEoZnVuY3Rpb24oZCkgeyByZXR1cm4gdHlwZSA9PT0gJ2xpbmUnID8gW2QsIGRdIDogW2RdOyB9KTtcbiAgICAgIGNpcmNsZXNfYmluZC5leGl0KCkucmVtb3ZlKCk7XG4gICAgICB2YXIgY2lyY2xlc19lbnRyID0gY2lyY2xlc19iaW5kLmVudGVyKClcbiAgICAgICAgLmFwcGVuZCgnY2lyY2xlJylcbiAgICAgICAgICAuYXR0cigncicsIHJhZGl1cylcbiAgICAgICAgICAuc3R5bGUoJ3N0cm9rZS13aWR0aCcsICcycHgnKTtcbiAgICAgIHZhciBjaXJjbGVzID0gc2VyaWVzLnNlbGVjdEFsbCgnY2lyY2xlJykubWVyZ2UoY2lyY2xlc19lbnRyKTtcblxuICAgICAgdmFyIGxpbmVfYmluZCA9IHNlcmllc19lbnRyLnNlbGVjdEFsbCgnbGluZScpLmRhdGEodHlwZSA9PT0gJ2xpbmUnID8gZnVuY3Rpb24oZCkgeyByZXR1cm4gW2RdOyB9IDogW10pO1xuICAgICAgbGluZV9iaW5kLmV4aXQoKS5yZW1vdmUoKTtcbiAgICAgIHZhciBsaW5lc19lbnRyID0gbGluZV9iaW5kLmVudGVyKClcbiAgICAgICAgLmFwcGVuZCgnbGluZScpXG4gICAgICAgICAgLmF0dHIoJ3gwJywgMClcbiAgICAgICAgICAuYXR0cigneTAnLCAwKVxuICAgICAgICAgIC5hdHRyKCd5MScsIDApXG4gICAgICAgICAgLnN0eWxlKCdzdHJva2Utd2lkdGgnLCAnNHB4Jyk7XG4gICAgICB2YXIgbGluZXMgPSBzZXJpZXMuc2VsZWN0QWxsKCdsaW5lJykubWVyZ2UobGluZXNfZW50cik7XG5cbiAgICAgIHZhciB0ZXh0c19lbnRyID0gc2VyaWVzX2VudHIuYXBwZW5kKCd0ZXh0JylcbiAgICAgICAgLmF0dHIoJ2R4JywgMCk7XG4gICAgICB2YXIgdGV4dHMgPSBzZXJpZXMuc2VsZWN0QWxsKCd0ZXh0JykubWVyZ2UodGV4dHNfZW50cik7XG5cbiAgICAgIHRleHRzXG4gICAgICAgIC5hdHRyKCdkeScsIGlubGluZSA/ICcuMzZlbScgOiAnLjcxZW0nKVxuICAgICAgICAudGV4dChnZXRLZXkpO1xuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgLy8gVXBkYXRlIGxlZ2VuZCBhdHRyaWJ1dGVzXG5cbiAgICAgIGNsaXBcbiAgICAgICAgLmF0dHIoJ3gnLCAwLjUpXG4gICAgICAgIC5hdHRyKCd5JywgMC41KVxuICAgICAgICAuYXR0cignd2lkdGgnLCAwKVxuICAgICAgICAuYXR0cignaGVpZ2h0JywgMCk7XG5cbiAgICAgIGJhY2tcbiAgICAgICAgLmF0dHIoJ3gnLCAwLjUpXG4gICAgICAgIC5hdHRyKCd5JywgMC41KVxuICAgICAgICAuYXR0cignd2lkdGgnLCAwKVxuICAgICAgICAuYXR0cignaGVpZ2h0JywgMClcbiAgICAgICAgLnN0eWxlKCdvcGFjaXR5JywgMClcbiAgICAgICAgLnN0eWxlKCdwb2ludGVyLWV2ZW50cycsICdhbGwnKVxuICAgICAgICAub24oJ2NsaWNrJywgZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICAgIGQzLmV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICB9KTtcblxuICAgICAgbGlua1xuICAgICAgICAudGV4dChsZWdlbmRPcGVuID09PSAxID8gbGVnZW5kLnN0cmluZ3MoKS5jbG9zZSA6IGxlZ2VuZC5zdHJpbmdzKCkub3BlbilcbiAgICAgICAgLmF0dHIoJ3RleHQtYW5jaG9yJywgYWxpZ24gPT09ICdsZWZ0JyA/IHJ0bCA/ICdlbmQnIDogJ3N0YXJ0JyA6IHJ0bCA/ICdzdGFydCcgOiAnZW5kJylcbiAgICAgICAgLmF0dHIoJ2R5JywgJy4zNmVtJylcbiAgICAgICAgLmF0dHIoJ2R4JywgMClcbiAgICAgICAgLnN0eWxlKCdvcGFjaXR5JywgMClcbiAgICAgICAgLm9uKCdjbGljaycsIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgICBkMy5ldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIGQzLmV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgIGRpc3BhdGNoLmNhbGwoJ3RvZ2dsZU1lbnUnLCB0aGlzLCBkLCBpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgIHNlcmllcy5jbGFzc2VkKCdkaXNhYmxlZCcsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgcmV0dXJuIGQuZGlzYWJsZWQ7XG4gICAgICB9KTtcblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAgICAgLy9UT0RPOiBhZGQgYWJpbGl0eSB0byBhZGQga2V5IHRvIGxlZ2VuZFxuICAgICAgLy9UT0RPOiBoYXZlIHNlcmllcyBkaXNwbGF5IHZhbHVlcyBvbiBob3ZlclxuICAgICAgLy92YXIgbGFiZWwgPSBnLmFwcGVuZCgndGV4dCcpLnRleHQoJ1Byb2JhYmlsaXR5OicpLmF0dHIoJ2NsYXNzJywnc2Mtc2VyaWVzLWxhYmVsJykuYXR0cigndHJhbnNmb3JtJywndHJhbnNsYXRlKDAsMCknKTtcblxuICAgICAgLy8gc3RvcmUgbGVnZW5kIGxhYmVsIHdpZHRoc1xuICAgICAgbGVnZW5kLmNhbGNNYXhXaWR0aCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBrZXlXaWR0aHMgPSBbXTtcblxuICAgICAgICBnLnN0eWxlKCdkaXNwbGF5JywgJ2lubGluZScpO1xuXG4gICAgICAgIHRleHRzLmVhY2goZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICAgIHZhciB0ZXh0V2lkdGggPSBkMy5zZWxlY3QodGhpcykubm9kZSgpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLndpZHRoO1xuICAgICAgICAgIGtleVdpZHRocy5wdXNoKE1hdGgubWF4KE1hdGguZmxvb3IodGV4dFdpZHRoKSwgKHR5cGUgPT09ICdsaW5lJyA/IDUwIDogMjApKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGxlZ2VuZC53aWR0aChkMy5zdW0oa2V5V2lkdGhzKSArIGtleVdpZHRocy5sZW5ndGggKiBwYWRkaW5nIC0gZ3V0dGVyKTtcblxuICAgICAgICByZXR1cm4gbGVnZW5kLndpZHRoKCk7XG4gICAgICB9O1xuXG4gICAgICBsZWdlbmQuZ2V0TGluZUhlaWdodCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBnLnN0eWxlKCdkaXNwbGF5JywgJ2lubGluZScpO1xuICAgICAgICB2YXIgbGluZUhlaWdodEJCID0gTWF0aC5mbG9vcih0ZXh0cy5ub2RlKCkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0KTtcbiAgICAgICAgcmV0dXJuIGxpbmVIZWlnaHRCQjtcbiAgICAgIH07XG5cbiAgICAgIGxlZ2VuZC5hcnJhbmdlID0gZnVuY3Rpb24oY29udGFpbmVyV2lkdGgpIHtcblxuICAgICAgICBpZiAoa2V5V2lkdGhzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIHRoaXMuY2FsY01heFdpZHRoKCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBrZXlXaWR0aChpKSB7XG4gICAgICAgICAgcmV0dXJuIGtleVdpZHRoc1tpXSArIHBhZGRpbmc7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24ga2V5V2lkdGhOb0d1dHRlcihpKSB7XG4gICAgICAgICAgcmV0dXJuIGtleVdpZHRoc1tpXSArIHBhZGRpbmcgLSBndXR0ZXI7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gc2lnbihib29sKSB7XG4gICAgICAgICAgcmV0dXJuIGJvb2wgPyAxIDogLTE7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIga2V5cyA9IGtleVdpZHRocy5sZW5ndGgsXG4gICAgICAgICAgICByb3dzID0gMSxcbiAgICAgICAgICAgIGNvbHMgPSBrZXlzLFxuICAgICAgICAgICAgY29sdW1uV2lkdGhzID0gW10sXG4gICAgICAgICAgICBrZXlQb3NpdGlvbnMgPSBbXSxcbiAgICAgICAgICAgIG1heFdpZHRoID0gY29udGFpbmVyV2lkdGggLSBtYXJnaW4ubGVmdCAtIG1hcmdpbi5yaWdodCxcbiAgICAgICAgICAgIG1heFJvd1dpZHRoID0gMCxcbiAgICAgICAgICAgIG1pblJvd1dpZHRoID0gMCxcbiAgICAgICAgICAgIHRleHRIZWlnaHQgPSB0aGlzLmdldExpbmVIZWlnaHQoKSxcbiAgICAgICAgICAgIGxpbmVIZWlnaHQgPSBkaWFtZXRlciArIChpbmxpbmUgPyAwIDogdGV4dEhlaWdodCkgKyBsaW5lU3BhY2luZyxcbiAgICAgICAgICAgIG1lbnVNYXJnaW4gPSB7dG9wOiA3LCByaWdodDogNywgYm90dG9tOiA3LCBsZWZ0OiA3fSwgLy8gYWNjb3VudCBmb3Igc3Ryb2tlIHdpZHRoXG4gICAgICAgICAgICB4cG9zID0gMCxcbiAgICAgICAgICAgIHlwb3MgPSAwLFxuICAgICAgICAgICAgaSxcbiAgICAgICAgICAgIG1vZCxcbiAgICAgICAgICAgIHNoaWZ0O1xuXG4gICAgICAgIGlmIChlcXVhbENvbHVtbnMpIHtcblxuICAgICAgICAgIC8va2VlcCBkZWNyZWFzaW5nIHRoZSBudW1iZXIgb2Yga2V5cyBwZXIgcm93IHVudGlsXG4gICAgICAgICAgLy9sZWdlbmQgd2lkdGggaXMgbGVzcyB0aGFuIHRoZSBhdmFpbGFibGUgd2lkdGhcbiAgICAgICAgICB3aGlsZSAoY29scyA+IDApIHtcbiAgICAgICAgICAgIGNvbHVtbldpZHRocyA9IFtdO1xuXG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwga2V5czsgaSArPSAxKSB7XG4gICAgICAgICAgICAgIGlmIChrZXlXaWR0aChpKSA+IChjb2x1bW5XaWR0aHNbaSAlIGNvbHNdIHx8IDApKSB7XG4gICAgICAgICAgICAgICAgY29sdW1uV2lkdGhzW2kgJSBjb2xzXSA9IGtleVdpZHRoKGkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChkMy5zdW0oY29sdW1uV2lkdGhzKSAtIGd1dHRlciA8IG1heFdpZHRoKSB7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29scyAtPSAxO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb2xzID0gY29scyB8fCAxO1xuXG4gICAgICAgICAgcm93cyA9IE1hdGguY2VpbChrZXlzIC8gY29scyk7XG4gICAgICAgICAgbWF4Um93V2lkdGggPSBkMy5zdW0oY29sdW1uV2lkdGhzKSAtIGd1dHRlcjtcblxuICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBrZXlzOyBpICs9IDEpIHtcbiAgICAgICAgICAgIG1vZCA9IGkgJSBjb2xzO1xuXG4gICAgICAgICAgICBpZiAoaW5saW5lKSB7XG4gICAgICAgICAgICAgIGlmIChtb2QgPT09IDApIHtcbiAgICAgICAgICAgICAgICB4cG9zID0gcnRsID8gbWF4Um93V2lkdGggOiAwO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHhwb3MgKz0gY29sdW1uV2lkdGhzW21vZCAtIDFdICogc2lnbighcnRsKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgaWYgKG1vZCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHhwb3MgPSAocnRsID8gbWF4Um93V2lkdGggOiAwKSArIChjb2x1bW5XaWR0aHNbbW9kXSAtIGd1dHRlcikgLyAyICogc2lnbighcnRsKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB4cG9zICs9IChjb2x1bW5XaWR0aHNbbW9kIC0gMV0gKyBjb2x1bW5XaWR0aHNbbW9kXSkgLyAyICogc2lnbighcnRsKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB5cG9zID0gTWF0aC5mbG9vcihpIC8gY29scykgKiBsaW5lSGVpZ2h0O1xuICAgICAgICAgICAga2V5UG9zaXRpb25zW2ldID0ge3g6IHhwb3MsIHk6IHlwb3N9O1xuICAgICAgICAgIH1cblxuICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgaWYgKHJ0bCkge1xuXG4gICAgICAgICAgICB4cG9zID0gbWF4V2lkdGg7XG5cbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBrZXlzOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgaWYgKHhwb3MgLSBrZXlXaWR0aE5vR3V0dGVyKGkpIDwgMCkge1xuICAgICAgICAgICAgICAgIG1heFJvd1dpZHRoID0gTWF0aC5tYXgobWF4Um93V2lkdGgsIGtleVdpZHRoTm9HdXR0ZXIoaSkpO1xuICAgICAgICAgICAgICAgIHhwb3MgPSBtYXhXaWR0aDtcbiAgICAgICAgICAgICAgICBpZiAoaSkge1xuICAgICAgICAgICAgICAgICAgcm93cyArPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoeHBvcyAtIGtleVdpZHRoTm9HdXR0ZXIoaSkgPiBtYXhSb3dXaWR0aCkge1xuICAgICAgICAgICAgICAgIG1heFJvd1dpZHRoID0geHBvcyAtIGtleVdpZHRoTm9HdXR0ZXIoaSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAga2V5UG9zaXRpb25zW2ldID0ge3g6IHhwb3MsIHk6IChyb3dzIC0gMSkgKiAobGluZVNwYWNpbmcgKyBkaWFtZXRlcil9O1xuICAgICAgICAgICAgICB4cG9zIC09IGtleVdpZHRoKGkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgeHBvcyA9IDA7XG5cbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBrZXlzOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgaWYgKGkgJiYgeHBvcyArIGtleVdpZHRoTm9HdXR0ZXIoaSkgPiBtYXhXaWR0aCkge1xuICAgICAgICAgICAgICAgIHhwb3MgPSAwO1xuICAgICAgICAgICAgICAgIHJvd3MgKz0gMTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoeHBvcyArIGtleVdpZHRoTm9HdXR0ZXIoaSkgPiBtYXhSb3dXaWR0aCkge1xuICAgICAgICAgICAgICAgIG1heFJvd1dpZHRoID0geHBvcyArIGtleVdpZHRoTm9HdXR0ZXIoaSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAga2V5UG9zaXRpb25zW2ldID0ge3g6IHhwb3MsIHk6IChyb3dzIC0gMSkgKiAobGluZVNwYWNpbmcgKyBkaWFtZXRlcil9O1xuICAgICAgICAgICAgICB4cG9zICs9IGtleVdpZHRoKGkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgfVxuXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXNob3dNZW51ICYmIChzaG93QWxsIHx8IHJvd3MgPD0gcm93c0NvdW50KSkge1xuXG4gICAgICAgICAgbGVnZW5kT3BlbiA9IDA7XG4gICAgICAgICAgY29sbGFwc2VkID0gZmFsc2U7XG4gICAgICAgICAgdXNlU2Nyb2xsID0gZmFsc2U7XG5cbiAgICAgICAgICBsZWdlbmRcbiAgICAgICAgICAgIC53aWR0aChtYXJnaW4ubGVmdCArIG1heFJvd1dpZHRoICsgbWFyZ2luLnJpZ2h0KVxuICAgICAgICAgICAgLmhlaWdodChtYXJnaW4udG9wICsgcm93cyAqIGxpbmVIZWlnaHQgLSBsaW5lU3BhY2luZyArIG1hcmdpbi5ib3R0b20pO1xuXG4gICAgICAgICAgc3dpdGNoIChhbGlnbikge1xuICAgICAgICAgICAgY2FzZSAnbGVmdCc6XG4gICAgICAgICAgICAgIHNoaWZ0ID0gMDtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdjZW50ZXInOlxuICAgICAgICAgICAgICBzaGlmdCA9IChjb250YWluZXJXaWR0aCAtIGxlZ2VuZC53aWR0aCgpKSAvIDI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAncmlnaHQnOlxuICAgICAgICAgICAgICBzaGlmdCA9IDA7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNsaXBcbiAgICAgICAgICAgIC5hdHRyKCd5JywgMClcbiAgICAgICAgICAgIC5hdHRyKCd3aWR0aCcsIGxlZ2VuZC53aWR0aCgpKVxuICAgICAgICAgICAgLmF0dHIoJ2hlaWdodCcsIGxlZ2VuZC5oZWlnaHQoKSk7XG5cbiAgICAgICAgICBiYWNrXG4gICAgICAgICAgICAuYXR0cigneCcsIHNoaWZ0KVxuICAgICAgICAgICAgLmF0dHIoJ3dpZHRoJywgbGVnZW5kLndpZHRoKCkpXG4gICAgICAgICAgICAuYXR0cignaGVpZ2h0JywgbGVnZW5kLmhlaWdodCgpKVxuICAgICAgICAgICAgLmF0dHIoJ3J4JywgMClcbiAgICAgICAgICAgIC5hdHRyKCdyeScsIDApXG4gICAgICAgICAgICAuYXR0cignZmlsdGVyJywgJ25vbmUnKVxuICAgICAgICAgICAgLnN0eWxlKCdkaXNwbGF5JywgJ2lubGluZScpXG4gICAgICAgICAgICAuc3R5bGUoJ29wYWNpdHknLCAwKTtcblxuICAgICAgICAgIG1hc2tcbiAgICAgICAgICAgIC5hdHRyKCdjbGlwLXBhdGgnLCAnbm9uZScpXG4gICAgICAgICAgICAuYXR0cigndHJhbnNmb3JtJywgZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICAgICAgICB2YXIgeHBvcyA9IHNoaWZ0ICsgbWFyZ2luLmxlZnQgKyAoaW5saW5lID8gcmFkaXVzICogc2lnbighcnRsKSA6IDApLFxuICAgICAgICAgICAgICAgICAgeXBvcyA9IG1hcmdpbi50b3AgKyBtZW51TWFyZ2luLnRvcDtcbiAgICAgICAgICAgICAgcmV0dXJuICd0cmFuc2xhdGUoJyArIHhwb3MgKyAnLCcgKyB5cG9zICsgJyknO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICBnXG4gICAgICAgICAgICAuc3R5bGUoJ29wYWNpdHknLCAxKVxuICAgICAgICAgICAgLnN0eWxlKCdkaXNwbGF5JywgJ2lubGluZScpO1xuXG4gICAgICAgICAgc2VyaWVzXG4gICAgICAgICAgICAuYXR0cigndHJhbnNmb3JtJywgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICB2YXIgcG9zID0ga2V5UG9zaXRpb25zW2Quc2VyaWVzSW5kZXhdO1xuICAgICAgICAgICAgICByZXR1cm4gJ3RyYW5zbGF0ZSgnICsgcG9zLnggKyAnLCcgKyBwb3MueSArICcpJztcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgc2VyaWVzLnNlbGVjdCgncmVjdCcpXG4gICAgICAgICAgICAuYXR0cigneCcsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgdmFyIHhwb3MgPSAwO1xuICAgICAgICAgICAgICBpZiAoaW5saW5lKSB7XG4gICAgICAgICAgICAgICAgeHBvcyA9IChkaWFtZXRlciArIGd1dHRlcikgLyAyICogc2lnbihydGwpO1xuICAgICAgICAgICAgICAgIHhwb3MgLT0gcnRsID8ga2V5V2lkdGgoZC5zZXJpZXNJbmRleCkgOiAwO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHhwb3MgPSBrZXlXaWR0aChkLnNlcmllc0luZGV4KSAvIC0yO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiB4cG9zO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5hdHRyKCd3aWR0aCcsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGtleVdpZHRoKGQuc2VyaWVzSW5kZXgpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5hdHRyKCdoZWlnaHQnLCBsaW5lSGVpZ2h0KTtcblxuICAgICAgICAgIGNpcmNsZXNcbiAgICAgICAgICAgIC5hdHRyKCdyJywgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICByZXR1cm4gZC50eXBlID09PSAnZGFzaCcgPyAwIDogcmFkaXVzO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgICAgIHZhciB4cG9zID0gaW5saW5lIHx8IHR5cGUgPT09ICdiYXInID8gMCA6IHJhZGl1cyAqIDMgKiBzaWduKGkpO1xuICAgICAgICAgICAgICByZXR1cm4gJ3RyYW5zbGF0ZSgnICsgeHBvcyArICcsMCknO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICBsaW5lc1xuICAgICAgICAgICAgLmF0dHIoJ3gxJywgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICByZXR1cm4gZC50eXBlID09PSAnZGFzaCcgPyByYWRpdXMgKiA4IDogcmFkaXVzICogNDtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuYXR0cigndHJhbnNmb3JtJywgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICB2YXIgeHBvcyA9IHJhZGl1cyAqIChkLnR5cGUgPT09ICdkYXNoJyA/IC00IDogLTIpO1xuICAgICAgICAgICAgICByZXR1cm4gJ3RyYW5zbGF0ZSgnICsgeHBvcyArICcsMCknO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdHlsZSgnc3Ryb2tlLWRhc2hhcnJheScsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGQudHlwZSA9PT0gJ2Rhc2gnID8gJzgsIDgnIDogJ25vbmUnO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdHlsZSgnc3Ryb2tlLWRhc2hvZmZzZXQnLCAtNCk7XG5cbiAgICAgICAgICB0ZXh0c1xuICAgICAgICAgICAgLmF0dHIoJ2R5JywgaW5saW5lID8gJy4zNmVtJyA6ICcuNzFlbScpXG4gICAgICAgICAgICAuYXR0cigndGV4dC1hbmNob3InLCBwb3NpdGlvbilcbiAgICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgIHZhciB4cG9zID0gaW5saW5lID8gKHJhZGl1cyArIHRleHRHYXApICogc2lnbighcnRsKSA6IDAsXG4gICAgICAgICAgICAgICAgICB5cG9zID0gaW5saW5lID8gMCA6IChkaWFtZXRlciArIGxpbmVTcGFjaW5nKSAvIDI7XG4gICAgICAgICAgICAgIHJldHVybiAndHJhbnNsYXRlKCcgKyB4cG9zICsgJywnICsgeXBvcyArICcpJztcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICBjb2xsYXBzZWQgPSB0cnVlO1xuICAgICAgICAgIHVzZVNjcm9sbCA9IHRydWU7XG5cbiAgICAgICAgICBsZWdlbmRcbiAgICAgICAgICAgIC53aWR0aChtZW51TWFyZ2luLmxlZnQgKyBkMy5tYXgoa2V5V2lkdGhzKSArIGRpYW1ldGVyICsgdGV4dEdhcCArIG1lbnVNYXJnaW4ucmlnaHQpXG4gICAgICAgICAgICAuaGVpZ2h0KG1hcmdpbi50b3AgKyBkaWFtZXRlciArIG1hcmdpbi50b3ApOyAvL2Rvbid0IHVzZSBib3R0b20gaGVyZSBiZWNhdXNlIHdlIHdhbnQgdmVydGljYWwgY2VudGVyaW5nXG5cbiAgICAgICAgICBsZWdlbmRIZWlnaHQgPSBtZW51TWFyZ2luLnRvcCArIGRpYW1ldGVyICoga2V5cyArIHNwYWNpbmcgKiAoa2V5cyAtIDEpICsgbWVudU1hcmdpbi5ib3R0b207XG4gICAgICAgICAgZHJvcGRvd25IZWlnaHQgPSBNYXRoLm1pbihjb250YWluZXJIZWlnaHQgLSBsZWdlbmQuaGVpZ2h0KCksIGxlZ2VuZEhlaWdodCk7XG5cbiAgICAgICAgICBjbGlwXG4gICAgICAgICAgICAuYXR0cigneCcsIDAuNSAtIG1lbnVNYXJnaW4udG9wIC0gcmFkaXVzKVxuICAgICAgICAgICAgLmF0dHIoJ3knLCAwLjUgLSBtZW51TWFyZ2luLnRvcCAtIHJhZGl1cylcbiAgICAgICAgICAgIC5hdHRyKCd3aWR0aCcsIGxlZ2VuZC53aWR0aCgpKVxuICAgICAgICAgICAgLmF0dHIoJ2hlaWdodCcsIGRyb3Bkb3duSGVpZ2h0KTtcblxuICAgICAgICAgIGJhY2tcbiAgICAgICAgICAgIC5hdHRyKCd4JywgMC41KVxuICAgICAgICAgICAgLmF0dHIoJ3knLCAwLjUgKyBsZWdlbmQuaGVpZ2h0KCkpXG4gICAgICAgICAgICAuYXR0cignd2lkdGgnLCBsZWdlbmQud2lkdGgoKSlcbiAgICAgICAgICAgIC5hdHRyKCdoZWlnaHQnLCBkcm9wZG93bkhlaWdodClcbiAgICAgICAgICAgIC5hdHRyKCdyeCcsIDIpXG4gICAgICAgICAgICAuYXR0cigncnknLCAyKVxuICAgICAgICAgICAgLmF0dHIoJ2ZpbHRlcicsIGJhY2tGaWx0ZXIpXG4gICAgICAgICAgICAuc3R5bGUoJ29wYWNpdHknLCBsZWdlbmRPcGVuICogMC45KVxuICAgICAgICAgICAgLnN0eWxlKCdkaXNwbGF5JywgbGVnZW5kT3BlbiA/ICdpbmxpbmUnIDogJ25vbmUnKTtcblxuICAgICAgICAgIGxpbmtcbiAgICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgICAgIHZhciB4cG9zID0gYWxpZ24gPT09ICdsZWZ0JyA/IDAuNSA6IDAuNSArIGxlZ2VuZC53aWR0aCgpLFxuICAgICAgICAgICAgICAgICAgeXBvcyA9IG1hcmdpbi50b3AgKyByYWRpdXM7XG4gICAgICAgICAgICAgIHJldHVybiAndHJhbnNsYXRlKCcgKyB4cG9zICsgJywnICsgeXBvcyArICcpJztcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuc3R5bGUoJ29wYWNpdHknLCAxKTtcblxuICAgICAgICAgIG1hc2tcbiAgICAgICAgICAgIC5hdHRyKCdjbGlwLXBhdGgnLCAndXJsKCNzYy1lZGdlLWNsaXAtJyArIGlkICsgJyknKVxuICAgICAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgICAgICAgdmFyIHhwb3MgPSBtZW51TWFyZ2luLmxlZnQgKyByYWRpdXMsXG4gICAgICAgICAgICAgICAgICB5cG9zID0gbGVnZW5kLmhlaWdodCgpICsgbWVudU1hcmdpbi50b3AgKyByYWRpdXM7XG4gICAgICAgICAgICAgIHJldHVybiAndHJhbnNsYXRlKCcgKyB4cG9zICsgJywnICsgeXBvcyArICcpJztcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgZ1xuICAgICAgICAgICAgLnN0eWxlKCdvcGFjaXR5JywgbGVnZW5kT3BlbilcbiAgICAgICAgICAgIC5zdHlsZSgnZGlzcGxheScsIGxlZ2VuZE9wZW4gPyAnaW5saW5lJyA6ICdub25lJylcbiAgICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgICAgIHZhciB4cG9zID0gcnRsID8gZDMubWF4KGtleVdpZHRocykgKyByYWRpdXMgOiAwO1xuICAgICAgICAgICAgICByZXR1cm4gJ3RyYW5zbGF0ZSgnICsgeHBvcyArICcsMCknO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICBzZXJpZXNcbiAgICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgICAgIHZhciB5cG9zID0gaSAqIChkaWFtZXRlciArIHNwYWNpbmcpO1xuICAgICAgICAgICAgICByZXR1cm4gJ3RyYW5zbGF0ZSgwLCcgKyB5cG9zICsgJyknO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICBzZXJpZXMuc2VsZWN0KCdyZWN0JylcbiAgICAgICAgICAgIC5hdHRyKCd4JywgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICB2YXIgdyA9IChkaWFtZXRlciArIGd1dHRlcikgLyAyICogc2lnbihydGwpO1xuICAgICAgICAgICAgICB3IC09IHJ0bCA/IGtleVdpZHRoKGQuc2VyaWVzSW5kZXgpIDogMDtcbiAgICAgICAgICAgICAgcmV0dXJuIHc7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmF0dHIoJ3dpZHRoJywgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICByZXR1cm4ga2V5V2lkdGgoZC5zZXJpZXNJbmRleCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmF0dHIoJ2hlaWdodCcsIGRpYW1ldGVyICsgbGluZVNwYWNpbmcpO1xuXG4gICAgICAgICAgY2lyY2xlc1xuICAgICAgICAgICAgLmF0dHIoJ3InLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgIHJldHVybiBkLnR5cGUgPT09ICdkYXNoJyA/IDAgOiBkLnR5cGUgPT09ICdsaW5lJyA/IHJhZGl1cyAtIDIgOiByYWRpdXM7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsICcnKTtcblxuICAgICAgICAgIGxpbmVzXG4gICAgICAgICAgICAuYXR0cigneDEnLCAxNilcbiAgICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKC04LDApJylcbiAgICAgICAgICAgIC5zdHlsZSgnc3Ryb2tlLWRhc2hhcnJheScsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGQudHlwZSA9PT0gJ2Rhc2gnID8gJzYsIDQsIDYnIDogJ25vbmUnO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdHlsZSgnc3Ryb2tlLWRhc2hvZmZzZXQnLCAwKTtcblxuICAgICAgICAgIHRleHRzXG4gICAgICAgICAgICAuYXR0cigndGV4dC1hbmNob3InLCAnc3RhcnQnKVxuICAgICAgICAgICAgLmF0dHIoJ2R5JywgJy4zNmVtJylcbiAgICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgIHZhciB4cG9zID0gKHJhZGl1cyArIHRleHRHYXApICogc2lnbighcnRsKTtcbiAgICAgICAgICAgICAgcmV0dXJuICd0cmFuc2xhdGUoJyArIHhwb3MgKyAnLDApJztcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH1cblxuICAgICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgICAvLyBFbmFibGUgc2Nyb2xsaW5nXG4gICAgICAgIGlmIChzY3JvbGxFbmFibGVkKSB7XG4gICAgICAgICAgdmFyIGRpZmYgPSBkcm9wZG93bkhlaWdodCAtIGxlZ2VuZEhlaWdodDtcblxuICAgICAgICAgIHZhciBhc3NpZ25TY3JvbGxFdmVudHMgPSBmdW5jdGlvbihlbmFibGUpIHtcbiAgICAgICAgICAgIGlmIChlbmFibGUpIHtcblxuICAgICAgICAgICAgICB2YXIgem9vbSA9IGQzLnpvb20oKVxuICAgICAgICAgICAgICAgICAgICAub24oJ3pvb20nLCBwYW5MZWdlbmQpO1xuICAgICAgICAgICAgICB2YXIgZHJhZyA9IGQzLmRyYWcoKVxuICAgICAgICAgICAgICAgICAgICAuc3ViamVjdCh1dGlscy5pZGVudGl0eSlcbiAgICAgICAgICAgICAgICAgICAgLm9uKCdkcmFnJywgcGFuTGVnZW5kKTtcblxuICAgICAgICAgICAgICBiYWNrLmNhbGwoem9vbSk7XG4gICAgICAgICAgICAgIGcuY2FsbCh6b29tKTtcblxuICAgICAgICAgICAgICBiYWNrLmNhbGwoZHJhZyk7XG4gICAgICAgICAgICAgIGcuY2FsbChkcmFnKTtcblxuICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICBiYWNrXG4gICAgICAgICAgICAgICAgICAub24oXCJtb3VzZWRvd24uem9vbVwiLCBudWxsKVxuICAgICAgICAgICAgICAgICAgLm9uKFwibW91c2V3aGVlbC56b29tXCIsIG51bGwpXG4gICAgICAgICAgICAgICAgICAub24oXCJtb3VzZW1vdmUuem9vbVwiLCBudWxsKVxuICAgICAgICAgICAgICAgICAgLm9uKFwiRE9NTW91c2VTY3JvbGwuem9vbVwiLCBudWxsKVxuICAgICAgICAgICAgICAgICAgLm9uKFwiZGJsY2xpY2suem9vbVwiLCBudWxsKVxuICAgICAgICAgICAgICAgICAgLm9uKFwidG91Y2hzdGFydC56b29tXCIsIG51bGwpXG4gICAgICAgICAgICAgICAgICAub24oXCJ0b3VjaG1vdmUuem9vbVwiLCBudWxsKVxuICAgICAgICAgICAgICAgICAgLm9uKFwidG91Y2hlbmQuem9vbVwiLCBudWxsKVxuICAgICAgICAgICAgICAgICAgLm9uKFwid2hlZWwuem9vbVwiLCBudWxsKTtcbiAgICAgICAgICAgICAgZ1xuICAgICAgICAgICAgICAgICAgLm9uKFwibW91c2Vkb3duLnpvb21cIiwgbnVsbClcbiAgICAgICAgICAgICAgICAgIC5vbihcIm1vdXNld2hlZWwuem9vbVwiLCBudWxsKVxuICAgICAgICAgICAgICAgICAgLm9uKFwibW91c2Vtb3ZlLnpvb21cIiwgbnVsbClcbiAgICAgICAgICAgICAgICAgIC5vbihcIkRPTU1vdXNlU2Nyb2xsLnpvb21cIiwgbnVsbClcbiAgICAgICAgICAgICAgICAgIC5vbihcImRibGNsaWNrLnpvb21cIiwgbnVsbClcbiAgICAgICAgICAgICAgICAgIC5vbihcInRvdWNoc3RhcnQuem9vbVwiLCBudWxsKVxuICAgICAgICAgICAgICAgICAgLm9uKFwidG91Y2htb3ZlLnpvb21cIiwgbnVsbClcbiAgICAgICAgICAgICAgICAgIC5vbihcInRvdWNoZW5kLnpvb21cIiwgbnVsbClcbiAgICAgICAgICAgICAgICAgIC5vbihcIndoZWVsLnpvb21cIiwgbnVsbCk7XG5cbiAgICAgICAgICAgICAgYmFja1xuICAgICAgICAgICAgICAgICAgLm9uKFwibW91c2Vkb3duLmRyYWdcIiwgbnVsbClcbiAgICAgICAgICAgICAgICAgIC5vbihcIm1vdXNld2hlZWwuZHJhZ1wiLCBudWxsKVxuICAgICAgICAgICAgICAgICAgLm9uKFwibW91c2Vtb3ZlLmRyYWdcIiwgbnVsbClcbiAgICAgICAgICAgICAgICAgIC5vbihcIkRPTU1vdXNlU2Nyb2xsLmRyYWdcIiwgbnVsbClcbiAgICAgICAgICAgICAgICAgIC5vbihcImRibGNsaWNrLmRyYWdcIiwgbnVsbClcbiAgICAgICAgICAgICAgICAgIC5vbihcInRvdWNoc3RhcnQuZHJhZ1wiLCBudWxsKVxuICAgICAgICAgICAgICAgICAgLm9uKFwidG91Y2htb3ZlLmRyYWdcIiwgbnVsbClcbiAgICAgICAgICAgICAgICAgIC5vbihcInRvdWNoZW5kLmRyYWdcIiwgbnVsbClcbiAgICAgICAgICAgICAgICAgIC5vbihcIndoZWVsLmRyYWdcIiwgbnVsbCk7XG4gICAgICAgICAgICAgIGdcbiAgICAgICAgICAgICAgICAgIC5vbihcIm1vdXNlZG93bi5kcmFnXCIsIG51bGwpXG4gICAgICAgICAgICAgICAgICAub24oXCJtb3VzZXdoZWVsLmRyYWdcIiwgbnVsbClcbiAgICAgICAgICAgICAgICAgIC5vbihcIm1vdXNlbW92ZS5kcmFnXCIsIG51bGwpXG4gICAgICAgICAgICAgICAgICAub24oXCJET01Nb3VzZVNjcm9sbC5kcmFnXCIsIG51bGwpXG4gICAgICAgICAgICAgICAgICAub24oXCJkYmxjbGljay5kcmFnXCIsIG51bGwpXG4gICAgICAgICAgICAgICAgICAub24oXCJ0b3VjaHN0YXJ0LmRyYWdcIiwgbnVsbClcbiAgICAgICAgICAgICAgICAgIC5vbihcInRvdWNobW92ZS5kcmFnXCIsIG51bGwpXG4gICAgICAgICAgICAgICAgICAub24oXCJ0b3VjaGVuZC5kcmFnXCIsIG51bGwpXG4gICAgICAgICAgICAgICAgICAub24oXCJ3aGVlbC5kcmFnXCIsIG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG5cbiAgICAgICAgICB2YXIgcGFuTGVnZW5kID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgZGlzdGFuY2UgPSAwLFxuICAgICAgICAgICAgICAgIG92ZXJmbG93RGlzdGFuY2UgPSAwLFxuICAgICAgICAgICAgICAgIHRyYW5zbGF0ZSA9ICcnLFxuICAgICAgICAgICAgICAgIHggPSAwLFxuICAgICAgICAgICAgICAgIHkgPSAwO1xuXG4gICAgICAgICAgICAvLyBkb24ndCBmaXJlIG9uIGV2ZW50cyBvdGhlciB0aGFuIHpvb20gYW5kIGRyYWdcbiAgICAgICAgICAgIC8vIHdlIG5lZWQgY2xpY2sgZm9yIGhhbmRsaW5nIGxlZ2VuZCB0b2dnbGVcbiAgICAgICAgICAgIGlmIChkMy5ldmVudCkge1xuICAgICAgICAgICAgICBpZiAoZDMuZXZlbnQudHlwZSA9PT0gJ3pvb20nICYmIGQzLmV2ZW50LnNvdXJjZUV2ZW50KSB7XG4gICAgICAgICAgICAgICAgeCA9IGQzLmV2ZW50LnNvdXJjZUV2ZW50LmRlbHRhWCB8fCAwO1xuICAgICAgICAgICAgICAgIHkgPSBkMy5ldmVudC5zb3VyY2VFdmVudC5kZWx0YVkgfHwgMDtcbiAgICAgICAgICAgICAgICBkaXN0YW5jZSA9IChNYXRoLmFicyh4KSA+IE1hdGguYWJzKHkpID8geCA6IHkpICogLTE7XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAoZDMuZXZlbnQudHlwZSA9PT0gJ2RyYWcnKSB7XG4gICAgICAgICAgICAgICAgeCA9IGQzLmV2ZW50LmR4IHx8IDA7XG4gICAgICAgICAgICAgICAgeSA9IGQzLmV2ZW50LmR5IHx8IDA7XG4gICAgICAgICAgICAgICAgZGlzdGFuY2UgPSB5O1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKGQzLmV2ZW50LnR5cGUgIT09ICdjbGljaycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBvdmVyZmxvd0Rpc3RhbmNlID0gKE1hdGguYWJzKHkpID4gTWF0aC5hYnMoeCkgPyB5IDogMCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHJlc2V0IHZhbHVlIGRlZmluZWQgaW4gcGFuTXVsdGliYXIoKTtcbiAgICAgICAgICAgIHNjcm9sbE9mZnNldCA9IE1hdGgubWluKE1hdGgubWF4KHNjcm9sbE9mZnNldCArIGRpc3RhbmNlLCBkaWZmKSwgMCk7XG4gICAgICAgICAgICB0cmFuc2xhdGUgPSAndHJhbnNsYXRlKCcgKyAocnRsID8gZDMubWF4KGtleVdpZHRocykgKyByYWRpdXMgOiAwKSArICcsJyArIHNjcm9sbE9mZnNldCArICcpJztcblxuICAgICAgICAgICAgaWYgKHNjcm9sbE9mZnNldCArIGRpc3RhbmNlID4gMCB8fCBzY3JvbGxPZmZzZXQgKyBkaXN0YW5jZSA8IGRpZmYpIHtcbiAgICAgICAgICAgICAgb3ZlcmZsb3dIYW5kbGVyKG92ZXJmbG93RGlzdGFuY2UpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBnLmF0dHIoJ3RyYW5zZm9ybScsIHRyYW5zbGF0ZSk7XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIGFzc2lnblNjcm9sbEV2ZW50cyh1c2VTY3JvbGwpO1xuICAgICAgICB9XG5cbiAgICAgIH07XG5cbiAgICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAvLyBFdmVudCBIYW5kbGluZy9EaXNwYXRjaGluZyAoaW4gY2hhcnQncyBzY29wZSlcbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgICAgIGZ1bmN0aW9uIGRpc3BsYXlNZW51KCkge1xuICAgICAgICBiYWNrXG4gICAgICAgICAgLnN0eWxlKCdvcGFjaXR5JywgbGVnZW5kT3BlbiAqIDAuOSlcbiAgICAgICAgICAuc3R5bGUoJ2Rpc3BsYXknLCBsZWdlbmRPcGVuID8gJ2lubGluZScgOiAnbm9uZScpO1xuICAgICAgICBnXG4gICAgICAgICAgLnN0eWxlKCdvcGFjaXR5JywgbGVnZW5kT3BlbilcbiAgICAgICAgICAuc3R5bGUoJ2Rpc3BsYXknLCBsZWdlbmRPcGVuID8gJ2lubGluZScgOiAnbm9uZScpO1xuICAgICAgICBsaW5rXG4gICAgICAgICAgLnRleHQobGVnZW5kT3BlbiA9PT0gMSA/IGxlZ2VuZC5zdHJpbmdzKCkuY2xvc2UgOiBsZWdlbmQuc3RyaW5ncygpLm9wZW4pO1xuICAgICAgfVxuXG4gICAgICBkaXNwYXRjaC5vbigndG9nZ2xlTWVudScsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgZDMuZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGxlZ2VuZE9wZW4gPSAxIC0gbGVnZW5kT3BlbjtcbiAgICAgICAgZGlzcGxheU1lbnUoKTtcbiAgICAgIH0pO1xuXG4gICAgICBkaXNwYXRjaC5vbignY2xvc2VNZW51JywgZnVuY3Rpb24oZCkge1xuICAgICAgICBpZiAobGVnZW5kT3BlbiA9PT0gMSkge1xuICAgICAgICAgIGxlZ2VuZE9wZW4gPSAwO1xuICAgICAgICAgIGRpc3BsYXlNZW51KCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgfSk7XG5cbiAgICByZXR1cm4gbGVnZW5kO1xuICB9XG5cblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBFeHBvc2UgUHVibGljIFZhcmlhYmxlc1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGxlZ2VuZC5kaXNwYXRjaCA9IGRpc3BhdGNoO1xuXG4gIGxlZ2VuZC5tYXJnaW4gPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7IHJldHVybiBtYXJnaW47IH1cbiAgICBtYXJnaW4udG9wICAgID0gdHlwZW9mIF8udG9wICAgICE9PSAndW5kZWZpbmVkJyA/IF8udG9wICAgIDogbWFyZ2luLnRvcDtcbiAgICBtYXJnaW4ucmlnaHQgID0gdHlwZW9mIF8ucmlnaHQgICE9PSAndW5kZWZpbmVkJyA/IF8ucmlnaHQgIDogbWFyZ2luLnJpZ2h0O1xuICAgIG1hcmdpbi5ib3R0b20gPSB0eXBlb2YgXy5ib3R0b20gIT09ICd1bmRlZmluZWQnID8gXy5ib3R0b20gOiBtYXJnaW4uYm90dG9tO1xuICAgIG1hcmdpbi5sZWZ0ICAgPSB0eXBlb2YgXy5sZWZ0ICAgIT09ICd1bmRlZmluZWQnID8gXy5sZWZ0ICAgOiBtYXJnaW4ubGVmdDtcbiAgICByZXR1cm4gbGVnZW5kO1xuICB9O1xuXG4gIGxlZ2VuZC53aWR0aCA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiB3aWR0aDtcbiAgICB9XG4gICAgd2lkdGggPSBNYXRoLnJvdW5kKF8pO1xuICAgIHJldHVybiBsZWdlbmQ7XG4gIH07XG5cbiAgbGVnZW5kLmhlaWdodCA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBoZWlnaHQ7XG4gICAgfVxuICAgIGhlaWdodCA9IE1hdGgucm91bmQoXyk7XG4gICAgcmV0dXJuIGxlZ2VuZDtcbiAgfTtcblxuICBsZWdlbmQuaWQgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gaWQ7XG4gICAgfVxuICAgIGlkID0gXztcbiAgICByZXR1cm4gbGVnZW5kO1xuICB9O1xuXG4gIGxlZ2VuZC5rZXkgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gZ2V0S2V5O1xuICAgIH1cbiAgICBnZXRLZXkgPSBfO1xuICAgIHJldHVybiBsZWdlbmQ7XG4gIH07XG5cbiAgbGVnZW5kLmNvbG9yID0gZnVuY3Rpb24oXykge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIGNvbG9yO1xuICAgIH1cbiAgICBjb2xvciA9IHV0aWxzLmdldENvbG9yKF8pO1xuICAgIHJldHVybiBsZWdlbmQ7XG4gIH07XG5cbiAgbGVnZW5kLmNsYXNzZXMgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gY2xhc3NlcztcbiAgICB9XG4gICAgY2xhc3NlcyA9IF87XG4gICAgcmV0dXJuIGxlZ2VuZDtcbiAgfTtcblxuICBsZWdlbmQuYWxpZ24gPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gYWxpZ247XG4gICAgfVxuICAgIGFsaWduID0gXztcbiAgICByZXR1cm4gbGVnZW5kO1xuICB9O1xuXG4gIGxlZ2VuZC5wb3NpdGlvbiA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBwb3NpdGlvbjtcbiAgICB9XG4gICAgcG9zaXRpb24gPSBfO1xuICAgIHJldHVybiBsZWdlbmQ7XG4gIH07XG5cbiAgbGVnZW5kLnNob3dBbGwgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7IHJldHVybiBzaG93QWxsOyB9XG4gICAgc2hvd0FsbCA9IF87XG4gICAgcmV0dXJuIGxlZ2VuZDtcbiAgfTtcblxuICBsZWdlbmQuc2hvd01lbnUgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7IHJldHVybiBzaG93TWVudTsgfVxuICAgIHNob3dNZW51ID0gXztcbiAgICByZXR1cm4gbGVnZW5kO1xuICB9O1xuXG4gIGxlZ2VuZC5jb2xsYXBzZWQgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGNvbGxhcHNlZDtcbiAgfTtcblxuICBsZWdlbmQucm93c0NvdW50ID0gZnVuY3Rpb24oXykge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHJvd3NDb3VudDtcbiAgICB9XG4gICAgcm93c0NvdW50ID0gXztcbiAgICByZXR1cm4gbGVnZW5kO1xuICB9O1xuXG4gIGxlZ2VuZC5zcGFjaW5nID0gZnVuY3Rpb24oXykge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHNwYWNpbmc7XG4gICAgfVxuICAgIHNwYWNpbmcgPSBfO1xuICAgIHJldHVybiBsZWdlbmQ7XG4gIH07XG5cbiAgbGVnZW5kLmd1dHRlciA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBndXR0ZXI7XG4gICAgfVxuICAgIGd1dHRlciA9IF87XG4gICAgcmV0dXJuIGxlZ2VuZDtcbiAgfTtcblxuICBsZWdlbmQucmFkaXVzID0gZnVuY3Rpb24oXykge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHJhZGl1cztcbiAgICB9XG4gICAgcmFkaXVzID0gXztcbiAgICByZXR1cm4gbGVnZW5kO1xuICB9O1xuXG4gIGxlZ2VuZC5zdHJpbmdzID0gZnVuY3Rpb24oXykge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHN0cmluZ3M7XG4gICAgfVxuICAgIHN0cmluZ3MgPSBfO1xuICAgIHJldHVybiBsZWdlbmQ7XG4gIH07XG5cbiAgbGVnZW5kLmVxdWFsQ29sdW1ucyA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBlcXVhbENvbHVtbnM7XG4gICAgfVxuICAgIGVxdWFsQ29sdW1ucyA9IF87XG4gICAgcmV0dXJuIGxlZ2VuZDtcbiAgfTtcblxuICBsZWdlbmQuZW5hYmxlZCA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBlbmFibGVkO1xuICAgIH1cbiAgICBlbmFibGVkID0gXztcbiAgICByZXR1cm4gbGVnZW5kO1xuICB9O1xuXG4gIGxlZ2VuZC5kaXJlY3Rpb24gPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gZGlyZWN0aW9uO1xuICAgIH1cbiAgICBkaXJlY3Rpb24gPSBfO1xuICAgIHJldHVybiBsZWdlbmQ7XG4gIH07XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXG4gIHJldHVybiBsZWdlbmQ7XG59XG4iLCIvLyBpbXBvcnQgZDMgZnJvbSAnZDMnO1xuaW1wb3J0IHV0aWxzIGZyb20gJy4uL3V0aWxzLmpzJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gUHVibGljIFZhcmlhYmxlcyB3aXRoIERlZmF1bHQgU2V0dGluZ3NcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICB2YXIgbWFyZ2luID0ge3RvcDogMCwgcmlnaHQ6IDAsIGJvdHRvbTogMCwgbGVmdDogMH0sXG4gICAgICB3aWR0aCA9IDk2MCxcbiAgICAgIGhlaWdodCA9IDUwMCxcbiAgICAgIGlkID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMDApLCAvL0NyZWF0ZSBzZW1pLXVuaXF1ZSBJRCBpbiBjYXNlIHVzZXIgZG9lc24ndCBzZWxlY3Qgb25lXG4gICAgICBnZXRYID0gZnVuY3Rpb24oZCkgeyByZXR1cm4gZC54OyB9LFxuICAgICAgZ2V0WSA9IGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQueTsgfSxcbiAgICAgIGdldEggPSBmdW5jdGlvbihkKSB7IHJldHVybiBkLmhlaWdodDsgfSxcbiAgICAgIGdldEtleSA9IGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQua2V5OyB9LFxuICAgICAgZ2V0VmFsdWUgPSBmdW5jdGlvbihkLCBpKSB7IHJldHVybiBkLnZhbHVlOyB9LFxuICAgICAgZm10S2V5ID0gZnVuY3Rpb24oZCkgeyByZXR1cm4gZ2V0S2V5KGQuc2VyaWVzIHx8IGQpOyB9LFxuICAgICAgZm10VmFsdWUgPSBmdW5jdGlvbihkKSB7IHJldHVybiBnZXRWYWx1ZShkLnNlcmllcyB8fCBkKTsgfSxcbiAgICAgIGZtdENvdW50ID0gZnVuY3Rpb24oZCkgeyByZXR1cm4gKCcgKCcgKyAoZC5zZXJpZXMuY291bnQgfHwgZC5jb3VudCkgKyAnKScpLnJlcGxhY2UoJyAoKScsICcnKTsgfSxcbiAgICAgIGxvY2FsaXR5ID0gdXRpbHMuYnVpbGRMb2NhbGl0eSgpLFxuICAgICAgZGlyZWN0aW9uID0gJ2x0cicsXG4gICAgICBkZWxheSA9IDAsXG4gICAgICBkdXJhdGlvbiA9IDAsXG4gICAgICBjb2xvciA9IGZ1bmN0aW9uKGQsIGkpIHsgcmV0dXJuIHV0aWxzLmRlZmF1bHRDb2xvcigpKGQuc2VyaWVzLCBkLnNlcmllc0luZGV4KTsgfSxcbiAgICAgIGZpbGwgPSBjb2xvcixcbiAgICAgIHRleHR1cmVGaWxsID0gZmFsc2UsXG4gICAgICBjbGFzc2VzID0gZnVuY3Rpb24oZCwgaSkgeyByZXR1cm4gJ3NjLXNlcmllcyBzYy1zZXJpZXMtJyArIGQuc2VyaWVzSW5kZXg7IH07XG5cbiAgdmFyIHIgPSAwLjMsIC8vIHJhdGlvIG9mIHdpZHRoIHRvIGhlaWdodCAob3Igc2xvcGUpXG4gICAgICB5ID0gZDMuc2NhbGVMaW5lYXIoKSxcbiAgICAgIHlEb21haW4sXG4gICAgICBmb3JjZVkgPSBbMF0sIC8vIDAgaXMgZm9yY2VkIGJ5IGRlZmF1bHQuLiB0aGlzIG1ha2VzIHNlbnNlIGZvciB0aGUgbWFqb3JpdHkgb2YgYmFyIGdyYXBocy4uLiB1c2VyIGNhbiBhbHdheXMgZG8gY2hhcnQuZm9yY2VZKFtdKSB0byByZW1vdmVcbiAgICAgIHdyYXBMYWJlbHMgPSB0cnVlLFxuICAgICAgbWluTGFiZWxXaWR0aCA9IDc1LFxuICAgICAgZGlzcGF0Y2ggPSBkMy5kaXNwYXRjaCgnY2hhcnRDbGljaycsICdlbGVtZW50Q2xpY2snLCAnZWxlbWVudERibENsaWNrJywgJ2VsZW1lbnRNb3VzZW92ZXInLCAnZWxlbWVudE1vdXNlb3V0JywgJ2VsZW1lbnRNb3VzZW1vdmUnKTtcblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBQcml2YXRlIFZhcmlhYmxlc1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFRoZXNlIHZhbHVlcyBhcmUgcHJlc2VydmVkIGJldHdlZW4gcmVuZGVyaW5nc1xuICB2YXIgY2FsY3VsYXRlZFdpZHRoID0gMCxcbiAgICAgIGNhbGN1bGF0ZWRIZWlnaHQgPSAwLFxuICAgICAgY2FsY3VsYXRlZENlbnRlciA9IDA7XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gVXBkYXRlIGNoYXJ0XG5cbiAgZnVuY3Rpb24gY2hhcnQoc2VsZWN0aW9uKSB7XG4gICAgc2VsZWN0aW9uLmVhY2goZnVuY3Rpb24oZGF0YSkge1xuXG4gICAgICB2YXIgYXZhaWxhYmxlV2lkdGggPSB3aWR0aCAtIG1hcmdpbi5sZWZ0IC0gbWFyZ2luLnJpZ2h0LFxuICAgICAgICAgIGF2YWlsYWJsZUhlaWdodCA9IGhlaWdodCAtIG1hcmdpbi50b3AgLSBtYXJnaW4uYm90dG9tLFxuICAgICAgICAgIGNvbnRhaW5lciA9IGQzLnNlbGVjdCh0aGlzKTtcblxuICAgICAgdmFyIGxhYmVsR2FwID0gNSxcbiAgICAgICAgICBsYWJlbFNwYWNlID0gNSxcbiAgICAgICAgICBsYWJlbE9mZnNldCA9IDAsXG4gICAgICAgICAgZnVubmVsVG90YWwgPSAwLFxuICAgICAgICAgIGZ1bm5lbE9mZnNldCA9IDA7XG5cbiAgICAgIC8vc3VtIHRoZSB2YWx1ZXMgZm9yIGVhY2ggZGF0YSBlbGVtZW50XG4gICAgICBmdW5uZWxUb3RhbCA9IGQzLnN1bShkYXRhLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnZhbHVlOyB9KTtcblxuICAgICAgLy9zZXQgdXAgdGhlIGdyYWRpZW50IGNvbnN0cnVjdG9yIGZ1bmN0aW9uXG4gICAgICBjaGFydC5ncmFkaWVudCA9IGZ1bmN0aW9uKGQsIGksIHApIHtcbiAgICAgICAgcmV0dXJuIHV0aWxzLmNvbG9yTGluZWFyR3JhZGllbnQoZCwgaWQgKyAnLScgKyBpLCBwLCBjb2xvcihkLCBpKSwgd3JhcC5zZWxlY3QoJ2RlZnMnKSk7XG4gICAgICB9O1xuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgLy8gU2V0dXAgc2NhbGVzXG5cbiAgICAgIGZ1bmN0aW9uIGNhbGNEaW1lbnNpb25zKCkge1xuICAgICAgICBjYWxjdWxhdGVkV2lkdGggPSBjYWxjV2lkdGgoZnVubmVsT2Zmc2V0KTtcbiAgICAgICAgY2FsY3VsYXRlZEhlaWdodCA9IGNhbGNIZWlnaHQoKTtcbiAgICAgICAgY2FsY3VsYXRlZENlbnRlciA9IGNhbGNDZW50ZXIoZnVubmVsT2Zmc2V0KTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gY2FsY1NjYWxlcygpIHtcbiAgICAgICAgdmFyIGZ1bm5lbEFyZWEgPSBhcmVhVHJhcGV6b2lkKGNhbGN1bGF0ZWRIZWlnaHQsIGNhbGN1bGF0ZWRXaWR0aCksXG4gICAgICAgICAgICBmdW5uZWxTaGlmdCA9IDAsXG4gICAgICAgICAgICBmdW5uZWxNaW5IZWlnaHQgPSA0LFxuICAgICAgICAgICAgX2Jhc2UgPSBjYWxjdWxhdGVkV2lkdGggLSAyICogciAqIGNhbGN1bGF0ZWRIZWlnaHQsXG4gICAgICAgICAgICBfYm90dG9tID0gY2FsY3VsYXRlZEhlaWdodDtcblxuICAgICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgICAvLyBBZGp1c3QgcG9pbnRzIHRvIGNvbXBlbnNhdGUgZm9yIHBhcmFsbGF4IG9mIHNsaWNlXG4gICAgICAgIC8vIGJ5IGluY3JlYXNpbmcgaGVpZ2h0IHJlbGF0aXZlIHRvIGFyZWEgb2YgZnVubmVsXG5cbiAgICAgICAgLy8gcnVucyBmcm9tIGJvdHRvbSB0byB0b3BcbiAgICAgICAgZGF0YS5mb3JFYWNoKGZ1bmN0aW9uKHNlcmllcywgaSkge1xuICAgICAgICAgIHNlcmllcy52YWx1ZXMuZm9yRWFjaChmdW5jdGlvbihwb2ludCkge1xuXG4gICAgICAgICAgICBwb2ludC5faGVpZ2h0ID0gZnVubmVsVG90YWwgPiAwID9cbiAgICAgICAgICAgICAgaGVpZ2h0VHJhcGV6b2lkKGZ1bm5lbEFyZWEgKiBwb2ludC52YWx1ZSAvIGZ1bm5lbFRvdGFsLCBfYmFzZSkgOlxuICAgICAgICAgICAgICAwO1xuXG4gICAgICAgICAgICAvL1RPRE86IG5vdCB3b3JraW5nXG4gICAgICAgICAgICBpZiAocG9pbnQuX2hlaWdodCA8IGZ1bm5lbE1pbkhlaWdodCkge1xuICAgICAgICAgICAgICBmdW5uZWxTaGlmdCArPSBwb2ludC5faGVpZ2h0IC0gZnVubmVsTWluSGVpZ2h0O1xuICAgICAgICAgICAgICBwb2ludC5faGVpZ2h0ID0gZnVubmVsTWluSGVpZ2h0O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChmdW5uZWxTaGlmdCA8IDAgJiYgcG9pbnQuX2hlaWdodCArIGZ1bm5lbFNoaWZ0ID4gZnVubmVsTWluSGVpZ2h0KSB7XG4gICAgICAgICAgICAgIHBvaW50Ll9oZWlnaHQgKz0gZnVubmVsU2hpZnQ7XG4gICAgICAgICAgICAgIGZ1bm5lbFNoaWZ0ID0gMDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcG9pbnQuX2Jhc2UgPSBfYmFzZTtcbiAgICAgICAgICAgIHBvaW50Ll9ib3R0b20gPSBfYm90dG9tO1xuICAgICAgICAgICAgcG9pbnQuX3RvcCA9IHBvaW50Ll9ib3R0b20gLSBwb2ludC5faGVpZ2h0O1xuXG4gICAgICAgICAgICBfYmFzZSArPSAyICogciAqIHBvaW50Ll9oZWlnaHQ7XG4gICAgICAgICAgICBfYm90dG9tIC09IHBvaW50Ll9oZWlnaHQ7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJlbWFwIGFuZCBmbGF0dGVuIHRoZSBkYXRhIGZvciB1c2UgaW4gY2FsY3VsYXRpbmcgdGhlIHNjYWxlcycgZG9tYWluc1xuICAgICAgICAvL1RPRE86IHRoaXMgaXMgbm8gbG9uZ2VyIG5lZWRlZFxuICAgICAgICB2YXIgc2VyaWVzRGF0YSA9IHlEb21haW4gfHwgLy8gaWYgd2Uga25vdyB5RG9tYWluLCBubyBuZWVkIHRvIGNhbGN1bGF0ZVxuICAgICAgICAgICAgICBkMy5leHRlbnQoXG4gICAgICAgICAgICAgICAgZDMubWVyZ2UoXG4gICAgICAgICAgICAgICAgICBkYXRhLm1hcChmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkLnZhbHVlcy5tYXAoZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkLl90b3A7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICApLmNvbmNhdChmb3JjZVkpXG4gICAgICAgICAgICAgICk7XG5cbiAgICAgICAgeSAuZG9tYWluKHNlcmllc0RhdGEpXG4gICAgICAgICAgLnJhbmdlKFtjYWxjdWxhdGVkSGVpZ2h0LCAwXSk7XG4gICAgICB9XG5cbiAgICAgIGNhbGNEaW1lbnNpb25zKCk7XG4gICAgICBjYWxjU2NhbGVzKCk7XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAvLyBTZXR1cCBjb250YWluZXJzIGFuZCBza2VsZXRvbiBvZiBjaGFydFxuICAgICAgdmFyIHdyYXBfYmluZCA9IGNvbnRhaW5lci5zZWxlY3RBbGwoJ2cuc2Mtd3JhcCcpLmRhdGEoW2RhdGFdKTtcbiAgICAgIHZhciB3cmFwX2VudHIgPSB3cmFwX2JpbmQuZW50ZXIoKS5hcHBlbmQoJ2cnKS5hdHRyKCdjbGFzcycsICdzYy13cmFwIHNjLWZ1bm5lbCcpO1xuICAgICAgdmFyIHdyYXAgPSBjb250YWluZXIuc2VsZWN0KCcuc2Mtd3JhcCcpLm1lcmdlKHdyYXBfZW50cik7XG5cbiAgICAgIHZhciBkZWZzX2VudHIgPSB3cmFwX2VudHIuYXBwZW5kKCdkZWZzJyk7XG5cbiAgICAgIHdyYXAuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgbWFyZ2luLmxlZnQgKyAnLCcgKyBtYXJnaW4udG9wICsgJyknKTtcblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIC8vIERlZmluaXRpb25zXG5cbiAgICAgIGlmICh0ZXh0dXJlRmlsbCkge1xuICAgICAgICB2YXIgbWFzayA9IHV0aWxzLmNyZWF0ZVRleHR1cmUoZGVmc19lbnRyLCBpZCk7XG4gICAgICB9XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAvLyBBcHBlbmQgbWFqb3IgZGF0YSBzZXJpZXMgZ3JvdXBpbmcgY29udGFpbmVyc1xuXG4gICAgICB2YXIgc2VyaWVzX2JpbmQgPSB3cmFwLnNlbGVjdEFsbCgnLnNjLXNlcmllcycpLmRhdGEoZGF0YSwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5zZXJpZXNJbmRleDsgfSk7XG4gICAgICB2YXIgc2VyaWVzX2VudHIgPSBzZXJpZXNfYmluZC5lbnRlcigpLmFwcGVuZCgnZycpLmF0dHIoJ2NsYXNzJywgJ3NjLXNlcmllcycpO1xuICAgICAgLy8gc2VyaWVzX2JpbmQuZXhpdCgpLnRyYW5zaXRpb24oKS5kdXJhdGlvbihkdXJhdGlvbilcbiAgICAgIC8vICAgLnNlbGVjdEFsbCgnZy5zYy1zbGljZScpXG4gICAgICAvLyAgIC5kZWxheShmdW5jdGlvbihkLCBpKSB7IHJldHVybiBpICogZGVsYXkgLyBkYXRhWzBdLnZhbHVlcy5sZW5ndGg7IH0pXG4gICAgICAvLyAgICAgLmF0dHIoJ3BvaW50cycsIGZ1bmN0aW9uKGQpIHtcbiAgICAgIC8vICAgICAgIHJldHVybiBwb2ludHNUcmFwZXpvaWQoZCwgMCwgY2FsY3VsYXRlZFdpZHRoKTtcbiAgICAgIC8vICAgICB9KVxuICAgICAgLy8gICAgIC5zdHlsZSgnc3Ryb2tlLW9wYWNpdHknLCAxZS02KVxuICAgICAgLy8gICAgIC5zdHlsZSgnZmlsbC1vcGFjaXR5JywgMWUtNilcbiAgICAgIC8vICAgICAucmVtb3ZlKCk7XG4gICAgICAvLyBzZXJpZXNfYmluZC5leGl0KCkudHJhbnNpdGlvbigpLmR1cmF0aW9uKGR1cmF0aW9uKVxuICAgICAgLy8gICAuc2VsZWN0QWxsKCdnLnNjLWxhYmVsLXZhbHVlJylcbiAgICAgIC8vICAgLmRlbGF5KGZ1bmN0aW9uKGQsIGkpIHsgcmV0dXJuIGkgKiBkZWxheSAvIGRhdGFbMF0udmFsdWVzLmxlbmd0aDsgfSlcbiAgICAgIC8vICAgICAuYXR0cigneScsIDApXG4gICAgICAvLyAgICAgLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIGNhbGN1bGF0ZWRDZW50ZXIgKyAnLDApJylcbiAgICAgIC8vICAgICAuc3R5bGUoJ3N0cm9rZS1vcGFjaXR5JywgMWUtNilcbiAgICAgIC8vICAgICAuc3R5bGUoJ2ZpbGwtb3BhY2l0eScsIDFlLTYpXG4gICAgICAvLyAgICAgLnJlbW92ZSgpO1xuICAgICAgc2VyaWVzX2JpbmQuZXhpdCgpLnJlbW92ZSgpO1xuICAgICAgdmFyIHNlcmllcyA9IHdyYXAuc2VsZWN0QWxsKCcuc2Mtc2VyaWVzJykubWVyZ2Uoc2VyaWVzX2VudHIpO1xuXG4gICAgICBzZXJpZXNfZW50clxuICAgICAgICAuc3R5bGUoJ3N0cm9rZScsICcjRkZGJylcbiAgICAgICAgLnN0eWxlKCdzdHJva2Utd2lkdGgnLCAyKVxuICAgICAgICAuc3R5bGUoJ3N0cm9rZS1vcGFjaXR5JywgMSlcbiAgICAgICAgLm9uKCdtb3VzZW92ZXInLCBmdW5jdGlvbihkLCBpLCBqKSB7IC8vVE9ETzogZmlndXJlIG91dCB3aHkgaiB3b3JrcyBhYm92ZSwgYnV0IG5vdCBoZXJlXG4gICAgICAgICAgZDMuc2VsZWN0KHRoaXMpLmNsYXNzZWQoJ2hvdmVyJywgdHJ1ZSk7XG4gICAgICAgIH0pXG4gICAgICAgIC5vbignbW91c2VvdXQnLCBmdW5jdGlvbihkLCBpLCBqKSB7XG4gICAgICAgICAgZDMuc2VsZWN0KHRoaXMpLmNsYXNzZWQoJ2hvdmVyJywgZmFsc2UpO1xuICAgICAgICB9KTtcblxuICAgICAgc2VyaWVzXG4gICAgICAgIC5hdHRyKCdjbGFzcycsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGNsYXNzZXMoZCwgZC5zZXJpZXNJbmRleCk7IH0pXG4gICAgICAgIC5hdHRyKCdmaWxsJywgZnVuY3Rpb24oZCkgeyByZXR1cm4gZmlsbChkLCBkLnNlcmllc0luZGV4KTsgfSlcbiAgICAgICAgLmNsYXNzZWQoJ3NjLWFjdGl2ZScsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuYWN0aXZlID09PSAnYWN0aXZlJzsgfSlcbiAgICAgICAgLmNsYXNzZWQoJ3NjLWluYWN0aXZlJywgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5hY3RpdmUgPT09ICdpbmFjdGl2ZSc7IH0pO1xuXG4gICAgICBzZXJpZXMudHJhbnNpdGlvbigpLmR1cmF0aW9uKGR1cmF0aW9uKVxuICAgICAgICAgIC5zdHlsZSgnc3Ryb2tlLW9wYWNpdHknLCAxKVxuICAgICAgICAgIC5zdHlsZSgnZmlsbC1vcGFjaXR5JywgMSk7XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAvLyBBcHBlbmQgcG9seWdvbnMgZm9yIGZ1bm5lbFxuICAgICAgLy8gU2F2ZSBmb3IgbGF0ZXIuLi5cbiAgICAgIC8vIGZ1bmN0aW9uKHMsIGkpIHtcbiAgICAgIC8vICAgcmV0dXJuIHMudmFsdWVzLm1hcChmdW5jdGlvbih2LCBqKSB7XG4gICAgICAvLyAgICAgdi5kaXNhYmxlZCA9IHMuZGlzYWJsZWQ7XG4gICAgICAvLyAgICAgdi5rZXkgPSBzLmtleTtcbiAgICAgIC8vICAgICB2LnNlcmllc0luZGV4ID0gcy5zZXJpZXNJbmRleDtcbiAgICAgIC8vICAgICB2LmluZGV4ID0gajtcbiAgICAgIC8vICAgICByZXR1cm4gdjtcbiAgICAgIC8vICAgfSk7XG4gICAgICAvLyB9LFxuXG4gICAgICB2YXIgc2xpY2VfYmluZCA9IHNlcmllcy5zZWxlY3RBbGwoJ2cuc2Mtc2xpY2UnKVxuICAgICAgICAgICAgLmRhdGEoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC52YWx1ZXM7IH0sIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuc2VyaWVzSW5kZXg7IH0pO1xuICAgICAgc2xpY2VfYmluZC5leGl0KCkucmVtb3ZlKCk7XG4gICAgICB2YXIgc2xpY2VfZW50ciA9IHNsaWNlX2JpbmQuZW50ZXIoKS5hcHBlbmQoJ2cnKS5hdHRyKCdjbGFzcycsICdzYy1zbGljZScpO1xuICAgICAgdmFyIHNsaWNlcyA9IHNlcmllcy5zZWxlY3RBbGwoJ2cuc2Mtc2xpY2UnKS5tZXJnZShzbGljZV9lbnRyKTtcblxuICAgICAgc2xpY2VfZW50ci5hcHBlbmQoJ3BvbHlnb24nKVxuICAgICAgICAuYXR0cignY2xhc3MnLCAnc2MtYmFzZScpO1xuXG4gICAgICBzbGljZXMuc2VsZWN0KCdwb2x5Z29uLnNjLWJhc2UnKVxuICAgICAgICAuYXR0cigncG9pbnRzJywgZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHJldHVybiBwb2ludHNUcmFwZXpvaWQoZCwgMCwgY2FsY3VsYXRlZFdpZHRoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgIGlmICh0ZXh0dXJlRmlsbCkge1xuICAgICAgICAvLyBGb3Igb24gY2xpY2sgYWN0aXZlIGJhcnNcbiAgICAgICAgc2xpY2VfZW50ci5hcHBlbmQoJ3BvbHlnb24nKVxuICAgICAgICAgIC5hdHRyKCdjbGFzcycsICdzYy10ZXh0dXJlJylcbiAgICAgICAgICAuc3R5bGUoJ21hc2snLCAndXJsKCcgKyBtYXNrICsgJyknKTtcblxuICAgICAgICBzbGljZXMuc2VsZWN0KCdwb2x5Z29uLnNjLXRleHR1cmUnKVxuICAgICAgICAgIC5hdHRyKCdwb2ludHMnLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICByZXR1cm4gcG9pbnRzVHJhcGV6b2lkKGQsIDAsIGNhbGN1bGF0ZWRXaWR0aCk7XG4gICAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHNsaWNlX2VudHJcbiAgICAgICAgLm9uKCdtb3VzZW92ZXInLCBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgZDMuc2VsZWN0KHRoaXMpLmNsYXNzZWQoJ2hvdmVyJywgdHJ1ZSk7XG4gICAgICAgICAgdmFyIGVvID0gYnVpbGRFdmVudE9iamVjdChkMy5ldmVudCwgZCwgaSk7XG4gICAgICAgICAgZGlzcGF0Y2guY2FsbCgnZWxlbWVudE1vdXNlb3ZlcicsIHRoaXMsIGVvKTtcbiAgICAgICAgfSlcbiAgICAgICAgLm9uKCdtb3VzZW1vdmUnLCBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgdmFyIGUgPSBkMy5ldmVudDtcbiAgICAgICAgICBkaXNwYXRjaC5jYWxsKCdlbGVtZW50TW91c2Vtb3ZlJywgdGhpcywgZSk7XG4gICAgICAgIH0pXG4gICAgICAgIC5vbignbW91c2VvdXQnLCBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgZDMuc2VsZWN0KHRoaXMpLmNsYXNzZWQoJ2hvdmVyJywgZmFsc2UpO1xuICAgICAgICAgIGRpc3BhdGNoLmNhbGwoJ2VsZW1lbnRNb3VzZW91dCcsIHRoaXMpO1xuICAgICAgICB9KVxuICAgICAgICAub24oJ2NsaWNrJywgZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICAgIGQzLmV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgIHZhciBlbyA9IGJ1aWxkRXZlbnRPYmplY3QoZDMuZXZlbnQsIGQsIGkpO1xuICAgICAgICAgIGRpc3BhdGNoLmNhbGwoJ2VsZW1lbnRDbGljaycsIHRoaXMsIGVvKTtcbiAgICAgICAgfSlcbiAgICAgICAgLm9uKCdkYmxjbGljaycsIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgICBkMy5ldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICB2YXIgZW8gPSBidWlsZEV2ZW50T2JqZWN0KGQzLmV2ZW50LCBkLCBpKTtcbiAgICAgICAgICBkaXNwYXRjaC5jYWxsKCdlbGVtZW50RGJsQ2xpY2snLCB0aGlzLCBlbyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgLy8gQXBwZW5kIGNvbnRhaW5lcnMgZm9yIGxhYmVsc1xuXG4gICAgICB2YXIgbGFiZWxzX2JpbmQgPSBzZXJpZXMuc2VsZWN0QWxsKCcuc2MtbGFiZWwtdmFsdWUnKVxuICAgICAgICAgICAgLmRhdGEoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC52YWx1ZXM7IH0sIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuc2VyaWVzSW5kZXg7IH0pO1xuICAgICAgbGFiZWxzX2JpbmQuZXhpdCgpLnJlbW92ZSgpO1xuICAgICAgdmFyIGxhYmVsc19lbnRyID0gbGFiZWxzX2JpbmQuZW50ZXIoKS5hcHBlbmQoJ2cnKS5hdHRyKCdjbGFzcycsICdzYy1sYWJlbC12YWx1ZScpO1xuICAgICAgdmFyIGxhYmVscyA9IHNlcmllcy5zZWxlY3RBbGwoJ2cuc2MtbGFiZWwtdmFsdWUnKS5tZXJnZShsYWJlbHNfZW50cik7XG5cbiAgICAgIGxhYmVsc1xuICAgICAgICAuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgY2FsY3VsYXRlZENlbnRlciArICcsMCknKTtcblxuICAgICAgdmFyIHNpZGVMYWJlbHMgPSBsYWJlbHMuZmlsdGVyKCcuc2MtbGFiZWwtc2lkZScpO1xuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgLy8gVXBkYXRlIGZ1bm5lbCBsYWJlbHNcblxuICAgICAgZnVuY3Rpb24gcmVuZGVyRnVubmVsTGFiZWxzKCkge1xuICAgICAgICAvLyBSZW1vdmUgcmVzcG9uc2l2ZSBsYWJlbCBlbGVtZW50c1xuICAgICAgICBsYWJlbHMuc2VsZWN0QWxsKCdwb2x5bGluZScpLnJlbW92ZSgpO1xuICAgICAgICBsYWJlbHMuc2VsZWN0QWxsKCdyZWN0JykucmVtb3ZlKCk7XG4gICAgICAgIGxhYmVscy5zZWxlY3RBbGwoJ3RleHQnKS5yZW1vdmUoKTtcblxuICAgICAgICBsYWJlbHMuYXBwZW5kKCdyZWN0JylcbiAgICAgICAgICAuYXR0cignY2xhc3MnLCAnc2MtbGFiZWwtYm94JylcbiAgICAgICAgICAuYXR0cigneCcsIDApXG4gICAgICAgICAgLmF0dHIoJ3knLCAwKVxuICAgICAgICAgIC5hdHRyKCd3aWR0aCcsIDApXG4gICAgICAgICAgLmF0dHIoJ2hlaWdodCcsIDApXG4gICAgICAgICAgLmF0dHIoJ3J4JywgMilcbiAgICAgICAgICAuYXR0cigncnknLCAyKVxuICAgICAgICAgIC5zdHlsZSgncG9pbnRlci1ldmVudHMnLCAnbm9uZScpXG4gICAgICAgICAgLnN0eWxlKCdzdHJva2Utd2lkdGgnLCAwKVxuICAgICAgICAgIC5zdHlsZSgnZmlsbC1vcGFjaXR5JywgMCk7XG5cbiAgICAgICAgLy8gQXBwZW5kIGxhYmVsIHRleHQgYW5kIHdyYXAgaWYgbmVlZGVkXG4gICAgICAgIGxhYmVscy5hcHBlbmQoJ3RleHQnKVxuICAgICAgICAgIC50ZXh0KGZtdEtleSlcbiAgICAgICAgICAgIC5jYWxsKGZtdExhYmVsLCAnc2MtbGFiZWwnLCAwLjg1LCAnbWlkZGxlJywgZm10RmlsbCk7XG5cbiAgICAgICAgbGFiZWxzLnNlbGVjdCgnLnNjLWxhYmVsJylcbiAgICAgICAgICAuY2FsbChcbiAgICAgICAgICAgIGhhbmRsZUxhYmVsLFxuICAgICAgICAgICAgKHdyYXBMYWJlbHMgPyB3cmFwTGFiZWwgOiBlbGxpcHNpZnlMYWJlbCksXG4gICAgICAgICAgICBjYWxjRnVubmVsV2lkdGhBdFNsaWNlTWlkcG9pbnQsXG4gICAgICAgICAgICBmdW5jdGlvbih0eHQsIGR5KSB7XG4gICAgICAgICAgICAgIGZtdExhYmVsKHR4dCwgJ3NjLWxhYmVsJywgZHksICdtaWRkbGUnLCBmbXRGaWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICApO1xuXG4gICAgICAgIC8vIEFwcGVuZCB2YWx1ZSBhbmQgY291bnQgdGV4dFxuICAgICAgICBsYWJlbHMuYXBwZW5kKCd0ZXh0JylcbiAgICAgICAgICAudGV4dChmbXRWYWx1ZSlcbiAgICAgICAgICAgIC5jYWxsKGZtdExhYmVsLCAnc2MtdmFsdWUnLCAwLjg1LCAnbWlkZGxlJywgZm10RmlsbCk7XG5cbiAgICAgICAgbGFiZWxzLnNlbGVjdCgnLnNjLXZhbHVlJylcbiAgICAgICAgICAuYXBwZW5kKCd0c3BhbicpXG4gICAgICAgICAgICAudGV4dChmbXRDb3VudCk7XG5cbiAgICAgICAgbGFiZWxzXG4gICAgICAgICAgLmNhbGwocG9zaXRpb25WYWx1ZSlcbiAgICAgICAgICAvLyBQb3NpdGlvbiBsYWJlbHMgYW5kIGlkZW50aWZ5IHNpZGUgbGFiZWxzXG4gICAgICAgICAgLmNhbGwoY2FsY0Z1bm5lbExhYmVsRGltZW5zaW9ucylcbiAgICAgICAgICAuY2FsbChwb3NpdGlvbkxhYmVsQm94KTtcblxuICAgICAgICBsYWJlbHNcbiAgICAgICAgICAuY2xhc3NlZCgnc2MtbGFiZWwtc2lkZScsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudG9vVGFsbCB8fCBkLnRvb1dpZGU7IH0pO1xuICAgICAgfVxuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgLy8gVXBkYXRlIHNpZGUgbGFiZWxzXG5cbiAgICAgIGZ1bmN0aW9uIHJlbmRlclNpZGVMYWJlbHMoKSB7XG4gICAgICAgIC8vIFJlbW92ZSBhbGwgcmVzcG9uc2l2ZSBlbGVtZW50c1xuICAgICAgICBzaWRlTGFiZWxzID0gbGFiZWxzLmZpbHRlcignLnNjLWxhYmVsLXNpZGUnKTtcbiAgICAgICAgc2lkZUxhYmVscy5zZWxlY3RBbGwoJy5zYy1sYWJlbCcpLnJlbW92ZSgpO1xuICAgICAgICBzaWRlTGFiZWxzLnNlbGVjdEFsbCgncmVjdCcpLnJlbW92ZSgpO1xuICAgICAgICBzaWRlTGFiZWxzLnNlbGVjdEFsbCgncG9seWxpbmUnKS5yZW1vdmUoKTtcblxuICAgICAgICAvLyBQb3NpdGlvbiBzaWRlIGxhYmVsc1xuICAgICAgICBzaWRlTGFiZWxzLmFwcGVuZCgndGV4dCcpXG4gICAgICAgICAgLnRleHQoZm10S2V5KVxuICAgICAgICAgICAgLmNhbGwoZm10TGFiZWwsICdzYy1sYWJlbCcsIDAuODUsICdzdGFydCcsICcjNTU1Jyk7XG5cbiAgICAgICAgc2lkZUxhYmVscy5zZWxlY3QoJy5zYy1sYWJlbCcpXG4gICAgICAgICAgLmNhbGwoXG4gICAgICAgICAgICBoYW5kbGVMYWJlbCxcbiAgICAgICAgICAgICh3cmFwTGFiZWxzID8gd3JhcExhYmVsIDogZWxsaXBzaWZ5TGFiZWwpLFxuICAgICAgICAgICAgKHdyYXBMYWJlbHMgPyBjYWxjU2lkZVdpZHRoIDogbWF4U2lkZUxhYmVsV2lkdGgpLFxuICAgICAgICAgICAgZnVuY3Rpb24odHh0LCBkeSkge1xuICAgICAgICAgICAgICBmbXRMYWJlbCh0eHQsICdzYy1sYWJlbCcsIGR5LCAnc3RhcnQnLCAnIzU1NScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICk7XG5cbiAgICAgICAgc2lkZUxhYmVsc1xuICAgICAgICAgIC5jYWxsKHBvc2l0aW9uVmFsdWUpO1xuXG4gICAgICAgIHNpZGVMYWJlbHMuc2VsZWN0KCcuc2MtdmFsdWUnKVxuICAgICAgICAgIC5zdHlsZSgndGV4dC1hbmNob3InLCAnc3RhcnQnKVxuICAgICAgICAgIC5zdHlsZSgnZmlsbCcsICcjNTU1Jyk7XG5cbiAgICAgICAgc2lkZUxhYmVsc1xuICAgICAgICAgIC5jYWxsKGNhbGNTaWRlTGFiZWxEaW1lbnNpb25zKTtcblxuICAgICAgICAvLyBSZWZsb3cgc2lkZSBsYWJlbCB2ZXJ0aWNhbCBwb3NpdGlvbiB0byBwcmV2ZW50IG92ZXJsYXBcbiAgICAgICAgdmFyIGQwID0gMDtcblxuICAgICAgICAvLyBUb3AgdG8gYm90dG9tXG4gICAgICAgIGZvciAodmFyIGdyb3VwcyA9IHNpZGVMYWJlbHMubm9kZXMoKSwgaiA9IGdyb3Vwcy5sZW5ndGggLSAxOyBqID49IDA7IC0taikge1xuICAgICAgICAgIHZhciBkID0gZDMuc2VsZWN0KGdyb3Vwc1tqXSkuZGF0YSgpWzBdO1xuICAgICAgICAgIGlmIChkKSB7XG4gICAgICAgICAgICBpZiAoIWQwKSB7XG4gICAgICAgICAgICAgIGQubGFiZWxCb3R0b20gPSBkLmxhYmVsVG9wICsgZC5sYWJlbEhlaWdodCArIGxhYmVsU3BhY2U7XG4gICAgICAgICAgICAgIGQwID0gZC5sYWJlbEJvdHRvbTtcbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGQubGFiZWxUb3AgPSBNYXRoLm1heChkMCwgZC5sYWJlbFRvcCk7XG4gICAgICAgICAgICBkLmxhYmVsQm90dG9tID0gZC5sYWJlbFRvcCArIGQubGFiZWxIZWlnaHQgKyBsYWJlbFNwYWNlO1xuICAgICAgICAgICAgZDAgPSBkLmxhYmVsQm90dG9tO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFuZCB0aGVuLi4uXG4gICAgICAgIGlmIChkMCAmJiBkMCAtIGxhYmVsU3BhY2UgPiBkMy5tYXgoeS5yYW5nZSgpKSkge1xuXG4gICAgICAgICAgZDAgPSAwO1xuXG4gICAgICAgICAgLy8gQm90dG9tIHRvIHRvcFxuICAgICAgICAgIGZvciAodmFyIGdyb3VwcyA9IHNpZGVMYWJlbHMubm9kZXMoKSwgaiA9IDAsIG0gPSBncm91cHMubGVuZ3RoOyBqIDwgbTsgKytqKSB7XG4gICAgICAgICAgICB2YXIgZCA9IGQzLnNlbGVjdChncm91cHNbal0pLmRhdGEoKVswXTtcbiAgICAgICAgICAgIGlmIChkKSB7XG4gICAgICAgICAgICAgIGlmICghZDApIHtcbiAgICAgICAgICAgICAgICBkLmxhYmVsQm90dG9tID0gY2FsY3VsYXRlZEhlaWdodCAtIDE7XG4gICAgICAgICAgICAgICAgZC5sYWJlbFRvcCA9IGQubGFiZWxCb3R0b20gLSBkLmxhYmVsSGVpZ2h0O1xuICAgICAgICAgICAgICAgIGQwID0gZC5sYWJlbFRvcDtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGQubGFiZWxCb3R0b20gPSBNYXRoLm1pbihkMCwgZC5sYWJlbEJvdHRvbSk7XG4gICAgICAgICAgICAgIGQubGFiZWxUb3AgPSBkLmxhYmVsQm90dG9tIC0gZC5sYWJlbEhlaWdodCAtIGxhYmVsU3BhY2U7XG4gICAgICAgICAgICAgIGQwID0gZC5sYWJlbFRvcDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBvaywgRklOQUxMWSwgc28gaWYgd2UgYXJlIGFib3ZlIHRoZSB0b3Agb2YgdGhlIGZ1bm5lbCxcbiAgICAgICAgICAvLyB3ZSBuZWVkIHRvIGxvd2VyIHRoZW0gYWxsIGJhY2sgZG93blxuICAgICAgICAgIGlmIChkMCA8IDApIHtcbiAgICAgICAgICAgIHNpZGVMYWJlbHMuZWFjaChmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgICAgICAgZC5sYWJlbFRvcCAtPSBkMDtcbiAgICAgICAgICAgICAgICBkLmxhYmVsQm90dG9tIC09IGQwO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBkMCA9IDA7XG5cbiAgICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICAgLy8gUmVjYWxjdWxhdGUgZnVubmVsIG9mZnNldCBiYXNlZCBvbiBzaWRlIGxhYmVsIGRpbWVuc2lvbnNcblxuICAgICAgICBzaWRlTGFiZWxzXG4gICAgICAgICAgLmNhbGwoY2FsY09mZnNldHMpO1xuICAgICAgfVxuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgLy8gQ2FsY3VsYXRlIHRoZSB3aWR0aCBhbmQgcG9zaXRpb24gb2YgbGFiZWxzIHdoaWNoXG4gICAgICAvLyBkZXRlcm1pbmVzIHRoZSBmdW5uZWwgb2Zmc2V0IGRpbWVuc2lvblxuXG4gICAgICBmdW5jdGlvbiByZW5kZXJMYWJlbHMoKSB7XG4gICAgICAgIHJlbmRlckZ1bm5lbExhYmVscygpO1xuICAgICAgICByZW5kZXJTaWRlTGFiZWxzKCk7XG4gICAgICB9XG5cbiAgICAgIHJlbmRlckxhYmVscygpO1xuICAgICAgY2FsY0RpbWVuc2lvbnMoKTtcbiAgICAgIGNhbGNTY2FsZXMoKTtcblxuICAgICAgLy8gQ2FsbHMgdHdpY2Ugc2luY2UgdGhlIGZpcnN0IGNhbGwgbWF5IGNyZWF0ZSBhIGZ1bm5lbCBvZmZzZXRcbiAgICAgIC8vIHdoaWNoIGRlY3JlYXNlcyB0aGUgZnVubmVsIHdpZHRoIHdoaWNoIGltcGFjdHMgbGFiZWwgcG9zaXRpb25cblxuICAgICAgcmVuZGVyTGFiZWxzKCk7XG4gICAgICBjYWxjRGltZW5zaW9ucygpO1xuICAgICAgY2FsY1NjYWxlcygpO1xuXG4gICAgICByZW5kZXJMYWJlbHMoKTtcbiAgICAgIGNhbGNEaW1lbnNpb25zKCk7XG4gICAgICBjYWxjU2NhbGVzKCk7XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAvLyBSZXBvc2l0aW9uIHJlc3BvbnNpdmUgZWxlbWVudHNcblxuICAgICAgc2xpY2VzLnNlbGVjdCgnLnNjLWJhc2UnKVxuICAgICAgICAuYXR0cigncG9pbnRzJywgZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHJldHVybiBwb2ludHNUcmFwZXpvaWQoZCwgMSwgY2FsY3VsYXRlZFdpZHRoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgIGlmICh0ZXh0dXJlRmlsbCkge1xuICAgICAgICBzbGljZXMuc2VsZWN0QWxsKCcuc2MtdGV4dHVyZScpXG4gICAgICAgICAgLmF0dHIoJ3BvaW50cycsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiBwb2ludHNUcmFwZXpvaWQoZCwgMSwgY2FsY3VsYXRlZFdpZHRoKTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5zdHlsZSgnZmlsbCcsIGZtdEZpbGwpO1xuICAgICAgfVxuXG4gICAgICBsYWJlbHNcbiAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICB2YXIgeFRyYW5zID0gZC50b29UYWxsID8gMCA6IGNhbGN1bGF0ZWRDZW50ZXIsXG4gICAgICAgICAgICAgIHlUcmFucyA9IGQudG9vVGFsbCA/IDAgOiBkLmxhYmVsVG9wO1xuICAgICAgICAgIHJldHVybiAndHJhbnNsYXRlKCcgKyB4VHJhbnMgKyAnLCcgKyB5VHJhbnMgKyAnKSc7XG4gICAgICAgIH0pO1xuXG4gICAgICBzaWRlTGFiZWxzXG4gICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgcmV0dXJuICd0cmFuc2xhdGUoJyArIGxhYmVsT2Zmc2V0ICsgJywnICsgZC5sYWJlbFRvcCArICcpJztcbiAgICAgICAgfSk7XG5cbiAgICAgIHNpZGVMYWJlbHNcbiAgICAgICAgLmFwcGVuZCgncG9seWxpbmUnKVxuICAgICAgICAgIC5hdHRyKCdjbGFzcycsICdzYy1sYWJlbC1sZWFkZXInKVxuICAgICAgICAgIC5zdHlsZSgnZmlsbC1vcGFjaXR5JywgMClcbiAgICAgICAgICAuc3R5bGUoJ3N0cm9rZScsICcjOTk5JylcbiAgICAgICAgICAuc3R5bGUoJ3N0cm9rZS13aWR0aCcsIDEpXG4gICAgICAgICAgLnN0eWxlKCdzdHJva2Utb3BhY2l0eScsIDAuNSk7XG5cbiAgICAgIHNpZGVMYWJlbHMuc2VsZWN0QWxsKCdwb2x5bGluZScpXG4gICAgICAgIC5jYWxsKHBvaW50c0xlYWRlcik7XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAvLyBVdGlsaXR5IGZ1bmN0aW9uc1xuXG4gICAgICAvLyBUT0RPOiB1c2Ugc2NhbGVzIGluc3RlYWQgb2YgcmF0aW8gYWxnZWJyYVxuICAgICAgLy8gdmFyIGZ1bm5lbFNjYWxlID0gZDMuc2NhbGVMaW5lYXIoKVxuICAgICAgLy8gICAgICAgLmRvbWFpbihbdyAvIDIsIG1pbmltdW1dKVxuICAgICAgLy8gICAgICAgLnJhbmdlKFswLCBtYXh5MSp0aGVuc2NhbGV0aGlzdG9wcmV2ZW50bWluaW11bWZyb21wYXNzaW5nXSk7XG5cbiAgICAgIGZ1bmN0aW9uIGJ1aWxkRXZlbnRPYmplY3QoZSwgZCwgaSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICBrZXk6IGZtdEtleShkKSxcbiAgICAgICAgICB2YWx1ZTogZm10VmFsdWUoZCksXG4gICAgICAgICAgY291bnQ6IGZtdENvdW50KGQpLFxuICAgICAgICAgIGRhdGE6IGQsXG4gICAgICAgICAgc2VyaWVzOiBkLnNlcmllcyxcbiAgICAgICAgICBlOiBlXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIHdyYXBMYWJlbChkLCBsYmwsIGZuV2lkdGgsIGZtdExhYmVsKSB7XG4gICAgICAgIHZhciB0ZXh0ID0gbGJsLnRleHQoKSxcbiAgICAgICAgICAgIGR5ID0gcGFyc2VGbG9hdChsYmwuYXR0cignZHknKSksXG4gICAgICAgICAgICB3b3JkLFxuICAgICAgICAgICAgd29yZHMgPSB0ZXh0LnNwbGl0KC9cXHMrLykucmV2ZXJzZSgpLFxuICAgICAgICAgICAgbGluZSA9IFtdLFxuICAgICAgICAgICAgbGluZU51bWJlciA9IDAsXG4gICAgICAgICAgICBtYXhXaWR0aCA9IGZuV2lkdGgoZCwgMCksXG4gICAgICAgICAgICBwYXJlbnQgPSBkMy5zZWxlY3QobGJsLm5vZGUoKS5wYXJlbnROb2RlKTtcblxuICAgICAgICBsYmwudGV4dChudWxsKTtcblxuICAgICAgICB3aGlsZSAod29yZCA9IHdvcmRzLnBvcCgpKSB7XG4gICAgICAgICAgbGluZS5wdXNoKHdvcmQpO1xuICAgICAgICAgIGxibC50ZXh0KGxpbmUuam9pbignICcpKTtcblxuICAgICAgICAgIGlmIChsYmwubm9kZSgpLmdldENvbXB1dGVkVGV4dExlbmd0aCgpID4gbWF4V2lkdGggJiYgbGluZS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICBsaW5lLnBvcCgpO1xuICAgICAgICAgICAgbGJsLnRleHQobGluZS5qb2luKCcgJykpO1xuICAgICAgICAgICAgbGluZSA9IFt3b3JkXTtcbiAgICAgICAgICAgIGxibCA9IHBhcmVudC5hcHBlbmQoJ3RleHQnKTtcbiAgICAgICAgICAgIGxibC50ZXh0KHdvcmQpXG4gICAgICAgICAgICAgIC5jYWxsKGZtdExhYmVsLCArK2xpbmVOdW1iZXIgKiAxLjEgKyBkeSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGhhbmRsZUxhYmVsKGxibHMsIGZuRm9ybWF0LCBmbldpZHRoLCBmbXRMYWJlbCkge1xuICAgICAgICBsYmxzLmVhY2goZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHZhciBsYmwgPSBkMy5zZWxlY3QodGhpcyk7XG4gICAgICAgICAgZm5Gb3JtYXQoZCwgbGJsLCBmbldpZHRoLCBmbXRMYWJlbCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBlbGxpcHNpZnlMYWJlbChkLCBsYmwsIGZuV2lkdGgsIGZtdExhYmVsKSB7XG4gICAgICAgIHZhciB0ZXh0ID0gbGJsLnRleHQoKSxcbiAgICAgICAgICAgIGR5ID0gcGFyc2VGbG9hdChsYmwuYXR0cignZHknKSksXG4gICAgICAgICAgICBtYXhXaWR0aCA9IGZuV2lkdGgoZCk7XG5cbiAgICAgICAgbGJsLnRleHQodXRpbHMuc3RyaW5nRWxsaXBzaWZ5KHRleHQsIGNvbnRhaW5lciwgbWF4V2lkdGgpKVxuICAgICAgICAgIC5jYWxsKGZtdExhYmVsLCBkeSk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIG1heFNpZGVMYWJlbFdpZHRoKGQpIHtcbiAgICAgICAgLy8gb3ZlcmFsbCB3aWR0aCBvZiBjb250YWluZXIgbWludXMgdGhlIHdpZHRoIG9mIGZ1bm5lbCB0b3BcbiAgICAgICAgLy8gb3IgbWluTGFiZWxXaWR0aCwgd2hpY2ggZXZlciBpcyBncmVhdGVyXG4gICAgICAgIC8vIHRoaXMgaXMgYWxzbyBub3cgYXMgZnVubmVsT2Zmc2V0IChtYXliZSlcbiAgICAgICAgdmFyIHR3ZW50eSA9IE1hdGgubWF4KGF2YWlsYWJsZVdpZHRoIC0gYXZhaWxhYmxlSGVpZ2h0IC8gMS4xLCBtaW5MYWJlbFdpZHRoKSxcbiAgICAgICAgICAgIC8vIGJvdHRvbSBvZiBzbGljZVxuICAgICAgICAgICAgc2xpY2VCb3R0b20gPSBkLl9ib3R0b20sXG4gICAgICAgICAgICAvLyB4IGNvbXBvbmVudCBvZiBzbG9wZSBGIGF0IHlcbiAgICAgICAgICAgIGJhc2UgPSBzbGljZUJvdHRvbSAqIHIsXG4gICAgICAgICAgICAvLyB0b3RhbCB3aWR0aCBhdCBib3R0b20gb2Ygc2xpY2VcbiAgICAgICAgICAgIG1heFdpZHRoID0gdHdlbnR5ICsgYmFzZSxcbiAgICAgICAgICAgIC8vIGhlaWdodCBvZiBzbG9wZWQgbGVhZGVyXG4gICAgICAgICAgICBsZWFkZXJIZWlnaHQgPSBNYXRoLmFicyhkLmxhYmVsQm90dG9tIC0gc2xpY2VCb3R0b20pLFxuICAgICAgICAgICAgLy8gd2lkdGggb2YgdGhlIGFuZ2xlZCBsZWFkZXJcbiAgICAgICAgICAgIGxlYWRlcldpZHRoID0gbGVhZGVySGVpZ2h0ICogcixcbiAgICAgICAgICAgIC8vIHRvdGFsIHdpZHRoIG9mIGxlYWRlclxuICAgICAgICAgICAgbGVhZGVyVG90YWwgPSBsYWJlbEdhcCArIGxlYWRlcldpZHRoICsgbGFiZWxHYXAgKyBsYWJlbEdhcCxcbiAgICAgICAgICAgIC8vIHRoaXMgaXMgdGhlIGRpc3RhbmNlIGZyb20gZW5kIG9mIGxhYmVsIHBsdXMgc3BhY2luZyB0byBGXG4gICAgICAgICAgICBpT2Zmc2V0ID0gbWF4V2lkdGggLSBsZWFkZXJUb3RhbDtcblxuICAgICAgICByZXR1cm4gTWF0aC5tYXgoaU9mZnNldCwgbWluTGFiZWxXaWR0aCk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIHBvaW50c1RyYXBlem9pZChkLCBoLCB3KSB7XG4gICAgICAgIC8vTUFUSDogZG9uJ3QgZGVsZXRlXG4gICAgICAgIC8vIHYgPSAxLzIgKiBoICogKGIgKyBiICsgMipyKmgpO1xuICAgICAgICAvLyAydiA9IGggKiAoYiArIGIgKyAyKnIqaCk7XG4gICAgICAgIC8vIDJ2ID0gaCAqICgyKmIgKyAyKnIqaCk7XG4gICAgICAgIC8vIDJ2ID0gMipiKmggKyAyKnIqaCpoO1xuICAgICAgICAvLyB2ID0gYipoICsgcipoKmg7XG4gICAgICAgIC8vIHYgLSBiKmggLSByKmgqaCA9IDA7XG4gICAgICAgIC8vIHYvciAtIGIqaC9yIC0gaCpoID0gMDtcbiAgICAgICAgLy8gYi9yKmggKyBoKmggKyBiL3IvMipiL3IvMiA9IHYvciArIGIvci8yKmIvci8yO1xuICAgICAgICAvLyBoKmggKyBiL3IqaCArIGIvci8yKmIvci8yID0gdi9yICsgYi9yLzIqYi9yLzI7XG4gICAgICAgIC8vIChoICsgYi9yLzIpKGggKyBiL3IvMikgPSB2L3IgKyBiL3IvMipiL3IvMjtcbiAgICAgICAgLy8gaCArIGIvci8yID0gTWF0aC5zcXJ0KHYvciArIGIvci8yKmIvci8yKTtcbiAgICAgICAgLy8gaCAgPSBNYXRoLmFicyhNYXRoLnNxcnQodi9yICsgYi9yLzIqYi9yLzIpKSAtIGIvci8yO1xuICAgICAgICB2YXIgeTAgPSBkLl9ib3R0b20sXG4gICAgICAgICAgICB5MSA9IGQuX3RvcCxcbiAgICAgICAgICAgIHcwID0gdyAvIDIgLSByICogeTAsXG4gICAgICAgICAgICB3MSA9IHcgLyAyIC0gciAqIHkxLFxuICAgICAgICAgICAgYyA9IGNhbGN1bGF0ZWRDZW50ZXI7XG5cbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAoYyAtIHcwKSArICcsJyArICh5MCAqIGgpICsgJyAnICtcbiAgICAgICAgICAoYyAtIHcxKSArICcsJyArICh5MSAqIGgpICsgJyAnICtcbiAgICAgICAgICAoYyArIHcxKSArICcsJyArICh5MSAqIGgpICsgJyAnICtcbiAgICAgICAgICAoYyArIHcwKSArICcsJyArICh5MCAqIGgpXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGhlaWdodFRyYXBlem9pZChhLCBiKSB7XG4gICAgICAgIHZhciB4ID0gYiAvIHIgLyAyO1xuICAgICAgICByZXR1cm4gTWF0aC5hYnMoTWF0aC5zcXJ0KGEgLyByICsgeCAqIHgpKSAtIHg7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGFyZWFUcmFwZXpvaWQoaCwgdykge1xuICAgICAgICByZXR1cm4gaCAqICh3IC0gaCAqIHIpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBjYWxjV2lkdGgob2Zmc2V0KSB7XG4gICAgICAgIHJldHVybiBNYXRoLnJvdW5kKE1hdGgubWF4KE1hdGgubWluKGF2YWlsYWJsZUhlaWdodCAvIDEuMSwgYXZhaWxhYmxlV2lkdGggLSBvZmZzZXQpLCA0MCkpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBjYWxjSGVpZ2h0KCkge1xuICAgICAgICAvLyBNQVRIOiBkb24ndCBkZWxldGVcbiAgICAgICAgLy8gaCA9IDY2Ni42NjZcbiAgICAgICAgLy8gdyA9IDYwMFxuICAgICAgICAvLyBtID0gMjAwXG4gICAgICAgIC8vIGF0IHdoYXQgaGVpZ2h0IGlzIG0gPSAyMDBcbiAgICAgICAgLy8gdyA9IGggKiAwLjMgPSA2NjYgKiAwLjMgPSAyMDBcbiAgICAgICAgLy8gbWF4aGVpZ2h0ID0gKCh3IC0gbSkgLyAyKSAvIDAuMyA9ICh3IC0gbSkgLyAwLjYgPSBoXG4gICAgICAgIC8vICg2MDAgLSAyMDApIC8gMC42ID0gNDAwIC8gMC42ID0gNjY2XG4gICAgICAgIHJldHVybiBNYXRoLm1pbihjYWxjdWxhdGVkV2lkdGggKiAxLjEsIChjYWxjdWxhdGVkV2lkdGggLSBjYWxjdWxhdGVkV2lkdGggKiByKSAvICgyICogcikpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBjYWxjQ2VudGVyKG9mZnNldCkge1xuICAgICAgICByZXR1cm4gY2FsY3VsYXRlZFdpZHRoIC8gMiArIG9mZnNldDtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gY2FsY0Z1bm5lbFdpZHRoQXRTbGljZU1pZHBvaW50KGQpIHtcbiAgICAgICAgdmFyIGIgPSBjYWxjdWxhdGVkV2lkdGgsXG4gICAgICAgICAgICB2ID0gZC5fYm90dG9tIC0gZC5faGVpZ2h0IC8gMjsgLy8gbWlkIHBvaW50IG9mIHNsaWNlXG4gICAgICAgIHJldHVybiBiIC0gdiAqIHIgKiAyO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBjYWxjU2lkZVdpZHRoKGQsIG9mZnNldCkge1xuICAgICAgICB2YXIgYiA9IE1hdGgubWF4KChhdmFpbGFibGVXaWR0aCAtIGNhbGN1bGF0ZWRXaWR0aCkgLyAyLCBvZmZzZXQpLFxuICAgICAgICAgICAgdiA9IGQuX3RvcDsgLy8gdG9wIG9mIHNsaWNlXG4gICAgICAgIHJldHVybiBiICsgdiAqIHI7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGNhbGNMYWJlbEJCb3gobGJsKSB7XG4gICAgICAgIHJldHVybiBkMy5zZWxlY3QobGJsKS5ub2RlKCkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGNhbGNGdW5uZWxMYWJlbERpbWVuc2lvbnMobGJscykge1xuICAgICAgICBsYmxzLmVhY2goZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHZhciBiYm94ID0gY2FsY0xhYmVsQkJveCh0aGlzKTtcblxuICAgICAgICAgIGQubGFiZWxIZWlnaHQgPSBiYm94LmhlaWdodDtcbiAgICAgICAgICBkLmxhYmVsV2lkdGggPSBiYm94LndpZHRoO1xuICAgICAgICAgIGQubGFiZWxUb3AgPSAoZC5fYm90dG9tIC0gZC5faGVpZ2h0IC8gMikgLSBkLmxhYmVsSGVpZ2h0IC8gMjtcbiAgICAgICAgICBkLmxhYmVsQm90dG9tID0gZC5sYWJlbFRvcCArIGQubGFiZWxIZWlnaHQgKyBsYWJlbFNwYWNlO1xuICAgICAgICAgIGQudG9vV2lkZSA9IGQubGFiZWxXaWR0aCA+IGNhbGNGdW5uZWxXaWR0aEF0U2xpY2VNaWRwb2ludChkKTtcbiAgICAgICAgICBkLnRvb1RhbGwgPSBkLmxhYmVsSGVpZ2h0ID4gZC5faGVpZ2h0IC0gNDtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGNhbGNTaWRlTGFiZWxEaW1lbnNpb25zKGxibHMpIHtcbiAgICAgICAgbGJscy5lYWNoKGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICB2YXIgYmJveCA9IGNhbGNMYWJlbEJCb3godGhpcyk7XG5cbiAgICAgICAgICBkLmxhYmVsSGVpZ2h0ID0gYmJveC5oZWlnaHQ7XG4gICAgICAgICAgZC5sYWJlbFdpZHRoID0gYmJveC53aWR0aDtcbiAgICAgICAgICBkLmxhYmVsVG9wID0gZC5fdG9wO1xuICAgICAgICAgIGQubGFiZWxCb3R0b20gPSBkLmxhYmVsVG9wICsgZC5sYWJlbEhlaWdodCArIGxhYmVsU3BhY2U7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBwb2ludHNMZWFkZXIocG9seWxpbmVzKSB7XG4gICAgICAgIC8vIE1lc3Mgd2l0aCB0aGlzIGZ1bmN0aW9uIGF0IHlvdXIgcGVyaWwuXG4gICAgICAgIHZhciBjID0gcG9seWxpbmVzLnNpemUoKTtcblxuICAgICAgICAvLyBydW4gdG9wIHRvIGJvdHRvbVxuICAgICAgICBmb3IgKHZhciBncm91cHMgPSBwb2x5bGluZXMubm9kZXMoKSwgaSA9IGdyb3Vwcy5sZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgICAgIHZhciBub2RlID0gZDMuc2VsZWN0KGdyb3Vwc1tpXSk7XG4gICAgICAgICAgdmFyIGQgPSBub2RlLmRhdGEoKVswXTtcbiAgICAgICAgICB2YXIgLy8gcHJldmlvdXMgbGFiZWxcbiAgICAgICAgICAgICAgcCA9IGkgPCBjIC0gMSA/IGQzLnNlbGVjdChncm91cHNbaSArIDFdKS5kYXRhKClbMF0gOiBudWxsLFxuICAgICAgICAgICAgICAvLyBuZXh0IGxhYmVsXG4gICAgICAgICAgICAgIG4gPSBpID8gZDMuc2VsZWN0KGdyb3Vwc1tpIC0gMV0pLmRhdGEoKVswXSA6IG51bGwsXG4gICAgICAgICAgICAgIC8vIGxhYmVsIGhlaWdodFxuICAgICAgICAgICAgICBoID0gTWF0aC5yb3VuZChkLmxhYmVsSGVpZ2h0KSArIDAuNSxcbiAgICAgICAgICAgICAgLy8gc2xpY2UgYm90dG9tXG4gICAgICAgICAgICAgIHQgPSBNYXRoLnJvdW5kKGQuX2JvdHRvbSAtIGQubGFiZWxUb3ApIC0gMC41LFxuICAgICAgICAgICAgICAvLyBwcmV2aW91cyB3aWR0aFxuICAgICAgICAgICAgICB3cCA9IHAgPyBwLmxhYmVsV2lkdGggLSAoZC5sYWJlbEJvdHRvbSAtIHAubGFiZWxCb3R0b20pICogciA6IDAsXG4gICAgICAgICAgICAgIC8vIGN1cnJlbnQgd2lkdGhcbiAgICAgICAgICAgICAgd2MgPSBkLmxhYmVsV2lkdGgsXG4gICAgICAgICAgICAgIC8vIG5leHQgd2lkdGhcbiAgICAgICAgICAgICAgd24gPSBuICYmIGggPCB0ID8gbi5sYWJlbFdpZHRoIDogMCxcbiAgICAgICAgICAgICAgLy8gZmluYWwgd2lkdGhcbiAgICAgICAgICAgICAgdyA9IE1hdGgucm91bmQoTWF0aC5tYXgod3AsIHdjLCB3bikpICsgbGFiZWxHYXAsXG4gICAgICAgICAgICAgIC8vIGZ1bm5lbCBlZGdlXG4gICAgICAgICAgICAgIGYgPSBNYXRoLnJvdW5kKGNhbGNTaWRlV2lkdGgoZCwgZnVubmVsT2Zmc2V0KSkgLSBsYWJlbE9mZnNldCAtIGxhYmVsR2FwO1xuXG4gICAgICAgICAgLy8gcG9seWxpbmUgcG9pbnRzXG4gICAgICAgICAgdmFyIHBvaW50cyA9IDAgKyAnLCcgKyBoICsgJyAnICtcbiAgICAgICAgICAgICAgICAgdyArICcsJyArIGggKyAnICcgK1xuICAgICAgICAgICAgICAgICAodyArIE1hdGguYWJzKGggLSB0KSAqIHIpICsgJywnICsgdCArICcgJyArXG4gICAgICAgICAgICAgICAgIGYgKyAnLCcgKyB0O1xuXG4gICAgICAgICAgLy8gdGhpcyB3aWxsIGJlIG92ZXJyaWRkaW5nIHRoZSBsYWJlbCB3aWR0aCBpbiBkYXRhXG4gICAgICAgICAgLy8gcmVmZXJlbmNlZCBhYm92ZSBhcyBwLmxhYmVsV2lkdGhcbiAgICAgICAgICBkLmxhYmVsV2lkdGggPSB3O1xuICAgICAgICAgIG5vZGUuYXR0cigncG9pbnRzJywgcG9pbnRzKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBjYWxjT2Zmc2V0cyhsYmxzKSB7XG4gICAgICAgIHZhciBzaWRlV2lkdGggPSAoYXZhaWxhYmxlV2lkdGggLSBjYWxjdWxhdGVkV2lkdGgpIC8gMiwgLy8gbmF0dXJhbCB3aWR0aCBvZiBzaWRlXG4gICAgICAgICAgICBvZmZzZXQgPSAwO1xuXG4gICAgICAgIGxibHMuZWFjaChmdW5jdGlvbihkKSB7XG4gICAgICAgICAgdmFyIC8vIGJvdHRvbSBvZiBzbGljZVxuICAgICAgICAgICAgICBzbGljZUJvdHRvbSA9IGQuX2JvdHRvbSxcbiAgICAgICAgICAgICAgLy8gaXMgc2xpY2UgYmVsb3cgb3IgYWJvdmUgbGFiZWwgYm90dG9tXG4gICAgICAgICAgICAgIHNjYWxhciA9IGQubGFiZWxCb3R0b20gPj0gc2xpY2VCb3R0b20gPyAxIDogMCxcbiAgICAgICAgICAgICAgLy8gdGhlIHdpZHRoIG9mIHRoZSBhbmdsZWQgbGVhZGVyXG4gICAgICAgICAgICAgIC8vIGZyb20gYm90dG9tIHJpZ2h0IG9mIGxhYmVsIHRvIGJvdHRvbSBvZiBzbGljZVxuICAgICAgICAgICAgICBsZWFkZXJTbG9wZSA9IE1hdGguYWJzKGQubGFiZWxCb3R0b20gKyBsYWJlbEdhcCAtIHNsaWNlQm90dG9tKSAqIHIsXG4gICAgICAgICAgICAgIC8vIHRoaXMgaXMgdGhlIHggY29tcG9uZW50IG9mIHNsb3BlIEYgYXQgeVxuICAgICAgICAgICAgICBiYXNlID0gc2xpY2VCb3R0b20gKiByLFxuICAgICAgICAgICAgICAvLyB0aGlzIGlzIHRoZSBkaXN0YW5jZSBmcm9tIGVuZCBvZiBsYWJlbCBwbHVzIHNwYWNpbmcgdG8gRlxuICAgICAgICAgICAgICBpT2Zmc2V0ID0gZC5sYWJlbFdpZHRoICsgbGVhZGVyU2xvcGUgKyBsYWJlbEdhcCAqIDMgLSBiYXNlO1xuICAgICAgICAgIC8vIGlmIHRoaXMgbGFiZWwgc3RpY2tzIG91dCBwYXN0IEZcbiAgICAgICAgICBpZiAoaU9mZnNldCA+PSBvZmZzZXQpIHtcbiAgICAgICAgICAgIC8vIHRoaXMgaXMgdGhlIG1pbmltdW0gZGlzdGFuY2UgZm9yIEZcbiAgICAgICAgICAgIC8vIGhhcyB0byBiZSBhd2F5IGZyb20gdGhlIGxlZnQgZWRnZSBvZiBsYWJlbHNcbiAgICAgICAgICAgIG9mZnNldCA9IGlPZmZzZXQ7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBob3cgZmFyIGZyb20gY2hhcnQgZWRnZSBpcyBsYWJlbCBsZWZ0IGVkZ2VcbiAgICAgICAgb2Zmc2V0ID0gTWF0aC5yb3VuZChvZmZzZXQgKiAxMCkgLyAxMDtcblxuICAgICAgICAvLyB0aGVyZSBhcmUgdGhyZWUgc3RhdGVzOlxuICAgICAgICBpZiAob2Zmc2V0IDw9IDApIHtcbiAgICAgICAgLy8gMS4gbm8gbGFiZWwgc3RpY2tzIG91dCBwYXN0IEZcbiAgICAgICAgICBsYWJlbE9mZnNldCA9IHNpZGVXaWR0aDtcbiAgICAgICAgICBmdW5uZWxPZmZzZXQgPSBzaWRlV2lkdGg7XG4gICAgICAgIH0gZWxzZSBpZiAob2Zmc2V0ID4gMCAmJiBvZmZzZXQgPCBzaWRlV2lkdGgpIHtcbiAgICAgICAgLy8gMi4gaU9mZnNldCBpcyA+IDAgYnV0IDwgc2lkZVdpZHRoXG4gICAgICAgICAgbGFiZWxPZmZzZXQgPSBzaWRlV2lkdGggLSBvZmZzZXQ7XG4gICAgICAgICAgZnVubmVsT2Zmc2V0ID0gc2lkZVdpZHRoO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAvLyAzLiBpT2Zmc2V0IGlzID49IHNpZGVXaWR0aFxuICAgICAgICAgIGxhYmVsT2Zmc2V0ID0gMDtcbiAgICAgICAgICBmdW5uZWxPZmZzZXQgPSBvZmZzZXQ7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZm10RmlsbChkLCBpLCBqKSB7XG4gICAgICAgIHZhciBiYWNrQ29sb3IgPSBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKS5zdHlsZSgnZmlsbCcpO1xuICAgICAgICByZXR1cm4gdXRpbHMuZ2V0VGV4dENvbnRyYXN0KGJhY2tDb2xvciwgaSk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGZtdERpcmVjdGlvbihkKSB7XG4gICAgICAgIHZhciBtID0gdXRpbHMuaXNSVExDaGFyKGQuc2xpY2UoLTEpKSxcbiAgICAgICAgICAgIGRpciA9IG0gPyAncnRsJyA6ICdsdHInO1xuICAgICAgICByZXR1cm4gJ2x0cic7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGZtdExhYmVsKHR4dCwgY2xhc3NlcywgZHksIGFuY2hvciwgZmlsbCkge1xuICAgICAgICB0eHRcbiAgICAgICAgICAuYXR0cigneCcsIDApXG4gICAgICAgICAgLmF0dHIoJ3knLCAwKVxuICAgICAgICAgIC5hdHRyKCdkeScsIGR5ICsgJ2VtJylcbiAgICAgICAgICAuYXR0cignY2xhc3MnLCBjbGFzc2VzKVxuICAgICAgICAgIC5hdHRyKCdkaXJlY3Rpb24nLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBmbXREaXJlY3Rpb24odHh0LnRleHQoKSk7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAuc3R5bGUoJ3BvaW50ZXItZXZlbnRzJywgJ25vbmUnKVxuICAgICAgICAgIC5zdHlsZSgndGV4dC1hbmNob3InLCBhbmNob3IpXG4gICAgICAgICAgLnN0eWxlKCdmaWxsJywgZmlsbCk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIHBvc2l0aW9uVmFsdWUobGJscykge1xuICAgICAgICBsYmxzLmVhY2goZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHZhciBsYmwgPSBkMy5zZWxlY3QodGhpcyk7XG4gICAgICAgICAgdmFyIGNudCA9IGxibC5zZWxlY3RBbGwoJy5zYy1sYWJlbCcpLnNpemUoKSArIDE7XG4gICAgICAgICAgdmFyIGR5ID0gKC44NSArIGNudCAtIDEpICsgJ2VtJztcbiAgICAgICAgICBsYmwuc2VsZWN0KCcuc2MtdmFsdWUnKVxuICAgICAgICAgICAgLmF0dHIoJ2R5JywgZHkpO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gcG9zaXRpb25MYWJlbEJveChsYmxzKSB7XG4gICAgICAgIGxibHMuZWFjaChmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgdmFyIGxibCA9IGQzLnNlbGVjdCh0aGlzKTtcblxuICAgICAgICAgIGxibC5zZWxlY3QoJy5zYy1sYWJlbC1ib3gnKVxuICAgICAgICAgICAgLmF0dHIoJ3gnLCAoZC5sYWJlbFdpZHRoICsgNikgLyAtMilcbiAgICAgICAgICAgIC5hdHRyKCd5JywgLTIpXG4gICAgICAgICAgICAuYXR0cignd2lkdGgnLCBkLmxhYmVsV2lkdGggKyA2KVxuICAgICAgICAgICAgLmF0dHIoJ2hlaWdodCcsIGQubGFiZWxIZWlnaHQgKyA0KVxuICAgICAgICAgICAgLmF0dHIoJ3J4JywgMilcbiAgICAgICAgICAgIC5hdHRyKCdyeScsIDIpXG4gICAgICAgICAgICAuc3R5bGUoJ2ZpbGwtb3BhY2l0eScsIDEpO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGNoYXJ0O1xuICB9XG5cblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBFeHBvc2UgUHVibGljIFZhcmlhYmxlc1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGNoYXJ0LmRpc3BhdGNoID0gZGlzcGF0Y2g7XG5cbiAgY2hhcnQuaWQgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gaWQ7XG4gICAgfVxuICAgIGlkID0gXztcbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQuY29sb3IgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gY29sb3I7XG4gICAgfVxuICAgIGNvbG9yID0gXztcbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG4gIGNoYXJ0LmZpbGwgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gZmlsbDtcbiAgICB9XG4gICAgZmlsbCA9IF87XG4gICAgcmV0dXJuIGNoYXJ0O1xuICB9O1xuICBjaGFydC5jbGFzc2VzID0gZnVuY3Rpb24oXykge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIGNsYXNzZXM7XG4gICAgfVxuICAgIGNsYXNzZXMgPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcbiAgY2hhcnQuZ3JhZGllbnQgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gZ3JhZGllbnQ7XG4gICAgfVxuICAgIGNoYXJ0LmdyYWRpZW50ID0gXztcbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQubWFyZ2luID0gZnVuY3Rpb24oXykge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIG1hcmdpbjtcbiAgICB9XG4gICAgbWFyZ2luLnRvcCAgICA9IHR5cGVvZiBfLnRvcCAgICAhPSAndW5kZWZpbmVkJyA/IF8udG9wICAgIDogbWFyZ2luLnRvcDtcbiAgICBtYXJnaW4ucmlnaHQgID0gdHlwZW9mIF8ucmlnaHQgICE9ICd1bmRlZmluZWQnID8gXy5yaWdodCAgOiBtYXJnaW4ucmlnaHQ7XG4gICAgbWFyZ2luLmJvdHRvbSA9IHR5cGVvZiBfLmJvdHRvbSAhPSAndW5kZWZpbmVkJyA/IF8uYm90dG9tIDogbWFyZ2luLmJvdHRvbTtcbiAgICBtYXJnaW4ubGVmdCAgID0gdHlwZW9mIF8ubGVmdCAgICE9ICd1bmRlZmluZWQnID8gXy5sZWZ0ICAgOiBtYXJnaW4ubGVmdDtcbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQud2lkdGggPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gd2lkdGg7XG4gICAgfVxuICAgIHdpZHRoID0gXztcbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQuaGVpZ2h0ID0gZnVuY3Rpb24oXykge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIGhlaWdodDtcbiAgICB9XG4gICAgaGVpZ2h0ID0gXztcbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQueCA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBnZXRYO1xuICAgIH1cbiAgICBnZXRYID0gXztcbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQueSA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBnZXRZO1xuICAgIH1cbiAgICBnZXRZID0gdXRpbHMuZnVuY3RvcihfKTtcbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQuZ2V0S2V5ID0gZnVuY3Rpb24oXykge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIGdldEtleTtcbiAgICB9XG4gICAgZ2V0S2V5ID0gXztcbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQuZ2V0VmFsdWUgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gZ2V0VmFsdWU7XG4gICAgfVxuICAgIGdldFZhbHVlID0gXztcbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQuZm10S2V5ID0gZnVuY3Rpb24oXykge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIGZtdEtleTtcbiAgICB9XG4gICAgZm10S2V5ID0gXztcbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQuZm10VmFsdWUgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gZm10VmFsdWU7XG4gICAgfVxuICAgIGZtdFZhbHVlID0gXztcbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQuZm10Q291bnQgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gZm10Q291bnQ7XG4gICAgfVxuICAgIGZtdENvdW50ID0gXztcbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQuZGlyZWN0aW9uID0gZnVuY3Rpb24oXykge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIGRpcmVjdGlvbjtcbiAgICB9XG4gICAgZGlyZWN0aW9uID0gXztcbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQuZGVsYXkgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gZGVsYXk7XG4gICAgfVxuICAgIGRlbGF5ID0gXztcbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQuZHVyYXRpb24gPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gZHVyYXRpb247XG4gICAgfVxuICAgIGR1cmF0aW9uID0gXztcbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQudGV4dHVyZUZpbGwgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gdGV4dHVyZUZpbGw7XG4gICAgfVxuICAgIHRleHR1cmVGaWxsID0gXztcbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQubG9jYWxpdHkgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gbG9jYWxpdHk7XG4gICAgfVxuICAgIGxvY2FsaXR5ID0gdXRpbHMuYnVpbGRMb2NhbGl0eShfKTtcbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQueFNjYWxlID0gZnVuY3Rpb24oXykge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHg7XG4gICAgfVxuICAgIHggPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC55U2NhbGUgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4geTtcbiAgICB9XG4gICAgeSA9IF87XG4gICAgcmV0dXJuIGNoYXJ0O1xuICB9O1xuXG4gIGNoYXJ0LnlEb21haW4gPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4geURvbWFpbjtcbiAgICB9XG4gICAgeURvbWFpbiA9IF87XG4gICAgcmV0dXJuIGNoYXJ0O1xuICB9O1xuXG4gIGNoYXJ0LmZvcmNlWSA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBmb3JjZVk7XG4gICAgfVxuICAgIGZvcmNlWSA9IF87XG4gICAgcmV0dXJuIGNoYXJ0O1xuICB9O1xuXG4gIGNoYXJ0LndyYXBMYWJlbHMgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gd3JhcExhYmVscztcbiAgICB9XG4gICAgd3JhcExhYmVscyA9IF87XG4gICAgcmV0dXJuIGNoYXJ0O1xuICB9O1xuXG4gIGNoYXJ0Lm1pbkxhYmVsV2lkdGggPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gbWluTGFiZWxXaWR0aDtcbiAgICB9XG4gICAgbWluTGFiZWxXaWR0aCA9IF87XG4gICAgcmV0dXJuIGNoYXJ0O1xuICB9O1xuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgcmV0dXJuIGNoYXJ0O1xufVxuIiwiLy8gaW1wb3J0IGQzIGZyb20gJ2QzJztcbmltcG9ydCB1dGlscyBmcm9tICcuLi91dGlscy5qcyc7XG5pbXBvcnQgbGVnZW5kIGZyb20gJy4vbGVnZW5kLmpzJztcbmltcG9ydCBmdW5uZWwgZnJvbSAnLi9mdW5uZWwuanMnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBQdWJsaWMgVmFyaWFibGVzIHdpdGggRGVmYXVsdCBTZXR0aW5nc1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHZhciBtYXJnaW4gPSB7dG9wOiAxMCwgcmlnaHQ6IDEwLCBib3R0b206IDEwLCBsZWZ0OiAxMH0sXG4gICAgICB3aWR0aCA9IG51bGwsXG4gICAgICBoZWlnaHQgPSBudWxsLFxuICAgICAgc2hvd1RpdGxlID0gZmFsc2UsXG4gICAgICBzaG93Q29udHJvbHMgPSBmYWxzZSxcbiAgICAgIHNob3dMZWdlbmQgPSB0cnVlLFxuICAgICAgZGlyZWN0aW9uID0gJ2x0cicsXG4gICAgICBkZWxheSA9IDAsXG4gICAgICBkdXJhdGlvbiA9IDAsXG4gICAgICB0b29sdGlwID0gbnVsbCxcbiAgICAgIHRvb2x0aXBzID0gdHJ1ZSxcbiAgICAgIHN0YXRlID0ge30sXG4gICAgICBzdHJpbmdzID0ge1xuICAgICAgICBsZWdlbmQ6IHtjbG9zZTogJ0hpZGUgbGVnZW5kJywgb3BlbjogJ1Nob3cgbGVnZW5kJ30sXG4gICAgICAgIGNvbnRyb2xzOiB7Y2xvc2U6ICdIaWRlIGNvbnRyb2xzJywgb3BlbjogJ1Nob3cgY29udHJvbHMnfSxcbiAgICAgICAgbm9EYXRhOiAnTm8gRGF0YSBBdmFpbGFibGUuJyxcbiAgICAgICAgbm9MYWJlbDogJ3VuZGVmaW5lZCdcbiAgICAgIH0sXG4gICAgICBkaXNwYXRjaCA9IGQzLmRpc3BhdGNoKCdjaGFydENsaWNrJywgJ2VsZW1lbnRDbGljaycsICd0b29sdGlwU2hvdycsICd0b29sdGlwSGlkZScsICd0b29sdGlwTW92ZScsICdzdGF0ZUNoYW5nZScsICdjaGFuZ2VTdGF0ZScpO1xuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFByaXZhdGUgVmFyaWFibGVzXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgdmFyIGZ1bm5lbCA9IHN1Y3Jvc2UuZnVubmVsKCksXG4gICAgICBtb2RlbCA9IGZ1bm5lbCxcbiAgICAgIGNvbnRyb2xzID0gc3Vjcm9zZS5sZWdlbmQoKS5hbGlnbignY2VudGVyJyksXG4gICAgICBsZWdlbmQgPSBzdWNyb3NlLmxlZ2VuZCgpLmFsaWduKCdjZW50ZXInKTtcblxuICB2YXIgdG9vbHRpcENvbnRlbnQgPSBmdW5jdGlvbihrZXksIHgsIHksIGUsIGdyYXBoKSB7XG4gICAgICAgIHJldHVybiAnPGgzPicgKyBrZXkgKyAnPC9oMz4nICtcbiAgICAgICAgICAgICAgICc8cD4nICsgeSArICcgb24gJyArIHggKyAnPC9wPic7XG4gICAgICB9O1xuXG4gIHZhciBzaG93VG9vbHRpcCA9IGZ1bmN0aW9uKGVvLCBvZmZzZXRFbGVtZW50LCBwcm9wZXJ0aWVzKSB7XG4gICAgICAgIHZhciBrZXkgPSBtb2RlbC5nZXRLZXkoKShlbyksXG4gICAgICAgICAgICB5ID0gbW9kZWwuZ2V0VmFsdWUoKShlbyksXG4gICAgICAgICAgICB4ID0gcHJvcGVydGllcy50b3RhbCA/ICh5ICogMTAwIC8gcHJvcGVydGllcy50b3RhbCkudG9GaXhlZCgxKSA6IDEwMCxcbiAgICAgICAgICAgIGNvbnRlbnQgPSB0b29sdGlwQ29udGVudChrZXksIHgsIHksIGVvLCBjaGFydCk7XG5cbiAgICAgICAgcmV0dXJuIHN1Y3Jvc2UudG9vbHRpcC5zaG93KGVvLmUsIGNvbnRlbnQsIG51bGwsIG51bGwsIG9mZnNldEVsZW1lbnQpO1xuICAgICAgfTtcblxuICB2YXIgc2VyaWVzQ2xpY2sgPSBmdW5jdGlvbihkYXRhLCBlLCBjaGFydCkgeyByZXR1cm47IH07XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICBmdW5jdGlvbiBjaGFydChzZWxlY3Rpb24pIHtcblxuICAgIHNlbGVjdGlvbi5lYWNoKGZ1bmN0aW9uKGNoYXJ0RGF0YSkge1xuXG4gICAgICB2YXIgdGhhdCA9IHRoaXMsXG4gICAgICAgICAgY29udGFpbmVyID0gZDMuc2VsZWN0KHRoaXMpLFxuICAgICAgICAgIG1vZGVsQ2xhc3MgPSAnZnVubmVsJztcblxuICAgICAgdmFyIHByb3BlcnRpZXMgPSBjaGFydERhdGEgPyBjaGFydERhdGEucHJvcGVydGllcyA6IHt9LFxuICAgICAgICAgIGRhdGEgPSBjaGFydERhdGEgPyBjaGFydERhdGEuZGF0YSA6IG51bGw7XG5cbiAgICAgIHZhciBjb250YWluZXJXaWR0aCA9IHBhcnNlSW50KGNvbnRhaW5lci5zdHlsZSgnd2lkdGgnKSwgMTApLFxuICAgICAgICAgIGNvbnRhaW5lckhlaWdodCA9IHBhcnNlSW50KGNvbnRhaW5lci5zdHlsZSgnaGVpZ2h0JyksIDEwKTtcblxuICAgICAgdmFyIHhJc0RhdGV0aW1lID0gY2hhcnREYXRhLnByb3BlcnRpZXMueERhdGFUeXBlID09PSAnZGF0ZXRpbWUnIHx8IGZhbHNlLFxuICAgICAgICAgIHlJc0N1cnJlbmN5ID0gY2hhcnREYXRhLnByb3BlcnRpZXMueURhdGFUeXBlID09PSAnY3VycmVuY3knIHx8IGZhbHNlO1xuXG4gICAgICBjaGFydC51cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgY29udGFpbmVyLnRyYW5zaXRpb24oKS5kdXJhdGlvbihkdXJhdGlvbikuY2FsbChjaGFydCk7XG4gICAgICB9O1xuXG4gICAgICBjaGFydC5jb250YWluZXIgPSB0aGlzO1xuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgLy8gUHJpdmF0ZSBtZXRob2QgZm9yIGRpc3BsYXlpbmcgbm8gZGF0YSBtZXNzYWdlLlxuXG4gICAgICBmdW5jdGlvbiBkaXNwbGF5Tm9EYXRhKGQpIHtcbiAgICAgICAgdmFyIGhhc0RhdGEgPSBkICYmIGQubGVuZ3RoLFxuICAgICAgICAgICAgeCA9IChjb250YWluZXJXaWR0aCAtIG1hcmdpbi5sZWZ0IC0gbWFyZ2luLnJpZ2h0KSAvIDIgKyBtYXJnaW4ubGVmdCxcbiAgICAgICAgICAgIHkgPSAoY29udGFpbmVySGVpZ2h0IC0gbWFyZ2luLnRvcCAtIG1hcmdpbi5ib3R0b20pIC8gMiArIG1hcmdpbi50b3A7XG4gICAgICAgIHJldHVybiB1dGlscy5kaXNwbGF5Tm9EYXRhKGhhc0RhdGEsIGNvbnRhaW5lciwgY2hhcnQuc3RyaW5ncygpLm5vRGF0YSwgeCwgeSk7XG4gICAgICB9XG5cbiAgICAgIC8vIENoZWNrIHRvIHNlZSBpZiB0aGVyZSdzIG5vdGhpbmcgdG8gc2hvdy5cbiAgICAgIGlmIChkaXNwbGF5Tm9EYXRhKGRhdGEpKSB7XG4gICAgICAgIHJldHVybiBjaGFydDtcbiAgICAgIH1cblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIC8vIFByb2Nlc3MgZGF0YVxuXG4gICAgICBjaGFydC5kYXRhU2VyaWVzQWN0aXZhdGUgPSBmdW5jdGlvbihlbykge1xuICAgICAgICB2YXIgc2VyaWVzID0gZW8uc2VyaWVzO1xuXG4gICAgICAgIHNlcmllcy5hY3RpdmUgPSAoIXNlcmllcy5hY3RpdmUgfHwgc2VyaWVzLmFjdGl2ZSA9PT0gJ2luYWN0aXZlJykgPyAnYWN0aXZlJyA6ICdpbmFjdGl2ZSc7XG5cbiAgICAgICAgLy8gaWYgeW91IGhhdmUgYWN0aXZhdGVkIGEgZGF0YSBzZXJpZXMsIGluYWN0aXZhdGUgdGhlIHJlc3RcbiAgICAgICAgaWYgKHNlcmllcy5hY3RpdmUgPT09ICdhY3RpdmUnKSB7XG4gICAgICAgICAgZGF0YVxuICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgIHJldHVybiBkLmFjdGl2ZSAhPT0gJ2FjdGl2ZSc7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLm1hcChmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgIGQuYWN0aXZlID0gJ2luYWN0aXZlJztcbiAgICAgICAgICAgICAgcmV0dXJuIGQ7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGlmIHRoZXJlIGFyZSBubyBhY3RpdmUgZGF0YSBzZXJpZXMsIGluYWN0aXZhdGUgdGhlbSBhbGxcbiAgICAgICAgaWYgKCFkYXRhLmZpbHRlcihmdW5jdGlvbihkKSB7IHJldHVybiBkLmFjdGl2ZSA9PT0gJ2FjdGl2ZSc7IH0pLmxlbmd0aCkge1xuICAgICAgICAgIGRhdGEubWFwKGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIGQuYWN0aXZlID0gJyc7XG4gICAgICAgICAgICByZXR1cm4gZDtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnRhaW5lci5jYWxsKGNoYXJ0KTtcbiAgICAgIH07XG5cbiAgICAgIC8vIGFkZCBzZXJpZXMgaW5kZXggdG8gZWFjaCBkYXRhIHBvaW50IGZvciByZWZlcmVuY2VcbiAgICAgIGRhdGEuZm9yRWFjaChmdW5jdGlvbihzLCBpKSB7XG4gICAgICAgIHZhciB5ID0gbW9kZWwueSgpO1xuICAgICAgICBzLnNlcmllc0luZGV4ID0gaTtcblxuICAgICAgICBpZiAoIXMudmFsdWUgJiYgIXMudmFsdWVzKSB7XG4gICAgICAgICAgcy52YWx1ZXMgPSBbXTtcbiAgICAgICAgfSBlbHNlIGlmICghaXNOYU4ocy52YWx1ZSkpIHtcbiAgICAgICAgICBzLnZhbHVlcyA9IFt7eDogMCwgeTogcGFyc2VJbnQocy52YWx1ZSwgMTApfV07XG4gICAgICAgIH1cbiAgICAgICAgcy52YWx1ZXMuZm9yRWFjaChmdW5jdGlvbihwLCBqKSB7XG4gICAgICAgICAgcC5pbmRleCA9IGo7XG4gICAgICAgICAgcC5zZXJpZXMgPSBzO1xuICAgICAgICAgIGlmICh0eXBlb2YgcC52YWx1ZSA9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgcC52YWx1ZSA9IHkocCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBzLnZhbHVlID0gcy52YWx1ZSB8fCBkMy5zdW0ocy52YWx1ZXMsIGZ1bmN0aW9uKHApIHsgcmV0dXJuIHAudmFsdWU7IH0pO1xuICAgICAgICBzLmNvdW50ID0gcy5jb3VudCB8fCBzLnZhbHVlcy5sZW5ndGg7XG4gICAgICAgIHMuZGlzYWJsZWQgPSBzLmRpc2FibGVkIHx8IHMudmFsdWUgPT09IDA7XG4gICAgICB9KTtcblxuICAgICAgLy8gb25seSBzdW0gZW5hYmxlZCBzZXJpZXNcbiAgICAgIHZhciBtb2RlbERhdGEgPSBkYXRhLmZpbHRlcihmdW5jdGlvbihkLCBpKSB7IHJldHVybiAhZC5kaXNhYmxlZDsgfSk7XG5cbiAgICAgIGlmICghbW9kZWxEYXRhLmxlbmd0aCkge1xuICAgICAgICBtb2RlbERhdGEgPSBbe3ZhbHVlczogW119XTsgLy8gc2FmZXR5IGFycmF5XG4gICAgICB9XG5cbiAgICAgIHByb3BlcnRpZXMuY291bnQgPSBkMy5zdW0obW9kZWxEYXRhLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLmNvdW50OyB9KTtcblxuICAgICAgcHJvcGVydGllcy50b3RhbCA9IGQzLnN1bShtb2RlbERhdGEsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudmFsdWU7IH0pO1xuXG4gICAgICAvLyBzZXQgdGl0bGUgZGlzcGxheSBvcHRpb25cbiAgICAgIHNob3dUaXRsZSA9IHNob3dUaXRsZSAmJiBwcm9wZXJ0aWVzLnRpdGxlLmxlbmd0aDtcblxuICAgICAgLy9zZXQgc3RhdGUuZGlzYWJsZWRcbiAgICAgIHN0YXRlLmRpc2FibGVkID0gZGF0YS5tYXAoZnVuY3Rpb24oZCkgeyByZXR1cm4gISFkLmRpc2FibGVkOyB9KTtcblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIC8vIERpc3BsYXkgTm8gRGF0YSBtZXNzYWdlIGlmIHRoZXJlJ3Mgbm90aGluZyB0byBzaG93LlxuXG4gICAgICBpZiAoIXByb3BlcnRpZXMudG90YWwpIHtcbiAgICAgICAgZGlzcGxheU5vRGF0YSgpO1xuICAgICAgICByZXR1cm4gY2hhcnQ7XG4gICAgICB9XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAvLyBNYWluIGNoYXJ0IHdyYXBwZXJzXG5cbiAgICAgIHZhciB3cmFwX2JpbmQgPSBjb250YWluZXIuc2VsZWN0QWxsKCdnLnNjLWNoYXJ0LXdyYXAnKS5kYXRhKFttb2RlbERhdGFdKTtcbiAgICAgIHZhciB3cmFwX2VudHIgPSB3cmFwX2JpbmQuZW50ZXIoKS5hcHBlbmQoJ2cnKS5hdHRyKCdjbGFzcycsICdzYy1jaGFydC13cmFwIHNjLWNoYXJ0LScgKyBtb2RlbENsYXNzKTtcbiAgICAgIHZhciB3cmFwID0gY29udGFpbmVyLnNlbGVjdCgnLnNjLWNoYXJ0LXdyYXAnKS5tZXJnZSh3cmFwX2VudHIpO1xuXG4gICAgICB3cmFwX2VudHIuYXBwZW5kKCdyZWN0JykuYXR0cignY2xhc3MnLCAnc2MtYmFja2dyb3VuZCcpXG4gICAgICAgIC5hdHRyKCd4JywgLW1hcmdpbi5sZWZ0KVxuICAgICAgICAuYXR0cigneScsIC1tYXJnaW4udG9wKVxuICAgICAgICAuYXR0cignZmlsbCcsICcjRkZGJyk7XG5cbiAgICAgIHdyYXBfZW50ci5hcHBlbmQoJ2cnKS5hdHRyKCdjbGFzcycsICdzYy10aXRsZS13cmFwJyk7XG4gICAgICB2YXIgdGl0bGVfd3JhcCA9IHdyYXAuc2VsZWN0KCcuc2MtdGl0bGUtd3JhcCcpO1xuXG4gICAgICB3cmFwX2VudHIuYXBwZW5kKCdnJykuYXR0cignY2xhc3MnLCAnc2MtJyArIG1vZGVsQ2xhc3MgKyAnLXdyYXAnKTtcbiAgICAgIHZhciBtb2RlbF93cmFwID0gd3JhcC5zZWxlY3QoJy5zYy0nICsgbW9kZWxDbGFzcyArICctd3JhcCcpO1xuXG4gICAgICB3cmFwX2VudHIuYXBwZW5kKCdnJykuYXR0cignY2xhc3MnLCAnc2MtY29udHJvbHMtd3JhcCcpO1xuICAgICAgdmFyIGNvbnRyb2xzX3dyYXAgPSB3cmFwLnNlbGVjdCgnLnNjLWNvbnRyb2xzLXdyYXAnKTtcbiAgICAgIHdyYXBfZW50ci5hcHBlbmQoJ2cnKS5hdHRyKCdjbGFzcycsICdzYy1sZWdlbmQtd3JhcCcpO1xuICAgICAgdmFyIGxlZ2VuZF93cmFwID0gd3JhcC5zZWxlY3QoJy5zYy1sZWdlbmQtd3JhcCcpO1xuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgLy8gTWFpbiBjaGFydCBkcmF3XG5cbiAgICAgIGNoYXJ0LnJlbmRlciA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIC8vIENoYXJ0IGxheW91dCB2YXJpYWJsZXNcbiAgICAgICAgdmFyIHJlbmRlcldpZHRoLCByZW5kZXJIZWlnaHQsXG4gICAgICAgICAgICBhdmFpbGFibGVXaWR0aCwgYXZhaWxhYmxlSGVpZ2h0LFxuICAgICAgICAgICAgaW5uZXJNYXJnaW4sXG4gICAgICAgICAgICBpbm5lcldpZHRoLCBpbm5lckhlaWdodDtcblxuICAgICAgICBjb250YWluZXJXaWR0aCA9IHBhcnNlSW50KGNvbnRhaW5lci5zdHlsZSgnd2lkdGgnKSwgMTApO1xuICAgICAgICBjb250YWluZXJIZWlnaHQgPSBwYXJzZUludChjb250YWluZXIuc3R5bGUoJ2hlaWdodCcpLCAxMCk7XG5cbiAgICAgICAgcmVuZGVyV2lkdGggPSB3aWR0aCB8fCBjb250YWluZXJXaWR0aCB8fCA5NjA7XG4gICAgICAgIHJlbmRlckhlaWdodCA9IGhlaWdodCB8fCBjb250YWluZXJIZWlnaHQgfHwgNDAwO1xuXG4gICAgICAgIGF2YWlsYWJsZVdpZHRoID0gcmVuZGVyV2lkdGggLSBtYXJnaW4ubGVmdCAtIG1hcmdpbi5yaWdodDtcbiAgICAgICAgYXZhaWxhYmxlSGVpZ2h0ID0gcmVuZGVySGVpZ2h0IC0gbWFyZ2luLnRvcCAtIG1hcmdpbi5ib3R0b207XG5cbiAgICAgICAgaW5uZXJNYXJnaW4gPSB7dG9wOiAwLCByaWdodDogMCwgYm90dG9tOiAwLCBsZWZ0OiAwfTtcbiAgICAgICAgaW5uZXJXaWR0aCA9IGF2YWlsYWJsZVdpZHRoIC0gaW5uZXJNYXJnaW4ubGVmdCAtIGlubmVyTWFyZ2luLnJpZ2h0O1xuICAgICAgICBpbm5lckhlaWdodCA9IGF2YWlsYWJsZUhlaWdodCAtIGlubmVyTWFyZ2luLnRvcCAtIGlubmVyTWFyZ2luLmJvdHRvbTtcblxuICAgICAgICB3cmFwLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIG1hcmdpbi5sZWZ0ICsgJywnICsgbWFyZ2luLnRvcCArICcpJyk7XG4gICAgICAgIHdyYXAuc2VsZWN0KCcuc2MtYmFja2dyb3VuZCcpXG4gICAgICAgICAgLmF0dHIoJ3dpZHRoJywgcmVuZGVyV2lkdGgpXG4gICAgICAgICAgLmF0dHIoJ2hlaWdodCcsIHJlbmRlckhlaWdodCk7XG5cbiAgICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICAgLy8gVGl0bGUgJiBMZWdlbmQgJiBDb250cm9sc1xuXG4gICAgICAgIC8vIEhlYWRlciB2YXJpYWJsZXNcbiAgICAgICAgdmFyIG1heENvbnRyb2xzV2lkdGggPSAwLFxuICAgICAgICAgICAgbWF4TGVnZW5kV2lkdGggPSAwLFxuICAgICAgICAgICAgd2lkdGhSYXRpbyA9IDAsXG4gICAgICAgICAgICBoZWFkZXJIZWlnaHQgPSAwLFxuICAgICAgICAgICAgdGl0bGVCQm94ID0ge3dpZHRoOiAwLCBoZWlnaHQ6IDB9LFxuICAgICAgICAgICAgY29udHJvbHNIZWlnaHQgPSAwLFxuICAgICAgICAgICAgbGVnZW5kSGVpZ2h0ID0gMCxcbiAgICAgICAgICAgIHRyYW5zID0gJyc7XG5cbiAgICAgICAgdGl0bGVfd3JhcC5zZWxlY3QoJy5zYy10aXRsZScpLnJlbW92ZSgpO1xuXG4gICAgICAgIGlmIChzaG93VGl0bGUpIHtcbiAgICAgICAgICB0aXRsZV93cmFwXG4gICAgICAgICAgICAuYXBwZW5kKCd0ZXh0JylcbiAgICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ3NjLXRpdGxlJylcbiAgICAgICAgICAgICAgLmF0dHIoJ3gnLCBkaXJlY3Rpb24gPT09ICdydGwnID8gYXZhaWxhYmxlV2lkdGggOiAwKVxuICAgICAgICAgICAgICAuYXR0cigneScsIDApXG4gICAgICAgICAgICAgIC5hdHRyKCdkeScsICcuNzVlbScpXG4gICAgICAgICAgICAgIC5hdHRyKCd0ZXh0LWFuY2hvcicsICdzdGFydCcpXG4gICAgICAgICAgICAgIC5hdHRyKCdzdHJva2UnLCAnbm9uZScpXG4gICAgICAgICAgICAgIC5hdHRyKCdmaWxsJywgJ2JsYWNrJylcbiAgICAgICAgICAgICAgLnRleHQocHJvcGVydGllcy50aXRsZSk7XG5cbiAgICAgICAgICB0aXRsZUJCb3ggPSB1dGlscy5nZXRUZXh0QkJveCh0aXRsZV93cmFwLnNlbGVjdCgnLnNjLXRpdGxlJykpO1xuICAgICAgICAgIGhlYWRlckhlaWdodCArPSB0aXRsZUJCb3guaGVpZ2h0O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHNob3dMZWdlbmQpIHtcbiAgICAgICAgICBsZWdlbmRcbiAgICAgICAgICAgIC5pZCgnbGVnZW5kXycgKyBjaGFydC5pZCgpKVxuICAgICAgICAgICAgLnN0cmluZ3MoY2hhcnQuc3RyaW5ncygpLmxlZ2VuZClcbiAgICAgICAgICAgIC5hbGlnbignY2VudGVyJylcbiAgICAgICAgICAgIC5oZWlnaHQoYXZhaWxhYmxlSGVpZ2h0IC0gaW5uZXJNYXJnaW4udG9wKTtcbiAgICAgICAgICBsZWdlbmRfd3JhcFxuICAgICAgICAgICAgLmRhdHVtKGRhdGEpXG4gICAgICAgICAgICAuY2FsbChsZWdlbmQpO1xuICAgICAgICAgIGxlZ2VuZFxuICAgICAgICAgICAgLmFycmFuZ2UoYXZhaWxhYmxlV2lkdGgpO1xuXG4gICAgICAgICAgdmFyIGxlZ2VuZExpbmtCQm94ID0gdXRpbHMuZ2V0VGV4dEJCb3gobGVnZW5kX3dyYXAuc2VsZWN0KCcuc2MtbGVnZW5kLWxpbmsnKSksXG4gICAgICAgICAgICAgIGxlZ2VuZFNwYWNlID0gYXZhaWxhYmxlV2lkdGggLSB0aXRsZUJCb3gud2lkdGggLSA2LFxuICAgICAgICAgICAgICBsZWdlbmRUb3AgPSBzaG93VGl0bGUgJiYgbGVnZW5kLmNvbGxhcHNlZCgpICYmIGxlZ2VuZFNwYWNlID4gbGVnZW5kTGlua0JCb3gud2lkdGggPyB0cnVlIDogZmFsc2UsXG4gICAgICAgICAgICAgIHhwb3MgPSBkaXJlY3Rpb24gPT09ICdydGwnIHx8ICFsZWdlbmQuY29sbGFwc2VkKCkgPyAwIDogYXZhaWxhYmxlV2lkdGggLSBsZWdlbmQud2lkdGgoKSxcbiAgICAgICAgICAgICAgeXBvcyA9IHRpdGxlQkJveC5oZWlnaHQ7XG5cbiAgICAgICAgICBpZiAobGVnZW5kVG9wKSB7XG4gICAgICAgICAgICB5cG9zID0gdGl0bGVCQm94LmhlaWdodCAtIGxlZ2VuZC5oZWlnaHQoKSAvIDIgLSBsZWdlbmRMaW5rQkJveC5oZWlnaHQgLyAyO1xuICAgICAgICAgIH0gZWxzZSBpZiAoIXNob3dUaXRsZSkge1xuICAgICAgICAgICAgeXBvcyA9IC0gbGVnZW5kLm1hcmdpbigpLnRvcDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsZWdlbmRfd3JhcFxuICAgICAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIHhwb3MgKyAnLCcgKyB5cG9zICsgJyknKTtcblxuICAgICAgICAgIGxlZ2VuZEhlaWdodCA9IGxlZ2VuZFRvcCA/IDEyIDogbGVnZW5kLmhlaWdodCgpIC0gKHNob3dUaXRsZSA/IDAgOiBsZWdlbmQubWFyZ2luKCkudG9wKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlY2FsYyBpbm5lciBtYXJnaW5zIGJhc2VkIG9uIHRpdGxlIGFuZCBsZWdlbmQgaGVpZ2h0XG4gICAgICAgIGhlYWRlckhlaWdodCArPSBsZWdlbmRIZWlnaHQ7XG4gICAgICAgIGlubmVyTWFyZ2luLnRvcCArPSBoZWFkZXJIZWlnaHQ7XG4gICAgICAgIGlubmVySGVpZ2h0ID0gYXZhaWxhYmxlSGVpZ2h0IC0gaW5uZXJNYXJnaW4udG9wIC0gaW5uZXJNYXJnaW4uYm90dG9tO1xuICAgICAgICBpbm5lcldpZHRoID0gYXZhaWxhYmxlV2lkdGggLSBpbm5lck1hcmdpbi5sZWZ0IC0gaW5uZXJNYXJnaW4ucmlnaHQ7XG5cbiAgICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICAgLy8gTWFpbiBDaGFydCBDb21wb25lbnQocylcblxuICAgICAgICBtb2RlbFxuICAgICAgICAgIC53aWR0aChpbm5lcldpZHRoKVxuICAgICAgICAgIC5oZWlnaHQoaW5uZXJIZWlnaHQpO1xuXG4gICAgICAgIG1vZGVsX3dyYXBcbiAgICAgICAgICAuZGF0dW0obW9kZWxEYXRhKVxuICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyBpbm5lck1hcmdpbi5sZWZ0ICsgJywnICsgaW5uZXJNYXJnaW4udG9wICsgJyknKVxuICAgICAgICAgIC50cmFuc2l0aW9uKCkuZHVyYXRpb24oZHVyYXRpb24pXG4gICAgICAgICAgICAuY2FsbChtb2RlbCk7XG5cbiAgICAgIH07XG5cbiAgICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAgIGNoYXJ0LnJlbmRlcigpO1xuXG4gICAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgLy8gRXZlbnQgSGFuZGxpbmcvRGlzcGF0Y2hpbmcgKGluIGNoYXJ0J3Mgc2NvcGUpXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gICAgICBsZWdlbmQuZGlzcGF0Y2gub24oJ2xlZ2VuZENsaWNrJywgZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICBkLmRpc2FibGVkID0gIWQuZGlzYWJsZWQ7XG4gICAgICAgIGQuYWN0aXZlID0gZmFsc2U7XG5cbiAgICAgICAgLy8gaWYgdGhlcmUgYXJlIG5vIGVuYWJsZWQgZGF0YSBzZXJpZXMsIGVuYWJsZSB0aGVtIGFsbFxuICAgICAgICBpZiAoIWRhdGEuZmlsdGVyKGZ1bmN0aW9uKGQpIHsgcmV0dXJuICFkLmRpc2FibGVkOyB9KS5sZW5ndGgpIHtcbiAgICAgICAgICBkYXRhLm1hcChmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICBkLmRpc2FibGVkID0gZmFsc2U7XG4gICAgICAgICAgICByZXR1cm4gZDtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGlmIHRoZXJlIGFyZSBubyBhY3RpdmUgZGF0YSBzZXJpZXMsIGFjdGl2YXRlIHRoZW0gYWxsXG4gICAgICAgIGlmICghZGF0YS5maWx0ZXIoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5hY3RpdmUgPT09ICdhY3RpdmUnOyB9KS5sZW5ndGgpIHtcbiAgICAgICAgICBkYXRhLm1hcChmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICBkLmFjdGl2ZSA9ICcnO1xuICAgICAgICAgICAgcmV0dXJuIGQ7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBzdGF0ZS5kaXNhYmxlZCA9IGRhdGEubWFwKGZ1bmN0aW9uKGQpIHsgcmV0dXJuICEhZC5kaXNhYmxlZDsgfSk7XG4gICAgICAgIGRpc3BhdGNoLmNhbGwoJ3N0YXRlQ2hhbmdlJywgdGhpcywgc3RhdGUpO1xuXG4gICAgICAgIGNvbnRhaW5lci50cmFuc2l0aW9uKCkuZHVyYXRpb24oZHVyYXRpb24pLmNhbGwoY2hhcnQpO1xuICAgICAgfSk7XG5cbiAgICAgIGRpc3BhdGNoLm9uKCd0b29sdGlwU2hvdycsIGZ1bmN0aW9uKGVvKSB7XG4gICAgICAgIGlmICh0b29sdGlwcykge1xuICAgICAgICAgIHRvb2x0aXAgPSBzaG93VG9vbHRpcChlbywgdGhhdC5wYXJlbnROb2RlLCBwcm9wZXJ0aWVzKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGRpc3BhdGNoLm9uKCd0b29sdGlwTW92ZScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYgKHRvb2x0aXApIHtcbiAgICAgICAgICBzdWNyb3NlLnRvb2x0aXAucG9zaXRpb24odGhhdC5wYXJlbnROb2RlLCB0b29sdGlwLCBlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGRpc3BhdGNoLm9uKCd0b29sdGlwSGlkZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodG9vbHRpcHMpIHtcbiAgICAgICAgICBzdWNyb3NlLnRvb2x0aXAuY2xlYW51cCgpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgLy8gVXBkYXRlIGNoYXJ0IGZyb20gYSBzdGF0ZSBvYmplY3QgcGFzc2VkIHRvIGV2ZW50IGhhbmRsZXJcbiAgICAgIGRpc3BhdGNoLm9uKCdjaGFuZ2VTdGF0ZScsIGZ1bmN0aW9uKGVvKSB7XG4gICAgICAgIGlmICh0eXBlb2YgZW8uZGlzYWJsZWQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgbW9kZWxEYXRhLmZvckVhY2goZnVuY3Rpb24oc2VyaWVzLCBpKSB7XG4gICAgICAgICAgICBzZXJpZXMuZGlzYWJsZWQgPSBlby5kaXNhYmxlZFtpXTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBzdGF0ZS5kaXNhYmxlZCA9IGVvLmRpc2FibGVkO1xuICAgICAgICB9XG5cbiAgICAgICAgY29udGFpbmVyLnRyYW5zaXRpb24oKS5kdXJhdGlvbihkdXJhdGlvbikuY2FsbChjaGFydCk7XG4gICAgICB9KTtcblxuICAgICAgZGlzcGF0Y2gub24oJ2NoYXJ0Q2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgLy9kaXNwYXRjaC5jYWxsKCd0b29sdGlwSGlkZScsIHRoaXMpO1xuICAgICAgICBpZiAoY29udHJvbHMuZW5hYmxlZCgpKSB7XG4gICAgICAgICAgY29udHJvbHMuZGlzcGF0Y2guY2FsbCgnY2xvc2VNZW51JywgdGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxlZ2VuZC5lbmFibGVkKCkpIHtcbiAgICAgICAgICBsZWdlbmQuZGlzcGF0Y2guY2FsbCgnY2xvc2VNZW51JywgdGhpcyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBtb2RlbC5kaXNwYXRjaC5vbignZWxlbWVudENsaWNrJywgZnVuY3Rpb24oZW8pIHtcbiAgICAgICAgZGlzcGF0Y2guY2FsbCgnY2hhcnRDbGljaycsIHRoaXMpO1xuICAgICAgICBzZXJpZXNDbGljayhkYXRhLCBlbywgY2hhcnQpO1xuICAgICAgfSk7XG5cbiAgICB9KTtcblxuICAgIHJldHVybiBjaGFydDtcbiAgfVxuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIEV2ZW50IEhhbmRsaW5nL0Rpc3BhdGNoaW5nIChvdXQgb2YgY2hhcnQncyBzY29wZSlcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBtb2RlbC5kaXNwYXRjaC5vbignZWxlbWVudE1vdXNlb3Zlci50b29sdGlwJywgZnVuY3Rpb24oZW8pIHtcbiAgICBkaXNwYXRjaC5jYWxsKCd0b29sdGlwU2hvdycsIHRoaXMsIGVvKTtcbiAgfSk7XG5cbiAgbW9kZWwuZGlzcGF0Y2gub24oJ2VsZW1lbnRNb3VzZW1vdmUudG9vbHRpcCcsIGZ1bmN0aW9uKGUpIHtcbiAgICBkaXNwYXRjaC5jYWxsKCd0b29sdGlwTW92ZScsIHRoaXMsIGUpO1xuICB9KTtcblxuICBtb2RlbC5kaXNwYXRjaC5vbignZWxlbWVudE1vdXNlb3V0LnRvb2x0aXAnLCBmdW5jdGlvbigpIHtcbiAgICBkaXNwYXRjaC5jYWxsKCd0b29sdGlwSGlkZScsIHRoaXMpO1xuICB9KTtcblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBFeHBvc2UgUHVibGljIFZhcmlhYmxlc1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIGV4cG9zZSBjaGFydCdzIHN1Yi1jb21wb25lbnRzXG4gIGNoYXJ0LmRpc3BhdGNoID0gZGlzcGF0Y2g7XG4gIGNoYXJ0LmZ1bm5lbCA9IGZ1bm5lbDtcbiAgY2hhcnQubGVnZW5kID0gbGVnZW5kO1xuICBjaGFydC5jb250cm9scyA9IGNvbnRyb2xzO1xuXG4gIGZjLnJlYmluZChjaGFydCwgbW9kZWwsICdpZCcsICd4JywgJ3knLCAnY29sb3InLCAnZmlsbCcsICdjbGFzc2VzJywgJ2dyYWRpZW50JywgJ2xvY2FsaXR5JywgJ3RleHR1cmVGaWxsJyk7XG4gIGZjLnJlYmluZChjaGFydCwgbW9kZWwsICdnZXRLZXknLCAnZ2V0VmFsdWUnLCAnZm10S2V5JywgJ2ZtdFZhbHVlJywgJ2ZtdENvdW50Jyk7XG4gIGZjLnJlYmluZChjaGFydCwgZnVubmVsLCAneFNjYWxlJywgJ3lTY2FsZScsICd5RG9tYWluJywgJ2ZvcmNlWScsICd3cmFwTGFiZWxzJywgJ21pbkxhYmVsV2lkdGgnKTtcblxuICBjaGFydC5jb2xvckRhdGEgPSBmdW5jdGlvbihfKSB7XG4gICAgdmFyIHR5cGUgPSBhcmd1bWVudHNbMF0sXG4gICAgICAgIHBhcmFtcyA9IGFyZ3VtZW50c1sxXSB8fCB7fTtcbiAgICB2YXIgY29sb3IgPSBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgcmV0dXJuIHV0aWxzLmRlZmF1bHRDb2xvcigpKGQsIGQuc2VyaWVzSW5kZXgpO1xuICAgICAgICB9O1xuICAgIHZhciBjbGFzc2VzID0gZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICAgIHJldHVybiAnc2Mtc2VyaWVzIHNjLXNlcmllcy0nICsgZC5zZXJpZXNJbmRleDtcbiAgICAgICAgfTtcblxuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgY2FzZSAnZ3JhZHVhdGVkJzpcbiAgICAgICAgY29sb3IgPSBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgcmV0dXJuIGQzLmludGVycG9sYXRlSHNsKGQzLnJnYihwYXJhbXMuYzEpLCBkMy5yZ2IocGFyYW1zLmMyKSkoZC5zZXJpZXNJbmRleCAvIHBhcmFtcy5sKTtcbiAgICAgICAgfTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdjbGFzcyc6XG4gICAgICAgIGNvbG9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuICdpbmhlcml0JztcbiAgICAgICAgfTtcbiAgICAgICAgY2xhc3NlcyA9IGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgICB2YXIgaUNsYXNzID0gKGQuc2VyaWVzSW5kZXggKiAocGFyYW1zLnN0ZXAgfHwgMSkpICUgMTQ7XG4gICAgICAgICAgaUNsYXNzID0gKGlDbGFzcyA+IDkgPyAnJyA6ICcwJykgKyBpQ2xhc3M7XG4gICAgICAgICAgcmV0dXJuICdzYy1zZXJpZXMgc2Mtc2VyaWVzLScgKyBkLnNlcmllc0luZGV4ICsgJyBzYy1maWxsJyArIGlDbGFzcztcbiAgICAgICAgfTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdkYXRhJzpcbiAgICAgICAgY29sb3IgPSBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgcmV0dXJuIHV0aWxzLmRlZmF1bHRDb2xvcigpKGQsIGQuc2VyaWVzSW5kZXgpO1xuICAgICAgICB9O1xuICAgICAgICBjbGFzc2VzID0gZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICAgIHJldHVybiAnc2Mtc2VyaWVzIHNjLXNlcmllcy0nICsgZC5zZXJpZXNJbmRleCArIChkLmNsYXNzZXMgPyAnICcgKyBkLmNsYXNzZXMgOiAnJyk7XG4gICAgICAgIH07XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIHZhciBmaWxsID0gKCFwYXJhbXMuZ3JhZGllbnQpID8gY29sb3IgOiBmdW5jdGlvbihkLCBpKSB7XG4gICAgICB2YXIgcCA9IHtvcmllbnRhdGlvbjogcGFyYW1zLm9yaWVudGF0aW9uIHx8ICd2ZXJ0aWNhbCcsIHBvc2l0aW9uOiBwYXJhbXMucG9zaXRpb24gfHwgJ21pZGRsZSd9O1xuICAgICAgcmV0dXJuIG1vZGVsLmdyYWRpZW50KGQsIGQuc2VyaWVzSW5kZXgsIHApO1xuICAgIH07XG5cbiAgICBtb2RlbC5jb2xvcihjb2xvcik7XG4gICAgbW9kZWwuZmlsbChmaWxsKTtcbiAgICBtb2RlbC5jbGFzc2VzKGNsYXNzZXMpO1xuXG4gICAgbGVnZW5kLmNvbG9yKGNvbG9yKTtcbiAgICBsZWdlbmQuY2xhc3NlcyhjbGFzc2VzKTtcblxuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5tYXJnaW4gPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7IHJldHVybiBtYXJnaW47IH1cbiAgICBmb3IgKHZhciBwcm9wIGluIF8pIHtcbiAgICAgIGlmIChfLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICAgIG1hcmdpbltwcm9wXSA9IF9bcHJvcF07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC53aWR0aCA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHsgcmV0dXJuIHdpZHRoOyB9XG4gICAgd2lkdGggPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5oZWlnaHQgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7IHJldHVybiBoZWlnaHQ7IH1cbiAgICBoZWlnaHQgPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5zaG93VGl0bGUgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7IHJldHVybiBzaG93VGl0bGU7IH1cbiAgICBzaG93VGl0bGUgPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5zaG93Q29udHJvbHMgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7IHJldHVybiBzaG93Q29udHJvbHM7IH1cbiAgICBzaG93Q29udHJvbHMgPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5zaG93TGVnZW5kID0gZnVuY3Rpb24oXykge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgeyByZXR1cm4gc2hvd0xlZ2VuZDsgfVxuICAgIHNob3dMZWdlbmQgPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC50b29sdGlwID0gZnVuY3Rpb24oXykge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgeyByZXR1cm4gdG9vbHRpcDsgfVxuICAgIHRvb2x0aXAgPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC50b29sdGlwcyA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHsgcmV0dXJuIHRvb2x0aXBzOyB9XG4gICAgdG9vbHRpcHMgPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC50b29sdGlwQ29udGVudCA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHsgcmV0dXJuIHRvb2x0aXBDb250ZW50OyB9XG4gICAgdG9vbHRpcENvbnRlbnQgPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5zdGF0ZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHsgcmV0dXJuIHN0YXRlOyB9XG4gICAgc3RhdGUgPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5zdHJpbmdzID0gZnVuY3Rpb24oXykge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgeyByZXR1cm4gc3RyaW5nczsgfVxuICAgIGZvciAodmFyIHByb3AgaW4gXykge1xuICAgICAgaWYgKF8uaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgc3RyaW5nc1twcm9wXSA9IF9bcHJvcF07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5kaXJlY3Rpb24gPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7IHJldHVybiBkaXJlY3Rpb247IH1cbiAgICBkaXJlY3Rpb24gPSBfO1xuICAgIG1vZGVsLmRpcmVjdGlvbihfKTtcbiAgICBsZWdlbmQuZGlyZWN0aW9uKF8pO1xuICAgIGNvbnRyb2xzLmRpcmVjdGlvbihfKTtcbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQuZHVyYXRpb24gPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7IHJldHVybiBkdXJhdGlvbjsgfVxuICAgIGR1cmF0aW9uID0gXztcbiAgICBtb2RlbC5kdXJhdGlvbihfKTtcbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQuZGVsYXkgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7IHJldHVybiBkZWxheTsgfVxuICAgIGRlbGF5ID0gXztcbiAgICBtb2RlbC5kZWxheShfKTtcbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQuc2VyaWVzQ2xpY2sgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gc2VyaWVzQ2xpY2s7XG4gICAgfVxuICAgIHNlcmllc0NsaWNrID0gXztcbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQuY29sb3JGaWxsID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gIHJldHVybiBjaGFydDtcbn1cbiIsImltcG9ydCBkMyBmcm9tICdkMyc7IC8vd2l0aG91dCB0aGlzIHJvbGx1cCBkb2VzIHNvbWV0aGluZyBmdW5reSB0byBkMyBnbG9iYWxcbmltcG9ydCAqIGFzIGZjIGZyb20gJ2QzZmMtcmViaW5kJztcblxudmFyIHZlciA9IFwiMC4wLjJcIjsgLy9jaGFuZ2UgdG8gMC4wLjMgd2hlbiByZWFkeVxuZXhwb3J0IHt2ZXIgYXMgdmVyc2lvbn07XG52YXIgZGV2ID0gZmFsc2U7IC8vc2V0IGZhbHNlIHdoZW4gaW4gcHJvZHVjdGlvblxuZXhwb3J0IHtkZXYgYXMgZGV2ZWxvcG1lbnR9O1xuXG5leHBvcnQgKiBmcm9tICdkM2ZjLXJlYmluZCc7XG5leHBvcnQge2RlZmF1bHQgYXMgdXRpbHN9IGZyb20gJy4vdXRpbHMuanMnO1xuZXhwb3J0IHtkZWZhdWx0IGFzIGxlZ2VuZH0gZnJvbSAnLi9tb2RlbHMvbGVnZW5kLmpzJztcbmV4cG9ydCB7ZGVmYXVsdCBhcyBmdW5uZWx9IGZyb20gJy4vbW9kZWxzL2Z1bm5lbC5qcyc7XG5leHBvcnQge2RlZmF1bHQgYXMgZnVubmVsQ2hhcnR9IGZyb20gJy4vbW9kZWxzL2Z1bm5lbENoYXJ0LmpzJztcbnZhciBhc2RmID0gZDMuc2VsZWN0KCdkaXYnKTtcbiJdLCJuYW1lcyI6WyJkMyIsImZ1bm5lbCIsImxlZ2VuZCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQSxlQUFlLENBQUMsYUFBYTtJQUN6QixhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsVUFBVTtRQUN6QixPQUFPLFVBQVUsS0FBSyxRQUFRLEdBQUcsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVTtLQUM5RSxDQUFDOztBQ0ROLGNBQWUsQ0FBQyxHQUFHLFVBQVUsS0FBSztJQUM5QixVQUFVLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ2xDLE9BQU8sQ0FBQyxJQUFJO01BQ1YsVUFBVSxD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QUUsSUFBSSxFQUFFO1FBQ3ZDLEVBQUUsUUFBUSxFQUFFLElBQUksR0FBRyxZQUFZLEVBQUVBLElBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFLEdBQUcsY0FBYyxFQUFFLENBQUMsRUFBRTtRQUNwRixFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFQSxJQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLGNBQWMsRUFBRSxDQUFDLEVBQUU7UUFDMUUsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRUEsSUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxjQUFjLEVBQUUsQ0FBQyxFQUFFO1FBQ3JGLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUVBLElBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsY0FBYyxFQUFFLENBQUMsRUFBRTtRQUMxRSxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsWUFBWSxFQUFFQSxJQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFBRSxHQUFHLGNBQWMsRUFBRSxDQUFDLEVBQUU7T0FDckYsQ0FBQyxDQUFDO0tBQ0o7O0lBRUQ7TUFDRSxLQUFLLENBQUMsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUU7UUFDdkMsRUFBRSxRQUFRLEVBQUUsSUFBSSxHQUFHLFlBQVksRUFBRUEsSUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxjQUFjLEVBQUUsQ0FBQyxFQUFFO1FBQ3BGLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUVBLElBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFD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
