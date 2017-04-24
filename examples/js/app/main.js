
// Application scope jQuery references to main page elements
$title = $('#title_');
$picker = $('#picker_');
$menu = $('#menu_');

$index = $('#index_');
$demo = $('#demo_');

$example = $('#example_');
$chart = $('#chart_');
$table = $('#table_ table');
$data = $('#data_');

$options = $('#options_');
$form = $('#form_ form');
$config = $('#config_');

// Application scope variables
chartStore = {};
chartType = window.uQuery('type');
fileCatalog = {};
localeData = {};

// jQuery.my data
Config = {};

// Visualization data
Data = {};
chartData = {};
tableData = {};

// Application scope D3 reference to button tooltip
tooltip = null;

xIsDatetime = false;
yIsCurrency = false;

// Ignore touchstart in favour of touchend
function touchstart(evt) {
  if (evt) {
    evt.preventDefault();
    evt.stopPropagation();
  }
}

// remap d3v4 to d3
if (typeof d3v4 !== 'undefined' && typeof d3 === 'undefined') {
  var d3 = d3v4;
}

// Bind tooltips to buttons
d3.selectAll('[rel=tooltip]')
  .on('mouseover', $.proxy(function () {
    var $target = $(d3.event.currentTarget),
        title = $target.data('title'),
        open = $target.closest('.chart-selector').hasClass('open');
    if (!open) {
      this.tooltip = sucrose.tooltip.show(d3.event, title, null, null, d3.select('.demo').node());
    }
  }, this))
  .on('mousemove', $.proxy(function () {
    if (this.tooltip) {
      sucrose.tooltip.position(d3.select('.demo').node(), this.tooltip, d3.event);
    }
  }, this))
  .on('mouseout', $.proxy(function () {
    if (this.tooltip) {
      sucrose.tooltip.cleanup();
    }
  }, this))
  .on('touchstart', touchstart)
  .on('touchend', $.proxy(function () {
    d3.event.preventDefault();
    this.tooltip = false;
  }, this))
  .on('click', $.proxy(function () {
    if (this.tooltip) {
      sucrose.tooltip.cleanup();
    }
  }, this));

// For both index list and example picker
$picker
  .on('touchstart', touchstart)
  .on('click touchend', 'a', function (evt) {
    var type = $(evt.currentTarget).data('type');
    evt.preventDefault();
    evt.stopPropagation();
    if (type !== chartType) {
      loader(type);
    }
  });

// Open menu when button clicked
$menu
  .on('touchstart', touchstart)
  .on('click touchend', function (evt) {
    evt.preventDefault();
    evt.stopPropagation();
    $picker.toggleClass('open');
  });

// Close menu when clicking outside
$('body')
  .on('click touchend', function () {
    $picker.removeClass('open');
  });


$.when(
    $.get({url:'data/locales/locales.json', dataType: 'json'}),
    $.get({url:'data/catalog.json', dataType: 'json'}),
    // Load manifest for base ui
    $.get({url: 'manifest/base.json', dataType: 'text'})
  )
  .then(function () {
    return [].slice.apply(arguments, [0]).map(function (result) {
      return result[0];
    });
  })
  .then(function (json) {
    localeData = Object.extended(json[0]);
    fileCatalog = Object.extended(json[1]);
    baseUI = $.my.fromjson(json[2]);
  })
  .then(function () {
    // If chartType was passed in url, open it
    if (chartType) {
      loader(chartType);
    }
  });
