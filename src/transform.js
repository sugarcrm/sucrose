import d3 from 'd3';

const transform = function(json, chartType, barType) {
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

  var sumValues = function(values) {
    return values ? values.reduce(function(a, b) { return parseFloat(a) + b; }, 0) : 0; // 0 is default value if reducing an empty list
  }

  function hasValues(d) {
    //true => [{}, {}] || [[], []]
    return d && d.filter(function(d1) { return d1.values && d1.values.length; }).length > 0;
  }

  function dataHasValues(type, d) {
      var valueTypes = ['multibar', 'line', 'area', 'pie', 'funnel', 'gauge'];
      return valueTypes.indexOf(type) !== -1 && hasValues(d);
  }

  function isArrayOfArrays(d) {
    return Array.isArray(d) && d.length && Array.isArray(d[0]);
  }

  function areDiscreteValues(d) {
    return d3.max(d, function(d1) { return d1.values.length; }) === 1;
  }

  valuesAreArrays = isArrayOfArrays(json.values);

  // process CSV values
  if (valuesAreArrays) {
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
        }
      });

  } else {
    data = json.data;
  }

  valuesExist = dataHasValues(chartType, data);

  if (valuesExist) {
    // json.values => [[],[]] or [{},{}]

    valuesAreArrays = isArrayOfArrays(data[0].values);
    valuesAreDiscrete = areDiscreteValues(data);

    var getX = valuesAreArrays ?
          function(d) {
            return d[0];
          } : function(d) {
            return d.x;
          };
    var getY = valuesAreArrays ?
          function(d) {
            return d[1];
          } : function(d) {
            return d.y;
          };

    var valueMap = valuesAreArrays ?
          function(v, i) {
            return {
              x: formatX(v[0], i),
              y: formatY(v[1], i)
            };
          } :
          function (v, i) {
            v.x = formatX(v.x, i);
            v.y = formatY(v.y, i);
            return v;
          };

    var formatX =
      xIsDatetime ?
        function(d, i, j) {
          // x => 1970, x => '1/1/1980', x => '1980-1-1', x => 1138683600000
          // if the date value provided is a year
          // append day and month parts to get correct UTC offset
          // x = x + '-1-1';
          // else if x is an integer date then treating as integer
          // is ok because xDataType will force formatting on render
          var dateString = d.toString().length === 4 ? '1/1/' + d.toString() : d;
          if (dateString.indexOf('GMT') === -1) {
            dateString += ' GMT';
          }
          var date = new Date(dateString);
          return date.toUTCString();
          // return date;
        } :
        xIsOrdinal ?
          // valuesAreDiscrete ?
            // expand x for each series
            // [['a'],['b'],['c']] =>
            // [[0,'a'],[1,'b'],[2,'c']]
            function(d, i) {
              return i + 1;
            } :
            // convert flat array to indexed arrays
            // [['a','b'],['c','d']] => [[[0,'a'],[1,'b']],[[0,'c'],[1,'d']]]
            // function(d, i, j) {
            //   return j + 1;
            // } :
        xIsNumeric ?
          function(d, i) {
            return parseFloat(d);
          } :
          function(d) {
            return d;
          };

    // var formatY = (barType !== 'basic' && !valuesAreDiscrete) ?
    //       // grouped
    //       function(e, i, j) {
    //         return parseFloat(e.values[i]) || 0;
    //       } :
    //       // discrete and basic
    //       function(e, i, j) {
    //         return i === j ? sumValues(e.values) : 0;
    //       };
    var formatY = function(d) {
      return parseFloat(d);
    };

    switch (chartType) {

      case 'multibar':

        // basic
        if (barType === 'basic') {
          if (data.length === 1) {
            // [
            //   {key: series1, values: [{x:1, y:5}, {x:2, y:8}, {x:3, y:1}]}
            // ]
            data = data.map(function(d, i) {
              d.key = getKey(d) || 'Series ' + i;
              d.values = d.values.map(function(v, j) {
                return valueMap(v, j);
              });
              return d;
            });
            properties.seriesLength = data[0].values.length;
          } else {
            // [
            //   {key: series1, values: [{x:1, y:5}, {x:2, y:8}, {x:3, y:1}]},
            //   {key: series2, values: [{x:1, y:3}, {x:2, y:4}, {x:3, y:7}]}
            // ]
            data = [{
              key: properties.key || 'Series 0',
              values: data.reduce(function(a, b, i) {
                return !b ?
                  a : // should be valueReduce like valueMap
                  valuesAreArrays ?
                    // convert values to objects
                    a.values.map(function(v, j) {
                      return {
                        x: formatX(getX(v), j),
                        y: formatY(getY(v), j) + getY(b.values[j])
                      };
                    }) :
                    // update x and y in value
                    a.values.map(function(v, j) {
                      v.x = formatX(getX(v), j);
                      v.y = formatY(getY(v), j) + getY(b.values[j]);
                      return v;
                    });
              })
            }];
            properties.seriesLength = data[0].values.length;
          }
        }
        // discrete
        else if (valuesAreDiscrete) {
          // [
          //   {key: series1, values: [{x:1, y:5}]},
          //   {key: series2, values: [{x:2, y:8}]}
          // ]
          data = data.map(function(d, i) {
            return {
              key: getKey(d),
              values: data.map(function(v, j) {
                var value = v.values[0];
                if (i === j) {
                  if (valuesAreArrays) {
                    return {
                      x: formatX(getX(value), j),
                      y: formatY(getY(value), j)
                    }
                  } else {
                    value.x = formatX(getX(value), j);
                    value.y = formatY(getY(value), j);
                    return value;
                  }
                } else {
                  return {
                    x: formatX(getX(value), j),
                    y: 0
                  }
                };
              })
            };
          });
          properties.seriesLength = data.length;
        }
        // all others
        else {
          data = data.map(function(d, i) {
            d.key = getKey(d);
            d.values = d.values.map(function(v, j) {
              return valueMap(v, j);
            });
            return d;
          });
          properties.seriesLength = data.length;
        }

        break;

      case 'pie':
        data = data.map(function(d, i) {
            var data = {
                key: getKey(d),
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
        properties.seriesLength = data.length;
        break;

      case 'funnel':
        data = data.reverse().map(function(d, i) {
            return {
                key: getKey(d),
                disabled: d.disabled || false,
                values: [{
                  series: i,
                  // label: d.valuelabels[0] ? d.valuelabels[0] : d.values[0],
                  x: 0,
                  y: d3.sum(d.values, function(v) { return getY(v); }),
                  y0: 0
                }]
            };
        });
        properties.seriesLength = data.length;
        break;

      case 'area':
      case 'line':
        // convert array of arrays into array of objects
        data.forEach(function(s, i) {
          s.seriesIndex = i;
          s.key = getKey(s);
          s.values = valuesAreArrays ?
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
        properties.seriesLength = data.length;
        break;

      case 'gauge':
        value = json.values.shift().gvalue;
        var y0 = 0;
        data = data.map(function(d, i) {
            var values = {
                key: pickLabel(d),
                y: parseFloat(d.values[0]) + y0
            };
            y0 += parseFloat(d.values[0]);
            return values;
        });
        groups = [{group: 1, label: 'Sum', total: value}];
        properties.seriesLength = groups.length;
        break;
    }

    // don't override json.properties entirely, just modify/append
    if (groupLabels.length) {
      properties.groups = groupLabels.map(getGroup);
    }

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
          data = {
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

  }

  return {
    properties: properties,
    data: data
  };
}

export default transform;
