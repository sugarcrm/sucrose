import d3 from 'd3';
import utility from '../utility.js';
import tooltip from '../tooltip.js';
import language from '../language.js';
import headers from '../models/headers.js';
import treemap from '../models/treemap.js';

export default function treemapChart() {

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
      colorData = 'default',
      //create a clone of the d3 array
      colorArray = d3.scaleOrdinal(d3.schemeCategory20).range().map(utility.identity),
      state = {},
      strings = language();

  var dispatch = d3.dispatch(
        'chartClick', 'elementClick', 'tooltipShow', 'tooltipHide', 'tooltipMove',
        'elementMousemove'
      );

  var tooltipContent = function(point, properties) {
        var tt = '<h3>' + point.data.name + '</h3>' +
                 '<p>' + utility.numberFormatSI(point.value) + '</p>';
        return tt;
      };

  var seriesClick = function(data, i, chart) {
        return;
      };

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  // Chart components
  var model = treemap();
  var header = headers();

  var controlsData = [];
  var tt = null;

  var showTooltip = function(eo, offsetElement, properties) {
        var content = tooltipContent(eo.point, properties);
        return tooltip.show(eo.e, content, null, null, offsetElement);
      };

  header
    .showTitle(true)
    .showControls(false)
    .showLegend(false);


  //============================================================

  function chart(selection) {
    selection.each(function(chartData) {

      var that = this,
          container = d3.select(this),
          modelClass = 'treemap';

      var properties = {};
      var data = [chartData];

      var containerWidth = parseInt(container.style('width'), 10),
          containerHeight = parseInt(container.style('height'), 10);

      chart.update = function() {
        container.transition().duration(duration).call(chart);
      };

      chart.setActiveState = function(child, state) {
        child.active = state;
        // series.values.forEach(function(v) {
        //   v.active = state;
        // });
      };

      chart.clearActive = function(d) {
        var parent = d || data;
        if (parent.children) {
          parent.children.forEach(function(child) {
            chart.setActiveState(child, '');
          });
        }
      };

      chart.cellActivate = function(eo) {
        // seriesClick is defined outside chart scope, so when it calls
        // cellActivate, it only has access to (data, eo, chart)
        var cell = eo.d;
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

        // unset entire active state first
        chart.clearActive(cell.parent);

        cell.active = activeState;

        chart.render();
      };

      chart.container = this;


      //------------------------------------------------------------
      // Private method for displaying no data message.

      function displayNoData(data, msg) {
        var hasData = data && data.length && data.filter(function(series) {
          return series && series.children && series.children.length;
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

      // only sum enabled series
      var modelData = data.filter(function(d) { return !d.disabled; });

      //remove existing colors from default color array, if any
      // if (colorData === 'data') {
      //   removeColors(data[0]);
      // }

      //------------------------------------------------------------
      // Display No Data message if there's nothing to show.

      if (!modelData.length) {
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
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-chart-wrap sc-chart-' + modelClass);
      var wrap = container.select('.sc-chart-wrap').merge(wrap_entr);

      wrap_entr.append('defs');

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
        // innerMargin.top += headerHeight;
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

        // if there are no enabled data series, enable them all
        if (!data.filter(function(d) { return !d.disabled; }).length) {
          data.forEach(function(d) {
            d.disabled = false;
          });
        }

        chart.update();
      });

      dispatch.on('tooltipShow', function(eo) {
        if (tooltips) {
          tt = showTooltip(eo, that.parentNode);
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

      model.dispatch.on('chartClick', function(eo) {
        if (eo.children) {
          chart.clearActive(eo);
        }
      });

      model.dispatch.on('elementClick', function(eo) {
        seriesClick(data, eo, chart);
      });


      //============================================================

      // function removeColors(d) {
      //   var i, l;
      //   if (d.color && colorArray.indexOf(d.color) !== -1) {
      //     colorArray.splice(colorArray.indexOf(d.color), 1);
      //   }
      //   if (d.children) {
      //     l = d.children.length;
      //     for (i = 0; i < l; i += 1) {
      //       removeColors(d.children[i]);
      //     }
      //   }
      // }

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
  chart.treemap = model;
  chart.legend = header.legend;
  chart.options = utility.optionsFunc.bind(chart);

  utility.rebind(chart, model, 'id', 'color', 'fill', 'classes', 'gradient');
  utility.rebind(chart, model, 'leafClick', 'getValue', 'getKey', 'textureFill');
  utility.rebind(chart, header, 'showTitle', 'showControls', 'showLegend');

  chart.colorData = function(_) {
    if (!arguments.length) { return colorData; }

    var type = arguments[0],
        params = arguments[1] || {};
    var color = function(d, i) {
          var c = (type === 'data' && d.color) ? {color: d.color} : {};
          return utility.getColor(colorArray)(c, i);
        };
    var classes = function(d, i) {
          return 'sc-child';
        };

    switch (type) {
      case 'graduated':
        color = function(d, i, l) {
          return d3.interpolateHsl(d3.rgb(params.c1), d3.rgb(params.c2))(i / l);
        };
        break;
      case 'class':
        color = function() {
          return 'inherit';
        };
        classes = function(d, i) {
          var iClass = (i * (params.step || 1)) % 14;
          iClass = (iClass > 9 ? '' : '0') + iClass;
          return 'sc-child ' + (d.className || 'sc-fill' + iClass);
        };
        break;
    }

    var fill = !params.gradient ? color : function(d, i) {
      var p = {
        orientation: params.orientation || 'horizontal',
        position: params.position || 'base'
      };
      return model.gradientFill(d, i, p);
    };

    model.color(color);
    model.fill(fill);
    model.classes(classes);

    header.legend.color(color);
    header.legend.classes(classes);

    colorData = arguments[0];

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
    if (!arguments.length) { return seriesClick; }
    seriesClick = _;
    return chart;
  };

  //============================================================

  return chart;
}
