import d3 from 'd3v4';
import fc from 'd3fc-rebind';
import utility from '../utility.js';

export default function stackearea() {

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
