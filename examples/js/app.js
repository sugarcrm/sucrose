'use strict';

$(function () {

  // Application scope jQuery references to main page elements
  var $title = $('#title'),
      $picker = $('#picker'),
      $container = $('.sc-form-container'),
      $form = $('#form'),
      $chart = $('#chart');

  // Application scope variables
  var chartType = 'multibar',
      chartStore = {},
      chartData = {};

  // jQuery.my data
  var Data = {};

  // jQuery.my manifest
  var Manifest = {

        // For jQuery.my cache (will be reset my chart type manifest)
        id: 'examples',

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

        // TODO: add default values for base UI

        // Init function
        init: function ($node, runtime) {
          var self = this,
              options = Object.clone(this.data);

          this.Chart = sucroseCharts(this.type);

          // Set default direction
          $('html').css('direction', this.selectedOptions.direction);

          $title.text('Sucrose ' + this.title);

          $(window).off('resize.examples');
          $chart.off('resize.examples');

          Object.each(options, function (k, v) {
            if (v.val && v.val !== v.def) {
              self.selectedOptions[k] = v.val;
            }
          });

          Object.each(this.ui, function (k, v) {
            $form.append(self.createOptionRow(k, v));
          });

          $('button[data-action=full]').on('click', function (e) {
            $('.sc-chart-container').toggleClass('full-screen');
            self.chartResizer(self.Chart)(e);
          });
          $('button[data-action=reset]').on('click', function (e) {
            $('.sc-chart-container').removeClass('full-screen');
            self.resetChartSize();
            self.loadData(self.data.file.val);
          });

        },
        resetChartSize: function () {
          $chart.removeAttr('style');
        },
        // Define resizable handler
        chartResizer: function (chart) {
          //TODO: add debounce to resizer
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
            function (e) {
              resetter();
              chart.render();
            } :
            function (e) {
              resetter();
              chart.update();
            };
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
          })
          select += '</select>';
          return select;
        },
        textareaControl: function (v, n) {
          var value = v.map(function (o) { return o.value }).join(' '),
              textarea = '<textarea name="' + n + '">' + value + '</textarea>';
          return textarea;
        },
        textControl: function (v, n) {
          var value = v.map(function (o) { return o.value }).join(' '),
              text = '<input type="text" name="' + n + '" value="' + value + '">';
          return text;
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
        // Get data from this or my scope
        getData: function (d, k) {
          return d[k].val || d[k].def;
        },
        // Set data in this or my scope
        setData: function (d, k, v) {
          d[k].val = v;
        },
        // jQuery.my common method for initializing control
        initControl: function (k) {
          var v = this.getData(this.data, k);
          this.setOptions(this.data, k, v);
        },
        // jQuery.my common method for binding control
        bindControl: function (d, k, v, callback) {
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
          store.set('examples-' + this.type, chartStore);
          // Now, if the options is the default, lets remove it from display
          if (this.selectedOptions[k] === d[k].def) {
            delete this.selectedOptions[k];
          }
          // Update the settings display textarea
          this.ui['[name=' + k + ']'].chartInit(v, this);
          this.my.recalc('[name=settings]');
        },

        loadData: function (file) {
          if (!file) {
            return;
          }

          var promise = $.ajax({ // Load data, $.ajax is promise
                  url: 'data/' + file + '.json',
                  cache: false,
                  dataType: 'json',
                  context: this,
                  async: true
                })
                .then(function (json) { // Loaded, then
                  if (!json) {
                    return;
                  }

                  // TODO: redo this data translation mess
                  if (this.type === 'treemap') {
                    chartData = json;
                    this.colorLength = 0;
                  } else {

                    chartData = json.data ? json : translateDataToD3(json, this.type);

                    this.colorLength = chartData.data.length;

                    if (Data.color.val === 'graduated') {
                      this.Chart
                        .colorData('graduated', {c1: this.gradientStart, c2: this.gradientStop, l: this.colorLength});
                    }

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
                    } else if (this.type === 'bubble' && !json.data) {
                      var salesStageMap = {
                              'Negotiation/Review': 'Negotiat./Review',
                              'Perception Analysis': 'Percept. Analysis',
                              'Proposal/Price Quote': 'Proposal/Quote',
                              'Id. Decision Makers': 'Id. Deciders'
                            };
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
                    } else if (this.type === 'pareto') {
                      this.Chart.stacked(chartData.properties.stacked || false);
                    }
                  }

                  $chart.attr('class', 'sc-chart sc-chart-' + this.type);
                  $chart.find('svg').remove();
                  $chart.append('<svg/>');

                  // Bind D3 chart to SVG element
                  d3.select('#chart svg').datum(chartData).call(this.Chart);

                  // Dismiss tooltips
                  d3.select('#chart').on('click', this.Chart.dispatch.chartClick);

                  $(window).on('resize.examples', this.windowResizer(this.Chart, this.resetChartSize));
                  $chart.on('resize.examples', this.chartResizer(this.Chart));

                });

          return promise;
        },

        // Bindings
        ui: {}
      };

  var baseUI = {
        '[name=file]': {
          init: function ($o) {
            this.initControl($o.attr('name'));
          },
          bind: function (d, v, $o) {
            return this.bindControl(d, $o.attr('name'), v, this.loadData);
          },
          chartInit: $.noop,
          check: /[a-z0-9_]+/i,
          // fire on initial load
          // events: 'change.my'
          title: 'Data File',
          type: 'select'
        },
        '[name=color]': {
          init: function ($o) {
            this.initControl($o.attr('name'));
          },
          bind: function (d, v, $o) {
            return this.bindControl(d, $o.attr('name'), v, this.chartRenderer());
          },
          chartInit: function (v, self) {
            if (v === 'graduated') {
              self.Chart.colorData(v, {c1: self.gradientStart, c2: self.gradientStop, l: self.colorLength});
            } else {
              self.Chart.colorData(v);
            }
          },
          check: /default|class|graduated/i,
          events: 'change.my',
          title: 'Color Model',
          type: 'radio',
          values: [
            {value: 'default', label: 'Default'},
            {value: 'class', label: 'Class'},
            {value: 'graduated', label: 'Graduated'}
           ]
        },
        '[name=direction]': {
          init: function ($o) {
            this.initControl($o.attr('name'));
          },
          bind: function (d, v, $o) {
            return this.bindControl(d, $o.attr('name'), v, this.chartRenderer());
          },
          chartInit: function (v, self) {
            $('html').css('direction', v);
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

  function loadChart(type) {
    if (!type) {
      return;
    }
    // return promise;
    $.ajax({
      url: 'manifest/' + type + '.json',
      cache: false,
      dataType: 'text',
      context: this,
      async: true
    })
    .success(function (json) {
      if (!json) {
        return;
      }
      var options = {};

      // Load manifest for chart type
      var chartManifest = $.my.fromjson(json);

      // Append settings textarea to end of chart options ui
      Object.merge(
        chartManifest.ui,
        {'[name=settings]': {
            bind: function (d, v, $o) {
              $o.html(JSON.stringify(this.selectedOptions, null, '  '));
              if (!v) return $o.html();
            },
            events: 'blur.my',
            title: 'Chart Option Settings',
            type: 'textarea',
            values: [
              {value: ''}
            ]
          }
        }
      );

      // Reset manifest UI Object as
      Manifest.ui = Object.clone(baseUI, true);

      // Combine common and custom Manifest UIs
      Object.merge(Manifest, chartManifest, true);

      // Data containers persisted in localStorage
      store.set('examples-type', type);
      // Set Application scope variables
      chartType = type;
      chartStore = store.get('examples-' + type) || {};
      chartData = chartStore.chartData || {};
      // Build Data from stored selected values with chart type overrides
      options = chartStore.chartOptions || chartManifest.optionPresets;
      // Data will contain default value an
      $.each(chartManifest.optionDefaults, function (k) {
        Data[k] = {};
        Data[k].def = this;
        Data[k].val = window.uQuery(k) || options[k];
      });
      // TODO: is there a way to reinit jQuery.my with new Data?
      // I get an bind error if I try to do it, so I have to
      // Delete and recreate the entire form
      $container.find('.sc-options').remove();
      $container.append('<div class="sc-options" id="form"/>');
      // Reset application scope reference to form
      $form = $('#form');

      // Instantiate jQuery.my
      $form.my(Manifest, Data);

      $picker.find('.chart-icon')
        .removeClass('active')
        .filter('[data-type=' + type + ']')
        .addClass('active');
    });
  }

  // Configure jQuery resizable plugin
  $chart.resizable({
    containment: 'parent',
    minHeight: 200,
    minWidth: 200
  });

  chartType = window.uQuery('type') || store.get('examples-type') || 'multibar';
  $picker.click(function (e) {
    var type = $(e.target).data('type');
    if (type !== chartType) {
      loadChart(type);
    }
  });

  loadChart(chartType);
});
