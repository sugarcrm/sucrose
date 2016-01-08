
  var chartManifest = {
    id: 'sucrose-bubble',
    type: 'bubble',
    title: 'Bubble Chart',
    // Use these option presets to set the form input values
    // These chart options will be set
    optionPresets: {
      file: 'top10_opportunities'
    },
    // These options should match the names of all form input names
    // Set them to the default value as expected by sucrose
    // If the option remains the default value, the chart option will not be set
    optionDefaults: {},
    filterAssigned: 'group',
    ui: {
      '[name=file]': {
        // Set data file options in Manifest control
        values: [
          {value: 'top10_opportunities', label: 'Top 10 Opportunities'},
          {value: 'bubble_year_data', label: 'Year Data'}
        ]
      }
    }
  };
  var cachedManifest = $.my.tojson(chartManifest);
  console.log(cachedManifest);
