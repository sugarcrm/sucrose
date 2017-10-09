import d3 from 'd3';
import utility from '../utility.js';
import tooltip from '../tooltip.js';
import headers from '../models/headers.js';
import line from '../models/line.js';
import axis from '../models/axis.js';

export default function lineChart() {

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
      strings = {
        legend: {close: 'Hide legend', open: 'Show legend'},
        controls: {close: 'Hide controls', open: 'Show controls'},
        noData: 'No Data Available.',
        noLabel: 'undefined'
      };

  var dispatch = d3.dispatch('chartClick', 'elementClick', 'tooltipShow', 'tooltipHide', 'tooltipMove', 'stateChange', 'changeState');

  var pointRadius = 3;

  var tooltipContent = function(eo, properties) {
        var seriesName = properties.seriesLabel || 'Key';
        var seriesLabel = eo.series.key;

        var xIsDatetime = properties.xDataType === 'datetime';
        var groupName = properties.groupName || (xIsDatetime ? 'Date' : 'Group'); // Set in properties
        // the event object group is set by event dispatcher if x is ordinal
        var group = eo.group || {};
        var x = eo.point.x; // this is the ordinal index [0+1..n+1] or value index [0..n]
        var groupLabel = xValueFormat(x, eo.pointIndex, group.label, xIsDatetime, '%x');

        var yIsCurrency = properties.yDataType === 'currency';
        var valueName = yIsCurrency ? 'Amount' : 'Count';
        var y = eo.point.y;
        // var value = yValueFormat(y, eo.seriesIndex, null, yIsCurrency, 2);
        // we can't use yValueFormat because it needs SI units
        // for tooltip, we want the full value
        var valueLabel = utility.numberFormat(y, null, yIsCurrency, chart.locality());

        var percent;
        var content = '';

        content += '<p>' + seriesName + ': <b>' + seriesLabel + '</b></p>';
        content += '<p>' + groupName + ': <b>' + groupLabel + '</b></p>';
        content += '<p>' + valueName + ': <b>' + valueLabel + '</b></p>';

        if (eo.group && Number.isFinite(eo.group._height)) {
          percent = Math.abs(y * 100 / eo.group._height).toFixed(1);
          percent = utility.numberFormat(percent, 2, false, chart.locality());
          content += '<p>Percentage: <b>' + percent + '%</b></p>';
        }

        return content;
      };

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

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  // Chart components
  var model = line();
  var header = headers();
  var xAxis = axis();
  var yAxis = axis();

  var tt = null;

  var showTooltip = function(eo, offsetElement, properties) {
        var content = tooltipContent(eo, properties);
        var gravity = eo.value < 0 ? 'n' : 's';
        return tooltip.show(eo.e, content, gravity, null, offsetElement);
      };

  var seriesClick = function(data, eo, chart, labels) {
        return;
      };

  model
    .clipEdge(true);
  header
    .showTitle(true)
    .showControls(true)
    .showLegend(true);


  //============================================================

  function chart(selection) {

    selection.each(function(chartData) {

      var that = this,
          container = d3.select(this),
          modelClass = 'line';

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

      var padding = (model.padData() ? pointRadius : 0);
      var singlePoint = false;

          //TODO: allow formatter to be set by data
      var xTickMaxWidth = 75,
          xDateFormat = null,
          xAxisFormat = null,
          yAxisFormat = null;

      var controlsData = [
        {key: 'Linear', disabled: model.interpolate() !== 'linear'},
        {key: 'Basis', disabled: model.interpolate() !== 'basis'},
        {key: 'Monotone', disabled: model.interpolate() !== 'monotone'},
        {key: 'Cardinal', disabled: model.interpolate() !== 'cardinal'},
        {key: 'Line', disabled: model.isArea()() === true},
        {key: 'Area', disabled: model.isArea()() === false}
      ];

      chart.update = function() {
        container.transition().duration(duration).call(chart);
      };

      chart.setActiveState = function(series, state) {
        series.active = state;
        series.values.forEach(function(v) {
          v.active = state;
        });
      };

      chart.clearActive = function() {
        data.forEach(function(s) {
          chart.setActiveState(s, '');
        });
        delete state.active;
      };

      chart.seriesActivate = function(series) {
        // inactivate all series
        data.forEach(function(s) {
          chart.setActiveState(s, 'inactive');
        });
        // then activate the selected series
        chart.setActiveState(series, 'active');
        // set the state to a truthy map
        state.active = data.map(function(s) {
          return s.active === 'active';
        });
      };

      chart.cellActivate = function(eo) {
        // seriesClick is defined outside chart scope, so when it calls
        // cellActivate, it only has access to (data, eo, chart, labels)
        var cell = data[eo.seriesIndex].values[eo.pointIndex];
        var activeState;

        if (!cell) {
          return;
        }

        // store toggle active state
        activeState = (
            typeof cell.active === 'undefined' ||
            cell.active === 'inactive' ||
            cell.active === ''
          ) ? 'active' : '';

        // unset entire active state
        chart.clearActive();

        cell.active = activeState;

        chart.render();
      };

      chart.dataSeriesActivate = function(eo) {
        var series = eo.series || data[eo.seriesIndex];
        var activeState;

        if (!series) {
          return;
        }

        // toggle active state
        activeState = (
            typeof series.active === 'undefined' ||
            series.active === 'inactive' ||
            series.active === ''
          ) ? 'active' : 'inactive';

        if (activeState === 'active') {
          // if you have activated a data series,
          chart.seriesActivate(series);
        } else {
          // if there are no active data series, unset entire active state
          chart.clearActive();
        }

        chart.render();
      };

      chart.container = this;


      //------------------------------------------------------------
      // Private method for displaying no data message.

      function displayNoData(data) {
        var hasData = data && data.length && data.filter(function(series) {
          return !series.disabled && Array.isArray(series.values) && series.values.length;
        }).length;
        var x = (containerWidth - margin.left - margin.right) / 2 + margin.left;
        var y = (containerHeight - margin.top - margin.bottom) / 2 + margin.top;
        return utility.displayNoData(hasData, container, strings.noData, x, y);
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
          // if data is ordinal, add group based on x not index
          value.group = hasGroupData ? value.x - 1 : v;
          return value.y;
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
                  new Date(group.label) :
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

      // Configure axis format functions
      if (xIsDatetime) {
        xDateFormat = utility.getDateFormat(groupLabels);
      }

      xAxisFormat = function(d, i, selection, noEllipsis) {
        var group = hasGroupLabels ? groupLabels[i] : d;
        var label = xValueFormat(d, i, group, xIsDatetime, xDateFormat);
        return noEllipsis ? label : utility.stringEllipsify(label, container, xTickMaxWidth);
      };

      yAxisFormat = function(d, i, selection) {
        return yValueFormat(d, i, null, yIsCurrency, 2);
      };


      //------------------------------------------------------------
      // State persistence model

      state.disabled = modelData.map(function(d) { return !!d.disabled; });
      state.interpolate = model.interpolate();
      state.isArea = model.isArea()();


      //------------------------------------------------------------
      // Setup Scales and Axes

      header
        .chart(chart)
        .title(properties.title)
        .controlsData(controlsData)
        .legendData(data);

      // Are all data series single points
      singlePoint = d3.max(modelData, function(d) {
          return d.values.length;
        }) === 1;

      var pointSize = Math.pow(pointRadius, 2) * Math.PI * (singlePoint ? 3 : 1);

      model
        //TODO: we need to reconsider use of padData
        // .padData(singlePoint ? false : true)
        // .padDataOuter(-1)
        // set x-scale as time instead of linear
        // .xScale(xIsDatetime && !groupLabels.length ? d3.scaleTime() : d3.scaleLinear()) //TODO: why && !groupLabels.length?
        // .xScale(hasGroupData ? d3.scaleBand() : xIsDatetime ? d3.scaleTime() : d3.scaleLinear())
        .xScale(xIsDatetime ? d3.scaleTime() : d3.scaleLinear())
        .singlePoint(singlePoint)
        .size(pointSize) // default size set to 3
        .sizeRange([pointSize, pointSize])
        .sizeDomain([pointSize, pointSize]); //set to speed up calculation, needs to be unset if there is a custom size accessor

      if (singlePoint) {
        var xValues = d3.merge(modelData.map(function(d) {
                return d.values.map(function(d, i) {
                  return model.x()(d, i);
                });
              }))
              .reduce(function(p, c) {
                if (p.indexOf(c) < 0) p.push(c);
                return p;
              }, [])
              .sort(function(a, b) {
                return a - b;
              });
        var xExtents = d3.extent(xValues);
        var xOffset = 1 * (xIsDatetime && !groupLabels.length ? 86400000 : 1);

        var yValues = d3.merge(modelData.map(function(d) {
                return d.values.map(function(d, i) {
                  return model.y()(d, i);
                });
              }));
        var yExtents = d3.extent(yValues);
        var yOffset = modelData.length === 1 ? 2 : Math.min((yExtents[1] - yExtents[0]) / modelData.length, yExtents[0]);

        model
          .xDomain([
            xExtents[0] - xOffset,
            xExtents[1] + xOffset
          ])
          .yDomain([
            yExtents[0] - yOffset,
            yExtents[1] + yOffset
          ]);

        xAxis
          .orient('bottom')
          .showMaxMin(false)
          .ticks(xValues.length)
          .tickValues(xValues)
          .highlightZero(false)
          .showMaxMin(false);

        yAxis
          .orient('left')
          .ticks(singlePoint ? 5 : null) //TODO: why 5?
          .highlightZero(false)
          .showMaxMin(false);
      } else {
        model
          .xDomain(null)  //?why null?
          .yDomain(null);

        xAxis
          .orient('bottom')
          //NOTE: be careful of this. If the x value is ordinal, then the values
          // should be [1...n]. If the x value is numeric, then the values are
          // zero indexed as [0..n-1]
          .tickValues(hasGroupLabels ? d3.range(1, groupLabels.length + 1) : null)
          .ticks(hasGroupLabels ? groupLabels.length : null)
          .showMaxMin(xIsDatetime)
          .highlightZero(false);

        yAxis
          .orient('left')
          .ticks(null)
          .highlightZero(true)
          .showMaxMin(true);
      }

      xAxis
        .scale(model.xScale())
        .tickPadding(6)
        .valueFormat(xAxisFormat);

      yAxis
        .scale(model.yScale())
        .tickPadding(6)
        .valueFormat(yAxisFormat);


      //------------------------------------------------------------
      // Main chart wrappers

      var wrap_bind = container.selectAll('g.sc-chart-wrap').data([modelData]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-chart-wrap sc-chart-' + modelClass);
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


        //------------------------------------------------------------
        // Main Chart Component(s)

        model
          .width(innerWidth)
          .height(innerHeight);
        model_wrap
          .datum(modelData)
          .call(model);


        //------------------------------------------------------------
        // Axes

        var yAxisMargin = {top: 0, right: 0, bottom: 0, left: 0},
            xAxisMargin = {top: 0, right: 0, bottom: 0, left: 0};

        function setInnerMargins() {
          innerMargin.left = Math.max(xAxisMargin.left, yAxisMargin.left);
          innerMargin.right = Math.max(xAxisMargin.right, yAxisMargin.right);
          innerMargin.top = Math.max(xAxisMargin.top, yAxisMargin.top);
          innerMargin.bottom = Math.max(xAxisMargin.bottom, yAxisMargin.bottom);
        }

        function setInnerDimensions() {
          innerWidth = availableWidth - innerMargin.left - innerMargin.right;
          innerHeight = availableHeight - headerHeight - innerMargin.top - innerMargin.bottom;
          // Recalc chart dimensions and scales based on new inner dimensions
          model.width(innerWidth).height(innerHeight);
          // This resets the scales for the whole chart
          // unfortunately we can't call this without until line instance is called
          model.scatter.resetDimensions(innerWidth, innerHeight);
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
        // resize ticks based on new dimensions
        xAxis
          .ticks(groupCount)
          .tickSize(padding - innerHeight, 0)
          .margin(innerMargin);
        xAxis_wrap
          .call(xAxis);

        // reset inner dimensions
        xAxisMargin = xAxis.margin();
        setInnerMargins();
        setInnerDimensions();

        // recall y-axis, x-axis and lines to set final size based on new dimensions
        yAxis
          .tickSize(padding - innerWidth, 0)
          .margin(innerMargin);
        yAxis_wrap
          .call(yAxis);

        xAxis
          .tickSize(padding - innerHeight, 0)
          .margin(innerMargin);
        xAxis_wrap
          .call(xAxis);

        model
          .width(innerWidth)
          .height(innerHeight);
        model_wrap
          .datum(modelData)
          .call(model);

        // final call to lines based on new dimensions
        // model_wrap
        //   .transition().duration(duration)
        //     .call(model);


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

      };

      //============================================================

      chart.render();

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

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
        series.values.forEach(function(d) {
          d.active = 'inactive';
        });
        // if there are no active data series, unset active state
        if (!data.filter(function(d) { return d.active === 'active'; }).length) {
          chart.clearActive();
        }
        state.active = data.map(function(d) { return !!d.active; });

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
          case 'Basis':
            model.interpolate('basis');
            break;
          case 'Linear':
            model.interpolate('linear');
            break;
          case 'Monotone':
            model.interpolate('monotone');
            break;
          case 'Cardinal':
            model.interpolate('cardinal');
            break;
          case 'Line':
            model.isArea(false);
            break;
          case 'Area':
            model.isArea(true);
            break;
        }
        state.interpolate = model.interpolate();
        state.isArea = model.isArea();

        chart.update();
        dispatch.call('stateChange', this, state);
      });

      dispatch.on('tooltipShow', function(eo) {
        if (tooltips) {
          if (hasGroupLabels) {
            // set the group rather than pass entire groupData
            eo.group = groupData[eo.groupIndex];
          }
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

        if (typeof eo.interpolate !== 'undefined') {
          model.interpolate(eo.interpolate);
          state.interpolate = eo.interpolate;
        }

        if (typeof eo.isArea !== 'undefined') {
          model.isArea(eo.isArea);
          state.isArea = eo.isArea;
        }

        chart.update();
      });

      dispatch.on('chartClick', function() {
        //dispatch.call('tooltipHide', this);
        if (header.controls.enabled()) {
          header.controls.dispatch.call('closeMenu', this);
        }
        if (header.legend.enabled()) {
          header.legend.dispatch.call('closeMenu', this);
        }
      });

      model.dispatch.on('elementClick', function(eo) {
        if (hasGroupLabels && eo.groupIndex) {
          // set the group rather than pass entire groupData
          eo.group = groupData[eo.groupIndex];
        }
        dispatch.call('chartClick', this);
        model.dispatch.call('elementMouseout', this, eo);
        seriesClick(data, eo, chart, groupLabels);
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
  chart.lines = model;
  chart.legend = header.legend;
  chart.controls = header.controls;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;
  chart.options = utility.optionsFunc.bind(chart);

  utility.rebind(chart, model, 'id', 'x', 'y', 'xScale', 'yScale', 'xDomain', 'yDomain', 'forceX', 'forceY', 'clipEdge', 'color', 'fill', 'classes', 'gradient', 'locality');
  utility.rebind(chart, model, 'defined', 'isArea', 'interpolate', 'size', 'clipVoronoi', 'useVoronoi', 'interactive', 'nice');
  utility.rebind(chart, header, 'showTitle', 'showControls', 'showLegend');
  utility.rebind(chart, xAxis, 'rotateTicks', 'reduceXTicks', 'staggerTicks', 'wrapTicks');

  chart.colorData = function(_) {
    var type = arguments[0],
        params = arguments[1] || {};
    var color = function(d, i) {
          return utility.defaultColor()(d, d.seriesIndex);
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
          return 'sc-series sc-series-' + d.seriesIndex + ' sc-fill' + iClass + ' sc-stroke' + iClass;
        };
        break;
      case 'data':
        color = function(d, i) {
          return utility.defaultColor()(d, d.seriesIndex);
        };
        classes = function(d, i) {
          return 'sc-series sc-series-' + d.seriesIndex + (d.classes ? ' ' + d.classes : '');
        };
        break;
    }

    var fill = (!params.gradient) ? color : function(d, i) {
      return model.gradient()(d, d.seriesIndex);
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
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        strings[prop] = _[prop];
      }
    }
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

  chart.pointRadius = function(_) {
    if (!arguments.length) { return pointRadius; }
    pointRadius = _;
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

  //============================================================

  return chart;
}
