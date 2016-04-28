// jQuery.my data
Data = {};

// Application scope jQuery references to main page elements
$title = $('#title');
$picker = $('#picker');
$select = $('.chart-selector');
$index = $('.index');
$demo = $('.demo');
$options = $('#options');
$form = $('#form');
$example = $('#example');
$chart = $('#chart');
$table = $('#table');
$menu = $('#menu');

// Application scope variables
chartData = {};
chartStore = {};
chartType = window.uQuery('type');
fileCatalog = {};
localeData = {};
rawData = {};
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
$select
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
    $select.toggleClass('open');
  });

// Close menu when clicking outside
$('body')
  .on('click touchend', function () {
    $select.removeClass('open');
  });


$.when(
    $.get({url:'data/locales/locales.json', dataType: 'json'}),
    $.get({url:'data/catalog.json', dataType: 'json'}),
    // Load manifest for settings display textarea
    $.get({url: 'manifest/settings.json', dataType: 'text'}),
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
    settingsUI = $.my.fromjson(json[2]);
    baseUI = $.my.fromjson(json[3]);
  })
  .then(function () {
    // If chartType was passed in url, open it
    if (chartType) {
      loader(chartType);
    }
  });
