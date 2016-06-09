var chartManifest = {
  id: 'sucrose-line',
  type: 'line',
  title: 'Line Chart',
  // Use these option presets to set the form input values
  // These chart options will be set
  optionPresets: {
    file: 'line_data',
    show_labels: '1'
  },
  yAxisLabel: 'Y-axis label',
  xAxisLabel: 'X-axis label',
  // These options should match the names of all form input names
  // Set them to the default value as expected by sucrose
  // If the option remains the default value, the chart option will not be set
  optionDefaults: {
    show_labels: '0',
    mirror_axis: 'lab',
    tick_display: ['wrap', 'stagger', 'rotate']
  },
  ui: {
    '[name=mirror_axis]': {
      bind: function (d, v, $o) {
        return this.bindControl(d, v, $o, this.chartUpdater());
      },
      setChartOption: function (v, self) {
        self.Chart.yAxis
          .orient(v === 'lab' ? 'left' : 'right');
        self.Chart.xAxis
          .orient(v === 'lab' ? 'bottom' : 'top');
      },
      check: /0|1/i,
      events: 'change.my',
      title: 'Mirror Axes',
      type: 'radio',
      values: [
        {value: 'lab', label: 'Left/Bottom'},
        {value: 'rat', label: 'Right/Top'}
      ]
    },
    '[name=show_labels]': {
      setChartOption: function (v, self) {
        var value = !!parseInt(v, 10);
        self.Chart.xAxis.axisLabel(value ? self.xAxisLabel : null);
        self.Chart.yAxis.axisLabel(value ? self.yAxisLabel : null);
      },
      check: /0|1/i,
      events: 'change.my',
      title: 'Show Axes Labels',
      type: 'radio'
    },
    '[name=tick_display]': {
      setChartOption: function (v, self) {
        var wrapTicks = $.inArray('wrap', v) !== -1,
            staggerTicks = $.inArray('stagger', v) !== -1,
            rotateTicks = $.inArray('rotate', v) !== -1;
        self.Chart
          .wrapTicks(wrapTicks)
          .staggerTicks(staggerTicks)
          .rotateTicks(rotateTicks);
      },
      check: /wrap|stagger|rotate/i,
      events: 'change.my',
      title: 'Tick Display Methods',
      type: 'checkbox',
      values: [
        {value: 'wrap', label: 'Wrap'},
        {value: 'stagger', label: 'Stagger'},
        {value: 'rotate', label: 'Rotate'}
      ]
    }
  }
};
var cachedManifest = $.my.tojson(chartManifest);
console.log(cachedManifest);
