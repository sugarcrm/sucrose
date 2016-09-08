sucrose.models.bubbleChart = function() {

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
      getX = function(d) { return d.x; },
      getY = function(d) { return d.y; },
      forceY = [0], // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do chart.forceY([]) to remove
      xDomain,
      yDomain,
      delay = 200,
      groupBy = function(d) { return d.y; },
      filterBy = function(d) { return d.y; },
      clipEdge = false, // if true, masks lines within x and y scale
      seriesLength = 0,
      reduceYTicks = false, // if false a tick will show for every data point
      bubbleClick = function(e) { return; },
      format = d3.timeFormat('%Y-%m-%d'),
      tooltip = null,
      tooltips = true,
      tooltipContent = function(key, x, y, e, graph) {
        return '<h3>' + key + '</h3>' +
               '<p>' + y + ' on ' + x + '</p>';
      },
      x,
      y,
      state = {},
      strings = {
        legend: {close: 'Hide legend', open: 'Show legend'},
        controls: {close: 'Hide controls', open: 'Show controls'},
        noData: 'No Data Available.',
        noLabel: 'undefined'
      },
      dispatch = d3.dispatch('chartClick', 'tooltipShow', 'tooltipHide', 'tooltipMove', 'stateChange', 'changeState');

  //============================================================
  // Private Variables
  //------------------------------------------------------------
  var xValueFormat = function(d, labels, isDate) {
          var val = isNaN(parseInt(d, 10)) || !labels || !Array.isArray(labels) ?
            d : labels[parseInt(d, 10)] || d;
          return isDate ? sucrose.utils.dateFormat(val, 'MMM', chart.locality()) : val;
      };
  var yValueFormat = function(d, labels, isCurrency) {
          var val = isNaN(parseInt(d, 10)) || !labels || !Array.isArray(labels) ?
            d : labels[parseInt(d, 10)].key || d;
          return sucrose.utils.numberFormatSI(val, 2, isCurrency, chart.locality());
      };

  var scatter = sucrose.models.scatter()
        .padData(true)
        .padDataOuter(-1)
        .size(function(d) { return d.y; })
        .sizeRange([256, 1024])
        .singlePoint(true),
      xAxis = sucrose.models.axis(),
      yAxis = sucrose.models.axis(),
      legend = sucrose.models.legend()
        .align('center')
        .key(function(d) { return d.key + '%'; });

  var showTooltip = function(eo, offsetElement, properties) {
    var key = eo.series.key,
        x = eo.point.x,
        y = eo.point.y,
        content = tooltipContent(key, x, y, eo, chart),
        gravity = eo.value < 0 ? 'n' : 's';

    tooltip = sucrose.tooltip.show(eo.e, content, gravity, null, offsetElement);
  };

  //============================================================

  function chart(selection) {

    selection.each(function(chartData) {

      var that = this,
          container = d3.select(this);

      var properties = chartData ? chartData.properties : {},
          data = chartData ? chartData.data : null;

      var filteredData,
          timeExtent,
          xD,
          yD,
          yValues,
          xIsDatetime = chartData.properties.xDataType === 'datetime' || false,
          yIsCurrency = chartData.properties.yDataType === 'currency' || false;

      chart.container = this;

      chart.update = function() {
        container.transition().call(chart);
      };

      //------------------------------------------------------------
      // Private method for displaying no data message.

      function displayNoData(d) {
        if (d && d.length) {
          container.selectAll('.sc-noData').remove();
          return false;
        }

        container.select('.sucrose.sc-wrap').remove();

        var w = width || parseInt(container.style('width'), 10) || 960,
            h = height || parseInt(container.style('height'), 10) || 400,
            noDataText = container.selectAll('.sc-noData').data([chart.strings().noData]);

        noDataText.enter().append('text')
          .attr('class', 'sucrose sc-noData')
          .attr('dy', '-.7em')
          .style('text-anchor', 'middle');

        noDataText
          .attr('x', margin.left + w / 2)
          .attr('y', margin.top + h / 2)
          .text(function(d) {
            return d;
          });

        return true;
      }

      // Check to see if there's nothing to show.
      if (displayNoData(data)) {
        return chart;
      }

      //------------------------------------------------------------
      // Process data

      // set title display option
      showTitle = showTitle && properties.title;

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
            gOffset = gHeight * 0.25,
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

            yValues.push({y: d3.min(s.values.map(function(p) { return p.y; })), key: s.key});

            return s;
          });

        return yValues;
      }

      // set state.disabled
      state.disabled = data.map(function(d) { return !!d.disabled; });

      // Now that group calculations are done,
      // group the data by filter so that legend filters
      filteredData = d3.nest()
        .key(filterBy)
        .entries(data);

      //add series index to each data point for reference
      filteredData = filteredData
        .sort(function(a, b) {
          //sort legend by key
          return parseInt(a.key, 10) < parseInt(b.key, 10) ? -1 : parseInt(a.key, 10) > parseInt(b.key, 10) ? 1 : 0;
        })
        .map(function(d, i) {
          d.series = i;
          d.classes = d.values[0].classes;
          d.color = d.values[0].color;
          return d;
        });

      xD = getTimeDomain(filteredData);

      yValues = getGroupTicks(data);

      yD = d3.extent(
            d3.merge(
              filteredData.map(function(d) {
                return d.values.map(function(d, i) {
                  return getY(d, i);
                });
              })
            ).concat(forceY)
          );

      //------------------------------------------------------------
      // Setup Scales and Axes

      x = scatter.xScale();
      y = scatter.yScale();

      xAxis
        .orient('bottom')
        .valueFormat(xValueFormat)
        .tickSize(0)
        .tickPadding(4)
        .highlightZero(false)
        .showMaxMin(false)
        .ticks(d3.timeMonths, 1)
        .scale(x)
        .tickValues(getTimeTicks(xD));
      yAxis
        .orient('left')
        .valueFormat(yValueFormat)
        .tickPadding(7)
        .highlightZero(false)
        .showMaxMin(false)
        .scale(y)
        .ticks(yValues.length)
        .tickValues(yValues.map(function(d, i) {
          return yValues[i].y;
        }));

      //------------------------------------------------------------
      // Main chart draw

      chart.render = function() {

        // Chart layout variables
        var renderWidth = width || parseInt(container.style('width'), 10) || 960,
            renderHeight = height || parseInt(container.style('height'), 10) || 400,
            availableWidth = renderWidth - margin.left - margin.right,
            availableHeight = renderHeight - margin.top - margin.bottom,
            innerWidth = availableWidth,
            innerHeight = availableHeight,
            innerMargin = {top: 0, right: 0, bottom: 0, left: 0};

        // Header variables
        var maxBubbleSize = Math.sqrt(scatter.sizeRange()[1] / Math.PI),
            headerHeight = 0,
            titleBBox = {width: 0, height: 0},
            trans = '';

        //------------------------------------------------------------
        // Setup containers and skeleton of chart

        var wrap_bind = container.selectAll('.sucrose.sc-wrap').data([filteredData]);
        var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sucrose sc-wrap sc-bubble-chart');
        var wrap = container.select('.sucrose.sc-wrap').merge(wrap_entr);
        var g_entr = wrap_entr.append('g').attr('class', 'sc-chart-wrap');
        var g = container.select('g.sc-chart-wrap').merge(g_entr);

        g_entr.append('rect').attr('class', 'sc-background')
          .attr('x', -margin.left)
          .attr('y', -margin.top)
          .attr('fill', '#FFF');

        g.select('.sc-background')
          .attr('width', availableWidth + margin.left + margin.right)
          .attr('height', availableHeight + margin.top + margin.bottom);

        var title_entr = g_entr.append('g').attr('class', 'sc-title-wrap');
        var title_wrap = g.select('.sc-title-wrap').merge(title_entr);

        var xAxis_entr = g_entr.append('g').attr('class', 'sc-x sc-axis');
        var xAxis_wrap = g.select('.sc-x.sc-axis').merge(xAxis_entr);

        var yAxis_entr = g_entr.append('g').attr('class', 'sc-y sc-axis');
        var yAxis_wrap = g.select('.sc-y.sc-axis').merge(yAxis_entr);

        var bubbles_entr = g_entr.append('g').attr('class', 'sc-bubbles-wrap');
        var bubbles_wrap = g.select('.sc-bubbles-wrap').merge(bubbles_entr);

        var legend_entr = g_entr.append('g').attr('class', 'sc-legend-wrap');
        var legend_wrap = g.select('.sc-legend-wrap').merge(legend_entr);

        wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        //------------------------------------------------------------
        // Title & Legend

        title_wrap.select('.sc-title').remove();

        if (showTitle) {
          title_wrap
            .append('text')
              .attr('class', 'sc-title')
              .attr('x', direction === 'rtl' ? availableWidth : 0)
              .attr('y', 0)
              .attr('dy', '.75em')
              .attr('text-anchor', 'start')
              .text(properties.title)
              .attr('stroke', 'none')
              .attr('fill', 'black');

          titleBBox = sucrose.utils.getTextBBox(title_wrap.select('.sc-title'));
          headerHeight += titleBBox.height;
        }

        if (showLegend) {
          legend
            .id('legend_' + chart.id())
            .strings(chart.strings().legend)
            .align('center')
            .height(availableHeight - headerHeight);
          legend_wrap
            .datum(filteredData)
            .call(legend);

          legend
            .arrange(availableWidth);

          var legendLinkBBox = sucrose.utils.getTextBBox(legend_wrap.select('.sc-legend-link')),
              legendSpace = availableWidth - titleBBox.width - 6,
              legendTop = showTitle && legend.collapsed() && legendSpace > legendLinkBBox.width ? true : false,
              xpos = direction === 'rtl' || !legend.collapsed() ? 0 : availableWidth - legend.width(),
              ypos = titleBBox.height;
          if (legendTop) {
            ypos = titleBBox.height - legend.height() / 2 - legendLinkBBox.height / 2;
          } else if (!showTitle) {
            ypos = - legend.margin().top;
          }
          legend_wrap
            .attr('transform', 'translate(' + xpos + ',' + ypos + ')');

          headerHeight += legendTop ? 12 : legend.height();
        }

        // Recalc inner margins based on legend and control height
        innerHeight = availableHeight - headerHeight - innerMargin.top - innerMargin.bottom;

        //------------------------------------------------------------
        // Main Chart Components

        scatter
          .width(innerWidth)
          .height(innerHeight)
          .id(chart.id())
          .xDomain(xD)
          .yDomain(yD);

        bubbles_wrap
          .datum(filteredData.filter(function(d) {
            return !d.disabled;
          }))
          .transition().duration(chart.delay())
            .call(scatter);

        innerMargin.top += maxBubbleSize;

        //------------------------------------------------------------
        // Setup Axes

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
          scatter.resetDimensions(innerWidth, innerHeight);
        }

        // Y-Axis
        yAxis
          .margin(innerMargin)
          .tickFormat(function(d, i) {
            var label = yAxis.valueFormat()(i, yValues, yIsCurrency);
            return sucrose.utils.stringEllipsify(label, container, Math.max(availableWidth * 0.2, 75));
          });
        yAxis_wrap
          .call(yAxis);
        // reset inner dimensions
        yAxisMargin = yAxis.margin();
        setInnerMargins();
        setInnerDimensions();

        // X-Axis
        xAxis
          .tickSize(0)
          .margin(innerMargin)
          .tickFormat(function(d) {
            return xAxis.valueFormat()(d, null, xIsDatetime);
          });
        xAxis_wrap
          .call(xAxis);

        // reset inner dimensions
        xAxisMargin = xAxis.margin();
        setInnerMargins();
        setInnerDimensions();

        // recall y-axis to set final size based on new dimensions
        yAxis
          .tickSize(-innerWidth, 0)
          .margin(innerMargin);
        yAxis_wrap
          .call(yAxis);
        yAxis_wrap.select('path.domain')
          .attr('d', "M0,0V0.5H0V" + innerHeight);

        // final call to lines based on new dimensions
        bubbles_wrap
          .transition().duration(chart.delay())
            .call(scatter);

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

        bubbles_wrap
          .attr('transform', 'translate(' + innerMargin.left + ',' + innerMargin.top + ')');

      };

      //============================================================

      chart.render();

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      legend.dispatch.on('legendClick', function(d, i) {
        d.disabled = !d.disabled;

        if (!filteredData.filter(function(d) { return !d.disabled; }).length) {
          filteredData.map(function(d) {
            d.disabled = false;
            container.selectAll('.sc-series').classed('disabled', false);
            return d;
          });
        }

        state.disabled = filteredData.map(function(d) { return !!d.disabled; });

        dispatch.call('stateChange', this, state);

        container.transition().call(chart.render);
      });

      dispatch.on('tooltipShow', function(eo) {
        if (tooltips) {
          showTooltip(eo, that.parentNode);
        }
      });

      dispatch.on('tooltipMove', function(e) {
        if (tooltip) {
          sucrose.tooltip.position(that.parentNode, tooltip, e, 's');
        }
      });

      dispatch.on('tooltipHide', function() {
        if (tooltips) {
          sucrose.tooltip.cleanup();
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

        container.transition().call(chart);
      });

      dispatch.on('chartClick', function() {
        dispatch.call('tooltipHide', this);
        if (legend.enabled()) {
          legend.dispatch.call('closeMenu', this);
        }
      });

      scatter.dispatch.on('elementClick', function(eo) {
        dispatch.call('chartClick', this);
        bubbleClick(eo);
      });

    });

    return chart;
  }

  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  scatter.dispatch.on('elementMouseover.tooltip', function(eo) {
    dispatch.call('tooltipShow', this, eo);
  });

  scatter.dispatch.on('elementMousemove.tooltip', function(e) {
    dispatch.call('tooltipMove', this, e);
  });

  scatter.dispatch.on('elementMouseout.tooltip', function() {
    dispatch.call('tooltipHide', this);
  });

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.dispatch = dispatch;
  chart.scatter = scatter;
  chart.legend = legend;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  fc.rebind(chart, scatter, 'id', 'x', 'y', 'xScale', 'yScale', 'xDomain', 'yDomain', 'forceX', 'forceY', 'clipEdge', 'delay', 'color', 'fill', 'classes', 'gradient', 'locality');
  fc.rebind(chart, scatter, 'size', 'zScale', 'sizeDomain', 'forceSize', 'interactive', 'clipVoronoi', 'clipRadius');
  fc.rebind(chart, xAxis, 'rotateTicks', 'reduceXTicks', 'staggerTicks', 'wrapTicks');

  chart.colorData = function(_) {
    var type = arguments[0],
        params = arguments[1] || {};
    var color = function(d, i) {
          return sucrose.utils.defaultColor()(d, d.series);
        };
    var classes = function(d, i) {
          return 'sc-group sc-series-' + d.series;
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
          return 'sc-group sc-series-' + d.series + ' sc-fill' + iClass;
        };
        break;
      case 'data':
        color = function(d, i) {
          return d.classes ? 'inherit' : d.color || sucrose.utils.defaultColor()(d, d.series);
        };
        classes = function(d, i) {
          return 'sc-group sc-series-' + d.series + (d.classes ? ' ' + d.classes : '');
        };
        break;
    }

    var fill = (!params.gradient) ? color : function(d, i) {
      return scatter.gradient(d, d.series);
    };

    scatter.color(color);
    scatter.fill(fill);
    scatter.classes(classes);

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

  chart.state = function(_) {
    if (!arguments.length) {
      return state;
    }
    state = _;
    return chart;
  };

  chart.delay = function(_) {
    if (!arguments.length) {
      return delay;
    }
    delay = _;
    return chart;
  };

  chart.bubbleClick = function(_) {
    if (!arguments.length) {
      return bubbleClick;
    }
    bubbleClick = _;
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

  chart.colorFill = function(_) {
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
    yAxis.direction(_);
    legend.direction(_);
    return chart;
  };

  //============================================================

  return chart;
};
