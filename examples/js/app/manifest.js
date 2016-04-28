
// jQuery.my manifest
var Manifest =
{
  // Expose this self to all functions
  self: null,

  // For jQuery.my cache (will be reset my chart type manifest)
  id: 'sucrose-demo',

  // (will also be reset by chart type manifest)
  type: 'multibar',
  // ok, what's the deal here?
  locale: 'en',

  // D3 chart
  Chart: null,
  // D3 table
  Table: null,
  // CodeMirror
  Editor: null,

  lintErrors: [],

  // Default data
  selectedOptions: {},

  // Chart method variables available to chart on render
  colorLength: 0,
  gradientStart: '#e8e2ca',
  gradientStop: '#3e6c0a',

  // The default values for the BaseUI manifest
  optionDefaults: {
    file: '',
    color: 'default',
    gradient: ['0', 'vertical', 'middle'],
    direction: 'ltr',
    locale: 'en'
  },

  // UI elements
  ui: {},


  /* ------------------------
   * INIT functions --------- */

  init: function ($node, runtime) {
    self = this;

    // For each manifest data element, update selected options with preset value
    Object.each(Object.clone(this.data), function (k, v) {
      if (v.val && v.val !== v.def) {
        self.selectedOptions[k] = v.val;
      }
    });

    // Set manifest D3 visualization objects
    this.Chart = sucroseCharts(this.type, localeData[this.selectedOptions.locale]);
    this.Table = sucroseTable(this.Chart);

    if (!['bar', 'line', 'area', 'pie', 'funnel', 'gauge'].find(this.type)) {
      this.Table.strings({noData: 'This chart type does not support table data.'})
    }

    // Set default direction for RTL/LTR
    $('html').css('direction', this.selectedOptions.direction);

    // Conserve space by not prepending to title
    $title.text(($demo.width < 480 ? '' : 'Sucrose ') + this.title);

    // Show chart tab
    this.toggleTab('chart');

    // Insert new manifest form UI row
    Object.each(this.ui, function (k, v) {
      $form.append(self.createOptionRow(k, v));
    });

    // Unbind UI
    $('button')
      .off('click.example touchstart.example touchend.example')
      .toggleClass('active', false);
    $('.tab').off('click.example touchstart.example touchend.example');
    // Rebind UI
    $('button').on('touchstart.example', touchstart);
    // Display panel in full screen
    $('button[data-action=full]')
      .on('click.example touchend.example', function (evt) {
        var $button = $(this);
        evt.stopPropagation();
        $example.toggleClass('full-screen');
        self.toggleTooltip($button);
        self.chartResizer(self.Chart)(evt);
        $button.toggleClass('active');
      });
    // Reset data to original state
    $('button[data-action=reset]')
      .on('click.example touchend.example', function (evt) {
        evt.stopPropagation();
        $example.removeClass('full-screen');
        $('button[data-action=edit]').removeClass('active');
        self.resetChartSize();
        self.loadData(self.data.file.val);
      });
    // Toggle option panel display
    $('button[data-action=toggle]')
      .on('click.example touchend.example', function (evt) {
        evt.stopPropagation();
        if ($demo.width() > 480) {
          $options.toggleClass('hidden');
          $example.toggleClass('full-width');
        } else {
          $options.toggleClass('open');
        }
        self.chartResizer(self.Chart)(evt);
      });
    // Download image or data depending on panel
    $('button[data-action=download]')
      .on('click.example touchend.example', function (evt) {
        evt.stopPropagation();
        if ($chart.hasClass('hide')) {
          generateJson(evt);
        } else {
          generateImage(evt);
        }
      });
    // Toggle display of table or code data edit view
    $('button[data-action=edit]')
      .on('click.example touchend.example', function (evt) {
        var $button = $(this);
        evt.stopPropagation();
        if ($button.hasClass('active')) {
          if (!self.lintErrors.length) {
            self.parseRawData(JSON.parse(self.Editor.doc.getValue()));
          }
          self.unloadDataEditor();
          self.loadTable();
          $table.find('table').show();
          $button.removeClass('active');
        } else {
          self.unloadTable();
          self.loadDataEditor();
          $table.find('table').hide();
          $button.addClass('active');
        }
      });
    // Toggle display of chart or table tab
    $('.tab')
      .on('touchstart.example', touchstart)
      .on('click.example touchend.example', function (evt) {
        evt.stopPropagation();
        evt.preventDefault();
        if ($(this).data('toggle') === 'chart') {
          self.unloadDataEditor();
          self.unloadTable();
          $('button[data-action=edit]').removeClass('active');
          self.loadChart();
        } else {
          self.unloadChart();
          self.unloadDataEditor();
          self.loadTable();
        }
      });
  },
  toggleTab: function (tab) {
    var isChartTab = tab === 'chart';
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

  /* ------------------------
   * RESIZE functions ------- */

  resetChartSize: function () {
    $chart.removeAttr('style');
  },
  // Define resizable handler
  chartResizer: function (chart) {
    // TODO: why can't I debounce?
    return chart.render ?
      function (evt) {
        evt.stopPropagation();
        if ($chart.hasClass('hide')) {
          return;
        }
        chart.render();
      } :
      function (evt) {
        evt.stopPropagation();
        if ($chart.hasClass('hide')) {
          return;
        }
        chart.update();
      };
  },
  windowResizer: function (chart, resetter) {
    return chart.render ?
      (function (evt) {
        resetter();
        if ($chart.hasClass('hide')) {
          return;
        }
        chart.render();
      }).debounce(50) :
      (function (evt) {
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

  /* ------------------------
   * FORM functions --------- */

  // Create option form row
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
      radio += '<label><input type="radio" name="' + n + '" value="' + r.value + '">' +
        '<span class="sfa">' + r.label + '</span></label> ';
    });
    return radio;
  },
  checkboxControl: function (v, n) {
    var checkbox = '';
    v.each(function (r) {
      checkbox += '<label><input type="checkbox" name="' + n + '" value="' + r.value + '">' +
        '<span class="sfa">' + r.label + '</span></label> ';
    });
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
    // Update the my scope data
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
    chartStore.optionPresets = Object.clone(this.selectedOptions);
    store.set('example-' + this.type, chartStore);

    // Now, if the options is the default, lets remove it from display
    if (this.selectedOptions[k] === d[k].def) {
      delete this.selectedOptions[k];
    }

    // Update the settings display textarea
    this.ui['[name=' + k + ']'].setChartOption(v, this);
    this.my.recalc('[name=settings]');
  },
  getLocaleOptions: function () {
    var locales = [];
    Object.each(localeData, function (k, v) {
      locales.push({value: k, label: v.language});
    });
    return locales;
  },

  /* ------------------------
   * CHART functions -------- */

  loadChart: function () {
    this.unloadChart();
    this.toggleTab('chart');

    chartData = Object.clone(rawData, true);

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

    // Rebind window resizer
    $(window).on('resize.example', this.windowResizer(this.Chart, this.resetChartSize));
    $chart.on('resize.example', this.chartResizer(this.Chart));
  },
  unloadChart: function () {
    $(window).off('resize.example');
    $chart.off('resize.example');
    $chart.find('svg').remove();
  },
  updateChartDataCell: function (d, i, k, v) {
    var series = rawData.data[d.series];
    if (series.hasOwnProperty('value')) {
      series.value = v;
    } else {
      series.values[i][k] = v;
    }
    if (series._values) {
      if (series.hasOwnProperty('value')) {
        series._value = v;
      } else {
        series._values[i][k] = v;
      }
    }
  },
  updateChartDataSeries: function (d, k, v) {
    var series = rawData.data.find({key: d.key});
    series[k] = v;
  },
  updateColorModel: function (v) {
    var options = {},
        color = this.data.color.val,
        gradient = this.data.gradient.val;

    if (!this.Chart.colorData) {
      return;
    }

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

  /* ------------------------
   * DATA EDITOR functions -- */

  loadDataEditor: function () {
    $('button[data-action=edit]').addClass('active');
    this.unloadDataEditor();
    this.Editor = CodeMirror(document.getElementById('table'), {
      value: JSON.stringify(rawData, null, '  '),
      mode:  'application/json',
      lint: {
        getAnnotations: CodeMirror.jsonValidator,
        onUpdateLinting: function (annotationsNotSorted, annotations, cm) {
          // if (!annotationsNotSorted.length) {
          //   self.parseRawData(cm.doc.getValue());
          // }
          self.lintErrors = annotationsNotSorted;
        }
      },
      tabSize: 2,
      lineNumbers: true,
      foldGutter: true,
      gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter', 'CodeMirror-lint-markers']
    });
    // this.Editor.doc.on('change', function () {
    //   console.log(cm.state.lint.marked)
    //   // chartData = JSON.parse(cm.doc.getValue());
    //   // self.refreshTable();
    // });
    this.Editor.focus();
  },
  unloadDataEditor: function () {
    $table.find('.CodeMirror').remove();
    this.Editor = null;
  },

  /* ------------------------
   * TABLE EDITOR functions - */

  loadTable: function () {
    // this.unloadDataEditor();
    this.unloadTable();

    this.toggleTab('table');

    $table.attr('class', 'sc-table sc-table-' + this.type + ($table.hasClass('hide') ? ' hide' : ''));

    chartData = Object.clone(rawData, true);

    tableData = transformTableData(chartData, this.type, this.Chart);

    // Object.watch(tableData, 'data', function () {
    //   console.log('property changed!');
    // });

    // Bind D3 table to TABLE element
    d3.select('#table').datum(tableData).call(this.Table);

    // Dismiss editor
    d3.select('#table').on('click', this.Chart.dispatch.tableClick);

    // Enable editing of data table
    $table.find('table').editableTableWidget();

    // Listen for changes to data table cell values
    $table.find('td.sc-val').on('change.editable', function (evt, val) {
      var d = evt.currentTarget.__data__,
          i = d.index,
          k = d.hasOwnProperty('y') ? 'y' : 1,
          v = isNaN(val) ? val : parseFloat(val);
      self.updateChartDataCell(d, i, k, v);
    });
    // Listen for changes to data table series keys
    $table.find('td.sc-key').on('change.editable', function (evt, val) {
      self.updateChartDataSeries(this.__data__, 'key', val);
    });
    // Listen for changes to data table series disabled state
    $table.find('td.sc-state').on('change.editable', function (evt) {
      var v = !evt.target.checked;
      self.updateChartDataSeries(this.__data__, 'disabled', v);
    });
    $table.find('td').on('validate', function (evt, value) {
      var cell = $(this),
          column = cell.index();
      if (column === 1) {
        return !!value && value.trim().length > 0;
      } else {
        return !isNaN(parseFloat(value)) && isFinite(value);
      }
    });
  },
  unloadTable: function () {
    $table.find('td').off('change.editable');
    $table.find('table').remove();
  },

  /* ------------------------
   * LOAD DATA functions ---- */

  parseRawData: function (json) {
    rawData = json;
    if (this.type === 'treemap' || this.type === 'tree' || this.type === 'globe') {
      this.colorLength = 0;
    } else {
      // raw data from Report API
      if (!json.data) {
        rawData = transformDataToD3(json, this.type);
      }
      this.colorLength = rawData.properties.colorLength || rawData.data.length;
      postProcessData(rawData, this.type, this.Chart);
    }
  },

  loadData: function (file) {
    if (!file) {
      return;
    }

    $.ajax({ // Load data, $.ajax is promise
        url: 'data/' + file + '.json',
        cache: true,
        dataType: 'json',
        context: this,
        async: true
      })
      .done(function (json) { // Loaded, then
        if (!json) {
          return;
        }
        this.parseRawData(json);
        this.updateColorModel();
        this.loadChart();
      });
    // fs.root.getDirectory('data', {}, function (dirEntry){
    //   var dirReader = dirEntry.createReader();
    //   dirReader.readEntries(function (entries) {
    //     for(var i = 0; i < entries.length; i++) {
    //       var entry = entries[i];
    //       if (entry.isDirectory){
    //         console.log('Directory: ' + entry.fullPath);
    //       }
    //       else if (entry.isFile){
    //         console.log('File: ' + entry.fullPath);
    //       }
    //     }

    //   }, errorHandler);
    // }, errorHandler);
    // if (!file) {
    //   return;
    // }
  },

  loadColor: function (color) {
    this.updateColorModel(color);
    this.chartUpdater()();
  },

  loadLocale: function (locale) {
    this.locale = locale;

    this.Chart.locality(localeData[locale]);
    this.chartUpdater()();
  }
};
