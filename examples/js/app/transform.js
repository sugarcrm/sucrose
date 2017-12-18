/* global d3, _ */
function transformDataToD3(json, chartType, barType) {
  var data = [],
      properties = {},
      value = 0,
      strNoLabel = 'undefined',
      typeWithValues = ['multibar', 'line', 'area', 'pie', 'funnel', 'gauge'];

  var props = Array.isArray(json.properties) ? json.properties[0] : {},
      labels = json.label || [],
      values = json.values || [];

  var hasValues = values.filter(function (d) {
          return Array.isArray(d.values) && d.values.length;
        }).length;

  var isDiscreteData = hasValues && Array.isArray(json.label) &&
        labels.length === values.length &&
        values.reduce(function (a, c, i) {
            return a && Array.isArray(c.values) && c.values.length === 1 &&
                pickLabel(c.label) === pickLabel(json.label[i]);
        }, true);

  var isGroupedBarType = true;

  function sumValues(values) {
    return values.reduce(function (a, b) { return parseFloat(a) + parseFloat(b); }, 0); // 0 is default value if reducing an empty list
  }

  function pickLabel(label) {
    var l = [].concat(label)[0];
    return l ? l : strNoLabel;
  }

  function pickValueLabel(d, i) {
    var l = Array.isArray(d.valuelabels) && d.valuelabels[i] ? d.valuelabels[i] : d.values[i];
    return l && l.length ? l : null;
  }

  if (typeWithValues.indexOf(chartType) !== -1 && hasValues) {

    switch (chartType) {

      case 'multibar':
        isGroupedBarType = barType === 'stacked' || barType === 'grouped';

        if (isGroupedBarType && !isDiscreteData) {
          // is grouped bar type on grouped data
          data = labels.map(function (d, i) {
            return {
              key: pickLabel(d),
              type: 'bar',
              disabled: d.disabled || false,
              values: values.map(function (e, j) {
                return {
                  series: i,
                  label: pickValueLabel(e, i),
                  x: j + 1,
                  y: parseFloat(e.values[i]) || 0
                };
              })
            };
          });

        } else if ((isGroupedBarType && isDiscreteData) || (!isGroupedBarType && !isDiscreteData)) {
          // is grouped bar type on discrete data OR basic bar type on grouped data
          data = values.map(function (d, i) {
            var value = {
              series: i,
              x: i + 1,
              y: sumValues(d.values)
            };
            if (d.values.length === 1) {
              value.label = pickValueLabel(d, 0);
            }
            return {
              key: d.values.length > 1 ? d.label : pickLabel(d.label),
              type: 'bar',
              disabled: d.disabled || false,
              values: [value]
            };
          });

        } else {
          // is basic bar type on discrete data
          data = [{
            key: props.key || 'Module',
            type: 'bar',
            values: values.map(function (e, j) {
              var value = {
                series: j,
                label: pickValueLabel(e, j),
                x: j + 1,
                y: sumValues(e.values)
              };
              return value;
            })
          }];
        }

        break;

      case 'pie':
        data = values.map(function (d, i) {
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
        data = values.reverse().map(function (d, i) {
            return {
              key: pickLabel(d.label),
              disabled: d.disabled || false,
              values: [{
                series: i,
                label: d.valuelabels[0] ? d.valuelabels[0] : d.values[0],
                x: 0,
                y: sumValues(d.values)
              }]
            };
          });
        break;

      case 'area':
      case 'line':
        var discreteValues = d3.max(values, function (d) {
              return d.values.length;
            }) === 1;
        data = values.map(function (d, i) {
          return {
            key: pickLabel(d.label),
            values: discreteValues ?
              d.values.map(function (e, j) {
                return {x: i, y: parseFloat(e)};
              }) :
              d.values.map(function (e, j) {
                return {x: j, y: parseFloat(e)};
              })
          };
        });
        break;

      case 'gauge':
        var y0 = 0;
        value = values.shift().gvalue;
        data = values.map(function (d, i) {
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
      title: props.title,
      yDataType: props.yDataType,
      xDataType: props.xDataType,
      // bar group data (x-axis)
      groups: chartType === 'line' && labels ?
        labels.map(function (d, i) {
          return {
            group: i + 1,
            label: pickLabel(d)
          };
        }) :
        values.filter(function (d) { return d.values.length; }).length ?
          values.map(function (d, i) {
            return {
              group: i + 1,
              label: pickLabel(d.label)
            };
          }) :
          [],
      values: chartType === 'gauge' ?
        [{group: 1, t: value}] :
        values.filter(function (d) { return d.values.length; }).length ?
          values.map(function (d, i) {
            return {
              group: i + 1,
              t: sumValues(d.values)
            };
          }) :
          [],
      colorLength: data.length
    };

    if (chartType === 'multibar' || chartType === 'pareto') {
      properties.stacked = props.hasOwnProperty('stacked') ? props.stacked : true;
    }

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
          //       .key(function (d){return d.probability;})
          //       .entries(chartData.data).length;
          data = json.records.map(function (d) {
            return {
              id: d.id,
              x: d.date_closed,
              y: Math.round(Math.floor(d.likely_case) / parseFloat(d.base_rate)),
              shape: 'circle',
              account_name: d.account_name,
              assigned_user_name: d.assigned_user_name,
              sales_stage: d.sales_stage,
              sales_stage_short: salesStageMap[d.sales_stage] || d.sales_stage,
              probability: Math.floor(d.probability),
              base_amount: Math.floor(d.likely_case),
              currency_symbol: '$'
            };
          });

          properties = {
            title: 'Bubble Chart Data',
            yDataType: 'string',
            xDataType: 'datetime',
            colorLength: json.records.length
          };
        }
      break;
    }

  }

  return {
    properties: properties,
    data: data
  };
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

function postProcessData(chartData, chartType, Chart) {
  switch (chartType) {
    case 'multibar':
    case 'pareto':
      Chart.stacked(chartData.properties.hasOwnProperty('stacked') ? chartData.properties.stacked : true);
      break;
  }
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

    var data = data.filter(function (model) {
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
