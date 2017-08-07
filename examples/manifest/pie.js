module.exports =
{
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
    '[name=show_labels]': {
      setChartOption: function (v, self) { self.Chart.showLabels(isNaN(v) ? v : !!parseInt(v, 10)); },
      check: /0|1/i,
      events: 'change.my',
      title: 'Show Values',
      type: 'select'
    },
    '[name=donut]': {
      setChartOption: function (v, self) { self.Chart.donut(!!parseInt(v, 10)); },
      check: /0|1/i,
      events: 'change.my',
      title: 'Use donut',
      type: 'radio'
    },
    '[name=hole_label]': {
      setChartOption: function (v, self) { self.Chart.hole(!!parseInt(v, 10) ? 10 : false); },
      check: /0|1/i,
      events: 'change.my',
      title: 'Show hole label',
      type: 'radio'
    },
    '[name=donut_ratio]': {
      setChartOption: function (v, self) { self.Chart.donutRatio(parseFloat(v)); },
      check: /[0-9]+/i,
      events: 'change.my',
      title: 'Donut hole ratio',
      type: 'text'
    }
  }
};
