
  var chartManifest = {
    id: 'sucrose-gauge',
    type: 'gauge',
    title: 'Gauge Chart',
    // Use these option presets to set the form input values
    // These chart options will be set
    optionPresets: {
      file: 'gauge_data'
    },
    // These options should match the names of all form input names
    // Set them to the default value as expected by sucrose
    // If the option remains the default value, the chart option will not be set
    optionDefaults: {
      show_values: '1',
      show_pointer: '1'
    },
    ui: {
      '[name=file]': {
        // Set data file options in Manifest control
        values: [
          {value: 'gauge_data', label: 'Closed Won Opportunities'}
        ]
      },
      '[name=show_values]': {
        init: function ($o) {
          this.initControl($o.attr('name'));
        },
        bind: function (d, v, $o) {
          return this.bindControl(d, $o.attr('name'), v, this.chartRenderer());
        },
        chartInit: function (v, self) {
          var value = isNaN(v) ? v : !!parseInt(v, 10);
          self.Chart.showLabels(value);
        },
        check: /0|1/i,
        events: 'change.my',
        title: 'Show Values',
        type: 'radio',
        values: [
          {value: '0', label: 'No'},
          {value: '1', label: 'Yes'}
        ]
      },
      '[name=show_pointer]': {
        init: function ($o) {
          this.initControl($o.attr('name'));
        },
        bind: function (d, v, $o) {
          return this.bindControl(d, $o.attr('name'), v, this.chartUpdater());
        },
        chartInit: function (v, self) {
          var value = !!parseInt(v, 10);
          self.Chart.showPointer(value);
          // d3.select('#chart svg')
          //     .datum(null)
          //     .call(chart);
          // d3.select('#chart svg')
          //     .datum(chartData)
          //     .call(chart);
        },
        check: /0|1/i,
        events: 'change.my',
        title: 'Show Pointer',
        type: 'radio',
        values: [
          {value: '0', label: 'No'},
          {value: '1', label: 'Yes'}
        ]
      }
    }
  };
  var cachedManifest = $.my.tojson(chartManifest);
  console.log(cachedManifest);
