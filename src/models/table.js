
sucrose.models.table = function() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 2, right: 0, bottom: 2, left: 0},
      width = 0,
      height = 0,
      animate = true,
      getX = function(d) { return d.x; },
      getY = function(d) { return d.y; },
      strings = {
        legend: {close: 'Hide legend', open: 'Show legend'},
        controls: {close: 'Hide controls', open: 'Show controls'},
        noData: 'No Data Available.'
      },
      color = sucrose.utils.getColor(['#000']);

  //============================================================


  function chart(selection) {
    selection.each(function(chartData) {
      var container = d3.select(this);

      //------------------------------------------------------------

      var properties = chartData ? chartData.properties : {},
          data = (chartData && chartData.data) ? chartData.data.map(function(d) {
            return {
              'key': d.key || 'Undefined',
              'type': d.type || null,
              'disabled': d.disabled || false,
              'values': d._values || d.values
            };
          }) : null;

      var labels = properties.labels ||
            d3.range(
              1,
              d3.max(data.map(function(d) { return d.values.length; })) + 1
            )
            .map(function(d) {
              return {'group': d, 'l': 'Group ' + d};
            });

      var singleSeries = d3.max(data.map(function (d) {
            return d.values.length;
          })) === 1;

      function displayNoData(d) {
        if (d && d.length && d.filter(function(d) { return d.values.length; }).length) {
          container.selectAll('.sc-noData').remove();
          return false;
        }

        container.select('.sucrose').remove();
        var parentDimensions = container.node().parentNode.getBoundingClientRect();
        var w = width || parseInt(parentDimensions.width, 10) || 960,
            h = height || parseInt(parentDimensions.height, 10) || 400,
            noDataText = container.selectAll('.sc-noData').data([chart.strings().noData]);

        noDataText.enter().append('div')
          .attr('class', 'sucrose sc-noData')
          .style({'text-align': 'center', 'position': 'absolute', 'top': (h / 2) + 'px', 'width': w + 'px'})
          .text(function(d) {
            return d;
          });

        return true;
      }

      // Check to see if there's nothing to show.
      if (displayNoData(data)) {
        return chart;
      }
      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = container.selectAll('table').data([data]);
      var tableEnter = wrap.enter().append('table').attr('class', 'sucrose');

      //------------------------------------------------------------

      var theadEnter = tableEnter
            .append('thead').attr('class', 'sc-thead')
              .append('tr').attr('class', 'sc-groups');
      var thead = wrap.select('.sc-groups');
          theadEnter
            .append('th').attr('class', 'sc-th sc-series-state')
            .text('Enabled');
          theadEnter
            .append('th').attr('class', 'sc-th sc-series-keys')
            .text(properties.key || 'Series Key');

      var cols = thead.selectAll('.sc-group')
            .data(labels);
          cols.exit().remove();
          cols.enter()
            .append('th').attr('class', 'sc-th sc-group');
          thead.selectAll('.sc-group')
            .text(function(d) { return d.l; });

        if (!singleSeries) {
          theadEnter
            .append('th').attr('class', 'sc-th sc-series-totals')
            .text('Series Total');
        }

      //------------------------------------------------------------

      var tfootEnter = tableEnter
            .append('tfoot').attr('class', 'sc-tfoot')
              .append('tr').attr('class', 'sc-sums');
      var tfoot = wrap.select('.sc-sums');
          tfootEnter
            .append('th').attr('class', 'sc-th sc-group-sums')
              .text('');
          tfootEnter
            .append('th').attr('class', 'sc-th sc-group-sums')
              .text('Group Sums');

      var sums = tfoot.selectAll('.sc-sum')
            .data(function (d) {
              return d
                .filter(function (f) {
                  return !f.disabled;
                })
                .map(function (a) {
                  return a.values.map(function (b) { return b.y; });
                })
                .reduce(function (p, c) {
                  return p.map(function (d, i) {
                    return d + c[i];
                  });
                });
              });
          sums.exit().remove();
          sums.enter()
            .append('th').attr('class', 'sc-sum');
          tfoot.selectAll('.sc-sum')
            .text(function (d) { return d; });

        if (!singleSeries) {
          tfootEnter
            .append('th').attr('class', 'sc-th sc-sum-total');
          tfoot.select('.sc-sum-total')
            .text(function (d) {
              return d
                .filter(function (f) {
                  return !f.disabled;
                })
                .map(function (a) {
                  return a.values
                    .map(function (b) { return b.y; })
                    .reduce(function (p, c) {
                      return p + c;
                    });
                })
                .reduce(function (p, c) {
                  return p + c;
                });
            });
        }

      //------------------------------------------------------------

          tableEnter
            .append('tbody').attr('class', 'sc-tbody');
      var tbody = wrap.select('.sc-tbody');

      var rows = tbody.selectAll('.sc-series')
            .data(function(d) { return d; });
          rows.exit().remove();
      var seriesEnter = rows.enter()
            .append('tr').attr('class', 'sc-series');
          seriesEnter
            .append('td').attr('class', 'sc-td sc-state')
            .attr('tabindex', -1)
            .attr('data-editable', false)
            .append('input')
              .attr('type', 'checkbox');
          rows.select('.sc-state input')
            .property('checked', function(d) {return d.disabled ? false : true; });
          seriesEnter
            .append('td').attr('class', 'sc-td sc-key');
          rows.select('.sc-key')
            .text(function(d) { return d.key; });
          rows
            .style('color', function(d) {return d.disabled ? '#ddd' : '#000'; })
            .style('text-decoration', function(d) {return d.disabled ? 'line-through' : 'normal'; });

      var cells = rows.selectAll('.sc-val')
            .data(function(d) { return d.values; });
          cells.exit().remove();
          cells.enter()
            .append('td').attr('class', 'sc-td sc-val');
          tbody.selectAll('.sc-val')
            .text(function(d) { return d.y; });

          rows.selectAll('.sc-val')

        if (!singleSeries) {
          seriesEnter
            .append('td').attr('class', 'sc-td sc-total')
              .attr('tabindex', -1)
              .attr('data-editable', false);
          rows.select('.sc-total')
            .text(function(d) {
              return d.values
                .map(function(d) { return d.y; })
                .reduce(function(p, c) {
                  return p + c;
                });
            });
        }

    });

    return chart;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
  };

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = d3.functor(_);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = d3.functor(_);
    return chart;
  };

  chart.strings = function(_) {
    if (!arguments.length) {
      return strings;
    }
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        strings[prop] = _[prop];
      }
    }
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = sucrose.utils.getColor(_);
    return chart;
  };

  //============================================================


  return chart;
}
