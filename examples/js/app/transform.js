
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
      break;

    case 'multibar':
      Chart.stacked(chartData.properties.stacked === false ? false : true);
      break;

    case 'pareto':
      Chart.stacked(chartData.properties.stacked);
      break;
  }
}

function transformTableData(chartData, chartType, Chart) {
  var data = [],
      strNoLabel = 'undefined',
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
          values: [{x: i + 1, y: Chart.getValue()(d)}]
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
            return chartType === 'lines' ?
              Chart.lines.x()(d, i) :
              Chart.area.x()(d, i);
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
