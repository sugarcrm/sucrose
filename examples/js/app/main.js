var tootip = null;

// Application scope jQuery references to main page elements
var $title = $('#title'),
    $picker = $('#picker'),
    $select = $('.chart-selector'),
    $index = $('.index'),
    $demo = $('.demo'),
    $options = $('#options'),
    $form = $('#form'),
    $example = $('#example'),
    $chart = $('#chart');

// Application scope variables
var chartType = window.uQuery('type'),
    chartStore = {},
    chartData = {};

// jQuery.my data
var Data = {};

// jQuery.my manifest
var Manifest = {

      // For jQuery.my cache (will be reset my chart type manifest)
      id: 'sucrose-demo',

      // (will also be reset by chart type manifest)
      type: 'multibar',

      // D3 chart
      Chart: null,

      // Default data
      selectedOptions: {},

      // Chart method variables available to chart on render
      colorLength: 0,
      gradientStart: '#e8e2ca',
      gradientStop: '#3e6c0a',

      optionDefaults: {
        file: '',
        color: 'default',
        gradient: ['0', 'vertical', 'middle'],
        direction: 'ltr'
      },

      // UI elements
      ui: {},

      // Init function
      init: function ($node, runtime) {
        var self = this,
            options = Object.clone(this.data);

        this.Chart = sucroseCharts(this.type);

        // Set default direction
        $('html').css('direction', this.selectedOptions.direction);

        $title.text('Sucrose ' + this.title);

        // Unbind UI
        $(window).off('resize.example');
        $chart.off('resize.example');
        $('button').off('click.example');

        Object.each(options, function (k, v) {
          if (v.val && v.val !== v.def) {
            self.selectedOptions[k] = v.val;
          }
        });

        Object.each(this.ui, function (k, v) {
          $form.append(self.createOptionRow(k, v));
        });

        // Rebind jQuery resizable plugin
        $chart.resizable({
          containment: 'parent',
          minHeight: 200,
          minWidth: 200
        });

        // Rebind UI
        $('button[data-action=full]').on('click.example', function (e) {
          $example.toggleClass('full-screen');
          self.toggleTooltip($(this));
          self.chartResizer(self.Chart)(e);
        });
        $('button[data-action=reset]').on('click.example', function (e) {
          $example.removeClass('full-screen');
          self.resetChartSize();
          self.loadData(self.data.file.val);
        });
        $('button[data-action=toggle]').on('click.example', function (e) {
          $options.toggleClass('hidden');
          $example.toggleClass('full-width');
          self.chartResizer(self.Chart)(e);
        });
        $('button[data-action=download]').on('click.example', function (e) {
          generateImage(e);
        });
      },
      toggleTooltip: function($o) {
        var t1 = $o.data('title'),
            t2 = $o.data('title-toggle');
        $o.data('title', t2)
          .data('title-toggle', t1);
        $o.attr('data-title', t2)
          .attr('data-title-toggle', t1);
      },
      resetChartSize: function () {
        $chart.removeAttr('style');
      },
      // Define resizable handler
      chartResizer: function (chart) {
        // TODO: why can't I debounce?
        return chart.render ?
          function (e) {
            e.stopPropagation();
            chart.render();
          } :
          function (e) {
            e.stopPropagation();
            chart.update();
          };
      },
      windowResizer: function (chart, resetter) {
        return chart.render ?
          (function (e) {
            resetter();
            chart.render();
          }).debounce(50) :
          (function (e) {
            resetter();
            chart.update();
          }).debounce(50);
      },
      // Render chart without data update
      chartRenderer: function () {
        return this.Chart.render ?
          this.Chart.render :
          this.Chart.update;
      },
      // Render chart with data update
      chartUpdater: function () {
        return this.Chart.update;
      },
      createOptionRow: function (k, v) {
        var row = $('<div class="option-row"/>'),
            name = this.getNameFromSelector(k),
            control = this.createControlFromType(v.type, v.values, name);
        row.append($('<span>' + v.title + '</span>')).append('<br/>');
        row.append($(control));
        return row;
      },
      getNameFromSelector: function (k) {
        return k.replace(/\[name=([a-z_]+)\]/, '$1');
      },
      createControlFromType: function (t, v, n) {
        var control;
        switch(t) {
          case 'radio':
            control = this.radioControl(v, n);
            break;
          case 'checkbox':
            control = this.checkboxControl(v, n);
            break;
          case 'select':
            control = this.selectControl(v, n);
            break;
          case 'textarea':
            control = this.textareaControl(v, n);
            break;
          case 'button':
            control = this.buttonControl(v, n);
            break;
          default:
            control = this.textControl(v, n);
            break;
        }
        return $(control);
      },
      radioControl: function (v, n) {
        var radio = '';
        v.each(function (r) {
          radio += '<label><input type="radio" name="' + n + '" value="' + r.value + '"> ' + r.label + ' </label> ';
        })
        return radio;
      },
      checkboxControl: function (v, n) {
        var checkbox = '';
        v.each(function (r) {
          checkbox += '<label><input type="checkbox" name="' + n + '" value="' + r.value + '"> ' + r.label + ' </label> ';
        })
        return checkbox;
      },
      selectControl: function (v, n) {
        var select = '<select name="' + n + '">';
        v.each(function (r) {
          select += '<option value="' + r.value + '">' + r.label + '</option>';
        });
        select += '</select>';
        return select;
      },
      textareaControl: function (v, n) {
        var value = v.map(function (o) { return o.value; }).join(' '),
            textarea = '<textarea name="' + n + '">' + value + '</textarea>';
        return textarea;
      },
      textControl: function (v, n) {
        var value = v.map(function (o) { return o.value; }).join(' '),
            text = '<input type="text" name="' + n + '" value="' + value + '">';
        return text;
      },
      buttonControl: function (v, n) {
        var button = '';
        v.each(function (b) {
            button += '<button type="button" name="' + n + '" data-control="' + b.value + '">' + b.label + '</button>';
        });
        return button;
      },
      // Get data from this or my scope
      getData: function (d, k) {
        return d[k].val || d[k].def;
      },
      // Set data in this or my scope
      setData: function (d, k, v) {
        d[k].val = v;
      },
      // jQuery.my common method for initializing control
      initControl: function ($o) {
        var k = $o.attr('name'),
            v = this.getData(this.data, k);
        this.setOptions(this.data, k, v);
      },
      // jQuery.my common method for binding control
      bindControl: function (d, v, $o, callback) {
        var k = $o.attr('name');
        if (v == null) {
          return this.getData(d, k);
        }
        // Update the my scode data
        this.setData(d, k, v, callback);
        // Store and display chart options
        this.setOptions(d, k, v);
        // Usually chartRender or chartUpdate
        callback(v, this);
      },
      setOptions: function (d, k, v) {
        // First, lets update and store the option
        // in case it overrides a form preset value
        this.selectedOptions[k] = v;
        chartStore.chartOptions = Object.clone(this.selectedOptions);
        store.set('example-' + this.type, chartStore);
        // Now, if the options is the default, lets remove it from display
        if (this.selectedOptions[k] === d[k].def) {
          delete this.selectedOptions[k];
        }
        // Update the settings display textarea
        this.ui['[name=' + k + ']'].setChartOption(v, this);
        this.my.recalc('[name=settings]');
      },
      updateColorModel: function (v) {
        var options = {},
            color = this.data.color.val,
            gradient = this.data.gradient.val;
        if (color && color === 'graduated') {
          options = {c1: this.gradientStart, c2: this.gradientStop, l: this.colorLength};
        }
        if (gradient && gradient.filter('1').length && color !== 'class') {
          options.gradient = true;
          options.orientation = gradient.filter('horizontal').length ? 'horizontal' : 'vertical';
          options.position = gradient.filter('base').length ? 'base' : 'middle';
        }
        this.Chart.colorData(color, options);
      },
      loadChart: function () {
        $chart.attr('class', 'sc-chart sc-chart-' + this.type);
        $chart.find('svg').remove();
        $chart.append('<svg/>');

        if (this.Chart.colorData) {
          this.updateColorModel();
        }

        // Bind D3 chart to SVG element
        d3.select('#chart svg').datum(chartData).call(this.Chart);

        // Dismiss tooltips
        d3.select('#chart').on('click', this.Chart.dispatch.chartClick);

        $(window).on('resize.example', this.windowResizer(this.Chart, this.resetChartSize));
        $chart.on('resize.example', this.chartResizer(this.Chart));
      },
      loadData: function (file) {
        if (!file) {
          return;
        }

        var promise = $.ajax({ // Load data, $.ajax is promise
                url: 'data/' + file + '.json',
                cache: true,
                dataType: 'json',
                context: this,
                async: true
              })
              .then(function (json) { // Loaded, then
                if (!json) {
                  return;
                }

                // TODO: redo this data translation mess
                if (this.type === 'treemap' || this.type === 'tree') {
                  chartData = json;
                  this.colorLength = 0;
                  // chartData = parseTreemapData(json.data.records);
                } else {

                  chartData = json.data ? json : translateDataToD3(json, this.type);

                  this.colorLength = chartData.data.length;

                  if (this.type === 'line') {
                    var xTickLabels = chartData.properties.labels ?
                          chartData.properties.labels.map(function (d) { return d.l || d; }) :
                          [];

                    if (chartData.data.length) {
                      if (chartData.data[0].values.length && chartData.data[0].values[0] instanceof Array) {
                        this.Chart
                          .x(function (d) { return d[0]; })
                          .y(function (d) { return d[1]; });

                        if (sucrose.utils.isValidDate(chartData.data[0].values[0][0])) {
                          this.Chart.xAxis
                            .tickFormat(function (d) {
                              return d3.time.format('%x')(new Date(d));
                            });
                        } else if (xTickLabels.length > 0) {
                          this.Chart.xAxis
                            .tickFormat(function (d) {
                              return xTickLabels[d] || ' ';
                            });
                        }
                      } else {
                        this.Chart
                          .x(function (d) { return d.x; })
                          .y(function (d) { return d.y; });

                        if (xTickLabels.length > 0) {
                          this.Chart.xAxis
                            .tickFormat(function (d) {
                              return xTickLabels[d - 1] || ' ';
                            });
                        }
                      }
                    }
                  } else if (this.type === 'bubble') {
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
                          title: 'Bubble Chart Data'
                        }
                      };
                    }
                  } else if (this.type === 'pareto') {
                    this.Chart.stacked(chartData.properties.stacked || false);
                  }
                }

                this.loadChart();
              });

        return promise;
      }
    };

