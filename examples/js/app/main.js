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

// Application scope D3 reference to button tooltip
tootip = null;

// Application scope variables
chartType = window.uQuery('type');
chartStore = {};
chartData = {};
tableData = {};

// Bind tooltips to buttons
d3.selectAll('[rel=tooltip]')
    .on('mouseover', $.proxy(function () {
      var $a = $(d3.event.currentTarget),
          title = $a.data('title'),
          open = $a.closest('.chart-selector').hasClass('open');
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
    .on('touchstart', $.proxy(function () {
      d3.event.preventDefault();
      this.tooltip = false;
    }, this))
    .on('click', $.proxy(function () {
      if (this.tooltip) {
        sucrose.tooltip.cleanup();
      }
    }, this));

// For both index list and example picker
$select.on('click', 'a', function (e) {
    var type = $(e.currentTarget).data('type');
    e.preventDefault();
    if (type !== chartType) {
      loader(type);
    }
  });

// Open menu when button clicked
$menu.on('click touch', function (e) {
    e.preventDefault();
    $(this).parent().toggleClass('open');
  });

if (chartType) {
  loader(chartType);
}
