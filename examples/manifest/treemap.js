
chartManifest = {
  id: 'sucrose-treemap',
  type: 'treemap',
  title: 'Treemap Chart',
  // Use these option presets to set the form input values
  // These chart options will be set
  optionPresets: {
    file: 'flare'
  },
  // These options should match the names of all form input names
  // Set them to the default value as expected by sucrose
  // If the option remains the default value, the chart option will not be set
  optionDefaults: {},
  ui: {
    '[name=file]': {
      // Set data file options in Manifest control
      values: [
        {value: 'flare', label: 'Flare Code Lines'},
        {value: 'treemap_data', label: 'Treemap Data'}
      ]
    }
  }
};
var cachedManifest = $.my.tojson(chartManifest);
console.log(cachedManifest);
