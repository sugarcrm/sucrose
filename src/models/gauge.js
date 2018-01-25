import d3 from 'd3';
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
