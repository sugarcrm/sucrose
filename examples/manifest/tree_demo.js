chartManifest = {
  id: 'sucrose-tree',
  type: 'tree',
  title: 'Tree Chart',
  // Use these option presets to set the form input values
  // These chart options will be set
  optionPresets: {
    file: 'tree_data'
  },
  // These options should match the names of all form input names
  // Set them to the default value as expected by sucrose
  // If the option remains the default value, the chart option will not be set
  optionDefaults: {
    file: 'tree_data',
    controls: ''
  },
  ui: {
    '[name=file]': {
      // Set data file options in Manifest control
      values: [
        {value: 'tree_data', label: 'Organization'}
      ]
    },
    '[name=controls]': {
      init: function ($o) {
        this.initControl($o.attr('name'));

        $('[name=controls]').on('click', $.proxy(function(e) {
          //if icon clicked get parent button
          var button = $(e.currentTarget).data('control');
          switch (button) {
            case 'orientation':
              this.Chart.nodeSize({'width': 124, 'height': 56}).orientation();
              break;
            case 'show-all-nodes':
              this.Chart.showall();
              break;
            case 'zoom-to-fit':
              this.Chart.reset();
              break;
            default:
          }
        }, this));
      },
      bind: $.noop,
      chartInit: $.noop,
      check: /[a-zA-Z\s]/i,
      title: 'Tree controls',
      type: 'button',
      values: [
        {value: 'orientation', label: 'Toggle orientation'},
        {value: 'show-all-nodes', label: 'Show all nodes'},
        {value: 'zoom-to-fit', label: 'Zoom to fit'}
      ]
    },
    '[name=color]': {
      init: $.noop,
      bind: $.noop,
      events: null,
      hidden: true
    },
    '[name=direction]': {
      init: $.noop,
      bind: $.noop,
      events: null,
      hidden: true
    }
  }
};
var cachedManifest = $.my.tojson(chartManifest);
console.log(cachedManifest);
