/* Copyright (c) 2018 SugarCRM Inc. Licensed by SugarCRM under the Apache 2.0 license. */
'use strict';

$(function() {
    FastClick.attach(document.body);
});

$(function () {
// jQuery.my variables
var Manifest, Config, baseUI;

// jQuery references
var $demo,
    $chart,
    $config,
    $data,
    $example,
    $form,
    $index,
    $menu,
    $options,
    $picker,
    $table,
    $title;

// Application scope variables
var chartStore,
    chartType,
    fileCatalog,
    localeData,
    translationData,
    tooltip;

// Visualization data
var Data,
    chartData,
    tableData;

// Data dependent variables
var xIsDatetime,
    yIsCurrency;

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
function sucroseTable(chart) {
  var table = sucrose.models.table()
        .x(function (d, i) {
            return d.hasOwnProperty('x') ?
                d.x :
                Array.isArray(d) ?
                    d[0] :
                    d.hasOwnProperty('0') ?
                        d[0] :
                        i;
        })
        .y(function (d, i) {
            return d.hasOwnProperty('y') ?
                d.y :
                Array.isArray(d) ?
                    d[1] :
                    d.hasOwnProperty('1') ?
                        d[1] :
                        d;
        });

  return table;
}

function postProcessData(chartData, chartType, Chart) {

  if (chartData.properties) {
    yIsCurrency = chartData.properties.yDataType === 'currency';
    xIsDatetime = chartData.properties.xDataType === 'datetime';
  }

  switch (chartType) {
    //TODO: handle z
    // case 'area':
    // case 'line':
    //   if (chartData.data.length) {
    //     if (Array.isArray(chartData.data[0].values) && Array.isArray(chartData.data[0].values[0])) {
    //       // Convert array data to objects
    //       chartData.data.forEach(function(d, i) {
    //         d.values = d.values.map(function(g, j) {
    //           var value = {x: g[0], y: g[1]};
    //           if (g[2]) {
    //             value.z = g[2];
    //           }
    //           return value;
    //       });
    //       });
    //     }
    //         }
    //     break;

    //TODO: handle inside multibarChart
    case 'multibar':
    case 'pareto':
      Chart.stacked(chartData.properties.stacked === false ? false : true);
        break;
  }
}

function transformTableData(chartData, chartType, Chart) {
  var data = [],
      strNoLabel = 'undefined',
      properties = chartData.properties || {};

  switch (chartType) {
    case 'multibar':
      data = chartData.data.map(function (d, i) {
        var series = {
          key: d.key || strNoLabel,
          count: d.count || null,
          disabled: d.disabled || false,
          series: d.series || i,
          values: (d._values || d.values).map(function (k) {
            return {x: k.x, y: (isNaN(k.value) ? k.y : k.value)};
          })
        };
        if (d.type) {
          series.type = d.type;
        }
        if (d.color) {
          series.color = d.color;
        }
        if (d.classes) {
          series.classes = d.classes;
        }
        return series;
      });
      break;
    case 'funnel':
      data = chartData.data.map(function (d, i) {
        return {
          key: d.key || strNoLabel,
          count: d.count || null,
          disabled: d.disabled || false,
          series: d.series || i,
          values: d.values.map(function (k) {
            return {x: k.x, y: (isNaN(k.value) ? k.y : k.value)};
          })
        };
      });
      break;
    case 'pie':
      data = chartData.data.map(function (d, i) {
        return {
          key: d.key || strNoLabel,
          count: d.count || null,
          disabled: d.disabled || false,
          series: d.series || i,
          values: [{x: i + 1, y: Chart.getValue()(d)}]
        };
      });
      break;
    case 'area':
    case 'line':
      data = chartData.data.map(function (d, i) {
        return {
          key: d.key || strNoLabel,
          disabled: d.disabled || false,
          series: d.series || i,
          values: d.values
        };
      });
      properties.labels = properties.labels || d3.merge(chartData.data.map(function (d) {
          return d.values.map(function (d, i) {
            return chartType === 'lines' ?
              Chart.lines.x()(d, i) :
              Chart.area.x()(d, i);
          });
        }))
        .reduce(function (p, c) {
          if (p.indexOf(c) < 0) p.push(c);
          return p;
        }, [])
        .sort(function (a, b) {
          return a - b;
        })
        .map(function (d, i) {
          return {group: i + 1, l: Chart.xAxis.tickFormat()(d)};
        });
      break;

    case 'tree':
    case 'treemap':
    case 'globe':
    case 'bubble':
      data = [];
      break;

    default:
      data = chartData.data;
  }

  return {
    properties: properties,
    data: data
  };
}

function parseTreemapData(data) {
    var root = {
          name: 'Opportunities',
          children: [],
          x: 0,
          y: 0,
          dx: Math.floor(document.getElementById('chart').offsetWidth),
          dy: Math.floor(document.getElementById('chart').offsetHeight),
          depth: 0,
          colorIndex: '0root_Opportunities'
        },
        colorIndices = ['0root_Opportunities'],
        colors = d3.scale.category20().range();

    var today = new Date();
        today.setUTCHours(0, 0, 0, 0);

    var day_ms = 1000 * 60 * 60 * 24,
        d1 = new Date(today.getTime() + 31 * day_ms);

    var data = data.filter(function(model) {
      // Filter for 30 days from now.
      var d2 = new Date(model.date_closed || '1970-01-01');
      return (d2 - d1) / day_ms <= 30;
    }).map(function (d) {
      // Include properties to be included in leaves
      return {
        assigned_user_name: d.assigned_user_name,
        sales_stage: d.sales_stage,
        name: d.name,
        amount_usdollar: d.amount_usdollar,
        color: d.color
      };
    });

    data = _.groupBy(data, function (m) {
      return m.assigned_user_name;
    });

    _.each(data, function (value, key, list) {
      list[key] = _.groupBy(value, function (m) {
        return m.sales_stage;
      });
    });

    _.each(data, function (value1, key1) {
      var child = [];
      _.each(value1, function (value2, key2) {
        if (colorIndices.indexOf('2oppgroup_' + key2) === -1) {
          colorIndices.push('2oppgroup_' + key2);
        }
        _.each(value2, function (record) {
          record.className = 'stage_' + record.sales_stage.toLowerCase().replace(' ', '');
          record.value = Math.floor(record.amount_usdollar);
          record.colorIndex = '2oppgroup_' + key2;
        });
        child.push({
          name: key2,
          className: 'stage_' + key2.toLowerCase().replace(' ', ''),
          children: value2,
          colorIndex: '2oppgroup_' + key2
        });
      });
      if (colorIndices.indexOf('1rep_' + key1) === -1) {
        colorIndices.push('1rep_' + key1);
      }
      root.children.push({
        name: key1,
        children: child,
        colorIndex: '1rep_' + key1
      });
    });

    function accumulate(d) {
      if (d.children) {
        return d.value = d.children.reduce(function (p, v) { return p + accumulate(v); }, 0);
      }
      return d.value;
    }

    accumulate(root);

    colorIndices.sort(d3.ascending());

    //build color indexes
    function setColorIndex(d) {
      var i, l;
      d.colorIndex = colorIndices.indexOf(d.colorIndex);
      if (d.children) {
        l = d.children.length;
        for (i = 0; i < l; i += 1) {
          setColorIndex(d.children[i]);
        }
      }
    }

    setColorIndex(root);

    return root;
}

function generatePackage(e) {
  e.preventDefault();
  e.stopPropagation();

  function jsonString(d) {
    return JSON.stringify(d, null, '  ');
  }

  var indexTemplate;
  var zip = new JSZip();
  var data = jsonString(Data);
  var settings = Manifest.getConfig();
  var chart = sucroseCharts.getChart(chartType);
  var model = sucroseCharts.getChartModel(chartType);
  var format = sucroseCharts.formatToString(chartType);
  var topojson = chartType === 'globe' ? '<script src="topojson.min.js"></script>' : '';

  settings.locality = Manifest.getLocaleData(settings.locale);
  settings.colorOptions = Manifest.getColorOptions();

  var config = jsonString(sucroseCharts.getConfig(chartType, chart, settings));

  var includes = [
    $.get({url: 'tpl/index.html', dataType: 'text'}),
    $.get({url: 'js/d3.min.js', dataType: 'text'}),
    $.get({url: 'js/sucrose.js', dataType: 'text'}),
    $.get({url: 'css/sucrose.min.css', dataType: 'text'})
  ];

  if (chartType === 'globe') {
    includes.push($.get({url: 'js/topojson.min.js', dataType: 'text'}));
    includes.push($.get({url: 'data/geo/world-countries-topo-110.json', dataType: 'text'}));
    includes.push($.get({url: 'data/geo/usa-states-topo-110.json', dataType: 'text'}));
    includes.push($.get({url: 'data/geo/cldr_en.json', dataType: 'text'}));
  } else if (chartType === 'tree') {
    includes.push($.get({url: 'img/user.svg', dataType: 'text'}));
  }

  $.when
    .apply($, includes) // add defferends as params to $.when
    .then(function () {
      // convert defferends into files array
      return [].slice.apply(arguments, [0]).map(function (result) {
        return result[0];
      });
    })
    .then(function (files) {
      // replace index compoents with file string
      indexTemplate = files[0]
        .replace(/{{Type}}/g, chartType)
        .replace('{{Data}}', data)
        .replace('{{Config}}', config)
        .replace('{{Model}}', model)
        .replace('{{Format}}', format)
        .replace('{{TopoJSON}}', topojson);

      // add files to zip
      zip.file('index-' + chartType + '.html', indexTemplate);
      zip.file('d3.min.js', files[1]);
      zip.file('sucrose.js', files[2]);
      zip.file('sucrose.min.css', files[3]);

      if (chartType === 'globe') {
        zip.file('topojson.min.js', files[4]);
        zip.file('data/geo/world-countries-topo-110.json', files[5]);
        zip.file('data/geo/usa-states-topo-110.json', files[6]);
        zip.file('data/geo/cldr_en.json', files[7]);
      } else if (chartType === 'tree') {
        zip.file('img/user.svg', files[4]);
      }

      // initiate zip download
      zip.generateAsync({type:'blob'}).then(
        function (blob) {
          saveAs(blob, 'sucrose-example-' + chartType + '.zip');
        },
        function (err) {
          console.log(err);
        }
      );
    });
}

function generateImage(e) {
  e.preventDefault();
  e.stopPropagation();

  function reEncode(data) {
    data = encodeURIComponent(data);
    data = data.replace(/%([0-9A-F]{2})/g, function (match, p1) {
      var c = String.fromCharCode('0x' + p1);
      return c === '%' ? '%25' : c;
    });
    return decodeURIComponent(data);
  }

  $.ajax({
      url: 'css/sucrose.css',
      dataType: 'text'
    })
    .success(function (css) {
      var doctype = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';
      var chart = $('#chart_');
      var width = chart.width();
      var height = chart.height();
      var dom = chart.find('svg').html();
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" ' +
                'width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" ' +
                'class="sucrose sc-chart sc-print" style="width:auto;height:auto">' +
                '<defs><style rel="stylesheet" type="text/css"><![CDATA[' + css.replace('url("../', 'url("') + ']]></style></defs>' +
                dom + '</svg>';

      var url = 'data:image/svg+xml;charset=utf-8;base64,' + window.btoa(reEncode(svg));
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');
      var img = new Image();

      canvas.width = width;
      canvas.height = height;
      canvas.className = 'sc-image-canvas';
      document.body.appendChild(canvas);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      img.onload = function () {
          var uri;
          ctx.drawImage(img, 0, 0, width, height);
          uri = canvas.toDataURL('image/png');
          //use saveAs?
          download(uri, 'download' + chartType + '.png', 'image/png');
          ctx.clearRect(0, 0, width, height);
          canvas.remove();
      };

      img.src = url;
    });
}

// RESEARCH
//https://developer.mozilla.org/en-US/docs/Web/API/Window.btoa
//http://techslides.com/save-svg-as-an-image/
//http://tutorials.jenkov.com/svg/svg-and-css.html
//https://developer.mozilla.org/en-US/docs/Web/HTML/Canvas/Drawing_DOM_objects_into_a_canvas
//http://spin.atomicobject.com/2014/01/21/convert-svg-to-png/
//https://github.com/exupero/saveSvgAsPng
//http://danml.com/download.html

function generateData(e) {
  e.preventDefault();
  e.stopPropagation();

  function openTab(url) {
    var a = window.document.createElement('a');
    var evt = new MouseEvent('click', {
          bubbles: false,
          cancelable: true,
          view: window,
        });
    a.target = '_blank';
    a.href = url;
    // Not supported consistently across browsers
    // fall back to open data in new tab
    a.download = 'sucrose-data.json';
    document.body.appendChild(a);
    a.addEventListener('click', function (e) {
      a.parentNode.removeChild(a);
    });
    a.dispatchEvent(evt);
  }

  var json = JSON.stringify(tableData, null, '  ');
  var uri = 'data:text/json;charset=utf-8,' + encodeURIComponent(json);

  openTab(uri);
}

function generateConfig(e) {
  var options = {},
      json,
      uri;

  e.preventDefault();
  e.stopPropagation();

  function openTab(url) {
    var a = window.document.createElement('a');
    var evt = new MouseEvent('click', {
          bubbles: false,
          cancelable: true,
          view: window,
        });
    a.target = '_blank';
    a.href = url;
    // Not supported consistently across browsers
    // fall back to open data in new tab
    a.download = 'sucrose-options.json';
    document.body.appendChild(a);
    a.addEventListener('click', function (e) {
      a.parentNode.removeChild(a);
    });
    a.dispatchEvent(evt);
  }

  options = Manifest.getConfig();

  json = JSON.stringify(options, null, '  ');
  uri = 'data:text/json;charset=utf-8,' + encodeURIComponent(json);

  openTab(uri);
}

function loader(type, options) {
  if (!type) {
    return;
  }

  // Load manifest for chart type
  $.ajax({
      url: 'manifest/' + type + '.json',
      dataType: 'text'
    })
    .then(function (manifest) {
      var presets = {};
      var chartManifest = $.my.fromjson(manifest);

      // Reset manifest UI Object from Base UI
      Manifest.ui = Object.clone(baseUI, true);

      // Combine base and custom Manifest UIs
      Object.merge(Manifest, chartManifest, true);

      // Define additional attributes of form elements
      Object.each(Manifest.ui, function (k, v, d) {
        if (v.hidden) {
          delete d[k];
        } else {
          Object.merge(
            d[k],
            {
              init: function ($o) {
                this.initControl($o);
              },
              bind: function (d, v, $o) {
                return this.bindControl(d, v, $o, this.loadChart);
              },
              values: [
                {value: 'false', label: 'No'},
                {value: 'true', label: 'Yes'}
              ]
            },
            false, // shallow copy
            false  // do not overwrite
          );
        }
      });

      // Set data file options in Manifest control
      Manifest.ui['[name=file]'].values = fileCatalog[type];
      Manifest.ui['[name=locale]'].values = Manifest.getLocaleOptions();

      // Data containers persisted in localStorage
      store.set('example-type', type);
      // Set Application scope variables
      chartType = type;
      chartStore = store.get('example-' + type) || {};
      // TODO: we need to store modified chartData somewhere
      // chartData = chartStore.chartData || {};

      // Build Config data from stored selected values with chart type overrides
      presets = options || chartStore.optionPresets || chartManifest.optionPresets;
      Manifest.setConfig(presets);

      $index.addClass('hidden');
      $demo.removeClass('hidden');

      Manifest.loadForm();

      //
      $picker.find('a')
        .removeClass('active')
        .filter('[data-type=' + type + ']')
        .addClass('active');
    });
}

// jQuery.my manifest
var Manifest =
{
  // Expose this self to all functions
  self: null,

  // For jQuery.my cache (will be reset my chart type manifest)
  id: 'sucrose-demo',

  // (will also be reset by chart type manifest)
  type: 'multibar',
  // ok, what's the deal here?
  locale: 'en_US',

  // D3 chart
  Chart: null,
  // D3 table
  Table: null,

  // CodeMirror
  dataEditor: null,
  configEditor: null,
  lintErrors: [],

  // Default data
  selectedOptions: {},

  // Chart method variables available to chart on render
  seriesLength: 0,
  gradientStart: '#e8e2ca',
  gradientStop: '#3e6c0a',

  // The default values for the BaseUI manifest
  optionDefaults: {
    file: '',
    color_data: 'default',
    gradient: ['false', 'vertical', 'middle'],
    direction: 'ltr',
    locale: 'en_US',
    show_title: 'true'
  },

  // UI elements
  ui: {},


  /* ------------------------
   * INIT functions --------- */

  init: function ($node, runtime) {
    self = this;

    // For each manifest data element, update selected options with preset value
    Object.each(Object.clone(this.data), function (k, v) {
      if (v.val && v.val !== v.def) {
        self.selectedOptions[k] = v.val;
      }
    });

    // Set manifest D3 visualization objects
    this.Chart = sucroseCharts.get(this.type, this.getLocaleData(this.selectedOptions.locale));
    this.Table = sucroseTable(this.Chart);

    if (!['bar', 'line', 'area', 'pie', 'funnel', 'gauge'].find(this.type)) {
      this.Table.strings({noData: 'This chart type does not support table data.'})
    }

    // Set default direction for RTL/LTR
    $('html').css('direction', this.selectedOptions.direction);

    // Conserve space by not prepending to title
    $title.text(($demo.width() < 480 ? '' : 'Sucrose :: ') + this.title);

    // Show chart tab
    this.toggleTab('chart');

    // Insert new manifest form UI row
    Object.each(this.ui, function (k, v) {
      $form.append(self.createOptionRow(k, v));
    });

    // Unbind UI
    $('button')
      .off('click.example touchstart.example touchend.example')
      .toggleClass('active', false);
    $('.tab').off('click.example touchstart.example touchend.example');
    // Rebind UI
    $('button').on('touchstart.example', touchstart);
    // Display panel in full screen
    $('button[data-action=full]')
      .on('click.example touchend.example', function (evt) {
        var $button = $(this);
        evt.stopPropagation();
        $demo.toggleClass('full-screen');
        // $('button[data-action=full]').removeClass('active');
        $('button[data-action=full]').toggleClass('active', $demo.hasClass('full-screen'));
        self.toggleTooltip($button);
        self.chartResizer(self.Chart)(evt);
      });
    // Reset data to original state
    $('button[data-action=reset]')
      .on('click.example touchend.example', function (evt) {
        evt.stopPropagation();
        $example.removeClass('full-screen');
        $('button[data-action=edit]').removeClass('active');
        self.resetChartSize();
        self.loadData(self.data.file.val);
      });

    // Toggle option panel display
    // $('button[data-action=toggle]')
    //   .on('click.example touchend.example', function (evt) {
    //     evt.stopPropagation();
    //     if ($demo.width() > 480) {
    //       $options.toggleClass('hidden');
    //       $example.toggleClass('full-width');
    //     } else {
    //       $options.toggleClass('open');
    //     }
    //     self.chartResizer(self.Chart)(evt);
    //   });

    // Download packaged zip example chart,
    // data json, config json, or image file
    $('button[data-action=download]')
      .on('click.example touchend.example', function (evt) {
        var dataType = $(this).data('type');
        evt.stopPropagation();
        switch (dataType) {
          case 'package':
            generatePackage(evt);
            break;
          case 'data':
            generateData(evt);
            break;
          case 'config':
            generateConfig(evt);
            break;
          case 'image':
            generateImage(evt);
            break;
        }
      });
    // Toggle display of table or code data edit view
    $('button[data-action=edit]')
      .on('click.example touchend.example', function (evt) {
        var $button = $(this);
        evt.stopPropagation();

        switch ($button.data('type')) {
          case 'data':
            if ($button.hasClass('active')) {
              if (!self.lintErrors.length) {
                self.parseRawData(JSON.parse(self.dataEditor.doc.getValue()));
              }
              self.unloadDataEditor('data');
              self.loadTable();
              $table.show();
              $button.removeClass('active');
            } else {
              self.unloadTable();
              self.loadDataEditor('data', Data);
              $table.hide();
              $button.addClass('active');
            }
            break;
          case 'config':
            if ($button.hasClass('active')) {
              if (!self.lintErrors.length) {
                self.setConfig(JSON.parse(self.configEditor.doc.getValue()));
              }
              self.unloadDataEditor('config');
              self.loadForm();
              $button.removeClass('active');
            } else {
              self.unloadForm();
              self.loadDataEditor('config', self.selectedOptions);
              $button.addClass('active');
            }
            break;
        }
      });
    // Toggle display of chart or table tab
    $('.tab')
      .on('touchstart.example', touchstart)
      .on('click.example touchend.example', function (evt) {
        evt.stopPropagation();
        evt.preventDefault();

        $('button[data-action=edit]').removeClass('active');

        switch ($(this).data('toggle')) {
          case 'chart':
            self.unloadDataEditor('data');
            self.unloadTable();
            self.loadChart();
            break;
          case 'table':
            self.unloadChart();
            self.unloadDataEditor('data');
            self.loadTable();
            break;
          case 'options':
            self.toggleTab('options');
            self.unloadDataEditor('config');
            self.chartResizer(self.Chart)(evt);
            break;
        }
      });
  },

  loadForm: function () {
    // TODO: is there a way to reinit jQuery.my with new Config data?
    // I get an bind error if I try to do it, so I have to
    // Delete and recreate the entire form
    $form.remove();
    $('#form_').append('<form class="sucrose"/>');
    // Reset application scope reference to form
    $form = $('#form_ form');
    // Instantiate jQuery.my
    $form.my(Manifest, Config);
  },
  unloadForm: function () {
    $form.hide();
  },

  toggleTab: function (tab) {
    switch (tab) {
      case 'chart':
        $('[data-toggle=chart]').addClass('active');
        $('[data-toggle=table]').removeClass('active');
        $chart.removeClass('hide');
        $('#table_').addClass('hide');
        break;
      case 'table':
        $('[data-toggle=table]').addClass('active');
        $('[data-toggle=chart]').removeClass('active');
        $('#table_').removeClass('hide');
        $chart.addClass('hide');
        break;
      case 'options':
        $('[data-toggle=options]').toggleClass('active');
        $example.toggleClass('full-width');
        $options.toggleClass('open');
        break;
    }
  },
  toggleTooltip: function ($o) {
    var t1 = $o.data('title'),
        t2 = $o.data('title-toggle');
    $o.data('title', t2)
      .data('title-toggle', t1);
    $o.attr('data-title', t2)
      .attr('data-title-toggle', t1);
  },

  /* ------------------------
   * RESIZE functions ------- */

  resetChartSize: function () {
    $chart.removeAttr('style');
    $title.text(($demo.width() < 480 ? '' : 'Sucrose :: ') + this.title);
  },
  // Define resizable handler
  chartResizer: function (chart) {
    // TODO: why can't I debounce?
    return chart.render ?
      function (evt) {
        evt.stopPropagation();
        if ($chart.hasClass('hide')) {
          return;
        }
        chart.render();
      } :
      function (evt) {
        evt.stopPropagation();
        if ($chart.hasClass('hide')) {
          return;
        }
        chart.update();
      };
  },
  windowResizer: function (chart, resetter) {
    return chart.render ?
      (function (evt) {
        resetter();
        if ($chart.hasClass('hide')) {
          return;
        }
        chart.render();
      }).debounce(50) :
      (function (evt) {
        resetter();
        if ($chart.hasClass('hide')) {
          return;
        }
        chart.update();
      }).debounce(50);
  },
  // Render chart without data update
  chartRenderer: function () {
    return this.Chart.render ?
      this.Chart.render :
      this.Chart.update;
  },
  // Render chart with data update
  chartUpdater: function () {
    return this.Chart.update;
  },

  /* ------------------------
   * FORM functions --------- */

  // Create option form row
  createOptionRow: function (k, v) {
    var row = $('<div class="option-row"/>');
    var name = this.getNameFromSelector(k);
    var control = this.createControlFromType(v.type, v.values, name);
    row.append($('<span class="title">' + v.title + '</span>'));
    row.append($(control));
    return row;
  },
  getNameFromSelector: function (k) {
    return k.replace(/\[name=([a-z_]+)\]/, '$1');
  },
  createControlFromType: function (t, v, n) {
    var control;
    switch (t) {
      case 'radio':
        control = this.radioControl(v, n);
        break;
      case 'checkbox':
        control = this.checkboxControl(v, n);
        break;
      case 'select':
        control = this.selectControl(v, n);
        break;
      case 'textarea':
        control = this.textareaControl(v, n);
        break;
      case 'button':
        control = this.buttonControl(v, n);
        break;
      default:
        control = this.textControl(v, n);
        break;
    }
    return $(control);
  },
  radioControl: function (v, n) {
    var radio = '';
    v.each(function (r) {
      radio += '<label><input type="radio" name="' + n + '" value="' + r.value + '">' +
        '<span class="sfa">' + r.label + '</span></label> ';
    });
    return radio;
  },
  checkboxControl: function (v, n) {
    var checkbox = '';
    v.each(function (r) {
      checkbox += '<label><input type="checkbox" name="' + n + '" value="' + r.value + '">' +
        '<span class="sfa">' + r.label + '</span></label> ';
    });
    return checkbox;
  },
  selectControl: function (v, n) {
    var select = '<select name="' + n + '">';
    v.each(function (r) {
      select += '<option value="' + r.value + '">' + r.label + '</option>';
    });
    select += '</select>';
    return select;
  },
  textareaControl: function (v, n) {
    var value = v.map(function (o) { return o.value; }).join(' ');
    var textarea = '<textarea name="' + n + '">' + value + '</textarea>';
    return textarea;
  },
  textControl: function (v, n) {
    var value = v.map(function (o) { return o.value; }).join(' ');
    var text = '<input type="text" name="' + n + '" value="' + value + '">';
    return text;
  },
  buttonControl: function (v, n) {
    var button = '';
    v.each(function (b) {
        button += '<button type="button" name="' + n + '" data-control="' + b.value + '">' +
          b.label + '</button>';
    });
    return button;
  },
  // Get data from this or my scope
  getData: function (d, k) {
    return d[k].val || d[k].def;
  },
  // Set data in this or my scope
  setData: function (d, k, v) {
    d[k].val = v;
  },
  // jQuery.my common method for initializing control
  initControl: function ($o) {
    var k = $o.attr('name');
    var v = this.getData(this.data, k);
    this.setOption(this.data, k, v);
  },
  // jQuery.my common method for binding control
  bindControl: function (d, v, $o, callback) {
    var k = $o.attr('name');
    if (v == null) {
      return this.getData(d, k);
    }
    // Update the my scope data
    this.setData(d, k, v, callback);
    // Store and display chart options
    this.setOption(d, k, v);
    // Usually chartRender or chartUpdate
    callback(v, this);
  },
  setOption: function (d, k, v) {
    // First, lets update and store the option
    // in case it overrides a form preset value
    this.selectedOptions[k] = v;
    // Now, if the options is the default, lets remove it from display
    if (this.selectedOptions[k] === d[k].def) {
      delete this.selectedOptions[k];
    }
    chartStore.optionPresets = Object.clone(this.selectedOptions);
    store.set('example-' + this.type, chartStore);
    this.ui['[name=' + k + ']'].setChartOption(v, this);
  },
  setConfig: function (presets) {
    // Config will contain default value an
    Object.each(this.optionDefaults, function (prop, val) {
      Config[prop] = {};
      Config[prop].def = val;
      Config[prop].val = window.uQuery(prop) || presets[prop];
    });
  },
  getConfig: function () {
    var options = {};
    Object.each(Object.clone(self.data), function (k, v) {
      if (k !== 'file') {
        options[k] = v.val || v.def;
      }
    });
    return options;
  },
  getLocaleOptions: function () {
    return localeData.keys().map(function(k) {
      return {value: k, label: localeData[k].label};
    });
    // var locales = [];
    // Object.each(localeData, function (k, v) {
    //   locales.push({value: k, label: v.language});
    // });
    // return locales;
  },
  getLocaleData: function (lang) {
    return localeData[lang];
  },
  getTranslationData: function (lang) {
    return translationData[lang];
  },


  /* ------------------------
   * CHART functions -------- */

  loadChart: function () {
    this.unloadChart();
    this.toggleTab('chart');

    chartData = Object.clone(Data, true);

    // this.toggleTab(true);
    $chart.append('<svg/>');
    $chart.find('svg').attr('class', 'sucrose sc-chart'); // + ($chart.hasClass('hide') ? ' hide' : '')

    // Bind D3 chart to SVG element
    d3.select('#chart_ svg').datum(chartData).call(this.Chart);

    // Dismiss tooltips
    d3.select('#chart_').on('click', this.Chart.dispatch.chartClick);

    // Rebind jQuery resizable plugin
    $chart.resizable({
      containment: 'parent',
      minHeight: 200,
      minWidth: 200,
      autoHide: true
    });

    // Rebind window resizer
    $(window).on('resize.example', this.windowResizer(this.Chart, this.resetChartSize));
    $chart.on('resize.example', this.chartResizer(this.Chart));
  },
  unloadChart: function () {
    $(window).off('resize.example');
    $chart.off('resize.example');
    $chart.find('svg').remove();
  },
  updateChartDataCell: function (d, i, k, v) {
    var series = Data.data[d.series];
    if (series.hasOwnProperty('value')) {
      series.value = v;
    } else {
      series.values[i][k] = v;
    }
    if (series._values) {
      if (series.hasOwnProperty('value')) {
        series._value = v;
      } else {
        series._values[i][k] = v;
      }
    }
  },
  updateChartDataSeries: function (d, k, v) {
    var series = Data.data.find({key: d.key});
    series[k] = v;
  },
  updateColorModel: function (v) {
    var color = this.getData(self.data, 'color_data');
    var options = this.getColorOptions();
    if (!this.Chart.colorData) {
      return;
    }
    this.Chart.colorData(color, options);
  },
  getColorOptions: function () {
    var options, color, gradient, startColor, stopColor, lengthColor;

    options = {};
    color = this.getData(self.data, 'color_data');
    gradient = this.getData(self.data, 'gradient');
    startColor = this.gradientStart;
    stopColor = this.gradientStop;
    lengthColor = this.colorLength;

    if (this.type === 'globe') {
      if (color === 'graduated') {
        startColor = '#41E864';
        stopColor = '#3578B2';
        lengthColor = 13;
      } else
      if (color === 'data') {
        startColor = '#aaa';
        stopColor = '#369';
      }
    }

    if (color === 'graduated') {
      options = {c1: startColor, c2: stopColor, l: lengthColor};
    } else
    if (color === 'data') {
      options = {c1: startColor, c2: stopColor};
    }

    if (color !== 'class' && this.gradientStop && gradient.filter('true').length) {
      options.gradient = true;
      options.orientation = gradient.filter('horizontal').length ? 'horizontal' : 'vertical';
      options.position = gradient.filter('base').length ? 'base' : 'middle';
    }

    return options;
  },

  /* ------------------------
   * DATA EDITOR functions -- */

  loadDataEditor: function (id, json) {
    this.unloadDataEditor(id);
    if (id === 'data') {
      this.dataEditor = this.createEditor(id, json);
    } else if (id === 'config') {
      this.configEditor = this.createEditor(id, json);
    }
  },
  unloadDataEditor: function (id) {
    if (id === 'data') {
      $data.find('.CodeMirror').remove();
      this.dataEditor = null;
    } else if (id === 'config') {
      $config.find('.CodeMirror').remove();
      this.configEditor = null;
    }
  },
  createEditor: function (id, json) {
    var options = {
      value: JSON.stringify(json, null, '  '),
      mode:  'application/json',
      lint: {
        getAnnotations: CodeMirror.jsonValidator,
        onUpdateLinting: function (annotationsNotSorted, annotations, cm) {
          // if (!annotationsNotSorted.length) {
          //   self.parseRawData(cm.doc.getValue());
          // }
          self.lintErrors = annotationsNotSorted;
        }
      },
      tabSize: 2,
      lineNumbers: true,
      foldGutter: true,
      gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter', 'CodeMirror-lint-markers']
    };
    var editor = CodeMirror(document.getElementById(id + '_'), options);
    editor.focus();
    return editor;
  },

  /* ------------------------
   * TABLE EDITOR functions - */

  loadTable: function () {
    // this.unloadDataEditor();
    this.unloadTable();

    this.toggleTab('table');

    chartData = Object.clone(Data, true);

    tableData = transformTableData(chartData, this.type, this.Chart);

    // Object.watch(tableData, 'data', function () {
    //   console.log('property changed!');
    // });

    // Bind D3 table to TABLE element
    d3.select('#table_').datum(tableData).call(this.Table);

    // Dismiss editor
    d3.select('#table_').on('click', this.Chart.dispatch.tableClick);

    $table = $('#table_ table');

    $table.attr('class', 'sucrose sc-table sc-table-' + this.type);

    // Enable editing of data table
    $table.editableTableWidget();

    // Listen for changes to data table cell values
    $table.find('td.sc-val').on('change.editable', function (evt, val) {
      var d = evt.currentTarget.__data__,
          i = d.index,
          k = d.hasOwnProperty('y') ? 'y' : 1,
          v = isNaN(val) ? val : parseFloat(val);
      self.updateChartDataCell(d, i, k, v);
    });
    // Listen for changes to data table series keys
    $table.find('td.sc-key').on('change.editable', function (evt, val) {
      self.updateChartDataSeries(this.__data__, 'key', val);
    });
    // Listen for changes to data table series disabled state
    $table.find('td.sc-state').on('change.editable', function (evt) {
      var v = !evt.target.checked;
      self.updateChartDataSeries(this.__data__, 'disabled', v);
    });
    $table.find('td').on('validate', function (evt, value) {
      var cell = $(this),
          column = cell.index();
      if (column === 1) {
        return !!value && value.trim().length > 0;
      } else {
        return !isNaN(parseFloat(value)) && isFinite(value);
      }
    });
  },
  unloadTable: function () {
    $table.find('td').off('change.editable');
    $table.remove();
  },

  /* ------------------------
   * LOAD DATA functions ---- */

  parseRawData: function (json) {
    if (this.type === 'treemap' || this.type === 'tree' || this.type === 'globe') {
      Data = json;
      this.colorLength = 0;
    } else {
      // raw data from Report API
      Data = sucrose.transform(json, this.type);
      this.colorLength = Data.properties ? Data.properties.colorLength : Data.data ? Data.data.length : 0;
      postProcessData(Data, this.type, this.Chart);
    }
  },

  loadData: function (file) {
    if (!file) {
      return;
    }

    $.ajax({ // Load data, $.ajax is promise
        url: 'data/' + file + '.json',
        cache: true,
        dataType: 'json',
        context: this,
        async: true
      })
      .done(function (json) { // Loaded, then
        if (!json) {
          return;
        }
        this.parseRawData(json);
        this.updateColorModel();
        this.loadChart();
      });
    // window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
    // window.requestFileSystem(type, size, successCallback, opt_errorCallback)
    // fs.root.getDirectory('data', {}, function (dirEntry){
    //   var dirReader = dirEntry.createReader();
    //   dirReader.readEntries(function (entries) {
    //     for(var i = 0; i < entries.length; i++) {
    //       var entry = entries[i];
    //       if (entry.isDirectory){
    //         console.log('Directory: ' + entry.fullPath);
    //       }
    //       else if (entry.isFile){
    //         console.log('File: ' + entry.fullPath);
    //       }
    //     }

    //   }, errorHandler);
    // }, errorHandler);
    // if (!file) {
    //   return;
    // }
  },

  loadColor: function () {
    this.updateColorModel();
    this.loadChart();
    // this.chartUpdater()();
  },

  loadLocale: function (locale) {
    this.locale = locale;
    this.Chart.locality(this.getLocaleData(locale));
    this.Chart.strings(this.getTranslationData(locale));
    this.chartUpdater()();
  }
};

// Application scope jQuery references to main page elements
$title = $('#title_');
$picker = $('#picker_');
$menu = $('#menu_');

$index = $('#index_');
$demo = $('#demo_');

$example = $('#example_');
$chart = $('#chart_');
$table = $('#table_ table');
$data = $('#data_');

$options = $('#options_');
$form = $('#form_ form');
$config = $('#config_');

// Application scope variables
chartStore = {};
chartType = window.uQuery('type');
fileCatalog = {};
localeData = {};
translationData = {};

// jQuery.my data
Config = {};

// Visualization data
Data = {};
chartData = {};
tableData = {};

// Application scope D3 reference to button tooltip
tooltip = null;

xIsDatetime = false;
yIsCurrency = false;

// Ignore touchstart in favour of touchend
function touchstart(evt) {
  if (evt) {
    evt.preventDefault();
    evt.stopPropagation();
  }
}

// Bind tooltips to buttons
d3.selectAll('[rel=tooltip]')
  .on('mouseover', $.proxy(function () {
    var $target = $(d3.event.currentTarget),
        title = $target.data('title'),
        open = $target.closest('.chart-selector').hasClass('open');
    if (!open) {
      this.tooltip = sucrose.tooltip.show(d3.event, title, null, null, d3.select('.demo').node());
    }
  }, this))
  .on('mousemove', $.proxy(function () {
    if (this.tooltip) {
      sucrose.tooltip.position(d3.select('.demo').node(), this.tooltip, d3.event);
    }
  }, this))
  .on('mouseout', $.proxy(function () {
    if (this.tooltip) {
      sucrose.tooltip.cleanup();
    }
  }, this))
  .on('touchstart', touchstart)
  .on('touchend', $.proxy(function () {
    d3.event.preventDefault();
    this.tooltip = false;
  }, this))
  .on('click', $.proxy(function () {
    if (this.tooltip) {
      sucrose.tooltip.cleanup();
    }
  }, this));

// For both index list and example picker
$picker
  .on('touchstart', touchstart)
  .on('click touchend', 'a', function (evt) {
    var type = $(evt.currentTarget).data('type');
    evt.preventDefault();
    evt.stopPropagation();
    if (type !== chartType) {
      loader(type);
    }
  });

// Open menu when button clicked
$menu
  .on('touchstart', touchstart)
  .on('click touchend', function (evt) {
    evt.preventDefault();
    evt.stopPropagation();
    $picker.toggleClass('open');
  });

// Close menu when clicking outside
$('body')
  .on('click touchend', function () {
    $picker.removeClass('open');
  });


$.when(
    $.get({url:'data/locales/locales.json', dataType: 'json'}),
    $.get({url:'data/locales/translation.json', dataType: 'json'}),
    $.get({url:'data/catalog.json', dataType: 'json'}),
    // Load manifest for base ui
    $.get({url: 'manifest/base.json', dataType: 'text'})
  )
  .then(function () {
    return [].slice.apply(arguments, [0]).map(function (result) {
      return result[0];
    });
  })
  .then(function (json) {
    localeData = Object.extended(json[0]);
    translationData = Object.extended(json[1]);
    fileCatalog = Object.extended(json[2]);
    baseUI = $.my.fromjson(json[3]);
  })
  .then(function () {
    // If chartType was passed in url, open it
    if (chartType) {
      loader(chartType);
    }
  });
// })();
});
