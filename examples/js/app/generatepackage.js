
function generatePackage(e) {
  e.preventDefault();
  e.stopPropagation();

  function jsonString(d) {
    return JSON.stringify(d, null, '  ');
  }

  var indexTemplate;
  var zip = new JSZip();
  var type = this.chartType;
  var data = Data;
  var settings = Manifest.getConfig();
  var chart = sucroseCharts.getChart(type);
  var config = {};

  settings.locality = Manifest.getLocaleData(settings.locale);
  settings.colorOptions = Manifest.getColorOptions();

  config = sucroseCharts.getConfig(type, chart, settings);

  $.when(
    $.get({url: 'tpl/index.html', dataType: 'text'}),
    $.get({url: 'js/sucrose.min.js', dataType: 'text'}),
    $.get({url: 'css/sucrose.min.css', dataType: 'text'})
  ).then(function () {
    return [].slice.apply(arguments, [0]).map(function (result) {
      return result[0];
    });
  }).then(function (files) {

    indexTemplate = files[0]
      .replace('{{Type}}', type)
      .replace('{{Data}}', jsonString(data))
      .replace('{{Config}}', jsonString(config))
      .replace('{{Model}}', sucroseCharts.getChartModel(type))
      .replace('{{Format}}', sucroseCharts.exportToString(type));

    zip.file('index.html', indexTemplate);
    zip.file('sucrose.min.js', files[1]);
    zip.file('sucrose.min.css', files[2]);

    zip.generateAsync({type:'blob'}).then(
      function (blob) {
        saveAs(blob, 'sucrose-example-' + type + '.zip');
      },
      function (err) {
        console.log(err);
      }
    );

  });
}
