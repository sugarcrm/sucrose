
  chartManifest = {
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
      '[name=file]': {
        // Set data file options in Manifest control
        values: [
          {value: 'funnel_data', label: 'Opportunity Total by Sales Stage'},
          {value: 'funnel_data_opps', label: 'Opportunity Data'},
          {value: 'funnel_data_long', label: 'Long Label Lengths'},
          {value: 'funnel_data_uniform', label: 'Uniform Data and Labels'},
          {value: 'funnel_data_single', label: 'One Long Single Label'},
          {value: 'sugar_data_grouped', label: 'Test Grouped Data'}
        ]
      },
      '[name=wrap_labels]': {
        init: function ($o) {
          this.initControl($o);
        },
        bind: function (d, v, $o) {
          return this.bindControl(d, v, $o, this.chartRenderer());
        },
        setChartOption: function (v, self) {
          var value = !!parseInt(v, 10);
          self.Chart.wrapLabels(value);
        },
        check: /0|1/i,
        events: 'change.my',
        title: 'Wrap Labels',
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
