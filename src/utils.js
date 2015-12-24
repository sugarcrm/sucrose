
sucrose.utils.windowSize = function () {
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
// sucrose.utils.windowResize = function (fun)
// {
//   var oldresize = window.onresize;

//   window.onresize = function (e) {
//     if (typeof oldresize == 'function') oldresize(e);
//     fun(e);
//   }
// }

sucrose.utils.windowResize = function (fun) {
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

sucrose.utils.windowUnResize = function (fun) {
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

sucrose.utils.resizeOnPrint = function (fn) {
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

sucrose.utils.unResizeOnPrint = function (fn) {
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
sucrose.utils.getColor = function (color) {
    if (!arguments.length) { return sucrose.utils.defaultColor(); } //if you pass in nothing, get default colors back

    if (Object.prototype.toString.call( color ) === '[object Array]') {
        return function (d, i) { return d.color || color[i % color.length]; };
    } else {
        return color;
        //can't really help it if someone passes rubbish as color
    }
};

// Default color chooser uses the index of an object as before.
sucrose.utils.defaultColor = function () {
    var colors = d3.scale.category20().range();
    return function (d, i) {
      return d.color || colors[i % colors.length];
    };
};


// Returns a color function that takes the result of 'getKey' for each series and
// looks for a corresponding color from the dictionary,
sucrose.utils.customTheme = function (dictionary, getKey, defaultColors) {
  getKey = getKey || function (series) { return series.key; }; // use default series.key if getKey is undefined
  defaultColors = defaultColors || d3.scale.category20().range(); //default color function

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
sucrose.utils.pjax = function (links, content) {
  d3.selectAll(links).on("click", function () {
    history.pushState(this.href, this.textContent, this.href);
    load(this.href);
    d3.event.preventDefault();
  });

  function load(href) {
    d3.html(href, function (fragment) {
      var target = d3.select(content).node();
      target.parentNode.replaceChild(d3.select(fragment).select(content).node(), target);
      sucrose.utils.pjax(links, content);
    });
  }

  d3.select(window).on("popstate", function () {
    if (d3.event.state) { load(d3.event.state); }
  });
};

/* Numbers that are undefined, null or NaN, convert them to zeros.
*/
sucrose.utils.NaNtoZero = function(n) {
    if (typeof n !== 'number'
        || isNaN(n)
        || n === null
        || n === Infinity) return 0;

    return n;
};

/*
Snippet of code you can insert into each sucrose.models.* to give you the ability to
do things like:
chart.options({
  showXAxis: true,
  tooltips: true
});

To enable in the chart:
chart.options = sucrose.utils.optionsFunc.bind(chart);
*/
sucrose.utils.optionsFunc = function(args) {
    if (args) {
      d3.map(args).forEach((function(key,value) {
        if (typeof this[key] === "function") {
           this[key](value);
        }
      }).bind(this));
    }
    return this;
};



//SUGAR ADDITIONS

//gradient color
sucrose.utils.colorLinearGradient = function (d, i, p, c, defs) {
  var id = 'lg_gradient_' + i
    , grad = defs.select('#' + id);
  if ( grad.empty() ) {
    if (p.position === 'middle')
    {
      sucrose.utils.createLinearGradient( id, p, defs, [
        { 'offset': '0%',  'stop-color': d3.rgb(c).darker().toString(),  'stop-opacity': 1 },
        { 'offset': '20%', 'stop-color': d3.rgb(c).toString(), 'stop-opacity': 1 },
        { 'offset': '50%', 'stop-color': d3.rgb(c).brighter().toString(), 'stop-opacity': 1 },
        { 'offset': '80%', 'stop-color': d3.rgb(c).toString(), 'stop-opacity': 1 },
        { 'offset': '100%','stop-color': d3.rgb(c).darker().toString(),  'stop-opacity': 1 }
      ]);
    }
    else
    {
      sucrose.utils.createLinearGradient( id, p, defs, [
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
sucrose.utils.createLinearGradient = function (id, params, defs, stops) {
  var x2 = params.orientation === 'horizontal' ? '0%' : '100%'
    , y2 = params.orientation === 'horizontal' ? '100%' : '0%'
    , grad = defs.append('linearGradient')
        .attr('id', id)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', x2 )
        .attr('y2', y2 )
        //.attr('gradientUnits', 'userSpaceOnUse')objectBoundingBox
        .attr('spreadMethod', 'pad');
  for (var i=0; i<stops.length; i+=1)
  {
    var attrs = stops[i]
      , stop = grad.append('stop');
    for (var a in attrs)
    {
      if ( attrs.hasOwnProperty(a) ) {
        stop.attr(a, attrs[a]);
      }
    }
  }
};

sucrose.utils.colorRadialGradient = function (d, i, p, c, defs) {
  var id = 'rg_gradient_' + i
    , grad = defs.select('#' + id);
  if ( grad.empty() )
  {
    sucrose.utils.createRadialGradient( id, p, defs, [
      { 'offset': p.s, 'stop-color': d3.rgb(c).brighter().toString(), 'stop-opacity': 1 },
      { 'offset': '100%','stop-color': d3.rgb(c).darker().toString(), 'stop-opacity': 1 }
    ]);
  }
  return 'url(#' + id + ')';
};

sucrose.utils.createRadialGradient = function (id, params, defs, stops) {
  var grad = defs.append('radialGradient')
        .attr('id', id)
        .attr('r', params.r)
        .attr('cx', params.x)
        .attr('cy', params.y)
        .attr('gradientUnits', params.u)
        .attr('spreadMethod', 'pad');
  for (var i=0; i<stops.length; i+=1) {
    var attrs = stops[i]
      , stop = grad.append('stop');
    for (var a in attrs)
    {
      if ( attrs.hasOwnProperty(a) ) {
        stop.attr(a, attrs[a]);
      }
    }
  }
};

sucrose.utils.getAbsoluteXY = function (element) {
  var viewportElement = document.documentElement
    , box = element.getBoundingClientRect()
    , scrollLeft = viewportElement.scrollLeft + document.body.scrollLeft
    , scrollTop = viewportElement.scrollTop + document.body.scrollTop
    , x = box.left + scrollLeft
    , y = box.top + scrollTop;

  return {'left': x, 'top': y};
};

// Creates a rectangle with rounded corners
sucrose.utils.roundedRectangle = function (x, y, width, height, radius) {
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

sucrose.utils.dropShadow = function (id, defs, options) {
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

sucrose.utils.stringSetLengths = function(_data, _container, _format, classes, styles) {
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

sucrose.utils.stringSetThickness = function(_data, _container, _format, classes, styles) {
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

sucrose.utils.maxStringSetLength = function(_data, _container, _format) {
  var lengths = sucrose.utils.stringSetLengths(_data, _container, _format);
  return d3.max(lengths);
};

sucrose.utils.stringEllipsify = function(_string, _container, _length) {
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
  txt.text('').style('display', 'none');
  return str + (strLen > _length ? '...' : '');
};

sucrose.utils.getTextBBox = function(text, floats) {
  var bbox = text.node().getBoundingClientRect(),
      size = {
        width: floats ? bbox.width : parseInt(bbox.width, 10),
        height: floats ? bbox.height : parseInt(bbox.height, 10)
      };
  return size;
};

sucrose.utils.getTextContrast = function(c, i, callback) {
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

sucrose.utils.isRTLChar = function(c) {
  var rtlChars_ = '\u0591-\u07FF\uFB1D-\uFDFF\uFE70-\uFEFC',
      rtlCharReg_ = new RegExp('[' + rtlChars_ + ']');
  return rtlCharReg_.test(c);
};

sucrose.utils.polarToCartesian = function(centerX, centerY, radius, angleInDegrees) {
  var angleInRadians = sucrose.utils.angleToRadians(angleInDegrees);
  var x = centerX + radius * Math.cos(angleInRadians);
  var y = centerY + radius * Math.sin(angleInRadians);
  return [x, y];
};

sucrose.utils.angleToRadians = function(angleInDegrees) {
  return angleInDegrees * Math.PI / 180.0;
};

sucrose.utils.angleToDegrees = function(angleInRadians) {
  return angleInRadians * 180.0 / Math.PI;
};

sucrose.utils.isValidDate = function(d) {
  if (!d) {
    return false;
  }
  var testDate = new Date(d);
  return testDate instanceof Date && !isNaN(testDate.valueOf());
};

sucrose.utils.createTexture = function(defs, id, x, y) {
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
