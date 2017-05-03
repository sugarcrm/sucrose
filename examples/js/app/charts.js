
var sucroseCharts = function() {

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
          'allow_scroll': 'allowScroll',
          'auto_spin': 'autoSping',
          'color_data': 'colorData',
          'color_options': 'colorOptions',
          'donut_ratio': 'donutRatio',
          'hole_label': 'holeLabel',
          'mirror_axis': 'mirrorAxis',
          'series_click': 'seriesClick',
          'show_controls': 'showControls',
          'show_labels': 'showLabels',
          'show_legend': 'showLegend',
          'show_title': 'showTitle',
          'show_values': 'showValues',
          'texture_fill': 'textureFill',
          'tick_display': 'tickDisplay',
          'tooltips': 'tooltips',
          'wrap_labels': 'wrapLabels'
        };
    var k, m;

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
          if (chart[k]) {
            chart[k](v);
          }
      }
    }
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
      seriesClick: function(data, eo, chart) {
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
    area: {
      tooltips: true,
      useVoronoi: false,
      _format: function format(chart, callback) {
        // chart
          // .x(function(d) { return d[0]; })
          // .y(function(d) { return d[1]; })
          //.clipEdge(true)
          //.style('expand', 'stream', 'stacked')
          // .tooltipContent(function(key, x, y, e, graph) {
          //   return '<p>Category: <b>' + key + '</b></p>';
          // });

        // chart.yAxis
        //   .axisLabel('Expenditures ($)')
        //   .tickFormat(d3.format(',.2f'));

        // chart.xAxis
        //   .tickFormat(function(d) { return d3.timeFormat('%x')(new Date(d)); });
        callback(chart);
      }
    },
    bubble: {
      _format: function format(chart, callback) {
        chart
          .x(function(d) { return d3.timeParse('%Y-%m-%d')(d.x); })
          .y(function(d) { return d.y; })
          .groupBy(function(d) {
              return d.assigned_user_name;
          })
          .filterBy(function(d) {
            return d.probability;
          })
          .tooltipContent(function(eo, properties) {
            var point = eo.point;
            return '<p>Assigned: <b>' + point.assigned_user_name + '</b></p>' +
                   '<p>Amount: <b>$' + d3.format(',.2d')(point.opportunity) + '</b></p>' +
                   '<p>Close Date: <b>' + d3.timeFormat('%x')(d3.timeParse('%Y-%m-%d')(point.x)) + '</b></p>' +
                   '<p>Probability: <b>' + point.probability + '%</b></p>' +
                   '<p>Account: <b>' + point.account_name + '</b></p>';
          });
        callback(chart);
      }
    },
    funnel: {
      minLabelWidth: null,
      wrapLabels: null,
      _format: function format(chart, callback) {
        chart
          // .fmtCount(function(d) {
          // })
          // .fmtKey(function(d) {
          // })
          .fmtValue(function(d) {
              return sucrose.utility.numberFormatSI(chart.getValue()(d), 0, yIsCurrency, chart.locality());
          })
          .fmtCount(function(d) {
              return d.count ? ' (' + sucrose.utility.numberFormatSI(d.count, 0, false, chart.locality()) + ')' : '';
          })
          .tooltipContent(function(eo, properties) {
            var key = chart.fmtKey()(eo);
            var y = chart.getValue()(eo);
            var x = properties.total ? (y * 100 / properties.total).toFixed(1) : 100;
            var val = sucrose.utility.numberFormatRound(y, 2, yIsCurrency, chart.locality());
            var percent = sucrose.utility.numberFormatRound(x, 2, false, chart.locality());
            return '<p>Stage: <b>' + key + '</b></p>' +
                   '<p>' + (yIsCurrency ? 'Amount' : 'Count') + ': <b>' + val + '</b></p>' +
                   '<p>Percent: <b>' + percent + '%</b></p>';
          });
        callback(chart);
      }
    },
    gauge: {
      ringWidth: 50,
      maxValue: 9,
      transitionMs: 4000,
      _format: function format(chart, callback) {
        chart
          .x(function(d) { return d.key; })
          .y(function(d) { return d.y; });
        callback(chart);
      }
    },
    globe: {
      showTitle: false,
      _format: function format(chart, callback) {
        d3.queue()
          .defer(d3.json, 'data/geo/world-countries-topo-110.json')
          .defer(d3.json, 'data/geo/usa-states-topo-110.json')
          .defer(d3.json, 'data/geo/cldr_en.json')
          .await(function(error, world, country, labels) {
            if (error) {
              return;
            }
            chart
              .worldMap(topojson.feature(world, world.objects.countries).features)
              .countryMap({'USA': topojson.feature(country, country.objects.states).features})
              .countryLabels(labels);
            callback(chart);
          });
      }
    },
    line: {
      useVoronoi: true,
      clipEdge: false,
      _format: function format(chart, callback) {
        chart
          .tooltipContent(function(eo, properties) {
            var key = eo.series.key;
            var x = eo.point.x;
            var y = eo.point.y;
            var val = sucrose.utility.numberFormatRound(parseInt(y, 10), 2, yIsCurrency, chart.locality());
            var content = '<p>Category: <b>' + key + '</b></p>' +
                          '<p>' + (yIsCurrency ? 'Amount' : 'Count') + ': <b>' + val + '</b></p>',
                dateCheck = new Date(x);
            if (dateCheck instanceof Date && !isNaN(dateCheck.valueOf())) {
              content += '<p>Date: <b>' + sucrose.utility.dateFormat(x, '%x', chart.locality()) + '</b></p>';
            }
            return content;
          });
        callback(chart);
      }
    },
    multibar: {
      stacked: true,
      _format: function format(chart, callback) {
        chart
          .valueFormat(function(d) {
            return sucrose.utility.numberFormatSI(d, 0, yIsCurrency, chart.locality());
          })
          .tooltipContent(function(eo, properties) {
            var key = eo.group.label;
            var y = eo.point.y;
            var val = sucrose.utility.numberFormatRound(y, 2, yIsCurrency, chart.locality());
            var content = '<p>Key: <b>' + key + '</b></p>' +
                   '<p>' + (yIsCurrency ? 'Amount' : 'Count') + ': <b>' + val + '</b></p>';
            var percent, group;
            if (typeof eo.group._height !== 'undefined') {
              percent = Math.abs(y * 100 / eo.group._height).toFixed(1);
              percent = sucrose.utility.numberFormatRound(percent, 2, false, chart.locality());
              content += '<p>Percentage: <b>' + percent + '%</b></p>';
            } else {
              group = chart.yAxis.tickFormat()(eo.point.x, eo.pointIndex, null, false);
              content += '<p>Group: <b>' + group + '%</b></p>';
            }
            return content;
          });
          //TODO: fix multibar overfolow handler
          // .overflowHandler(function(d) {
          //   var b = $('body');
          //   b.scrollTop(b.scrollTop() + d);
          // });
        callback(chart);
      }
    },
    pareto: {
      stacked: true,
      clipEdge: false,
      _format: function format(chart, callback) {
        chart
          .valueFormat(function(d) {
            return sucrose.utility.numberFormatSI(d, 0, yIsCurrency, chart.locality());
          })
          .tooltipBar(function(key, x, y, e, graph) {
            var val = sucrose.utility.numberFormatRound(parseInt(y, 10), 2, yIsCurrency, chart.locality()),
                percent = sucrose.utility.numberFormatRound(x, 2, false, chart.locality());
            return '<p><b>' + key + '</b></p>' +
                   '<p><b>' + val + '</b></p>' +
                   '<p><b>' + percent + '%</b></p>';
          })
          .tooltipLine(function(key, x, y, e, graph) {
            var val = sucrose.utility.numberFormatRound(parseInt(y, 10), 2, yIsCurrency, chart.locality());
            return '<p><p>' + key + ': <b>' + val + '</b></p>';
          })
          .tooltipQuota(function(key, x, y, e, graph) {
            var val = sucrose.utility.numberFormatRound(parseInt(y, 10), 2, yIsCurrency, chart.locality());
            return '<p>' + e.key + ': <b>' + val + '</b></p>';
          })
          .seriesClick(function(data, eo, chart, container) {
              var d = eo.series,
                  selectedSeries = eo.seriesIndex;

              chart.dispatch.call('tooltipHide', this);

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
        callback(chart);
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
      // fixedRadius: function(container, chart) {
      //   var n = d3.select('#chart_').node(),
      //       r = Math.min(n.clientWidth * 0.25, n.clientHeight * 0.4);
      //   return Math.max(r, 75);
      // }
      _format: function format(chart, callback) {
        chart
          .tooltipContent(function(eo, properties) {
            var key = chart.fmtKey()(eo);
            var y = chart.getValue()(eo);
            var x = properties.total ? (y * 100 / properties.total).toFixed(1) : 100;
            var val = sucrose.utility.numberFormatRound(y, 2, yIsCurrency, chart.locality());
            var percent = sucrose.utility.numberFormatRound(x, 2, false, chart.locality());
            return '<p>Stage: <b>' + key + '</b></p>' +
                   '<p>' + (yIsCurrency ? 'Amount' : 'Count') + ': <b>' + val + '</b></p>' +
                   '<p>Percent: <b>' + percent + '%</b></p>';
          });
        callback(chart);
      }
    },
    tree: {
      horizontal: false,
      duration: 500,
      _format: function format(chart, callback) {
        chart
          .nodeSize({'width': 124, 'height': 56})
          .nodeRenderer(function(content, d, w, h) {
            var nodeData = d.data;
            if (!nodeData.image || nodeData.image === '') {
              nodeData.image = 'user.svg';
            }
            var container = d3.select('#chart_ svg');
            var node = content.append('g').attr('class', 'sc-org-node');
                node.append('rect').attr('class', 'sc-org-bkgd')
                  .attr('x', 0)
                  .attr('y', 0)
                  .attr('rx', 2)
                  .attr('ry', 2)
                  .attr('width', w)
                  .attr('height', h);
                node.append('image').attr('class', 'sc-org-avatar')
                  .attr('xlink:href', 'img/' + nodeData.image)
                  .attr('width', '32px')
                  .attr('height', '32px')
                  .attr('transform', 'translate(3, 3)')
                  .on('error', function() {
                    d3.select(this).attr('xlink:href', 'img/user.svg');
                  });
                node.append('text').attr('class', 'sc-org-name')
                  .attr('data-url', nodeData.url)
                  .attr('transform', 'translate(38, 11)')
                  .text(function() {
                    return sucrose.utility.stringEllipsify(nodeData.name, container, 96);
                  });
                node.append('text').attr('class', 'sc-org-title')
                  .attr('data-url', nodeData.url)
                  .attr('transform', 'translate(38, 21)')
                  .text(function() {
                    return sucrose.utility.stringEllipsify(nodeData.title, container, 96);
                  });
            return node;
          })
          .zoomExtents({'min': 0.25, 'max': 4})
          .nodeClick(function(d) {
            alert(d.data.name + ' clicked!');
          })
          .nodeCallback(function(nodes) {
            var container = d3.select('#chart_ svg');
            // nodes is the array of enter nodes
            nodes
              .on('mouseover', function(d) {
                var useId = d3.select(this).attr('href');
                container
                  .select(useId)
                  .select('.sc-org-name')
                  .classed('hover', true);
              })
              .on('mouseout', function(d) {
                var useId = d3.select(this).attr('href');
                container
                  .select(useId)
                  .select('.sc-org-name')
                  .classed('hover', false);
              });
          });

        callback(chart);
      }
    },
    treemap: {
      showLegend: false,
      showTitle: false,
      _format: function format(chart, callback) {
        chart
          .leafClick(function(d) {
            alert('leaf clicked');
          })
          .getValue(function(d) { return d.size; });
          // .tooltipContent(function(point) {
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
        callback(chart);
      }
    }
  };

  return {
    getChartModel: function(type) {
      return type + 'Chart';
    },
    getChart: function(type) {
      return sucrose.charts[this.getChartModel(type)]();
    },
    getConfig: function(type, chart, settings) {
      var defaultConfig = getDefaultConfiguration(type, chart);
      return applyConfigurationSettings(defaultConfig, settings);
    },
    get: function(type, locality) {
      var settings = {
        locality: locality
      };
      var chart = this.getChart(type);
      var config = this.getConfig(type, chart, settings);

      configureChart(type, chart, config);
      configs[type]._format(chart, function(d) { return; });

      // chart.transition().duration(500)
      // chart.legend.showAll(true);

      return chart;
    },
    formatToString: function(type) {
      return configs[type]._format.toString()
        .replace(/format\([a-z,\s]*\)/, 'format(callback)')
        .replace(/\n\s*/g, '\n');
    },
    configureToString: function() {
      return configureChart.toString()
        .replace(/configureChart\([a-z,\s]*\)/, 'configure()')
        .replace(/\n\s*/g, '\n');
    }
  };

}();
