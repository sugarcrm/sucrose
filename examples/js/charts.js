
function sucroseCharts(type) {
  var chart,
      showTitle = true,
      showLegend = true,
      tooltips = true;

  switch (type) {
    case 'pie':
      chart = sucrose.models.pieChart()
        .donut(true)
        .donutRatio(0.5)
        .pieLabelsOutside(true)
        .maxRadius(250)
        .minRadius(100)
        .tooltipContent(function (key, x, y, e, graph) {
          return '<p>Stage: <b>' + key + '</b></p>' +
                 '<p>Amount: <b>$' + parseInt(y) + 'K</b></p>' +
                 '<p>Percent: <b>' + x + '%</b></p>';
        });
        // .rotateDegrees(rotate)
        // .arcDegrees(arc)
        // .fixedRadius(function (container, chart) {
        //   var n = d3.select('#chart1').node(),
        //       r = Math.min(n.clientWidth * 0.25, n.clientHeight * 0.4);
        //   return Math.max(r, 75);
        // });

      chart.pie
        .textureFill(false);
      break;
    case 'funnel':
      chart = sucrose.models.funnelChart()
        .tooltipContent(function (key, x, y, e, graph) {
          return '<p>Stage: <b>' + key + '</b></p>' +
                 '<p>Amount: <b>$' + parseInt(y) + 'K</b></p>' +
                 '<p>Percent: <b>' + x + '%</b></p>';
        });

      chart.funnel
        .textureFill(true);
      break;
    case 'multibar':
      chart = sucrose.models.multiBarChart()
        .showControls(true)
        .stacked(true)
        // .margin({top: 0, right: 0, bottom: 0, left: 0})
        // TODO: replace when PAT-2448 is merged
        // .valueFormat(function (d) {
        //   var si = d3.formatPrefix(d, 2);
        //   return d3.round(si.scale(d), 2) + si.symbol;
        // })
        .tooltipContent(function (key, x, y, e, graph) {
          return '<p>Outcome: <b>' + key + '</b></p>' +
                 '<p>Percentage: <b>' + x + '%</b></p>' +
                 '<p>Amount: <b>$' + parseInt(y, 10) + 'K</b></p>';
        })
        .seriesClick(function (data, eo, chart) {
          chart.dataSeriesActivate(eo);
        })
        .overflowHandler(function (d) {
          var b = $('body');
          b.scrollTop(b.scrollTop() + d);
        });

      chart.multibar
        .textureFill(true);

      chart.yAxis
        .tickFormat(chart.multibar.valueFormat());
      break;
    case 'line':
      chart = sucrose.models.lineChart()
        .showControls(true)
        .useVoronoi(true)
        .clipEdge(false)
        .tooltipContent(function (key, x, y, e, graph) {
          var content = '<p>Category: <b>' + key + '</b></p>' +
                 '<p>Amount: <b>$' + parseInt(y) + 'M</b></p>',
              dateCheck = new Date(x);
          if (dateCheck instanceof Date && !isNaN(dateCheck.valueOf())) {
            content += '<p>Date: <b>' + x + '</b></p>';
          }
          return content;
        });
      break;
    case 'bubble':
      chart = sucrose.models.bubbleChart()
        .x(function (d) { return d3.time.format('%Y-%m-%d').parse(d.x); })
        .y(function (d) { return d.y; })
        .tooltipContent(function (key, x, y, e, graph) {
          return '<p>Assigned: <b>' + e.point.assigned_user_name + '</b></p>' +
                 '<p>Amount: <b>$' + d3.format(',.2d')(e.point.opportunity) + '</b></p>' +
                 '<p>Close Date: <b>' + d3.time.format('%x')(d3.time.format('%Y-%m-%d').parse(e.point.x)) + '</b></p>' +
                 '<p>Probability: <b>' + e.point.probability + '%</b></p>' +
                 '<p>Account: <b>' + e.point.account_name + '</b></p>';
        })
        .groupBy(function (d) {
            return d.assigned_user_name;
        })
        .filterBy(function (d) { return d.probability; });
      break;
    case 'treemap':
      chart = sucrose.models.treemapChart()
        .leafClick(function (d) {
          alert('leaf clicked');
        })
        .getSize(function (d) { return d.size; });
      showTitle = false;
      showLegend = false;
      break;
    case 'pareto':
      chart = sucrose.models.paretoChart()
        .stacked(true)
        .clipEdge(false)
        .yAxisTickFormat(function(d) {
          var si = d3.formatPrefix(d, 2);
          return '$' + d3.round(si.scale(d), 2) + si.symbol;
        })
        .quotaTickFormat(function(d) {
          var si = d3.formatPrefix(d, 2);
          return '$' + d3.round(si.scale(d), 2) + si.symbol;
        })
        .tooltipBar(function(key, x, y, e, graph) {
          return '<p><b>' + key + '</b></p>' +
            '<p><b>' + y + '</b></p>' +
            '<p><b>' + x + '%</b></p>';
        })
        .tooltipLine(function(key, x, y, e, graph) {
          return '<p><p>' + key + ': <b>' + y + '</b></p>';
        })
        .tooltipQuota(function(key, x, y, e, graph) {
          return '<p>' + e.key + ': <b>$' + y + '</b></p>';
        })
        .barClick(function(data, eo, chart, container) {
            var d = eo.series,
                selectedSeries = eo.seriesIndex;

            chart.dispatch.tooltipHide();

            d.disabled = !d.disabled;

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
                    container.selectAll('.sc-series').classed('disabled', false);
                    return d;
                });
            }

            container.call(chart);
        });
      break;
    case 'gauge':
      chart = sucrose.models.gaugeChart()
        .x(function(d) { return d.key; })
        .y(function(d) { return d.y; })
        .ringWidth(50)
        .maxValue(9)
        .transitionMs(4000);
      break;
  }

  chart
    .showTitle(showTitle)
    .showLegend(showLegend)
    .tooltips(tooltips);

  if (chart.seriesClick) {
    chart
      .seriesClick(function (data, eo, chart) {
        chart.dataSeriesActivate(eo);
      });
  }

  return chart;
}
