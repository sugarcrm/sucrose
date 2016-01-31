
var baseUI =
{
  '[name=file]': {
    bind: function (d, v, $o) {
      return this.bindControl(d, v, $o, this.loadData);
    },
    setChartOption: $.noop,
    check: /[a-z0-9_]+/i,
    // fire on initial load
    // events: 'change.my'
    title: 'Data File',
    type: 'select'
  },
  '[name=color]': {
    bind: function (d, v, $o) {
      return this.bindControl(d, v, $o, this.loadChart);
    },
    setChartOption: $.noop,
    check: /default|class|graduated/i,
    events: 'click.my',
    title: 'Color Model',
    type: 'radio',
    watch: '[name=gradient]',
    values: [
      {value: 'default', label: 'Default'},
      {value: 'class', label: 'Class'},
      {value: 'graduated', label: 'Graduated'}
     ]
  },
  '[name=gradient]': {
    bind: function (d, v, $o) {
      // if (v == null || !v.filter('1').length) {
      //   v = null;
      // }
      return this.bindControl(d, v, $o, this.loadChart);
    },
    setChartOption: $.noop,
    recalc: '[name=color]',
    check: /0|1|vertical|horizontal|middle|base/i,
    events: 'click.my',
    title: 'Gradient',
    type: 'checkbox',
    values: [
      {value: '1', label: 'Use gradient'}, // 0 | 1
      {value: 'horizontal', label: 'Align horizontally'}, // vertical | horizontal
      {value: 'base', label: 'Align base'} // middle | base
     ]
  },
  '[name=direction]': {
    setChartOption: function (v, self) {
      $('html').css('direction', v).attr('class', v);
      self.Chart.direction(v);
    },
    check: /ltr|rtl/i,
    events: 'change.my',
    title: 'Direction',
    type: 'radio',
    values: [
      {value: 'ltr', label: 'Left-to-Right'},
      {value: 'rtl', label: 'Right-to-Left'}
    ]
  }
};
