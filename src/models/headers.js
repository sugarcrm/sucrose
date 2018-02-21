import d3 from 'd3';
import utility from '../utility.js';
import language from '../language.js';
import menu from '../models/menu.js';

export default function headers() {
  var width = 960;
  var height = 500;

  var chart = null;
  var controls = menu();
  var legend = menu();

  var title = '';
  var controlsData = [];
  var legendData = [];

  var showTitle = false;
  var showControls = false;
  var showLegend = false;  // var clipEdge = false; // if true, masks lines within x and y scale

  var alignControls = 'left';
  var alignLegend = 'right';

  var direction = 'ltr';
  var strings = language();


  function model(selection) {
    selection.each(function() {

      var container = d3.select(this);
      var wrap = container.select('.sc-chart-wrap');
      var title_wrap = wrap.select('.sc-title-wrap');
      var controls_wrap = wrap.select('.sc-controls-wrap');
      var legend_wrap = wrap.select('.sc-legend-wrap');

      var margin = chart.margin();

      var xpos = 0,
          ypos = 0;

      // Header variables
      var maxControlsWidth = 0,
          maxLegendWidth = 0,
          widthRatio = 0,
          titleBBox = {width: 0, height: 0, top: 0, left: 0},
          titleHeight = 0,
          controlsHeight = 0,
          legendHeight = 0;



      // set title display option
      showTitle = showTitle && title && title.length > 0;

      title_wrap.select('.sc-title').remove();

      if (showTitle) {
        title_wrap
          .append('text')
            .attr('class', 'sc-title')
            .attr('x', direction === 'rtl' ? width : 0)
            .attr('y', 0)
            .attr('dy', '.75em')
            .attr('text-anchor', 'start')
            .attr('stroke', 'none')
            .attr('fill', 'black')
            .text(title);

        titleBBox = utility.getTextBBox(title_wrap.select('.sc-title'), true);
        // getBoundingClientRect is relative to viewport
        // we need relative to container
        titleBBox.top -= container.node().getBoundingClientRect().top;

        titleHeight = titleBBox.height;
      }

      if (showControls) {
        controls
          .id('controls_' + chart.id())
          .strings(strings.controls)
          .color(['#444'])
          .align(alignControls)
          .height(height - titleHeight);
        controls_wrap
          .datum(controlsData)
          .call(controls);

        maxControlsWidth = controls.calcMaxWidth();
      }

      if (showLegend) {
        legend
          .id('legend_' + chart.id())
          .strings(strings.legend)
          .align(alignLegend)
          .height(height - titleHeight);
        legend_wrap
          .datum(legendData)
          .call(legend);

        maxLegendWidth = legend.calcMaxWidth();
      }

      // calculate proportional available space
      widthRatio = width / (maxControlsWidth + maxLegendWidth);
      maxControlsWidth = Math.floor(maxControlsWidth * widthRatio);
      maxLegendWidth = Math.floor(maxLegendWidth * widthRatio);

      if (showControls) {
        controls
          .arrange(maxControlsWidth);
        maxLegendWidth = width - controls.width();
      }

      if (showLegend) {
        legend
          .arrange(maxLegendWidth);
        maxControlsWidth = width - legend.width();
      }

      if (showControls) {
        xpos = direction === 'rtl' ? width - controls.width() : 0;
        if (showTitle) {
          // align top of legend space at bottom of title
          ypos = titleBBox.height - margin.top + titleBBox.top;
        } else {
          // align top of legend keys at top margin
          ypos = 0 - controls.margin().top;
        }
        controls_wrap
          .attr('transform', utility.translation(xpos, ypos));

        controlsHeight = controls.height() - (showTitle ? 0 : controls.margin().top);
      }

      if (showLegend) {
        var legendLinkBBox = utility.getTextBBox(legend_wrap.select('.sc-menu-link')),
            legendSpace = width - titleBBox.width - 6,
            legendTop = showTitle && !showControls && legend.collapsed() && legendSpace > legendLinkBBox.width ? true : false;

        xpos = direction === 'rtl' || (!legend.collapsed() && alignLegend === 'center') ? 0 : width - legend.width();

        if (legendTop) {
          // center legend link at middle of legend space
          ypos = titleBBox.height - legend.height() / 2 - legendLinkBBox.height / 2;
          // shift up by title baseline offset
          ypos -= margin.top - titleBBox.top;
        } else if (showTitle) {
          // align top of legend space at bottom of title
          ypos = titleBBox.height - margin.top + titleBBox.top;
        } else {
          // align top of legend keys at top margin
          ypos = 0 - legend.margin().top;
        }
        legend_wrap
          .attr('transform', utility.translation(xpos, ypos));

        legendHeight = legendTop ? legend.margin().bottom : legend.height() - (showTitle ? 0 : legend.margin().top);
      }

      model.getHeight = function() {
        var headerHeight = titleHeight + Math.max(controlsHeight, legendHeight, 10);
        return headerHeight;
      };

    });

    return model;
  }

  model.controls = controls;
  model.legend = legend;

  model.chart = function(_) {
    if (!arguments.length) { return chart; }
    chart = _;
    return model;
  };

  model.width = function(_) {
    if (!arguments.length) { return width; }
    width = _;
    return model;
  };

  model.height = function(_) {
    if (!arguments.length) { return height; }
    height = _;
    return model;
  };

  model.title = function(_) {
    if (!arguments.length) { return title; }
    title = _;
    return model;
  };
  model.controlsData = function(_) {
    if (!arguments.length) { return controlsData; }
    controlsData = _;
    return model;
  };

  model.legendData = function(_) {
    if (!arguments.length) { return legendData; }
    legendData = _;
    return model;
  };

  model.showTitle = function(_) {
    if (!arguments.length) { return showTitle; }
    showTitle = _;
    return model;
  };

  model.showControls = function(_) {
    if (!arguments.length) { return showControls; }
    showControls = _;
    return model;
  };

  model.showLegend = function(_) {
    if (!arguments.length) { return showLegend; }
    showLegend = _;
    return model;
  };

  model.alignControls = function(_) {
    if (!arguments.length) { return alignControls; }
    alignControls = _;
    return model;
  };

  model.alignLegend = function(_) {
    if (!arguments.length) { return alignLegend; }
    alignLegend = _;
    return model;
  };

  model.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    legend.direction(_);
    controls.direction(_);
    return model;
  };

  model.strings = function(_) {
    if (!arguments.length) { return strings; }
    strings = language(_);
    legend.strings(strings.legend);
    controls.strings(strings.controls);
    return model;
  };

  return model;
}
