
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
    // 0 is default value if reducing an empty list
    return values ? values.reduce(function(a, b) { return a + parseFloat(b); }, 0) : 0;
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

  // json.values = [[],[],[]]
  valuesAreArrays = dataHasValues(chartType, json.values) && isArrayOfArrays(json.values);

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
          var dateString = d.toString().length === 4 ? '1/1/' + d.toString() : d;
          return new Date(dateString);
        } :
        xIsOrdinal ?
          valuesAreDiscrete ?
            // expand x for each series
            // [['a'],['b'],['c']] =>
            // [[0,'a'],[1,'b'],[2,'c']]
            function(d, i) {
              return i + 1;
            } :
            // convert flat array to indexed arrays
            // [['a','b'],['c','d']] => [[[0,'a'],[1,'b']],[[0,'c'],[1,'d']]]
            function(d, i, j) {
              return j + 1;
            } :
        xIsNumeric ?
          function(d, i) {
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
