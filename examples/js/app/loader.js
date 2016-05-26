
function loader(type, options) {
  if (!type) {
    return;
  }

  // Load manifest for chart type
  $.ajax({
      url: 'manifest/' + type + '.json',
      dataType: 'text'
    })
    .then(function (manifest) {
      var presets = {};
      var chartManifest = $.my.fromjson(manifest);

      // Reset manifest UI Object from Base UI
      Manifest.ui = Object.clone(baseUI, true);

      // Combine base and custom Manifest UIs
      Object.merge(Manifest, chartManifest, true);

      // Define additional attributes of form elements
      Object.each(Manifest.ui, function (k, v, d) {
        if (v.hidden) {
          delete d[k];
        } else {
          Object.merge(
            d[k],
            {
              init: function ($o) {
                this.initControl($o);
              },
              bind: function (d, v, $o) {
                return this.bindControl(d, v, $o, this.loadChart);
              },
              values: [
                {value: '0', label: 'No'},
                {value: '1', label: 'Yes'}
              ]
            },
            false, // shallow copy
            false  // do not overwrite
          );
        }
      });

      // Set data file options in Manifest control
      Manifest.ui['[name=file]'].values = fileCatalog[type];

      // Data containers persisted in localStorage
      store.set('example-type', type);
      // Set Application scope variables
      chartType = type;
      chartStore = store.get('example-' + type) || {};
      // TODO: we need to store modified chartData somewhere
      // chartData = chartStore.chartData || {};

      // Build Config data from stored selected values with chart type overrides
      presets = options || chartStore.optionPresets || chartManifest.optionPresets;
      console.log(presets)
      // Config will contain default value an
      Object.each(Manifest.optionDefaults, function (prop, val) {
        Config[prop] = {};
        Config[prop].def = val;
        Config[prop].val = window.uQuery(prop) || presets[prop];
      });

      $index.addClass('hidden');
      $demo.removeClass('hidden');

      Manifest.loadForm();

      //
      $picker.find('a')
        .removeClass('active')
        .filter('[data-type=' + type + ']')
        .addClass('active');
    });
}
