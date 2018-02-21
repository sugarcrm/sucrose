import d3 from 'd3';
import utility from '../utility.js';
import tooltip from '../tooltip.js';
import language from '../language.js';
import headers from '../models/headers.js';
import pie from '../models/pie.js';

export default function pieChart() {

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
      exclusiveActive = true,
      strings = language();

  var dispatch = d3.dispatch('chartClick', 'elementClick', 'tooltipShow', 'tooltipHide', 'tooltipMove', 'stateChange', 'changeState');

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  // Chart components
  var model = pie();
  var header = headers();

  var controlsData = [];

  var tt = null;

  var tooltipContent = function(eo, properties) {
        // var label = properties.seriesLabel || strings.tooltip.key;
        var y = model.getValue()(eo);
        var x = properties.total ? (y * 100 / properties.total).toFixed(1) : 100;
        var yIsCurrency = properties.yDataType === 'currency';
        var point = {
          key: model.fmtKey()(eo),
          label: yIsCurrency ? strings.tooltip.amount : strings.tooltip.count,
          value: utility.numberFormat(y, 2, yIsCurrency, chart.locality()),
          percent: utility.numberFormat(x, 2, false, chart.locality())
        };
        return tooltip.single(point, strings);
      };

  var showTooltip = function(eo, offsetElement, properties) {
        var content = tooltipContent(eo, properties);
        return tooltip.show(eo.e, content, null, null, offsetElement);
      };

  var seriesClick = function(data, e, chart) { return; };

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
          modelClass = 'pie';

      var properties = chartData ? chartData.properties || {} : {},
          data = chartData ? chartData.data || null : null;

      var containerWidth = parseInt(container.style('width'), 10),
          containerHeight = parseInt(container.style('height'), 10);

      var xIsDatetime = properties.xDataType === 'datetime' || false,
          yIsCurrency = properties.yDataType === 'currency' || false;

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

      chart.setActiveState = function(series, state) {
        series.active = state;
      };

      chart.clearActive = function(reset) {
        data.forEach(function(s) {
          chart.setActiveState(s, reset || '');
        });
        delete state.active;
      };

      // accepts either an event object with actual series data or seriesIndex
      chart.seriesActivate = function(eo) {
        var series = eo.series || data[eo.seriesIndex];
        var activeState;
        if (!series) {
          return;
        }
        if (exclusiveActive) {
          // store toggle active state
          activeState = (
              typeof series.active === 'undefined' ||
              series.active === 'inactive' ||
              series.active === ''
            ) ? 'active' : '';
          // inactivate all series
          chart.clearActive(activeState === 'active' ? 'inactive' : '');
          // then activate the selected series
          chart.setActiveState(series, activeState);
          // set the state to a truthy map
          state.active = data.map(function(s) {
            return s.active === 'active';
          });
        } else {
          chart.dataSeriesActivate({series: series});
        }
      };

      // accepts either an event object with actual series data or seriesIndex
      chart.dataSeriesActivate = function(eo) {
        var series = eo.series;
        series.active = (!series.active || series.active === 'inactive') ? 'active' : 'inactive';
        // if you have activated a data series, inactivate the other non-active series
        if (series.active === 'active') {
          data
            .filter(function(d) {
              return d.active !== 'active';
            })
            .forEach(function(d) {
              d.active = 'inactive';
              return d;
            });
        }
        // if there are no active data series, inactivate them all
        if (!data.filter(function(d) { return d.active === 'active'; }).length) {
          chart.clearActive();
        }
      };

      // add series index to each data point for reference
      data.forEach(function(s, i) {
        s.seriesIndex = i;

        if (!s.values) {
          if (!s.value) {
            s.values = [];
          } else if (!isNaN(s.value)) {
            s.values = [{x: 0, y: parseInt(s.value, 10)}];
          }
        }

        s.values.forEach(function(p, j) {
          p.index = i;
          p.series = s;
          if (typeof p.value == 'undefined') {
            p.value = p.y;
          }
        });

        s.key = s.key || strings.noLabel;
        s.value = s.value || d3.sum(s.values, function(p) { return p.value; });
        s.count = s.count || s.values.length;
        s.disabled = s.disabled || s.value === 0;
      });

      // only sum enabled series
      var modelData = data.filter(function(d) { return !d.disabled; });

      if (!modelData.length) {
        modelData = [{values: []}]; // safety array
      }

      properties.count = d3.sum(modelData, function(d) { return d.count; });

      properties.total = d3.sum(modelData, function(d) { return d.value; });

      //set state.disabled
      state.disabled = data.map(function(d) { return !!d.disabled; });

      //------------------------------------------------------------
      // Display No Data message if there's nothing to show.

      if (!properties.total) {
        displayNoData();
        return chart;
      }

      header
        .chart(chart)
        .title(properties.title)
        .controlsData(controlsData)
        .legendData(data);

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
            availableWidth, availableHeight,
            innerMargin,
            innerWidth, innerHeight,
            headerHeight;

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
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;

        if (innerHeight < 100) {
          displayNoData(null, strings.displayError);
          return chart;
        }


        //------------------------------------------------------------
        // Main Chart Component(s)

        model
          .width(innerWidth)
          .height(innerHeight);

        model_wrap
          .datum(modelData)
          .attr('transform', utility.translation(innerMargin.left, innerMargin.top))
          .transition().duration(duration)
            .call(model);

      };

      //============================================================

      chart.render();

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      header.legend.dispatch.on('legendClick', function(series, i) {
        series.disabled = !series.disabled;
        series.active = false;

        // if there are no enabled data series, enable them all
        if (!data.filter(function(d) { return !d.disabled; }).length) {
          data.forEach(function(d) {
            d.disabled = false;
          });
        }

        // if there are no active data series, activate them all
        if (!data.filter(function(d) { return d.active === 'active'; }).length) {
          data.forEach(function(d) {
            d.active = '';
          });
        }

        state.disabled = data.map(function(d) { return !!d.disabled; });
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
          tooltip.position(that.parentNode, tt, e);
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
          modelData.forEach(function(series, i) {
            series.disabled = eo.disabled[i];
          });
          state.disabled = eo.disabled;
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
        dispatch.call('chartClick', this);
        seriesClick(data, eo, chart);
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
  chart.pie = model;
  chart.legend = header.legend;
  chart.controls = header.controls;
  chart.options = utility.optionsFunc.bind(chart);

  utility.rebind(chart, model, 'id', 'color', 'fill', 'classes', 'gradient', 'locality', 'textureFill');
  utility.rebind(chart, model, 'getKey', 'getValue', 'getCount', 'fmtKey', 'fmtValue', 'fmtCount');
  utility.rebind(chart, model, 'showLabels', 'showLeaders', 'donutLabelsOutside', 'pieLabelsOutside', 'labelThreshold');
  utility.rebind(chart, model, 'arcDegrees', 'rotateDegrees', 'minRadius', 'maxRadius', 'fixedRadius', 'startAngle', 'endAngle', 'donut', 'hole', 'holeFormat', 'donutRatio');
  utility.rebind(chart, header, 'showTitle', 'showControls', 'showLegend');

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

    var fill = !params.gradient ? color : function(d, i) {
      return model.gradientFill(d, d.seriesIndex);
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

  chart.seriesClick = function(_) {
    if (!arguments.length) {
      return seriesClick;
    }
    seriesClick = _;
    return chart;
  };

  //============================================================

  return chart;
}
