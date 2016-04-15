
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
  ui: {}
};
var cachedManifest = $.my.tojson(chartManifest);
console.log(cachedManifest);
