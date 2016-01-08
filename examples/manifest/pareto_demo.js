
  var chartManifest = {
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
      show_values: '0'
    },
    ui: {
      '[name=file]': {
        // Set data file options in Manifest control
        values: [
          {value: 'pareto_data_salesrep_probability', label: 'Sales Rep Worksheet by Probability'},
          {value: 'pareto_data_salesrep_stage', label: 'Sales Rep Worksheet by Sales Stage'},
          {value: 'pareto_data_salesrep', label: 'Sales Rep Worksheet'},
          {value: 'pareto_data_manager', label: 'Manager Worksheet'}
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
          self.Chart.showValues(value);
        },
        check: /0|1|start|middle|end|top|total/i,
        events: 'change.my',
        title: 'Show Values',
        type: 'select',
        values: [
          {value: '0', label: 'No'},
          {value: '1', label: 'Yes'},
          {value: 'start', label: 'Start'},
          {value: 'middle', label: 'Middle'},
          {value: 'end', label: 'End'},
          {value: 'top', label: 'Top'},
          {value: 'total', label: 'Total'}
        ]
      }
    }
  };
  var cachedManifest = $.my.tojson(chartManifest);
  console.log(cachedManifest);
