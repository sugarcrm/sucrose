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
    '[name=show_values]': {
      setChartOption: function (v, self) {
        var value = isNaN(v) ? v : !!parseInt(v, 10);
        self.Chart.showLabels(value);
      },
      check: /0|1/i,
      events: 'change.my',
      title: 'Show Values',
      type: 'radio'
    },
    '[name=show_pointer]': {
      bind: function (d, v, $o) {
        return this.bindControl(d, v, $o, this.chartUpdater());
      },
      setChartOption: function (v, self) {
        var value = !!parseInt(v, 10);
        self.Chart.showPointer(value);
      },
      check: /0|1/i,
      events: 'change.my',
      title: 'Show Pointer',
      type: 'radio'
    }
  }
};
var cachedManifest = $.my.tojson(chartManifest);
console.log(cachedManifest);
