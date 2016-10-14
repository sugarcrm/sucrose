sucrose.models.stackedArea = function () {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  // var scatter = sucrose.models.scatter();

  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 960,
      height = 500,
      getX = function (d) { return d.x; }, // accessor to get the x value from a data point
      getY = function (d) { return d.y; }, // accessor to get the y value from a data point
      id = Math.floor(Math.random() * 100000), //Create semi-unique ID incase user doesn't select one
      style = 'stack',
      offset = 'zero',
      order = 'default',
      interpolate = 'linear',  // controls the line interpolation
      x = d3.scaleLinear(), //can be accessed via chart.xScale()
      y = d3.scaleLinear(), //can be accessed via chart.yScale()
      clipEdge = false, // if true, masks lines within x and y scale
      delay = 0, // transition
      duration = 300, // transition
      locality = sucrose.utils.buildLocality(),
      interactive = true, // If true, plots a voronoi overlay for advanced point intersection
      xDomain = null, // Override x domain (skips the calculation from data)
      yDomain = null, // Override y domain
      color = function (d, i) {
        return sucrose.utils.defaultColor()(d, d.seriesIndex || i);
      },
      fill = color,
      classes = function (d, i) { return 'sc-area sc-series-' + (d.seriesIndex || i); },
      dispatch =  d3.dispatch('tooltipShow', 'tooltipHide', 'tooltipMove', 'areaClick', 'areaMouseover', 'areaMouseout', 'areaMousemove');

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

  //============================================================

  function chart(selection) {
    selection.each(function (chartData) {
      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          container = d3.select(this);

      var stackOffset = [d3.stackOffsetNone, d3.stackOffsetWiggle, d3.stackOffsetExpand, d3.stackOffsetSilhouette]
                       [['zero', 'wiggle', 'expand', 'silhouette'].indexOf(offset)];

      var stackOrder = [d3.stackOrderNone, d3.stackOrderInsideOut]
                       [['default', 'inside-out'].indexOf(order)];

      var stack = d3.stack()
                    .offset(stackOffset)
                    .order(stackOrder)
                    .value(function(d, k) { return d[k]; });

      var t = d3.transition('area')
            .duration(duration)
            .ease(d3.easeLinear);

      var area = d3.area()
            .x(function(d) { return x(d.data.date); })
            .y0(function(d) { return y(d[0]); })
            .y1(function(d) { return y(d[1]); })
            // .interpolate(interpolate);

      var zeroArea = d3.area()
            .x(function (d, i) { return x(d.data.date); })
            .y0(function (d) { return y(d[0]); })
            .y1(function (d) { return y(d[0]); });

      //set up the gradient constructor function
      chart.gradient = function (d, i, p) {
        return sucrose.utils.colorLinearGradient( d, chart.id() + '-' + i, p, color(d, i), wrap.select('defs') );
      };

      //------------------------------------------------------------

      var indexedData = {};
      var keys = [];
      var keyIndices = [];

      // insert values at keys
      chartData.forEach(function(s, i) {
        if (s.disabled !== false) {
          keys.push(s.key);
          keyIndices.push(i);
        }
        s.values.forEach(function(a, b) {
          var x = a[0];
          var y = s.disabled === false ? 0 : a[1];
          if (!indexedData[x]) {
            indexedData[x] = [];
          }
          indexedData[x].push(y);
          indexedData[x].index = b;
          indexedData[x].date = x;
        });
      });

      var dates = d3.keys(indexedData)
                    .map(function(d) { return parseInt(d, 10); });

      var data = stack.keys(d3.range(0, keys.length))
                    (d3.values(indexedData));
      // var data = d3.stack()
            // .x(getX)
            // .y(function (d) { return d.stackedY; })
            // .out(function (d, y0, y) {
            //   d.display = {
            //     y: y,
            //     y0: y0
            //   };
            // })

      //this only works for default stack
      var max = d3.max(data.slice(-1)[0], function(d) { return d[1]; });

      //------------------------------------------------------------
      // Setup Scales

      x.domain(d3.extent(dates)).range([0, availableWidth]);
      y.domain([0, max]).range([availableHeight, 0]);

      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap_bind = container.selectAll('g.sc-wrap.sc-stackedarea').data([data]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-wrap sc-stackedarea');
      var wrap = container.select('.sc-wrap').merge(wrap_entr);
      var defs_entr = wrap_entr.append('defs');
      var g_entr = wrap_entr.append('g').attr('class', 'sc-clip-wrap');
      var g = container.select('g.sc-clip-wrap').merge(g_entr);

      g_entr.append('g').attr('class', 'sc-groups');
      var groups_wrap = wrap.select('.sc-groups');

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      //------------------------------------------------------------

      defs_entr.append('clipPath')
        .attr('id', 'sc-edge-clip-' + id)
          .append('rect');

      wrap.select('#sc-edge-clip-' + id + ' rect')
          .attr('width', availableWidth)
          .attr('height', availableHeight);

      g.attr('clip-path', clipEdge ? 'url(#sc-edge-clip-' + id + ')' : '');

      //------------------------------------------------------------
      // Areas

      var areas_bind = groups_wrap.selectAll('path.sc-area').data(data);
      var areas_entr = areas_bind.enter().append('path').attr('class', 'sc-area sc-enter');
      var areas = groups_wrap.selectAll('.sc-area').merge(areas_entr);

      areas_bind.exit()
          .attr('d', zeroArea)
          .remove();
      areas
          .attr('class', classes)
          .attr('fill', color)
          .attr('stroke', color);
      areas
          .attr('d', area);

      function buildEventObject(e, d, i) {
        return {
            points: d,
            seriesKey: keys[d.key],
            seriesIndex: d.index,
            e: e
          };
      }

      areas
        .on('mouseover', function (d, i) {
          var eo = buildEventObject(d3.event, d, i);
          d3.select(this).classed('hover', true);
          dispatch.call('areaMouseover', this, eo);
          d3.select(this).classed('hover', true);
        })
        .on('mousemove', function(d, i) {
          var eo = buildEventObject(d3.event, d, i);
          var rect = wrap.select('#sc-edge-clip-' + id + ' rect').node().getBoundingClientRect();
          var xpos = d3.event.clientX - rect.left;
          var index = Math.round((xpos * dates.length) / availableWidth) - 1;
          eo.data = data.map(function(d,i) {
            var point = [d[index].data.date, d[index][1]];
            point.seriesKey = keys[i];
            point.seriesIndex = i;
            return point;
          });
          eo.origin = rect;
          dispatch.call('areaMousemove', this, eo);
        })
        .on('mouseout', function(d, i) {
          dispatch.call('areaMouseout', this);
          d3.select(this).classed('hover', false);
        })
        .on('click', function (d, i) {
          var eo = buildEventObject(d3.event, d, i);
          d3.event.stopPropagation();
          d3.select(this).classed('hover', false);
          dispatch.call('areaClick', this, eo);
        });

    });

    return chart;
  }

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;

  chart.id = function(_) {
    if (!arguments.length) return id;
    id = _;
    return chart;
  };

  chart.color = function (_) {
    if (!arguments.length) { return color; }
    color = _;
    return chart;
  };
  chart.fill = function (_) {
    if (!arguments.length) { return fill; }
    fill = _;
    return chart;
  };
  chart.classes = function (_) {
    if (!arguments.length) { return classes; }
    classes = _;
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
    return chart;
  };

  chart.y = function (_) {
    if (!arguments.length) { return getY; }
    getY = _;
    return chart;
  };

  chart.xScale = function(_) {
    if (!arguments.length) return x;
    x = _;
    return chart;
  };

  chart.yScale = function(_) {
    if (!arguments.length) return y;
    y = _;
    return chart;
  };

  chart.xDomain = function(_) {
    if (!arguments.length) return xDomain;
    xDomain = _;
    return chart;
  };

  chart.yDomain = function(_) {
    if (!arguments.length) return yDomain;
    yDomain = _;
    return chart;
  };

  chart.forceX = function(_) {
    if (!arguments.length) return forceX;
    forceX = _;
    return chart;
  };

  chart.forceY = function(_) {
    if (!arguments.length) return forceY;
    forceY = _;
    return chart;
  };

  chart.interactive = function(_) {
    if (!arguments.length) return interactive;
    interactive = _;
    return chart;
  };

  chart.delay = function (_) {
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

  chart.clipEdge = function (_) {
    if (!arguments.length) { return clipEdge; }
    clipEdge = _;
    return chart;
  };

  chart.interpolate = function (_) {
    if (!arguments.length) { return interpolate; }
    interpolate = _;
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
