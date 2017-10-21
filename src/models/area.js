import d3 from 'd3';
import utility from '../utility.js';

export default function area() {

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
