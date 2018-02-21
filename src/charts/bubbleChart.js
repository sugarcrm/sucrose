import d3 from 'd3';
import utility from '../utility.js';
import tooltip from '../tooltip.js';
import language from '../language.js';
import headers from '../models/headers.js';
import scatter from '../models/scatter.js';
import axis from '../models/axis.js';

export default function bubbleChart() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 10, right: 10, bottom: 10, left: 10},
      width = null,
      height = null,
      direction = 'ltr',
      delay = 0,
      duration = 0,
      tooltips = true,
      state = {},
      strings = language();

  var dispatch = d3.dispatch(
        'chartClick', 'elementClick', 'tooltipShow', 'tooltipHide', 'tooltipMove',
        'stateChange', 'changeState'
      );

  var getX = function(d) { return d.x; },
      getY = function(d) { return d.y; },
      forceY = [0]; // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do chart.forceY([]) to remove

  var groupBy = function(d) { return d.y; },
      filterBy = function(d) { return d.y; };

  var xValueFormat = function(d, i, label, isDate, dateFormat) {
        // If ordinal, label is provided so use it.
        // If date or numeric use d.
        var value = label || d;
        if (isDate) {
          dateFormat = !dateFormat || dateFormat.indexOf('%') !== 0 ? 'MM' : dateFormat;
          return utility.dateFormat(value, dateFormat, chart.locality());
        } else {
          return value;
        }
      };

  var yValueFormat = function(d, i, label, isCurrency, precision) {
        precision = isNaN(precision) ? 2 : precision;
        return utility.numberFormatSI(label, precision, isCurrency, chart.locality());
      };

  var tooltipContent = function(eo, properties) {
        var key = eo.series.key;
        var x = eo.point.x;
        var y = eo.point.y;
        return '<h3>' + key + '</h3>' +
               '<p>' + y + ' on ' + x + '</p>';
      };

  var seriesClick = function(data, eo, chart, labels) {
        return;
      };

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  // Chart components
  var model = scatter();
  var header = headers();
  var xAxis = axis();
  var yAxis = axis();

  var tt = null;

  var showTooltip = function(eo, offsetElement, properties) {
        var content = tooltipContent(eo, properties);
        var gravity = eo.value < 0 ?
          'n' :
          's';
        return tooltip.show(eo.e, content, gravity, null, offsetElement);
      };

  model
    .padData(true)
    .padDataOuter(-1)
    .size(function(d) { return d.y; })
    .sizeRange([256, 1024])
    .singlePoint(true);
  header
    .showTitle(true)
    .showControls(false)
    .showLegend(true)
    .alignLegend('center');


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
          nestedData,
          xDomain,
          yDomain,
          yValues,
          maxBubbleSize;

      var xAxisFormat = function(d, i, selection, noEllipsis) {
            return xValueFormat(d, i, d, xIsDatetime, '%B');
          };

      var yAxisFormat = function(d, i, selection, noEllipsis) {
            var label = yValues && Array.isArray(yValues) ?
                  yValues[i].key || d :
                  d;
            var width = Math.max(availableWidth * 0.2, 75);

            return isNaN(label) ?
              utility.stringEllipsify(label, container, width) :
              yValueFormat(d, i, label, yIsCurrency);
          };

      var controlsData = [];

      chart.update = function() {
        container.transition().duration(duration).call(chart);
      };

      chart.container = this;


      //------------------------------------------------------------
      // Private method for displaying no data message.

      function displayNoData(data, msg) {
        var hasData = data && data.length;
        var x = (containerWidth - margin.left - margin.right) / 2 + margin.left;
        var y = (containerHeight - margin.top - margin.bottom) / 2 + margin.top;
        return utility.displayNoData(hasData, container, (msg || strings.noData), x, y);
      }

      // Check to see if there's nothing to show.
      if (displayNoData(data)) {
        return chart;
      }


      //------------------------------------------------------------
      // Process data

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
            gOffset = maxBubbleSize,
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
      nestedData = d3.nest()
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

      maxBubbleSize = Math.sqrt(model.sizeRange()[1] / Math.PI);


      //------------------------------------------------------------
      // Setup Scales and Axes

      header
        .chart(chart)
        .title(properties.title)
        .controlsData(controlsData)
        .legendData(modelData);
      header.legend
        .key(function(d) { return d.key + '%'; });

      xDomain = getTimeDomain(modelData);

      yValues = getGroupTicks(data);

      yDomain = d3.extent(
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

      xAxis
        .orient('bottom')
        .scale(model.xScale())
        .valueFormat(xAxisFormat)
        .ticks(d3.timeMonths, 1)
        .tickValues(getTimeTicks(xDomain))
        .tickSize(0)
        .tickPadding(4)
        .highlightZero(false)
        .showMaxMin(false);

      yAxis
        .orient('left')
        .scale(model.yScale())
        .valueFormat(yAxisFormat)
        .ticks(yValues.length)
        .tickValues(yValues.map(function(d, i) {
          return yValues[i].y;
        }))
        .tickPadding(7)
        .highlightZero(false)
        .showMaxMin(false);


      //------------------------------------------------------------
      // Main chart wrappers

      var wrap_bind = container.selectAll('g.sc-chart-wrap').data([modelData]);
      var wrap_entr = wrap_bind.enter().append('g')
            .attr('class', 'sc-chart-wrap sc-chart-' + modelClass);
      var wrap = container.select('.sc-chart-wrap').merge(wrap_entr);

      wrap_entr.append('defs');

      wrap_entr.append('g').attr('class', 'sc-background-wrap');
      var back_wrap = wrap.select('.sc-background-wrap');

      wrap_entr.append('g').attr('class', 'sc-title-wrap');

      wrap_entr.append('g').attr('class', 'sc-axis-wrap sc-axis-x');
      var xAxis_wrap = wrap.select('.sc-axis-wrap.sc-axis-x');
      wrap_entr.append('g').attr('class', 'sc-axis-wrap sc-axis-y');
      var yAxis_wrap = wrap.select('.sc-axis-wrap.sc-axis-y');

      wrap_entr.append('g').attr('class', 'sc-' + modelClass + '-wrap');
      var model_wrap = wrap.select('.sc-' + modelClass + '-wrap');

      wrap_entr.append('g').attr('class', 'sc-controls-wrap');
      wrap_entr.append('g').attr('class', 'sc-legend-wrap');

      wrap.attr('transform', utility.translation(margin.left, margin.top));
      wrap_entr.select('.sc-background-wrap').append('rect')
        .attr('class', 'sc-background')
        .attr('x', -margin.left)
        .attr('y', -margin.top)
        .attr('fill', '#FFF');


      //------------------------------------------------------------
      // Main chart draw

      chart.render = function() {

        // Chart layout variables
        var renderWidth, renderHeight,
            innerMargin,
            innerWidth, innerHeight,
            headerHeight;

        var xpos = 0,
            ypos = 0;

        containerWidth = parseInt(container.style('width'), 10);
        containerHeight = parseInt(container.style('height'), 10);

        renderWidth = width || containerWidth || 960;
        renderHeight = height || containerHeight || 400;

        availableWidth = renderWidth - margin.left - margin.right;
        availableHeight = renderHeight - margin.top - margin.bottom;

        innerMargin = {top: 0, right: 0, bottom: 0, left: 0};
        innerWidth = availableWidth - innerMargin.left - innerMargin.right;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;

        back_wrap.select('.sc-background')
          .attr('width', renderWidth)
          .attr('height', renderHeight);


        //------------------------------------------------------------
        // Title & Legend & Controls

        header
          .width(availableWidth)
          .height(availableHeight);

        container.call(header);

        // Recalc inner margins based on title, legend and control height
        headerHeight = header.getHeight();
        innerMargin.top += headerHeight;
        innerMargin.top += maxBubbleSize;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;

        if (innerHeight < 100) {
          displayNoData(null, strings.displayError);
          return chart;
        }


        //------------------------------------------------------------
        // Main Chart Component(s)

        model
          .width(innerWidth)
          .height(innerHeight)
          .id(chart.id())
          .xDomain(xDomain)
          .yDomain(yDomain);

        model_wrap
          .datum(modelData.filter(function(d) {
            return !d.disabled;
          }))
          .transition().duration(duration)
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

        // recall y-axis, x-axis and lines to set final size based on new dimensions
        yAxis
          .tickSize(-innerWidth, 0)
          .margin(innerMargin);
        yAxis_wrap
          .call(yAxis);
        yAxis_wrap.select('path.domain')
          .attr('d', 'M0,0V0.5H0V' + innerHeight);

        // final call to lines based on new dimensions
        model_wrap
          .transition().duration(chart.delay())
            .call(model);


        //------------------------------------------------------------
        // Final repositioning

        xpos = innerMargin.left;
        ypos = innerMargin.top + (xAxis.orient() === 'bottom' ? innerHeight : 0);
        xAxis_wrap
          .attr('transform', utility.translation(xpos, ypos));

        xpos = innerMargin.left + (yAxis.orient() === 'left' ? 0 : innerWidth);
        ypos = innerMargin.top;
        yAxis_wrap
          .attr('transform', utility.translation(xpos, ypos));

        model_wrap
          .attr('transform', utility.translation(innerMargin.left, innerMargin.top));

      };

      //============================================================

      chart.render();

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      //TODO: change legendClick to menuClick
      header.legend.dispatch.on('legendClick', function(series, i) {
        series.disabled = !series.disabled;

        if (!modelData.filter(function(d) { return !d.disabled; }).length) {
          modelData.forEach(function(d) {
            d.disabled = false;
            container.selectAll('.sc-series').classed('disabled', false);
          });
        }

        state.disabled = modelData.map(function(d) { return !!d.disabled; });
        dispatch.call('stateChange', this, state);

        chart.update();
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

        chart.update();
      });

      dispatch.on('chartClick', function() {
        dispatch.call('tooltipHide', this);
        if (header.controls.enabled()) {
          header.controls.dispatch.call('closeMenu', this);
        }
        if (header.legend.enabled()) {
          header.legend.dispatch.call('closeMenu', this);
        }
      });

      model.dispatch.on('elementClick', function(eo) {
        dispatch.call('chartClick', this);
        seriesClick(data, eo, chart);
      });

      container.on('click', function() {
        d3.event.stopPropagation();
        dispatch.call('chartClick', this);
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
  chart.legend = header.legend;
  chart.controls = header.controls;
  chart.xAxis = xAxis;
  chart.xAxisLabel = xAxis.axisLabel;
  chart.yAxis = yAxis;
  chart.yAxisLabel = yAxis.axisLabel;
  chart.options = utility.optionsFunc.bind(chart);

  utility.rebind(chart, model,
    'id', 'x', 'y', 'xScale', 'yScale', 'xDomain', 'yDomain', 'forceX', 'forceY', 'clipEdge',
    'color', 'fill', 'classes', 'gradient', 'locality'
  );
  utility.rebind(chart, model, 'size', 'zScale', 'sizeDomain', 'forceSize', 'interactive', 'clipVoronoi', 'clipRadius');
  utility.rebind(chart, header, 'showTitle', 'showControls', 'showLegend');
  utility.rebind(chart, xAxis, 'rotateTicks', 'reduceXTicks', 'staggerTicks', 'wrapTicks');

  chart.colorData = function(_) {
    var type = arguments[0],
        params = arguments[1] || {};
    var color = function(d) {
          return utility.defaultColor()(d, d.seriesIndex);
        };
    var classes = function(d) {
          return 'sc-series sc-series-' + d.seriesIndex;
        };

    switch (type) {
      case 'graduated':
        color = function(d) {
          return d3.interpolateHsl(d3.rgb(params.c1), d3.rgb(params.c2))(d.seriesIndex / params.l);
        };
        break;
      case 'class':
        color = function() {
          return 'inherit';
        };
        classes = function(d) {
          var i = d.seriesIndex;
          var iClass = (i * (params.step || 1)) % 14;
          iClass = (iClass > 9 ? '' : '0') + iClass;
          return 'sc-series sc-series-' + i + ' sc-fill' + iClass + ' sc-stroke' + iClass;
        };
        break;
      case 'data':
        color = function(d) {
          return d.classes ? 'inherit' : d.color || utility.defaultColor()(d, d.seriesIndex);
        };
        classes = function(d) {
          var i = d.seriesIndex;
          return 'sc-series sc-series-' + i + (d.classes ? ' ' + d.classes : '');
        };
        break;
    }

    var fill = !params.gradient ? color : function(d, i) {
      return model.gradientFill(d, d.seriesIndex);
    };

    model.color(color);
    model.fill(fill);
    model.classes(classes);

    header.legend.color(color);
    header.legend.classes(classes);

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
    dispatch.call('stateChange', this, state);
    return chart;
  };

  chart.strings = function(_) {
    if (!arguments.length) { return strings; }
    strings = language(_);
    header.strings(strings);
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    model.direction(_);
    xAxis.direction(_);
    yAxis.direction(_);
    header.direction(_);
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

  chart.seriesClick = function(_) {
    if (!arguments.length) { return seriesClick; }
    seriesClick = _;
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

  //============================================================

  return chart;
}
