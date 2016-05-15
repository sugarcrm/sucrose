/*
 * Copyright (c) 2016 SugarCRM Inc. Licensed by SugarCRM under the Apache 2.0 license.
 */
'use strict';

$(function() {
    FastClick.attach(document.body);
});

$(function () {
// jQuery.my variables
var Manifest, Data, baseUI, settingsUI;

// jQuery references
var $demo,
    $chart,
    $example,
    $form,
    $index,
    $menu,
    $options,
    $picker,
    $select,
    $table,
    $title;

// Application scope variables
var chartData,
    chartStore,
    chartType,
    fileCatalog,
    localeData,
    rawData,
    tableData,
    tooltip;

// Data dependent variables
var xIsDatetime,
    yIsCurrency;

function sucroseCharts(type, locality) {
  var chart,
      showTitle = true,
      showLegend = true,
      showControls = true,
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
          var val = sucrose.utils.numberFormatRound(y, 2, yIsCurrency, chart.locality()),
              percent = sucrose.utils.numberFormatRound(x, 2, false, chart.locality());
          return '<p>Stage: <b>' + key + '</b></p>' +
                 '<p>' + (yIsCurrency ? 'Amount' : 'Count') + ': <b>' + val + '</b></p>' +
                 '<p>Percent: <b>' + percent + '%</b></p>';
        });
        // .rotateDegrees(rotate)
        // .arcDegrees(arc)
        // .fixedRadius(function (container, chart) {
        //   var n = d3.select('#chart1').node(),
        //       r = Math.min(n.clientWidth * 0.25, n.clientHeight * 0.4);
        //   return Math.max(r, 75);
        // });

      chart.pie
        .textureFill(true);
      break;

    case 'funnel':
      chart = sucrose.models.funnelChart()
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

      chart.funnel
        .textureFill(true);
      break;

    case 'multibar':
      chart = sucrose.models.multiBarChart()
        .stacked(true)
        // .margin({top: 0, right: 0, bottom: 0, left: 0})
        // TODO: replace when PAT-2448 is merged
        // .valueFormat(function (d) {
        //   var si = d3.formatPrefix(d, 2);
        //   return d3.round(si.scale(d), 2) + si.symbol;
        // })
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
      break;

    case 'bubble':
      chart = sucrose.models.bubbleChart()
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
      break;

    case 'treemap':
      chart = sucrose.models.treemapChart()
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
      break;

    case 'pareto':
      chart = sucrose.models.paretoChart()
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
      break;

    case 'gauge':
      chart = sucrose.models.gaugeChart()
        .x(function (d) { return d.key; })
        .y(function (d) { return d.y; })
        .ringWidth(50)
        .maxValue(9)
        .transitionMs(4000);
      break;

    case 'globe':
      chart = sucrose.models.globeChart()
        .id('chart');
      showTitle = false;
      showLegend = false;
      break;

    case 'area':
      chart = sucrose.models.stackedAreaChart()
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
      break;

    case 'tree':
      chart = sucrose.models.tree()
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
          var container = d3.select('#chart svg');
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
      break;
  }

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
  if (chart.locality) {
    chart
      .locality(locality);
  }

  // chart.transition().duration(500)
  // chart.legend.showAll(true);

  return chart;
}
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

