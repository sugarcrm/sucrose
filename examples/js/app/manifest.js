
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
  dataEditor: null,
  configEditor: null,
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
    this.Chart = sucroseCharts(this.type, this.getLocaleData(this.selectedOptions.locale));
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
        $demo.toggleClass('full-screen');
        // $('button[data-action=full]').removeClass('active');
        $('button[data-action=full]').toggleClass('active', $demo.hasClass('full-screen'));
        self.toggleTooltip($button);
        self.chartResizer(self.Chart)(evt);
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
    // $('button[data-action=toggle]')
    //   .on('click.example touchend.example', function (evt) {
    //     evt.stopPropagation();
    //     if ($demo.width() > 480) {
    //       $options.toggleClass('hidden');
    //       $example.toggleClass('full-width');
    //     } else {
    //       $options.toggleClass('open');
    //     }
    //     self.chartResizer(self.Chart)(evt);
    //   });
    // Download image or data depending on panel
    $('button[data-action=download]')
      .on('click.example touchend.example', function (evt) {
        var dataType = $(this).data('type');
        evt.stopPropagation();
        switch (dataType) {
          case 'package':
            generatePackage(evt);
            break;
          case 'data':
            generateData(evt);
            break;
          case 'config':
            generateConfig(evt);
            break;
          case 'image':
            generateImage(evt);
            break;
        }
      });
    // Toggle display of table or code data edit view
    $('button[data-action=edit]')
      .on('click.example touchend.example', function (evt) {
        var $button = $(this);
        evt.stopPropagation();

        switch ($button.data('type')) {
          case 'data':
            if ($button.hasClass('active')) {
              if (!self.lintErrors.length) {
                self.parseRawData(JSON.parse(self.dataEditor.doc.getValue()));
              }
              self.unloadDataEditor('data');
              self.loadTable();
              $table.show();
              $button.removeClass('active');
            } else {
              self.unloadTable();
              self.loadDataEditor('data', Data);
              $table.hide();
              $button.addClass('active');
            }
            break;
          case 'config':
            if ($button.hasClass('active')) {
              if (!self.lintErrors.length) {
                self.setConfig(JSON.parse(self.configEditor.doc.getValue()));
              }
              self.unloadDataEditor('config');
              self.loadForm();
              $button.removeClass('active');
            } else {
              self.unloadForm();
              self.loadDataEditor('config', self.selectedOptions);
              $button.addClass('active');
            }
            break;
        }
      });
    // Toggle display of chart or table tab
    $('.tab')
      .on('touchstart.example', touchstart)
      .on('click.example touchend.example', function (evt) {
        evt.stopPropagation();
        evt.preventDefault();

        $('button[data-action=edit]').removeClass('active');

        switch ($(this).data('toggle')) {
          case 'chart':
            self.unloadDataEditor('data');
            self.unloadTable();
            self.loadChart();
            break;
          case 'table':
            self.unloadChart();
            self.unloadDataEditor('data');
            self.loadTable();
            break;
          case 'options':
            self.toggleTab('options');
            self.unloadDataEditor('config');
            self.chartResizer(self.Chart)(evt);
            break;
        }
      });
  },

  loadForm: function () {
    // TODO: is there a way to reinit jQuery.my with new Config data?
    // I get an bind error if I try to do it, so I have to
    // Delete and recreate the entire form
    $form.remove();
    $('#form_').append('<form class="sucrose"/>');
    // Reset application scope reference to form
    $form = $('#form_ form');
    // Instantiate jQuery.my
    $form.my(Manifest, Config);
  },
  unloadForm: function () {
    $form.hide();
  },

  toggleTab: function (tab) {
    switch (tab) {
      case 'chart':
        $('[data-toggle=chart]').addClass('active');
        $('[data-toggle=table]').removeClass('active');
        $chart.removeClass('hide');
        $('#table_').addClass('hide');
        break;
      case 'table':
        $('[data-toggle=table]').addClass('active');
        $('[data-toggle=chart]').removeClass('active');
        $('#table_').removeClass('hide');
        $chart.addClass('hide');
        break;
      case 'options':
        $('[data-toggle=options]').toggleClass('active');
        $example.toggleClass('full-width');
        $options.toggleClass('open');
        break;
    }
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
    row.append($('<span class="title">' + v.title + '</span>'));
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
    this.setOption(this.data, k, v);
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
    this.setOption(d, k, v);
    // Usually chartRender or chartUpdate
    callback(v, this);
  },
  setOption: function (d, k, v) {
    // First, lets update and store the option
    // in case it overrides a form preset value
    this.selectedOptions[k] = v;

    // Now, if the options is the default, lets remove it from display
    if (this.selectedOptions[k] === d[k].def) {
      delete this.selectedOptions[k];
    }

    chartStore.optionPresets = Object.clone(this.selectedOptions);
    store.set('example-' + this.type, chartStore);

    this.ui['[name=' + k + ']'].setChartOption(v, this);
  },
  setConfig: function (presets) {
    // Config will contain default value an
    Object.each(this.optionDefaults, function (prop, val) {
      Config[prop] = {};
      Config[prop].def = val;
      Config[prop].val = window.uQuery(prop) || presets[prop];
    });
  },
  getLocaleOptions: function () {
    return localeData.keys().map(function(k) {
        return {value: k, label: localeData[k].label};
      });
    // var locales = [];
    // Object.each(localeData, function (k, v) {
    //   locales.push({value: k, label: v.language});
    // });
    // return locales;
  },
  getLocaleData: function (lang) {
    return localeData[lang];
  },

  /* ------------------------
   * CHART functions -------- */

  loadChart: function () {
    this.unloadChart();
    this.toggleTab('chart');

    chartData = Object.clone(Data, true);

    // this.toggleTab(true);
    $chart.append('<svg/>');
    $chart.find('svg').attr('class', 'sucrose sc-chart sc-chart-' + this.type); // + ($chart.hasClass('hide') ? ' hide' : '')

    // Bind D3 chart to SVG element
    d3.select('#chart_ svg').datum(chartData).call(this.Chart);

    // Dismiss tooltips
    d3.select('#chart_').on('click', this.Chart.dispatch.chartClick);

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
    var series = Data.data[d.series];
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
    var series = Data.data.find({key: d.key});
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

  loadDataEditor: function (id, json) {
    this.unloadDataEditor(id);

    switch (id) {
      case 'data':
        this.dataEditor = this.createEditor(id, json);
        break;
      case 'config':
        this.configEditor = this.createEditor(id, json);
        break;
    }
  },
  unloadDataEditor: function (id) {
    switch (id) {
      case 'data':
        $data.find('.CodeMirror').remove();
        this.dataEditor = null;
        break;
      case 'config':
        $config.find('.CodeMirror').remove();
        this.configEditor = null;
        break;
    }
  },
  createEditor: function (id, json) {
    var editor = CodeMirror(document.getElementById(id + '_'), {
      value: JSON.stringify(json, null, '  '),
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
    editor.focus();
    return editor;
  },

  /* ------------------------
   * TABLE EDITOR functions - */

  loadTable: function () {
    // this.unloadDataEditor();
    this.unloadTable();

    this.toggleTab('table');

    chartData = Object.clone(Data, true);

    tableData = transformTableData(chartData, this.type, this.Chart);

    // Object.watch(tableData, 'data', function () {
    //   console.log('property changed!');
    // });

    // Bind D3 table to TABLE element
    d3.select('#table_').datum(tableData).call(this.Table);

    // Dismiss editor
    d3.select('#table_').on('click', this.Chart.dispatch.tableClick);

    $table = $('#table_ table');

    $table.attr('class', 'sucrose sc-table sc-table-' + this.type);

    // Enable editing of data table
    $table.editableTableWidget();

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
    $table.remove();
  },

  /* ------------------------
   * LOAD DATA functions ---- */

  parseRawData: function (json) {
    Data = json;
    if (this.type === 'treemap' || this.type === 'tree' || this.type === 'globe') {
      this.colorLength = 0;
    } else {
      // raw data from Report API
      if (!json.data) {
        Data = transformDataToD3(json, this.type);
      }
      this.colorLength = Data.properties.colorLength || Data.data.length;
      postProcessData(Data, this.type, this.Chart);
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
    // window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
    // window.requestFileSystem(type, size, successCallback, opt_errorCallback)
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

    this.Chart.locality(this.getLocaleData(locale));
    this.chartUpdater()();
  }
};
