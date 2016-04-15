
sucrose.models.stackedArea = function () {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 960,
      height = 500,
      getX = function (d) { return d.x; }, // accessor to get the x value from a data point
      getY = function (d) { return d.y; }, // accessor to get the y value from a data point
      locality = sucrose.utils.buildLocality(),
      style = 'stack',
      offset = 'zero',
      order = 'default',
      interpolate = 'linear',  // controls the line interpolation
      clipEdge = false, // if true, masks lines within x and y scale
      x, //can be accessed via chart.xScale()
      y, //can be accessed via chart.yScale()
      delay = 200,
      scatter = sucrose.models.scatter(),
      color = function (d, i) { return sucrose.utils.defaultColor()(d, d.series); },
      fill = color,
      classes = function (d,i) { return 'sc-area sc-area-' + d.series; },
      dispatch =  d3.dispatch('tooltipShow', 'tooltipHide', 'tooltipMove', 'areaClick', 'areaMouseover', 'areaMouseout', 'areaMousemove');

  scatter
    .size(2.2) // default size
    .sizeDomain([2.2]); // all the same size by default

  /************************************
   * offset:
   *   'wiggle' (stream)
   *   'zero' (stacked)
   *   'expand' (normalize to 100%)
   *   'silhouette' (simple centered)
   *
   * order:
   *   'inside-out' (stream)
   *   'default' (input order)
   ************************************/

  //============================================================


  function chart(selection) {
    selection.each(function (data) {
      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          container = d3.select(this);

      //------------------------------------------------------------
      // Setup Scales

      x = scatter.xScale();
      y = scatter.yScale();

      //------------------------------------------------------------


      // Injecting point index into each point because d3.layout.stack().out does not give index
      // ***Also storing getY(d,i) as stackedY so that it can be set to 0 if series is disabled
      data = data.map(function (aseries, i) {
        aseries.values = aseries.values.map(function (d, j) {
          d.index = j;
          d.stackedY = aseries.disabled ? 0 : getY(d, j);
          return d;
        });
        return aseries;
      });


      data = d3.layout.stack()
        .order(order)
        .offset(offset)
        .values(function (d) { return d.values; })  //TODO: make values customizeable in EVERY model in this fashion
        .x(getX)
        .y(function (d) { return d.stackedY; })
        .out(function (d, y0, y) {
          d.display = {
            y: y,
            y0: y0
          };
        })(data);


      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = container.selectAll('g.sc-wrap.sc-stackedarea').data([data]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'sucrose sc-wrap sc-stackedarea');
      var defsEnter = wrapEnter.append('defs');
      var gEnter = wrapEnter.append('g');
      var g = wrap.select('g');

      //set up the gradient constructor function
      chart.gradient = function (d, i, p) {
        return sucrose.utils.colorLinearGradient( d, chart.id() + '-' + i, p, color(d, i), wrap.select('defs') );
      };

      gEnter.append('g').attr('class', 'sc-areaWrap');
      gEnter.append('g').attr('class', 'sc-scatterWrap');

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      //------------------------------------------------------------

      scatter
        .width(availableWidth)
        .height(availableHeight)
        .x(getX)
        .y(function (d) { return d.display.y + d.display.y0; })
        .forceY([0]);


      var scatterWrap = g.select('.sc-scatterWrap')
          .datum(data.filter(function (d) { return !d.disabled; }));

      //d3.transition(scatterWrap).call(scatter);
      scatterWrap.call(scatter);


      defsEnter.append('clipPath')
          .attr('id', 'sc-edge-clip-' + chart.id())
        .append('rect');

      wrap.select('#sc-edge-clip-' + chart.id() + ' rect')
          .attr('width', availableWidth)
          .attr('height', availableHeight);

      g   .attr('clip-path', clipEdge ? 'url(#sc-edge-clip-' + chart.id() + ')' : '');


      var area = d3.svg.area()
          .x(function (d, i)  { return x(getX(d, i)); })
          .y0(function (d) { return y(d.display.y0); })
          .y1(function (d) { return y(d.display.y + d.display.y0); })
          .interpolate(interpolate);

      var zeroArea = d3.svg.area()
          .x(function (d, i) { return x(getX(d, i)); })
          .y0(function (d) { return y(d.display.y0); })
          .y1(function (d) { return y(d.display.y0); });


      var path = g.select('.sc-areaWrap').selectAll('path.sc-area')
          .data(data);

      path.enter().append('path')
          .on('mouseover', function (d, i) {
            d3.select(this).classed('hover', true);
            dispatch.areaMouseover({
              point: d,
              series: d.key,
              seriesIndex: i,
              e: d3.event
            });
            g.select('.sc-chart-' + chart.id() + ' .sc-area-' + i).classed('hover', true);
          })
          .on('mouseout', function (d, i) {
            d3.select(this).classed('hover', false);
            dispatch.areaMouseout({
              point: d,
              series: d.key,
              seriesIndex: i,
              e: d3.event
            });
            g.select('.sc-chart-' + chart.id() + ' .sc-area-' + i).classed('hover', false);
          })
          .on('mousemove', function (d, i) {
            dispatch.areaMousemove(d3.event);
          })
          .on('click', function (d, i) {
            d3.select(this).classed('hover', false);
            dispatch.areaClick({
              point: d,
              series: d.key,
              seriesIndex: i,
              e: d3.event
            });
          });
      //d3.transition(path.exit())
      path.exit()
          .attr('d', function (d, i) { return zeroArea(d.values, i); })
          .remove();
      path
          .attr('class', classes)
          .attr('fill', color)
          .attr('stroke', color);
      //d3.transition(path)
      path
          .attr('d', function (d, i) { return area(d.values, i); });


      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      scatter.dispatch.on('elementMouseover.area', function (e) {
        g.select('.sc-chart-' + chart.id() + ' .sc-area-' + e.seriesIndex).classed('hover', true);
      });
      scatter.dispatch.on('elementMouseout.area', function (e) {
        g.select('.sc-chart-' + chart.id() + ' .sc-area-' + e.seriesIndex).classed('hover', false);
      });
      scatter.dispatch.on('elementClick.area', function (e) {
        dispatch.areaClick(e);
      });

      //============================================================

    });

    return chart;
  }


  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  scatter.dispatch.on('elementMouseover.tooltip', function (e) {
    e.pos = [e.pos[0] + margin.left, e.pos[1] + margin.top];
    dispatch.tooltipShow(e);
  });
  scatter.dispatch.on('elementMouseout.tooltip', function (e) {
    dispatch.tooltipHide(e);
  });

  //============================================================


  //============================================================
  // Global getters and setters
  //------------------------------------------------------------

  chart.dispatch = dispatch;
  chart.scatter = scatter;

  d3.rebind(chart, scatter, 'interactive', 'size', 'id', 'xScale', 'yScale', 'zScale', 'xDomain', 'yDomain', 'sizeDomain', 'forceX', 'forceY', 'forceSize', 'clipVoronoi', 'useVoronoi', 'clipRadius', 'locality');

  chart.color = function (_) {
    if (!arguments.length) { return color; }
    color = _;
    scatter.color(color);
    return chart;
  };
  chart.fill = function (_) {
    if (!arguments.length) { return fill; }
    fill = _;
    scatter.fill(fill);
    return chart;
  };
  chart.classes = function (_) {
    if (!arguments.length) { return classes; }
    classes = _;
    scatter.classes(classes);
    return chart;
  };
  chart.gradient = function (_) {
    if (!arguments.length) { return gradient; }
    gradient = _;
    return chart;
  };

  chart.margin = function (_) {
    if (!arguments.length) { return margin; }
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
    return chart;
  };

  chart.width = function (_) {
    if (!arguments.length) { return width; }
    width = _;
    return chart;
  };

  chart.height = function (_) {
    if (!arguments.length) { return height; }
    height = _;
    return chart;
  };

  chart.x = function (_) {
    if (!arguments.length) { return getX; }
    getX = _;
    scatter.x(_);
    return chart;
  };

  chart.y = function (_) {
    if (!arguments.length) { return getY; }
    getY = _;
    scatter.y(_);
    return chart;
  };

  chart.delay = function (_) {
    if (!arguments.length) { return delay; }
    delay = _;
    return chart;
  };

  chart.clipEdge = function (_) {
    if (!arguments.length) { return clipEdge; }
    clipEdge = _;
    return chart;
  };

  chart.offset = function (_) {
    if (!arguments.length) { return offset; }
    offset = _;
    return chart;
  };

  chart.order = function (_) {
    if (!arguments.length) { return order; }
    order = _;
    return chart;
  };

  //shortcut for offset + order
  chart.style = function (_) {
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

  chart.interpolate = function (_) {
    if (!arguments.length) { return interpolate; }
    interpolate = _;
    return interpolate;
  };

  chart.locality = function(_) {
    if (!arguments.length) {
      return locality;
    }
    locality = sucrose.utils.buildLocality(_);
    return chart;
  };

  //============================================================

  return chart;
};
