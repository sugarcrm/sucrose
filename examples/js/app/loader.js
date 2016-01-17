
function loader(type) {
  if (!type) {
    return;
  }

  $.ajax({
    url: 'manifest/' + type + '.json',
    cache: true,
    dataType: 'text',
    context: this,
    async: true
  })
  .success(function (json) {
    if (!json) {
      return;
    }
    var options = {};

    // Load manifest for chart type
    var chartManifest = $.my.fromjson(json);

    $index.addClass('hidden');
    $demo.removeClass('hidden');

    // Append settings textarea to end of chart options ui
    Object.merge(
      chartManifest.ui,
      {'[name=settings]': {
          init: $.noop,
          bind: function (d, v, $o) {
            $o.html(JSON.stringify(this.selectedOptions, null, '  '));
            if (!v) return $o.html();
          },
          events: 'blur.my',
          title: 'Chart Option Settings',
          type: 'textarea',
          values: [
            {value: ''}
          ]
        }
      }
    );

    // Reset manifest UI Object as
    Manifest.ui = Object.clone(baseUI, true);

    // Combine common and custom Manifest UIs
    Object.merge(Manifest, chartManifest, true);

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

    // Data containers persisted in localStorage
    store.set('example-type', type);
    // Set Application scope variables
    chartType = type;
    chartStore = store.get('example-' + type) || {};
    // chartData = chartStore.chartData || {};
    // Build Data from stored selected values with chart type overrides
    options = chartStore.chartOptions || chartManifest.optionPresets;
    // Data will contain default value an
    $.each(Manifest.optionDefaults, function (k) {
      Data[k] = {};
      Data[k].def = this;
      Data[k].val = window.uQuery(k) || options[k];
    });
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
