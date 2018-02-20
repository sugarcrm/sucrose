
var sucroseCharts = function() {

  function getDefaultConfiguration(type, chart) {
    var config = {};
    var defaultConfig = configs.default;
    var chartConfig = configs[type];
    Object.each(defaultConfig, function(k, v) {
      if (!chart[k]) {
        return;
      }
      config[k] = sucrose.utility.toNative(v);
    });
    Object.each(chartConfig, function(k, v) {
      if (k.substr(0,1) === '_') {
        return;
      }
      config[k] = sucrose.utility.toNative(v);
    });
    return config;
  }

  function applyConfigurationSettings(config, settings, chart) {
    var KEYMETHODMAP = {
          'allow_scroll': 'allowScroll',
          'auto_spin': 'autoSping',
          'color_data': 'colorData',
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
          'wrap_labels': 'wrapLabels'
        };
    var BLOCKEDMETHODS = ['gradient', 'seriesClick'];

    Object.each(settings, function(k, v) {
      var m = KEYMETHODMAP[k] || k;
      if (BLOCKEDMETHODS.indexOf(m) !== -1) {
        return;
      }
      v = sucrose.utility.toNative(v);
      switch (m)
      {
        case 'showLabels':
          v = !!v;
          if (chart.showLabels) {
            config[m] = v;
            break;
          }
          if (chart.xAxisLabel) {
            config['xAxisLabel'] = v ? 'X-Axis Label' : null;
          }
          if (chart.yAxisLabel) {
            config['yAxisLabel'] = v ? 'Y-Axis Label' : null;
          }
          break;
        case 'tick_display':
          if (chart.wrapTicks) {
            config['wrapTicks'] = v.indexOf('wrap') !== -1;
          }
          if (chart.staggerTicks) {
            config['staggerTicks'] = v.indexOf('stagger') !== -1
          }
          if (chart.rotateTicks) {
            config['rotateTicks'] = v.indexOf('rotate') !== -1
          }
          break;
        case 'colorData':
          if (settings.colorOptions) {
            config['colorData'] = [v, settings.colorOptions];
          } else {
            config['colorData'] = v;
          }
          break;
        default:
          config[m] = v;
      }
    });

    Object.each(config, function(k, v) {
      if (!chart[k]) {
        delete config[k];
        return;
      }
      config[k] = sucrose.utility.toNative(v);
    });

    return config;
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
      seriesClick: function(data, eo, chart, labels) {
        if (chart.cellActivate) {
          chart.cellActivate(eo);
        } else if (chart.seriesActivate) {
          chart.seriesActivate(eo);
        } else if (chart.dataSeriesActivate) {
          chart.dataSeriesActivate(eo);
        }
        chart.render();
      },
      showTitle: 'true',
      showLegend: 'true',
      showControls: 'true',
      strings: {
        legend: {close: 'Hide legend', open: 'Show legend'},
        controls: {close: 'Hide controls', open: 'Show controls'},
        noData: 'No Data Available.',
        noLabel: 'undefined'
      },
      // state: {},
      textureFill: 'true',
      tooltips: 'true',
      width: null
      // x: null,
      // xDomain: null,
      // y: null,
      // yDomain: null
    },
    area: {
      useVoronoi: 'false',
      _format: function format(chart, callback) {
        callback(chart);
      }
    },
    bubble: {
      _format: function format(chart, callback) {
        chart
          .x(function(d) { return d3.timeParse('%Y-%m-%d')(d.x); })
          .y(function(d) { return d.y; })
          .size(function(d) { return Math.floor(d.base_amount); })
          .showControls(false)
          .groupBy(function(d) {
              return d.assigned_user_name;
          })
          .filterBy(function(d) {
            return d.probability;
          })
          .tooltipContent(function(eo, properties) {
            var point = eo.point;
            return '<p>Assigned: <b>' + point.assigned_user_name + '</b></p>' +
                   '<p>Amount: <b>' + d3.format(',.2d')(point.opportunity) + '</b></p>' +
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
      showControls: 'false',
      _format: function format(chart, callback) {
        chart
          .fmtValue(function(d) {
            return sucrose.utility.numberFormatSI(chart.getValue()(d), 0, yIsCurrency, chart.locality());
          })
          .fmtCount(function(d) {
            return d.count ? ' (' + sucrose.utility.numberFormatSI(d.count, 0, false, chart.locality()) + ')' : '';
          });
        callback(chart);
      }
    },
    gauge: {
      ringWidth: 50,
      transitionMs: 4000,
      showControls: 'false',
      _format: function format(chart, callback) {
        callback(chart);
      }
    },
    globe: {
      showTitle: 'false',
      _format: function format(chart, callback) {
        d3.queue()
          .defer(d3.json, 'data/geo/world-countries-topo-110.json')
          .defer(d3.json, 'data/geo/usa-states-topo-110.json')
          .defer(d3.json, 'data/geo/cldr_en.json')
          .await(function(error, world, country, labels) {
            var worldMap, countryMap;
            if (error) {
              return;
            }
            worldMap = topojson.feature(world, world.objects.countries).features;
            countryMap = {'USA': topojson.feature(country, country.objects.states).features};
            chart
              .worldMap(worldMap)
              .countryMap(countryMap)
              .countryLabels(labels);
            callback(chart);
          });
      }
    },
    line: {
      useVoronoi: 'true',
      clipEdge: 'false',
      _format: function format(chart, callback) {
        callback(chart);
      }
    },
    multibar: {
      stacked: 'true',
      _format: function format(chart, callback) {
        chart
          .valueFormat(function(d, i, label, isCurrency) {
            return sucrose.utility.numberFormatSI(d, 0, isCurrency, chart.locality());
          });
        //TODO: fix multibar overfolow handler
        // chart.overflowHandler(function(d) {
        //   var b = $('body');
        //   b.scrollTop(b.scrollTop() + d);
        // });
        callback(chart);
      }
    },
    pareto: {
      //TODO: this needs to be set by data
      stacked: 'false',
      clipEdge: 'false',
      _format: function format(chart, callback) {
        chart
          .valueFormat(function(d) {
            return sucrose.utility.numberFormatSI(d, 0, yIsCurrency, chart.locality());
          })
          .tooltipBar(function(key, x, y, e, graph) {
            var val = sucrose.utility.numberFormat(Math.floor(y), 2, yIsCurrency, chart.locality()),
                percent = sucrose.utility.numberFormat(x, 2, false, chart.locality());
            return '<p><b>' + key + '</b></p>' +
                   '<p><b>' + val + '</b></p>' +
                   '<p><b>' + percent + '%</b></p>';
          })
          .tooltipLine(function(key, x, y, e, graph) {
            var val = sucrose.utility.numberFormat(Math.floor(y), 2, yIsCurrency, chart.locality());
            return '<p><p>' + key + ': <b>' + val + '</b></p>';
          })
          .tooltipQuota(function(key, x, y, e, graph) {
            var val = sucrose.utility.numberFormat(Math.floor(y), 2, yIsCurrency, chart.locality());
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
      donut: 'true',
      donutRatio: 0.5,
      pieLabelsOutside: 'true',
      maxRadius: 250,
      minRadius: 100,
      showControls: 'false',
      // rotateDegrees: 0,
      // arcDegrees: 360,
      // fixedRadius: function(container, chart) {
      //   var n = d3.select('#chart_').node(),
      //       r = Math.min(n.clientWidth * 0.25, n.clientHeight * 0.4);
      //   return Math.max(r, 75);
      // }
      _format: function format(chart, callback) {
        callback(chart);
      }
    },
    tree: {
      horizontal: 'false',
      duration: 500,
      _format: function format(chart, callback) {
        chart
          .duration(500)
          .nodeSize({'width': 124, 'height': 56})
          .zoomExtents({'min': 0.25, 'max': 4})
          .nodeRenderer(function(content, d, w, h) {
            var nodeData = d.data;
            var node = content.append('g').attr('class', 'sc-org-node');
            var container = d3.select('#chart_ svg');
            if (!nodeData.image || nodeData.image === '') {
              nodeData.image = 'user.svg';
            }

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

            node
              .on('mouseenter', function(d) {
                d3.select(this)
                  .select('.sc-org-name')
                    .style('text-decoration', 'underline');
              })
              .on('mouseleave', function(d) {
                d3.select(this)
                  .select('.sc-org-name')
                    .style('text-decoration', 'none');
              });

            return node;
          })
          .nodeClick(function(d) {
            console.log(d.data.name + ' clicked!');
          })
          .nodeCallback(function(d, i) {
            var node = d3.select(this);
          });

        callback(chart);
      }
    },
    treemap: {
      showTitle: 'false',
      showLegend: 'false',
      showControls: 'false',
      _format: function format(chart, callback) {
        chart
          .seriesClick(function(data, eo, chart) {
            chart.cellActivate(eo);
          })
          .getValue(function(d) { return d.size; });
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
      var config = getDefaultConfiguration(type, chart);
      return applyConfigurationSettings(config, settings, chart);
    },
    get: function(type, locality) {
      var settings = {
        locality: locality
      };
      var chart = this.getChart(type);
      var config = this.getConfig(type, chart, settings);

      chart.options(config);
      configs[type]._format(chart, function(d) { return; });

      // chart.transition().duration(500)
      // chart.legend.showAll(true);

      return chart;
    },
    formatToString: function(type) {
      var f = configs[type]._format.toString();
      var ast = UglifyJS.parse(f);
      return ast.print_to_string({beautify: true, quote_style: 3});
    }
  };

}();
