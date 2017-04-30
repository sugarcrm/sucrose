
function transformDataToD3(json, chartType, barType) {
  var data = [],
      seriesData,
      properties = json.properties ? Array.isArray(json.properties) ? json.properties[0] : json.properties : {},
      value = 0,
      strNoLabel = 'Undefined',
      valuesExist = true,
      valuesAreArrays = false,
      valuesAreDiscrete = false,
      seriesKeys = [],
      groupLabels = properties.groups || json.label || properties.labels || properties.label || [],
      groups = [];

  var xIsDatetime = properties.xDataType === 'datetime' || false,
      xIsOrdinal = properties.xDataType === 'ordinal' || false,
      xIsNumeric = properties.xDataType === 'numeric' || false,
      yIsCurrency = properties.yDataType === 'currency' || false;

  function pickLabel(d) {
    // d can be {label:'abc'} ['abc'] or 'abc'
    return (d.hasOwnProperty('label') ? d.label : String(d)) || strNoLabel;
  }

  function getGroup(d, i) {
    var g = {
      group: i + 1,
      label: pickLabel(d)
    };
    if (d.values) {
      g.total = sumValues(d.values);
    }
    return g;
  }

  function getKey(d) {
    return d.key || pickLabel(d);
  }

  function sumValues(values) {
    return values ? values.reduce(function(a, b) { return parseFloat(a) + parseFloat(b); }, 0) : 0; // 0 is default value if reducing an empty list
  }

  function hasValues(data) {
    //true => [{}, {}] || [[], []]
    return data && data.filter(function(d) { return d.values && d.values.length; }).length > 0;
  }

  function dataHasValues(type, data) {
      var valueTypes = ['multibar', 'line', 'area', 'pie', 'funnel', 'gauge'];
      return valueTypes.indexOf(type) !== -1 && hasValues(data);
  }

  function isArrayOfArrays(data) {
    return Array.isArray(data) && data.length && Array.isArray(data[0]);
  }

  function areDiscreteValues(data) {
    return d3.max(data, function(d) { return d.values.length; }) === 1;
  }

  // process CSV values
  if (isArrayOfArrays(json.values)) {
    // json.values => [
    //   ["Year", "A", "B", "C"],
    //   [1970, 0.3, 2, 0.1],
    //   [1971, 0.5, 2, 0.1],
    //   [1972, 0.7, 3, 0.2]
    // ]

    // the first row is a row of strings
    // then extract first row header labels as series keys
    seriesKeys = properties.keys || json.values.splice(0, 1)[0].splice(1);
    // keys => ["A", "B", "C"]

    // reset groupLabels because it will be rebuilt from values
    groupLabels = [];
    // groupLabels => ["June", "July", "August"]

    // json.values => [
    //   [1970, 0.3, 2, 0.1],
    //   [1971, 0.5, 2, 0.1],
    //   [1972, 0.7, 3, 0.2]
    // ]
    seriesData = d3.transpose(
        json.values.map(function(row, i) {
          // this is a row => [1970, 0.7, 3, 0.2]
          // this is a row => ["One", 0.7, 3, 0.2]

          // extract first column as x value
          var x = row.splice(0, 1)[0];

          if (xIsOrdinal) {
            // extract the first column into the properties category label array
            groupLabels.push(getGroup(x, i));
          }

          return row.map(function(value, j) {
              // row => [0.7, 3, 0.2]]
              // first column is datetime or is numeric
              if (xIsDatetime || xIsNumeric)
              {
                // if x is an integer date then treating as integer
                // is ok because xDataType will force formatting on render
                // what about "June 1970"
                return [x, value];
              }
              // ... or is ordinal
              // increment
              else if (xIsOrdinal)
              {
                return [i + 1, value];
              }
            });
        })
      );

    data = seriesKeys.map(function(key, i) {
        return {
          key: key,
          values: seriesData[i]
        };
      });

  } else {
    data = json.data;
  }

  valuesAreDiscrete = areDiscreteValues(data);
  valuesExist = dataHasValues(chartType, data);

  if (valuesExist) {
    // json.values => [[],[]] or [{},{}]

    var formatX =
      xIsDatetime ?
        function(d, i, j) {
          // x => 1970, x => '1/1/1980', x => '1980-1-1', x => 1138683600000
          // if the date value provided is a year
          // append day and month parts to get correct UTC offset
          // x = x + '-1-1';
          // else if x is an integer date then treating as integer
          // is ok because xDataType will force formatting on render
          return new Date(d.toString().length === 4 ? '1/1/' + d.toString() : d);
        } :
        xIsOrdinal ?
          valuesAreDiscrete ?
            // expand x for each series
            // [['a'],['b'],['c']] =>
            // [[0,'a'],[1,'b'],[2,'c']]
            function(d, i, j) {
              return i + 1;
            } :
            // convert flat array to indexed arrays
            // [['a','b'],['c','d']] => [[[0,'a'],[1,'b']],[[0,'c'],[1,'d']]]
            function(d, i, j) {
              return j + 1;
            } :
        xIsNumeric ?
          function(d, i, j) {
            return parseFloat(d);
          } :
          function(d) {
            return d;
          };

    switch (chartType) {

      case 'multibar':
        var formatSeries = (barType === 'stacked' || barType === 'grouped') && !valuesAreDiscrete ?
              function(e, i, j) {
                return parseFloat(e.values[i]) || 0;
              } :
              function(e, i, j) {
                return i === j ? sumValues(e.values) : 0;
              };

        data = barType === 'stacked' || barType === 'grouped' ?
          groupLabels.map(function(d, i) {
            return {
              key: getKey(d),
              type: 'bar',
              disabled: d.disabled || false,
              values: json.values.map(function(e, j) {
                  return {
                    series: i,
                    x: j + 1,
                    y: formatSeries(e, i, j),
                    y0: 0
                  };
                })
            };
          }) :
          [{
            key: d.values.length > 1 ? d.label : pickLabel(d), //TODO: replace with getKey
            type: 'bar',
            disabled: d.disabled || false,
            values: json.values.map(function(e, j) {
                return {
                  series: i,
                  x: j + 1,
                  y: sumValues(e.values),
                  y0: 0
                };
              })
          }];
        break;

      case 'pie':
        data = json.values.map(function(d, i) {
            var data = {
                key: pickLabel(d),
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
                key: pickLabel(d),
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
        // convert array of arrays into array of objects
        data.forEach(function(s, i) {
          s.seriesIndex = i;
          s.key = getKey(s);
          s.values = isArrayOfArrays(s.values) ?
            // d => [[0,13],[1,18]]
            s.values.map(function(v, j) {
              return {x: formatX(v[0], i, j), y: parseFloat(v[1])};
            }) :
            // d => [{x:0,y:13},{x:1,y:18}]
            s.values.map(function(v, j) {
              v.x = formatX(v.x, i, j);
              v.y = parseFloat(v.y);
              return v;
            });
          s.total = d3.sum(s.values, function(d) { return d.y; });
          if (!s.total) {
            s.disabled = true;
          }
        });

        break;

      case 'gauge':
        value = json.values.shift().gvalue;
        var y0 = 0;
        data = json.values.map(function(d, i) {
            var values = {
                key: pickLabel(d),
                y: parseFloat(d.values[0]) + y0
            };
            y0 += parseFloat(d.values[0]);
            return values;
        });
        groups = [{group: 1, label: 'Sum', total: value}];
        break;
    }

    // don't override json.properties entirely, just modify
    properties.title = properties.title;

    // properties.yDataType: properties.yDataType,
    // properties.xDataType: properties.xDataType,
    properties.seriesLength = data.length;

    // if (properties.groups && properties.groups.length) {
    //   properties.groups = properties.groups;
    // } else
    if (groupLabels.length) {
      properties.groups = groupLabels.map(getGroup);
    }

    return {
      properties: properties,
      data: data
    };

  } else {

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
              seriesLength: json.records.length
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
      properties.groups = properties.groups || d3.merge(chartData.data.map(function(d) {
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

function postProcessData(chartData, chartType, Chart) {

  if (chartData.properties) {
    yIsCurrency = chartData.properties.yDataType === 'currency';
    xIsDatetime = chartData.properties.xDataType === 'datetime';
  }

  switch (chartType) {

    case 'area':
    case 'line':
      if (chartData.data.length) {
        if (Array.isArray(chartData.data[0].values) && Array.isArray(chartData.data[0].values[0])) {
          // Convert array data to objects
          chartData.data.forEach(function(d, i) {
            d.values = d.values.map(function(g, j) {
              var value = {x: g[0], y: g[1]};
              if (g[2]) {
                value.z = g[2];
              }
              return value;
            });
          });
        }
      }

      // xTickLabels = chartData.properties.labels ?
      //   chartData.properties.labels.map(function (d) { return d.l || d; }) :
      //   [];
      // if (chartData.data && chartData.data.length) {
      //   if (chartData.data[0].values.length && Array.isArray(chartData.data[0].values[0])) {
      //     Chart
      //       .x(function (d) { return d[0]; })
      //       .y(function (d) { return d[1]; });

      //     // if (sucrose.isValidDate(chartData.data[0].values[0][0])) {
      //     //   Chart.xAxis
      //     //     .tickFormat(function (d) {
      //     //       return d3.time.format('%x')(new Date(d));
      //     //     });
      //     // } else if (xTickLabels.length > 0) {
      //     //   Chart.xAxis
      //     //     .tickFormat(function (d) {
      //     //       return xTickLabels[d] || ' ';
      //     //     });
      //     // }
      //   } else {
      //     Chart
      //       .x(function (d) { return d.x; })
      //       .y(function (d) { return d.y; });

      //     // if (xTickLabels.length > 0) {
      //     //   Chart.xAxis
      //     //     .tickFormat(function (d) {
      //     //       return xTickLabels[d - 1] || ' ';
      //     //     });
      //     // }
      //   }
      // }
      break;

    case 'multibar':
      // Chart.stacked(chartData.properties.stacked === false ? false : true);
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
        dx: parseInt(document.getElementById('chart1').offsetWidth, 10),
        dy: parseInt(document.getElementById('chart1').offsetHeight, 10),
        depth: 0,
        colorIndex: '0root_Opportunities'
      },
      colorIndices = ['0root_Opportunities'],
      colors = d3.scale.category20().range();

  var today = new Date();
      today.setUTCHours(0, 0, 0, 0);

  var day_ms = 1000 * 60 * 60 * 24,
      d1 = new Date(today.getTime() + 31 * day_ms);

  var data1 = data0.filter(function(model) {
    // Filter for 30 days from now.
    var d2 = new Date(model.date_closed || '1970-01-01');
    return (d2 - d1) / day_ms <= 30;
  }).map(function(d) {
    // Include properties to be included in leaves
    return {
      id: d.id,
      assigned_user_name: d.assigned_user_name,
      sales_stage: d.sales_stage,
      name: d.name,
      amount_usdollar: d.amount_usdollar,
      color: d.color
    };
  });

  var data2 = d3.nest()
    .key(function(d) {
      return d.assigned_user_name;
    })
    .entries(data1);

  data2.forEach(function(value, key, list) {
    list[key].values = d3.nest()
      .key(function(m) {
        return m.sales_stage;
      })
      .entries(value.values);
  });

  data2.forEach(function(value1) {
    var child = [];
    var key1 = value1.key;
    value1.values.forEach(function(value2) {
      var key2 = value2.key;
      if (colorIndices.indexOf('2oppgroup_' + key2) === -1) {
        colorIndices.push('2oppgroup_' + key2);
      }
      value2.values.forEach(function(record) {
        record.className = 'stage_' + record.sales_stage.toLowerCase().replace(' ', '');
        record.value = parseInt(record.amount_usdollar, 10);
        record.colorIndex = '2oppgroup_' + key2;
      });
      child.push({
        name: key2,
        className: 'stage_' + key2.toLowerCase().replace(' ', ''),
        children: value2.values,
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
