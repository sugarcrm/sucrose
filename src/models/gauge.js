import d3 from 'd3v4';
import utility from '../utility.js';

export default function gauge() {
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
