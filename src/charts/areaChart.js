import d3 from 'd3';
import fc from 'd3fc-rebind';
import utility from '../utility.js';
import tooltip from '../tooltip.js';
import area from '../models/area.js';
import line from '../models/line.js';
import axis from '../models/axis.js';
import menu from '../models/menu.js';

export default function stackeareaChart() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 10, right: 10, bottom: 10, left: 10},
      width = null,
      height = null,
      showTitle = false,
      showControls = false,
      showLegend = true,
      direction = 'ltr',
      delay = 0,
      duration = 0,
      tooltips = true,
      state = {},
      x,
      y,
      strings = {
        legend: {close: 'Hide legend', open: 'Show legend'},
        controls: {close: 'Hide controls', open: 'Show controls'},
        noData: 'No Data Available.',
        noLabel: 'undefined'
      },
      dispatch = d3.dispatch('chartClick', 'tooltipShow', 'tooltipHide', 'tooltipMove', 'stateChange', 'changeState');

  var pointRadius = 3;

  var xValueFormat = function(d, i, label, isDate, dateFormat) {
        if (isDate) {
          dateFormat = !dateFormat || dateFormat.indexOf('%') !== 0 ? '%x' : dateFormat;
          return utility.dateFormat(label, dateFormat, chart.locality());
        } else {
          return label;
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
  var model = area().clipEdge(true);
  var xAxis = axis();
  var yAxis = axis();
  var controls = menu();
  var legend = menu();
  var guide = line().duration(0);

  var controlsData = [
    {key: 'Stacked', disabled: model.offset() !== 'zero'},
    {key: 'Stream', disabled: model.offset() !== 'wiggle'},
    {key: 'Expanded', disabled: model.offset() !== 'expand'}
  ];

  var tt = null,
      guidetips = null;

  var tooltipContent = function(eo, properties) {
    console.log('eo: ', eo);
        var key = eo.seriesKey;
        var y = yValueFormat(model.y()(eo));
        return '<p>' + key + ': ' + y + '</p>';
      };

  //============================================================

  function chart(selection) {

    selection.each(function(chartData) {

      var that = this,
          container = d3.select(this),
          modelClass = 'area';

      var properties = chartData ? chartData.properties : {},
          data = chartData ? chartData.data : null;

      var containerWidth = parseInt(container.style('width'), 10),
          containerHeight = parseInt(container.style('height'), 10);

      var availableWidth = width,
          availableHeight = height;
      var padding = 0;

      var groupData = properties.labels,
          hasGroupData = Array.isArray(groupData) && groupData.length,
          hasGroupLabels = hasGroupData ? groupData.filter(function(group) {
            return typeof group.label !== 'undefined';
          }).length !== 0 : false;

      // TODO: what if the dimension is a numerical range?
      // xValuesAreDates = groupLabels.length ?
      //       utility.isValidDate(groupLabels[0]) :
      //       utility.isValidDate(model.x()(data[0].values[0]));
      // xValuesAreDates = isArrayData && utility.isValidDate(data[0].values[0][0]);

      // SAVE FOR LATER
      // isOrdinalSeries = !xValuesAreDates && labels.length > 0 && d3.min(modelData, function(d) {
      //   return d3.min(d.values, function(d, i) {
      //     return model.x()(d, i);
      //   });
      // }) > 0;

      var xIsOrdinal = properties.xDataType === 'ordinal' || hasGroupLabels || false,
          xIsDatetime = properties.xDataType === 'datetime' || false,
          xIsNumeric = properties.xDataType === 'numeric' || false,
          yIsCurrency = properties.yDataType === 'currency' || false;

      var modelData = [],
          seriesCount = 0,
          totalAmount = 0,
          singlePoint = false;

      var showMaxMin = false,
          isArrayData = true;

          //TODO: allow formatter to be set by data
      var xTickValues = [],
          xTickCount = 0,
          xTickMaxWidth = 75,
          xDateFormat = null,
          xAxisFormat = null,
          yAxisFormat = null;

      chart.update = function() {
        container.transition().duration(duration).call(chart);
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
        return utility.displayNoData(hasData, container, chart.strings().noData, x, y);
      }

      // Check to see if there's nothing to show.
      if (displayNoData(data)) {
        return chart;
      }


      //------------------------------------------------------------
      // Process data

      var groupLabels = hasGroupData ?
            groupData.map(function(d) {
              return [].concat(d.l)[0] || chart.strings().noLabel;
            }) :
            [];

      isArrayData = Array.isArray(data[0].values[0]);
      if (isArrayData) {
        model.x(function(d) { return d ? d[0] : 0; });
        model.y(function(d) { return d ? d[1] : 0; });
      } else {
        model.x(function(d) { return d.x; });
        model.y(function(d) { return d.y; });
      }

      // add series index to each data point for reference
      // and disable data series if total is zero
      data.forEach(function(series, i) {
        series.seriesIndex = i;
        series.total = d3.sum(series.values, function(d, i) {
          return model.y()(d, i);
        });
        if (!series.total) {
          series.disabled = true;
        }
      });

      modelData = data.filter(function(d) { return !d.disabled; });

      // safety array
      if (!modelData.length) {
        modelData = [{seriesIndex: 0, key: 'Empty', total: 0, disabled: true, values: []}];
      }

      totalAmount = d3.sum(modelData, function(d) { return d.total; });

      // display No Data message if there's nothing to show.
      if (!totalAmount) {
        displayNoData();
        return chart;
      }

      //TODO: handle datetime groupLabels
      if (xIsOrdinal) {

        xTickCount = groupLabels.length;

        xAxisFormat = function(d, i, selection) {
          return groupLabels[i];
        };

      } else {

        xTickValues = d3
          .merge(
            modelData.map(function(d) {
              return d.values;
            })
          )
          .reduce(function(a, b) {
            if (a.indexOf(b.x) === -1) {
              a.push(b.x);
            }
            return a;
          }, []);

        xTickCount = Math.min(Math.ceil(innerWidth / 100), xTickValues.length);

        if (xIsDatetime) {
          xTickValues = xTickValues.map(function(d) {
            return new Date(d);
          });

          xDateFormat = utility.getDateFormat(xTickValues);

          xAxisFormat = function(d, i, selection) {
            return utility.dateFormat(d, xDateFormat, chart.locality());
          };

        } else if (xIsNumeric) {

          xAxisFormat = function(d, i, selection) {
            return d;
          };

        }

      }

      yAxisFormat = function(d, i, selection) {
        return yValueFormat(d, i, d, yIsCurrency, 2);
      };

      // Display No Data message if there's nothing to show.
      if (displayNoData(modelData)) {
        return chart;
      }

      // Set title display option
      showTitle = showTitle && properties.title;


      //------------------------------------------------------------
      // State persistence model

      state.disabled = modelData.map(function(d) { return !!d.disabled; });
      state.style = model.style();


      //------------------------------------------------------------
      // Setup Scales and Axes

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
        .showMaxMin(xIsDatetime)
        .highlightZero(false)
        .scale(x)
        .tickPadding(6)
        .valueFormat(xAxisFormat);

      yAxis
        .orient('left')
        .ticks(null)
        .showMaxMin(true)
        .highlightZero(true)
        .scale(y)
        .tickPadding(6)
        .valueFormat(yAxisFormat);

      guide
        .id(model.id())
        .useVoronoi(false)
        .clipEdge(false)
        .xScale(x)
        .yScale(y);


      //------------------------------------------------------------
      // Main chart wrappers

      var wrap_bind = container.selectAll('g.sc-chart-wrap').data([modelData]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-chart-wrap sc-chart-' + modelClass);
      var wrap = container.select('.sc-chart-wrap').merge(wrap_entr);

      wrap_entr.append('rect').attr('class', 'sc-background')
        .attr('x', -margin.left)
        .attr('y', -margin.top)
        .attr('fill', '#FFF');

      wrap_entr.append('g').attr('class', 'sc-title-wrap');
      var title_wrap = wrap.select('.sc-title-wrap');

      wrap_entr.append('g').attr('class', 'sc-axis-wrap sc-axis-x');
      var xAxis_wrap = wrap.select('.sc-axis-wrap.sc-axis-x');
      wrap_entr.append('g').attr('class', 'sc-axis-wrap sc-axis-y');
      var yAxis_wrap = wrap.select('.sc-axis-wrap.sc-axis-y');

      wrap_entr.append('g').attr('class', 'sc-' + modelClass + '-wrap');
      var model_wrap = wrap.select('.sc-' + modelClass + '-wrap');

      wrap_entr.append('g').attr('class', 'sc-controls-wrap');
      var controls_wrap = wrap.select('.sc-controls-wrap');
      wrap_entr.append('g').attr('class', 'sc-legend-wrap');
      var legend_wrap = wrap.select('.sc-legend-wrap');

      wrap_entr.append('g').attr('class', 'sc-guide-wrap');
      var guide_wrap = wrap.select('.sc-guide-wrap');

      //------------------------------------------------------------
      // Main chart draw

      chart.render = function() {

        // Chart layout variables
        var renderWidth, renderHeight,
            innerMargin,
            innerWidth, innerHeight;

        containerWidth = parseInt(container.style('width'), 10);
        containerHeight = parseInt(container.style('height'), 10);

        renderWidth = width || containerWidth || 960;
        renderHeight = height || containerHeight || 400;

        availableWidth = renderWidth - margin.left - margin.right;
        availableHeight = renderHeight - margin.top - margin.bottom;

        innerMargin = {top: 0, right: 0, bottom: 0, left: 0};
        innerWidth = availableWidth - innerMargin.left - innerMargin.right;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;

        xTickMaxWidth = Math.max(availableWidth * 0.2, 75);

        wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        wrap.select('.sc-background')
          .attr('width', renderWidth)
          .attr('height', renderHeight);

        //------------------------------------------------------------
        // Title & Legend & Controls

        // Header variables
        var maxControlsWidth = 0,
            maxLegendWidth = 0,
            widthRatio = 0,
            headerHeight = 0,
            titleBBox = {width: 0, height: 0},
            controlsHeight = 0,
            legendHeight = 0,
            trans = '',
            xpos = 0,
            ypos = 0;

        title_wrap.select('.sc-title').remove();

        if (showTitle) {
          title_wrap
            .append('text')
              .attr('class', 'sc-title')
              .attr('x', direction === 'rtl' ? availableWidth : 0)
              .attr('y', 0)
              .attr('dy', '.75em')
              .attr('text-anchor', 'start')
              .attr('stroke', 'none')
              .attr('fill', 'black')
              .text(properties.title);

          titleBBox = utility.getTextBBox(title_wrap.select('.sc-title'));
          headerHeight += titleBBox.height;
        }

        if (showControls) {
          controls
            .id('controls_' + model.id())
            .strings(chart.strings().controls)
            .color(['#444'])
            .align('left')
            .height(availableHeight - headerHeight);
          controls_wrap
            .datum(controlsData)
            .call(controls);

          maxControlsWidth = controls.calcMaxWidth();
        }

        if (showLegend) {
          legend
            .id('legend_' + model.id())
            .strings(chart.strings().legend)
            .align('right')
            .height(availableHeight - headerHeight);
          legend_wrap
            .datum(data)
            .call(legend);

          maxLegendWidth = legend.calcMaxWidth();
        }

        // calculate proportional available space
        widthRatio = availableWidth / (maxControlsWidth + maxLegendWidth);
        maxControlsWidth = Math.floor(maxControlsWidth * widthRatio);
        maxLegendWidth = Math.floor(maxLegendWidth * widthRatio);

        if (showControls) {
          controls
            .arrange(maxControlsWidth);
          maxLegendWidth = availableWidth - controls.width();
        }

        if (showLegend) {
          legend
            .arrange(maxLegendWidth);
          maxControlsWidth = availableWidth - legend.width();
        }

        if (showControls) {
          xpos = direction === 'rtl' ? availableWidth - controls.width() : 0;
          ypos = showTitle ? titleBBox.height : - controls.margin().top;
          controls_wrap
            .attr('transform', 'translate(' + xpos + ',' + ypos + ')');
          controlsHeight = controls.height();
        }

        if (showLegend) {
          var legendLinkBBox = utility.getTextBBox(legend_wrap.select('.sc-menu-link')),
              legendSpace = availableWidth - titleBBox.width - 6,
              legendTop = showTitle && !showControls && legend.collapsed() && legendSpace > legendLinkBBox.width ? true : false;
          xpos = direction === 'rtl' ? 0 : availableWidth - legend.width();
          ypos = titleBBox.height;
          if (legendTop) {
            ypos = titleBBox.height - legend.height() / 2 - legendLinkBBox.height / 2;
          } else if (!showTitle) {
            ypos = 0 - legend.margin().top;
          }
          legend_wrap
            .attr('transform', 'translate(' + xpos + ',' + ypos + ')');
          legendHeight = legendTop ? 12 : legend.height();
        }

        // Recalc inner margins based on legend and control height
        headerHeight += Math.max(controlsHeight, legendHeight);
        innerHeight = availableHeight - headerHeight - innerMargin.top - innerMargin.bottom;

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
          // model.scatter.resetDimensions(innerWidth, innerHeight);
          x.range([0, innerWidth]);
          y.range([innerHeight, 0]);
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
          .ticks(model.offset() === 'wiggle' ? 0 : null)
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
            var key = d.seriesKey,
                xval = xValueFormat(model.x()(d)),
                yval = yValueFormat(model.y()(d)),
                // content = tooltipContent(key, xval, yval, d, chart);
                content = tooltipContent(eo, properties);
            guidePos.clientY = eo.origin.top + y(d[1]);
            d3.select(guidetips[i]).select('.tooltip-inner').html(content);
            tooltip.position(that.parentNode, guidetips[i], guidePos, 'e');
          });

          // Top date
          xData.forEach(function(d, i) {
            var xval = xValueFormat(xpos);
            guidePos.clientY = eo.origin.top;
            d3.select(guidetips['x']).select('.tooltip-inner').html(xval);
            tooltip.position(that.parentNode, guidetips['x'], guidePos, 's');
          });

        };

        //------------------------------------------------------------
        // Final repositioning

        innerMargin.top += headerHeight;

        trans = innerMargin.left + ',';
        trans += innerMargin.top + (xAxis.orient() === 'bottom' ? innerHeight : 0);
        xAxis_wrap
          .attr('transform', 'translate(' + trans + ')');

        trans = innerMargin.left + (yAxis.orient() === 'left' ? 0 : innerWidth) + ',';
        trans += innerMargin.top;
        yAxis_wrap
          .attr('transform', 'translate(' + trans + ')');

        trans = innerMargin.left + ',' + innerMargin.top;
        model_wrap
          .attr('transform', 'translate(' + trans + ')');
        guide_wrap
          .attr('transform', 'translate(' + trans + ')');

      };

      //============================================================

      chart.render();

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      legend.dispatch.on('legendClick', function(series, i) {
        series.disabled = !series.disabled;
        series.active = 'inactive';

        // if there are no enabled data series, enable them all
        if (!data.filter(function(d) { return !d.disabled; }).length) {
          data.map(function(d) {
            d.disabled = false;
            return d;
          });
        }

        state.disabled = data.map(function(d) { return !!d.disabled; });
        chart.update();
        dispatch.call('stateChange', this, state);
      });

      controls.dispatch.on('legendClick', function(d, i) {
        //if the option is currently enabled (i.e., selected)
        if (!d.disabled) {
          return;
        }

        //set the controls all to false
        controlsData = controlsData.map(function(s) {
          s.disabled = true;
          return s;
        });
        //activate the the selected control option
        d.disabled = false;

        switch (d.key) {
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
        chart.update();
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
        if (controls.enabled()) {
          controls.dispatch.call('closeMenu', this);
        }
        if (legend.enabled()) {
          legend.dispatch.call('closeMenu', this);
        }
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
  chart.stacked = model;
  chart.legend = legend;
  chart.controls = controls;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  fc.rebind(chart, model, 'id', 'x', 'y', 'xScale', 'yScale', 'xDomain', 'yDomain', 'forceX', 'forceY', 'clipEdge', 'delay', 'color', 'fill', 'classes', 'gradient', 'locality');
  fc.rebind(chart, model, 'offset', 'order', 'style');
  fc.rebind(chart, xAxis, 'rotateTicks', 'reduceXTicks', 'staggerTicks', 'wrapTicks');

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
      var p = {orientation: params.orientation || 'horizontal', position: params.position || 'base'};
      return model.gradient()(d, d.seriesIndex, p);
    };

    model.color(color);
    model.fill(fill);
    model.classes(classes);

    // don't enable this since controls get a custom function
    // controls.color(color);
    // controls.classes(classes);
    legend.color(color);
    legend.classes(classes);

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

  chart.showTitle = function(_) {
    if (!arguments.length) { return showTitle; }
    showTitle = _;
    return chart;
  };

  chart.showControls = function(_) {
    if (!arguments.length) { return showControls; }
    showControls = _;
    return chart;
  };

  chart.showLegend = function(_) {
    if (!arguments.length) { return showLegend; }
    showLegend = _;
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
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    model.direction(_);
    xAxis.direction(_);
    yAxis.direction(_);
    legend.direction(_);
    controls.direction(_);
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
