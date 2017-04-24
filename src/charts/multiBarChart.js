import d3 from 'd3v4';
import fc from 'd3fc-rebind';
import utility from '../utility.js';
import tooltip from '../tooltip.js';
import multibar from '../models/multibar.js';
import axis from '../models/axis.js';
import menu from '../models/menu.js';
import scroller from '../models/scroller.js';

export default function multibarChart() {

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
      tooltips = true,
      x,
      y,
      delay = 0,
      duration = 0,
      state = {},
      strings = {
        legend: {close: 'Hide legend', open: 'Show legend'},
        controls: {close: 'Hide controls', open: 'Show controls'},
        noData: 'No Data Available.',
        noLabel: 'undefined'
      },
      vertical = true,
      scrollEnabled = true,
      overflowHandler = function(d) { return; },
      hideEmptyGroups = true,
      dispatch = d3.dispatch('chartClick', 'elementClick', 'tooltipShow', 'tooltipHide', 'tooltipMove', 'stateChange', 'changeState');

  var xValueFormat = function(d, i, label, isDate) {
        return isDate ?
          utility.dateFormat(label, '%x', chart.locality()) :
          label;
      };

  var yValueFormat = function(d, i, label, isCurrency) {
        var precision = 2;
        return utility.numberFormatSI(d, precision, isCurrency, chart.locality());
      };

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  // Scroll variables
  var useScroll = false,
      scrollOffset = 0;

  var model = multibar().stacked(false).clipEdge(false);
  var xAxis = axis(); //.orient('bottom'),
  var yAxis = axis(); //.orient('left'),
  var controls = menu().color(['#444']);
  var legend = menu();
  var scroll = scroller();

  var tt = null;

  var tooltipContent = function(eo, graph) {
        var key = eo.group.label,
            y = eo.point.y,
            x = Math.abs(y * 100 / eo.group._height).toFixed(1);
        return '<h3>' + key + '</h3>' +
               '<p>' + y + ' on ' + x + '</p>';
      };

  var showTooltip = function(eo, offsetElement) {
        var content = tooltipContent(eo, chart),
            gravity = eo.value < 0 ?
              vertical ? 'n' : 'e' :
              vertical ? 's' : 'w';

        return tooltip.show(eo.e, content, gravity, null, offsetElement);
      };

  var seriesClick = function(data, e, chart, labels) {
        return;
      };

  //============================================================

  function chart(selection) {

    selection.each(function(chartData) {

      var that = this,
          container = d3.select(this),
          modelClass = vertical ? 'multibar' : 'multibar-horizontal';

      var properties = chartData ? chartData.properties : {},
          data = chartData ? chartData.data : null;

      var containerWidth = parseInt(container.style('width'), 10),
          containerHeight = parseInt(container.style('height'), 10);

      var availableWidth = width,
          availableHeight = height;

      var xIsDatetime = properties.xDataType === 'datetime' || false,
          yIsCurrency = properties.yDataType === 'currency' || false;

      var seriesData = [],
          seriesCount = 0,
          groupData = [],
          groupLabels = [],
          groupCount = 0,
          totalAmount = 0,
          hasData = false;

      var baseDimension = model.stacked() ? vertical ? 72 : 32 : 32;

      var xAxisValueFormat = function(d, i, selection, noEllipsis) {
            // Set axis to use trimmed array rather than data
            var label = groupLabels && Array.isArray(groupLabels) ?
                  groupLabels[i] || d:
                  d;
            // format as date if isDate
            var value = xValueFormat(d, i, label, xIsDatetime);
            var width = Math.max(vertical ?
                  baseDimension * 2 :
                  availableWidth * 0.2, 75);

            return !noEllipsis ?
              utility.stringEllipsify(value, container, width) :
              value;
          };

      var yAxisValueFormat = function(d, i, selection, noEllipsis) {
            return yValueFormat(d, i, null, yIsCurrency);
          };

      chart.update = function() {
        container.transition().duration(duration).call(chart);
      };

      chart.container = this;

      //------------------------------------------------------------
      // Private method for displaying no data message.

      function displayNoData(d) {
        var hasData = d && d.length && d.filter(function(d) { return d.values && d.values.length; }).length,
            x = (containerWidth - margin.left - margin.right) / 2 + margin.left,
            y = (containerHeight - margin.top - margin.bottom) / 2 + margin.top;
        return utility.displayNoData(hasData, container, chart.strings().noData, x, y);
      }

      // Check to see if there's nothing to show.
      if (displayNoData(data)) {
        return chart;
      }

      //------------------------------------------------------------
      // Process data

      chart.clearActive = function() {
        data.forEach(function(d) {
          d.active = '';
          d.values.map(function(d) {
            d.active = '';
          });
        });
        delete state.active;
      };

      chart.cellActivate = function(eo) {
        data[eo.seriesIndex].values[eo.groupIndex].active = 'active';
        chart.render();
      };

      chart.seriesActivate = function(eo) {
        chart.dataSeriesActivate({series: data[eo.seriesIndex]});
      };

      chart.dataSeriesActivate = function(eo) {
        var series = eo.series;

        // series.active = (!series.active || series.active === 'inactive') ? 'active' : 'inactive';
        series.active = (typeof series.active === 'undefined' || series.active === 'inactive' || series.active === '') ? 'active' : 'inactive';

        series.values.map(function(d) {
          d.active = series.active;
        });

        // if you have activated a data series, inactivate the other non-active series
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

        // if there are no active data series, unset active state
        if (!data.filter(function(d) { return d.active === 'active'; }).length) {
          chart.clearActive();
        } else {
          state.active = data.map(function(d) { return typeof d.active === 'undefined' || d.active === 'active'; });
        }

        // container.call(chart);
        chart.render();
      };

      // add series index to each data point for reference
      data.forEach(function(series, s) {
        // make sure untrimmed values array exists
        // and set immutable series values
        if (!series._values) {
          series._values = series.values.map(function(value, v) {
            return {
              'x': value.x,
              'y': value.y
            };
          });
        }

        series.seriesIndex = s;

        series.values = series._values.map(function(value, v) {
            return {
                  'seriesIndex': series.seriesIndex,
                  'group': v,
                  'color': typeof series.color !== 'undefined' ? series.color : '',
                  'x': model.x()(value, v),
                  'y': model.y()(value, v),
                  'y0': value.y + (s > 0 ? data[series.seriesIndex - 1].values[v].y0 : 0),
                  'active': typeof series.active !== 'undefined' ? series.active : ''
                };
          });

        series.total = d3.sum(series.values, function(value, v) {
            return value.y;
          });

        // disabled if all values in series are zero
        // or the series was disabled by the legend
        series.disabled = series.disabled || series.total === 0;
        // inherit values from series
        series.values.forEach(function(value, v) {
          // do not eval d.active because it can be false
          value.active = typeof series.active !== 'undefined' ? series.active : '';
        });
      });

      seriesData = data
        .filter(function(series, s) {
          return !series.disabled && (!series.type || series.type === 'bar');
        })
        .map(function(series, s) {
          series.seri = s;
          series.values
            .forEach(function(value, v) {
              value.seri = series.seri;
            });
          return series;
        });

      seriesCount = seriesData.length;
      hasData = seriesCount > 0;

      // update groupTotal amounts based on enabled data series
      groupData = properties.groups.map(function(group, g) {
          group.total = 0;
          group._height = 0;
          // only sum enabled series
          seriesData
            .forEach(function(series, s) {
              series.values
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
          return group.l || group.label || chart.strings().noLabel;
        });

      groupCount = groupLabels.length;

      if (hideEmptyGroups) {
        // build a discrete array of data values for the multibar
        // based on enabled data series
        seriesData.forEach(function(series, s) {
          //reset series values to exlcude values for
          //groups that have all zero values
          series.values = series.values
            .filter(function(value, v) {
              return groupData[v]._height !== 0;
            })
            .map(function(value, v) {
              return {
                'seri': series.seri,
                'seriesIndex': value.seriesIndex,
                'group': value.group,
                'color': value.color,
                'x': (v + 1),
                'y': value.y,
                'y0': value.y0,
                'active': value.active
              };
            });
          return series;
        });
      }
            // return {
            //       'seriesIndex': series.seriesIndex,
            //       'group': v,
            //       'color': typeof series.color !== 'undefined' ? series.color : '',
            //       'x': model.x()(value, v),
            //       'y': model.y()(value, v),
            //       'y0': value.y + (s > 0 ? data[series.seriesIndex - 1].values[v].y0 : 0),
            //       'active': typeof series.active !== 'undefined' ? series.active : ''
            //     };
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
      state.active = data.map(function(d) { return d.active === 'active'; });
      state.stacked = model.stacked();

      // set title display option
      showTitle = showTitle && properties.title;

      var controlsData = [
        { key: 'Grouped', disabled: state.stacked },
        { key: 'Stacked', disabled: !state.stacked }
      ];

      //------------------------------------------------------------
      // Setup Scales and Axes

      x = model.xScale();
      y = model.yScale();

      xAxis
        .orient(vertical ? 'bottom' : 'left') // any time orient is called it resets the d3-axis model and has to be reconfigured
        .scale(x)
        .valueFormat(xAxisValueFormat)
        .tickSize(0)
        .tickPadding(4)
        .highlightZero(false)
        .showMaxMin(false);

      yAxis
        .orient(vertical ? 'left' : 'bottom')
        .scale(y)
        .valueFormat(yAxisValueFormat)
        .tickPadding(4)
        .showMaxMin(true);

      //------------------------------------------------------------
      // Main chart wrappers

      var wrap_bind = container.selectAll('g.sc-chart-wrap').data([data]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-chart-wrap sc-chart-' + modelClass);
      var wrap = container.select('.sc-chart-wrap').merge(wrap_entr);

      /* Clipping box for scroll */
      wrap_entr.append('defs');

      /* Container for scroll elements */
      wrap_entr.append('g').attr('class', 'sc-scroll-background');

      wrap_entr.append('g').attr('class', 'sc-title-wrap');
      var title_wrap = wrap.select('.sc-title-wrap');

      wrap_entr.append('g').attr('class', 'sc-axis-wrap sc-axis-y');
      var yAxis_wrap = wrap.select('.sc-axis-wrap.sc-axis-y');

      /* Append scroll group with chart mask */
      wrap_entr.append('g').attr('class', 'sc-scroll-wrap');
      var scroll_wrap = wrap.select('.sc-scroll-wrap');

      wrap_entr.select('.sc-scroll-wrap').append('g').attr('class', 'sc-axis-wrap sc-axis-x');
      var xAxis_wrap = wrap.select('.sc-axis-wrap.sc-axis-x');

      wrap_entr.select('.sc-scroll-wrap').append('g').attr('class', 'sc-bars-wrap');
      var model_wrap = wrap.select('.sc-bars-wrap');

      wrap_entr.append('g').attr('class', 'sc-controls-wrap');
      var controls_wrap = wrap.select('.sc-controls-wrap');
      wrap_entr.append('g').attr('class', 'sc-legend-wrap');
      var legend_wrap = wrap.select('.sc-legend-wrap');

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

        // Scroll variables
        // for stacked, baseDimension is width of bar plus 1/4 of bar for gap
        // for grouped, baseDimension is width of bar plus width of one bar for gap
        var boundsWidth = state.stacked ? baseDimension : baseDimension * seriesCount + baseDimension,
            gap = baseDimension * (state.stacked ? 0.25 : 1),
            minDimension = groupCount * boundsWidth + gap;

        wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

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
            trans = '';

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
            .id('controls_' + chart.id())
            .strings(chart.strings().controls)
            .align('left')
            .height(availableHeight - headerHeight);
          controls_wrap
            .datum(controlsData)
            .call(controls);

          maxControlsWidth = controls.calcMaxWidth();
        }
        if (showLegend) {
          if (model.barColor()) {
            data.forEach(function(series, i) {
              series.color = d3.rgb('#ccc').darker(i * 1.5).toString();
            });
          }

          legend
            .id('legend_' + chart.id())
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
          var xpos = direction === 'rtl' ? availableWidth - controls.width() : 0,
              ypos = showTitle ? titleBBox.height : - controls.margin().top;
          controls_wrap
            .attr('transform', 'translate(' + xpos + ',' + ypos + ')');
          controlsHeight = controls.height() - (showTitle ? 0 : controls.margin().top);
        }
        if (showLegend) {
          var legendLinkBBox = utility.getTextBBox(legend_wrap.select('.sc-legend-link')),
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
          legendHeight = legendTop ? 12 : legend.height() - (showTitle ? 0 : legend.margin().top);
        }

        // Recalc inner margins based on legend and control height
        headerHeight += Math.max(controlsHeight, legendHeight);
        innerMargin.top += headerHeight;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;
        innerWidth = availableWidth - innerMargin.left - innerMargin.right;

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

        model
          .vertical(vertical)
          .baseDimension(baseDimension)
          .disabled(data.map(function(series) { return series.disabled; }))
          .width(getDimension('width'))
          .height(getDimension('height'));
        model_wrap
          .data([seriesData])
          .call(model);

        //------------------------------------------------------------
        // Axes

        var yAxisMargin = {top: 0, right: 0, bottom: 0, left: 0},
            xAxisMargin = {top: 0, right: 0, bottom: 0, left: 0};

        function setInnerMargins() {
          innerMargin.left = Math.max(xAxisMargin.left, yAxisMargin.left);
          innerMargin.right = Math.max(xAxisMargin.right, yAxisMargin.right);
          innerMargin.top = Math.max(xAxisMargin.top, yAxisMargin.top) + headerHeight;
          innerMargin.bottom = Math.max(xAxisMargin.bottom, yAxisMargin.bottom);
          setInnerDimensions();
        }

        function setInnerDimensions() {
          innerWidth = availableWidth - innerMargin.left - innerMargin.right;
          innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;
          // Recalc chart dimensions and scales based on new inner dimensions
          model.resetDimensions(getDimension('width'), getDimension('height'));
        }

        // Y-Axis
        yAxis
          .margin(innerMargin)
          .ticks(innerHeight / 48);
        yAxis_wrap
          .call(yAxis);
        // reset inner dimensions
        yAxisMargin = yAxis.margin();
        setInnerMargins();

        // X-Axis
        xAxis
          .margin(innerMargin)
          .ticks(groupCount);
        trans = innerMargin.left + ',';
        trans += innerMargin.top + (xAxis.orient() === 'bottom' ? innerHeight : 0);
        xAxis_wrap
          .attr('transform', 'translate(' + trans + ')')
            .call(xAxis);
        // reset inner dimensions
        xAxisMargin = xAxis.margin();
        setInnerMargins();

        // resize ticks based on new dimensions
        xAxis
          .tickSize(0)
          .margin(innerMargin);
        xAxis_wrap
          .call(xAxis);

        // reset inner dimensions
        xAxisMargin = xAxis.margin();
        setInnerMargins();

        // recall y-axis to set final size based on new dimensions
        yAxis
          .tickSize(vertical ? -innerWidth : -innerHeight, 0)
          .margin(innerMargin);
        yAxis_wrap
          .call(yAxis);

        // reset inner dimensions
        yAxisMargin = yAxis.margin();
        setInnerMargins();

        // final call to lines based on new dimensions
        model_wrap
          .transition()
            .call(model);

        //------------------------------------------------------------
        // Final repositioning


        trans = (vertical || xAxis.orient() === 'left' ? 0 : innerWidth) + ',';
        trans += (vertical && xAxis.orient() === 'bottom' ? innerHeight + 2 : -2);
        xAxis_wrap
          .attr('transform', 'translate(' + trans + ')');

        trans = innerMargin.left + (vertical || yAxis.orient() === 'bottom' ? 0 : innerWidth) + ',';
        trans += innerMargin.top + (vertical || yAxis.orient() === 'left' ? 0 : innerHeight);
        yAxis_wrap
          .attr('transform', 'translate(' + trans + ')');

        scroll_wrap
          .attr('transform', 'translate(' + innerMargin.left + ',' + innerMargin.top + ')');

        //------------------------------------------------------------
        // Enable scrolling

        if (scrollEnabled) {

          useScroll = minDimension > (vertical ? innerWidth : innerHeight);

          xAxis_wrap.select('.sc-axislabel')
            .attr('x', (vertical ? innerWidth : -innerHeight) / 2);

          var diff = (vertical ? innerWidth : innerHeight) - minDimension,
              panMultibar = function() {
                dispatch.call('tooltipHide', this);
                scrollOffset = scroll.pan(diff);
                xAxis_wrap.select('.sc-axislabel')
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

          scroll(wrap, wrap_entr, scroll_wrap, xAxis);

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

      legend.dispatch.on('legendClick', function(series, i) {
        series.disabled = !series.disabled;
        series.active = 'inactive';
        series.values.map(function(d) {
          d.active = 'inactive';
        });

        if (hideEmptyGroups) {
          data.map(function(m, j) {
            m._values.map(function(v, k) {
              v.disabled = (k === i ? series.disabled : v.disabled ? true : false);
              return v;
            });
            return m;
          });
        }

        // if there are no enabled data series, enable them all
        if (!data.filter(function(d) { return !d.disabled; }).length) {
          data.map(function(d) {
            d.disabled = false;
            return d;
          });
        }

        // if there are no active data series, unset active state
        if (!data.filter(function(d) { return d.active === 'active'; }).length) {
          chart.clearActive();
        }

        // state.disabled = data.map(function(d) { return !!d.disabled; });
        chart.update();
        dispatch.call('stateChange', this, state);

        // container.transition().duration(duration).call(chart);
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
            model.stacked(false);
            break;
          case 'Stacked':
            model.stacked(true);
            break;
        }

        state.stacked = model.stacked();
        chart.update();
        dispatch.call('stateChange', this, state);

        // container.transition().duration(duration).call(chart);
      });

      dispatch.on('tooltipShow', function(eo) {
        if (tooltips) {
          eo.group = groupData[eo.groupIndex];
          tt = showTooltip(eo, that.parentNode, groupData);
        }
      });

      dispatch.on('tooltipMove', function(e) {
        if (tt) {
          tooltip.position(that.parentNode, tt, e, vertical ? 's' : 'w');
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

        if (typeof eo.active !== 'undefined') {
          data.forEach(function(series, i) {
            series.active = eo.active[i] ? 'active' : 'inactive';
            series.values.map(function(d) {
              d.active = series.active;
            });
          });
          state.active = eo.active;
          // if there are no active data series, unset active state
          if (!data.filter(function(d) { return d.active === 'active'; }).length) {
            chart.clearActive();
          }
        }

        if (typeof eo.stacked !== 'undefined') {
          model.stacked(eo.stacked);
          state.stacked = eo.stacked;
        }

        // container.transition().duration(duration).call(chart);
        chart.render();
      });

      dispatch.on('chartClick', function() {
        //dispatch.call('tooltipHide', this);
        if (controls.enabled()) {
          controls.dispatch.call('closeMenu', this);
        }
        if (legend.enabled()) {
          legend.dispatch.call('closeMenu', this);
        }
      });

      model.dispatch.on('elementClick', function(eo) {
        dispatch.call('chartClick', this);
        seriesClick(data, eo, chart, groupLabels);
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
  chart.multibar = model;
  chart.legend = legend;
  chart.controls = controls;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  fc.rebind(chart, model, 'id', 'x', 'y', 'xScale', 'yScale', 'xDomain', 'yDomain', 'forceY', 'clipEdge', 'color', 'fill', 'classes', 'gradient', 'locality');
  fc.rebind(chart, model, 'stacked', 'showValues', 'valueFormat', 'nice', 'textureFill');
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
          return 'sc-series sc-series-' + d.seriesIndex + ' sc-fill' + iClass;
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
      var p = {orientation: params.orientation || (vertical ? 'vertical' : 'horizontal'), position: params.position || 'middle'};
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
    dispatch.stateChange(state);
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

  chart.seriesClick = function(_) {
    if (!arguments.length) { return seriesClick; }
    seriesClick = _;
    return chart;
  };

  chart.vertical = function(_) {
    if (!arguments.length) { return vertical; }
    vertical = _;
    return chart;
  };

  chart.allowScroll = function(_) {
    if (!arguments.length) { return scrollEnabled; }
    scrollEnabled = _;
    return chart;
  };

  chart.overflowHandler = function(_) {
    if (!arguments.length) { return overflowHandler; }
    overflowHandler = utility.functor(_);
    return chart;
  };

  chart.hideEmptyGroups = function(_) {
    if (!arguments.length) { return hideEmptyGroups; }
    hideEmptyGroups = _;
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

  //============================================================

  return chart;
};
