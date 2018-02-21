import d3 from 'd3';
import utility from '../utility.js';
import language from '../language.js';

export default function table() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 2, right: 0, bottom: 2, left: 0},
      width = 0,
      height = 0,
      getX = function (d) { return d.x; },
      getY = function (d) { return d.y; },
      strings = language(),
      color = utility.getColor(['#000']);

  //============================================================


  function table(selection) {
    selection.each(function (chartData) {
      var container = d3.select(this);

      //------------------------------------------------------------

      var properties = chartData ? chartData.properties : {},
          data = (chartData && chartData.data) ? chartData.data.map(function (d, i) {
            return {
              'key': d.key || 'Undefined',
              'type': d.type || null,
              'disabled': d.disabled || false,
              'series': d.seriesIndex || i,
              'values': d._values || d.values
            };
          }) : null;

      var containerWidth = parseInt(container.style('width'), 10),
          containerHeight = parseInt(container.style('height'), 10);

      var labels = properties.groups ||
            d3.range(
              1,
              d3.max(data.map(function (d) { return d.values.length; })) + 1
            )
            .map(function (d) {
              return {'group': d, 'l': 'Group ' + d};
            });

      var singleSeries = d3.max(data.map(function (d) {
            return d.values.length;
          })) === 1;

      function displayNoData(d) {
        var hasData = d && d.length && d.filter(function (d) { return d.values.length; }).length,
            x = (containerWidth - margin.left - margin.right) / 2 + margin.left,
            y = (containerHeight - margin.top - margin.bottom) / 2 + margin.top;
        return utility.displayNoData(hasData, container, table.strings().noData, x, y);
      }
      // Check to see if there's nothing to show.
      if (displayNoData(data)) {
        return table;
      }
      //------------------------------------------------------------
      // Setup containers and skeleton of model

      var wrap_bind = container.selectAll('table').data([data]);
      var wrap_enter = wrap_bind.enter().append('table');
      wrap_bind.exit().remove();
      var wrap = container.selectAll('table').merge(wrap_enter);

      //------------------------------------------------------------
      var table_entr = wrap_enter.attr('class', 'sucrose');

      var thead_entr = table_entr.append('thead')
            .attr('class', 'sc-thead')
              .append('tr')
                .attr('class', 'sc-groups');
      var thead = wrap.select('.sc-groups').merge(thead_entr);
          thead_entr.append('th')
            .attr('class', 'sc-th sc-series-state')
            .text('Enabled');
          thead_entr.append('th')
            .attr('class', 'sc-th sc-series-keys')
            .text(properties.key || 'Series Key');

      var cols_bind = thead.selectAll('.sc-group').data(labels);
      var cols_entr = cols_bind.enter().append('th')
            .attr('class', 'sc-th sc-group');
          cols_bind.exit().remove();
          thead.selectAll('.sc-group').merge(cols_entr)
            .text(function (d) { return singleSeries ? 'Series Total' : d.l; });

        if (!singleSeries) {
          thead_entr
            .append('th').attr('class', 'sc-th sc-series-totals')
            .text('Series Total');
        }

      //------------------------------------------------------------

      var tfoot_entr = table_entr.append('tfoot')
            .attr('class', 'sc-tfoot')
              .append('tr')
                .attr('class', 'sc-sums');
      var tfoot = wrap.select('.sc-sums').merge(tfoot_entr);
          tfoot_entr.append('th')
            .attr('class', 'sc-th sc-group-sums')
            .text('');
          tfoot_entr.append('th')
            .attr('class', 'sc-th sc-group-sums')
            .text(singleSeries ? 'Sum' : 'Group Sums');

      var sums_bind = tfoot.selectAll('.sc-sum').data(function (d) {
              return d
                .filter(function (f) {
                  return !f.disabled;
                })
                .map(function (a) {
                  return a.values.map(function (b) { return getY(b); });
                })
                .reduce(function (p, c) {
                  return p.map(function (d, i) {
                    return d + c[i];
                  });
                });
              });
      var sums_entr = sums_bind.enter().append('th')
            .attr('class', 'sc-sum');
          sums_bind.exit().remove();
          tfoot.selectAll('.sc-sum').merge(sums_entr)
            .text(function (d) { return d; });

        if (!singleSeries) {
          tfoot_entr.append('th')
            .attr('class', 'sc-th sc-sum-total');
          tfoot.select('.sc-sum-total')
            .text(function (d) {
              return d
                .filter(function (f) {
                  return !f.disabled;
                })
                .map(function (a) {
                  return a.values
                    .map(function (b) { return getY(b); })
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

          table_entr.append('tbody')
            .attr('class', 'sc-tbody');

      var tbody = wrap.select('.sc-tbody');

      var rows_bind = tbody.selectAll('.sc-series').data(function (d) { return d; });
          rows_bind.exit().remove();
      var rows_entr = rows_bind.enter().append('tr')
            .attr('class', 'sc-series');
          rows_entr.append('td')
            .attr('class', 'sc-td sc-state')
            .attr('tabindex', -1)
            .attr('data-editable', false)
            .append('input')
              .attr('type', 'checkbox');
          rows_entr.append('td')
            .attr('class', 'sc-td sc-key');

      var series = tbody.selectAll('.sc-series').merge(rows_entr)
            .style('color', function (d) { return d.disabled ? '#ddd' : '#000'; })
            .style('text-decoration', function (d) { return d.disabled ? 'line-through' : 'inherit'; });
          series.select('.sc-state input')
            .property('checked', function (d) { return d.disabled ? false : true; });
          series.select('.sc-key')
            .text(function (d) { return d.key; });

      var cells_bind = series.selectAll('.sc-val').data(function (d, i) {
              return d.values.map(function (g, j) {
                  var val = Array.isArray(g) ?
                    {
                      0: g[0],
                      1: g[1]
                    } :
                    {
                      x: g.x,
                      y: g.y
                    };
                  val.series = i;
                  val.index = j;
                  return val;
                });
            });
      var cells_entr = cells_bind.enter().append('td')
            .attr('class', 'sc-td sc-val');
          cells_bind.exit().remove();
          tbody.selectAll('.sc-val').merge(cells_entr)
            .text(function (d) {
              return getY(d);
            });

        if (!singleSeries) {
          rows_entr.append('td')
            .attr('class', 'sc-td sc-total')
            .attr('tabindex', -1)
            .attr('data-editable', false);
          series.select('.sc-total')
            .text(function (d) {
              return d.values
                .map(function (d) { return getY(d); })
                .reduce(function (p, c) {
                  return p + c;
                });
            });
        }

    });

    return table;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  table.margin = function (_) {
    if (!arguments.length) { return margin; }
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        margin[prop] = _[prop];
      }
    }
    return table;
  };

  table.width = function (_) {
    if (!arguments.length) { return width; }
    width = _;
    return table;
  };

  table.height = function (_) {
    if (!arguments.length) { return height; }
    height = _;
    return table;
  };

  table.x = function (_) {
    if (!arguments.length) { return getX; }
    getX = utility.functor(_);
    return table;
  };

  table.y = function (_) {
    if (!arguments.length) { return getY; }
    getY = utility.functor(_);
    return table;
  };

  table.strings = function (_) {
    if (!arguments.length) { return strings; }
    strings = language(_);
    return table;
  };

  table.color = function (_) {
    if (!arguments.length) { return color; }
    color = utility.getColor(_);
    return table;
  };

  //============================================================


  return table;
}