var baseUI = {
      '[name=file]': {
        bind: function (d, v, $o) {
          return this.bindControl(d, v, $o, this.loadData);
        },
        setChartOption: $.noop,
        check: /[a-z0-9_]+/i,
        // fire on initial load
        // events: 'change.my'
        title: 'Data File',
        type: 'select'
      },
      '[name=color]': {
        bind: function (d, v, $o) {
          return this.bindControl(d, v, $o, this.loadChart);
        },
        setChartOption: $.noop,
        check: /default|class|graduated/i,
        events: 'click.my',
        title: 'Color Model',
        type: 'radio',
        watch: '[name=gradient]',
        values: [
          {value: 'default', label: 'Default'},
          {value: 'class', label: 'Class'},
          {value: 'graduated', label: 'Graduated'}
         ]
      },
      '[name=gradient]': {
        bind: function (d, v, $o) {
          // if (v == null || !v.filter('1').length) {
          //   v = null;
          // }
          return this.bindControl(d, v, $o, this.loadChart);
        },
        setChartOption: $.noop,
        recalc: '[name=color]',
        check: /0|1|vertical|horizontal|middle|base/i,
        events: 'click.my',
        title: 'Gradient',
        type: 'checkbox',
        values: [
          {value: '1', label: 'Use gradient'}, // 0 | 1
          {value: 'horizontal', label: 'Align horizontally'}, // vertical | horizontal
          {value: 'base', label: 'Align base'} // middle | base
         ]
      },
      '[name=direction]': {
        setChartOption: function (v, self) {
          $('html').css('direction', v).attr('class', v);
          self.Chart.direction(v);
        },
        check: /ltr|rtl/i,
        events: 'change.my',
        title: 'Direction',
        type: 'radio',
        values: [
          {value: 'ltr', label: 'Left-to-Right'},
          {value: 'rtl', label: 'Right-to-Left'}
        ]
      }
    };

window.addEventListener('load', function() {
    new FastClick(document.body);
}, false);

if (chartType) {
  loader(chartType);
}

// For both index list and example picker
$select.on('click', 'a', function (e) {
    var type = $(e.target).data('type');
    e.preventDefault();
    if (type !== chartType) {
      loader(type);
    }
  });

// Bind tooltips to buttons
d3.selectAll('[rel=tooltip]')
  .on('mouseover', $.proxy(function () {
    var title = d3.event.srcElement.dataset.title;
    this.tooltip = sucrose.tooltip.show(d3.event, title, null, null, d3.select('.demo').node());
  }, this))
  .on('mousemove', $.proxy(function () {
    if (this.tooltip) {
      sucrose.tooltip.position(d3.select('.demo').node(), this.tooltip, d3.event);
    }
  }, this))
  .on('mouseout', $.proxy(function () {
    if (this.tooltip) {
      sucrose.tooltip.cleanup();
    }
  }, this))
  .on('touchstart', $.proxy(function () {
    d3.event.preventDefault();
    this.tooltip = false;
  }, this))
  .on('click', $.proxy(function () {
    if (this.tooltip) {
      sucrose.tooltip.cleanup();
    }
  }, this));
