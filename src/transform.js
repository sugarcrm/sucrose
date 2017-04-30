import d3 from 'd3';

var transform = function(json, chartType, barType) {
  var data = [],
      properties = json.properties ? Array.isArray(json.properties) ? json.properties[0] : json.properties : {},
      value = 0,
      strNoLabel = 'Undefined',
      valuesAreArrays = false,
      valuesAreObjects = false,
      valuesAreValues = false,
      valuesAreDiscrete = false,
      groups = [];

  var xIsDatetime = properties.xDataType === 'datetime' || false,
      xIsOrdinal = properties.xDataType === 'ordinal' || false,
      xIsNumeric = properties.xDataType === 'numeric' || false,
      yIsCurrency = properties.yDataType === 'currency' || false;

  var getX, getY, formatX, formatY;

  // var isDiscreteData = hasValues && Array.isArray(json.label) &&
  //         json.label.length === json.values.length &&
  //         json.values.reduce(function(a, c, i) {
  //             return a && Array.isArray(c.values) && c.values.length === 1 &&
  //                 pickLabel(c.label) === pickLabel(json.label[i]);
  //         }, true);
  //

  function pickLabel(d) {
    // d can be {label:'abc'} ['abc'] or 'abc'
    // var l = [].concat(label)[0];
    return String(d.hasOwnProperty('label') ? d.label : d) || strNoLabel;
  }

  // build group from faw Sugar data values values
  function getGroup(d, i) {
    var g = {
      group: i + 1,
      label: pickLabel(d) // either "One" for d.label
    };
    // raw data values [20, 40, 60] get summed
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

  function dataHasGroups(type, groups) {
      var valueTypes = ['multibar', 'line', 'area'];
      return valueTypes.indexOf(type) !== -1 && groups.length;
  }

  function isArrayOfArrays(data) {
    return Array.isArray(data) && data.length && Array.isArray(data[0]);
  }

  function isArrayOfObjects(data) {
    return Array.isArray(data) && data.length && data[0].hasOwnProperty('y');
  }

  function areDiscreteValues(data) {
    return d3.max(data, function(d) { return d.values.length; }) === 1;
  }

  function getCSVData(properties, csv) {
    // json.values => [
    //   ["Year", "A", "B", "C"],
    //   [1970, 0.3, 2, 0.1],
    //   [1971, 0.5, 2, 0.1],
    //   [1972, 0.7, 3, 0.2]
    // ]
    var seriesKeys, seriesData, groupData, data;

    // the first row is a row of strings
    // then extract first row header labels as series keys
    seriesKeys = properties.keys || csv.splice(0, 1)[0].splice(1);
    // keys => ["A", "B", "C"]

    // reset groupData because it will be rebuilt from values
    //artifact, boo
    groupData = [];
    // something like:
    // groupData => ["One", "Two", "Three"]

    // json.values => [
    //   [1970, 0.3, 2, 0.1],
    //   [1971, 0.5, 2, 0.1],
    //   [1972, 0.7, 3, 0.2]
    // ]
    seriesData = d3.transpose(
        csv.map(function(row, i) {
          // this is a row => [1970, 0.7, 3, 0.2]
          // this is a row => ["One", 0.7, 3, 0.2]

          // extract first column as x value
          var x = row.splice(0, 1)[0];

          if (xIsOrdinal) {
            // extract the first column into the properties category label array
            // {group: i, label: x}
            groupData.push(getGroup(x, i));
          }

          return row.map(function(value, j) {
              // row => [0.7, 3, 0.2]]
              // first column is datetime or is numeric
              //TODO: use valueMaps?
              if (xIsDatetime || xIsNumeric) {
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

    if (groupData.length) {
      properties.groups = groupData;
    }
    properties.colorLength = data[0].values.length;

    return data;
  }

  function valueMap(v, i) {
    var vo = valuesAreObjects ? v : {};
    vo.x = formatX(v, i);
    vo.y = formatY(v, i);
    return vo;
  }

  // update x and y in value
  function valueReduce(a, c, i) {
    return c.values.map(function(v, j) {
      var vo = valuesAreObjects ? v : {};
      var y = getY(v, j) + getY(a.values[j], j);
      vo.x = formatX(v, j);
      vo.y = parseFloat(y);
      return vo;
    });
  }

  // process CSV values
  // json.values = [[],[],[]]
  if (isArrayOfArrays(json.values)) {
    data = getCSVData(properties, json.values);
  } else {
    data = json.data || json.values;
    groups = properties.groups || json.label || properties.labels || properties.label || [];
    if (dataHasGroups(chartType, groups)) {
      properties.groups = groups.map(getGroup);
    } else {
      delete properties.groups;
    }
  }

  if (dataHasValues(chartType, data)) {
    // json.values => [[0,20],[1,20]] or [{x:1,y:20},{x:2,y:40}] or [20,40]
    valuesAreArrays = isArrayOfArrays(data[0].values);
    valuesAreObjects = isArrayOfObjects(data[0].values);
    valuesAreValues = !valuesAreArrays && !valuesAreObjects;
    valuesAreDiscrete = areDiscreteValues(data);

    getX = valuesAreArrays ?
      function(d) {
        return d[0];
      } : valuesAreObjects ?
      function(d) {
        return d.x;
      } :
      function(d, i) {
        return i;
      };
    getY = valuesAreArrays ?
      function(d) {
        return d[1];
      } : valuesAreObjects ?
      function(d) {
        return d.y;
      } :
      function(d) {
        return d;
      };

    formatX = xIsDatetime ?
      function(d, i) {
        var x, dateString, date;
        x = getX(d, i);
        // x => 1970, x => '1/1/1980', x => '1980-1-1', x => 1138683600000
        // if the date value provided is a year
        // append day and month parts to get correct UTC offset
        // x = x + '-1-1';
        // else if x is an integer date then treating as integer
        // is ok because xDataType will force formatting on render
        dateString = x.toString().length === 4 ? '1/1/' + x.toString() : x;
        if (typeof dateString === 'string' && dateString.indexOf('GMT') === -1) {
          dateString += ' GMT';
        }
        date = new Date(dateString);
        return date.toUTCString();
      } : xIsOrdinal ?
      // valuesAreDiscrete ?
      // expand x for each series
      // [['a'],['b'],['c']] =>
      // [[0,'a'],[1,'b'],[2,'c']]
      function(d, i) {
        return i + 1;
      } : xIsNumeric ?
      // convert flat array to indexed arrays
      // [['a','b'],['c','d']] => [[[0,'a'],[1,'b']],[[0,'c'],[1,'d']]]
      // function(d, i, j) {
      //   return j + 1;
      // } :
      function(d, i) {
        return parseFloat(getX(d, i));
      } :
      function(d, i) {
        return getX(d, i);
      };

    formatY = function(d, i) {
      return parseFloat(getY(d, i));
    };

    switch (chartType) {

      case 'multibar':

        // basic
        if (barType === 'basic') {
          if (data.length === 1) {
            // json = [
            //   {key: 'series1', values: [{x:1, y:5}, {x:2, y:8}, {x:3, y:1}]}
            // ]
            data = data.map(function(d, i) {
              d.key = getKey(d) || 'Series ' + i;
              d.values = d.values.map(valueMap);
              return d;
            });
          } else {
            // json = [
            //   {key: 'series1', values: [{x:1, y:5}, {x:2, y:8}, {x:3, y:1}]},
            //   {key: 'series2', values: [{x:1, y:3}, {x:2, y:4}, {x:3, y:7}]}
            // ]
            data = [{
              key: properties.key || 'Series 0',
              values: data.reduce(valueReduce)
            }];
          }
          properties.colorLength = data[0].values.length;
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
                  return valueMap(value, j);
                } else {
                  return {
                    x: formatX(value, j),
                    y: 0
                  };
                }
              })
            };
          });
          properties.colorLength = data.length;
        }
        // all others
        else {
          data = data.map(function(d, i) {
            d.key = getKey(d);
            d.values = d.values.map(valueMap);
            return d;
          });
          properties.colorLength = data.length;
        }

        break;

      case 'pie':
        data = data.map(function(d, i) {
            var data = {
                key: getKey(d),
                // can be:
                // values: [20, 40, 60]
                // values: [{y:20}, {y:40}, {y:60}]
                value: sumValues(d.values.map(getY))
            };
            if (d.hasOwnProperty('disabled')) {
              data.disabled = d.disabled;
            }
            if (d.hasOwnProperty('color')) {
              data.color = d.color;
            }
            if (d.hasOwnProperty('classes')) {
              data.classes = d.classes;
            }
            return data;
          });
        properties.colorLength = data.length;
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
                  y: d3.sum(d.values, getY),
                  y0: 0
                }]
            };
        });
        properties.colorLength = data.length;
        break;

      case 'area':
      case 'line':
        // convert array of arrays into array of objects
        data.forEach(function(s, i) {
          s.seriesIndex = i;
          s.key = getKey(s);
          //TODO: use valueMap
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
        properties.colorLength = data.length;
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
        properties.groups = [{group: 1, label: 'Sum', total: value}];
        properties.colorLength = groups.length;
        break;
    }

    // Multibar process data routine
      // // add series index to each data point for reference
      // data.forEach(function(series, s) {
      //   // make sure untrimmed values array exists
      //   // and set immutable series values
      //   if (!series._values) {
      //     //TODO: this should be set as d.metadata or d.data
      //     //      then we set d.x&y to d.data.x&y
      //     series._values = series.values.map(function(value, v) {
      //       return {
      //         'x': value.x,
      //         'y': value.y
      //       };
      //     });
      //   }
      //   series.seriesIndex = s;
      //   series.values = series._values.map(function(value, v) {
      //       return {
      //         'seriesIndex': series.seriesIndex,
      //         'group': v,
      //         'color': typeof series.color !== 'undefined' ? series.color : '',
      //         'x': model.x()(value, v),
      //         'y': model.y()(value, v),
      //         'y0': value.y + (s > 0 ? data[series.seriesIndex - 1].values[v].y0 : 0),
      //         'active': typeof series.active !== 'undefined' ? series.active : ''
      //       };
      //     });
      //   series.total = d3.sum(series.values, function(value, v) {
      //       return value.y;
      //     });
      //   // disabled if all values in series are zero
      //   // or the series was disabled by the legend
      //   series.disabled = series.disabled || series.total === 0;
      //   // inherit values from series
      //   series.values.forEach(function(value, v) {
      //     // do not eval d.active because it can be false
      //     value.active = typeof series.active !== 'undefined' ? series.active : '';
      //   });
    // });

    // don't override json.properties entirely, just modify/append
    // properties.colorLength = data.length;

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
          // var colorLength = d3.nest()
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
              colorLength: json.records.length
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
};

export default transform;
