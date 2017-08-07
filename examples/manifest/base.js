module.exports =
{
  '[name=file]': {
    bind: function (d, v, $o) {
      return this.bindControl(d, v, $o, this.loadData);
    },
    setChartOption: function() { return; },
    check: /[a-z0-9_]+/i,
    title: 'Data File',
    type: 'select',
    values: []
  },
  '[name=locale]': {
    bind: function (d, v, $o) {
      return this.bindControl(d, v, $o, this.loadLocale);
    },
    setChartOption: function() { return; },
    check: /[a-z0-9_]+/i,
    title: 'Locale',
    type: 'select',
    values: [
      {"value": "en","label": "English (US)"}
    ]
  },
  '[name=color_data]': {
    bind: function (d, v, $o) {
      return this.bindControl(d, v, $o, this.loadColor);
    },
    setChartOption: function() { return; },
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
      return this.bindControl(d, v, $o, this.loadColor);
    },
    setChartOption: function() { return; },
    recalc: '[name=color_data]',
    check: /[0|1|default|vertical|horizontal|middle|base]+/ig,
    events: 'click.my',
    title: 'Gradient',
    type: 'checkbox',
    values: [
      {value: '1', label: 'Use gradient'},
      {value: 'horizontal', label: 'Align horizontally'},
      {value: 'base', label: 'Align base'}
     ]
  },
  '[name=direction]': {
    setChartOption: function (v, self) {
      $('html').css('direction', v).attr('class', v);
      if (self.Chart.direction) {
        self.Chart.direction(v);
      }
    },
    check: /ltr|rtl/i,
    events: 'change.my',
    title: 'Direction',
    type: 'radio',
    values: [
      {value: 'ltr', label: 'Left-to-Right'},
      {value: 'rtl', label: 'Right-to-Left'}
    ]
  },
  '[name=show_title]': {
    setChartOption: function (v, self) {
      var showTitle = v == 1;
      if (self.Chart.showTitle) {
        self.Chart.showTitle(showTitle);
      }
    },
    check: /1/i,
    events: 'change.my',
    title: 'Show Title',
    type: 'checkbox',
    values: [
      {value: '1', label: 'Enable'}
    ]
  },
};
