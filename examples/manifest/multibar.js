var chartManifest = {
  id: 'sucrose-multibar',
  type: 'multibar',
  title: 'Multibar Chart',
  // Use these option presets to set the form input values
  // These chart options will be set
  optionPresets: {
    file: 'multibar_data',
    show_labels: 1
  },
  yAxisLabel: 'Y-axis label',
  xAxisLabel: 'X-axis label',
  // These options should match the names of all form input names
  // Set them to the default value as expected by sucrose
  // If the option remains the default value, the chart option will not be set
  optionDefaults: {
    show_labels: 0,
    vertical: 1,
    show_values: 0,
    allow_scroll: 1,
    tick_display: ['wrap', 'stagger', 'rotate']
  },
  ui: {
    '[name=vertical]': {
      setChartOption: function (v, self) {
        var value = !!parseInt(v, 10);
        self.Chart.vertical(value);
      },
      check: /0|1/i,
      events: 'change.my',
      title: 'Orientation',
      type: 'radio',
      values: [
        {value: 1, label: 'Vertical'},
        {value: 0, label: 'Horizontal'}
      ]
    },
    '[name=show_values]': {
      setChartOption: function (v, self) {
        var value = isNaN(v) ? v : !!parseInt(v, 10);
        self.Chart.showValues(value);
      },
      check: /0|1|start|middle|end|top|total/i,
      events: 'change.my',
      title: 'Show Values',
      type: 'select',
      values: [
        {value: 0, label: 'No'},
        {value: 1, label: 'Yes'},
        {value: 'start', label: 'Start'},
        {value: 'middle', label: 'Middle'},
        {value: 'end', label: 'End'},
        {value: 'top', label: 'Top'},
        {value: 'total', label: 'Total'}
      ]
    },
    '[name=allow_scroll]': {
      setChartOption: function (v, self) {
        var value = !!parseInt(v, 10);
        self.Chart.allowScroll(value);
      },
      check: /0|1/i,
      events: 'change.my',
      title: 'Allow Scrolling',
      type: 'radio'
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
