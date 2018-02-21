import d3 from 'd3';
import utility from './utility.js';
import language from './language.js';

var transform = (function() {

  function getArrayX(d) {
    return d[0];
  }
  function getArrayY(d) {
    return d[1];
  }
  function getObjectX(d) {
    return d.x;
  }
  function getObjectY(d) {
    return d.y;
  }
  function getIndexX(d, i) {
    return i;
  }
  function getValueY(d) {
    return d;
  }

  function hasValue(d) {
    //true => {y: 11} || {value: 11}
    return d.hasOwnProperty('value') || d.hasOwnProperty('y');
  }

  function hasValues(series) {
    //true => [{}, {}] || [[], []]
    return Array.isArray(series.values) && series.values.length;
  }

  function hasSingleValue(series) {
    //true => [{}]
    return hasValues(series) && series.values.length === 1;
  }

  function dataHasValues(type, data) {
    var valuesTypes = ['multibar', 'line', 'area', 'pie', 'funnel', 'gauge'];
    return valuesTypes.indexOf(type) !== -1 &&
      Array.isArray(data) &&
      data.filter(function(series) {
        return hasValues(series) || hasValue(series);
      }).length > 0;
  }

  function dataHasGroups(type, groups) {
    var valueTypes = ['multibar', 'line', 'area'];
    return valueTypes.indexOf(type) !== -1 && Array.isArray(groups) && groups.length > 0;
  }

  function isArrayOfArrays(values) {
    return Array.isArray(values) && values.length > 0 && Array.isArray(values[0]);
  }

  function isArrayOfObjects(values) {
    return Array.isArray(values) && values.length > 0 && hasValue(values[0]);
  }

  function pickLabel(d) {
    // d can be {label:'abc'} ['abc'] or 'abc'
    // var l = [].concat(label)[0];
    return typeof d !== 'undefined' && String(d.hasOwnProperty('label') ? d.label : d).toString() || strNoLabel;
  }

  function getKey(d) {
    return typeof d !== 'undefined' && d.hasOwnProperty('key') ? String(d.key).toString() || strNoLabel : pickLabel(d);
  }

  function preserveAttributes(series, d) {
    if (series.hasOwnProperty('disabled')) {
      d.disabled = series.disabled;
    }
    if (series.hasOwnProperty('color')) {
      d.color = series.color;
    }
    if (series.hasOwnProperty('classes')) {
      d.classes = series.classes;
    }
  }


  //TODO: needs to get current language
  var strNoLabel = language().translate('noLabel');

  var transformData = function(json, chartType, barType) {
    var properties = json.properties ? Array.isArray(json.properties) ? json.properties[0] : json.properties : {},
        seriesData = [],
        data = [],
        groupData = [];

    var valuesAreArrays = false,
        valuesAreObjects = false,
        valuesAreDiscrete = false;

    var xIsDatetime = properties.xDataType === 'datetime' || false,
        xIsNumeric = properties.xDataType === 'numeric' || false;

    var xIsOrdinal = false;

    var getX, getY, parseX, parseY;


    //============================================================
    // Common Functions
    //------------------------------------------------------------
    //TODO: make these public methods for reuse/testing

    // build group from faw Sugar data values values
    function getGroup(d, i) {
      var g = {
        group: i + 1,
        label: pickLabel(d) // either "One" for d.label
      };
      // raw data values [20, 40, 60] get summed
      if (d.values) {
        g.total = sumValues(d);
      }
      return g;
    }

    function sumValues(d) {
      var sum = 0;
      if (d.hasOwnProperty('value')) {
        sum = d.value;
      } else if (d.hasOwnProperty('y')) {
        sum = d.y;
      } else if (d.hasOwnProperty('values')) {
        sum = d3.sum(d.values, parseY);
      } else if (utility.isNumeric(d)) {
        sum = d;
      }
      return sum;
      // 0 is default value if reducing an empty list
      // return d.values ? d.values.reduce(function(a, b) { return a + parseFloat(b); }, 0) : 0;
    }

    function valueMap(v, i) {
      var vo = valuesAreObjects ? v : {};
      vo.x = parseX(v, i);
      vo.y = parseY(v, i);
      return vo;
    }

    // update x and y in value
    function valueReduce(a, c) {
      return c.values.map(function(value, v) {
          var vo = valuesAreObjects ? value : {};
          var y = getY(value, v) + getY(a.values[v], v);
          vo.x = parseX(value, v);
          vo.y = parseFloat(y);
          return vo;
        });
    }

    function seriesMap(series) {
      var d, values;
      values = series.values.map(valueMap);
      d = {
        key: getKey(series),
        values: values
      };
      preserveAttributes(series, d);
      return d;
    }

    function discreteMapIdentity(series, i, data) {
      var d, values;
      values = data.map(function(v, j) {
        var value = v.values[0];
        if (i === j) {
          return valueMap(value, j);
        } else {
          return {
            x: parseX(value, j),
            y: 0
          };
        }
      });
      d = {
        key: getKey(series),
        values: values
      };
      preserveAttributes(series, d);
      return d;
    }

    function discreteMap(series, i) {
      var d, values;
      values = [valueMap(series.values[i] || series.values[0], i)];
      d = {
        key: getKey(series),
        values: values
      };
      preserveAttributes(series, d);
      return d;
    }

    function processCSVData(properties, csv) {
      // json.values => [
      //   ["Year", "A", "B", "C"],
      //   [1970, 0.3, 2, 0.1],
      //   [1971, 0.5, 2, 0.1],
      //   [1972, 0.7, 3, 0.2]
      // ]
      var seriesKeys, transposeData;

      // the first row is a row of strings
      // then extract first row header labels as series keys
      seriesKeys = properties.keys || csv.shift().splice(1);
      // keys => ["A", "B", "C"]

      // reset groupData because it will be rebuilt from values
      //artifact, boo
      //TODO: should we set group total to gvalue?
      groupData = [];
      // something like:
      // groupData => ["One", "Two", "Three"]

      // json.values => [
      //   [1970, 0.3, 2, 0.1],
      //   [1971, 0.5, 2, 0.1],
      //   [1972, 0.7, 3, 0.2]
      // ]
      transposeData = d3.transpose(
          csv.map(function(row, i) {
            // this is a row => [1970, 0.7, 3, 0.2]
            // this is a row => ["One", 0.7, 3, 0.2]

            // extract first column as x value
            // var x = row.splice(0, 1)[0];
            var x = row.shift();

            if (!xIsDatetime && !xIsNumeric) {
              // extract the first column into the properties category label array
              // {group: i, label: x}
              groupData.push(getGroup(x, i));
              // not needed
              // xIsOrdinal = true;
            }

            return row.map(function(value) {
                // row => [0.7, 3, 0.2]]
                // first column is datetime or is numeric
                if (xIsDatetime || xIsNumeric) {
                  // if x is an integer date then treating as integer
                  // is ok because xDataType will force formatting on render
                  // what about "June 1970"
                  return [x, value];
                }
                // ... or is ordinal
                // increment
                else {
                  return [i + 1, value];
                }
              });
          })
        );

      seriesData = seriesKeys.map(function(key, i) {
          return {
              key: key,
              values: transposeData[i]
            };
        });
    }

    //============================================================
    // Parse Json data

    // json.values = [[],[],[]]
    if (isArrayOfArrays(json.values)) {
      // process CSV values with seriesData and groupData artifacts
      processCSVData(properties, json.values);
    } else {
      if (json.values) {
        // process Sugar report data
        seriesData = json.values;
        groupData = json.label || [];
      } else {
        // process Standard Data Model (SDM)
        seriesData = json.data;
        groupData = properties.groups || properties.labels || properties.label || [];
      }
    }

    xIsOrdinal = dataHasGroups(chartType, groupData);
    // Wrong!! true for line but not discrete multibar
     // && groupData.length === seriesData[0].values.length;


    //============================================================
    // Main

    if (dataHasValues(chartType, seriesData)) {
      // json.values => [[0,20],[1,20]]
      valuesAreArrays = isArrayOfArrays(seriesData[0].values);
      // or SDM => [{x:1,y:20},{x:2,y:40}]
      valuesAreObjects = isArrayOfObjects(seriesData[0].values);
      getX = valuesAreArrays ? getArrayX : valuesAreObjects ? getObjectX : getIndexX;
      getY = valuesAreArrays ? getArrayY : valuesAreObjects ? getObjectY : getValueY;
      valuesAreDiscrete = areValuesDiscrete(seriesData, groupData, getX, getY);

      parseX = xIsOrdinal
        ? function(d, i) {
          // expand x for each series
          // [['a'],['b'],['c']] =>
          // [[0,'a'],[1,'b'],[2,'c']]
          return i + 1;
        }
        : xIsDatetime
          ? function(d, i) {
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
            return date.valueOf();
          }
          : xIsNumeric
          // convert flat array to indexed arrays
          // [['a','b'],['c','d']] => [[[0,'a'],[1,'b']],[[0,'c'],[1,'d']]]
          // function(d, i, j) {
          //   return j + 1;
          // } :
            ? function(d, i) {
              return parseFloat(getX(d, i));
            }
            : function(d, i) {
              return getX(d, i);
            };
      parseY = function(d, i) {
        return parseFloat(getY(d, i));
      };

      switch (chartType) {

        case 'multibar':
          // basic
          if (barType === 'basic') {
            if (seriesData.length === 1) {
              // json = [
              //   {key: 'series1', values: [{x:1, y:5}, {x:2, y:8}, {x:3, y:1}]}
              // ]
              data = seriesData.map(seriesMap);
            } else {
              // json = [
              //   {key: 'series1', values: [{x:1, y:5}, {x:2, y:8}, {x:3, y:1}]},
              //   {key: 'series2', values: [{x:1, y:3}, {x:2, y:4}, {x:3, y:7}]}
              // ]
              data = [{
                key: properties.key || 'Series 0',
                values: seriesData.reduce(valueReduce)
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
            data = seriesData.map(discreteMap);
          }
          // all others
          else {
            data = seriesData.map(seriesMap);
          }

          break;

        case 'gauge':
        case 'pie':
          data = seriesData.map(function(series) {
              var d;
              d = {
                key: getKey(series),
                // can be:
                // values: [20, 40, 60]
                // values: [{y:20}, {y:40}, {y:60}]
                value: sumValues(series)
              };
              preserveAttributes(series, d);
              return d;
            });
          break;

        case 'funnel':
          data = seriesData.reverse().map(function(series, s) {
              var y, d;
              y = d3.sum(series.values, getY);
              d = {
                key: getKey(series),
                values: [{
                  series: s,
                  x: 0,
                  y: y,
                  y0: 0
                }]
              };
              preserveAttributes(series, d);
              return d;
            });
          break;

        case 'area':
        case 'line':
          // convert array of arrays into array of objects
          data = seriesData.map(seriesMap);
          break;
      }

      getX = getObjectX;
      getY = getObjectY;

      // Multibar process data routine
        // // add series index to each data point for reference
        // data.forEach(function(series, s) {
        //   // make sure untrimmed values array exists
        //   // and set immutable series values
        //   if (!series._values) {
        //     //      then we set d.x&y to d.data.x&y
        //     series._values = series.values.map(function(value, v) {
        //       return {
        //         'x': value.x,
        //         'y': value.y
        //       };
        //     });
        //   }
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
      // });

      // don't override json.properties entirely, just modify/append
      if (dataHasGroups(chartType, groupData)) {
        properties.groups = groupData.map(getGroup);
      } else {
        delete properties.groups;
      }
      if (!properties.hasOwnProperty('colorLength')) {
        properties.colorLength = data.length;
      }

      // post process data for total and disabled states
      data.forEach(function(series, s) {
        series.seriesIndex = s;
        series.total = sumValues(series);
        // disabled if all values in series are zero
        // or the series was disabled by the legend
        if (!series.total) {
          series.disabled = true;
        }
      });

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
            properties = {
                title: 'Bubble Chart Data',
                yDataType: 'string',
                xDataType: 'datetime',
                colorLength: json.records.length
              };
            data = json.records.map(function (d) {
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
              });
          } else {
            properties = json.properties;
            data = json.data;
          }
          break;

        case 'pareto':
          properties = json.properties;
          data = json.data;
          break;
      }
    }


    //============================================================
    // Return chart data

    return {
      properties: properties,
      data: data
    };
  };

  var areValuesDiscrete = function(data, groups, getX, getY) {
    var uniqueX = null;
    var identityY = null;
    var hasGroupData = Array.isArray(groups) && groups.length > 0 && groups.length === data.length;

    function xIsUnique(data, getX) {
      return data.reduce(function(aS, cS) {
          return cS.values.reduce(function(aV, cV) {
              var x = getX(cV);
              if (aV.indexOf(x) === -1) {
                aV.push(x);
              }
              return aV;
            }, aS);
        }, []).length === data.length;
    }

    function yIsIdentity(data, getY) {
      // data length is same as values length
      return data.length === data[0].values.length &&
        // all series have a max of one value that is not zero
        data.filter(function(series) {
          return series.values.filter(function(value) {
              return getY(value) !== 0;
            }).length <= 1;
        }).length === data.length;
    }

    function seriesKeyMatchesGroupLabel(series, groups, i) {
      return getKey(series) === pickLabel(groups[i]);
    }

    function xValuesAreUnique(d, getX) {
      return uniqueX === null ? xIsUnique(d, getX) : uniqueX;
    }
    function yValuesAreIdentity(d, getY) {
      return identityY === null ? yIsIdentity(d, getY) : identityY;
    }

    return data.reduce(function(a, c, i) {
        if (!a) {
          return false;
        }
        // pie chart: {key: 'Series A', y: 11}
        return hasValue(c) ||
          ( // Sugar discrete only: {key: 'Series A', values: [11]}
            // or SCM {key: 'Series A', values: [{x:1, y:11}]}
            hasSingleValue(c) &&
            ( // Sugar implied ordinal where series key equals group label
              (hasGroupData && seriesKeyMatchesGroupLabel(c, groups, i)) ||
              // or [{key: 'Series A', values: [{x:1, y:11}]}, {key: 'Series B', values: [{x:2, y:7}]}]
              xValuesAreUnique(data, getX)
            )
          ) ||
          ( // CSV datetime or numeric because they don't have groups
            // or Sugar implied ordinal where series key equals group label
            // and only the nth value in nth series is not zero
            (!hasGroupData || seriesKeyMatchesGroupLabel(c, groups, i)) &&
            yValuesAreIdentity(data, getY)
          );
      }, true);
  };

  transformData.areValuesDiscrete = areValuesDiscrete;

  return transformData;
})();

export default transform;
