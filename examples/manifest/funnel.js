module.exports =
{
  id: 'sucrose-funnel',
  type: 'funnel',
  title: 'Funnel Chart',
  // Use these option presets to set the form input values
  // These chart options will be set
  optionPresets: {
    file: 'funnel_data'
  },
  // These options should match the names of all form input names
  // Set them to the default value as expected by sucrose
  // If the option remains the default value, the chart option will not be set
  optionDefaults: {
    wrap_labels: '1'
  },
  ui: {
    '[name=wrap_labels]': {
      setChartOption: function (v, self) {
        var value = !!parseInt(v, 10);
        self.Chart.wrapLabels(value);
      },
      check: /0|1/i,
      events: 'change.my',
      title: 'Wrap Labels',
      type: 'radio'
    }
  }
};
