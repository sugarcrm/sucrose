
var sucroseCharts = function () {
  var showTitle = true,
      showLegend = true,
      showControls = true,
      tooltips = true,
      textureFill = true;

  var charts = {
    pie: function() {
    var chart = sucrose.models.pieChart()
        .donut(true)
        .donutRatio(0.5)
        .pieLabelsOutside(true)
        .maxRadius(250)
        .minRadius(100)
        .tooltipContent(function (key, x, y, e, graph) {
          var val = sucrose.utils.numberFormatRound(y, 2, yIsCurrency, chart.locality()),
              percent = sucrose.utils.numberFormatRound(x, 2, false, chart.locality());
          return '<p>Stage: <b>' + key + '</b></p>' +
                 '<p>' + (yIsCurrency ? 'Amount' : 'Count') + ': <b>' + val + '</b></p>' +
                 '<p>Percent: <b>' + percent + '%</b></p>';
        });
        // .rotateDegrees(rotate)
        // .arcDegrees(arc)
        // .fixedRadius(function (container, chart) {
        //   var n = d3.select('#chart_').node(),
        //       r = Math.min(n.clientWidth * 0.25, n.clientHeight * 0.4);
        //   return Math.max(r, 75);
        // });

      return chart;
    },

    funnel: function() {
    var chart = sucrose.models.funnelChart()
        .fmtValue(function (d) {
            return sucrose.utils.numberFormatSI(d, 0, yIsCurrency, chart.locality());
        })
        .fmtCount(function (d) {
            return d ? ' (' + sucrose.utils.numberFormatSI(d, 2, false, chart.locality()) + ')' : '';
        })
        .tooltipContent(function (key, x, y, e, graph) {
          var val = sucrose.utils.numberFormatRound(y, 2, yIsCurrency, chart.locality()),
              percent = sucrose.utils.numberFormatRound(x, 2, false, chart.locality());
          return '<p>Stage: <b>' + key + '</b></p>' +
                 '<p>' + (yIsCurrency ? 'Amount' : 'Count') + ': <b>' + val + '</b></p>' +
                 '<p>Percent: <b>' + percent + '%</b></p>';
        });

      return chart;
    },

    multibar: function() {
    var chart = sucrose.models.multiBarChart()
        .stacked(true)
        .valueFormat(function (d) {
          return sucrose.utils.numberFormatSI(d, 0, yIsCurrency, chart.locality());
        })
        .tooltipContent(function (key, x, y, e, graph) {
          var val = sucrose.utils.numberFormatRound(y, 2, yIsCurrency, chart.locality()),
              percent = sucrose.utils.numberFormatRound(x, 2, false, chart.locality());
          return '<p>Outcome: <b>' + key + '</b></p>' +
                 '<p>' + (yIsCurrency ? 'Amount' : 'Count') + ': <b>' + val + '</b></p>' +
                 '<p>Percentage: <b>' + percent + '%</b></p>';
        })
        .seriesClick(function (data, eo, chart) {
          chart.dataSeriesActivate(eo);
        });
        // .overflowHandler(function (d) {
        //   var b = $('body');
        //   b.scrollTop(b.scrollTop() + d);
        // });

      chart.yAxis
        .tickFormat(chart.multibar.valueFormat());

      return chart;
    },

    line: function() {
    var chart = sucrose.models.lineChart()
        .useVoronoi(true)
        .clipEdge(false)
        .tooltipContent(function (key, x, y, e, graph) {
          var val = sucrose.utils.numberFormatRound(parseInt(y, 10), 2, yIsCurrency, chart.locality());
          var content = '<p>Category: <b>' + key + '</b></p>' +
                        '<p>' + (yIsCurrency ? 'Amount' : 'Count') + ': <b>' + val + '</b></p>',
              dateCheck = new Date(x);
          if (dateCheck instanceof Date && !isNaN(dateCheck.valueOf())) {
            content += '<p>Date: <b>' + sucrose.utils.dateFormat(x, '%x', chart.locality()) + '</b></p>';
          }
          return content;
        });

      return chart;
    },

    bubble: function() {
    var chart = sucrose.models.bubbleChart()
        .x(function (d) { return d3.time.format('%Y-%m-%d').parse(d.x); })
        .y(function (d) { return d.y; })
        .groupBy(function (d) {
            return d.assigned_user_name;
        })
        .filterBy(function (d) {
          return d.probability;
        })
        .tooltipContent(function (key, x, y, e, graph) {
          return '<p>Assigned: <b>' + e.point.assigned_user_name + '</b></p>' +
                 '<p>Amount: <b>$' + d3.format(',.2d')(e.point.opportunity) + '</b></p>' +
                 '<p>Close Date: <b>' + d3.time.format('%x')(d3.time.format('%Y-%m-%d').parse(e.point.x)) + '</b></p>' +
                 '<p>Probability: <b>' + e.point.probability + '%</b></p>' +
                 '<p>Account: <b>' + e.point.account_name + '</b></p>';
        });

      return chart;
    },

    treemap: function() {
    var chart = sucrose.models.treemapChart()
        .leafClick(function (d) {
          alert('leaf clicked');
        })
        .getSize(function (d) { return d.size; });
        // .getSize(function (d) { return d.value; })
        // .tooltipContent(function (point) {
        //   var rep = (point.assigned_user_name) ? point.assigned_user_name : (point.className) ? point.parent.name : point.name,
        //       stage = (point.sales_stage) ? point.sales_stage : (point.className) ? point.name : null,
        //       account = (point.account_name) ? point.account_name : null;
        //   var tt = '<p>Amount: <b>$' + d3.format(',.2s')(point.value) + '</b></p>' +
        //            '<p>Sales Rep: <b>' + rep + '</b></p>';
        //   if (stage) {
        //     tt += '<p>Stage: <b>' + stage + '</b></p>';
        //   }
        //   if (account) {
        //     tt += '<p>Account: <b>' + account + '</b></p>';
        //   }
        //   return tt;
        // })
      showTitle = false;
      showLegend = false;

      return chart;
    },

    pareto: function() {
    var chart = sucrose.models.paretoChart()
        .stacked(true)
        .clipEdge(false)
        .valueFormat(function (d) {
          return sucrose.utils.numberFormatSI(d, 0, yIsCurrency, chart.locality());
        })
        .tooltipBar(function (key, x, y, e, graph) {
          var val = sucrose.utils.numberFormatRound(parseInt(y, 10), 2, yIsCurrency, chart.locality()),
              percent = sucrose.utils.numberFormatRound(x, 2, false, chart.locality());
          return '<p><b>' + key + '</b></p>' +
                 '<p><b>' + val + '</b></p>' +
                 '<p><b>' + percent + '%</b></p>';
        })
        .tooltipLine(function (key, x, y, e, graph) {
          var val = sucrose.utils.numberFormatRound(parseInt(y, 10), 2, yIsCurrency, chart.locality());
          return '<p><p>' + key + ': <b>' + val + '</b></p>';
        })
        .tooltipQuota(function (key, x, y, e, graph) {
          var val = sucrose.utils.numberFormatRound(parseInt(y, 10), 2, yIsCurrency, chart.locality());
          return '<p>' + e.key + ': <b>' + val + '</b></p>';
        })
        .barClick(function (data, eo, chart, container) {
            var d = eo.series,
                selectedSeries = eo.seriesIndex;

            chart.dispatch.tooltipHide();

            d.disabled = !d.disabled;

            if (!chart.stacked()) {
                data.filter(function (d) {
                    return d.series === selectedSeries && d.type === 'line';
                }).map(function (d) {
                    d.disabled = !d.disabled;
                    return d;
                });
            }

            // if there are no enabled data series, enable them all
            if (!data.filter(function (d) {
                return !d.disabled && d.type === 'bar';
            }).length) {
                data.map(function (d) {
                    d.disabled = false;
                    container.selectAll('.sc-series').classed('disabled', false);
                    return d;
                });
            }

            container.call(chart);
        });

      return chart;
    },

    gauge: function() {
    var chart = sucrose.models.gaugeChart()
        .x(function (d) { return d.key; })
        .y(function (d) { return d.y; })
        .ringWidth(50)
        .maxValue(9)
        .transitionMs(4000);

      return chart;
    },

    globe: function() {
    var chart = sucrose.models.globeChart()
        .id('chart_');

      showTitle = false;
      showLegend = false;

      return chart;
    },

    area: function() {
    var chart = sucrose.models.stackedAreaChart()
        .x(function (d) { return d[0]; })
        .y(function (d) { return d[1]; })
        .useVoronoi(false)
        //.clipEdge(true)
        //.style('expand', 'stream', 'stacked')
        .tooltipContent(function (key, x, y, e, graph) {
          return '<p>Category: <b>' + key + '</b></p>';
        });

      chart.yAxis
        .axisLabel('Expenditures ($)')
        .tickFormat(d3.format(',.2f'));

      chart.xAxis
        .tickFormat(function (d) { return d3.time.format('%x')(new Date(d)); });

      tooltips = false;

      return chart;
    },

    tree: function() {
    var chart = sucrose.models.tree()
        .duration(500)
        .nodeSize({'width': 124, 'height': 56})
        .nodeRenderer(function (content, d, w, h) {
          if (!d.image || d.image === '') {
            d.image = 'user.svg';
          }
          var node = content.append('g').attr('class', 'sc-org-node');
              node.append('rect').attr('class', 'sc-org-bkgd')
                .attr('x', 0)
                .attr('y', 0)
                .attr('rx', 2)
                .attr('ry', 2)
                .attr('width', w)
                .attr('height', h);
              node.append('image').attr('class', 'sc-org-avatar')
                .attr('xlink:href', 'img/' + d.image)
                .attr('width', '32px')
                .attr('height', '32px')
                .attr('transform', 'translate(3, 3)');
              node.append('text').attr('class', 'sc-org-name')
                .attr('data-url', d.url)
                .attr('transform', 'translate(38, 11)')
                .text(d.name);
              node.append('text').attr('class', 'sc-org-title')
                .attr('data-url', d.url)
                .attr('transform', 'translate(38, 21)')
                .text(d.title);
          return node;
        })
        .zoomExtents({'min': 0.25, 'max': 4})
        .horizontal(false)
        .nodeClick(function () {
          console.log(d3.select(this).select('.sc-org-name').attr('data-url'));
        })
        .nodeCallback(function (d) {
          var container = d3.select('#chart_ svg');
          d.selectAll('text').text(function () {
            var text = d3.select(this).text();
            return sucrose.utils.stringEllipsify(text, container, 96);
          });
          d.selectAll('image')
            .on('error', function (d) {
              d3.select(this).attr('xlink:href', 'img/user.svg');
            });
          d.select('.sc-org-name')
            .on('mouseover', function (d) {
               d3.select(this).classed('hover', true);
            })
            .on('mouseout', function (d, i) {
               d3.select(this).classed('hover', false);
            });
        });

      showTitle = false;
      showLegend = false;
      tooltips = false;

      return chart;
    }
  };

  return {
    get: function (type, locality) {

      var chart = charts[type]();

      if (chart.showTitle) {
        chart
          .showTitle(showTitle);
      }
      if (chart.showLegend) {
        chart
          .showLegend(showLegend)
      }
      if (chart.showControls) {
        chart
          .showControls(showControls)
      }
      if (chart.tooltips) {
        chart
          .tooltips(tooltips);
      }
      if (chart.seriesClick) {
        chart
          .seriesClick(function (data, eo, chart) {
            chart.dataSeriesActivate(eo);
          });
      }
      if (chart.textureFill) {
        chart
          .textureFill(textureFill);
      }
      if (chart.locality) {
        chart
          .locality(locality);
      }

      // chart.transition().duration(500)
      // chart.legend.showAll(true);

      return chart;
    },

    exportToString: function(type) {
      var fn = charts[type]
        .toString()
        .replace(/function\s*\(\)\s*{/, '')
        .replace(/[;]*[\n\s]*return chart[;]*[\n\s]*}/, '');
      return fn;
    }
  };

}();
