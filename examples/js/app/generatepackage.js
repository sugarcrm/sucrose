
function generatePackage(e) {
  e.preventDefault();
  e.stopPropagation();

  function jsonString(d) {
    return JSON.stringify(d, null, '  ');
  }

  var indexTemplate;
  var zip = new JSZip();
  var data = jsonString(Data);
  var settings = Manifest.getConfig();
  var chart = sucroseCharts.getChart(chartType);
  var model = sucroseCharts.getChartModel(chartType);
  var format = sucroseCharts.formatToString(chartType);
  var configure = sucroseCharts.configureToString();

  settings.locality = Manifest.getLocaleData(settings.locale);
  settings.colorOptions = Manifest.getColorOptions();

  var config = jsonString(sucroseCharts.getConfig(chartType, chart, settings));

  var includes = [
    $.get({url: 'tpl/index.html', dataType: 'text'}),
    $.get({url: 'js/d3v4.min.js', dataType: 'text'}),
    $.get({url: 'js/d3fc-rebind.min.js', dataType: 'text'}),
    $.get({url: 'js/sucrose.min.js', dataType: 'text'}),
    $.get({url: 'css/sucrose.min.css', dataType: 'text'})
  ];

  if (chartType === 'globe') {
    includes.push($.get({url: 'js/topojson.min.js', dataType: 'text'}));
    includes.push($.get({url: 'data/geo/world-countries-topo-110.json', dataType: 'text'}));
    includes.push($.get({url: 'data/geo/usa-states-topo-110.json', dataType: 'text'}));
    includes.push($.get({url: 'data/geo/cldr_en.json', dataType: 'text'}));
  }

  $.when
    .apply($, includes) // add defferends as params to $.when
    .then(function () {
      // convert defferends into files array
      return [].slice.apply(arguments, [0]).map(function (result) {
        return result[0];
      });
    })
    .then(function (files) {
      // replace index compoents with file string
      indexTemplate = files[0]
        .replace(/{{Type}}/g, chartType)
        .replace('{{Data}}', data)
        .replace('{{Config}}', config)
        .replace('{{Model}}', model)
        .replace('{{Format}}', format)
        .replace('{{Configure}}', configure);

      if (chartType === 'globe') {
        indexTemplate = indexTemplate.replace(
          '<!-- {{TopoJSON}} -->',
          (chartType === 'globe' ? '<script src="topojson.min.js"></script>' : '')
        );
      }

      // add files to zip
      zip.file('index.html', indexTemplate);
      zip.file('d3v4.min.js', files[1]);
      zip.file('d3fc-rebind.min.js', files[2]);
      zip.file('sucrose.min.js', files[3]);
      zip.file('sucrose.min.css', files[4]);

      if (chartType === 'globe') {
        zip.file('topojson.min.js', files[5]);
        zip.file('data/geo/world-countries-topo-110.json', files[6]);
        zip.file('data/geo/usa-states-topo-110.json', files[7]);
        zip.file('data/geo/cldr_en.json', files[8]);
      }

      // initiate zip download
      zip.generateAsync({type:'blob'}).then(
        function (blob) {
          saveAs(blob, 'sucrose-example-' + chartType + '.zip');
        },
        function (err) {
          console.log(err);
        }
      );
    });
}
