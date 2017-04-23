import d3 from 'd3v4';
import fc from 'd3fc-rebind';
import utility from '../utility.js';
import tooltip from '../tooltip.js';
import treemap from '../models/treemap.js';
import menu from '../models/menu.js';

export default function treemapChart() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 10, right: 10, bottom: 10, left: 10},
      width = null,
      height = null,
      showTitle = false,
      showLegend = false,
      direction = 'ltr',
      tooltips = true,
      colorData = 'default',
      //create a clone of the d3 array
      colorArray = d3.scaleOrdinal(d3.schemeCategory20).range().map(utility.identity),
      x, //can be accessed via chart.xScale()
      y, //can be accessed via chart.yScale()
      strings = {
        legend: {close: 'Hide legend', open: 'Show legend'},
        controls: {close: 'Hide controls', open: 'Show controls'},
        noData: 'No Data Available.',
        noLabel: 'undefined'
      },
      dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'tooltipMove', 'elementMousemove');

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var model = treemap(),
      legend = menu();

  var tt = null;

  var tooltipContent = function(point) {
        var tt = '<h3>' + point.data.name + '</h3>' +
                 '<p>' + utility.numberFormatSI(point.value) + '</p>';
        return tt;
      };

  var showTooltip = function(eo, offsetElement) {
        var content = tooltipContent(eo.point);
        return tooltip.show(eo.e, content, null, null, offsetElement);
      };

  //============================================================

  function chart(selection) {
    selection.each(function(chartData) {

      var that = this,
          container = d3.select(this);

      var data = [chartData];

      var containerWidth = parseInt(container.style('width'), 10),
          containerHeight = parseInt(container.style('height'), 10);

      chart.update = function() { container.transition().duration(300).call(chart); };
      chart.container = this;

      //------------------------------------------------------------
      // Private method for displaying no data message.

      function displayNoData(d) {
        var hasData = d && d.length && d.filter(function(d) { return d && d.children && d.children.length; }).length,
            x = (containerWidth - margin.left - margin.right) / 2 + margin.left,
            y = (containerHeight - margin.top - margin.bottom) / 2 + margin.top;
        return utility.displayNoData(hasData, container, chart.strings().noData, x, y);
      }

      // Check to see if there's nothing to show.
      if (displayNoData(data)) {
        return chart;
      }

      //------------------------------------------------------------

      //remove existing colors from default color array, if any
      // if (colorData === 'data') {
      //   removeColors(data[0]);
      // }

      //------------------------------------------------------------
      // Main chart draw

      chart.render = function() {

        containerWidth = parseInt(container.style('width'), 10);
        containerHeight = parseInt(container.style('height'), 10);

        // Chart layout variables
        var renderWidth, renderHeight,
            availableWidth, availableHeight;

        renderWidth = width || containerWidth || 960;
        renderHeight = height || containerHeight || 400;
        availableWidth = renderWidth - margin.left - margin.right;
        availableHeight = renderHeight - margin.top - margin.bottom;

        // Header variables
        var maxControlsWidth = 0,
            maxLegendWidth = 0,
            widthRatio = 0,
            headerHeight = 0,
            titleBBox = {width: 0, height: 0},
            controlsHeight = 0,
            legendHeight = 0,
            trans = '';

        //------------------------------------------------------------
        // Setup containers and skeleton of chart

        var wrap_bind = container.selectAll('g.sc-chart-wrap').data(data);
        var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-chart-wrap sc-chart-treemap');
        var wrap = container.select('.sc-chart-wrap').merge(wrap_entr);

        wrap_entr.append('rect').attr('class', 'sc-background')
          .attr('x', -margin.left)
          .attr('y', -margin.top)
          .attr('fill', '#FFF');

        wrap.select('.sc-background')
          .attr('width', renderWidth)
          .attr('height', renderHeight);

        wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        //------------------------------------------------------------
        // Title & Legend

        var titleHeight = 0,
            legendHeight = 0;

        if (showLegend) {
          g_entr.append('g').attr('class', 'sc-legendWrap');

          legend
            .id('legend_' + chart.id())
            .strings(chart.strings().legend)
            .width(availableWidth + margin.left)
            .height(availableHeight);

          g.select('.sc-legendWrap')
            .datum(data)
            .call(legend);

          legendHeight = legend.height() + 10;

          if (margin.top !== legendHeight + titleHeight) {
            margin.top = legendHeight + titleHeight;
            availableHeight = renderHeight - margin.top - margin.bottom;
          }

          g.select('.sc-legendWrap')
            .attr('transform', 'translate(' + (-margin.left) + ',' + (-margin.top) + ')');
        }

        if (showTitle && properties.title) {
          g_entr.append('g').attr('class', 'sc-title-wrap');

          g.select('.sc-title').remove();

          g.select('.sc-title-wrap')
            .append('text')
              .attr('class', 'sc-title')
              .attr('x', 0)
              .attr('y', 0)
              .attr('text-anchor', 'start')
              .text(properties.title)
              .attr('stroke', 'none')
              .attr('fill', 'black');

          titleHeight = parseInt(g.select('.sc-title').style('height'), 10) +
            parseInt(g.select('.sc-title').style('margin-top'), 10) +
            parseInt(g.select('.sc-title').style('margin-bottom'), 10);

          if (margin.top !== titleHeight + legendHeight) {
            margin.top = titleHeight + legendHeight;
            availableHeight = renderHeight - margin.top - margin.bottom;
          }

          g.select('.sc-title-wrap')
            .attr('transform', 'translate(0,' + (-margin.top + parseInt(g.select('.sc-title').style('height'), 10)) + ')');
        }

        //------------------------------------------------------------
        // Main Chart Component(s)

        model
          .width(availableWidth)
          .height(availableHeight);

        wrap
          .datum(data.filter(function(d) { return !d.disabled; }))
          .transition()
            .call(model);

      };

      //============================================================

      chart.render();

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      legend.dispatch.on('legendClick', function(d, i) {
        d.disabled = !d.disabled;

        if (!data.filter(function(d) { return !d.disabled; }).length) {
          data.map(function(d) {
            d.disabled = false;
            wrap.selectAll('.sc-series').classed('disabled', false);
            return d;
          });
        }

        container.transition().duration(300).call(chart);
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

  model.dispatch.on('elementMouseover', function(eo) {
    dispatch.call('tooltipShow', this, eo);
  });

  model.dispatch.on('elementMousemove', function(e) {
    dispatch.call('tooltipMove', this, e);
  });

  model.dispatch.on('elementMouseout', function() {
    dispatch.call('tooltipHide', this);
  });

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.dispatch = dispatch;
  chart.legend = legend;
  chart.treemap = model;

  fc.rebind(chart, model, 'x', 'y', 'xDomain', 'yDomain', 'id', 'delay', 'leafClick', 'getValue', 'getKey', 'groups', 'duration', 'color', 'fill', 'classes', 'gradient', 'direction');

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

    var fill = (!params.gradient) ? color : function(d, i) {
      var p = {orientation: params.orientation || 'horizontal', position: params.position || 'base'};
      return model.gradient()(d, i, p);
    };

    model.color(color);
    model.fill(fill);
    model.classes(classes);

    legend.color(color);
    legend.classes(classes);

    colorData = arguments[0];

    return chart;
  };

  chart.x = function(_) {
    if (!arguments.length) { return getX; }
    getX = _;
    model.x(_);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) { return getY; }
    getY = _;
    model.y(_);
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) { return margin; }
    margin.top    = typeof _.top    !== 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  !== 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom !== 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   !== 'undefined' ? _.left   : margin.left;
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

  chart.strings = function(_) {
    if (!arguments.length) {
      return strings;
    }
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        strings[prop] = _[prop];
      }
    }
    return chart;
  };

  //============================================================

  return chart;
}
