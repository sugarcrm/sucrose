module.exports =
{
  id: 'sucrose-multibar',
  type: 'multibar',
  title: 'Multibar Chart',
  // Use these option presets to set the form input values
  // These chart options will be set
  optionPresets: {
    file: 'multibar_data',
    show_labels: 'true'
  },
  yAxisLabel: 'Y-axis label',
  xAxisLabel: 'X-axis label',
  // These options should match the names of all form input names
  // Set them to the default value as expected by sucrose
  // If the option remains the default value,
  // the chart option will not be set and will not be in config
  optionDefaults: {
    show_labels: 'false',
    vertical: 'true',
    show_values: 'false',
    allow_scroll: 'true',
    tick_display: ['wrap', 'stagger', 'rotate']
  },
  ui: {
    '[name=show_values]': {
      setChartOption: function (v, self) {
        var value = sucrose.utility.toBoolean(v);
        self.Chart.showValues(value);
      },
      check: /false|true|start|middle|end|top|total/i,
      events: 'change.my',
      title: 'Show Values',
      type: 'select',
      values: [
        {value: 'false', label: 'No'},
        {value: 'true', label: 'Yes'},
        {value: 'start', label: 'Start'},
        {value: 'middle', label: 'Middle'},
        {value: 'end', label: 'End'},
        {value: 'top', label: 'Top'},
        {value: 'total', label: 'Total'}
      ]
    },
    '[name=vertical]': {
      setChartOption: function (v, self) {
        var value = sucrose.utility.toBoolean(v);
        self.Chart.vertical(value);
      },
      check: /true|false/i,
      events: 'change.my',
      title: 'Orientation',
      type: 'radio',
      values: [
        {value: 'true', label: 'Vertical'},
        {value: 'false', label: 'Horizontal'}
      ]
    },
    '[name=allow_scroll]': {
      setChartOption: function (v, self) {
        var value = sucrose.utility.toBoolean(v);
        self.Chart.allowScroll(value);
      },
      check: /true|false/i,
      events: 'change.my',
      title: 'Allow Scrolling',
      type: 'radio'
    },
    '[name=show_labels]': {
      setChartOption: function (v, self) {
        var value = sucrose.utility.toBoolean(v);
        self.Chart.xAxis.axisLabel(value ? self.xAxisLabel : null);
        self.Chart.yAxis.axisLabel(value ? self.yAxisLabel : null);
      },
      check: /false|true/i,
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
