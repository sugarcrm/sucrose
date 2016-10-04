
var sucroseCharts = function () {

  function getDefaultConfiguration(type, chart) {
    var config = {};
    var defaultOptions = configs.default;
    var chartOptions = configs[type];
    var k;

    for (k in defaultOptions) {
      if (!defaultOptions.hasOwnProperty(k)) {
        continue;
      }
      if (!chart[k]) {
        continue;
      }
      config[k] = defaultOptions[k];
    }

    for (k in chartOptions) {
      if (!chartOptions.hasOwnProperty(k)) {
        continue;
      }
      if (k.substr(0,1) === '_') {
        continue;
      }
      config[k] = chartOptions[k];
    }

    return config;
  }

  function applyConfigurationSettings(config, settings) {
    var KEYMETHODMAP = {
          'show_labels': 'showLabels',
          'show_values': 'showValues',
          'allow_scroll': 'allowScroll',
          'tick_display': 'tickDisplay',
          'color_data': 'colorData',
          'color_options': 'colorOptions',
          'hole_label': 'holeLabel',
          'donut_ratio': 'donutRatio',
          'wrap_labels': 'wrapLabels',
          'mirror_axis': 'mirrorAxis',
          'texture_fill': 'textureFill',
          'show_title': 'showTitle',
          'show_legend': 'showLegend',
          'show_controls': 'showControls',
          'series_click': 'seriesClick',
          'tooltips': 'tooltips'
        };
    var k;

    for (k in settings) {
      if (!settings.hasOwnProperty(k)) {
        continue;
      }

      m = KEYMETHODMAP[k] || k;

      config[m] = settings[k];
    }

    return config;
  }

  function configureChart(type, chart, config) {
    var k, v;

    for (k in config)
    {
      if (!config.hasOwnProperty(k)) {
          continue;
      }

      switch (k)
      {
        case 'colorData':
          if (!chart.colorData) {
              continue;
          }
          chart.colorData(config.colorData, config.colorOptions);
          break;

        case 'showLabels':
          v = !!parseInt(config[k], 10);
          if (chart.xAxis) {
              chart.xAxis.axisLabel(v ? 'X-Axis Label' : null);
          }
          if (chart.yAxis) {
              chart.yAxis.axisLabel(v ? 'Y-Axis Label' : null);
          }
          break;

        case 'tickDisplay':
          v = config[k];
          if (chart.wrapTicks) {
              chart.wrapTicks(v.indexOf('wrap') !== -1)
          }
          if (chart.staggerTicks) {
              chart.staggerTicks(v.indexOf('stagger') !== -1)
          }
          if (chart.rotateTicks) {
              chart.rotateTicks(v.indexOf('rotate') !== -1);
          }
          break;

        default:
          if (!chart[k]) {
              continue;
          }
          v = isNaN(parseInt(config[k], 10)) ? config[k] : parseInt(config[k], 10);
          chart[k](v);
      }
    }

    configs[type]._format(chart);
  }

  var configs = {
    default: {
      // clipEdge: false,
      colorData: 'default',
      colorOptions: {},
      // delay: 0,
      direction: 'ltr',
      // duration: 0,
      // forceX: null,
      // forceY: null,
      height: null,
      id: 'chart_',
      locality: null,
      margin: {top: 10, right: 10, bottom: 10, left: 10},
      seriesClick: function (data, eo, chart) {
        chart.dataSeriesActivate(eo);
      },
      showTitle: true,
      showLegend: true,
      showControls: true,
      strings: {
        legend: {close: 'Hide legend', open: 'Show legend'},
        controls: {close: 'Hide controls', open: 'Show controls'},
        noData: 'No Data Available.',
        noLabel: 'undefined'
      },
      // state: {},
      textureFill: true,
      tooltips: true,
      width: null
      // x: null,
      // xDomain: null,
      // y: null,
      // yDomain: null
    },
    multibar: {
      stacked: true,
      _format: function format(chart) {
        chart
          .valueFormat(function (d) {
            return sucrose.utils.numberFormatSI(d, 0, yIsCurrency, chart.locality());
          })
          .tooltipContent(function (key, x, y, e, graph) {
            var val = sucrose.utils.numberFormatRound(y, 2, yIsCurrency, chart.locality()),
                percent = sucrose.utils.numberFormatRound(x, 2, false, chart.locality());
            return '<p>Outcome: <b>' + key + '</b></p>' +
                   '<p>' + (yIsCurrency ? 'Amount' : 'Count') + ': <b>' + val + '</b></p>' +
                   '<p>Percentage: <b>' + percent + '%</b></p>';
          });
          // .overflowHandler(function (d) {
          //   var b = $('body');
          //   b.scrollTop(b.scrollTop() + d);
          // });

        chart.yAxis
          .tickFormat(chart.multibar.valueFormat());
      }
    },
    line: {
      useVoronoi: true,
      clipEdge: false,
      _format: function format(chart) {
        chart
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
      }
    },
    pie: {
      donut: true,
      donutRatio: 0.5,
      pieLabelsOutside: true,
      maxRadius: 250,
      minRadius: 100,
      // rotateDegrees: 0,
      // arcDegrees: 360,
      // fixedRadius: function (container, chart) {
      //   var n = d3.select('#chart_').node(),
      //       r = Math.min(n.clientWidth * 0.25, n.clientHeight * 0.4);
      //   return Math.max(r, 75);
      // }
      _format: function format(chart) {
        chart
          .tooltipContent(function (key, x, y, e, graph) {
            var val = sucrose.utils.numberFormatRound(y, 2, yIsCurrency, chart.locality()),
                percent = sucrose.utils.numberFormatRound(x, 2, false, chart.locality());
            return '<p>Stage: <b>' + key + '</b></p>' +
                   '<p>' + (yIsCurrency ? 'Amount' : 'Count') + ': <b>' + val + '</b></p>' +
                   '<p>Percent: <b>' + percent + '%</b></p>';
          });
      }
    },
    funnel: {
      minLabelWidth: null,
      wrapLabels: null,
      _format: function format(chart) {
        chart
          // .fmtCount(function (d) {
          // })
          // .fmtKey(function (d) {
          // })
          .fmtValue(function (d) {
              return sucrose.utils.numberFormatSI(chart.getValue()(d), 0, yIsCurrency, chart.locality());
          })
          .fmtCount(function (d) {
              return d.count ? ' (' + sucrose.utils.numberFormatSI(d.count, 0, false, chart.locality()) + ')' : '';
          })
          .tooltipContent(function (key, x, y, e, graph) {
            var val = sucrose.utils.numberFormatRound(y, 2, yIsCurrency, chart.locality()),
                percent = sucrose.utils.numberFormatRound(x, 2, false, chart.locality());
            return '<p>Stage: <b>' + key + '</b></p>' +
                   '<p>' + (yIsCurrency ? 'Amount' : 'Count') + ': <b>' + val + '</b></p>' +
                   '<p>Percent: <b>' + percent + '%</b></p>';
          });
      }
    },
    bubble: {
      _format: function format(chart) {
        chart
          .x(function (d) { return d3.timeParse('%Y-%m-%d')(d.x); })
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
                   '<p>Close Date: <b>' + d3.timeFormat('%x')(d3.timeParse('%Y-%m-%d')(e.point.x)) + '</b></p>' +
                   '<p>Probability: <b>' + e.point.probability + '%</b></p>' +
                   '<p>Account: <b>' + e.point.account_name + '</b></p>';
          });
      }
    },
    treemap: {
      showLegend: false,
      showTitle: false,
      _format: function format(chart) {
        chart
          .leafClick(function (d) {
            alert('leaf clicked');
          })
          .getValue(function (d) { return d.size; });
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
      }
    },
    pareto: {
      stacked: true,
      clipEdge: false,
      _format: function format(chart) {
        chart
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
          .seriesClick(function (data, eo, chart, container) {
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
      }
    },
    gauge: {
      ringWidth: 50,
      maxValue: 9,
      transitionMs: 4000,
      _format: function format(chart) {
        chart
          .x(function (d) { return d.key; })
          .y(function (d) { return d.y; });
      }
    },
    area: {
      tooltips: true,
      useVoronoi: false,
      _format: function format(chart) {
        // chart
          // .x(function (d) { return d[0]; })
          // .y(function (d) { return d[1]; })
          //.clipEdge(true)
          //.style('expand', 'stream', 'stacked')
          // .tooltipContent(function (key, x, y, e, graph) {
          //   return '<p>Category: <b>' + key + '</b></p>';
          // });

        // chart.yAxis
        //   .axisLabel('Expenditures ($)')
        //   .tickFormat(d3.format(',.2f'));

        // chart.xAxis
        //   .tickFormat(function (d) { return d3.timeFormat('%x')(new Date(d)); });
      }
    },
    tree: {
      horizontal: false,
      duration: 500,
      _format: function format(chart) {
        chart
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
      }
    },
    globe: {
      showTitle: false,
      _format: function format(chart) {
      }
    }
  };

  return {
    getChartModel: function(type) {
      var model = '';
      switch (type) {
        case 'multibar':
          model = 'multiBarChart';
          break;
        case 'area':
          model = 'stackedAreaChart';
          break;
        case 'tree':
          model = 'tree';
          break;
        default:
          model = type + 'Chart';
      }

      return model;
    },
    getChart: function(type) {
      return sucrose.models[this.getChartModel(type)]();
    },
    getConfig: function(type, chart, settings) {
      return applyConfigurationSettings(getDefaultConfiguration(type, chart), settings);
    },
    get: function (type, locality) {
      var settings = {
        locality: locality
      };
      var chart = this.getChart(type);
      var config = this.getConfig(type, chart, settings);

      configureChart(type, chart, config);

      // chart.transition().duration(500)
      // chart.legend.showAll(true);

      return chart;
    },

    exportToString: function(type) {
      return configs[type]._format.toString().replace(/\n      /g, '\n');
    }
  };

}();
