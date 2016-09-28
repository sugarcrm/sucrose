sucrose.models.stackedAreaChart = function() {

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
      tooltip = false,
      tooltip0 = null,
      duration = 0,
      tooltips = true,
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

  var stacked = sucrose.models.stackedArea()
        .clipEdge(true),
      xAxis = sucrose.models.axis(),
      yAxis = sucrose.models.axis(),
      legend = sucrose.models.legend()
        .align('right'),
      controls = sucrose.models.legend()
        .align('left')
        .color(['#444']),
      guide = sucrose.models.line().duration(0);

  var tooltipContent = function(key, x, y, e, graph) {
    return '<h3>' + key + '</h3>' +
           '<p>' + y + ' on ' + x + '</p>';
  };

  //============================================================

  function chart(selection) {

    selection.each(function (chartData) {

      var that = this,
          container = d3.select(this);

      var properties = chartData ? chartData.properties : {},
          data = chartData ? chartData.data : null,
          labels = properties.labels ? properties.labels.map(function(d) { return d.l || d; }) : [];

      var lineData = [],
          xTickLabels = [],
          totalAmount = 0,
          singlePoint = false,
          showMaxMin = false,
          isArrayData = true,
          xIsDatetime = chartData.properties.xDataType === 'datetime' || false,
          yIsCurrency = chartData.properties.yDataType === 'currency' || false;

      var xValueFormat = function(d, i, selection, noEllipsis) {
            var label = xIsDatetime ?
                          sucrose.utils.dateFormat(d, 'yMMMM', chart.locality()) :
                          isNaN(parseInt(d, 10)) || !xTickLabels || !Array.isArray(xTickLabels) ?
                            d :
                            xTickLabels[parseInt(d, 10)];
            return label;
          };

      var yValueFormat = function(d) {
            return sucrose.utils.numberFormatSI(d, 2, yIsCurrency, chart.locality());
          };

      chart.container = this;

      chart.update = function () {
        container.transition().duration(duration).call(chart);
      };

      //------------------------------------------------------------
      // Private method for displaying no data message.

      function displayNoData(d) {
        if (d && d.length && d.filter(function(d) { return d.values.length; }).length) {
          container.selectAll('.sc-no-data').remove();
          return false;
        }

        container.select('.sucrose.sc-wrap').remove();

        var w = width || parseInt(container.style('width'), 10) || 960,
            h = height || parseInt(container.style('height'), 10) || 400,
            noDataText = container.selectAll('.sc-no-data').data([chart.strings().noData]);

        noDataText.enter().append('text')
          .attr('class', 'sucrose sc-no-data')
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

      isArrayData = Array.isArray(data[0].values[0]);
      if (isArrayData) {
        stacked.x(function(d) { return d ? d[0] : 0; });
        stacked.y(function(d) { return d ? d[1] : 0; });
      } else {
        stacked.x(function(d) { return d.x; });
        stacked.y(function(d) { return d.y; });
      }

      // set title display option
      showTitle = showTitle && properties.title;

      // add series index to each data point for reference
      // and disable data series if total is zero
      data.map(function (d, i) {
        d.series = i;
        d.total = d3.sum(d.values, function(d, i) {
          return stacked.y()(d, i);
        });
        if (!d.total) {
          d.disabled = true;
        }
      });

      xTickLabels = properties.labels ?
          properties.labels.map(function(d) { return [].concat(d.l)[0] || chart.strings().noLabel; }) :
          [];

      // TODO: what if the dimension is a numerical range?
      // xValuesAreDates = xTickLabels.length ?
      //       sucrose.utils.isValidDate(xTickLabels[0]) :
      //       sucrose.utils.isValidDate(stacked.x()(data[0].values[0]));
      // xValuesAreDates = isArrayData && sucrose.utils.isValidDate(data[0].values[0][0]);

      // SAVE FOR LATER
      // isOrdinalSeries = !xValuesAreDates && labels.length > 0 && d3.min(lineData, function(d) {
      //   return d3.min(d.values, function(d, i) {
      //     return stacked.x()(d, i);
      //   });
      // }) > 0;

      lineData = data.filter(function (d) {
          return !d.disabled;
        });

      // safety array
      lineData = lineData.length ? lineData : [{series: 0, total: 0, disabled: true, values: []}];

      totalAmount = d3.sum(lineData, function(d) {
          return d.total;
        });

      //------------------------------------------------------------
      // Display No Data message if there's nothing to show.

      if (!totalAmount) {
        displayNoData();
        return chart;
      }

      // set state.disabled
      state.disabled = lineData.map(function (d) { return !!d.disabled; });
      state.style = stacked.style();

      var controlsData = [
        { key: 'Stacked', disabled: stacked.offset() !== 'zero' },
        { key: 'Stream', disabled: stacked.offset() !== 'wiggle' },
        { key: 'Expanded', disabled: stacked.offset() !== 'expand' }
      ];

      //------------------------------------------------------------
      // Setup Scales and Axes

      stacked
        .xDomain(null)  //?why null?
        .yDomain(null)
        .xScale(xIsDatetime ? d3.scaleTime() : d3.scaleLinear());

      x = stacked.xScale();
      y = stacked.yScale();

      xAxis
        .orient('bottom')
        .ticks(null)
        .tickValues(null)
        .showMaxMin(xIsDatetime)
        .highlightZero(false)
        .scale(x)
        .tickPadding(6)
        .valueFormat(xValueFormat);
      yAxis
        .orient('left')
        .ticks(null)
        .showMaxMin(true)
        .highlightZero(true)
        .scale(y)
        .tickPadding(6)
        .valueFormat(yValueFormat);

      guide
        .useVoronoi(false)
        .xScale(x)
        .yScale(y);


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
        var maxControlsWidth = 0,
            maxLegendWidth = 0,
            widthRatio = 0,
            headerHeight = 0,
            titleBBox = {width: 0, height: 0},
            controlsHeight = 0,
            legendHeight = 0,
            trans = '';

        var wrap_bind = container.selectAll('g.sc-chart-wrap').data([data]);
        var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-chart-wrap sc-chart-stackedarea');
        var wrap = container.select('.sc-chart-wrap').merge(wrap_entr);

        wrap_entr.append('rect').attr('class', 'sc-background')
          .attr('x', -margin.left)
          .attr('y', -margin.top)
          .attr('fill', '#FFF');

        wrap.select('.sc-background')
          .attr('width', availableWidth + margin.left + margin.right)
          .attr('height', availableHeight + margin.top + margin.bottom);

        wrap_entr.append('g').attr('class', 'sc-title-wrap');
        var title_wrap = wrap.select('.sc-title-wrap');

        wrap_entr.append('g').attr('class', 'sc-axis-wrap sc-axis-x');
        var xAxis_wrap = wrap.select('.sc-axis-wrap.sc-axis-x');
        wrap_entr.append('g').attr('class', 'sc-axis-wrap sc-axis-y');
        var yAxis_wrap = wrap.select('.sc-axis-wrap.sc-axis-y');

        wrap_entr.append('g').attr('class', 'sc-stackedarea-wrap');
        var stacked_wrap = wrap.select('.sc-stackedarea-wrap');

        wrap_entr.append('g').attr('class', 'sc-controls-wrap');
        var controls_wrap = wrap.select('.sc-controls-wrap');
        wrap_entr.append('g').attr('class', 'sc-legend-wrap');
        var legend_wrap = wrap.select('.sc-legend-wrap');

        wrap_entr.append('g').attr('class', 'sc-guide-wrap');
        var guide_wrap = wrap.select('.sc-guide-wrap');

        wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        //------------------------------------------------------------
        // Title & Legend & Controls

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

          titleBBox = sucrose.utils.getTextBBox(wrap.select('.sc-title'));
          headerHeight += titleBBox.height;
        }

        if (showControls) {
          controls
            .id('controls_' + chart.id())
            .strings(chart.strings().controls)
            .align('left')
            .height(availableHeight - headerHeight);
          controls_wrap
            .datum(controlsData)
            .call(controls);

          maxControlsWidth = controls.calculateWidth();
        }

        if (showLegend) {
          legend
            .id('legend_' + chart.id())
            .strings(chart.strings().legend)
            .align('right')
            .height(availableHeight - headerHeight);
          legend_wrap
            .datum(data)
            .call(legend);

          maxLegendWidth = legend.calculateWidth();
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
          var xpos = direction === 'rtl' ? availableWidth - controls.width() : 0,
              ypos = showTitle ? titleBBox.height : - legend.margin().top;
          controls_wrap
            .attr('transform', 'translate(' + xpos + ',' + ypos + ')');
          controlsHeight = controls.height();
        }

        if (showLegend) {
          var legendLinkBBox = sucrose.utils.getTextBBox(legend_wrap.select('.sc-legend-link')),
              legendSpace = availableWidth - titleBBox.width - 6,
              legendTop = showTitle && !showControls && legend.collapsed() && legendSpace > legendLinkBBox.width ? true : false,
              xpos = direction === 'rtl' ? 0 : availableWidth - legend.width(),
              ypos = titleBBox.height;
          if (legendTop) {
            ypos = titleBBox.height - legend.height() / 2 - legendLinkBBox.height / 2;
          } else if (!showTitle) {
            ypos = - legend.margin().top;
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

        stacked
          .width(innerWidth)
          .height(innerHeight)
          .id(chart.id());
        stacked_wrap
          .datum(lineData)
          .call(stacked);


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
          stacked.width(innerWidth).height(innerHeight);
          // This resets the scales for the whole chart
          // unfortunately we can't call this without until line instance is called
          // stacked.scatter.resetDimensions(innerWidth, innerHeight);
          x.range([0, innerWidth]);
          y.range([innerHeight, 0]);
        }

        // Y-Axis
        yAxis
          .margin(innerMargin)
          .tickFormat(function(d, i) {
            return yAxis.valueFormat()(d, yIsCurrency);
          });
        yAxis_wrap
          .call(yAxis);
        // reset inner dimensions
        yAxisMargin = yAxis.margin();
        setInnerMargins();
        setInnerDimensions();

        // X-Axis
        // resize ticks based on new dimensions
        xAxis
          .tickSize(-innerHeight, 0)
          .margin(innerMargin)
          .tickFormat(function(d, i, noEllipsis) {
            return xAxis.valueFormat()(d - !isArrayData, xTickLabels, xIsDatetime);
          });
        xAxis_wrap
          .call(xAxis);
        xAxisMargin = xAxis.margin();
        setInnerMargins();
        setInnerDimensions();
        // xAxis
        //  .resizeTickLines(-innerHeight);

        // recall y-axis, x-axis and lines to set final size based on new dimensions
        yAxis
          .tickSize(-innerWidth, 0)
          .margin(innerMargin);
        yAxis_wrap
          .call(yAxis);

        xAxis
          .tickSize(-innerHeight, 0)
          .margin(innerMargin);
        xAxis_wrap
          .call(xAxis);

        stacked
          .width(innerWidth)
          .height(innerHeight);
        stacked_wrap
          // .transition().duration(chart.delay())
          .datum(lineData)
            .call(stacked)

        // var middleDate = (x.domain()[0].getTime() + (x.domain()[1].getTime() - x.domain()[0].getTime()) / 2);

        guide
          .width(innerWidth)
          .height(innerHeight)
          .size(2)
          .color(function() { return '#000'; })
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

        chart.showTooltip = function(eo, offsetElement) {
          var key = eo.seriesKey,
              x = xValueFormat(stacked.x()(eo)),
              y = yValueFormat(stacked.y()(eo)),
              content = tooltipContent(key, x, y, eo, chart);
          return sucrose.tooltip.show(eo.e, content, null, null, offsetElement);
        };


        chart.moveGuide = function(svg, container, eo) {
          var xpos = eo.data[0][0];
          var values = [{x: xpos, y: 0}]
                .concat(eo.data.map(function(d, i) { return {x: xpos, y: d[1]}; }))
                .concat([{x: xpos, y: y.domain()[1]}]);
          var guidePos = {
            clientX: eo.origin.left + x(xpos)
          };

          guide_wrap
            .datum([{
              key:'guide',
              values: values
            }])
            .call(guide);

          if (!tooltip0) {
            tooltip0 = {};
            eo.data.forEach(function(d, i) {
              d.e = eo.e;
              tooltip0[i] = chart.showTooltip(d, that.parentNode);
            });
          }

          eo.data.forEach(function(d, i) {
            var key = d.seriesKey,
                xval = xValueFormat(stacked.x()(d)),
                yval = yValueFormat(stacked.y()(d)),
                content = tooltipContent(key, xval, yval, d, chart);
            guidePos.clientY = eo.origin.top + y(d[1]);
            d3.select(tooltip0[i]).select('.tooltip-inner').html(content)
            sucrose.tooltip.position(that.parentNode, tooltip0[i], guidePos, 'e');
          });
        }

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
        stacked_wrap
          .attr('transform', 'translate(' + trans + ')');
        guide_wrap
          .attr('transform', 'translate(' + trans + ')');

      };

      //============================================================

      chart.render();

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      stacked.dispatch.on('areaClick.toggle', function (e) {
        if (data.filter(function (d) { return !d.disabled; }).length === 1) {
          data = data.map(function (d) {
            d.disabled = false;
            return d;
          });
        } else {
          data = data.map(function (d,i) {
            d.disabled = (i !== e.seriesIndex);
            return d;
          });
        }

        state.disabled = data.map(function (d) { return !!d.disabled; });
        dispatch.call('stateChange', this, state);

        container.transition().duration(chart.delay()).call(chart);
      });

      legend.dispatch.on('legendClick', function (d, i) {
        d.disabled = !d.disabled;

        if (!data.filter(function (d) { return !d.disabled; }).length) {
          data.map(function (d) {
            d.disabled = false;
            container.selectAll('.sc-series').classed('disabled', false);
            return d;
          });
        }

        state.disabled = data.map(function (d) { return !!d.disabled; });
        dispatch.call('stateChange', this, state);

        container.transition().duration(duration).call(chart);
      });

      controls.dispatch.on('legendClick', function (d, i) {

        //if the option is currently enabled (i.e., selected)
        if (!d.disabled) {
          return;
        }

        //set the controls all to false
        controlsData = controlsData.map(function (s) {
          s.disabled = true;
          return s;
        });
        //activate the the selected control option
        d.disabled = false;

        switch (d.key) {
          case 'Stacked':
            stacked.style('stack');
            break;
          case 'Stream':
            stacked.style('stream');
            break;
          case 'Expanded':
            stacked.style('expand');
            break;
        }

        state.style = stacked.style();
        dispatch.call('stateChange', this, state);

        container.transition().duration(chart.delay()).call(chart);
      });

      dispatch.on('tooltipShow', function(eo) {
        if (tooltips) {
          tooltip = true;
        }
      });

      dispatch.on('tooltipMove', function(eo) {
        if (tooltip) {
          chart.moveGuide(that.parentNode, container, eo);
        }
      });

      dispatch.on('tooltipHide', function() {
        if (tooltips) {
          tooltip = false;
          sucrose.tooltip.cleanup();
          tooltip0 = null;
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

        if (typeof eo.style !== 'undefined') {
          stacked.style(eo.style);
          state.style = eo.style;
        }

        container.transition().duration(duration).call(chart);
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

  stacked.dispatch.on('areaMouseover.tooltip', function(eo) {
    dispatch.call('tooltipShow', this, eo);
  });

  stacked.dispatch.on('areaMousemove.tooltip', function(eo) {
    dispatch.call('tooltipMove', this, eo);
  });

  stacked.dispatch.on('areaMouseout.tooltip', function() {
    dispatch.call('tooltipHide', this);
  });

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.dispatch = dispatch;
  chart.stacked = stacked;
  chart.legend = legend;
  chart.controls = controls;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  fc.rebind(chart, stacked, 'id', 'x', 'y', 'xScale', 'yScale', 'xDomain', 'yDomain', 'forceX', 'forceY', 'clipEdge', 'delay', 'color', 'fill', 'classes', 'gradient', 'locality');
  fc.rebind(chart, stacked, 'size', 'sizeDomain', 'forceSize', 'offset', 'order', 'style', 'interactive', 'useVoronoi', 'clipVoronoi');
  fc.rebind(chart, xAxis, 'rotateTicks', 'reduceXTicks', 'staggerTicks', 'wrapTicks');

  chart.colorData = function(_) {
    var type = arguments[0],
        params = arguments[1] || {};
    var color = function(d, i) {
          return sucrose.utils.defaultColor()(d, d.series || i);
        };
    var classes = function(d, i) {
          return 'sc-area sc-series-' + (d.series || i);
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
          return 'sc-area sc-area-' + d.series + ' sc-fill' + iClass + ' sc-stroke' + iClass;
        };
        break;
      case 'data':
        color = function(d, i) {
          return d.color || sucrose.utils.defaultColor()(d, d.series);
        };
        classes = function(d, i) {
          return 'sc-area sc-area-' + d.series + (d.classes ? ' ' + d.classes : '');
        };
        break;
    }

    var fill = (!params.gradient) ? color : function(d, i) {
      var p = {orientation: params.orientation || 'horizontal', position: params.position || 'base'};
      return stacked.gradient(d, d.series, p);
    };

    stacked.color(color);
    stacked.fill(fill);
    stacked.classes(classes);

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

  chart.showControls = function(_) {
    if (!arguments.length) {
      return showControls;
    }
    showControls = _;
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
    xAxis.direction(_);
    legend.direction(_);
    controls.direction(_);
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) { return duration; }
    duration = _;
    stacked.duration(_);
    return chart;
  };

  //============================================================

  return chart;
};
