
// jQuery.my manifest
var Manifest =
{
  // For jQuery.my cache (will be reset my chart type manifest)
  id: 'sucrose-demo',

  // (will also be reset by chart type manifest)
  type: 'multibar',

  // D3 chart
  Chart: null,
  // D3 table
  Table: null,

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
    this.Table = sucroseCharts('table');

    // Set default direction
    $('html').css('direction', this.selectedOptions.direction);

    $title.text(($demo.width < 480 ? '' : 'Sucrose ') + this.title);

    this.toggleTab(true);

    Object.each(options, function (k, v) {
      if (v.val && v.val !== v.def) {
        self.selectedOptions[k] = v.val;
      }
    });

    Object.each(this.ui, function (k, v) {
      $form.append(self.createOptionRow(k, v));
    });

    // Unbind UI
    $('button').off('click.example touch.example');
    // Rebind UI
    $('button[data-action=full]').on('click.example touch.example', $.proxy(function (e) {
      $example.toggleClass('full-screen');
      this.toggleTooltip($(this));
      this.chartResizer(this.Chart)(e);
    }, this));
    $('button[data-action=reset]').on('click.example touch.example', $.proxy(function (e) {
      $example.removeClass('full-screen');
      this.resetChartSize();
      this.loadData(this.data.file.val);
    }, this));
    // Toggle option panel display
    $('button[data-action=toggle]').on('click.example touch.example', $.proxy(function (e) {
      if ($demo.width() > 480) {
        $options.toggleClass('hidden');
        $example.toggleClass('full-width');
      } else {
        $options.toggleClass('open');
      }
      this.chartResizer(this.Chart)(e);
    }, this));
    $('button[data-action=download]').on('click.example touch.example', $.proxy(function (e) {
      generateImage(e);
    }, this));

    $('.tab').off('click.example touch.example');
    $('.tab').on('click.example touch.example', function (e) {
      e.stopPropagation();
      var isChartTab = $(this).data('toggle') === 'chart';
      self.toggleTab(isChartTab);
      if (isChartTab) {
        self.loadChart();
      } else {
        self.loadTable();
      }
    });
  },
  toggleTab: function (isChartTab) {
    $chart.toggleClass('hide', !isChartTab);
    $table.toggleClass('hide', isChartTab);
    $('[data-toggle=chart]').toggleClass('active', isChartTab);
    $('[data-toggle=table]').toggleClass('active', !isChartTab);
  },
  toggleTooltip: function ($o) {
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
        if ($chart.hasClass('hide')) {
          return;
        }
        chart.render();
      } :
      function (e) {
        e.stopPropagation();
        if ($chart.hasClass('hide')) {
          return;
        }
        chart.update();
      };
  },
  windowResizer: function (chart, resetter) {
    return chart.render ?
      (function (e) {
        resetter();
        if ($chart.hasClass('hide')) {
          return;
        }
        chart.render();
      }).debounce(50) :
      (function (e) {
        resetter();
        if ($chart.hasClass('hide')) {
          return;
        }
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
    switch (t) {
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
      radio += '<label><input type="radio" name="' + n + '" value="' + r.value + '"> ' +
        r.label + ' </label> ';
    })
    return radio;
  },
  checkboxControl: function (v, n) {
    var checkbox = '';
    v.each(function (r) {
      checkbox += '<label><input type="checkbox" name="' + n + '" value="' + r.value + '"> ' +
        r.label + ' </label> ';
    })
    return checkbox;
  },
  selectControl: function (v, n) {
    var select = '<select name="' + n + '">';
    v.each(function (r) {
      select += '<option value="' + r.value + '">' +
        r.label + '</option>';
    });
    select += '</select>';
    return select;
  },
  textareaControl: function (v, n) {
    var value = v.map(function (o) { return o.value; }).join(' '),
        textarea = '<textarea name="' + n + '">' +
          value + '</textarea>';
    return textarea;
  },
  textControl: function (v, n) {
    var value = v.map(function (o) { return o.value; }).join(' '),
        text = '<input type="text" name="' + n + '" value="' +
          value + '">';
    return text;
  },
  buttonControl: function (v, n) {
    var button = '';
    v.each(function (b) {
        button += '<button type="button" name="' + n + '" data-control="' + b.value + '">' +
          b.label + '</button>';
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

    if (color && color === 'data') {
      options = {c1: this.gradientStart, c2: this.gradientStop};
    }

    if (gradient && gradient.filter('1').length && color !== 'class') {
      options.gradient = true;
      options.orientation = gradient.filter('horizontal').length ? 'horizontal' : 'vertical';
      options.position = gradient.filter('base').length ? 'base' : 'middle';
    }

    this.Chart.colorData(color, options);
  },
  loadChart: function () {
    this.unloadChart();
    if ($chart.hasClass('hide')) {
      return;
    }

    if (this.Chart.colorData) {
      this.updateColorModel();
    }

    // this.toggleTab(true);
    $chart.attr('class', 'sc-chart sc-chart-' + this.type + ($chart.hasClass('hide') ? ' hide' : ''));
    $chart.append('<svg/>');

    // Bind D3 chart to SVG element
    d3.select('#chart svg').datum(chartData).call(this.Chart);

    // Dismiss tooltips
    d3.select('#chart').on('click', this.Chart.dispatch.chartClick);

    // Rebind jQuery resizable plugin
    $chart.resizable({
      containment: 'parent',
      minHeight: 200,
      minWidth: 200
    });

    $(window).on('resize.example', this.windowResizer(this.Chart, this.resetChartSize));
    $chart.on('resize.example', this.chartResizer(this.Chart));
  },
  unloadChart: function () {
    $(window).off('resize.example');
    $chart.off('resize.example');

    $chart.find('svg').remove();
  },
  updateChartDataCell: function (d, k, v) {
    var series = chartData.data[d.series],
        i = d.x - 1;
    series.values[i][k] = v;
    if (series._values) {
      series._values[i][k] = v;
    }
    this.loadChart();
    this.loadTable();
  },
  updateChartDataSeries: function (d, k, v) {
    var series = chartData.data.find({key: d.key});
    series[k] = v;
    this.loadChart();
    this.loadTable();
  },
  loadTable: function () {
    this.unloadTable();

    $table.attr('class', 'sc-table sc-table-' + this.type + ($table.hasClass('hide') ? ' hide' : ''));

    tableData = transformTableData(chartData, this.type, this.Chart);
    // Object.watch(tableData, 'data', function() {
    //   console.log('property changed!');
    // });

    // Bind D3 table to TABLE element
    d3.select('#table').datum(tableData).call(this.Table);

    // Dismiss editor
    d3.select('#table').on('click', this.Chart.dispatch.tableClick);

    // Enable editing of data table
    $table.find('table').editableTableWidget();

    // Listen for changes to data table cell values
    $table.find('td.sc-val').on('change.editable', $.proxy(function(evt, v) {
      var data = evt.currentTarget.__data__;
      this.updateChartDataCell(data, 'y', (isNaN(v) ? v : parseFloat(v)));
    }, this));
    // Listen for changes to data table series keys
    $table.find('td.sc-key').on('change.editable', $.proxy(function(evt, v) {
      var data = evt.currentTarget.__data__;
      this.updateChartDataSeries(data, 'key', v);
    }, this));
    // Listen for changes to data table series disabled state
    $table.find('td.sc-state').on('change.editable', $.proxy(function(evt, v) {
      var data = evt.currentTarget.__data__;
      this.updateChartDataSeries(data, 'disabled', !evt.target.checked);
    }, this));
  },
  unloadTable: function () {
    $table.find('td').off('change.editable');
    $table.find('table').remove();
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

            if (this.type === 'treemap' || this.type === 'tree' || this.type === 'globe') {
              chartData = json;
              this.colorLength = 0;
            } else {
              if (json.data) {
                chartData = json;
              } else {
                chartData = transformDataToD3(json, this.type);
              }
              this.colorLength = chartData.properties.colorLength || chartData.data.length;
              postProcessData(chartData, this.type, this.Chart);
            }

            this.loadChart();
            this.loadTable();
          });

    return promise;
  }
};
