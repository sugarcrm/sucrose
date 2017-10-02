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
    wrap_labels: 'true'
  },
  ui: {
    '[name=wrap_labels]': {
      setChartOption: function (v, self) {
        var value = sucrose.utility.toBoolean(v);
        self.Chart.wrapLabels(value);
      },
      check: /false|true/i,
      events: 'change.my',
      title: 'Wrap Labels',
      type: 'radio'
    }
  }
};
