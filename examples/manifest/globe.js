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
  ui: {
    '[name=file]': {
      // Set data file options in Manifest control
      values: [
        {value: 'globe_data', label: 'Globe Data'}
      ]
    },
    '[name=color]': {
      hidden: true
    },
    '[name=gradient]': {
      hidden: true
    },
    '[name=direction]': {
      hidden: true
    }
  }
};
var cachedManifest = $.my.tojson(chartManifest);
console.log(cachedManifest);
