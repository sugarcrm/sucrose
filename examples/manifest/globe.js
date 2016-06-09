var chartManifest = {
  id: 'sucrose-globe',
  type: 'globe',
  title: 'Globe Chart',
  // Use these option presets to set the form input values
  // These chart options will be set
  optionPresets: {
    file: 'globe_data'
  },
  // These options should match the names of all form input names
  // Set them to the default value as expected by sucrose
  // If the option remains the default value, the chart option will not be set
  optionDefaults: {
    auto_spin: 0
  },
  ui: {
    '[name=color_data]': {
      bind: function (d, v, $o) {
        return this.bindControl(d, v, $o, function () {
          var color = self.getData(self.data, 'color_data'),
              options = self.getColorOptions();
          self.Chart.colorData(color, options);
          self.loadChart();
        })
      },
      check: /default|class|graduated|data/i,
      events: 'click.my',
      title: 'Color Model',
      type: 'radio',
      watch: '',
      values: [
        {value: 'default', label: 'Default'},
        {value: 'class', label: 'Class'},
        {value: 'graduated', label: 'Graduated'},
        {value: 'data', label: 'Data driven'}
      ]
    },
    '[name=gradient]': {
      bind: $.noop,
      setChartOption: $.noop,
      hidden: true
    },
    '[name=auto_spin]': {
      setChartOption: function (v, self) {
        var autoSpin = $.inArray('1', v) !== -1;
        self.Chart
          .autoSpin(autoSpin);
      },
      check: /1/i,
      events: 'change.my',
      title: 'Auto Spin',
      type: 'checkbox',
      values: [
        {value: '1', label: 'Enable'}
      ]
    },
    '[name=direction]': {
      hidden: true
    }
  }
};
var cachedManifest = $.my.tojson(chartManifest);
console.log(cachedManifest);
