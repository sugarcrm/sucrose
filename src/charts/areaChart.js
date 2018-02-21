import d3 from 'd3';
import utility from '../utility.js';
import tooltip from '../tooltip.js';
import language from '../language.js';
import headers from '../models/headers.js';
import area from '../models/area.js';
import line from '../models/line.js';
import axis from '../models/axis.js';

export default function areaChart() {

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
        'chartClick', 'tooltipShow', 'tooltipHide', 'tooltipMove',
        'stateChange', 'changeState'
      );

  var pointRadius = 3;

  var xValueFormat = function(d, i, label, isDate, dateFormat) {
        // If ordinal, label is provided so use it.
        // If date or numeric use d.
        var value = label || d;
        if (isDate) {
          dateFormat = !dateFormat || dateFormat.indexOf('%') !== 0 ? '%x' : dateFormat;
          return utility.dateFormat(value, dateFormat, chart.locality());
        } else {
          return value;
        }
      };

  var yValueFormat = function(d, i, label, isCurrency, precision) {
        precision = isNaN(precision) ? 2 : precision;
        return utility.numberFormatSI(d, precision, isCurrency, chart.locality());
      };

  var tooltipContent = function(eo, properties) {
        var key = eo.seriesKey;
        var yIsCurrency = properties.yDataType === 'currency';
        var y = yValueFormat(eo[1], eo.pointIndex, null, yIsCurrency, 2);
        return '<p>' + key + ': ' + y + '</p>';
      };

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  // Chart components
  var model = area();
  var header = headers();
  var xAxis = axis();
  var yAxis = axis();
  var guide = line();

  var tt = null;
  var guidetips = null;

  model
    .clipEdge(true);
  header
    .showTitle(true)
    .showControls(false)
    .showLegend(true);
  guide
    .duration(0);


  //============================================================

  function chart(selection) {

    selection.each(function(chartData) {

      var that = this,
          container = d3.select(this),
          modelClass = 'area';

      var properties = chartData ? chartData.properties || {} : {},
          data = chartData ? chartData.data || null : null;

      var containerWidth = parseInt(container.style('width'), 10),
          containerHeight = parseInt(container.style('height'), 10);

      var availableWidth = width,
          availableHeight = height;

      var xIsDatetime = properties.xDataType === 'datetime' || false,
          yIsCurrency = properties.yDataType === 'currency' || false;

      var groupData = properties.groups,
          hasGroupData = Array.isArray(groupData) && groupData.length > 0,
          groupLabels = [],
          groupCount = 0,
          hasGroupLabels = false;

      var modelData = [],
          seriesCount = 0,
          totalAmount = 0;

      var padding = 0;

      var controlsData = [
        {key: 'Stacked', disabled: model.offset() !== 'zero'},
        {key: 'Stream', disabled: model.offset() !== 'wiggle'},
        {key: 'Expanded', disabled: model.offset() !== 'expand'}
      ];

      var x,
          y;

      chart.update = function() {
        container.transition().duration(duration).call(chart);
      };

      chart.container = this;


      //------------------------------------------------------------
      // Private method for displaying no data message.

      function displayNoData(data, msg) {
        var hasData = data && data.length && data.filter(function(series) {
          return !series.disabled && Array.isArray(series.values) && series.values.length;
        }).length;
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

      // add series index to each data point for reference
      // and disable data series if total is zero
      data.forEach(function(series, s) {
        series.seriesIndex = s;
        series.key = series.key || strings.noLabel;
        series.total = d3.sum(series.values, function(value, v) {
          return model.y()(value, v);
        });

        // disabled if all values in series are zero
        // or the series was disabled by the legend
        series.disabled = series.disabled || series.total === 0;
      });

      // Remove disabled series data
      modelData = data
        .filter(function(series) {
          return !series.disabled;
        })
        .map(function(series, s) {
          // this is the iterative index, not the data index
          series.seri = s;
          return series;
        });

      seriesCount = modelData.length;

      // Display No Data message if there's nothing to show.
      if (displayNoData(modelData)) {
        return chart;
      }

      // -------------------------------------------
      // Get group data from properties or modelData

      function setGroupLabels(groupData) {
        // Get simple array of group labels for ticks
        groupLabels = groupData.map(function(group) {
            return group.label;
          });
        groupCount = groupLabels.length;
        hasGroupLabels = groupCount > 0;
      }

      if (hasGroupData) {

        // Calculate group totals and height
        // based on enabled data series
        groupData
          .forEach(function(group, g) {
            var label = typeof group.label === 'undefined' || group.label === '' ?
              strings.noLabel :
                xIsDatetime ?
                  utility.isNumeric(group.label) || group.label.indexOf('GMT') !== -1 ?
                    new Date(group.label) :
                    new Date(group.label + ' GMT') :
                  group.label;
            group.group = g,
            group.label = label;
            group.total = 0;

            //TODO: only sum enabled series
            // update group data with values
            modelData
              .forEach(function(series, s) {
              //TODO: there is a better way with map reduce?
                series.values
                  .filter(function(value, v) {
                    return value.group === g;
                  })
                  .forEach(function(value, v) {
                    group.total += value.y;
                  });
              });
          });

        setGroupLabels(groupData);

        totalAmount = d3.sum(groupData, function(group) {
          return group.total;
        });

      } else {

        groupLabels = d3
          .merge(modelData.map(function(series) {
            return series.values;
          }))
          .reduce(function(a, b) {
            if (a.indexOf(b.x) === -1) {
              a.push(b.x);
            }
            return a;
          }, [])
          .map(function(value, v) {
            return xIsDatetime ? new Date(value) : value;
          });

        groupCount = Math.min(Math.ceil(innerWidth / 100), groupLabels.length);

        totalAmount = d3.sum(modelData, function(series) {
          return series.total;
        });

      }


      //------------------------------------------------------------
      // Configure axis format functions

          //TODO: allow formatter to be set by data
      var xTickMaxWidth = 75,
          xDateFormat = null,
          xAxisFormat = null,
          yAxisFormat = null;

      var yAxisFormatProperties = {
        axis: null,
        maxmin: null
      };

      function setAxisFormatProperties(type, selection) {
        // i.e., 100 | 200 | 300
        var tickDatum = selection.map(function(t) {
            return d3.select(t).datum();
          });
        // i.e., 1 | 1000 | 1000000
        var decimal = d3.max(d3.extent(tickDatum), function(v) {
            return utility.siDecimal(Math.abs(v));
          });
        var precision = d3.max(tickDatum, function(v) {
            return utility.countSigFigsAfter(d3.formatPrefix('.2s', decimal)(v));
          });
        if (type === 'maxmin' && yAxisFormatProperties.axis) {
          precision = Math.max(yAxisFormatProperties.axis.precision, precision);
        }
        yAxisFormatProperties[type] = {
          decimal: decimal,
          precision: precision
        };
        return yAxisFormatProperties[type];
      }

      if (xIsDatetime) {
        xDateFormat = utility.getDateFormatUTC(groupLabels);
      }

      xAxisFormat = function(d, i, selection, type) {
        var group = hasGroupLabels ? groupLabels[i] : d;
        var label = xValueFormat(d, i, group, xIsDatetime, xDateFormat);
        return type === 'no-ellipsis' ?
          label :
          utility.stringEllipsify(label, container, xTickMaxWidth);
      };

      yAxisFormat = function(d, i, selection, type) {
        var props = yAxisFormatProperties[type] ||
              setAxisFormatProperties(type, selection);
        return yValueFormat(d, i, null, yIsCurrency, props.precision, props.decimal);
      };


      //------------------------------------------------------------
      // State persistence model

      state.disabled = modelData.map(function(d) { return !!d.disabled; });
      state.style = model.style();


      //------------------------------------------------------------
      // Setup Scales and Axes

      header
        .chart(chart)
        .title(properties.title)
        .controlsData(controlsData)
        .legendData(data);

      model
        .xDomain(null)  //?why null?
        .yDomain(null)
        .xScale(xIsDatetime ? d3.scaleTime() : d3.scaleLinear());

      x = model.xScale();
      y = model.yScale();

      xAxis
        .orient('bottom')
        .ticks(null)
        .tickValues(null)
        .scale(x)
        .tickPadding(6)
        .valueFormat(xAxisFormat)
        .highlightZero(false)
        .showMaxMin(xIsDatetime);

      yAxis
        .orient('left')
        .ticks(null)
        .scale(y)
        .tickPadding(6)
        .valueFormat(yAxisFormat)
        .highlightZero(true)
        .showMaxMin(true);

      guide
        .id(model.id())
        .useVoronoi(false)
        .clipEdge(false)
        .xScale(x)
        .yScale(y);


      //------------------------------------------------------------
      // Main chart wrappers

      var wrap_bind = container.selectAll('g.sc-chart-wrap').data([modelData]);
      var wrap_entr = wrap_bind.enter().append('g')
            .attr('class', 'sc-chart-wrap sc-chart-' + modelClass);
      var wrap = container.select('.sc-chart-wrap').merge(wrap_entr);

      wrap_entr.append('defs');
      var defs = wrap.select('defs');

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

      wrap_entr.append('g').attr('class', 'sc-guide-wrap');
      var guide_wrap = wrap.select('.sc-guide-wrap');

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

        xTickMaxWidth = Math.max(availableWidth * 0.2, 75);


        //------------------------------------------------------------
        // Title & Legend & Controls

        header
          .width(availableWidth)
          .height(availableHeight);

        container.call(header);

        // Recalc inner margins based on title, legend and control height
        headerHeight = header.getHeight();
        innerMargin.top += headerHeight;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;

        if (innerHeight < 100) {
          displayNoData(null, strings.displayError);
          return chart;
        }


        //------------------------------------------------------------
        // Main Chart Component(s)

        function getDimension(d) {
          if (d === 'width') {
            return innerWidth;
          } else if (d === 'height') {
            return innerHeight;
          } else {
            return 0;
          }
        }

        model
          .width(getDimension('width'))
          .height(getDimension('height'));
        model_wrap
          .datum(modelData)
          .call(model);


        //------------------------------------------------------------
        // Axes

        var yAxisMargin = {top: 0, right: 0, bottom: 0, left: 0},
            xAxisMargin = {top: 0, right: 0, bottom: 0, left: 0};

        function setInnerMargins() {
          xAxisMargin = xAxis.margin();
          yAxisMargin = yAxis.margin();
          innerMargin.left = Math.max(xAxisMargin.left, yAxisMargin.left);
          innerMargin.right = Math.max(xAxisMargin.right, yAxisMargin.right);
          innerMargin.top = Math.max(xAxisMargin.top, yAxisMargin.top);
          innerMargin.bottom = Math.max(xAxisMargin.bottom, yAxisMargin.bottom);
          setInnerDimensions();
        }

        function setInnerDimensions() {
          innerWidth = availableWidth - innerMargin.left - innerMargin.right;
          innerHeight = availableHeight - headerHeight - innerMargin.top - innerMargin.bottom;
          // Recalc chart dimensions and scales based on new inner dimensions
          model.resetDimensions(getDimension('width'), getDimension('height'));
        }

        function yAxisRender() {
          yAxis
            .ticks(model.offset() === 'wiggle' ? 0 : null)
            .tickSize(padding - innerWidth, 0)
            .margin(innerMargin);
          yAxis_wrap
            .call(yAxis);
          setInnerMargins();
        }

        function xAxisRender() {
          xAxis
            .tickSize(padding - innerHeight, 0)
            .margin(innerMargin);
          xAxis_wrap
            .call(xAxis);
          setInnerMargins();
        }

        // initial Y-Axis call
        yAxisRender();
        // initial X-Axis call
        xAxisRender();

        // recall Y-axis to set final size based on new dimensions
        yAxisRender();
        // recall X-axis to set final size based on new dimensions
        xAxisRender();
        // recall Y-axis to set final size based on new dimensions
        yAxisRender();

        // final call to lines based on new dimensions
        model_wrap
          .transition().duration(duration)
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

        chart.showTooltip = function(eo, offsetElement, properties) {
          var content = tooltipContent(eo, properties);
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
              guidetips[i] = chart.showTooltip(d, that.parentNode, properties);
            });
            guidetips['x'] = chart.showTooltip(xData, that.parentNode, properties);
          }

          // Line
          eo.data.forEach(function(d, i) {
            var content = tooltipContent(d, properties);
            guidePos.clientY = eo.origin.top + y(d[1]);
            d3.select(guidetips[i]).select('.tooltip-inner').html(content);
            tooltip.position(that.parentNode, guidetips[i], guidePos, 'e');
          });

          // Top date
          xData.forEach(function(d, i) {
            var xval = xValueFormat(d, i, xpos, xIsDatetime);
            guidePos.clientY = eo.origin.top;
            d3.select(guidetips['x']).select('.tooltip-inner').html(xval);
            tooltip.position(that.parentNode, guidetips['x'], guidePos, 's');
          });

        };

        //------------------------------------------------------------
        // Final repositioning

        innerMargin.top += headerHeight;

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
        guide_wrap
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

        // if there are no enabled data series, enable them all
        if (!data.filter(function(d) { return !d.disabled; }).length) {
          data.forEach(function(d) {
            d.disabled = false;
          });
        }
        state.disabled = data.map(function(d) { return !!d.disabled; });

        // on legend click, clear active cell state
        series.active = 'inactive';

        chart.update();
        dispatch.call('stateChange', this, state);
      });

      header.controls.dispatch.on('legendClick', function(control, i) {
        //if the option is currently enabled (i.e., selected)
        if (!control.disabled) {
          return;
        }

        //set the controls all to false
        controlsData.forEach(function(control) {
          control.disabled = true;
        });
        //activate the the selected control option
        control.disabled = false;

        switch (control.key) {
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

        chart.render();
        dispatch.call('stateChange', this, state);
      });

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
        chart.update();
        dispatch.call('stateChange', this, state);
        dispatch.call('tooltipHide', this);
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

        chart.update();
      });

      dispatch.on('chartClick', function() {
        if (header.controls.enabled()) {
          header.controls.dispatch.call('closeMenu', this);
        }
        if (header.legend.enabled()) {
          header.legend.dispatch.call('closeMenu', this);
        }
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

  model.dispatch.on('elementMouseout.tooltip', function(eo) {
    // need eo for removing hover class on element
    dispatch.call('tooltipHide', this, eo);
  });

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.dispatch = dispatch;
  chart.area = model;
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
  utility.rebind(chart, model, 'offset', 'order', 'style');
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
          return utility.defaultColor()(d, d.seriesIndex);
        };
        classes = function(d) {
          var i = d.seriesIndex;
          return 'sc-series sc-series-' + i + (d.classes ? ' ' + d.classes : '');
        };
        break;
    }

    var fill = !params.gradient ? color : function(d, i) {
      var p = {
        orientation: params.orientation || 'horizontal',
        position: params.position || 'base'
      };
      return model.gradientFill(d, d.seriesIndex, p);
    };

    model.color(color);
    model.fill(fill);
    model.classes(classes);

    // don't enable this since controls get a custom function
    // controls.color(color);
    // controls.classes(classes);
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

  chart.pointRadius = function(_) {
    if (!arguments.length) { return pointRadius; }
    pointRadius = _;
    return chart;
  };

  //============================================================

  return chart;
}
