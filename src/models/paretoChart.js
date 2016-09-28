sucrose.models.paretoChart = function() {
  //'use strict';
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
      tooltip = null,
      tooltips = true,
      x,
      y,
      clipEdge = false, // if true, masks lines within x and y scale
      delay = 0, // transition
      duration = 300, // transition
      state = {},
      strings = {
        barlegend: {close: 'Hide bar legend', open: 'Show bar legend'},
        linelegend: {close: 'Hide line legend', open: 'Show line legend'},
        controls: {close: 'Hide controls', open: 'Show controls'},
        noData: 'No Data Available.',
        noLabel: 'undefined'
      },
      getX = function(d) { return d.x; },
      getY = function(d) { return d.y; },
      locality = sucrose.utils.buildLocality(),
      dispatch = d3.dispatch('chartClick', 'tooltipShow', 'tooltipHide', 'tooltipMove', 'stateChange', 'changeState');

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var multibar = sucrose.models.multiBar()
      .stacked(true)
      .clipEdge(false)
      .withLine(true)
      .nice(false),
    lines1 = sucrose.models.line()
      .color(function(d, i) { return '#FFF'; })
      .fill(function(d, i) { return '#FFF'; })
      .useVoronoi(false)
      .nice(false),
    lines2 = sucrose.models.line()
      .useVoronoi(false)
      .color('data')
      .nice(false),
    xAxis = sucrose.models.axis(),
    yAxis = sucrose.models.axis(),
    barLegend = sucrose.models.legend()
      .align('left')
      .position('middle'),
    lineLegend = sucrose.models.legend()
      .align('right')
      .position('middle');

  var tooltipBar = function(key, x, y, e, graph) {
        return '<p><b>' + key + '</b></p>' +
               '<p><b>' + y + '</b></p>' +
               '<p><b>' + x + '%</b></p>';
      };
  var tooltipLine = function(key, x, y, e, graph) {
        return '<p><p>' + key + ': <b>' + y + '</b></p>';
      };
  var tooltipQuota = function(key, x, y, e, graph) {
        return '<p>' + e.key + ': <b>' + y + '</b></p>';
      };

  var showTooltip = function(eo, offsetElement, dataGroup) {
        var key = eo.series.key,
            per = (eo.point.y * 100 / dataGroup[eo.pointIndex].t).toFixed(1),
            amt = lines2.y()(eo.point, eo.pointIndex),
            content = eo.series.type === 'bar' ? tooltipBar(key, per, amt, eo, chart) : tooltipLine(key, per, amt, eo, chart);

        return sucrose.tooltip.show(eo.e, content, 's', null, offsetElement);
      };

  var showQuotaTooltip = function(eo, offsetElement) {
        var content = tooltipQuota(eo.key, 0, eo.val, eo, chart);
        return sucrose.tooltip.show(eo.e, content, 's', null, offsetElement);
      };

  var seriesClick = function(data, eo, chart, container) {
        return;
      };

  var getAbsoluteXY = function(element) {
        var viewportElement = document.documentElement,
          box = element.getBoundingClientRect(),
          scrollLeft = viewportElement.scrollLeft + document.body.scrollLeft,
          scrollTop = viewportElement.scrollTop + document.body.scrollTop,
          x = box.left + scrollLeft,
          y = box.top + scrollTop;

        return {'x': x, 'y': y};
      };

  //============================================================

  function chart(selection) {

    selection.each(function(chartData) {

      var that = this,
          container = d3.select(this);

      var properties = chartData ? chartData.properties : {},
          data = chartData ? chartData.data : null;

      var maxBarLegendWidth = 0,
          maxLineLegendWidth = 0,
          widthRatio = 0,
          headerHeight = 0,
          pointSize = Math.pow(6, 2) * Math.PI, // set default point size to 6
          xIsDatetime = chartData.properties.xDataType === 'datetime' || false,
          yIsCurrency = chartData.properties.yDataType === 'currency' || false;

      var availableWidth = (width || parseInt(container.style('width'), 10) || 960) - margin.left - margin.right,
          availableHeight = (height || parseInt(container.style('height'), 10) || 400) - margin.top - margin.bottom,
          innerWidth = availableWidth,
          innerHeight = availableHeight,
          innerMargin = {top: 0, right: 0, bottom: 0, left: 0};

      var baseDimension = multibar.stacked() ? 72 : 32;

      var xValueFormat = function(d, i, selection, noEllipsis) {
            // Set axis to use trimmed array rather than data
            var value = groupLabels && Array.isArray(groupLabels) ?
                          groupLabels[i] || d:
                          d;
            var label = xIsDatetime ?
                          sucrose.utils.dateFormat(value, '%x', chart.locality()) :
                          value;
            var width = Math.max(baseDimension * 2, 75);
            return !noEllipsis ?
                      sucrose.utils.stringEllipsify(label, container, width) :
                      label;
          };

      var yValueFormat = function(d) {
            return sucrose.utils.numberFormatSI(d, 2, yIsCurrency, chart.locality());
          };

      chart.container = this;

      chart.update = function() {
        container.transition().call(chart);
      };

      //------------------------------------------------------------
      // Private method for displaying no data message.

      function displayNoData (d) {
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

      var dataBars = data.filter(function(d) {
            return !d.disabled && (!d.type || d.type === 'bar');
          });

      var dataLines = data.filter(function(d) {
            return !d.disabled && d.type === 'line';
          }).map(function(lineData) {
            if (!multibar.stacked()) {
              lineData.values = lineData.valuesOrig.map(function(v, i) {
                return {'series': v.series, 'x': (v.x + v.series * 0.25 - i * 0.25), 'y': v.y};
              });
            } else {
              lineData.values.map(function(v) {
                v.y = 0;
              });
              dataBars
                .map(function(v, i) {
                  v.values.map(function(v, i) {
                    lineData.values[i].y += v.y;
                  });
                });
              lineData.values.map(function(v, i) {
                if (i > 0) {
                  v.y += lineData.values[i - 1].y;
                }
              });
            }
            return lineData;
          });

      var dataGroup = properties.groupData,
          groupLabels = dataGroup.map(function(d) {
            return [].concat(d.l)[0] || chart.strings().noLabel;
          }),
          quotaValue = properties.quota || 0,
          quotaLabel = properties.quotaLabel || '',
          targetQuotaValue = properties.targetQuota || 0,
          targetQuotaLabel = properties.targetQuotaLabel || '';

      dataBars = dataBars.length ? dataBars : [{values: []}];
      dataLines = dataLines.length ? dataLines : [{values: []}];

      // line legend data
      var lineLegendData = data.filter(function(d) {
            return d.type === 'line';
          });
      lineLegendData.push({
        'key': quotaLabel,
        'type': 'dash',
        'color': '#444',
        'series': lineLegendData.length,
        'values': {'series': lineLegendData.length, 'x': 0, 'y': 0}
      });
      if (targetQuotaValue > 0) {
        lineLegendData.push({
          'key': targetQuotaLabel,
          'type': 'dash',
          'color': '#777',
          'series': lineLegendData.length,
          'values': {'series': lineLegendData.length + 1, 'x': 0, 'y': 0}
        });
      }

      var seriesX = data.filter(function(d) {
            return !d.disabled;
          }).map(function(d) {
            return d.valuesOrig.map(function(d, i) {
              return getX(d, i);
            });
          });

      var seriesY = data.map(function(d) {
            return d.valuesOrig.map(function(d, i) {
              return getY(d, i);
            });
          });

      // set title display option
      showTitle = showTitle && properties.title;

      //------------------------------------------------------------
      // Setup Scales

      x = multibar.xScale();
      y = multibar.yScale();

      xAxis
        .orient('bottom')
        .scale(x)
        .valueFormat(xValueFormat)
        .tickSize(0)
        .tickPadding(4)
        .highlightZero(false)
        .showMaxMin(false);

      yAxis
        .orient('left')
        .scale(y)
        .valueFormat(yValueFormat)
        .tickPadding(7)
        .showMaxMin(true);


      //------------------------------------------------------------
      // Main chart draw

      chart.render = function() {

        // Chart layout variables
        var renderWidth = width || parseInt(container.style('width'), 10) || 960,
            renderHeight = height || parseInt(container.style('height'), 10) || 400,
            innerMargin = {top: 0, right: 0, bottom: 0, left: 0},
            innerWidth = availableWidth,
            innerHeight = availableHeight;

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

        var wrap_bind = container.selectAll('.sucrose.sc-wrap').data([data]);
        var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sucrose sc-wrap sc-pareto-chart');
        var wrap = container.select('.sucrose.sc-wrap').merge(wrap_entr);

        wrap_entr.append('rect').attr('class', 'sc-background')
          .attr('x', -margin.left)
          .attr('y', -margin.top)
          .attr('width', availableWidth + margin.left + margin.right)
          .attr('height', availableHeight + margin.top + margin.bottom)
          .attr('fill', '#FFF');

        wrap_entr.append('g').attr('class', 'sc-title-wrap');
        var title_wrap = wrap.select('.sc-title-wrap');
        wrap_entr.append('g').attr('class', 'sc-axis-wrap sc-axis-x');
        var xAxis_wrap = wrap.select('.sc-axis-wrap.sc-axis-x');
        wrap_entr.append('g').attr('class', 'sc-axis-wrap sc-axis-y');
        var yAxis_wrap = wrap.select('.sc-axis-wrap.sc-axis-y');
        wrap_entr.append('g').attr('class', 'sc-bars-wrap');
        var bars_wrap = wrap.select('.sc-bars-wrap');
        wrap_entr.append('g').attr('class', 'sc-quota-wrap');
        var quota_wrap = wrap.select('.sc-quota-wrap');

        wrap_entr.append('g').attr('class', 'sc-lines-wrap1');
        var lines_wrap1 = wrap.select('.sc-lines-wrap1');
        wrap_entr.append('g').attr('class', 'sc-lines-wrap2');
        var lines_wrap2 = wrap.select('.sc-lines-wrap2');

        wrap_entr.append('g').attr('class', 'sc-legend-wrap sc-bar-legend');
        var barLegend_wrap = wrap.select('.sc-legend-wrap.sc-bar-legend');
        wrap_entr.append('g').attr('class', 'sc-legend-wrap sc-line-legend');
        var lineLegend_wrap = wrap.select('.sc-legend-wrap.sc-line-legend');

        wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        //------------------------------------------------------------
        // Title & Legends

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

          titleBBox = sucrose.utils.getTextBBox(title_wrap.select('.sc-title'));
          headerHeight += titleBBox.height;
        }

        if (showLegend) {

          // bar series legend
          barLegend
            .id('barlegend_' + chart.id())
            .strings(chart.strings().barlegend)
            .align('left')
            .height(availableHeight - innerMargin.top);
          barLegend_wrap
            .datum(
              data.filter(function(d) {
                return d.type === 'bar';
              })
            )
            .call(barLegend);

          maxBarLegendWidth = barLegend.calculateWidth();

          // line series legend
          lineLegend
            .id('linelegend_' + chart.id())
            .strings(chart.strings().linelegend)
            .align('right')
            .height(availableHeight - innerMargin.top);
          lineLegend_wrap
            .datum(lineLegendData)
            .call(lineLegend);

          maxLineLegendWidth = lineLegend.calculateWidth();

          // calculate proportional available space
          widthRatio = availableWidth / (maxBarLegendWidth + maxLineLegendWidth);

          barLegend
            .arrange(Math.floor(widthRatio * maxBarLegendWidth));

          lineLegend
            .arrange(Math.floor(widthRatio * maxLineLegendWidth));

          barLegend_wrap
            .attr('transform', 'translate(' + (direction === 'rtl' ? availableWidth - barLegend.width() : 0) + ',' + innerMargin.top + ')');
          lineLegend_wrap
            .attr('transform', 'translate(' + (direction === 'rtl' ? 0 : availableWidth - lineLegend.width()) + ',' + innerMargin.top + ')');
        }

        // Recalculate inner margins based on legend size
        headerHeight += Math.max(barLegend.height(), lineLegend.height()) + 4;
        innerHeight = availableHeight - headerHeight - innerMargin.top - innerMargin.bottom;

        //------------------------------------------------------------
        // Initial call of Main Chart Components

        var limitY = Math.max(d3.max(d3.merge(seriesY)), quotaValue, targetQuotaValue || 0);
        var forceY = [0, Math.ceil(limitY * 0.1) * 10];

        // Main Bar Chart
        multibar
          .width(innerWidth)
          .height(innerHeight)
          .forceY(forceY)
          .id(chart.id());
        bars_wrap
          .datum(dataBars)
          .call(multibar);

        // Main Line Chart
        lines1
          .margin({top: 0, right: lOffset, bottom: 0, left: lOffset})
          .width(innerWidth)
          .height(innerHeight)
          .forceY(forceY)
          .useVoronoi(false)
          .id('outline_' + chart.id());
        lines2
          .margin({top: 0, right: lOffset, bottom: 0, left: lOffset})
          .width(innerWidth)
          .height(innerHeight)
          .forceY(forceY)
          .useVoronoi(false)
          .size(pointSize)
          .sizeRange([pointSize, pointSize])
          .sizeDomain([pointSize, pointSize])
          .id('foreground_' + chart.id());
        lines_wrap1
          .datum(dataLines)
          .call(lines1);
        lines_wrap2
          .datum(dataLines)
          .call(lines2);

        // Axes
        xAxis_wrap
          .call(xAxis);

        yAxis_wrap
          .style('opacity', dataBars.length ? 1 : 0)
          .call(yAxis);

        var xAxisMargin = xAxis.margin();
        var yAxisMargin = yAxis.margin();

        function setInnerMargins() {
          innerMargin.left = Math.max(quotaTextWidth, xAxisMargin.left, yAxisMargin.left);
          innerMargin.right = Math.max(xAxisMargin.right, yAxisMargin.right);
          innerMargin.top = Math.max(xAxisMargin.top, yAxisMargin.top) + headerHeight;
          innerMargin.bottom = Math.max(xAxisMargin.bottom, yAxisMargin.bottom);
          setInnerDimensions();
        }

        function setInnerDimensions() {
          innerWidth = availableWidth - innerMargin.left - innerMargin.right;
          innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;
          // Recalc chart dimensions and scales based on new inner dimensions
          multibar.resetDimensions(innerWidth, innerHeight);
        }

        //------------------------------------------------------------
        // Quota Line

        quota_wrap.selectAll('line').remove();
        yAxis_wrap.selectAll('text.sc-quota-value').remove();
        yAxis_wrap.selectAll('text.sc-target-quota-value').remove();

        var quotaTextWidth = 0,
          quotaTextHeight = 14;

        // Target Quota Line
        if (targetQuotaValue > 0) {
          quota_wrap.append('line')
            .attr('class', 'sc-quota-target')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', innerWidth)
            .attr('y2', 0)
            .attr('transform', 'translate(0,' + y(targetQuotaValue) + ')')
            .style('stroke-dasharray', '8, 8');

          quota_wrap.append('line')
            .datum({key: targetQuotaLabel, val: targetQuotaValue})
            .attr('class', 'sc-quota-target sc-quota-background')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', innerWidth)
            .attr('y2', 0)
            .attr('transform', 'translate(0,' + y(targetQuotaValue) + ')');

          // Target Quota line label
          yAxis_wrap.append('text')
            .text(yAxis.valueFormat()(targetQuotaValue, true))
            .attr('class', 'sc-target-quota-value')
            .attr('dy', '.36em')
            .attr('dx', '0')
            .attr('text-anchor', direction === 'rtl' ? 'start' : 'end')
            .attr('transform', 'translate(' + (0 - yAxis.tickPadding()) + ',' + y(targetQuotaValue) + ')');

          quotaTextWidth = Math.round(wrap.select('text.sc-target-quota-value').node().getBoundingClientRect().width + yAxis.tickPadding());
        }

        if (quotaValue > 0) {
          quota_wrap.append('line')
            .attr('class', 'sc-quota-line')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', innerWidth)
            .attr('y2', 0)
            .attr('transform', 'translate(0,' + y(quotaValue) + ')')
            .style('stroke-dasharray', '8, 8');

          quota_wrap.append('line')
            .datum({key: quotaLabel, val: quotaValue})
            .attr('class', 'sc-quota-line sc-quota-background')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', innerWidth)
            .attr('y2', 0)
            .attr('transform', 'translate(0,' + y(quotaValue) + ')');

          // Quota line label
          yAxis_wrap.append('text')
            .text(yAxis.valueFormat()(quotaValue, true))
            .attr('class', 'sc-quota-value')
            .attr('dy', '.36em')
            .attr('dx', '0')
            .attr('text-anchor', direction === 'rtl' ? 'start' : 'end')
            .attr('transform', 'translate(' + -yAxis.tickPadding() + ',' + y(quotaValue) + ')');

          quotaTextWidth = Math.max(quotaTextWidth, Math.round(wrap.select('text.sc-quota-value').node().getBoundingClientRect().width + yAxis.tickPadding()));
        }

        //------------------------------------------------------------
        // Calculate intial dimensions based on first Axis call

        // Temporarily reset inner dimensions
        setInnerMargins();

        //------------------------------------------------------------
        // Recall Main Chart and Axis

        multibar
          .width(innerWidth)
          .height(innerHeight);
        bars_wrap
          .call(multibar);

        xAxis_wrap
          .call(xAxis);
        yAxis_wrap
          .call(yAxis);

        //------------------------------------------------------------
        // Recalculate final dimensions based on new Axis size

        xAxisMargin = xAxis.margin();
        yAxisMargin = yAxis.margin();

        setInnerMargins();

        //------------------------------------------------------------
        // Recall Main Chart Components based on final dimensions

        var lOffset = x(1) + x.bandwidth() / (multibar.stacked() || dataLines.length === 1 ? 2 : 4);
        var transform = 'translate(' + innerMargin.left + ',' + innerMargin.top + ')';

        multibar
          .width(innerWidth)
          .height(innerHeight);

        bars_wrap
          .attr('transform', transform)
          .call(multibar);


        lines1
          .margin({top: 0, right: lOffset, bottom: 0, left: lOffset})
          .width(innerWidth)
          .height(innerHeight);
        lines2
          .margin({top: 0, right: lOffset, bottom: 0, left: lOffset})
          .width(innerWidth)
          .height(innerHeight);

        lines_wrap1
          .attr('transform', transform)
          .call(lines1);
        lines_wrap2
          .attr('transform', transform)
          .call(lines2);


        quota_wrap
          .attr('transform', transform)
          .selectAll('line')
            .attr('x2', innerWidth);

        xAxis_wrap
          .attr('transform', 'translate(' + innerMargin.left + ',' + (xAxis.orient() === 'bottom' ? innerHeight + innerMargin.top : innerMargin.top) + ')')
          .call(xAxis);

        yAxis
          .ticks(Math.ceil(innerHeight / 48))
          .tickSize(-innerWidth, 0);

        yAxis_wrap
          .attr('transform', 'translate(' + (yAxis.orient() === 'left' ? innerMargin.left : innerMargin.left + innerWidth) + ',' + innerMargin.top + ')')
          .call(yAxis);

        if (targetQuotaValue > 0) {

          quota_wrap.select('line.sc-quota-target')
            .attr('x2', innerWidth)
            .attr('transform', 'translate(0,' + y(targetQuotaValue) + ')');
          yAxis_wrap.select('text.sc-target-quota-value')
            .attr('transform', 'translate(' + (0 - yAxis.tickPadding()) + ',' + y(targetQuotaValue) + ')');

          quotaTextHeight = Math.round(parseInt(wrap.select('text.sc-target-quota-value').node().getBoundingClientRect().height, 10) / 1.15);

          //check if tick lines overlap quota values, if so, hide the values that overlap
          yAxis_wrap.selectAll('g.tick, g.sc-axisMaxMin')
            .each(function(d, i) {
              if (Math.abs(y(d) - y(targetQuotaValue)) <= quotaTextHeight) {
                d3.select(this).style('opacity', 0);
              }
            });
        }

        if (quotaValue > 0) {

          quota_wrap.select('line.sc-quota-line')
            .attr('x2', innerWidth)
            .attr('transform', 'translate(0,' + y(quotaValue) + ')');
          yAxis_wrap.select('text.sc-quota-value')
            .attr('transform', 'translate(' + (0 - yAxis.tickPadding()) + ',' + y(quotaValue) + ')');

          quotaTextHeight = Math.round(parseInt(wrap.select('text.sc-quota-value').node().getBoundingClientRect().height, 10) / 1.15);

          //check if tick lines overlap quota values, if so, hide the values that overlap
          yAxis_wrap.selectAll('g.tick, g.sc-axisMaxMin')
            .each(function(d, i) {
              if (Math.abs(y(d) - y(quotaValue)) <= quotaTextHeight) {
                d3.select(this).style('opacity', 0);
              }
            });

          // if there is a quota and an adjusted quota
          // check to see if the adjusted collides
          if (targetQuotaValue > 0) {
            if (Math.abs(y(quotaValue) - y(targetQuotaValue)) <= quotaTextHeight) {
              yAxis_wrap.select('.sc-target-quota-value').style('opacity', 0);
            }
          }
        }

      quota_wrap.selectAll('line.sc-quota-background')
        .on('mouseover', function(d) {
          if (tooltips) {
            var eo = {
                val: d.val,
                key: d.key,
                e: d3.event
            };
            tooltip = showQuotaTooltip(eo, that.parentNode);
          }
        })
        .on('mousemove', function() {
          var e = d3.event;
          dispatch.call('tooltipMove', this, e);
        })
        .on('mouseout', function() {
          dispatch.call('tooltipHide', this);
        });

      };

      //============================================================

      chart.render();

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      barLegend.dispatch.on('legendClick', function(d, i) {
        var selectedSeries = d.series;

        //swap bar disabled
        d.disabled = !d.disabled;
        //swap line disabled for same series
        if (!chart.stacked()) {
          data.filter(function(d) {
              return d.series === selectedSeries && d.type === 'line';
            }).map(function(d) {
              d.disabled = !d.disabled;
              return d;
            });
        }
        // if there are no enabled data series, enable them all
        if (!data.filter(function(d) {
          return !d.disabled && d.type === 'bar';
        }).length) {
          data.map(function(d) {
            d.disabled = false;
            wrap.selectAll('.sc-series').classed('disabled', false);
            return d;
          });
        }
        container.call(chart);
      });

      dispatch.on('tooltipShow', function(eo) {
        if (tooltips) {
          tooltip = showTooltip(eo, that.parentNode, dataGroup);
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

        if (typeof eo.stacked !== 'undefined') {
          multibar.stacked(eo.stacked);
          state.stacked = eo.stacked;
        }

        container.transition().call(chart);
      });

      dispatch.on('chartClick', function() {
        if (barLegend.enabled()) {
          barLegend.dispatch.call('closeMenu', this);
        }
        if (lineLegend.enabled()) {
          lineLegend.dispatch.call('closeMenu', this);
        }
      });

      multibar.dispatch.on('elementClick', function(eo) {
        dispatch.call('chartClick', this);
        seriesClick(data, eo, chart, container);
      });

    });

    return chart;
  }

  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  lines2.dispatch.on('elementMouseover.tooltip', function(eo) {
    dispatch.call('tooltipShow', this, eo);
  });

  lines2.dispatch.on('elementMousemove.tooltip', function(e) {
    dispatch.call('tooltipMove', this, e);
  });

  lines2.dispatch.on('elementMouseout.tooltip', function() {
    dispatch.call('tooltipHide', this);
  });

  multibar.dispatch.on('elementMouseover.tooltip', function(eo) {
    dispatch.call('tooltipShow', this, eo);
  });

  multibar.dispatch.on('elementMousemove.tooltip', function(e) {
    dispatch.call('tooltipMove', this, e);
  });

  multibar.dispatch.on('elementMouseout.tooltip', function() {
    dispatch.call('tooltipHide', this);
  });

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.dispatch = dispatch;
  chart.lines1 = lines1;
  chart.lines2 = lines2;
  chart.multibar = multibar;
  chart.barLegend = barLegend;
  chart.lineLegend = lineLegend;
  chart.xAxis = xAxis;
  chart.yAxis = yAxis;

  fc.rebind(chart, multibar, 'id', 'xScale', 'yScale', 'xDomain', 'yDomain', 'forceX', 'forceY', 'color', 'fill', 'classes', 'gradient');
  fc.rebind(chart, multibar, 'stacked', 'showValues', 'valueFormat', 'labelFormat', 'nice', 'textureFill');
  fc.rebind(chart, xAxis, 'rotateTicks', 'reduceXTicks', 'staggerTicks', 'wrapTicks');

  chart.colorData = function(_) {
    var type = arguments[0],
      params = arguments[1] || {};
    var barColor = function(d, i) {
      return sucrose.utils.defaultColor()(d, d.series);
    };
    var barClasses = function(d, i) {
      return 'sc-group sc-series-' + d.series;
    };
    var lineColor = function(d, i) {
      var p = params.lineColor ? params.lineColor : {
        c1: '#1A8221',
        c2: '#62B464',
        l: 1
      };
      return d.color || d3.interpolateHsl(d3.rgb(p.c1), d3.rgb(p.c2))(d.series / 2);
    };
    var lineClasses = function(d, i) {
      return 'sc-group sc-series-' + d.series;
    };

    switch (type) {
      case 'graduated':
        barColor = function(d, i) {
          return d3.interpolateHsl(d3.rgb(params.barColor.c1), d3.rgb(params.barColor.c2))(d.series / params.barColor.l);
        };
        break;
      case 'class':
        barColor = function() {
          return 'inherit';
        };
        barClasses = function(d, i) {
          var iClass = (d.series * (params.step || 1)) % 14;
          iClass = (iClass > 9 ? '' : '0') + iClass;
          return 'sc-group sc-series-' + d.series + ' sc-fill' + iClass;
        };
        lineClasses = function(d, i) {
          var iClass = (d.series * (params.step || 1)) % 14;
          iClass = (iClass > 9 ? '' : '0') + iClass;
          return 'sc-group sc-series-' + d.series + ' sc-fill' + iClass + ' sc-stroke' + iClass;
        };
        break;
      case 'data':
        barColor = function(d, i) {
          return d.classes ? 'inherit' : d.color || sucrose.utils.defaultColor()(d, d.series);
        };
        barClasses = function(d, i) {
          return 'sc-group sc-series-' + d.series + (d.classes ? ' ' + d.classes : '');
        };
        lineClasses = function(d, i) {
          return 'sc-group sc-series-' + d.series + (d.classes ? ' ' + d.classes : '');
        };
        break;
    }

    var barFill = (!params.gradient) ? barColor : function(d, i) {
      var p = {orientation: params.orientation || 'vertical', position: params.position || 'middle'};
      return multibar.gradient(d, d.series, p);
    };

    multibar.color(barColor);
    multibar.fill(barFill);
    multibar.classes(barClasses);

    lines2.color(lineColor);
    lines2.fill(lineColor);
    lines2.classes(lineClasses);

    barLegend.color(barColor);
    barLegend.classes(barClasses);

    lineLegend.color(lineColor);
    lineLegend.classes(lineClasses);

    return chart;
  };

  chart.x = function(_) {
    if (!arguments.length) {
      return getX;
    }
    getX = _;
    lines.x(_);
    multibar.x(_);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) {
      return getY;
    }
    getY = _;
    lines.y(_);
    multibar.y(_);
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
      return false;
    }
    return chart;
  };

  chart.showLegend = function(_) {
    if (!arguments.length) {
      return showLegend;
    }
    showLegend = _;
    return chart;
  };

  chart.tooltipBar = function(_) {
    if (!arguments.length) {
      return tooltipBar;
    }
    tooltipBar = _;
    return chart;
  };

  chart.tooltipLine = function(_) {
    if (!arguments.length) {
      return tooltipLine;
    }
    tooltipLine = _;
    return chart;
  };

  chart.tooltipQuota = function(_) {
    if (!arguments.length) {
      return tooltipQuota;
    }
    tooltipQuota = _;
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

  chart.clipEdge = function(_) {
    if (!arguments.length) {
      return clipEdge;
    }
    clipEdge = _;
    multibar.clipEdge(_);
    lines1.clipEdge(_);
    lines2.clipEdge(_);
    return chart;
  };

  chart.delay = function(_) {
    if (!arguments.length) {
      return delay;
    }
    delay = _;
    multibar.delay(_);
    lines1.delay(_);
    lines2.delay(_);
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) {
      return duration;
    }
    duration = _;
    multibar.duration(_);
    lines1.duration(_);
    lines2.duration(_);
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
    multibar.direction(_);
  	xAxis.direction(_);
    yAxis.direction(_);
    barLegend.direction(_);
    lineLegend.direction(_);
    return chart;
  };

  chart.seriesClick = function(_) {
    if (!arguments.length) {
      return seriesClick;
    }
    seriesClick = _;
    return chart;
  };

  chart.colorFill = function(_) {
    return chart;
  };

  chart.locality = function(_) {
    if (!arguments.length) {
      return locality;
    }
    locality = sucrose.utils.buildLocality(_);
    multibar.locality(_);
    lines1.locality(_);
    return chart;
  };
  //============================================================

  return chart;
};
