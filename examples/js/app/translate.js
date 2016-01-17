
// if (this.type === 'line') {
//   var xTickLabels = chartData.properties.labels ?
//         chartData.properties.labels.map(function (d) { return d.l || d; }) :
//         [];

//   if (chartData.data.length) {
//     if (chartData.data[0].values.length && chartData.data[0].values[0] instanceof Array) {
//       this.Chart
//         .x(function (d) { return d[0]; })
//         .y(function (d) { return d[1]; });

//       if (sucrose.utils.isValidDate(chartData.data[0].values[0][0])) {
//         this.Chart.xAxis
//           .tickFormat(function (d) {
//             return d3.time.format('%x')(new Date(d));
//           });
//       } else if (xTickLabels.length > 0) {
//         this.Chart.xAxis
//           .tickFormat(function (d) {
//             return xTickLabels[d] || ' ';
//           });
//       }
//     } else {
//       this.Chart
//         .x(function (d) { return d.x; })
//         .y(function (d) { return d.y; });

//       if (xTickLabels.length > 0) {
//         this.Chart.xAxis
//           .tickFormat(function (d) {
//             return xTickLabels[d - 1] || ' ';
//           });
//       }
//     }
//   }
// }


function translateDataToD3(json, chartType, barType) {
  var data = [],
      properties = {},
      value = 0,
      strUndefined = 'undefined',
      typeWithValues = ['bar', 'line', 'pie', 'funnel', 'gauge'];

  function sumValues(values) {
    return values.reduce(function(a, b) { return parseFloat(a) + parseFloat(b); }, 0); // 0 is default value if reducing an empty list
  }

  function pickLabel(label) {
    var l = [].concat(label)[0];
    //d.label && d.label !== '' ? Array.isArray(d.label) ? d.label[0] : d.label : strUndefined
    return l ? l : strUndefined;
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
                'key': pickLabel(d),
                'type': 'bar',
                'values': json.values.map(function(e, j) {
                    return {
                      'series': i,
                      'x': j + 1,
                      'y': parseFloat(e.values[i]) || 0,
                      'y0': 0
                    };
                  })
              };
            }) :
            json.values.map(function(d, i) {
              return {
                'key': d.values.length > 1 ? d.label : pickLabel(d.label),
                'type': 'bar',
                'values': json.values.map(function(e, j) {
                    return {
                      'series': i,
                      'x': j + 1,
                      'y': i === j ? sumValues(e.values) : 0,
                      'y0': 0
                    };
                  })
              };
            });
          break;

      case 'pie':
          data = json.values.map(function(d, i) {
              var data = {
                  'key': pickLabel(d.label),
                  'value': sumValues(d.values)
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
                  'key': pickLabel(d.label),
                  'values': [{
                    'series': i,
                    'label': d.valuelabels[0] ? d.valuelabels[0] : d.values[0],
                    'x': 0,
                    'y': sumValues(d.values),
                    'y0': 0
                  }]
              };
          });
          break;

      case 'line':
          var discreteValues = d3.max(json.values, function(d) {
                    return d.values.length;
                  }) === 1;
          data = json.values.map(function(d, i) {
              return {
                  'key': pickLabel(d.label),
                  'values': discreteValues ?
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
                  'key': pickLabel(d.label),
                  'y': parseFloat(d.values[0]) + y0
              };
              y0 += parseFloat(d.values[0]);
              return values;
          });
          break;

    }

    properties = {
      'title': json.properties[0].title,
      // bar group data (x-axis)
      'labels': chartType === 'line' && json.label ?
        json.label.map(function(d, i) {
          return {
            'group': i + 1,
            'l': pickLabel(d)
          };
        }) :
        json.values.filter(function(d) { return d.values.length; }).length ?
          json.values.map(function(d, i) {
            return {
              'group': i + 1,
              'l': pickLabel(d.label)
            };
          }) :
          [],
      'values': chartType === 'gauge' ?
        [{'group' : 1, 't': value}] :
        json.values.filter(function(d) { return d.values.length; }).length ?
          json.values.map(function(d, i) {
            return {
                'group': i + 1,
                't': sumValues(d.values)
            };
          }) :
          [],
      'colorLength': data.length
    };

    return {
      'properties': properties,
      'data': data
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
            data: data.records.map(function (d) {
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
              colorLength: data.records.length
            }
          };
        }
        break;

    }

    return chartData;
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