function transformDataToD3(json, chartType, barType) {
  var data = [],
      properties = {},
      value = 0,
      strNoLabel = 'undefined',
      typeWithValues = ['bar', 'line', 'area', 'pie', 'funnel', 'gauge'];

  function sumValues(values) {
    return values.reduce(function(a, b) { return parseFloat(a) + parseFloat(b); }, 0); // 0 is default value if reducing an empty list
  }

  function pickLabel(label) {
    var l = [].concat(label)[0];
    return l ? l : strNoLabel;
  }

  function hasValues(d) {
    return d.values.filter(function(d) { return d.values && d.values.length; }).length;
  }

  if (typeWithValues.indexOf(chartType) !== -1 && hasValues(json)) {

    switch (chartType) {

      case 'bar':
          data = barType === 'stacked' || barType === 'grouped' ?
            json.label.map(function(d, i) {
              return {
                key: pickLabel(d),
                type: 'bar',
                disabled: d.disabled || false,
                values: json.values.map(function(e, j) {
                    return {
                      series: i,
                      x: j + 1,
                      y: parseFloat(e.values[i]) || 0,
                      y0: 0
                    };
                  })
              };
            }) :
            json.values.map(function(d, i) {
              return {
                key: d.values.length > 1 ? d.label : pickLabel(d.label),
                type: 'bar',
                disabled: d.disabled || false,
                values: json.values.map(function(e, j) {
                    return {
                      series: i,
                      x: j + 1,
                      y: i === j ? sumValues(e.values) : 0,
                      y0: 0
                    };
                  })
              };
            });
          break;

      case 'pie':
          data = json.values.map(function(d, i) {
              var data = {
                  key: pickLabel(d.label),
                  disabled: d.disabled || false,
                  value: sumValues(d.values)
              };
              if (d.color !== undefined) {
                data.color = d.color;
              }
              if (d.classes !== undefined) {
                data.classes = d.classes;
              }
              return data;
            });
          break;

      case 'funnel':
          data = json.values.reverse().map(function(d, i) {
              return {
                  key: pickLabel(d.label),
                  disabled: d.disabled || false,
                  values: [{
                    series: i,
                    label: d.valuelabels[0] ? d.valuelabels[0] : d.values[0],
                    x: 0,
                    y: sumValues(d.values),
                    y0: 0
                  }]
              };
          });
          break;

      case 'area':
      case 'line':
          var discreteValues = d3.max(json.values, function(d) {
                    return d.values.length;
                  }) === 1;
          data = json.values.map(function(d, i) {
              return {
                  key: pickLabel(d.label),
                  values: discreteValues ?
                      d.values.map(function(e, j) {
                          return [i, parseFloat(e)];
                      }) :
                      d.values.map(function(e, j) {
                          return [j, parseFloat(e)];
                      })
              };
          });
          break;

      case 'gauge':
          value = json.values.shift().gvalue;
          var y0 = 0;
          data = json.values.map(function(d, i) {
              var values = {
                  key: pickLabel(d.label),
                  y: parseFloat(d.values[0]) + y0
              };
              y0 += parseFloat(d.values[0]);
              return values;
          });
          break;
    }

    properties = {
      title: json.properties[0].title,
      yDataType: json.properties[0].yDataType,
      xDataType: json.properties[0].xDataType,
      // bar group data (x-axis)
      labels: chartType === 'line' && json.label ?
        json.label.map(function(d, i) {
          return {
            group: i + 1,
            l: pickLabel(d)
          };
        }) :
        json.values.filter(function(d) { return d.values.length; }).length ?
          json.values.map(function(d, i) {
            return {
              group: i + 1,
              l: pickLabel(d.label)
            };
          }) :
          [],
      values: chartType === 'gauge' ?
        [{group: 1, t: value}] :
        json.values.filter(function(d) { return d.values.length; }).length ?
          json.values.map(function(d, i) {
            return {
                group: i + 1,
                t: sumValues(d.values)
            };
          }) :
          [],
      colorLength: data.length
    };

    return {
      properties: properties,
      data: data
    };

  } else if (typeWithValues.indexOf(chartType) === -1) {

    switch (chartType) {

      case 'bubble':
        if (!json.data) {
          var salesStageMap = {
                  'Negotiation/Review': 'Negotiat./Review',
                  'Perception Analysis': 'Percept. Analysis',
                  'Proposal/Price Quote': 'Proposal/Quote',
                  'Id. Decision Makers': 'Id. Deciders'
                };
          // var seriesLength = d3.nest()
          //       .key(function(d){return d.probability;})
          //       .entries(chartData.data).length;
          chartData = {
            data: json.records.map(function (d) {
              return {
                id: d.id,
                x: d.date_closed,
                y: Math.round(parseInt(d.likely_case, 10) / parseFloat(d.base_rate)),
                shape: 'circle',
                account_name: d.account_name,
                assigned_user_name: d.assigned_user_name,
                sales_stage: d.sales_stage,
                sales_stage_short: salesStageMap[d.sales_stage] || d.sales_stage,
                probability: parseInt(d.probability, 10),
                base_amount: parseInt(d.likely_case, 10),
                currency_symbol: '$'
              };
            }),
            properties: {
              title: 'Bubble Chart Data',
              yDataType: 'string',
              xDataType: 'datetime',
              colorLength: json.records.length
            }
          };
        }
        break;

    }

    return chartData;
  }

}


