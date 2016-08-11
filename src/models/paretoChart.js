sucrose.models.paretoChart = function() {
    //'use strict';
    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var margin = {top: 10, right: 10, bottom: 10, left: 10},
        width = null,
        height = null,
        getX = function(d) { return d.x; },
        getY = function(d) { return d.y; },
        locality = sucrose.utils.buildLocality(),
        showTitle = false,
        showLegend = true,
        tooltip = null,
        tooltips = true,
        direction = 'ltr',
        tooltipBar = function(key, x, y, e, graph) {
            return '<p><b>' + key + '</b></p>' +
                '<p><b>' + y + '</b></p>' +
                '<p><b>' + x + '%</b></p>';
        },
        tooltipLine = function(key, x, y, e, graph) {
            return '<p><p>' + key + ': <b>' + y + '</b></p>';
        },
        tooltipQuota = function(key, x, y, e, graph) {
            return '<p>' + e.key + ': <b>' + y + '</b></p>';
        },
        x,
        y,
        strings = {
            barlegend: {close: 'Hide bar legend', open: 'Show bar legend'},
            linelegend: {close: 'Hide line legend', open: 'Show line legend'},
            controls: {close: 'Hide controls', open: 'Show controls'},
            noData: 'No Data Available.',
            noLabel: 'undefined'
        },
        dispatch = d3.dispatch('chartClick', 'tooltipShow', 'tooltipHide', 'tooltipMove');

    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var xValueFormat = function(d, labels, isDate) {
            var val = isNaN(parseInt(d, 10)) || !labels || !Array.isArray(labels) ?
                d : labels[parseInt(d, 10)] || d;
            return isDate ? sucrose.utils.dateFormat(val, 'yMMMM', chart.locality()) : val;
        };
    var yValueFormat = function(d, isCurrency) {
            return sucrose.utils.numberFormatSI(d, 2, isCurrency, chart.locality());
        };

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
        xAxis = sucrose.models.axis()
            .valueFormat(xValueFormat)
            .orient('bottom')
            .tickSize(0)
            .tickPadding(4)
            .wrapTicks(true)
            .highlightZero(false)
            .showMaxMin(false),
        yAxis = sucrose.models.axis()
            .valueFormat(yValueFormat)
            .orient('left')
            .tickPadding(7)
            .showMaxMin(true),
        barLegend = sucrose.models.legend()
            .align('left')
            .position('middle'),
        lineLegend = sucrose.models.legend()
            .align('right')
            .position('middle');

    var showTooltip = function(eo, offsetElement, dataGroup) {
        var key = eo.series.key,
            per = (eo.point.y * 100 / dataGroup[eo.pointIndex].t).toFixed(1),
            amt = lines2.y()(eo.point, eo.pointIndex),
            content = eo.series.type === 'bar' ? tooltipBar(key, per, amt, eo, chart) : tooltipLine(key, per, amt, eo, chart);
        tooltip = sucrose.tooltip.show(eo.e, content, 's', null, offsetElement);
    };

    var showQuotaTooltip = function(eo, offsetElement) {
        var content = tooltipQuota(eo.key, 0, eo.val, eo, chart);
        tooltip = sucrose.tooltip.show(eo.e, content, 's', null, offsetElement);
    };

    var barClick = function(data, eo, chart, container) {
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

            var properties = chartData.properties,
                data = chartData.data,
                container = d3.select(this),
                that = this,
                availableWidth = (width || parseInt(container.style('width'), 10) || 960) - margin.left - margin.right,
                availableHeight = (height || parseInt(container.style('height'), 10) || 400) - margin.top - margin.bottom,
                innerWidth = availableWidth,
                innerHeight = availableHeight,
                innerMargin = {top: 0, right: 0, bottom: 0, left: 0},
                maxBarLegendWidth = 0,
                maxLineLegendWidth = 0,
                widthRatio = 0,
                pointSize = Math.pow(6, 2) * Math.PI, // set default point size to 6
                xIsDatetime = chartData.properties.xDataType === 'datetime' || false,
                yIsCurrency = chartData.properties.yDataType === 'currency' || false;

            chart.update = function() {
                container.call(chart);
            };

            chart.container = this;

            //------------------------------------------------------------
            // Display No Data message if there's nothing to show.

            if (!data || !data.length || !data.filter(function(d) {
                return d.values.length;
            }).length) {
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

            //------------------------------------------------------------
            // Setup Scales

            x = multibar.xScale();
            y = multibar.yScale();

            xAxis
                .tickFormat(function(d, i, noEllipsis) {
                  // Set xAxis to use trimmed array rather than data
                  var label = xAxis.valueFormat()(i, groupLabels, xIsDatetime);
                  if (!noEllipsis) {
                    label = sucrose.utils.stringEllipsify(label, container, Math.max(availableWidth * 0.2, 75));
                  }
                  return label;
                })
                .scale(x);
            yAxis
                .tickFormat(function(d, i) {
                  return yAxis.valueFormat()(d, yIsCurrency);
                })
                .scale(y);

            //------------------------------------------------------------
            // Setup containers and skeleton of chart

            var wrap = container.selectAll('g.sc-wrap.sc-multiBarWithLegend').data([data]),
                gEnter = wrap.enter().append('g').attr('class', 'sucrose sc-wrap sc-multiBarWithLegend').append('g'),
                g = wrap.select('g').attr('class', 'sc-chartWrap');

            gEnter.append('rect').attr('class', 'sc-background')
                .attr('x', -margin.left)
                .attr('y', -margin.top)
                .attr('width', availableWidth + margin.left + margin.right)
                .attr('height', availableHeight + margin.top + margin.bottom)
                .attr('fill', '#FFF');

            gEnter.append('g').attr('class', 'sc-titleWrap');
            var titleWrap = g.select('.sc-titleWrap');
            gEnter.append('g').attr('class', 'sc-x sc-axis');
            var xAxisWrap = g.select('.sc-x.sc-axis');
            gEnter.append('g').attr('class', 'sc-y sc-axis');
            var yAxisWrap = g.select('.sc-y.sc-axis');
            gEnter.append('g').attr('class', 'sc-barsWrap');
            var barsWrap = g.select('.sc-barsWrap');
            gEnter.append('g').attr('class', 'sc-quotaWrap');
            var quotaWrap = g.select('.sc-quotaWrap');

            gEnter.append('g').attr('class', 'sc-linesWrap1');
            var linesWrap1 = g.select('.sc-linesWrap1');
            gEnter.append('g').attr('class', 'sc-linesWrap2');
            var linesWrap2 = g.select('.sc-linesWrap2');

            gEnter.append('g').attr('class', 'sc-legendWrap sc-barLegend');
            var barLegendWrap = g.select('.sc-legendWrap.sc-barLegend');
            gEnter.append('g').attr('class', 'sc-legendWrap sc-lineLegend');
            var lineLegendWrap = g.select('.sc-legendWrap.sc-lineLegend');

            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            //------------------------------------------------------------
            // Title & Legend

            if (showTitle && properties.title) {
                titleWrap.select('.sc-title').remove();

                titleWrap
                    .append('text')
                    .text(properties.title)
                    .attr('class', 'sc-title')
                    .attr('x', direction === 'rtl' ? availableWidth : 0)
                    .attr('y', 0)
                    .attr('dy', '.75em')
                    .attr('text-anchor', 'start')
                    .attr('stroke', 'none')
                    .attr('fill', 'black');

                innerMargin.top += parseInt(g.select('.sc-title').node().getBoundingClientRect().height / 1.15, 10) +
                    parseInt(g.select('.sc-title').style('margin-top'), 10) +
                    parseInt(g.select('.sc-title').style('margin-bottom'), 10);
            }

            if (showLegend) {

                // bar series legend
                barLegend
                    .id('barlegend_' + chart.id())
                    .strings(chart.strings().barlegend)
                    .align('left')
                    .height(availableHeight - innerMargin.top);
                barLegendWrap
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
                lineLegendWrap
                    .datum(lineLegendData)
                    .call(lineLegend);

                maxLineLegendWidth = lineLegend.calculateWidth();

                // calculate proportional available space
                widthRatio = availableWidth / (maxBarLegendWidth + maxLineLegendWidth);

                barLegend
                    .arrange(Math.floor(widthRatio * maxBarLegendWidth));

                lineLegend
                    .arrange(Math.floor(widthRatio * maxLineLegendWidth));

                barLegendWrap
                    .attr('transform', 'translate(' + (direction === 'rtl' ? availableWidth - barLegend.width() : 0) + ',' + innerMargin.top + ')');
                lineLegendWrap
                    .attr('transform', 'translate(' + (direction === 'rtl' ? 0 : availableWidth - lineLegend.width()) + ',' + innerMargin.top + ')');
            }

            //------------------------------------------------------------
            // Recalculate inner margins based on legend size

            innerMargin.top += Math.max(barLegend.height(), lineLegend.height()) + 4;
            innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;

            //------------------------------------------------------------
            // Initial call of Main Chart Components

            var lx = x.domain(d3.merge(seriesX)).rangeBands([0, availableWidth - margin.left - margin.right], 0.3),
                ly = Math.max(d3.max(d3.merge(seriesY)), quotaValue, targetQuotaValue || 0),
                forceY = Math.ceil(ly * 0.1) * 10,
                lOffset = lx(1) + lx.rangeBand() / (multibar.stacked() || dataLines.length === 1 ? 2 : 4);

            // Main Bar Chart
            multibar
                .width(innerWidth)
                .height(innerHeight)
                .forceY([0, forceY])
                .id(chart.id());
            barsWrap
                .datum(dataBars)
                .call(multibar);

            // Main Line Chart
            lines1
                .margin({top: 0, right: lOffset, bottom: 0, left: lOffset})
                .width(innerWidth)
                .height(innerHeight)
                .forceY([0, forceY])
                .useVoronoi(false)
                .id('outline_' + chart.id());
            lines2
                .margin({top: 0, right: lOffset, bottom: 0, left: lOffset})
                .width(innerWidth)
                .height(innerHeight)
                .forceY([0, forceY])
                .useVoronoi(false)
                .size(pointSize)
                .sizeRange([pointSize, pointSize])
                .sizeDomain([pointSize, pointSize])
                .id('foreground_' + chart.id());
            linesWrap1
                .datum(dataLines)
                .call(lines1);
            linesWrap2
                .datum(dataLines)
                .call(lines2);

            // Axes
            xAxisWrap
                .call(xAxis);
            var xAxisMargin = xAxis.margin();

            yAxisWrap
                .style('opacity', dataBars.length ? 1 : 0)
                .call(yAxis);
            var yAxisMargin = yAxis.margin();


            //------------------------------------------------------------
            // Quota Line

            quotaWrap.selectAll('line').remove();
            yAxisWrap.selectAll('text.sc-quotaValue').remove();
            yAxisWrap.selectAll('text.sc-targetQuotaValue').remove();

            var quotaTextWidth = 0,
                quotaTextHeight = 14;

            // Target Quota Line
            if (targetQuotaValue > 0) {
                quotaWrap.append('line')
                    .attr('class', 'sc-quotaLineTarget')
                    .attr('x1', 0)
                    .attr('y1', 0)
                    .attr('x2', innerWidth)
                    .attr('y2', 0)
                    .attr('transform', 'translate(0,' + y(targetQuotaValue) + ')')
                    .style('stroke-dasharray', '8, 8');

                quotaWrap.append('line')
                    .datum({key: targetQuotaLabel, val: targetQuotaValue})
                    .attr('class', 'sc-quotaLineTarget sc-quotaLineBackground')
                    .attr('x1', 0)
                    .attr('y1', 0)
                    .attr('x2', innerWidth)
                    .attr('y2', 0)
                    .attr('transform', 'translate(0,' + y(targetQuotaValue) + ')');

                // Target Quota line label
                yAxisWrap.append('text')
                    .text(yAxis.valueFormat()(targetQuotaValue, true))
                    .attr('class', 'sc-targetQuotaValue')
                    .attr('dy', '.36em')
                    .attr('dx', '0')
                    .attr('text-anchor', direction === 'rtl' ? 'start' : 'end')
                    .attr('transform', 'translate(' + (0 - yAxis.tickPadding()) + ',' + y(targetQuotaValue) + ')');

                quotaTextWidth = Math.round(g.select('text.sc-targetQuotaValue').node().getBoundingClientRect().width + yAxis.tickPadding());
            }

            if (quotaValue > 0) {
                quotaWrap.append('line')
                    .attr('class', 'sc-quotaLine')
                    .attr('x1', 0)
                    .attr('y1', 0)
                    .attr('x2', innerWidth)
                    .attr('y2', 0)
                    .attr('transform', 'translate(0,' + y(quotaValue) + ')')
                    .style('stroke-dasharray', '8, 8');

                quotaWrap.append('line')
                    .datum({key: quotaLabel, val: quotaValue})
                    .attr('class', 'sc-quotaLine sc-quotaLineBackground')
                    .attr('x1', 0)
                    .attr('y1', 0)
                    .attr('x2', innerWidth)
                    .attr('y2', 0)
                    .attr('transform', 'translate(0,' + y(quotaValue) + ')');

                // Quota line label
                yAxisWrap.append('text')
                    .text(yAxis.valueFormat()(quotaValue, true))
                    .attr('class', 'sc-quotaValue')
                    .attr('dy', '.36em')
                    .attr('dx', '0')
                    .attr('text-anchor', direction === 'rtl' ? 'start' : 'end')
                    .attr('transform', 'translate(' + -yAxis.tickPadding() + ',' + y(quotaValue) + ')');

                quotaTextWidth = Math.max(quotaTextWidth, Math.round(g.select('text.sc-quotaValue').node().getBoundingClientRect().width + yAxis.tickPadding()));
            }

            //------------------------------------------------------------
            // Calculate intial dimensions based on first Axis call

            // Temporarily reset inner dimensions
            innerWidth = availableWidth - innerMargin.left - Math.max(quotaTextWidth, yAxisMargin.left) - innerMargin.right - yAxisMargin.right;
            innerHeight = availableHeight - innerMargin.top - yAxisMargin.top - innerMargin.bottom - yAxisMargin.bottom;

            //------------------------------------------------------------
            // Recall Main Chart and Axis

            multibar
                .width(innerWidth)
                .height(innerHeight);
            barsWrap
                .call(multibar);
            xAxisWrap
                .call(xAxis);
            yAxisWrap
                .call(yAxis);

            xAxisMargin = xAxis.margin();
            yAxisMargin = yAxis.margin();

            //------------------------------------------------------------
            // Recalculate final dimensions based on new Axis size

            // Reset inner margins
            innerMargin.left += Math.max(quotaTextWidth, xAxisMargin.left, yAxisMargin.left);
            innerMargin.right += Math.max(xAxisMargin.right, yAxisMargin.right);
            innerMargin.top += Math.max(xAxisMargin.top, yAxisMargin.top);
            innerMargin.bottom += Math.max(xAxisMargin.bottom, yAxisMargin.bottom);

            // Reset inner dimensions
            innerWidth = availableWidth - innerMargin.left - innerMargin.right;
            innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;

            //------------------------------------------------------------
            // Recall Main Chart Components based on final dimensions

            multibar
                .width(innerWidth)
                .height(innerHeight);

            barsWrap
                .attr('transform', 'translate(' + innerMargin.left + ',' + innerMargin.top + ')')
                .call(multibar);

            lines1
                .width(innerWidth)
                .height(innerHeight);
            lines2
                .width(innerWidth)
                .height(innerHeight);

            linesWrap1
                .attr('transform', 'translate(' + innerMargin.left + ',' + innerMargin.top + ')')
                .call(lines1);
            linesWrap2
                .attr('transform', 'translate(' + innerMargin.left + ',' + innerMargin.top + ')')
                .call(lines2);

            quotaWrap
                .attr('transform', 'translate(' + innerMargin.left + ',' + innerMargin.top + ')')
                .selectAll('line')
                    .attr('x2', innerWidth);

            xAxisWrap
                .attr('transform', 'translate(' + innerMargin.left + ',' + (xAxis.orient() === 'bottom' ? innerHeight + innerMargin.top : innerMargin.top) + ')')
                .call(xAxis);

            yAxis
                .ticks(Math.ceil(innerHeight / 48))
                .tickSize(-innerWidth, 0);

            yAxisWrap
                .attr('transform', 'translate(' + (yAxis.orient() === 'left' ? innerMargin.left : innerMargin.left + innerWidth) + ',' + innerMargin.top + ')')
                .call(yAxis);

            if (targetQuotaValue > 0) {

                quotaWrap.select('line.sc-quotaLineTarget')
                    .attr('x2', innerWidth)
                    .attr('transform', 'translate(0,' + y(targetQuotaValue) + ')');
                yAxisWrap.select('text.sc-targetQuotaValue')
                    .attr('transform', 'translate(' + (0 - yAxis.tickPadding()) + ',' + y(targetQuotaValue) + ')');

                quotaTextHeight = Math.round(parseInt(g.select('text.sc-targetQuotaValue').node().getBoundingClientRect().height, 10) / 1.15);

                //check if tick lines overlap quota values, if so, hide the values that overlap
                yAxisWrap.selectAll('g.tick, g.sc-axisMaxMin')
                    .each(function(d, i) {
                        if (Math.abs(y(d) - y(targetQuotaValue)) <= quotaTextHeight) {
                            d3.select(this).style('opacity', 0);
                        }
                    });
            }

            if (quotaValue > 0) {

                quotaWrap.select('line.sc-quotaLine')
                    .attr('x2', innerWidth)
                    .attr('transform', 'translate(0,' + y(quotaValue) + ')');
                yAxisWrap.select('text.sc-quotaValue')
                    .attr('transform', 'translate(' + (0 - yAxis.tickPadding()) + ',' + y(quotaValue) + ')');

                quotaTextHeight = Math.round(parseInt(g.select('text.sc-quotaValue').node().getBoundingClientRect().height, 10) / 1.15);

                //check if tick lines overlap quota values, if so, hide the values that overlap
                yAxisWrap.selectAll('g.tick, g.sc-axisMaxMin')
                    .each(function(d, i) {
                        if (Math.abs(y(d) - y(quotaValue)) <= quotaTextHeight) {
                            d3.select(this).style('opacity', 0);
                        }
                    });

                // if there is a quota and an adjusted quota
                // check to see if the adjusted collides
                if (targetQuotaValue > 0) {
                    if (Math.abs(y(quotaValue) - y(targetQuotaValue)) <= quotaTextHeight) {
                        yAxisWrap.select('.sc-targetQuotaValue').style('opacity', 0);
                    }
                }
            }

            //============================================================
            // Event Handling/Dispatching (in chart's scope)
            //------------------------------------------------------------

            quotaWrap.selectAll('line.sc-quotaLineBackground')
                .on('mouseover', function(d) {
                    if (tooltips) {
                        var eo = {
                            val: d.val,
                            key: d.key,
                            e: d3.event
                        };
                        showQuotaTooltip(eo, that.parentNode);
                    }
                })
                .on('mouseout', function() {
                    dispatch.tooltipHide();
                })
                .on('mousemove', function() {
                    dispatch.tooltipMove(d3.event);
                });

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
                        g.selectAll('.sc-series').classed('disabled', false);
                        return d;
                    });
                }
                container.call(chart);
            });

            dispatch.on('tooltipShow', function(eo) {
                if (tooltips) {
                    showTooltip(eo, that.parentNode, dataGroup);
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

            dispatch.on('chartClick', function() {
                if (barLegend.enabled()) {
                    barLegend.dispatch.closeMenu();
                }
                if (lineLegend.enabled()) {
                    lineLegend.dispatch.closeMenu();
                }
            });

            multibar.dispatch.on('elementClick', function(eo) {
                dispatch.chartClick();
                barClick(data, eo, chart, container);
            });

        });

        return chart;
    }

    //============================================================
    // Event Handling/Dispatching (out of chart's scope)
    //------------------------------------------------------------

    lines2.dispatch.on('elementMouseover.tooltip', function(eo) {
        dispatch.tooltipShow(eo);
    });

    lines2.dispatch.on('elementMousemove', function(e) {
        dispatch.tooltipMove(e);
    });

    lines2.dispatch.on('elementMouseout.tooltip', function() {
        dispatch.tooltipHide();
    });

    multibar.dispatch.on('elementMouseover.tooltip', function(eo) {
        dispatch.tooltipShow(eo);
    });

    multibar.dispatch.on('elementMousemove', function(e) {
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
    chart.lines1 = lines1;
    chart.lines2 = lines2;
    chart.multibar = multibar;
    chart.barLegend = barLegend;
    chart.lineLegend = lineLegend;
    chart.xAxis = xAxis;
    chart.yAxis = yAxis;

    fc.rebind(chart, multibar, 'id', 'x', 'y', 'xScale', 'yScale', 'xDomain', 'yDomain', 'forceX', 'forceY', 'clipEdge', 'color', 'fill', 'classes', 'gradient');
    fc.rebind(chart, multibar, 'stacked', 'showValues', 'valueFormat', 'nice');
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

    chart.showLegend = function(_) {
        if (!arguments.length) {
            return showLegend;
        }
        showLegend = _;
        return chart;
    };

    chart.showControls = function(_) {
        if (!arguments.length) {
            return false;
        }
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

    chart.barClick = function(_) {
        if (!arguments.length) {
            return barClick;
        }
        barClick = _;
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
        multibar.direction(_);
        yAxis.direction(_);
        barLegend.direction(_);
        lineLegend.direction(_);
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
