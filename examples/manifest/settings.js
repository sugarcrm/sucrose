
chartManifest = {
  '[name=settings]': {
    init: function () {},
    bind: function (d, v, $o) {
      $o.html(JSON.stringify(this.selectedOptions, null, '  '));
      if (!v) return $o.html();
    },
    events: 'blur.my',
    title: 'Chart Option Settings',
    type: 'textarea',
    values: [{value: ''}]
  }
};
// .donutLabelsOutside(true)
var cachedManifest = $.my.tojson(chartManifest);
console.log(cachedManifest);
