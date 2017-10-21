module.exports =
{
  id: 'sucrose-pareto',
  type: 'pareto',
  title: 'Pareto Chart',
  // Use these option presets to set the form input values
  // These chart options will be set
  optionPresets: {
    file: 'pareto_data_manager'
  },
  // These options should match the names of all form input names
  // Set them to the default value as expected by sucrose
  // If the option remains the default value, the chart option will not be set
  optionDefaults: {
    show_values: 'false'
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
    }
  }
};