function transformTableData(chartData, chartType, Chart) {
  var data = [],
      properties = chartData.properties || {};

  switch (chartType) {
    case 'multibar':
      data = chartData.data.map(function(d, i) {
        var series = {
          key: d.key || strNoLabel,
          count: d.count || null,
          disabled: d.disabled || false,
          series: d.series || i,
          values: (d._values || d.values).map(function(k) {
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
      data = chartData.data.map(function(d, i) {
        return {
          key: d.key || strNoLabel,
          count: d.count || null,
          disabled: d.disabled || false,
          series: d.series || i,
          values: d.values.map(function(k) {
              return {x: k.x, y: (isNaN(k.value) ? k.y : k.value)};
            })
        };
      });
      break;
    case 'pie':
      data = chartData.data.map(function(d, i) {
        return {
          key: d.key || strNoLabel,
          count: d.count || null,
          disabled: d.disabled || false,
          series: d.series || i,
          values: [{x: i + 1, y: Chart.y()(d)}]
        };
      });
      break;
    case 'area':
    case 'line':
      data = chartData.data.map(function(d, i) {
        return {
          key: d.key || strNoLabel,
          disabled: d.disabled || false,
          series: d.series || i,
          values: d.values
        };
      });
      properties.labels = properties.labels || d3.merge(chartData.data.map(function(d) {
          return d.values.map(function(d, i) {
            return Chart.lines.x()(d, i);
          });
        }))
        .reduce(function(p, c) {
          if (p.indexOf(c) < 0) p.push(c);
          return p;
        }, [])
        .sort(function(a, b) {
          return a - b;
        })
        .map(function(d, i) {
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

// var xTickLabels;

function postProcessData(chartData, chartType, Chart) {

  if (chartData.properties) {
    yIsCurrency = chartData.properties.yDataType === 'currency';
    xIsDatetime = chartData.properties.xDataType === 'datetime';
  }

  switch (chartType) {

    case 'line':
      // xTickLabels = chartData.properties.labels ?
      //   chartData.properties.labels.map(function (d) { return d.l || d; }) :
      //   [];

      if (chartData.data.length) {
        if (chartData.data[0].values.length && Array.isArray(chartData.data[0].values[0])) {
          Chart
            .x(function (d) { return d[0]; })
            .y(function (d) { return d[1]; });

          // if (sucrose.utils.isValidDate(chartData.data[0].values[0][0])) {
          //   Chart.xAxis
          //     .tickFormat(function (d) {
          //       return d3.time.format('%x')(new Date(d));
          //     });
          // } else if (xTickLabels.length > 0) {
          //   Chart.xAxis
          //     .tickFormat(function (d) {
          //       return xTickLabels[d] || ' ';
          //     });
          // }
        } else {
          Chart
            .x(function (d) { return d.x; })
            .y(function (d) { return d.y; });

          // if (xTickLabels.length > 0) {
          //   Chart.xAxis
          //     .tickFormat(function (d) {
          //       return xTickLabels[d - 1] || ' ';
          //     });
          // }
        }
      }
      break;

    case 'multibar':
      Chart.stacked(chartData.properties.stacked === false ? false : true);
      break;

    case 'pareto':
      Chart.stacked(chartData.properties.stacked);
      break;
  }
}

function parseTreemapData(data) {
    var root = {
          name: 'Opportunities',
          children: [],
          x: 0,
          y: 0,
          dx: parseInt(document.getElementById('chart').offsetWidth, 10),
          dy: parseInt(document.getElementById('chart').offsetHeight, 10),
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
    }).map(function(d) {
      // Include properties to be included in leaves
      return {
        assigned_user_name: d.assigned_user_name,
        sales_stage: d.sales_stage,
        name: d.name,
        amount_usdollar: d.amount_usdollar,
        color: d.color
      };
    });

    data = _.groupBy(data, function(m) {
      return m.assigned_user_name;
    });

    _.each(data, function(value, key, list) {
      list[key] = _.groupBy(value, function(m) {
        return m.sales_stage;
      });
    });

    _.each(data, function(value1, key1) {
      var child = [];
      _.each(value1, function(value2, key2) {
        if (colorIndices.indexOf('2oppgroup_' + key2) === -1) {
          colorIndices.push('2oppgroup_' + key2);
        }
        _.each(value2, function(record) {
          record.className = 'stage_' + record.sales_stage.toLowerCase().replace(' ', '');
          record.value = parseInt(record.amount_usdollar, 10);
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
        return d.value = d.children.reduce(function(p, v) { return p + accumulate(v); }, 0);
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

//https://developer.mozilla.org/en-US/docs/Web/API/Window.btoa
//http://techslides.com/save-svg-as-an-image/
//http://tutorials.jenkov.com/svg/svg-and-css.html
//https://developer.mozilla.org/en-US/docs/Web/HTML/Canvas/Drawing_DOM_objects_into_a_canvas
//http://spin.atomicobject.com/2014/01/21/convert-svg-to-png/
//https://github.com/exupero/saveSvgAsPng

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
    // fall back to open image in new tab
    a.download = 'download.png';
    document.body.appendChild(a);
    a.addEventListener('click', function (e) {
      a.parentNode.removeChild(a);
    });
    a.dispatchEvent(evt);
  }

  $.ajax({
      url: 'css/sucrose.css',
      dataType: 'text'
    })
    .success(function (css) {
      var doctype = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';
      var chart = $('#chart');
      var width = chart.width();
      var height = chart.height();
      var dom = chart.find('svg').html();
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="' +
                 width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" class="sc-chart-print">' +
                '<defs><style rel="stylesheet/less" type="text/css"><![CDATA[' + css + ']]></style></defs>' + dom + '</svg>';
      var url = 'data:image/svg+xml;charset=utf-8;base64,' + window.btoa(reEncode(svg));
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');
      var img = new Image();

      canvas.width = width;
      canvas.height = height;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      img.onload = function () {
          var uri;
          ctx.drawImage(img, 0, 0);
          uri = canvas.toDataURL('image/png');
          openTab(uri);
          ctx.clearRect(0, 0, width, height);
      }

      img.src = url;
    });
}

function generateJson(e) {
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
        a.download = 'download.json';
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

function loader(type) {
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

      // Append settings textarea to end of chart options ui
      Object.merge(chartManifest.ui, Object.clone(settingsUI, true));

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
                {value: '0', label: 'No'},
                {value: '1', label: 'Yes'}
              ]
            },
            false, // shallow copy
            false  // do not overwrite
          );
        }
      });

      // Set data file options in Manifest control
      Manifest.ui['[name=file]'].values = fileCatalog[type];

      // Data containers persisted in localStorage
      store.set('example-type', type);
      // Set Application scope variables
      chartType = type;
      chartStore = store.get('example-' + type) || {};
      // TODO: we need to store modified chartData somewhere
      // chartData = chartStore.chartData || {};

      // Build Data from stored selected values with chart type overrides
      presets = chartStore.optionPresets || chartManifest.optionPresets;
      // Data will contain default value an
      Object.each(Manifest.optionDefaults, function (prop, val) {
        Data[prop] = {};
        Data[prop].def = val;
        Data[prop].val = window.uQuery(prop) || presets[prop];
      });

      $index.addClass('hidden');
      $demo.removeClass('hidden');

      // TODO: is there a way to reinit jQuery.my with new Data?
      // I get an bind error if I try to do it, so I have to
      // Delete and recreate the entire form
      $form.remove();
      $options.append('<div class="sc-form" id="form"/>');
      // Reset application scope reference to form
      $form = $('#form');

      // Instantiate jQuery.my
      $form.my(Manifest, Data);
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
  locale: 'en',

  // D3 chart
  Chart: null,
  // D3 table
  Table: null,
  // CodeMirror
  Editor: null,

  lintErrors: [],

  // Default data
  selectedOptions: {},

  // Chart method variables available to chart on render
  colorLength: 0,
  gradientStart: '#e8e2ca',
  gradientStop: '#3e6c0a',

  // The default values for the BaseUI manifest
  optionDefaults: {
    file: '',
    color: 'default',
    gradient: ['0', 'vertical', 'middle'],
    direction: 'ltr',
    locale: 'en'
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
    this.Chart = sucroseCharts(this.type, localeData[this.selectedOptions.locale]);
    this.Table = sucroseTable(this.Chart);

    if (!['bar', 'line', 'area', 'pie', 'funnel', 'gauge'].find(this.type)) {
      this.Table.strings({noData: 'This chart type does not support table data.'})
    }

    // Set default direction for RTL/LTR
    $('html').css('direction', this.selectedOptions.direction);

    // Conserve space by not prepending to title
    $title.text(($demo.width < 480 ? '' : 'Sucrose ') + this.title);

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
        self.toggleTooltip($button);
        self.chartResizer(self.Chart)(evt);
        $button.toggleClass('active');
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
    $('button[data-action=toggle]')
      .on('click.example touchend.example', function (evt) {
        evt.stopPropagation();
        if ($demo.width() > 480) {
          $options.toggleClass('hidden');
          $example.toggleClass('full-width');
        } else {
          $options.toggleClass('open');
        }
        self.chartResizer(self.Chart)(evt);
      });
    // Download image or data depending on panel
    $('button[data-action=download]')
      .on('click.example touchend.example', function (evt) {
        evt.stopPropagation();
        if ($chart.hasClass('hide')) {
          generateJson(evt);
        } else {
          generatePackage(evt);
        }
      });
    $('button[data-action=save]')
      .on('click.example touchend.example', function (evt) {
        evt.stopPropagation();
        generateImage(evt);
      });
    // Toggle display of table or code data edit view
    $('button[data-action=edit]')
      .on('click.example touchend.example', function (evt) {
        var $button = $(this);
        evt.stopPropagation();
        if ($button.hasClass('active')) {
          if (!self.lintErrors.length) {
            self.parseRawData(JSON.parse(self.Editor.doc.getValue()));
          }
          self.unloadDataEditor();
          self.loadTable();
          $table.find('table').show();
          $button.removeClass('active');
        } else {
          self.unloadTable();
          self.loadDataEditor();
          $table.find('table').hide();
          $button.addClass('active');
        }
      });
    // Toggle display of chart or table tab
    $('.tab')
      .on('touchstart.example', touchstart)
      .on('click.example touchend.example', function (evt) {
        evt.stopPropagation();
        evt.preventDefault();
        switch ($(this).data('toggle')) {
          case 'chart':
            self.unloadDataEditor();
            self.unloadTable();
            $('button[data-action=edit]').removeClass('active');
            self.loadChart();
            break;
          case 'table':
            self.unloadChart();
            self.unloadDataEditor();
            self.loadTable();
            break;
          case 'options':
            $('[data-toggle=options]').toggleClass('active');
            $example.toggleClass('full-width');
            $options.toggleClass('open');
            self.chartResizer(self.Chart)(evt);
            break;
        }
      });
  },
  toggleTab: function (tab) {
    var isChartTab = tab === 'chart';
    $chart.toggleClass('hide', !isChartTab);
    $table.toggleClass('hide', isChartTab);
    $('[data-toggle=chart]').toggleClass('active', isChartTab);
    $('[data-toggle=table]').toggleClass('active', !isChartTab);
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
    var row = $('<div class="option-row"/>'),
        name = this.getNameFromSelector(k),
        control = this.createControlFromType(v.type, v.values, name);
    row.append($('<span>' + v.title + '</span>')).append('<br/>');
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
      select += '<option value="' + r.value + '">' +
        r.label + '</option>';
    });
    select += '</select>';
    return select;
  },
  textareaControl: function (v, n) {
    var value = v.map(function (o) { return o.value; }).join(' '),
        textarea = '<textarea name="' + n + '">' +
          value + '</textarea>';
    return textarea;
  },
  textControl: function (v, n) {
    var value = v.map(function (o) { return o.value; }).join(' '),
        text = '<input type="text" name="' + n + '" value="' +
          value + '">';
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
    var k = $o.attr('name'),
        v = this.getData(this.data, k);
    this.setOptions(this.data, k, v);
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
    this.setOptions(d, k, v);
    // Usually chartRender or chartUpdate
    callback(v, this);
  },
  setOptions: function (d, k, v) {
    // First, lets update and store the option
    // in case it overrides a form preset value
    this.selectedOptions[k] = v;
    chartStore.optionPresets = Object.clone(this.selectedOptions);
    store.set('example-' + this.type, chartStore);

    // Now, if the options is the default, lets remove it from display
    if (this.selectedOptions[k] === d[k].def) {
      delete this.selectedOptions[k];
    }

    // Update the settings display textarea
    this.ui['[name=' + k + ']'].setChartOption(v, this);
    this.my.recalc('[name=settings]');
  },
  getLocaleOptions: function () {
    var locales = [];
    Object.each(localeData, function (k, v) {
      locales.push({value: k, label: v.language});
    });
    return locales;
  },

  /* ------------------------
   * CHART functions -------- */

  loadChart: function () {
    this.unloadChart();
    this.toggleTab('chart');

    chartData = Object.clone(rawData, true);

    // this.toggleTab(true);
    $chart.attr('class', 'sc-chart sc-chart-' + this.type + ($chart.hasClass('hide') ? ' hide' : ''));
    $chart.append('<svg/>');

    // Bind D3 chart to SVG element
    d3.select('#chart svg').datum(chartData).call(this.Chart);

    // Dismiss tooltips
    d3.select('#chart').on('click', this.Chart.dispatch.chartClick);

    // Rebind jQuery resizable plugin
    $chart.resizable({
      containment: 'parent',
      minHeight: 200,
      minWidth: 200
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
    var series = rawData.data[d.series];
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
    var series = rawData.data.find({key: d.key});
    series[k] = v;
  },
  updateColorModel: function (v) {
    var options = {},
        color = this.data.color.val,
        gradient = this.data.gradient.val;

    if (!this.Chart.colorData) {
      return;
    }

    if (color && color === 'graduated') {
      options = {c1: this.gradientStart, c2: this.gradientStop, l: this.colorLength};
    }

    if (color && color === 'data') {
      options = {c1: this.gradientStart, c2: this.gradientStop};
    }

    if (gradient && gradient.filter('1').length && color !== 'class') {
      options.gradient = true;
      options.orientation = gradient.filter('horizontal').length ? 'horizontal' : 'vertical';
      options.position = gradient.filter('base').length ? 'base' : 'middle';
    }

    this.Chart.colorData(color, options);
  },

  /* ------------------------
   * DATA EDITOR functions -- */

  loadDataEditor: function () {
    $('button[data-action=edit]').addClass('active');
    this.unloadDataEditor();
    this.Editor = CodeMirror(document.getElementById('table'), {
      value: JSON.stringify(rawData, null, '  '),
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
    });
    // this.Editor.doc.on('change', function () {
    //   console.log(cm.state.lint.marked)
    //   // chartData = JSON.parse(cm.doc.getValue());
    //   // self.refreshTable();
    // });
    this.Editor.focus();
  },
  unloadDataEditor: function () {
    $table.find('.CodeMirror').remove();
    this.Editor = null;
  },

  /* ------------------------
   * TABLE EDITOR functions - */

  loadTable: function () {
    // this.unloadDataEditor();
    this.unloadTable();

    this.toggleTab('table');

    $table.attr('class', 'sc-table sc-table-' + this.type + ($table.hasClass('hide') ? ' hide' : ''));

    chartData = Object.clone(rawData, true);

    tableData = transformTableData(chartData, this.type, this.Chart);

    // Object.watch(tableData, 'data', function () {
    //   console.log('property changed!');
    // });

    // Bind D3 table to TABLE element
    d3.select('#table').datum(tableData).call(this.Table);

    // Dismiss editor
    d3.select('#table').on('click', this.Chart.dispatch.tableClick);

    // Enable editing of data table
    $table.find('table').editableTableWidget();

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
    $table.find('table').remove();
  },

  /* ------------------------
   * LOAD DATA functions ---- */

  parseRawData: function (json) {
    rawData = json;
    if (this.type === 'treemap' || this.type === 'tree' || this.type === 'globe') {
      this.colorLength = 0;
    } else {
      // raw data from Report API
      if (!json.data) {
        rawData = transformDataToD3(json, this.type);
      }
      this.colorLength = rawData.properties.colorLength || rawData.data.length;
      postProcessData(rawData, this.type, this.Chart);
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

  loadColor: function (color) {
    this.updateColorModel(color);
    this.chartUpdater()();
  },

  loadLocale: function (locale) {
    this.locale = locale;

    this.Chart.locality(localeData[locale]);
    this.chartUpdater()();
  }
};
// jQuery.my data
Data = {};

// Application scope jQuery references to main page elements
$title = $('#title');
$picker = $('#picker');
$select = $('.chart-selector');
$index = $('.index');
$demo = $('.demo');
$options = $('#options');
$form = $('#form');
$example = $('#example');
$chart = $('#chart');
$table = $('#table');
$menu = $('#menu');

// Application scope variables
chartData = {};
chartStore = {};
chartType = window.uQuery('type');
fileCatalog = {};
localeData = {};
rawData = {};
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
$select
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
    $select.toggleClass('open');
  });

// Close menu when clicking outside
$('body')
  .on('click touchend', function () {
    $select.removeClass('open');
  });


$.when(
    $.get({url:'data/locales/locales.json', dataType: 'json'}),
    $.get({url:'data/catalog.json', dataType: 'json'}),
    // Load manifest for settings display textarea
    $.get({url: 'manifest/settings.json', dataType: 'text'}),
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
    fileCatalog = Object.extended(json[1]);
    settingsUI = $.my.fromjson(json[2]);
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
