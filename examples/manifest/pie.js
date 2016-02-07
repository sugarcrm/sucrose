
chartManifest = {
  id: 'sucrose-pie',
  type: 'pie',
  title: 'Pie Chart',
  optionPresets: {
    file: 'pie_data'
  },
  optionDefaults: {
    show_labels: '1',
    hole_label: '0',
    donut: '1',
    donut_ratio: '0.4'
  },
  ui: {
    '[name=file]': {
      values: [
        {value: 'pie_data', label: 'All Opportunities by Lead Source'},
        {value: 'pie_data_quarters', label: 'Test Quarter Labels'},
        {value: 'pie_data_null', label: 'Test Empty Data'},
        {value: 'sugar_data_grouped', label: 'Test Grouped Data'},
        {value: 'pie_data_single', label: 'Test Single Slice Data'}
      ]
    },
    '[name=show_labels]': {
      setChartOption: function (v, self) {
        var value = isNaN(v) ? v : !!parseInt(v, 10);
        self.Chart.showLabels(value);
      },
      check: /0|1/i,
      events: 'change.my',
      title: 'Show Values',
      type: 'select'
    },
    '[name=donut]': {
      setChartOption: function (v, self) {
        var value = !!parseInt(v, 10);
        self.Chart.donut(value);
      },
      check: /0|1/i,
      events: 'change.my',
      title: 'Use donut',
      type: 'radio'
    },
    '[name=hole_label]': {
      setChartOption: function (v, self) {
        var value = !!parseInt(v, 10) ? 10 : false;
        self.Chart.hole(value);
      },
      check: /0|1/i,
      events: 'change.my',
      title: 'Show hole label',
      type: 'radio'
    },
    '[name=donut_ratio]': {
      setChartOption: function (v, self) {
        var value = parseFloat(v);
        self.Chart.donutRatio(value);
      },
      check: /[0-9]+/i,
      events: 'change.my',
      title: 'Donut hole ratio',
      type: 'text'
    }
  }
};
// .donutLabelsOutside(true)
var cachedManifest = $.my.tojson(chartManifest);
console.log(cachedManifest);
