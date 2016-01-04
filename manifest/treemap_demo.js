
  var chartManifest = {
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
    optionDefaults: {
      file: '',
      color: 'default',
      direction: 'ltr'
    },
    ui: {
      '[name=file]': {
        // Set data file options in Manifest control
        values: [
          {value: 'flare', label: 'Flare Code Lines'}
        ]
      },
      '[name=color]': {
        chartInit: function (v, self) {
          if (v === 'graduated') {
            self.Chart.colorData(v, {c1: self.gradientStart, c2: self.gradientStop, l: self.colorLength});
          } else {
            self.Chart.colorData(v);
          }
          self.loadData('flare');
        }
      }
    }
  };
  var cachedManifest = $.my.tojson(chartManifest);
  console.log(cachedManifest);
