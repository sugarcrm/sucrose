sucrose.models.multiBarChart = function() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var vertical = true,
      margin = {top: 10, right: 10, bottom: 10, left: 10},
      width = null,
      height = null,
      showTitle = false,
      showControls = false,
      showLegend = true,
      direction = 'ltr',
      tooltip = null,
      tooltips = true,
      scrollEnabled = true,
      overflowHandler = function(d) { return; },
      x,
      y,
      state = {},
      strings = {
        legend: {close: 'Hide legend', open: 'Show legend'},
        controls: {close: 'Hide controls', open: 'Show controls'},
        noData: 'No Data Available.',
        noLabel: 'undefined'
      },
      hideEmptyGroups = true,
      dispatch = d3.dispatch('chartClick', 'elementClick', 'tooltipShow', 'tooltipHide', 'tooltipMove', 'stateChange', 'changeState');

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  // Scroll variables
  var useScroll = false,
      scrollOffset = 0;

  var xValueFormat = function(d, labels, isDate) {
          var val = isNaN(parseInt(d, 10)) || !labels || !Array.isArray(labels) ?
            d : labels[parseInt(d, 10)] || d;
          return isDate ? sucrose.utils.dateFormat(val, '%x', chart.locality()) : val;
        };
  var yValueFormat = function(d, isCurrency) {
          return sucrose.utils.numberFormatSI(d, 2, isCurrency, chart.locality());
        };

  var multibar = sucrose.models.multiBar()
        .stacked(false)
        .clipEdge(false),
      xAxis = sucrose.models.axis()
        .valueFormat(xValueFormat)
        .tickSize(0)
        .tickPadding(4)
        .highlightZero(false)
        .showMaxMin(false),
      yAxis = sucrose.models.axis()
        .valueFormat(yValueFormat)
        .tickPadding(4),
      legend = sucrose.models.legend(),
      controls = sucrose.models.legend()
        .color(['#444']),
      scroll = sucrose.models.scroll();

  var tooltipContent = function(key, x, y, e, graph) {
    return '<h3>' + key + '</h3>' +
           '<p>' + y + ' on ' + x + '</p>';
  };

  var showTooltip = function(eo, offsetElement, groupData) {
    var key = groupData[eo.groupIndex].label,
        y = eo.point.y,
        x = (groupData) ?
              Math.abs(y * 100 / groupData[eo.groupIndex]._height).toFixed(1) :
              xAxis.tickFormat()(eo.point.x),
        content = tooltipContent(key, x, y, eo, chart),
        gravity = eo.value < 0 ?
          vertical ? 'n' : 'e' :
          vertical ? 's' : 'w';

    tooltip = sucrose.tooltip.show(eo.e, content, gravity, null, offsetElement);
  };

  var seriesClick = function(data, e, chart) {
    return;
  };

  //============================================================

  function chart(selection) {

    selection.each(function(chartData) {

      var that = this,
          container = d3.select(this),
          className = vertical ? 'multibarChart' : 'multiBarHorizontalChart';

      var properties = chartData ? chartData.properties : {},
          data = chartData ? chartData.data : null;

      var seriesData = [],
          seriesCount = 0,
          groupData = [],
          groupLabels = [].
          groupCount = 0,
          totalAmount = 0,
          hasData = false,
          xIsDatetime = chartData.properties.xDataType === 'datetime' || false,
          yIsCurrency = chartData.properties.yDataType === 'currency' || false;

      chart.container = this;

      chart.update = function() {
        container.transition().call(chart);
      };

      //------------------------------------------------------------
      // Private method for displaying no data message.

      function displayNoData (d) {
        if (d && d.length && d.filter(function(d) { return d.values.length; }).length) {
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

      chart.dataSeriesActivate = function(eo) {
        var series = eo.series;

        series.active = (!series.active || series.active === 'inactive') ? 'active' : 'inactive';
        series.values.map(function(d) {
          d.active = series.active;
        });

        // if you have activated a data series, inactivate the rest
        if (series.active === 'active') {
          data
            .filter(function(d) {
              return d.active !== 'active';
            })
            .map(function(d) {
              d.active = 'inactive';
              d.values.map(function(d) {
                d.active = 'inactive';
              });
              return d;
            });
        }

        // if there are no active data series, activate them all
        if (!data.filter(function(d) { return d.active === 'active'; }).length) {
          data
            .map(function(d) {
              d.active = '';
              d.values.map(function(d) {
                d.active = '';
              });
              container.selectAll('.sc-series').classed('sc-inactive', false);
              return d;
            });
        }

        container.call(chart);
      };

      // add series index to each data point for reference
      // and disable data series if total is zero
      data.forEach(function(series, s) {
        // make sure untrimmed values array exists
        // and set unmutable series values
        series.series = s;
        series.values.forEach(function(value, v) {
          value.series = s;
        });
        if (!series._values) {
          series._values = series.values.map(function(value, v) {
              return {
                    'series': series.series,
                    'group': v,
                    'color': typeof series.color !== 'undefined' ? series.color : '',
                    'x': multibar.x()(value, v),
                    'y': multibar.y()(value, v)
                  };
            });
          series.total = d3.sum(series._values, function(value, v) {
              return value.y;
            });
        }
        // disabled if all values in series are zero
        // or the series was disabled by the legend
        series.disabled = series.disabled || series.total === 0;
        // inherit values from series
        series._values.forEach(function(value, v) {
          // do not eval d.active because it can be false
          value.active = typeof series.active !== 'undefined' ? series.active : '';
        });
      });

      seriesData = data.filter(function(series, s) {
          return !series.disabled && (!series.type || series.type === 'bar');
        });

      seriesCount = seriesData.length;
      // hasData = data.filter(function(series) {return !d.disabled}).length > 0;
      hasData = seriesCount > 0;

      // update groupTotal amounts based on enabled data series
      groupData = properties.groups.map(function(group, g) {
          group.total = 0;
          group._height = 0;
          // only sum enabled series
          seriesData.forEach(function(series, s) {
            series._values
              .filter(function(value, v) {
                return value.group === g;
              })
              .forEach(function(value, v) {
                group.total += value.y;
                group._height += Math.abs(value.y);
              });
          });
          return group;
        });

      totalAmount = d3.sum(groupData, function(group) { return group.total; });

      // build a trimmed array for active group only labels
      groupLabels = groupData
        .filter(function(group, g) {
          return hideEmptyGroups ? group._height !== 0 : true;
        })
        .map(function(group) {
          return group.label || chart.strings().noLabel;
        });

      groupCount = groupLabels.length;

      if (hideEmptyGroups) {
        // build a discrete array of data values for the multibar
        // based on enabled data series
        seriesData.forEach(function(series, s) {
          //reset series values to exlcude values for
          //groups that have all zero values
          series.values = series._values
            .filter(function(value, v) {
              return groupData[v]._height !== 0;
            })
            .map(function(value, v) {
              return {
                'series': value.series,
                'group': value.group,
                'color': value.color,
                'x': (v + 1),
                'y': value.y,
                'active': value.active
              };
            });
          return series;
        });
      }

      //------------------------------------------------------------
      // Display No Data message if there's nothing to show.

      if (!hasData) {
        displayNoData();
        return chart;
      }

      // safety array
      if (!seriesData.length) {
        seriesData = [{values: []}];
      }

      // set state.disabled
      state.disabled = data.map(function(d) { return !!d.disabled; });
      state.stacked = multibar.stacked();

      // set title display option
      showTitle = showTitle && properties.title;

      var controlsData = [
        { key: 'Grouped', disabled: state.stacked },
        { key: 'Stacked', disabled: !state.stacked }
      ];

      //------------------------------------------------------------
      // Setup Scales and Axes

      x = multibar.xScale();
      y = multibar.yScale();

      xAxis
        .scale(x);

      yAxis
        .scale(y);

      //------------------------------------------------------------
      // Main chart draw

      chart.render = function() {

        // Chart layout variables
        var renderWidth = width || parseInt(container.style('width'), 10) || 960,
            renderHeight = height || parseInt(container.style('height'), 10) || 400,
            availableWidth = renderWidth - margin.left - margin.right,
            availableHeight = renderHeight - margin.top - margin.bottom,
            innerWidth = innerWidth || availableWidth,
            innerHeight = innerHeight || availableHeight,
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

        // Scroll variables
        // for stacked, baseDimension is width of bar plus 1/4 of bar for gap
        // for grouped, baseDimension is width of bar plus width of one bar for gap
        var baseDimension = multibar.stacked() ? vertical ? 72 : 32 : 32,
            boundsWidth = state.stacked ? baseDimension : baseDimension * seriesCount + baseDimension,
            gap = baseDimension * (state.stacked ? 0.25 : 1),
            minDimension = groupCount * boundsWidth + gap;

        //------------------------------------------------------------
        // Setup containers and skeleton of chart

        var wrap = container.selectAll('.sucrose.sc-wrap').data([data]),
            gEnter = wrap.enter().append('g').attr('class', 'sucrose sc-wrap').append('g'),
            g = wrap.select('g').attr('class', 'sc-chartWrap');
        wrap.attr('class', 'sucrose sc-wrap sc-' + className);

        /* Clipping box for scroll */
        gEnter.append('defs');

        /* Container for scroll elements */
        gEnter.append('g').attr('class', 'sc-scroll-background');

        gEnter.append('g').attr('class', 'sc-titleWrap');
        var titleWrap = g.select('.sc-titleWrap');

        gEnter.append('g').attr('class', 'sc-y sc-axis');
        var yAxisWrap = g.select('.sc-y.sc-axis');

        /* Append scroll group with chart mask */
        gEnter.append('g').attr('class', 'sc-scroll-wrap');
        var scrollWrap = g.select('.sc-scroll-wrap');

        gEnter.select('.sc-scroll-wrap').append('g')
          .attr('class', 'sc-x sc-axis');
        var xAxisWrap = g.select('.sc-x.sc-axis');

        gEnter.select('.sc-scroll-wrap').append('g')
          .attr('class', 'sc-barsWrap');
        var barsWrap = g.select('.sc-barsWrap');

        gEnter.append('g').attr('class', 'sc-controlsWrap');
        var controlsWrap = g.select('.sc-controlsWrap');
        gEnter.append('g').attr('class', 'sc-legendWrap');
        var legendWrap = g.select('.sc-legendWrap');

        wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        //------------------------------------------------------------
        // Title & Legend & Controls

        titleWrap.select('.sc-title').remove();

        if (showTitle) {
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
          headerHeight += titleBBox.height;
        }

        if (showControls) {
          controls
            .id('controls_' + chart.id())
            .strings(chart.strings().controls)
            .align('left')
            .height(availableHeight - headerHeight);
          controlsWrap
            .datum(controlsData)
            .call(controls);

          maxControlsWidth = controls.calculateWidth();
        }

        if (showLegend) {
          if (multibar.barColor()) {
            data.forEach(function(series, i) {
              series.color = d3.rgb('#ccc').darker(i * 1.5).toString();
            });
          }

          legend
            .id('legend_' + chart.id())
            .strings(chart.strings().legend)
            .align('right')
            .height(availableHeight - headerHeight);
          legendWrap
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
              ypos = showTitle ? titleBBox.height : - controls.margin().top;
          controlsWrap
            .attr('transform', 'translate(' + xpos + ',' + ypos + ')');
          controlsHeight = controls.height() - (showTitle ? 0 : controls.margin().top);
        }

        if (showLegend) {
          var legendLinkBBox = sucrose.utils.getTextBBox(legendWrap.select('.sc-legend-link')),
              legendSpace = availableWidth - titleBBox.width - 6,
              legendTop = showTitle && !showControls && legend.collapsed() && legendSpace > legendLinkBBox.width ? true : false,
              xpos = direction === 'rtl' ? 0 : availableWidth - legend.width(),
              ypos = titleBBox.height;
          if (legendTop) {
            ypos = titleBBox.height - legend.height() / 2 - legendLinkBBox.height / 2;
          } else if (!showTitle) {
            ypos = - legend.margin().top;
          }
          legendWrap
            .attr('transform', 'translate(' + xpos + ',' + ypos + ')');
          legendHeight = legendTop ? 12 : legend.height() - (showTitle ? 0 : legend.margin().top);
        }

        // Recalc inner margins based on legend and control height
        headerHeight += Math.max(controlsHeight, legendHeight);
        innerHeight = availableHeight - headerHeight - innerMargin.top - innerMargin.bottom;

        //------------------------------------------------------------
        // Main Chart Component(s)

        function getDimension(d) {
          if (d === 'width') {
            return vertical && scrollEnabled ? Math.max(innerWidth, minDimension) : innerWidth;
          } else if (d === 'height') {
            return !vertical && scrollEnabled ? Math.max(innerHeight, minDimension) : innerHeight;
          } else {
            return 0;
          }
        }

        multibar
          .vertical(vertical)
          .baseDimension(baseDimension)
          .disabled(data.map(function(series) { return series.disabled; }))
          .width(getDimension('width'))
          .height(getDimension('height'));
        barsWrap
          .data([seriesData])
          .call(multibar);

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
          multibar.resetDimensions(getDimension('width'), getDimension('height'));
        }

        // Y-Axis
        yAxis
          .orient(vertical ? 'left' : 'bottom')
          .margin(innerMargin)
          .tickFormat(function(d, i) {
            return yAxis.valueFormat()(d, yIsCurrency);
          })
          .ticks(innerHeight / 48);
        yAxisWrap
          .call(yAxis);
        // reset inner dimensions
        yAxisMargin = yAxis.margin();
        // if label value outside bar, multibar will handle scaling dimensions
        // if (multibar.showValues() === 'top' || multibar.showValues() === 'total') {
        //   if (vertical) {
        //     yAxisMargin.top = 0;
        //   } else {
        //     yAxisMargin.right = 0;
        //   }
        // }
        setInnerMargins();
        setInnerDimensions();

        // X-Axis
        xAxis
          .orient(vertical ? 'bottom' : 'left')
          .margin(innerMargin)
          .tickFormat(function(d, i, noEllipsis) {
            // Set xAxis to use trimmed array rather than data
            var label = xAxis.valueFormat()(i, groupLabels, xIsDatetime);
            if (!noEllipsis) {
              label = sucrose.utils.stringEllipsify(label, container, Math.max(vertical ? baseDimension * 2 : availableWidth * 0.2, 75));
            }
            return label;
          });
        trans = innerMargin.left + ',';
        trans += innerMargin.top + (xAxis.orient() === 'bottom' ? innerHeight : 0);
        xAxisWrap
          .attr('transform', 'translate(' + trans + ')');
        xAxisWrap
          .call(xAxis);
        // reset inner dimensions
        xAxisMargin = xAxis.margin();
        setInnerMargins();
        setInnerDimensions();
        // resize ticks based on new dimensions
        xAxis
          .tickSize(0)
          .margin(innerMargin);
        xAxisWrap
          .call(xAxis);

        // recall y-axis to set final size based on new dimensions
        yAxis
          .tickSize(vertical ? -innerWidth : -innerHeight, 0)
          .margin(innerMargin);
        yAxisWrap
          .call(yAxis);

        // final call to lines based on new dimensions
        barsWrap
          .transition()
            .call(multibar);

        //------------------------------------------------------------
        // Final repositioning

        innerMargin.top += headerHeight;

        trans = (vertical || xAxis.orient() === 'left' ? 0 : innerWidth) + ',';
        trans += (vertical && xAxis.orient() === 'bottom' ? innerHeight + 2 : -2);
        xAxisWrap
          .attr('transform', 'translate(' + trans + ')');

        trans = innerMargin.left + (vertical || yAxis.orient() === 'bottom' ? 0 : innerWidth) + ',';
        trans += innerMargin.top + (vertical || yAxis.orient() === 'left' ? 0 : innerHeight);
        yAxisWrap
          .attr('transform', 'translate(' + trans + ')');

        scrollWrap
          .attr('transform', 'translate(' + innerMargin.left + ',' + innerMargin.top + ')');

        //------------------------------------------------------------
        // Enable scrolling

        if (scrollEnabled) {

          useScroll = minDimension > (vertical ? innerWidth : innerHeight);

          xAxisWrap.select('.sc-axislabel')
            .attr('x', (vertical ? innerWidth : -innerHeight) / 2);

          var diff = (vertical ? innerWidth : innerHeight) - minDimension,
              panMultibar = function() {
                dispatch.tooltipHide(d3.event);
                scrollOffset = scroll.pan(diff);
                xAxisWrap.select('.sc-axislabel')
                  .attr('x', (vertical ? innerWidth - scrollOffset * 2 : scrollOffset * 2 - innerHeight) / 2);
              };

          scroll
            .id(chart.id())
            .enable(useScroll)
            .vertical(vertical)
            .width(innerWidth)
            .height(innerHeight)
            .margin(innerMargin)
            .minDimension(minDimension)
            .panHandler(panMultibar);

          scroll(g, gEnter, scrollWrap, xAxis);

          scroll.init(scrollOffset, overflowHandler);

          // initial call to zoom in case of scrolled bars on window resize
          scroll.panHandler()();
        }
      };

      //============================================================

      chart.render();

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      legend.dispatch.on('legendClick', function(d, i) {
        d.disabled = !d.disabled;
        d.active = false;

        // if there are no enabled data series, enable them all
        if (!data.filter(function(d) { return !d.disabled; }).length) {
          data.map(function(d) {
            d.disabled = false;
            return d;
          });
        }

        // if there are no active data series, activate them all
        if (!data.filter(function(d) { return d.active === 'active'; }).length) {
          data.map(function(d) {
            d.active = '';
            return d;
          });
        }

        state.disabled = data.map(function(d) { return !!d.disabled; });
        dispatch.stateChange(state);

        container.transition().call(chart);
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
          case 'Grouped':
            multibar.stacked(false);
            break;
          case 'Stacked':
            multibar.stacked(true);
            break;
        }

        state.stacked = multibar.stacked();
        dispatch.stateChange(state);

        container.transition().call(chart);
      });

      dispatch.on('tooltipShow', function(eo) {
        if (tooltips) {
          showTooltip(eo, that.parentNode, groupData);
        }
      });

      dispatch.on('tooltipMove', function(e) {
        if (tooltip) {
          sucrose.tooltip.position(that.parentNode, tooltip, e, vertical ? 's' : 'w');
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

        if (typeof eo.stacked !== 'undefined') {
          multibar.stacked(eo.stacked);
          state.stacked = eo.stacked;
        }

        container.transition().call(chart);
      });

      dispatch.on('chartClick', function() {
        if (controls.enabled()) {
          controls.dispatch.closeMenu();
        }
        if (legend.enabled()) {
          legend.dispatch.closeMenu();
        }
      });

      multibar.dispatch.on('elementClick', function(eo) {
        dispatch.chartClick();
        seriesClick(data, eo, chart);
      });

    });

    return chart;
  }

  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  multibar.dispatch.on('elementMouseover.tooltip', function(eo) {
    dispatch.tooltipShow(eo);
  });

  multibar.dispatch.on('elementMousemove.tooltip', function(e) {
    dispatch.tooltipMove(e);
  });

  multibar.dispatch.on('elementMouseout.tooltip', function() {
    dispatch.tooltipHide();
  });

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.dispatch = dispatch;
  chart.multibar = multibar;
  chart.legend = legend;
  chart.controls = controls;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  d3.rebind(chart, multibar, 'id', 'x', 'y', 'xScale', 'yScale', 'xDomain', 'yDomain', 'forceX', 'forceY', 'clipEdge', 'delay', 'color', 'fill', 'classes', 'gradient', 'locality');
  d3.rebind(chart, multibar, 'stacked', 'showValues', 'valueFormat', 'labelFormat', 'nice');
  d3.rebind(chart, xAxis, 'rotateTicks', 'reduceXTicks', 'staggerTicks', 'wrapTicks');

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
      var p = {orientation: params.orientation || (vertical ? 'vertical' : 'horizontal'), position: params.position || 'middle'};
      return multibar.gradient(d, d.series, p);
    };

    multibar.color(color);
    multibar.fill(fill);
    multibar.classes(classes);

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

  chart.vertical = function(_) {
    if (!arguments.length) {
      return vertical;
    }
    vertical = _;
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

  chart.allowScroll = function(_) {
    if (!arguments.length) {
      return scrollEnabled;
    }
    scrollEnabled = _;
    return chart;
  };

  chart.overflowHandler = function(_) {
    if (!arguments.length) {
      return overflowHandler;
    }
    overflowHandler = d3.functor(_);
    return chart;
  };

  chart.seriesClick = function(_) {
    if (!arguments.length) {
      return seriesClick;
    }
    seriesClick = _;
    return chart;
  };

  chart.hideEmptyGroups = function(_) {
    if (!arguments.length) {
      return hideEmptyGroups;
    }
    hideEmptyGroups = _;
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) {
      return direction;
    }
    direction = _;
    multibar.direction(_);
    xAxis.direction(_);
    yAxis.direction(_);
    legend.direction(_);
    controls.direction(_);
    return chart;
  };

  //============================================================

  return chart;
};
