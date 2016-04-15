
function loader(type) {
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

      // Append settings textarea to end of chart options ui
      Object.merge(chartManifest.ui, Object.clone(settingsUI, true));

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

      // Build Data from stored selected values with chart type overrides
      presets = chartStore.optionPresets || chartManifest.optionPresets;
      // Data will contain default value an
      Object.each(Manifest.optionDefaults, function (prop, val) {
        Data[prop] = {};
        Data[prop].def = val;
        Data[prop].val = window.uQuery(prop) || presets[prop];
      });

      $index.addClass('hidden');
      $demo.removeClass('hidden');

      // TODO: is there a way to reinit jQuery.my with new Data?
      // I get an bind error if I try to do it, so I have to
      // Delete and recreate the entire form
      $form.remove();
      $options.append('<div class="sc-form" id="form"/>');
      // Reset application scope reference to form
      $form = $('#form');

      // Instantiate jQuery.my
      $form.my(Manifest, Data);
      $picker.find('a')
        .removeClass('active')
        .filter('[data-type=' + type + ']')
        .addClass('active');
    });
}
