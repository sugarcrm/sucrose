sucrose.models.gaugeChart = function() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 10, right: 10, bottom: 10, left: 10},
      width = null,
      height = null,
      showTitle = false,
      showLegend = true,
      direction = 'ltr',
      tooltip = null,
      tooltips = true,
      tooltipContent = function(key, y, e, graph) {
        return '<h3>' + key + '</h3>' +
               '<p>' + y + '</p>';
      },
      x,
      y, //can be accessed via chart.yScale()
      strings = {
        legend: {close: 'Hide legend', open: 'Show legend'},
        controls: {close: 'Hide controls', open: 'Show controls'},
        noData: 'No Data Available.',
        noLabel: 'undefined'
      },
      dispatch = d3.dispatch('chartClick', 'tooltipShow', 'tooltipHide', 'tooltipMove');

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var gauge = sucrose.models.gauge(),
      legend = sucrose.models.legend()
        .align('center');

  var showTooltip = function(eo, offsetElement) {
    var y = gauge.valueFormat()((eo.point.y1 - eo.point.y0)),
        content = tooltipContent(eo.point.key, y, eo, chart);

    tooltip = sucrose.tooltip.show(eo.e, content, null, null, offsetElement);
  };

  //============================================================

  function chart(selection) {

    selection.each(function(chartData) {

      var properties = chartData.properties,
          data = chartData.data,
          container = d3.select(this),
          that = this,
          availableWidth = (width || parseInt(container.style('width'), 10) || 960) - margin.left - margin.right,
          availableHeight = (height || parseInt(container.style('height'), 10) || 400) - margin.top - margin.bottom,
          innerWidth = availableWidth,
          innerHeight = availableHeight,
          innerMargin = {top: 0, right: 0, bottom: 0, left: 0};

      chart.update = function() {
        container.transition().call(chart);
      };

      chart.container = this;

      //------------------------------------------------------------
      // Display No Data message if there's nothing to show.

      if (!data || !data.length) {
        var noDataText = container.selectAll('.sc-noData').data([chart.strings().noData]);

        noDataText.enter().append('text')
          .attr('class', 'sucrose sc-noData')
          .attr('dy', '-.7em')
          .style('text-anchor', 'middle');

        noDataText
          .attr('x', margin.left + availableWidth / 2)
          .attr('y', margin.top + availableHeight / 2)
          .text(function(d) {
            return d;
          });

        return chart;
      } else {
        container.selectAll('.sc-noData').remove();
      }

      //------------------------------------------------------------
      // Process data
      //add series index to each data point for reference
      data.map(function(d, i) {
        d.series = i;
      });

      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = container.selectAll('g.sc-wrap.sc-gaugeChart').data([data]),
          gEnter = wrap.enter().append('g').attr('class', 'sucrose sc-wrap sc-gaugeChart').append('g'),
          g = wrap.select('g').attr('class', 'sc-chartWrap');

      gEnter.append('rect').attr('class', 'sc-background')
        .attr('x', -margin.left)
        .attr('y', -margin.top)
        .attr('fill', '#FFF');

      g.select('.sc-background')
        .attr('width', availableWidth + margin.left + margin.right)
        .attr('height', availableHeight + margin.top + margin.bottom);

      gEnter.append('g').attr('class', 'sc-titleWrap');
      var titleWrap = g.select('.sc-titleWrap');
      gEnter.append('g').attr('class', 'sc-gaugeWrap');
      var gaugeWrap = g.select('.sc-gaugeWrap');
      gEnter.append('g').attr('class', 'sc-legendWrap');
      var legendWrap = g.select('.sc-legendWrap');

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      //------------------------------------------------------------
      // Title & Legend

      var titleBBox = {width: 0, height: 0};
      titleWrap.select('.sc-title').remove();

      if (showTitle && properties.title) {
        titleWrap
          .append('text')
            .attr('class', 'sc-title')
            .attr('x', direction === 'rtl' ? availableWidth : 0)
            .attr('y', 0)
            .attr('dy', '.75em')
            .attr('text-anchor', 'start')
            .text(properties.title)
            .attr('stroke', 'none')
            .attr('fill', 'black');

        titleBBox = sucrose.utils.getTextBBox(g.select('.sc-title'));

        innerMargin.top += titleBBox.height + 12;
      }

      var legendLinkBBox = {width: 0, height: 0};

      if (showLegend) {
        legend
          .id('legend_' + chart.id())
          .strings(chart.strings().legend)
          .align('center')
          .height(availableHeight - innerMargin.top);
        legendWrap
          .datum(data)
          .call(legend);

        legend
          .arrange(availableWidth);

        var legendLinkBBox = sucrose.utils.getTextBBox(legendWrap.select('.sc-legend-link')),
            legendSpace = availableWidth - titleBBox.width - 6,
            legendTop = showTitle && legend.collapsed() && legendSpace > legendLinkBBox.width ? true : false,
            xpos = direction === 'rtl' || !legend.collapsed() ? 0 : availableWidth - legend.width(),
            ypos = titleBBox.height;
        if (legendTop) {
          ypos = titleBBox.height - legend.height() / 2 - legendLinkBBox.height / 2;
        } else if (!showTitle) {
          ypos = - legend.margin().top;
        }

        legendWrap
          .attr('transform', 'translate(' + xpos + ',' + ypos + ')');

        innerMargin.top += legendTop ? 0 : legend.height() - 12;
      }

      // Recalc inner margins
      innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;

      //------------------------------------------------------------
      // Main Chart Component(s)

      gauge
        .width(innerWidth)
        .height(innerHeight);

      gaugeWrap
        .datum(chartData)
        .attr('transform', 'translate(' + innerMargin.left + ',' + innerMargin.top + ')')
        .transition()
          .call(gauge);

      //gauge.setPointer(properties.value);

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      dispatch.on('tooltipShow', function(eo) {
        if (tooltips) {
          showTooltip(eo, that.parentNode);
        }
      });

      dispatch.on('tooltipMove', function(e) {
        if (tooltip) {
          sucrose.tooltip.position(that.parentNode, tooltip, e);
        }
      });

      dispatch.on('tooltipHide', function() {
        if (tooltips) {
          sucrose.tooltip.cleanup();
        }
      });

      dispatch.on('chartClick', function() {
        if (legend.enabled()) {
          legend.dispatch.closeMenu();
        }
      });

    });

    return chart;
  }

  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  gauge.dispatch.on('elementMouseover.tooltip', function(eo) {
    dispatch.tooltipShow(eo);
  });

  gauge.dispatch.on('elementMousemove.tooltip', function(e) {
    dispatch.tooltipMove(e);
  });

  gauge.dispatch.on('elementMouseout.tooltip', function() {
    dispatch.tooltipHide();
  });

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.dispatch = dispatch;
  chart.gauge = gauge;
  chart.legend = legend;

  d3.rebind(chart, gauge, 'id', 'x', 'y', 'color', 'fill', 'classes', 'gradient', 'locality');
  d3.rebind(chart, gauge, 'valueFormat', 'values', 'showLabels', 'showPointer', 'setPointer', 'ringWidth', 'labelThreshold', 'maxValue', 'minValue', 'transitionMs');

  chart.colorData = function(_) {
    var type = arguments[0],
        params = arguments[1] || {};
    var color = function(d, i) {
          return sucrose.utils.defaultColor()(d, d.series);
        };
    var classes = function(d, i) {
          return 'sc-arc-path sc-series-' + d.series;
        };

    switch (type) {
      case 'graduated':
        color = function(d, i) {
          return d3.interpolateHsl(d3.rgb(params.c1), d3.rgb(params.c2))(d.series / params.l);
        };
        break;
      case 'class':
        color = function() {
          return 'inherit';
        };
        classes = function(d, i) {
          var iClass = (d.series * (params.step || 1)) % 14;
          iClass = (iClass > 9 ? '' : '0') + iClass;
          return 'sc-arc-path sc-series-' + d.series + ' sc-fill' + iClass;
        };
        break;
      case 'data':
        color = function(d, i) {
          return d.classes ? 'inherit' : d.color || sucrose.utils.defaultColor()(d, d.series);
        };
        classes = function(d, i) {
          return 'sc-arc-path sc-series-' + d.series + (d.classes ? ' ' + d.classes : '');
        };
        break;
    }

    var fill = (!params.gradient) ? color : function(d, i) {
      return gauge.gradient(d, d.series);
    };

    gauge.color(color);
    gauge.fill(fill);
    gauge.classes(classes);

    legend.color(color);
    legend.classes(classes);

    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) {
      return margin;
    }
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        margin[prop] = _[prop];
      }
    }
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) {
      return width;
    }
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) {
      return height;
    }
    height = _;
    return chart;
  };

  chart.showTitle = function(_) {
    if (!arguments.length) {
      return showTitle;
    }
    showTitle = _;
    return chart;
  };

  chart.showLegend = function(_) {
    if (!arguments.length) {
      return showLegend;
    }
    showLegend = _;
    return chart;
  };

  chart.tooltip = function(_) {
    if (!arguments.length) {
      return tooltip;
    }
    tooltip = _;
    return chart;
  };

  chart.tooltips = function(_) {
    if (!arguments.length) {
      return tooltips;
    }
    tooltips = _;
    return chart;
  };

  chart.tooltipContent = function(_) {
    if (!arguments.length) {
      return tooltipContent;
    }
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

  chart.direction = function(_) {
    if (!arguments.length) {
      return direction;
    }
    direction = _;
    legend.direction(_);
    return chart;
  };

  //============================================================

  return chart;
};
