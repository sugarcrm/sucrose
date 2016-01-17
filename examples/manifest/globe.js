chartManifest = {
  id: 'sucrose-globe',
  type: 'globe',
  title: 'Globe Chart',
  // Use these option presets to set the form input values
  // These chart options will be set
  optionPresets: {
    file: 'globe_data'
  },
  // These options should match the names of all form input names
  // Set them to the default value as expected by sucrose
  // If the option remains the default value, the chart option will not be set
  optionDefaults: {},
  updateColorModel: function (v) {
    var options = {},
        color = this.data.color.val,
        gradient = this.data.gradient.val;
    if (color && color === 'graduated') {
      this.colorLength = 13;
      this.gradientStart = '#41E864';
      this.gradientStop = '#3578B2';
      options = {c1: this.gradientStart, c2: this.gradientStop, l: this.colorLength};
    }
    if (color && color === 'data') {
      this.colorLength = null;
      this.gradientStart = '#aaa';
      this.gradientStop = '#369';
      options = {c1: this.gradientStart, c2: this.gradientStop};
    }
    if (gradient && gradient.filter('1').length && color !== 'class') {
      options.gradient = true;
      options.orientation = gradient.filter('horizontal').length ? 'horizontal' : 'vertical';
      options.position = gradient.filter('base').length ? 'base' : 'middle';
    }
    this.Chart.colorData(color, options);
  },
  ui: {
    '[name=file]': {
      // Set data file options in Manifest control
      values: [
        {value: 'globe_data', label: 'Globe Data'}
      ]
    },
    '[name=color]': {
      check: /default|class|graduated|data/i,
      events: 'click.my',
      title: 'Color Model',
      type: 'radio',
      watch: '',
      values: [
        {value: 'default', label: 'Default'},
        {value: 'class', label: 'Class'},
        {value: 'graduated', label: 'Graduated'},
        {value: 'data', label: 'Data driven'}
       ]
    },
    '[name=gradient]': {
      bind: $.noop,
      setChartOption: $.noop,
      hidden: true
    },
    '[name=direction]': {
      hidden: true
    }
  }
};
var cachedManifest = $.my.tojson(chartManifest);
console.log(cachedManifest);
