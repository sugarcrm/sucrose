(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3'), require('d3fc-rebind')) :
  typeof define === 'function' && define.amd ? define(['exports', 'd3', 'd3fc-rebind'], factory) :
  (factory((global.sucrose = global.sucrose || {}),global.d3,global.fc));
}(this, (function (exports,d3,d3fcRebind) { 'use strict';

d3 = 'default' in d3 ? d3['default'] : d3;

// import * as d3 from 'd3';

var utils = {};

utils.strip = function(s) {
  return s.replace(/(\s|&)/g,'');
};

utils.identity = function(d) {
  return d;
};

utils.functor = function functor(v) {
  return typeof v === "function" ? v : function() {
    return v;
  };
};


// export {utils as default};

// import scroll from './scroll.js';

function legend() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 10, right: 10, bottom: 15, left: 10},
      width = 0,
      height = 0,
      align = 'right',
      direction = 'ltr',
      position = 'start',
      radius = 6, // size of dot
      diameter = radius * 2, // diamter of dot plus stroke
      gutter = 10, // horizontal gap between keys
      spacing = 12, // vertical gap between keys
      textGap = 5, // gap between dot and label accounting for dot stroke
      equalColumns = true,
      showAll = false,
      showMenu = false,
      collapsed = false,
      rowsCount = 3, //number of rows to display if showAll = false
      enabled = false,
      strings = {
        close: 'Hide legend',
        type: 'Show legend',
        noLabel: 'undefined'
      },
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID in case user doesn't select one
      getKey = function(d) {
        return d.key.length > 0 || (!isNaN(parseFloat(d.key)) && isFinite(d.key)) ? d.key : legend.strings().noLabel;
      },
      color = function(d) {
        return utils.defaultColor()(d, d.seriesIndex);
      },
      classes = function(d) {
        return 'sc-series sc-series-' + d.seriesIndex;
      },
      dispatch = d3.dispatch('legendClick', 'legendMouseover', 'legendMouseout', 'toggleMenu', 'closeMenu');

  // Private Variables
  //------------------------------------------------------------

  var legendOpen = 0;

  var useScroll = false,
      scrollEnabled = true,
      scrollOffset = 0,
      overflowHandler = function(d) { return; };

  //============================================================

  function legend(selection) {

    selection.each(function(data) {

      var container = d3.select(this),
          containerWidth = width,
          containerHeight = height,
          keyWidths = [],
          legendHeight = 0,
          dropdownHeight = 0,
          type = '',
          inline = position === 'start' ? true : false,
          rtl = direction === 'rtl' ? true : false,
          lineSpacing = spacing * (inline ? 1 : 0.6),
          padding = gutter + (inline ? diameter + textGap : 0);

      if (!data || !data.length || !data.filter(function(d) { return !d.values || d.values.length; }).length) {
        return legend;
      }

      // enforce existence of series for static legend keys
      var iSeries = data.filter(function(d) { return d.hasOwnProperty('seriesIndex'); }).length;
      data.filter(function(d) { return !d.hasOwnProperty('seriesIndex'); }).map(function(d, i) {
        d.seriesIndex = iSeries;
        iSeries += 1;
      });

      enabled = true;

      type = !data[0].type || data[0].type === 'bar' ? 'bar' : 'line';
      align = rtl && align !== 'center' ? align === 'left' ? 'right' : 'left' : align;

      //------------------------------------------------------------
      // Setup containers and skeleton of legend

      var wrap_bind = container.selectAll('g.sc-wrap').data([data]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-wrap sc-legend');
      var wrap = container.select('g.sc-wrap').merge(wrap_entr);
      wrap.attr('transform', 'translate(0,0)');

      var defs_entr = wrap_entr.append('defs');
      var defs = wrap.select('defs');

      defs_entr.append('clipPath').attr('id', 'sc-edge-clip-' + id).append('rect');
      var clip = wrap.select('#sc-edge-clip-' + id + ' rect');

      wrap_entr.append('rect').attr('class', 'sc-legend-background');
      var back = wrap.select('.sc-legend-background');
      var backFilter = utils.dropShadow('legend_back_' + id, defs, {blur: 2});

      wrap_entr.append('text').attr('class', 'sc-legend-link');
      var link = wrap.select('.sc-legend-link');

      var mask_entr = wrap_entr.append('g').attr('class', 'sc-legend-mask');
      var mask = wrap.select('.sc-legend-mask');

      mask_entr.append('g').attr('class', 'sc-group');
      var g = wrap.select('.sc-group');

      var series_bind = g.selectAll('.sc-series').data(utils.identity, function(d) { return d.seriesIndex; });
      series_bind.exit().remove();
      var series_entr = series_bind.enter().append('g').attr('class', 'sc-series')
            .on('mouseover', function(d, i) {
              dispatch.call('legendMouseover', this, d);
            })
            .on('mouseout', function(d, i) {
              dispatch.call('legendMouseout', this, d);
            })
            .on('click', function(d, i) {
              d3.event.preventDefault();
              d3.event.stopPropagation();
              dispatch.call('legendClick', this, d);
            });
      var series = g.selectAll('.sc-series').merge(series_entr);

      series
          .attr('class', classes)
          .attr('fill', color)
          .attr('stroke', color)
      series_entr
        .append('rect')
          .attr('x', (diameter + textGap) / -2)
          .attr('y', (diameter + lineSpacing) / -2)
          .attr('width', diameter + textGap)
          .attr('height', diameter + lineSpacing)
          .style('fill', '#FFE')
          .style('stroke-width', 0)
          .style('opacity', 0.1);

      var circles_bind = series_entr.selectAll('circle').data(function(d) { return type === 'line' ? [d, d] : [d]; });
      circles_bind.exit().remove();
      var circles_entr = circles_bind.enter()
        .append('circle')
          .attr('r', radius)
          .style('stroke-width', '2px');
      var circles = series.selectAll('circle').merge(circles_entr);

      var line_bind = series_entr.selectAll('line').data(type === 'line' ? function(d) { return [d]; } : []);
      line_bind.exit().remove();
      var lines_entr = line_bind.enter()
        .append('line')
          .attr('x0', 0)
          .attr('y0', 0)
          .attr('y1', 0)
          .style('stroke-width', '4px');
      var lines = series.selectAll('line').merge(lines_entr);

      var texts_entr = series_entr.append('text')
        .attr('dx', 0);
      var texts = series.selectAll('text').merge(texts_entr);

      texts
        .attr('dy', inline ? '.36em' : '.71em')
        .text(getKey);

      //------------------------------------------------------------
      // Update legend attributes

      clip
        .attr('x', 0.5)
        .attr('y', 0.5)
        .attr('width', 0)
        .attr('height', 0);

      back
        .attr('x', 0.5)
        .attr('y', 0.5)
        .attr('width', 0)
        .attr('height', 0)
        .style('opacity', 0)
        .style('pointer-events', 'all')
        .on('click', function(d, i) {
          d3.event.stopPropagation();
        });

      link
        .text(legendOpen === 1 ? legend.strings().close : legend.strings().open)
        .attr('text-anchor', align === 'left' ? rtl ? 'end' : 'start' : rtl ? 'start' : 'end')
        .attr('dy', '.36em')
        .attr('dx', 0)
        .style('opacity', 0)
        .on('click', function(d, i) {
          d3.event.preventDefault();
          d3.event.stopPropagation();
          dispatch.call('toggleMenu', this, d, i);
        });

      series.classed('disabled', function(d) {
        return d.disabled;
      });

      //------------------------------------------------------------

      //TODO: add ability to add key to legend
      //TODO: have series display values on hover
      //var label = g.append('text').text('Probability:').attr('class','sc-series-label').attr('transform','translate(0,0)');

      // store legend label widths
      legend.calcMaxWidth = function() {
        keyWidths = [];

        g.style('display', 'inline');

        texts.each(function(d, i) {
          var textWidth = d3.select(this).node().getBoundingClientRect().width;
          keyWidths.push(Math.max(Math.floor(textWidth), (type === 'line' ? 50 : 20)));
        });

        legend.width(d3.sum(keyWidths) + keyWidths.length * padding - gutter);

        return legend.width();
      };

      legend.getLineHeight = function() {
        g.style('display', 'inline');
        var lineHeightBB = Math.floor(texts.node().getBoundingClientRect().height);
        return lineHeightBB;
      };

      legend.arrange = function(containerWidth) {

        if (keyWidths.length === 0) {
          this.calcMaxWidth();
        }

        function keyWidth(i) {
          return keyWidths[i] + padding;
        }
        function keyWidthNoGutter(i) {
          return keyWidths[i] + padding - gutter;
        }
        function sign(bool) {
          return bool ? 1 : -1;
        }

        var keys = keyWidths.length,
            rows = 1,
            cols = keys,
            columnWidths = [],
            keyPositions = [],
            maxWidth = containerWidth - margin.left - margin.right,
            maxRowWidth = 0,
            minRowWidth = 0,
            textHeight = this.getLineHeight(),
            lineHeight = diameter + (inline ? 0 : textHeight) + lineSpacing,
            menuMargin = {top: 7, right: 7, bottom: 7, left: 7}, // account for stroke width
            xpos = 0,
            ypos = 0,
            i,
            mod,
            shift;

        if (equalColumns) {

          //keep decreasing the number of keys per row until
          //legend width is less than the available width
          while (cols > 0) {
            columnWidths = [];

            for (i = 0; i < keys; i += 1) {
              if (keyWidth(i) > (columnWidths[i % cols] || 0)) {
                columnWidths[i % cols] = keyWidth(i);
              }
            }

            if (d3.sum(columnWidths) - gutter < maxWidth) {
              break;
            }
            cols -= 1;
          }
          cols = cols || 1;

          rows = Math.ceil(keys / cols);
          maxRowWidth = d3.sum(columnWidths) - gutter;

          for (i = 0; i < keys; i += 1) {
            mod = i % cols;

            if (inline) {
              if (mod === 0) {
                xpos = rtl ? maxRowWidth : 0;
              } else {
                xpos += columnWidths[mod - 1] * sign(!rtl);
              }
            } else {
              if (mod === 0) {
                xpos = (rtl ? maxRowWidth : 0) + (columnWidths[mod] - gutter) / 2 * sign(!rtl);
              } else {
                xpos += (columnWidths[mod - 1] + columnWidths[mod]) / 2 * sign(!rtl);
              }
            }

            ypos = Math.floor(i / cols) * lineHeight;
            keyPositions[i] = {x: xpos, y: ypos};
          }

        } else {

          if (rtl) {

            xpos = maxWidth;

            for (i = 0; i < keys; i += 1) {
              if (xpos - keyWidthNoGutter(i) < 0) {
                maxRowWidth = Math.max(maxRowWidth, keyWidthNoGutter(i));
                xpos = maxWidth;
                if (i) {
                  rows += 1;
                }
              }
              if (xpos - keyWidthNoGutter(i) > maxRowWidth) {
                maxRowWidth = xpos - keyWidthNoGutter(i);
              }
              keyPositions[i] = {x: xpos, y: (rows - 1) * (lineSpacing + diameter)};
              xpos -= keyWidth(i);
            }

          } else {

            xpos = 0;

            for (i = 0; i < keys; i += 1) {
              if (i && xpos + keyWidthNoGutter(i) > maxWidth) {
                xpos = 0;
                rows += 1;
              }
              if (xpos + keyWidthNoGutter(i) > maxRowWidth) {
                maxRowWidth = xpos + keyWidthNoGutter(i);
              }
              keyPositions[i] = {x: xpos, y: (rows - 1) * (lineSpacing + diameter)};
              xpos += keyWidth(i);
            }

          }

        }

        if (!showMenu && (showAll || rows <= rowsCount)) {

          legendOpen = 0;
          collapsed = false;
          useScroll = false;

          legend
            .width(margin.left + maxRowWidth + margin.right)
            .height(margin.top + rows * lineHeight - lineSpacing + margin.bottom);

          switch (align) {
            case 'left':
              shift = 0;
              break;
            case 'center':
              shift = (containerWidth - legend.width()) / 2;
              break;
            case 'right':
              shift = 0;
              break;
          }

          clip
            .attr('y', 0)
            .attr('width', legend.width())
            .attr('height', legend.height());

          back
            .attr('x', shift)
            .attr('width', legend.width())
            .attr('height', legend.height())
            .attr('rx', 0)
            .attr('ry', 0)
            .attr('filter', 'none')
            .style('display', 'inline')
            .style('opacity', 0);

          mask
            .attr('clip-path', 'none')
            .attr('transform', function(d, i) {
              var xpos = shift + margin.left + (inline ? radius * sign(!rtl) : 0),
                  ypos = margin.top + menuMargin.top;
              return 'translate(' + xpos + ',' + ypos + ')';
            });

          g
            .style('opacity', 1)
            .style('display', 'inline');

          series
            .attr('transform', function(d) {
              var pos = keyPositions[d.seriesIndex];
              return 'translate(' + pos.x + ',' + pos.y + ')';
            });

          series.select('rect')
            .attr('x', function(d) {
              var xpos = 0;
              if (inline) {
                xpos = (diameter + gutter) / 2 * sign(rtl);
                xpos -= rtl ? keyWidth(d.seriesIndex) : 0;
              } else {
                xpos = keyWidth(d.seriesIndex) / -2;
              }
              return xpos;
            })
            .attr('width', function(d) {
              return keyWidth(d.seriesIndex);
            })
            .attr('height', lineHeight);

          circles
            .attr('r', function(d) {
              return d.type === 'dash' ? 0 : radius;
            })
            .attr('transform', function(d, i) {
              var xpos = inline || type === 'bar' ? 0 : radius * 3 * sign(i);
              return 'translate(' + xpos + ',0)';
            });

          lines
            .attr('x1', function(d) {
              return d.type === 'dash' ? radius * 8 : radius * 4;
            })
            .attr('transform', function(d) {
              var xpos = radius * (d.type === 'dash' ? -4 : -2);
              return 'translate(' + xpos + ',0)';
            })
            .style('stroke-dasharray', function(d) {
              return d.type === 'dash' ? '8, 8' : 'none';
            })
            .style('stroke-dashoffset', -4);

          texts
            .attr('dy', inline ? '.36em' : '.71em')
            .attr('text-anchor', position)
            .attr('transform', function(d) {
              var xpos = inline ? (radius + textGap) * sign(!rtl) : 0,
                  ypos = inline ? 0 : (diameter + lineSpacing) / 2;
              return 'translate(' + xpos + ',' + ypos + ')';
            });

        } else {

          collapsed = true;
          useScroll = true;

          legend
            .width(menuMargin.left + d3.max(keyWidths) + diameter + textGap + menuMargin.right)
            .height(margin.top + diameter + margin.top); //don't use bottom here because we want vertical centering

          legendHeight = menuMargin.top + diameter * keys + spacing * (keys - 1) + menuMargin.bottom;
          dropdownHeight = Math.min(containerHeight - legend.height(), legendHeight);

          clip
            .attr('x', 0.5 - menuMargin.top - radius)
            .attr('y', 0.5 - menuMargin.top - radius)
            .attr('width', legend.width())
            .attr('height', dropdownHeight);

          back
            .attr('x', 0.5)
            .attr('y', 0.5 + legend.height())
            .attr('width', legend.width())
            .attr('height', dropdownHeight)
            .attr('rx', 2)
            .attr('ry', 2)
            .attr('filter', backFilter)
            .style('opacity', legendOpen * 0.9)
            .style('display', legendOpen ? 'inline' : 'none');

          link
            .attr('transform', function(d, i) {
              var xpos = align === 'left' ? 0.5 : 0.5 + legend.width(),
                  ypos = margin.top + radius;
              return 'translate(' + xpos + ',' + ypos + ')';
            })
            .style('opacity', 1);

          mask
            .attr('clip-path', 'url(#sc-edge-clip-' + id + ')')
            .attr('transform', function(d, i) {
              var xpos = menuMargin.left + radius,
                  ypos = legend.height() + menuMargin.top + radius;
              return 'translate(' + xpos + ',' + ypos + ')';
            });

          g
            .style('opacity', legendOpen)
            .style('display', legendOpen ? 'inline' : 'none')
            .attr('transform', function(d, i) {
              var xpos = rtl ? d3.max(keyWidths) + radius : 0;
              return 'translate(' + xpos + ',0)';
            });

          series
            .attr('transform', function(d, i) {
              var ypos = i * (diameter + spacing);
              return 'translate(0,' + ypos + ')';
            });

          series.select('rect')
            .attr('x', function(d) {
              var w = (diameter + gutter) / 2 * sign(rtl);
              w -= rtl ? keyWidth(d.seriesIndex) : 0;
              return w;
            })
            .attr('width', function(d) {
              return keyWidth(d.seriesIndex);
            })
            .attr('height', diameter + lineSpacing);

          circles
            .attr('r', function(d) {
              return d.type === 'dash' ? 0 : d.type === 'line' ? radius - 2 : radius;
            })
            .attr('transform', '');

          lines
            .attr('x1', 16)
            .attr('transform', 'translate(-8,0)')
            .style('stroke-dasharray', function(d) {
              return d.type === 'dash' ? '6, 4, 6' : 'none';
            })
            .style('stroke-dashoffset', 0);

          texts
            .attr('text-anchor', 'start')
            .attr('dy', '.36em')
            .attr('transform', function(d) {
              var xpos = (radius + textGap) * sign(!rtl);
              return 'translate(' + xpos + ',0)';
            });

        }

        //------------------------------------------------------------
        // Enable scrolling
        if (scrollEnabled) {
          var diff = dropdownHeight - legendHeight;

          var assignScrollEvents = function(enable) {
            if (enable) {

              var zoom = d3.zoom()
                    .on('zoom', panLegend);
              var drag = d3.drag()
                    .subject(utils.identity)
                    .on('drag', panLegend);

              back.call(zoom);
              g.call(zoom);

              back.call(drag);
              g.call(drag);

            } else {

              back
                  .on("mousedown.zoom", null)
                  .on("mousewheel.zoom", null)
                  .on("mousemove.zoom", null)
                  .on("DOMMouseScroll.zoom", null)
                  .on("dblclick.zoom", null)
                  .on("touchstart.zoom", null)
                  .on("touchmove.zoom", null)
                  .on("touchend.zoom", null)
                  .on("wheel.zoom", null);
              g
                  .on("mousedown.zoom", null)
                  .on("mousewheel.zoom", null)
                  .on("mousemove.zoom", null)
                  .on("DOMMouseScroll.zoom", null)
                  .on("dblclick.zoom", null)
                  .on("touchstart.zoom", null)
                  .on("touchmove.zoom", null)
                  .on("touchend.zoom", null)
                  .on("wheel.zoom", null);

              back
                  .on("mousedown.drag", null)
                  .on("mousewheel.drag", null)
                  .on("mousemove.drag", null)
                  .on("DOMMouseScroll.drag", null)
                  .on("dblclick.drag", null)
                  .on("touchstart.drag", null)
                  .on("touchmove.drag", null)
                  .on("touchend.drag", null)
                  .on("wheel.drag", null);
              g
                  .on("mousedown.drag", null)
                  .on("mousewheel.drag", null)
                  .on("mousemove.drag", null)
                  .on("DOMMouseScroll.drag", null)
                  .on("dblclick.drag", null)
                  .on("touchstart.drag", null)
                  .on("touchmove.drag", null)
                  .on("touchend.drag", null)
                  .on("wheel.drag", null);
            }
          };

          var panLegend = function() {
            var distance = 0,
                overflowDistance = 0,
                translate = '',
                x = 0,
                y = 0;

            // don't fire on events other than zoom and drag
            // we need click for handling legend toggle
            if (d3.event) {
              if (d3.event.type === 'zoom' && d3.event.sourceEvent) {
                x = d3.event.sourceEvent.deltaX || 0;
                y = d3.event.sourceEvent.deltaY || 0;
                distance = (Math.abs(x) > Math.abs(y) ? x : y) * -1;
              } else if (d3.event.type === 'drag') {
                x = d3.event.dx || 0;
                y = d3.event.dy || 0;
                distance = y;
              } else if (d3.event.type !== 'click') {
                return 0;
              }
              overflowDistance = (Math.abs(y) > Math.abs(x) ? y : 0);
            }

            // reset value defined in panMultibar();
            scrollOffset = Math.min(Math.max(scrollOffset + distance, diff), 0);
            translate = 'translate(' + (rtl ? d3.max(keyWidths) + radius : 0) + ',' + scrollOffset + ')';

            if (scrollOffset + distance > 0 || scrollOffset + distance < diff) {
              overflowHandler(overflowDistance);
            }

            g.attr('transform', translate);
          };

          assignScrollEvents(useScroll);
        }

      };

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      function displayMenu() {
        back
          .style('opacity', legendOpen * 0.9)
          .style('display', legendOpen ? 'inline' : 'none');
        g
          .style('opacity', legendOpen)
          .style('display', legendOpen ? 'inline' : 'none');
        link
          .text(legendOpen === 1 ? legend.strings().close : legend.strings().open);
      }

      dispatch.on('toggleMenu', function(d) {
        d3.event.stopPropagation();
        legendOpen = 1 - legendOpen;
        displayMenu();
      });

      dispatch.on('closeMenu', function(d) {
        if (legendOpen === 1) {
          legendOpen = 0;
          displayMenu();
        }
      });

    });

    return legend;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  legend.dispatch = dispatch;

  legend.margin = function(_) {
    if (!arguments.length) { return margin; }
    margin.top    = typeof _.top    !== 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  !== 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom !== 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   !== 'undefined' ? _.left   : margin.left;
    return legend;
  };

  legend.width = function(_) {
    if (!arguments.length) {
      return width;
    }
    width = Math.round(_);
    return legend;
  };

  legend.height = function(_) {
    if (!arguments.length) {
      return height;
    }
    height = Math.round(_);
    return legend;
  };

  legend.id = function(_) {
    if (!arguments.length) {
      return id;
    }
    id = _;
    return legend;
  };

  legend.key = function(_) {
    if (!arguments.length) {
      return getKey;
    }
    getKey = _;
    return legend;
  };

  legend.color = function(_) {
    if (!arguments.length) {
      return color;
    }
    color = utils.getColor(_);
    return legend;
  };

  legend.classes = function(_) {
    if (!arguments.length) {
      return classes;
    }
    classes = _;
    return legend;
  };

  legend.align = function(_) {
    if (!arguments.length) {
      return align;
    }
    align = _;
    return legend;
  };

  legend.position = function(_) {
    if (!arguments.length) {
      return position;
    }
    position = _;
    return legend;
  };

  legend.showAll = function(_) {
    if (!arguments.length) { return showAll; }
    showAll = _;
    return legend;
  };

  legend.showMenu = function(_) {
    if (!arguments.length) { return showMenu; }
    showMenu = _;
    return legend;
  };

  legend.collapsed = function(_) {
    return collapsed;
  };

  legend.rowsCount = function(_) {
    if (!arguments.length) {
      return rowsCount;
    }
    rowsCount = _;
    return legend;
  };

  legend.spacing = function(_) {
    if (!arguments.length) {
      return spacing;
    }
    spacing = _;
    return legend;
  };

  legend.gutter = function(_) {
    if (!arguments.length) {
      return gutter;
    }
    gutter = _;
    return legend;
  };

  legend.radius = function(_) {
    if (!arguments.length) {
      return radius;
    }
    radius = _;
    return legend;
  };

  legend.strings = function(_) {
    if (!arguments.length) {
      return strings;
    }
    strings = _;
    return legend;
  };

  legend.equalColumns = function(_) {
    if (!arguments.length) {
      return equalColumns;
    }
    equalColumns = _;
    return legend;
  };

  legend.enabled = function(_) {
    if (!arguments.length) {
      return enabled;
    }
    enabled = _;
    return legend;
  };

  legend.direction = function(_) {
    if (!arguments.length) {
      return direction;
    }
    direction = _;
    return legend;
  };

  //============================================================


  return legend;
}

function funnel() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 960,
      height = 500,
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID in case user doesn't select one
      getX = function(d) { return d.x; },
      getY = function(d) { return d.y; },
      getH = function(d) { return d.height; },
      getKey = function(d) { return d.key; },
      getValue = function(d, i) { return d.value; },
      fmtKey = function(d) { return getKey(d.series || d); },
      fmtValue = function(d) { return getValue(d.series || d); },
      fmtCount = function(d) { return (' (' + (d.series.count || d.count) + ')').replace(' ()', ''); },
      locality = utils.buildLocality(),
      direction = 'ltr',
      delay = 0,
      duration = 0,
      color = function(d, i) { return utils.defaultColor()(d.series, d.seriesIndex); },
      fill = color,
      textureFill = false,
      classes = function(d, i) { return 'sc-series sc-series-' + d.seriesIndex; };

  var r = 0.3, // ratio of width to height (or slope)
      y = d3.scaleLinear(),
      yDomain,
      forceY = [0], // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do chart.forceY([]) to remove
      wrapLabels = true,
      minLabelWidth = 75,
      dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout', 'elementMousemove');

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  // These values are preserved between renderings
  var calculatedWidth = 0,
      calculatedHeight = 0,
      calculatedCenter = 0;

  //============================================================
  // Update chart

  function chart(selection) {
    selection.each(function(data) {

      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          container = d3.select(this);

      var labelGap = 5,
          labelSpace = 5,
          labelOffset = 0,
          funnelTotal = 0,
          funnelOffset = 0;

      //sum the values for each data element
      funnelTotal = d3.sum(data, function(d) { return d.value; });

      //set up the gradient constructor function
      chart.gradient = function(d, i, p) {
        return utils.colorLinearGradient(d, id + '-' + i, p, color(d, i), wrap.select('defs'));
      };

      //------------------------------------------------------------
      // Setup scales

      function calcDimensions() {
        calculatedWidth = calcWidth(funnelOffset);
        calculatedHeight = calcHeight();
        calculatedCenter = calcCenter(funnelOffset);
      }

      function calcScales() {
        var funnelArea = areaTrapezoid(calculatedHeight, calculatedWidth),
            funnelShift = 0,
            funnelMinHeight = 4,
            _base = calculatedWidth - 2 * r * calculatedHeight,
            _bottom = calculatedHeight;

        //------------------------------------------------------------
        // Adjust points to compensate for parallax of slice
        // by increasing height relative to area of funnel

        // runs from bottom to top
        data.forEach(function(series, i) {
          series.values.forEach(function(point) {

            point._height = funnelTotal > 0 ?
              heightTrapezoid(funnelArea * point.value / funnelTotal, _base) :
              0;

            //TODO: not working
            if (point._height < funnelMinHeight) {
              funnelShift += point._height - funnelMinHeight;
              point._height = funnelMinHeight;
            } else if (funnelShift < 0 && point._height + funnelShift > funnelMinHeight) {
              point._height += funnelShift;
              funnelShift = 0;
            }

            point._base = _base;
            point._bottom = _bottom;
            point._top = point._bottom - point._height;

            _base += 2 * r * point._height;
            _bottom -= point._height;
          });
        });

        // Remap and flatten the data for use in calculating the scales' domains
        //TODO: this is no longer needed
        var seriesData = yDomain || // if we know yDomain, no need to calculate
              d3.extent(
                d3.merge(
                  data.map(function(d) {
                    return d.values.map(function(d) {
                      return d._top;
                    });
                  })
                ).concat(forceY)
              );

        y .domain(seriesData)
          .range([calculatedHeight, 0]);
      }

      calcDimensions();
      calcScales();

      //------------------------------------------------------------
      // Setup containers and skeleton of chart
      var wrap_bind = container.selectAll('g.sc-wrap').data([data]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-wrap sc-funnel');
      var wrap = container.select('.sc-wrap').merge(wrap_entr);

      var defs_entr = wrap_entr.append('defs');

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      //------------------------------------------------------------
      // Definitions

      if (textureFill) {
        var mask = utils.createTexture(defs_entr, id);
      }

      //------------------------------------------------------------
      // Append major data series grouping containers

      var series_bind = wrap.selectAll('.sc-series').data(data, function(d) { return d.seriesIndex; });
      var series_entr = series_bind.enter().append('g').attr('class', 'sc-series');
      // series_bind.exit().transition().duration(duration)
      //   .selectAll('g.sc-slice')
      //   .delay(function(d, i) { return i * delay / data[0].values.length; })
      //     .attr('points', function(d) {
      //       return pointsTrapezoid(d, 0, calculatedWidth);
      //     })
      //     .style('stroke-opacity', 1e-6)
      //     .style('fill-opacity', 1e-6)
      //     .remove();
      // series_bind.exit().transition().duration(duration)
      //   .selectAll('g.sc-label-value')
      //   .delay(function(d, i) { return i * delay / data[0].values.length; })
      //     .attr('y', 0)
      //     .attr('transform', 'translate(' + calculatedCenter + ',0)')
      //     .style('stroke-opacity', 1e-6)
      //     .style('fill-opacity', 1e-6)
      //     .remove();
      series_bind.exit().remove();
      var series = wrap.selectAll('.sc-series').merge(series_entr);

      series_entr
        .style('stroke', '#FFF')
        .style('stroke-width', 2)
        .style('stroke-opacity', 1)
        .on('mouseover', function(d, i, j) { //TODO: figure out why j works above, but not here
          d3.select(this).classed('hover', true);
        })
        .on('mouseout', function(d, i, j) {
          d3.select(this).classed('hover', false);
        });

      series
        .attr('class', function(d) { return classes(d, d.seriesIndex); })
        .attr('fill', function(d) { return fill(d, d.seriesIndex); })
        .classed('sc-active', function(d) { return d.active === 'active'; })
        .classed('sc-inactive', function(d) { return d.active === 'inactive'; });

      series.transition().duration(duration)
          .style('stroke-opacity', 1)
          .style('fill-opacity', 1);

      //------------------------------------------------------------
      // Append polygons for funnel
      // Save for later...
      // function(s, i) {
      //   return s.values.map(function(v, j) {
      //     v.disabled = s.disabled;
      //     v.key = s.key;
      //     v.seriesIndex = s.seriesIndex;
      //     v.index = j;
      //     return v;
      //   });
      // },

      var slice_bind = series.selectAll('g.sc-slice')
            .data(function(d) { return d.values; }, function(d) { return d.seriesIndex; });
      slice_bind.exit().remove();
      var slice_entr = slice_bind.enter().append('g').attr('class', 'sc-slice');
      var slices = series.selectAll('g.sc-slice').merge(slice_entr);

      slice_entr.append('polygon')
        .attr('class', 'sc-base');

      slices.select('polygon.sc-base')
        .attr('points', function(d) {
          return pointsTrapezoid(d, 0, calculatedWidth);
        });

      if (textureFill) {
        // For on click active bars
        slice_entr.append('polygon')
          .attr('class', 'sc-texture')
          .style('mask', 'url(' + mask + ')');

        slices.select('polygon.sc-texture')
          .attr('points', function(d) {
            return pointsTrapezoid(d, 0, calculatedWidth);
          });
      }

      slice_entr
        .on('mouseover', function(d, i) {
          d3.select(this).classed('hover', true);
          var eo = buildEventObject(d3.event, d, i);
          dispatch.call('elementMouseover', this, eo);
        })
        .on('mousemove', function(d, i) {
          var e = d3.event;
          dispatch.call('elementMousemove', this, e);
        })
        .on('mouseout', function(d, i) {
          d3.select(this).classed('hover', false);
          dispatch.call('elementMouseout', this);
        })
        .on('click', function(d, i) {
          d3.event.stopPropagation();
          var eo = buildEventObject(d3.event, d, i);
          dispatch.call('elementClick', this, eo);
        })
        .on('dblclick', function(d, i) {
          d3.event.stopPropagation();
          var eo = buildEventObject(d3.event, d, i);
          dispatch.call('elementDblClick', this, eo);
        });

      //------------------------------------------------------------
      // Append containers for labels

      var labels_bind = series.selectAll('.sc-label-value')
            .data(function(d) { return d.values; }, function(d) { return d.seriesIndex; });
      labels_bind.exit().remove();
      var labels_entr = labels_bind.enter().append('g').attr('class', 'sc-label-value');
      var labels = series.selectAll('g.sc-label-value').merge(labels_entr);

      labels
        .attr('transform', 'translate(' + calculatedCenter + ',0)');

      var sideLabels = labels.filter('.sc-label-side');

      //------------------------------------------------------------
      // Update funnel labels

      function renderFunnelLabels() {
        // Remove responsive label elements
        labels.selectAll('polyline').remove();
        labels.selectAll('rect').remove();
        labels.selectAll('text').remove();

        labels.append('rect')
          .attr('class', 'sc-label-box')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', 0)
          .attr('height', 0)
          .attr('rx', 2)
          .attr('ry', 2)
          .style('pointer-events', 'none')
          .style('stroke-width', 0)
          .style('fill-opacity', 0);

        // Append label text and wrap if needed
        labels.append('text')
          .text(fmtKey)
            .call(fmtLabel, 'sc-label', 0.85, 'middle', fmtFill);

        labels.select('.sc-label')
          .call(
            handleLabel,
            (wrapLabels ? wrapLabel : ellipsifyLabel),
            calcFunnelWidthAtSliceMidpoint,
            function(txt, dy) {
              fmtLabel(txt, 'sc-label', dy, 'middle', fmtFill);
            }
          );

        // Append value and count text
        labels.append('text')
          .text(fmtValue)
            .call(fmtLabel, 'sc-value', 0.85, 'middle', fmtFill);

        labels.select('.sc-value')
          .append('tspan')
            .text(fmtCount);

        labels
          .call(positionValue)
          // Position labels and identify side labels
          .call(calcFunnelLabelDimensions)
          .call(positionLabelBox);

        labels
          .classed('sc-label-side', function(d) { return d.tooTall || d.tooWide; });
      }

      //------------------------------------------------------------
      // Update side labels

      function renderSideLabels() {
        // Remove all responsive elements
        sideLabels = labels.filter('.sc-label-side');
        sideLabels.selectAll('.sc-label').remove();
        sideLabels.selectAll('rect').remove();
        sideLabels.selectAll('polyline').remove();

        // Position side labels
        sideLabels.append('text')
          .text(fmtKey)
            .call(fmtLabel, 'sc-label', 0.85, 'start', '#555');

        sideLabels.select('.sc-label')
          .call(
            handleLabel,
            (wrapLabels ? wrapLabel : ellipsifyLabel),
            (wrapLabels ? calcSideWidth : maxSideLabelWidth),
            function(txt, dy) {
              fmtLabel(txt, 'sc-label', dy, 'start', '#555');
            }
          );

        sideLabels
          .call(positionValue);

        sideLabels.select('.sc-value')
          .style('text-anchor', 'start')
          .style('fill', '#555');

        sideLabels
          .call(calcSideLabelDimensions);

        // Reflow side label vertical position to prevent overlap
        var d0 = 0;

        // Top to bottom
        for (var groups = sideLabels.nodes(), j = groups.length - 1; j >= 0; --j) {
          var d = d3.select(groups[j]).data()[0];
          if (d) {
            if (!d0) {
              d.labelBottom = d.labelTop + d.labelHeight + labelSpace;
              d0 = d.labelBottom;
              continue;
            }

            d.labelTop = Math.max(d0, d.labelTop);
            d.labelBottom = d.labelTop + d.labelHeight + labelSpace;
            d0 = d.labelBottom;
          }
        }

        // And then...
        if (d0 && d0 - labelSpace > d3.max(y.range())) {

          d0 = 0;

          // Bottom to top
          for (var groups = sideLabels.nodes(), j = 0, m = groups.length; j < m; ++j) {
            var d = d3.select(groups[j]).data()[0];
            if (d) {
              if (!d0) {
                d.labelBottom = calculatedHeight - 1;
                d.labelTop = d.labelBottom - d.labelHeight;
                d0 = d.labelTop;
                continue;
              }

              d.labelBottom = Math.min(d0, d.labelBottom);
              d.labelTop = d.labelBottom - d.labelHeight - labelSpace;
              d0 = d.labelTop;
            }
          }

          // ok, FINALLY, so if we are above the top of the funnel,
          // we need to lower them all back down
          if (d0 < 0) {
            sideLabels.each(function(d, i) {
                d.labelTop -= d0;
                d.labelBottom -= d0;
              });
          }
        }

        d0 = 0;

        //------------------------------------------------------------
        // Recalculate funnel offset based on side label dimensions

        sideLabels
          .call(calcOffsets);
      }

      //------------------------------------------------------------
      // Calculate the width and position of labels which
      // determines the funnel offset dimension

      function renderLabels() {
        renderFunnelLabels();
        renderSideLabels();
      }

      renderLabels();
      calcDimensions();
      calcScales();

      // Calls twice since the first call may create a funnel offset
      // which decreases the funnel width which impacts label position

      renderLabels();
      calcDimensions();
      calcScales();

      renderLabels();
      calcDimensions();
      calcScales();

      //------------------------------------------------------------
      // Reposition responsive elements

      slices.select('.sc-base')
        .attr('points', function(d) {
          return pointsTrapezoid(d, 1, calculatedWidth);
        });

      if (textureFill) {
        slices.selectAll('.sc-texture')
          .attr('points', function(d) {
            return pointsTrapezoid(d, 1, calculatedWidth);
          })
          .style('fill', fmtFill);
      }

      labels
        .attr('transform', function(d) {
          var xTrans = d.tooTall ? 0 : calculatedCenter,
              yTrans = d.tooTall ? 0 : d.labelTop;
          return 'translate(' + xTrans + ',' + yTrans + ')';
        });

      sideLabels
        .attr('transform', function(d) {
          return 'translate(' + labelOffset + ',' + d.labelTop + ')';
        });

      sideLabels
        .append('polyline')
          .attr('class', 'sc-label-leader')
          .style('fill-opacity', 0)
          .style('stroke', '#999')
          .style('stroke-width', 1)
          .style('stroke-opacity', 0.5);

      sideLabels.selectAll('polyline')
        .call(pointsLeader);

      //------------------------------------------------------------
      // Utility functions

      // TODO: use scales instead of ratio algebra
      // var funnelScale = d3.scaleLinear()
      //       .domain([w / 2, minimum])
      //       .range([0, maxy1*thenscalethistopreventminimumfrompassing]);

      function buildEventObject(e, d, i) {
        return {
          id: id,
          key: fmtKey(d),
          value: fmtValue(d),
          count: fmtCount(d),
          data: d,
          series: d.series,
          e: e
        };
      }

      function wrapLabel(d, lbl, fnWidth, fmtLabel) {
        var text = lbl.text(),
            dy = parseFloat(lbl.attr('dy')),
            word,
            words = text.split(/\s+/).reverse(),
            line = [],
            lineNumber = 0,
            maxWidth = fnWidth(d, 0),
            parent = d3.select(lbl.node().parentNode);

        lbl.text(null);

        while (word = words.pop()) {
          line.push(word);
          lbl.text(line.join(' '));

          if (lbl.node().getComputedTextLength() > maxWidth && line.length > 1) {
            line.pop();
            lbl.text(line.join(' '));
            line = [word];
            lbl = parent.append('text');
            lbl.text(word)
              .call(fmtLabel, ++lineNumber * 1.1 + dy);
          }
        }
      }

      function handleLabel(lbls, fnFormat, fnWidth, fmtLabel) {
        lbls.each(function(d) {
          var lbl = d3.select(this);
          fnFormat(d, lbl, fnWidth, fmtLabel);
        });
      }

      function ellipsifyLabel(d, lbl, fnWidth, fmtLabel) {
        var text = lbl.text(),
            dy = parseFloat(lbl.attr('dy')),
            maxWidth = fnWidth(d);

        lbl.text(utils.stringEllipsify(text, container, maxWidth))
          .call(fmtLabel, dy);
      }

      function maxSideLabelWidth(d) {
        // overall width of container minus the width of funnel top
        // or minLabelWidth, which ever is greater
        // this is also now as funnelOffset (maybe)
        var twenty = Math.max(availableWidth - availableHeight / 1.1, minLabelWidth),
            // bottom of slice
            sliceBottom = d._bottom,
            // x component of slope F at y
            base = sliceBottom * r,
            // total width at bottom of slice
            maxWidth = twenty + base,
            // height of sloped leader
            leaderHeight = Math.abs(d.labelBottom - sliceBottom),
            // width of the angled leader
            leaderWidth = leaderHeight * r,
            // total width of leader
            leaderTotal = labelGap + leaderWidth + labelGap + labelGap,
            // this is the distance from end of label plus spacing to F
            iOffset = maxWidth - leaderTotal;

        return Math.max(iOffset, minLabelWidth);
      }

      function pointsTrapezoid(d, h, w) {
        //MATH: don't delete
        // v = 1/2 * h * (b + b + 2*r*h);
        // 2v = h * (b + b + 2*r*h);
        // 2v = h * (2*b + 2*r*h);
        // 2v = 2*b*h + 2*r*h*h;
        // v = b*h + r*h*h;
        // v - b*h - r*h*h = 0;
        // v/r - b*h/r - h*h = 0;
        // b/r*h + h*h + b/r/2*b/r/2 = v/r + b/r/2*b/r/2;
        // h*h + b/r*h + b/r/2*b/r/2 = v/r + b/r/2*b/r/2;
        // (h + b/r/2)(h + b/r/2) = v/r + b/r/2*b/r/2;
        // h + b/r/2 = Math.sqrt(v/r + b/r/2*b/r/2);
        // h  = Math.abs(Math.sqrt(v/r + b/r/2*b/r/2)) - b/r/2;
        var y0 = d._bottom,
            y1 = d._top,
            w0 = w / 2 - r * y0,
            w1 = w / 2 - r * y1,
            c = calculatedCenter;

        return (
          (c - w0) + ',' + (y0 * h) + ' ' +
          (c - w1) + ',' + (y1 * h) + ' ' +
          (c + w1) + ',' + (y1 * h) + ' ' +
          (c + w0) + ',' + (y0 * h)
        );
      }

      function heightTrapezoid(a, b) {
        var x = b / r / 2;
        return Math.abs(Math.sqrt(a / r + x * x)) - x;
      }

      function areaTrapezoid(h, w) {
        return h * (w - h * r);
      }

      function calcWidth(offset) {
        return Math.round(Math.max(Math.min(availableHeight / 1.1, availableWidth - offset), 40));
      }

      function calcHeight() {
        // MATH: don't delete
        // h = 666.666
        // w = 600
        // m = 200
        // at what height is m = 200
        // w = h * 0.3 = 666 * 0.3 = 200
        // maxheight = ((w - m) / 2) / 0.3 = (w - m) / 0.6 = h
        // (600 - 200) / 0.6 = 400 / 0.6 = 666
        return Math.min(calculatedWidth * 1.1, (calculatedWidth - calculatedWidth * r) / (2 * r));
      }

      function calcCenter(offset) {
        return calculatedWidth / 2 + offset;
      }

      function calcFunnelWidthAtSliceMidpoint(d) {
        var b = calculatedWidth,
            v = d._bottom - d._height / 2; // mid point of slice
        return b - v * r * 2;
      }

      function calcSideWidth(d, offset) {
        var b = Math.max((availableWidth - calculatedWidth) / 2, offset),
            v = d._top; // top of slice
        return b + v * r;
      }

      function calcLabelBBox(lbl) {
        return d3.select(lbl).node().getBoundingClientRect();
      }

      function calcFunnelLabelDimensions(lbls) {
        lbls.each(function(d) {
          var bbox = calcLabelBBox(this);

          d.labelHeight = bbox.height;
          d.labelWidth = bbox.width;
          d.labelTop = (d._bottom - d._height / 2) - d.labelHeight / 2;
          d.labelBottom = d.labelTop + d.labelHeight + labelSpace;
          d.tooWide = d.labelWidth > calcFunnelWidthAtSliceMidpoint(d);
          d.tooTall = d.labelHeight > d._height - 4;
        });
      }

      function calcSideLabelDimensions(lbls) {
        lbls.each(function(d) {
          var bbox = calcLabelBBox(this);

          d.labelHeight = bbox.height;
          d.labelWidth = bbox.width;
          d.labelTop = d._top;
          d.labelBottom = d.labelTop + d.labelHeight + labelSpace;
        });
      }

      function pointsLeader(polylines) {
        // Mess with this function at your peril.
        var c = polylines.size();

        // run top to bottom
        for (var groups = polylines.nodes(), i = groups.length - 1; i >= 0; --i) {
          var node = d3.select(groups[i]);
          var d = node.data()[0];
          var // previous label
              p = i < c - 1 ? d3.select(groups[i + 1]).data()[0] : null,
              // next label
              n = i ? d3.select(groups[i - 1]).data()[0] : null,
              // label height
              h = Math.round(d.labelHeight) + 0.5,
              // slice bottom
              t = Math.round(d._bottom - d.labelTop) - 0.5,
              // previous width
              wp = p ? p.labelWidth - (d.labelBottom - p.labelBottom) * r : 0,
              // current width
              wc = d.labelWidth,
              // next width
              wn = n && h < t ? n.labelWidth : 0,
              // final width
              w = Math.round(Math.max(wp, wc, wn)) + labelGap,
              // funnel edge
              f = Math.round(calcSideWidth(d, funnelOffset)) - labelOffset - labelGap;

          // polyline points
          var points = 0 + ',' + h + ' ' +
                 w + ',' + h + ' ' +
                 (w + Math.abs(h - t) * r) + ',' + t + ' ' +
                 f + ',' + t;

          // this will be overridding the label width in data
          // referenced above as p.labelWidth
          d.labelWidth = w;
          node.attr('points', points);
        }
      }

      function calcOffsets(lbls) {
        var sideWidth = (availableWidth - calculatedWidth) / 2, // natural width of side
            offset = 0;

        lbls.each(function(d) {
          var // bottom of slice
              sliceBottom = d._bottom,
              // is slice below or above label bottom
              scalar = d.labelBottom >= sliceBottom ? 1 : 0,
              // the width of the angled leader
              // from bottom right of label to bottom of slice
              leaderSlope = Math.abs(d.labelBottom + labelGap - sliceBottom) * r,
              // this is the x component of slope F at y
              base = sliceBottom * r,
              // this is the distance from end of label plus spacing to F
              iOffset = d.labelWidth + leaderSlope + labelGap * 3 - base;
          // if this label sticks out past F
          if (iOffset >= offset) {
            // this is the minimum distance for F
            // has to be away from the left edge of labels
            offset = iOffset;
          }
        });

        // how far from chart edge is label left edge
        offset = Math.round(offset * 10) / 10;

        // there are three states:
        if (offset <= 0) {
        // 1. no label sticks out past F
          labelOffset = sideWidth;
          funnelOffset = sideWidth;
        } else if (offset > 0 && offset < sideWidth) {
        // 2. iOffset is > 0 but < sideWidth
          labelOffset = sideWidth - offset;
          funnelOffset = sideWidth;
        } else {
        // 3. iOffset is >= sideWidth
          labelOffset = 0;
          funnelOffset = offset;
        }
      }

      function fmtFill(d, i, j) {
        var backColor = d3.select(this.parentNode).style('fill');
        return utils.getTextContrast(backColor, i);
      }

      function fmtDirection(d) {
        var m = utils.isRTLChar(d.slice(-1)),
            dir = m ? 'rtl' : 'ltr';
        return 'ltr';
      }

      function fmtLabel(txt, classes, dy, anchor, fill) {
        txt
          .attr('x', 0)
          .attr('y', 0)
          .attr('dy', dy + 'em')
          .attr('class', classes)
          .attr('direction', function() {
            return fmtDirection(txt.text());
          })
          .style('pointer-events', 'none')
          .style('text-anchor', anchor)
          .style('fill', fill);
      }

      function positionValue(lbls) {
        lbls.each(function(d) {
          var lbl = d3.select(this);
          var cnt = lbl.selectAll('.sc-label').size() + 1;
          var dy = (.85 + cnt - 1) + 'em';
          lbl.select('.sc-value')
            .attr('dy', dy);
        });
      }

      function positionLabelBox(lbls) {
        lbls.each(function(d, i) {
          var lbl = d3.select(this);

          lbl.select('.sc-label-box')
            .attr('x', (d.labelWidth + 6) / -2)
            .attr('y', -2)
            .attr('width', d.labelWidth + 6)
            .attr('height', d.labelHeight + 4)
            .attr('rx', 2)
            .attr('ry', 2)
            .style('fill-opacity', 1);
        });
      }

    });

    return chart;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;

  chart.id = function(_) {
    if (!arguments.length) {
      return id;
    }
    id = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) {
      return color;
    }
    color = _;
    return chart;
  };
  chart.fill = function(_) {
    if (!arguments.length) {
      return fill;
    }
    fill = _;
    return chart;
  };
  chart.classes = function(_) {
    if (!arguments.length) {
      return classes;
    }
    classes = _;
    return chart;
  };
  chart.gradient = function(_) {
    if (!arguments.length) {
      return gradient;
    }
    chart.gradient = _;
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) {
      return margin;
    }
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) {
      return width;
    }
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) {
      return height;
    }
    height = _;
    return chart;
  };

  chart.x = function(_) {
    if (!arguments.length) {
      return getX;
    }
    getX = _;
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) {
      return getY;
    }
    getY = utils.functor(_);
    return chart;
  };

  chart.getKey = function(_) {
    if (!arguments.length) {
      return getKey;
    }
    getKey = _;
    return chart;
  };

  chart.getValue = function(_) {
    if (!arguments.length) {
      return getValue;
    }
    getValue = _;
    return chart;
  };

  chart.fmtKey = function(_) {
    if (!arguments.length) {
      return fmtKey;
    }
    fmtKey = _;
    return chart;
  };

  chart.fmtValue = function(_) {
    if (!arguments.length) {
      return fmtValue;
    }
    fmtValue = _;
    return chart;
  };

  chart.fmtCount = function(_) {
    if (!arguments.length) {
      return fmtCount;
    }
    fmtCount = _;
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) {
      return direction;
    }
    direction = _;
    return chart;
  };

  chart.delay = function(_) {
    if (!arguments.length) {
      return delay;
    }
    delay = _;
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) {
      return duration;
    }
    duration = _;
    return chart;
  };

  chart.textureFill = function(_) {
    if (!arguments.length) {
      return textureFill;
    }
    textureFill = _;
    return chart;
  };

  chart.locality = function(_) {
    if (!arguments.length) {
      return locality;
    }
    locality = utils.buildLocality(_);
    return chart;
  };

  chart.xScale = function(_) {
    if (!arguments.length) {
      return x;
    }
    x = _;
    return chart;
  };

  chart.yScale = function(_) {
    if (!arguments.length) {
      return y;
    }
    y = _;
    return chart;
  };

  chart.yDomain = function(_) {
    if (!arguments.length) {
      return yDomain;
    }
    yDomain = _;
    return chart;
  };

  chart.forceY = function(_) {
    if (!arguments.length) {
      return forceY;
    }
    forceY = _;
    return chart;
  };

  chart.wrapLabels = function(_) {
    if (!arguments.length) {
      return wrapLabels;
    }
    wrapLabels = _;
    return chart;
  };

  chart.minLabelWidth = function(_) {
    if (!arguments.length) {
      return minLabelWidth;
    }
    minLabelWidth = _;
    return chart;
  };

  //============================================================

  return chart;
}

// export {default as gauge} from './gauge.js';
// export {default as line} from './line.js';
// export {default as multiBar} from './multiBar.js';
// export {default as pie} from './pie.js';
// export {default as scatter} from './scatter.js';
// export {default as scroll} from './scroll.js';
// export {default as stackedArea} from './stackedArea.js';
// export {default as table} from './table.js';
// export {default as tree} from './tree.js';
// export {default as treemap} from './treemap.js';

// import * as models from './models.js';
// import funnel as models.funnel from './models.js';

function funnelChart() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 10, right: 10, bottom: 10, left: 10},
      width = null,
      height = null,
      showTitle = false,
      showControls = false,
      showLegend = true,
      direction = 'ltr',
      delay = 0,
      duration = 0,
      tooltip = null,
      tooltips = true,
      state = {},
      strings = {
        legend: {close: 'Hide legend', open: 'Show legend'},
        controls: {close: 'Hide controls', open: 'Show controls'},
        noData: 'No Data Available.',
        noLabel: 'undefined'
      },
      dispatch = d3.dispatch('chartClick', 'elementClick', 'tooltipShow', 'tooltipHide', 'tooltipMove', 'stateChange', 'changeState');

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var funnel = models.funnel(),
      model = funnel,
      controls = models.legend().align('center'),
      legend = models.legend().align('center');

  var tooltipContent = function(key, x, y, e, graph) {
        return '<h3>' + key + '</h3>' +
               '<p>' + y + ' on ' + x + '</p>';
      };

  var showTooltip = function(eo, offsetElement, properties) {
        var key = model.getKey()(eo),
            y = model.getValue()(eo),
            x = properties.total ? (y * 100 / properties.total).toFixed(1) : 100,
            content = tooltipContent(key, x, y, eo, chart);

        return tooltip.show(eo.e, content, null, null, offsetElement);
      };

  var seriesClick = function(data, e, chart) { return; };

  //============================================================

  function chart(selection) {

    selection.each(function(chartData) {

      var that = this,
          container = d3.select(this),
          modelClass = 'funnel';

      var properties = chartData ? chartData.properties : {},
          data = chartData ? chartData.data : null;

      var containerWidth = parseInt(container.style('width'), 10),
          containerHeight = parseInt(container.style('height'), 10);

      var xIsDatetime = chartData.properties.xDataType === 'datetime' || false,
          yIsCurrency = chartData.properties.yDataType === 'currency' || false;

      chart.update = function() {
        container.transition().duration(duration).call(chart);
      };

      chart.container = this;

      //------------------------------------------------------------
      // Private method for displaying no data message.

      function displayNoData(d) {
        var hasData = d && d.length,
            x = (containerWidth - margin.left - margin.right) / 2 + margin.left,
            y = (containerHeight - margin.top - margin.bottom) / 2 + margin.top;
        return utils.displayNoData(hasData, container, chart.strings().noData, x, y);
      }

      // Check to see if there's nothing to show.
      if (displayNoData(data)) {
        return chart;
      }

      //------------------------------------------------------------
      // Process data

      chart.dataSeriesActivate = function(eo) {
        var series = eo.series;

        series.active = (!series.active || series.active === 'inactive') ? 'active' : 'inactive';

        // if you have activated a data series, inactivate the rest
        if (series.active === 'active') {
          data
            .filter(function(d) {
              return d.active !== 'active';
            })
            .map(function(d) {
              d.active = 'inactive';
              return d;
            });
        }

        // if there are no active data series, inactivate them all
        if (!data.filter(function(d) { return d.active === 'active'; }).length) {
          data.map(function(d) {
            d.active = '';
            return d;
          });
        }

        container.call(chart);
      };

      // add series index to each data point for reference
      data.forEach(function(s, i) {
        var y = model.y();
        s.seriesIndex = i;

        if (!s.value && !s.values) {
          s.values = [];
        } else if (!isNaN(s.value)) {
          s.values = [{x: 0, y: parseInt(s.value, 10)}];
        }
        s.values.forEach(function(p, j) {
          p.index = j;
          p.series = s;
          if (typeof p.value == 'undefined') {
            p.value = y(p);
          }
        });

        s.value = s.value || d3.sum(s.values, function(p) { return p.value; });
        s.count = s.count || s.values.length;
        s.disabled = s.disabled || s.value === 0;
      });

      // only sum enabled series
      var modelData = data.filter(function(d, i) { return !d.disabled; });

      if (!modelData.length) {
        modelData = [{values: []}]; // safety array
      }

      properties.count = d3.sum(modelData, function(d) { return d.count; });

      properties.total = d3.sum(modelData, function(d) { return d.value; });

      // set title display option
      showTitle = showTitle && properties.title.length;

      //set state.disabled
      state.disabled = data.map(function(d) { return !!d.disabled; });

      //------------------------------------------------------------
      // Display No Data message if there's nothing to show.

      if (!properties.total) {
        displayNoData();
        return chart;
      }

      //------------------------------------------------------------
      // Main chart wrappers

      var wrap_bind = container.selectAll('g.sc-chart-wrap').data([modelData]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-chart-wrap sc-chart-' + modelClass);
      var wrap = container.select('.sc-chart-wrap').merge(wrap_entr);

      wrap_entr.append('rect').attr('class', 'sc-background')
        .attr('x', -margin.left)
        .attr('y', -margin.top)
        .attr('fill', '#FFF');

      wrap_entr.append('g').attr('class', 'sc-title-wrap');
      var title_wrap = wrap.select('.sc-title-wrap');

      wrap_entr.append('g').attr('class', 'sc-' + modelClass + '-wrap');
      var model_wrap = wrap.select('.sc-' + modelClass + '-wrap');

      wrap_entr.append('g').attr('class', 'sc-controls-wrap');
      var controls_wrap = wrap.select('.sc-controls-wrap');
      wrap_entr.append('g').attr('class', 'sc-legend-wrap');
      var legend_wrap = wrap.select('.sc-legend-wrap');

      //------------------------------------------------------------
      // Main chart draw

      chart.render = function() {

        // Chart layout variables
        var renderWidth, renderHeight,
            availableWidth, availableHeight,
            innerMargin,
            innerWidth, innerHeight;

        containerWidth = parseInt(container.style('width'), 10);
        containerHeight = parseInt(container.style('height'), 10);

        renderWidth = width || containerWidth || 960;
        renderHeight = height || containerHeight || 400;

        availableWidth = renderWidth - margin.left - margin.right;
        availableHeight = renderHeight - margin.top - margin.bottom;

        innerMargin = {top: 0, right: 0, bottom: 0, left: 0};
        innerWidth = availableWidth - innerMargin.left - innerMargin.right;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;

        wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        wrap.select('.sc-background')
          .attr('width', renderWidth)
          .attr('height', renderHeight);

        //------------------------------------------------------------
        // Title & Legend & Controls

        // Header variables
        var maxControlsWidth = 0,
            maxLegendWidth = 0,
            widthRatio = 0,
            headerHeight = 0,
            titleBBox = {width: 0, height: 0},
            controlsHeight = 0,
            legendHeight = 0,
            trans = '';

        title_wrap.select('.sc-title').remove();

        if (showTitle) {
          title_wrap
            .append('text')
              .attr('class', 'sc-title')
              .attr('x', direction === 'rtl' ? availableWidth : 0)
              .attr('y', 0)
              .attr('dy', '.75em')
              .attr('text-anchor', 'start')
              .attr('stroke', 'none')
              .attr('fill', 'black')
              .text(properties.title);

          titleBBox = utils.getTextBBox(title_wrap.select('.sc-title'));
          headerHeight += titleBBox.height;
        }

        if (showLegend) {
          legend
            .id('legend_' + chart.id())
            .strings(chart.strings().legend)
            .align('center')
            .height(availableHeight - innerMargin.top);
          legend_wrap
            .datum(data)
            .call(legend);
          legend
            .arrange(availableWidth);

          var legendLinkBBox = utils.getTextBBox(legend_wrap.select('.sc-legend-link')),
              legendSpace = availableWidth - titleBBox.width - 6,
              legendTop = showTitle && legend.collapsed() && legendSpace > legendLinkBBox.width ? true : false,
              xpos = direction === 'rtl' || !legend.collapsed() ? 0 : availableWidth - legend.width(),
              ypos = titleBBox.height;

          if (legendTop) {
            ypos = titleBBox.height - legend.height() / 2 - legendLinkBBox.height / 2;
          } else if (!showTitle) {
            ypos = - legend.margin().top;
          }

          legend_wrap
            .attr('transform', 'translate(' + xpos + ',' + ypos + ')');

          legendHeight = legendTop ? 12 : legend.height() - (showTitle ? 0 : legend.margin().top);
        }

        // Recalc inner margins based on title and legend height
        headerHeight += legendHeight;
        innerMargin.top += headerHeight;
        innerHeight = availableHeight - innerMargin.top - innerMargin.bottom;
        innerWidth = availableWidth - innerMargin.left - innerMargin.right;

        //------------------------------------------------------------
        // Main Chart Component(s)

        model
          .width(innerWidth)
          .height(innerHeight);

        model_wrap
          .datum(modelData)
          .attr('transform', 'translate(' + innerMargin.left + ',' + innerMargin.top + ')')
          .transition().duration(duration)
            .call(model);

      };

      //============================================================

      chart.render();

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      legend.dispatch.on('legendClick', function(d, i) {
        d.disabled = !d.disabled;
        d.active = false;

        // if there are no enabled data series, enable them all
        if (!data.filter(function(d) { return !d.disabled; }).length) {
          data.map(function(d) {
            d.disabled = false;
            return d;
          });
        }

        // if there are no active data series, activate them all
        if (!data.filter(function(d) { return d.active === 'active'; }).length) {
          data.map(function(d) {
            d.active = '';
            return d;
          });
        }

        state.disabled = data.map(function(d) { return !!d.disabled; });
        dispatch.call('stateChange', this, state);

        container.transition().duration(duration).call(chart);
      });

      dispatch.on('tooltipShow', function(eo) {
        if (tooltips) {
          tooltip = showTooltip(eo, that.parentNode, properties);
        }
      });

      dispatch.on('tooltipMove', function(e) {
        if (tooltip) {
          tooltip.position(that.parentNode, tooltip, e);
        }
      });

      dispatch.on('tooltipHide', function() {
        if (tooltips) {
          tooltip.cleanup();
        }
      });

      // Update chart from a state object passed to event handler
      dispatch.on('changeState', function(eo) {
        if (typeof eo.disabled !== 'undefined') {
          modelData.forEach(function(series, i) {
            series.disabled = eo.disabled[i];
          });
          state.disabled = eo.disabled;
        }

        container.transition().duration(duration).call(chart);
      });

      dispatch.on('chartClick', function() {
        //dispatch.call('tooltipHide', this);
        if (controls.enabled()) {
          controls.dispatch.call('closeMenu', this);
        }
        if (legend.enabled()) {
          legend.dispatch.call('closeMenu', this);
        }
      });

      model.dispatch.on('elementClick', function(eo) {
        dispatch.call('chartClick', this);
        seriesClick(data, eo, chart);
      });

    });

    return chart;
  }

  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  model.dispatch.on('elementMouseover.tooltip', function(eo) {
    dispatch.call('tooltipShow', this, eo);
  });

  model.dispatch.on('elementMousemove.tooltip', function(e) {
    dispatch.call('tooltipMove', this, e);
  });

  model.dispatch.on('elementMouseout.tooltip', function() {
    dispatch.call('tooltipHide', this);
  });

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.dispatch = dispatch;
  chart.funnel = funnel;
  chart.legend = legend;
  chart.controls = controls;

  fc.rebind(chart, model, 'id', 'x', 'y', 'color', 'fill', 'classes', 'gradient', 'locality', 'textureFill');
  fc.rebind(chart, model, 'getKey', 'getValue', 'fmtKey', 'fmtValue', 'fmtCount');
  fc.rebind(chart, funnel, 'xScale', 'yScale', 'yDomain', 'forceY', 'wrapLabels', 'minLabelWidth');

  chart.colorData = function(_) {
    var type = arguments[0],
        params = arguments[1] || {};
    var color = function(d, i) {
          return utils.defaultColor()(d, d.seriesIndex);
        };
    var classes = function(d, i) {
          return 'sc-series sc-series-' + d.seriesIndex;
        };

    switch (type) {
      case 'graduated':
        color = function(d, i) {
          return d3.interpolateHsl(d3.rgb(params.c1), d3.rgb(params.c2))(d.seriesIndex / params.l);
        };
        break;
      case 'class':
        color = function() {
          return 'inherit';
        };
        classes = function(d, i) {
          var iClass = (d.seriesIndex * (params.step || 1)) % 14;
          iClass = (iClass > 9 ? '' : '0') + iClass;
          return 'sc-series sc-series-' + d.seriesIndex + ' sc-fill' + iClass;
        };
        break;
      case 'data':
        color = function(d, i) {
          return utils.defaultColor()(d, d.seriesIndex);
        };
        classes = function(d, i) {
          return 'sc-series sc-series-' + d.seriesIndex + (d.classes ? ' ' + d.classes : '');
        };
        break;
    }

    var fill = (!params.gradient) ? color : function(d, i) {
      var p = {orientation: params.orientation || 'vertical', position: params.position || 'middle'};
      return model.gradient(d, d.seriesIndex, p);
    };

    model.color(color);
    model.fill(fill);
    model.classes(classes);

    legend.color(color);
    legend.classes(classes);

    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) { return margin; }
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        margin[prop] = _[prop];
      }
    }
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) { return width; }
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) { return height; }
    height = _;
    return chart;
  };

  chart.showTitle = function(_) {
    if (!arguments.length) { return showTitle; }
    showTitle = _;
    return chart;
  };

  chart.showControls = function(_) {
    if (!arguments.length) { return showControls; }
    showControls = _;
    return chart;
  };

  chart.showLegend = function(_) {
    if (!arguments.length) { return showLegend; }
    showLegend = _;
    return chart;
  };

  chart.tooltip = function(_) {
    if (!arguments.length) { return tooltip; }
    tooltip = _;
    return chart;
  };

  chart.tooltips = function(_) {
    if (!arguments.length) { return tooltips; }
    tooltips = _;
    return chart;
  };

  chart.tooltipContent = function(_) {
    if (!arguments.length) { return tooltipContent; }
    tooltipContent = _;
    return chart;
  };

  chart.state = function(_) {
    if (!arguments.length) { return state; }
    state = _;
    return chart;
  };

  chart.strings = function(_) {
    if (!arguments.length) { return strings; }
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        strings[prop] = _[prop];
      }
    }
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    model.direction(_);
    legend.direction(_);
    controls.direction(_);
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) { return duration; }
    duration = _;
    model.duration(_);
    return chart;
  };

  chart.delay = function(_) {
    if (!arguments.length) { return delay; }
    delay = _;
    model.delay(_);
    return chart;
  };

  chart.seriesClick = function(_) {
    if (!arguments.length) {
      return seriesClick;
    }
    seriesClick = _;
    return chart;
  };

  chart.colorFill = function(_) {
    return chart;
  };

  //============================================================

  return chart;
}

// export {default as bubbleChart} from './bubbleChart.js';

// export {default as gaugeChart} from './gaugeChart.js';
// export {default as globeChart} from './globe.js';
// export {default as lineChart} from './lineChart.js';
// export {default as multiBarChart} from './multiBarChart.js';
// export {default as paretoChart} from './paretoChart.js';
// export {default as pieChart} from './pieChart.js';
// export {default as stackedAreaChart} from './stackedAreaChart.js';
// export {default as treemapChart} from './treemapChart.js';

var ver = '0.0.2'; //change to 0.0.3 when ready
var dev = false; //set false when in production

// export {* as models} from './models/models.js';
// export {* as charts} from './models/charts.js';
// export {models as models};
// export {charts as charts};


// export {default as axis} from './models/axis.js';
// export {default as funnel} from './models/funnel.js';
// export {default as gauge} from './models/gauge.js';
// export {default as line} from './models/line.js';
// export {default as multiBar} from './models/multiBar.js';
// export {default as pie} from './models/pie.js';
// export {default as stackedArea} from './models/stackedArea.js';
// export {default as scatter} from './models/scatter.js';
// export {default as scroll} from './models/scroll.js';
// export {default as table} from './models/table.js';
// export {default as tree} from './models/tree.js';
// export {default as treemap} from './models/treemap.js';

// export {default as bubbleChart} from './models/bubbleChart.js';
// export {default as funnelChart} from './models/funnelChart.js';
// export {default as gaugeChart} from './models/gaugeChart.js';
// export {default as globeChart} from './models/globe.js';
// export {default as lineChart} from './models/lineChart.js';
// export {default as multiBarChart} from './models/multiBarChart.js';
// export {default as paretoChart} from './models/paretoChart.js';
// export {default as pieChart} from './models/pieChart.js';
// export {default as stackedAreaChart} from './models/stackedAreaChart.js';
// export {default as treemapChart} from './models/treemapChart.js';

exports.version = ver;
exports.development = dev;
exports.utils = utils;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3Vjcm9zZS5qcyIsInNvdXJjZXMiOlsiLi4vc3JjL3V0aWxzLmpzIiwiLi4vc3JjL21vZGVscy9sZWdlbmQuanMiLCIuLi9zcmMvbW9kZWxzL2Z1bm5lbC5qcyIsIi4uL3NyYy9tb2RlbHMvbW9kZWxzLmpzIiwiLi4vc3JjL21vZGVscy9mdW5uZWxDaGFydC5qcyIsIi4uL3NyYy9tb2RlbHMvY2hhcnRzLmpzIiwiLi4vc3JjL21haW4uanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGQzIGZyb20gJ2QzJztcbi8vIGltcG9ydCAqIGFzIGQzIGZyb20gJ2QzJztcblxudmFyIHV0aWxzID0ge307XG5cbnV0aWxzLnN0cmlwID0gZnVuY3Rpb24ocykge1xuICByZXR1cm4gcy5yZXBsYWNlKC8oXFxzfCYpL2csJycpO1xufTtcblxudXRpbHMuaWRlbnRpdHkgPSBmdW5jdGlvbihkKSB7XG4gIHJldHVybiBkO1xufTtcblxudXRpbHMuZnVuY3RvciA9IGZ1bmN0aW9uIGZ1bmN0b3Iodikge1xuICByZXR1cm4gdHlwZW9mIHYgPT09IFwiZnVuY3Rpb25cIiA/IHYgOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdjtcbiAgfTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHV0aWxzO1xuLy8gZXhwb3J0IHt1dGlscyBhcyBkZWZhdWx0fTtcbiIsImltcG9ydCBkMyBmcm9tICdkMyc7XG5pbXBvcnQgdXRpbHMgZnJvbSAnLi4vdXRpbHMuanMnO1xuLy8gaW1wb3J0IHNjcm9sbCBmcm9tICcuL3Njcm9sbC5qcyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBsZWdlbmQoKSB7XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gUHVibGljIFZhcmlhYmxlcyB3aXRoIERlZmF1bHQgU2V0dGluZ3NcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICB2YXIgbWFyZ2luID0ge3RvcDogMTAsIHJpZ2h0OiAxMCwgYm90dG9tOiAxNSwgbGVmdDogMTB9LFxuICAgICAgd2lkdGggPSAwLFxuICAgICAgaGVpZ2h0ID0gMCxcbiAgICAgIGFsaWduID0gJ3JpZ2h0JyxcbiAgICAgIGRpcmVjdGlvbiA9ICdsdHInLFxuICAgICAgcG9zaXRpb24gPSAnc3RhcnQnLFxuICAgICAgcmFkaXVzID0gNiwgLy8gc2l6ZSBvZiBkb3RcbiAgICAgIGRpYW1ldGVyID0gcmFkaXVzICogMiwgLy8gZGlhbXRlciBvZiBkb3QgcGx1cyBzdHJva2VcbiAgICAgIGd1dHRlciA9IDEwLCAvLyBob3Jpem9udGFsIGdhcCBiZXR3ZWVuIGtleXNcbiAgICAgIHNwYWNpbmcgPSAxMiwgLy8gdmVydGljYWwgZ2FwIGJldHdlZW4ga2V5c1xuICAgICAgdGV4dEdhcCA9IDUsIC8vIGdhcCBiZXR3ZWVuIGRvdCBhbmQgbGFiZWwgYWNjb3VudGluZyBmb3IgZG90IHN0cm9rZVxuICAgICAgZXF1YWxDb2x1bW5zID0gdHJ1ZSxcbiAgICAgIHNob3dBbGwgPSBmYWxzZSxcbiAgICAgIHNob3dNZW51ID0gZmFsc2UsXG4gICAgICBjb2xsYXBzZWQgPSBmYWxzZSxcbiAgICAgIHJvd3NDb3VudCA9IDMsIC8vbnVtYmVyIG9mIHJvd3MgdG8gZGlzcGxheSBpZiBzaG93QWxsID0gZmFsc2VcbiAgICAgIGVuYWJsZWQgPSBmYWxzZSxcbiAgICAgIHN0cmluZ3MgPSB7XG4gICAgICAgIGNsb3NlOiAnSGlkZSBsZWdlbmQnLFxuICAgICAgICB0eXBlOiAnU2hvdyBsZWdlbmQnLFxuICAgICAgICBub0xhYmVsOiAndW5kZWZpbmVkJ1xuICAgICAgfSxcbiAgICAgIGlkID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMDApLCAvL0NyZWF0ZSBzZW1pLXVuaXF1ZSBJRCBpbiBjYXNlIHVzZXIgZG9lc24ndCBzZWxlY3Qgb25lXG4gICAgICBnZXRLZXkgPSBmdW5jdGlvbihkKSB7XG4gICAgICAgIHJldHVybiBkLmtleS5sZW5ndGggPiAwIHx8ICghaXNOYU4ocGFyc2VGbG9hdChkLmtleSkpICYmIGlzRmluaXRlKGQua2V5KSkgPyBkLmtleSA6IGxlZ2VuZC5zdHJpbmdzKCkubm9MYWJlbDtcbiAgICAgIH0sXG4gICAgICBjb2xvciA9IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgcmV0dXJuIHV0aWxzLmRlZmF1bHRDb2xvcigpKGQsIGQuc2VyaWVzSW5kZXgpO1xuICAgICAgfSxcbiAgICAgIGNsYXNzZXMgPSBmdW5jdGlvbihkKSB7XG4gICAgICAgIHJldHVybiAnc2Mtc2VyaWVzIHNjLXNlcmllcy0nICsgZC5zZXJpZXNJbmRleDtcbiAgICAgIH0sXG4gICAgICBkaXNwYXRjaCA9IGQzLmRpc3BhdGNoKCdsZWdlbmRDbGljaycsICdsZWdlbmRNb3VzZW92ZXInLCAnbGVnZW5kTW91c2VvdXQnLCAndG9nZ2xlTWVudScsICdjbG9zZU1lbnUnKTtcblxuICAvLyBQcml2YXRlIFZhcmlhYmxlc1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHZhciBsZWdlbmRPcGVuID0gMDtcblxuICB2YXIgdXNlU2Nyb2xsID0gZmFsc2UsXG4gICAgICBzY3JvbGxFbmFibGVkID0gdHJ1ZSxcbiAgICAgIHNjcm9sbE9mZnNldCA9IDAsXG4gICAgICBvdmVyZmxvd0hhbmRsZXIgPSBmdW5jdGlvbihkKSB7IHJldHVybjsgfTtcblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gIGZ1bmN0aW9uIGxlZ2VuZChzZWxlY3Rpb24pIHtcblxuICAgIHNlbGVjdGlvbi5lYWNoKGZ1bmN0aW9uKGRhdGEpIHtcblxuICAgICAgdmFyIGNvbnRhaW5lciA9IGQzLnNlbGVjdCh0aGlzKSxcbiAgICAgICAgICBjb250YWluZXJXaWR0aCA9IHdpZHRoLFxuICAgICAgICAgIGNvbnRhaW5lckhlaWdodCA9IGhlaWdodCxcbiAgICAgICAgICBrZXlXaWR0aHMgPSBbXSxcbiAgICAgICAgICBsZWdlbmRIZWlnaHQgPSAwLFxuICAgICAgICAgIGRyb3Bkb3duSGVpZ2h0ID0gMCxcbiAgICAgICAgICB0eXBlID0gJycsXG4gICAgICAgICAgaW5saW5lID0gcG9zaXRpb24gPT09ICdzdGFydCcgPyB0cnVlIDogZmFsc2UsXG4gICAgICAgICAgcnRsID0gZGlyZWN0aW9uID09PSAncnRsJyA/IHRydWUgOiBmYWxzZSxcbiAgICAgICAgICBsaW5lU3BhY2luZyA9IHNwYWNpbmcgKiAoaW5saW5lID8gMSA6IDAuNiksXG4gICAgICAgICAgcGFkZGluZyA9IGd1dHRlciArIChpbmxpbmUgPyBkaWFtZXRlciArIHRleHRHYXAgOiAwKTtcblxuICAgICAgaWYgKCFkYXRhIHx8ICFkYXRhLmxlbmd0aCB8fCAhZGF0YS5maWx0ZXIoZnVuY3Rpb24oZCkgeyByZXR1cm4gIWQudmFsdWVzIHx8IGQudmFsdWVzLmxlbmd0aDsgfSkubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBsZWdlbmQ7XG4gICAgICB9XG5cbiAgICAgIC8vIGVuZm9yY2UgZXhpc3RlbmNlIG9mIHNlcmllcyBmb3Igc3RhdGljIGxlZ2VuZCBrZXlzXG4gICAgICB2YXIgaVNlcmllcyA9IGRhdGEuZmlsdGVyKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuaGFzT3duUHJvcGVydHkoJ3Nlcmllc0luZGV4Jyk7IH0pLmxlbmd0aDtcbiAgICAgIGRhdGEuZmlsdGVyKGZ1bmN0aW9uKGQpIHsgcmV0dXJuICFkLmhhc093blByb3BlcnR5KCdzZXJpZXNJbmRleCcpOyB9KS5tYXAoZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICBkLnNlcmllc0luZGV4ID0gaVNlcmllcztcbiAgICAgICAgaVNlcmllcyArPSAxO1xuICAgICAgfSk7XG5cbiAgICAgIGVuYWJsZWQgPSB0cnVlO1xuXG4gICAgICB0eXBlID0gIWRhdGFbMF0udHlwZSB8fCBkYXRhWzBdLnR5cGUgPT09ICdiYXInID8gJ2JhcicgOiAnbGluZSc7XG4gICAgICBhbGlnbiA9IHJ0bCAmJiBhbGlnbiAhPT0gJ2NlbnRlcicgPyBhbGlnbiA9PT0gJ2xlZnQnID8gJ3JpZ2h0JyA6ICdsZWZ0JyA6IGFsaWduO1xuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgLy8gU2V0dXAgY29udGFpbmVycyBhbmQgc2tlbGV0b24gb2YgbGVnZW5kXG5cbiAgICAgIHZhciB3cmFwX2JpbmQgPSBjb250YWluZXIuc2VsZWN0QWxsKCdnLnNjLXdyYXAnKS5kYXRhKFtkYXRhXSk7XG4gICAgICB2YXIgd3JhcF9lbnRyID0gd3JhcF9iaW5kLmVudGVyKCkuYXBwZW5kKCdnJykuYXR0cignY2xhc3MnLCAnc2Mtd3JhcCBzYy1sZWdlbmQnKTtcbiAgICAgIHZhciB3cmFwID0gY29udGFpbmVyLnNlbGVjdCgnZy5zYy13cmFwJykubWVyZ2Uod3JhcF9lbnRyKTtcbiAgICAgIHdyYXAuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgwLDApJyk7XG5cbiAgICAgIHZhciBkZWZzX2VudHIgPSB3cmFwX2VudHIuYXBwZW5kKCdkZWZzJyk7XG4gICAgICB2YXIgZGVmcyA9IHdyYXAuc2VsZWN0KCdkZWZzJyk7XG5cbiAgICAgIGRlZnNfZW50ci5hcHBlbmQoJ2NsaXBQYXRoJykuYXR0cignaWQnLCAnc2MtZWRnZS1jbGlwLScgKyBpZCkuYXBwZW5kKCdyZWN0Jyk7XG4gICAgICB2YXIgY2xpcCA9IHdyYXAuc2VsZWN0KCcjc2MtZWRnZS1jbGlwLScgKyBpZCArICcgcmVjdCcpO1xuXG4gICAgICB3cmFwX2VudHIuYXBwZW5kKCdyZWN0JykuYXR0cignY2xhc3MnLCAnc2MtbGVnZW5kLWJhY2tncm91bmQnKTtcbiAgICAgIHZhciBiYWNrID0gd3JhcC5zZWxlY3QoJy5zYy1sZWdlbmQtYmFja2dyb3VuZCcpO1xuICAgICAgdmFyIGJhY2tGaWx0ZXIgPSB1dGlscy5kcm9wU2hhZG93KCdsZWdlbmRfYmFja18nICsgaWQsIGRlZnMsIHtibHVyOiAyfSk7XG5cbiAgICAgIHdyYXBfZW50ci5hcHBlbmQoJ3RleHQnKS5hdHRyKCdjbGFzcycsICdzYy1sZWdlbmQtbGluaycpO1xuICAgICAgdmFyIGxpbmsgPSB3cmFwLnNlbGVjdCgnLnNjLWxlZ2VuZC1saW5rJyk7XG5cbiAgICAgIHZhciBtYXNrX2VudHIgPSB3cmFwX2VudHIuYXBwZW5kKCdnJykuYXR0cignY2xhc3MnLCAnc2MtbGVnZW5kLW1hc2snKTtcbiAgICAgIHZhciBtYXNrID0gd3JhcC5zZWxlY3QoJy5zYy1sZWdlbmQtbWFzaycpO1xuXG4gICAgICBtYXNrX2VudHIuYXBwZW5kKCdnJykuYXR0cignY2xhc3MnLCAnc2MtZ3JvdXAnKTtcbiAgICAgIHZhciBnID0gd3JhcC5zZWxlY3QoJy5zYy1ncm91cCcpO1xuXG4gICAgICB2YXIgc2VyaWVzX2JpbmQgPSBnLnNlbGVjdEFsbCgnLnNjLXNlcmllcycpLmRhdGEodXRpbHMuaWRlbnRpdHksIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuc2VyaWVzSW5kZXg7IH0pO1xuICAgICAgc2VyaWVzX2JpbmQuZXhpdCgpLnJlbW92ZSgpO1xuICAgICAgdmFyIHNlcmllc19lbnRyID0gc2VyaWVzX2JpbmQuZW50ZXIoKS5hcHBlbmQoJ2cnKS5hdHRyKCdjbGFzcycsICdzYy1zZXJpZXMnKVxuICAgICAgICAgICAgLm9uKCdtb3VzZW92ZXInLCBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgICAgIGRpc3BhdGNoLmNhbGwoJ2xlZ2VuZE1vdXNlb3ZlcicsIHRoaXMsIGQpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5vbignbW91c2VvdXQnLCBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgICAgIGRpc3BhdGNoLmNhbGwoJ2xlZ2VuZE1vdXNlb3V0JywgdGhpcywgZCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLm9uKCdjbGljaycsIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgICAgICAgZDMuZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgZDMuZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgIGRpc3BhdGNoLmNhbGwoJ2xlZ2VuZENsaWNrJywgdGhpcywgZCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgIHZhciBzZXJpZXMgPSBnLnNlbGVjdEFsbCgnLnNjLXNlcmllcycpLm1lcmdlKHNlcmllc19lbnRyKTtcblxuICAgICAgc2VyaWVzXG4gICAgICAgICAgLmF0dHIoJ2NsYXNzJywgY2xhc3NlcylcbiAgICAgICAgICAuYXR0cignZmlsbCcsIGNvbG9yKVxuICAgICAgICAgIC5hdHRyKCdzdHJva2UnLCBjb2xvcilcbiAgICAgIHNlcmllc19lbnRyXG4gICAgICAgIC5hcHBlbmQoJ3JlY3QnKVxuICAgICAgICAgIC5hdHRyKCd4JywgKGRpYW1ldGVyICsgdGV4dEdhcCkgLyAtMilcbiAgICAgICAgICAuYXR0cigneScsIChkaWFtZXRlciArIGxpbmVTcGFjaW5nKSAvIC0yKVxuICAgICAgICAgIC5hdHRyKCd3aWR0aCcsIGRpYW1ldGVyICsgdGV4dEdhcClcbiAgICAgICAgICAuYXR0cignaGVpZ2h0JywgZGlhbWV0ZXIgKyBsaW5lU3BhY2luZylcbiAgICAgICAgICAuc3R5bGUoJ2ZpbGwnLCAnI0ZGRScpXG4gICAgICAgICAgLnN0eWxlKCdzdHJva2Utd2lkdGgnLCAwKVxuICAgICAgICAgIC5zdHlsZSgnb3BhY2l0eScsIDAuMSk7XG5cbiAgICAgIHZhciBjaXJjbGVzX2JpbmQgPSBzZXJpZXNfZW50ci5zZWxlY3RBbGwoJ2NpcmNsZScpLmRhdGEoZnVuY3Rpb24oZCkgeyByZXR1cm4gdHlwZSA9PT0gJ2xpbmUnID8gW2QsIGRdIDogW2RdOyB9KTtcbiAgICAgIGNpcmNsZXNfYmluZC5leGl0KCkucmVtb3ZlKCk7XG4gICAgICB2YXIgY2lyY2xlc19lbnRyID0gY2lyY2xlc19iaW5kLmVudGVyKClcbiAgICAgICAgLmFwcGVuZCgnY2lyY2xlJylcbiAgICAgICAgICAuYXR0cigncicsIHJhZGl1cylcbiAgICAgICAgICAuc3R5bGUoJ3N0cm9rZS13aWR0aCcsICcycHgnKTtcbiAgICAgIHZhciBjaXJjbGVzID0gc2VyaWVzLnNlbGVjdEFsbCgnY2lyY2xlJykubWVyZ2UoY2lyY2xlc19lbnRyKTtcblxuICAgICAgdmFyIGxpbmVfYmluZCA9IHNlcmllc19lbnRyLnNlbGVjdEFsbCgnbGluZScpLmRhdGEodHlwZSA9PT0gJ2xpbmUnID8gZnVuY3Rpb24oZCkgeyByZXR1cm4gW2RdOyB9IDogW10pO1xuICAgICAgbGluZV9iaW5kLmV4aXQoKS5yZW1vdmUoKTtcbiAgICAgIHZhciBsaW5lc19lbnRyID0gbGluZV9iaW5kLmVudGVyKClcbiAgICAgICAgLmFwcGVuZCgnbGluZScpXG4gICAgICAgICAgLmF0dHIoJ3gwJywgMClcbiAgICAgICAgICAuYXR0cigneTAnLCAwKVxuICAgICAgICAgIC5hdHRyKCd5MScsIDApXG4gICAgICAgICAgLnN0eWxlKCdzdHJva2Utd2lkdGgnLCAnNHB4Jyk7XG4gICAgICB2YXIgbGluZXMgPSBzZXJpZXMuc2VsZWN0QWxsKCdsaW5lJykubWVyZ2UobGluZXNfZW50cik7XG5cbiAgICAgIHZhciB0ZXh0c19lbnRyID0gc2VyaWVzX2VudHIuYXBwZW5kKCd0ZXh0JylcbiAgICAgICAgLmF0dHIoJ2R4JywgMCk7XG4gICAgICB2YXIgdGV4dHMgPSBzZXJpZXMuc2VsZWN0QWxsKCd0ZXh0JykubWVyZ2UodGV4dHNfZW50cik7XG5cbiAgICAgIHRleHRzXG4gICAgICAgIC5hdHRyKCdkeScsIGlubGluZSA/ICcuMzZlbScgOiAnLjcxZW0nKVxuICAgICAgICAudGV4dChnZXRLZXkpO1xuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgLy8gVXBkYXRlIGxlZ2VuZCBhdHRyaWJ1dGVzXG5cbiAgICAgIGNsaXBcbiAgICAgICAgLmF0dHIoJ3gnLCAwLjUpXG4gICAgICAgIC5hdHRyKCd5JywgMC41KVxuICAgICAgICAuYXR0cignd2lkdGgnLCAwKVxuICAgICAgICAuYXR0cignaGVpZ2h0JywgMCk7XG5cbiAgICAgIGJhY2tcbiAgICAgICAgLmF0dHIoJ3gnLCAwLjUpXG4gICAgICAgIC5hdHRyKCd5JywgMC41KVxuICAgICAgICAuYXR0cignd2lkdGgnLCAwKVxuICAgICAgICAuYXR0cignaGVpZ2h0JywgMClcbiAgICAgICAgLnN0eWxlKCdvcGFjaXR5JywgMClcbiAgICAgICAgLnN0eWxlKCdwb2ludGVyLWV2ZW50cycsICdhbGwnKVxuICAgICAgICAub24oJ2NsaWNrJywgZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICAgIGQzLmV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICB9KTtcblxuICAgICAgbGlua1xuICAgICAgICAudGV4dChsZWdlbmRPcGVuID09PSAxID8gbGVnZW5kLnN0cmluZ3MoKS5jbG9zZSA6IGxlZ2VuZC5zdHJpbmdzKCkub3BlbilcbiAgICAgICAgLmF0dHIoJ3RleHQtYW5jaG9yJywgYWxpZ24gPT09ICdsZWZ0JyA/IHJ0bCA/ICdlbmQnIDogJ3N0YXJ0JyA6IHJ0bCA/ICdzdGFydCcgOiAnZW5kJylcbiAgICAgICAgLmF0dHIoJ2R5JywgJy4zNmVtJylcbiAgICAgICAgLmF0dHIoJ2R4JywgMClcbiAgICAgICAgLnN0eWxlKCdvcGFjaXR5JywgMClcbiAgICAgICAgLm9uKCdjbGljaycsIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgICBkMy5ldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIGQzLmV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgIGRpc3BhdGNoLmNhbGwoJ3RvZ2dsZU1lbnUnLCB0aGlzLCBkLCBpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgIHNlcmllcy5jbGFzc2VkKCdkaXNhYmxlZCcsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgcmV0dXJuIGQuZGlzYWJsZWQ7XG4gICAgICB9KTtcblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAgICAgLy9UT0RPOiBhZGQgYWJpbGl0eSB0byBhZGQga2V5IHRvIGxlZ2VuZFxuICAgICAgLy9UT0RPOiBoYXZlIHNlcmllcyBkaXNwbGF5IHZhbHVlcyBvbiBob3ZlclxuICAgICAgLy92YXIgbGFiZWwgPSBnLmFwcGVuZCgndGV4dCcpLnRleHQoJ1Byb2JhYmlsaXR5OicpLmF0dHIoJ2NsYXNzJywnc2Mtc2VyaWVzLWxhYmVsJykuYXR0cigndHJhbnNmb3JtJywndHJhbnNsYXRlKDAsMCknKTtcblxuICAgICAgLy8gc3RvcmUgbGVnZW5kIGxhYmVsIHdpZHRoc1xuICAgICAgbGVnZW5kLmNhbGNNYXhXaWR0aCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBrZXlXaWR0aHMgPSBbXTtcblxuICAgICAgICBnLnN0eWxlKCdkaXNwbGF5JywgJ2lubGluZScpO1xuXG4gICAgICAgIHRleHRzLmVhY2goZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICAgIHZhciB0ZXh0V2lkdGggPSBkMy5zZWxlY3QodGhpcykubm9kZSgpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLndpZHRoO1xuICAgICAgICAgIGtleVdpZHRocy5wdXNoKE1hdGgubWF4KE1hdGguZmxvb3IodGV4dFdpZHRoKSwgKHR5cGUgPT09ICdsaW5lJyA/IDUwIDogMjApKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGxlZ2VuZC53aWR0aChkMy5zdW0oa2V5V2lkdGhzKSArIGtleVdpZHRocy5sZW5ndGggKiBwYWRkaW5nIC0gZ3V0dGVyKTtcblxuICAgICAgICByZXR1cm4gbGVnZW5kLndpZHRoKCk7XG4gICAgICB9O1xuXG4gICAgICBsZWdlbmQuZ2V0TGluZUhlaWdodCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBnLnN0eWxlKCdkaXNwbGF5JywgJ2lubGluZScpO1xuICAgICAgICB2YXIgbGluZUhlaWdodEJCID0gTWF0aC5mbG9vcih0ZXh0cy5ub2RlKCkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0KTtcbiAgICAgICAgcmV0dXJuIGxpbmVIZWlnaHRCQjtcbiAgICAgIH07XG5cbiAgICAgIGxlZ2VuZC5hcnJhbmdlID0gZnVuY3Rpb24oY29udGFpbmVyV2lkdGgpIHtcblxuICAgICAgICBpZiAoa2V5V2lkdGhzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIHRoaXMuY2FsY01heFdpZHRoKCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBrZXlXaWR0aChpKSB7XG4gICAgICAgICAgcmV0dXJuIGtleVdpZHRoc1tpXSArIHBhZGRpbmc7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24ga2V5V2lkdGhOb0d1dHRlcihpKSB7XG4gICAgICAgICAgcmV0dXJuIGtleVdpZHRoc1tpXSArIHBhZGRpbmcgLSBndXR0ZXI7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gc2lnbihib29sKSB7XG4gICAgICAgICAgcmV0dXJuIGJvb2wgPyAxIDogLTE7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIga2V5cyA9IGtleVdpZHRocy5sZW5ndGgsXG4gICAgICAgICAgICByb3dzID0gMSxcbiAgICAgICAgICAgIGNvbHMgPSBrZXlzLFxuICAgICAgICAgICAgY29sdW1uV2lkdGhzID0gW10sXG4gICAgICAgICAgICBrZXlQb3NpdGlvbnMgPSBbXSxcbiAgICAgICAgICAgIG1heFdpZHRoID0gY29udGFpbmVyV2lkdGggLSBtYXJnaW4ubGVmdCAtIG1hcmdpbi5yaWdodCxcbiAgICAgICAgICAgIG1heFJvd1dpZHRoID0gMCxcbiAgICAgICAgICAgIG1pblJvd1dpZHRoID0gMCxcbiAgICAgICAgICAgIHRleHRIZWlnaHQgPSB0aGlzLmdldExpbmVIZWlnaHQoKSxcbiAgICAgICAgICAgIGxpbmVIZWlnaHQgPSBkaWFtZXRlciArIChpbmxpbmUgPyAwIDogdGV4dEhlaWdodCkgKyBsaW5lU3BhY2luZyxcbiAgICAgICAgICAgIG1lbnVNYXJnaW4gPSB7dG9wOiA3LCByaWdodDogNywgYm90dG9tOiA3LCBsZWZ0OiA3fSwgLy8gYWNjb3VudCBmb3Igc3Ryb2tlIHdpZHRoXG4gICAgICAgICAgICB4cG9zID0gMCxcbiAgICAgICAgICAgIHlwb3MgPSAwLFxuICAgICAgICAgICAgaSxcbiAgICAgICAgICAgIG1vZCxcbiAgICAgICAgICAgIHNoaWZ0O1xuXG4gICAgICAgIGlmIChlcXVhbENvbHVtbnMpIHtcblxuICAgICAgICAgIC8va2VlcCBkZWNyZWFzaW5nIHRoZSBudW1iZXIgb2Yga2V5cyBwZXIgcm93IHVudGlsXG4gICAgICAgICAgLy9sZWdlbmQgd2lkdGggaXMgbGVzcyB0aGFuIHRoZSBhdmFpbGFibGUgd2lkdGhcbiAgICAgICAgICB3aGlsZSAoY29scyA+IDApIHtcbiAgICAgICAgICAgIGNvbHVtbldpZHRocyA9IFtdO1xuXG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwga2V5czsgaSArPSAxKSB7XG4gICAgICAgICAgICAgIGlmIChrZXlXaWR0aChpKSA+IChjb2x1bW5XaWR0aHNbaSAlIGNvbHNdIHx8IDApKSB7XG4gICAgICAgICAgICAgICAgY29sdW1uV2lkdGhzW2kgJSBjb2xzXSA9IGtleVdpZHRoKGkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChkMy5zdW0oY29sdW1uV2lkdGhzKSAtIGd1dHRlciA8IG1heFdpZHRoKSB7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29scyAtPSAxO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb2xzID0gY29scyB8fCAxO1xuXG4gICAgICAgICAgcm93cyA9IE1hdGguY2VpbChrZXlzIC8gY29scyk7XG4gICAgICAgICAgbWF4Um93V2lkdGggPSBkMy5zdW0oY29sdW1uV2lkdGhzKSAtIGd1dHRlcjtcblxuICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBrZXlzOyBpICs9IDEpIHtcbiAgICAgICAgICAgIG1vZCA9IGkgJSBjb2xzO1xuXG4gICAgICAgICAgICBpZiAoaW5saW5lKSB7XG4gICAgICAgICAgICAgIGlmIChtb2QgPT09IDApIHtcbiAgICAgICAgICAgICAgICB4cG9zID0gcnRsID8gbWF4Um93V2lkdGggOiAwO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHhwb3MgKz0gY29sdW1uV2lkdGhzW21vZCAtIDFdICogc2lnbighcnRsKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgaWYgKG1vZCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHhwb3MgPSAocnRsID8gbWF4Um93V2lkdGggOiAwKSArIChjb2x1bW5XaWR0aHNbbW9kXSAtIGd1dHRlcikgLyAyICogc2lnbighcnRsKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB4cG9zICs9IChjb2x1bW5XaWR0aHNbbW9kIC0gMV0gKyBjb2x1bW5XaWR0aHNbbW9kXSkgLyAyICogc2lnbighcnRsKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB5cG9zID0gTWF0aC5mbG9vcihpIC8gY29scykgKiBsaW5lSGVpZ2h0O1xuICAgICAgICAgICAga2V5UG9zaXRpb25zW2ldID0ge3g6IHhwb3MsIHk6IHlwb3N9O1xuICAgICAgICAgIH1cblxuICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgaWYgKHJ0bCkge1xuXG4gICAgICAgICAgICB4cG9zID0gbWF4V2lkdGg7XG5cbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBrZXlzOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgaWYgKHhwb3MgLSBrZXlXaWR0aE5vR3V0dGVyKGkpIDwgMCkge1xuICAgICAgICAgICAgICAgIG1heFJvd1dpZHRoID0gTWF0aC5tYXgobWF4Um93V2lkdGgsIGtleVdpZHRoTm9HdXR0ZXIoaSkpO1xuICAgICAgICAgICAgICAgIHhwb3MgPSBtYXhXaWR0aDtcbiAgICAgICAgICAgICAgICBpZiAoaSkge1xuICAgICAgICAgICAgICAgICAgcm93cyArPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoeHBvcyAtIGtleVdpZHRoTm9HdXR0ZXIoaSkgPiBtYXhSb3dXaWR0aCkge1xuICAgICAgICAgICAgICAgIG1heFJvd1dpZHRoID0geHBvcyAtIGtleVdpZHRoTm9HdXR0ZXIoaSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAga2V5UG9zaXRpb25zW2ldID0ge3g6IHhwb3MsIHk6IChyb3dzIC0gMSkgKiAobGluZVNwYWNpbmcgKyBkaWFtZXRlcil9O1xuICAgICAgICAgICAgICB4cG9zIC09IGtleVdpZHRoKGkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgeHBvcyA9IDA7XG5cbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBrZXlzOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgaWYgKGkgJiYgeHBvcyArIGtleVdpZHRoTm9HdXR0ZXIoaSkgPiBtYXhXaWR0aCkge1xuICAgICAgICAgICAgICAgIHhwb3MgPSAwO1xuICAgICAgICAgICAgICAgIHJvd3MgKz0gMTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoeHBvcyArIGtleVdpZHRoTm9HdXR0ZXIoaSkgPiBtYXhSb3dXaWR0aCkge1xuICAgICAgICAgICAgICAgIG1heFJvd1dpZHRoID0geHBvcyArIGtleVdpZHRoTm9HdXR0ZXIoaSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAga2V5UG9zaXRpb25zW2ldID0ge3g6IHhwb3MsIHk6IChyb3dzIC0gMSkgKiAobGluZVNwYWNpbmcgKyBkaWFtZXRlcil9O1xuICAgICAgICAgICAgICB4cG9zICs9IGtleVdpZHRoKGkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgfVxuXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXNob3dNZW51ICYmIChzaG93QWxsIHx8IHJvd3MgPD0gcm93c0NvdW50KSkge1xuXG4gICAgICAgICAgbGVnZW5kT3BlbiA9IDA7XG4gICAgICAgICAgY29sbGFwc2VkID0gZmFsc2U7XG4gICAgICAgICAgdXNlU2Nyb2xsID0gZmFsc2U7XG5cbiAgICAgICAgICBsZWdlbmRcbiAgICAgICAgICAgIC53aWR0aChtYXJnaW4ubGVmdCArIG1heFJvd1dpZHRoICsgbWFyZ2luLnJpZ2h0KVxuICAgICAgICAgICAgLmhlaWdodChtYXJnaW4udG9wICsgcm93cyAqIGxpbmVIZWlnaHQgLSBsaW5lU3BhY2luZyArIG1hcmdpbi5ib3R0b20pO1xuXG4gICAgICAgICAgc3dpdGNoIChhbGlnbikge1xuICAgICAgICAgICAgY2FzZSAnbGVmdCc6XG4gICAgICAgICAgICAgIHNoaWZ0ID0gMDtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdjZW50ZXInOlxuICAgICAgICAgICAgICBzaGlmdCA9IChjb250YWluZXJXaWR0aCAtIGxlZ2VuZC53aWR0aCgpKSAvIDI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAncmlnaHQnOlxuICAgICAgICAgICAgICBzaGlmdCA9IDA7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNsaXBcbiAgICAgICAgICAgIC5hdHRyKCd5JywgMClcbiAgICAgICAgICAgIC5hdHRyKCd3aWR0aCcsIGxlZ2VuZC53aWR0aCgpKVxuICAgICAgICAgICAgLmF0dHIoJ2hlaWdodCcsIGxlZ2VuZC5oZWlnaHQoKSk7XG5cbiAgICAgICAgICBiYWNrXG4gICAgICAgICAgICAuYXR0cigneCcsIHNoaWZ0KVxuICAgICAgICAgICAgLmF0dHIoJ3dpZHRoJywgbGVnZW5kLndpZHRoKCkpXG4gICAgICAgICAgICAuYXR0cignaGVpZ2h0JywgbGVnZW5kLmhlaWdodCgpKVxuICAgICAgICAgICAgLmF0dHIoJ3J4JywgMClcbiAgICAgICAgICAgIC5hdHRyKCdyeScsIDApXG4gICAgICAgICAgICAuYXR0cignZmlsdGVyJywgJ25vbmUnKVxuICAgICAgICAgICAgLnN0eWxlKCdkaXNwbGF5JywgJ2lubGluZScpXG4gICAgICAgICAgICAuc3R5bGUoJ29wYWNpdHknLCAwKTtcblxuICAgICAgICAgIG1hc2tcbiAgICAgICAgICAgIC5hdHRyKCdjbGlwLXBhdGgnLCAnbm9uZScpXG4gICAgICAgICAgICAuYXR0cigndHJhbnNmb3JtJywgZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICAgICAgICB2YXIgeHBvcyA9IHNoaWZ0ICsgbWFyZ2luLmxlZnQgKyAoaW5saW5lID8gcmFkaXVzICogc2lnbighcnRsKSA6IDApLFxuICAgICAgICAgICAgICAgICAgeXBvcyA9IG1hcmdpbi50b3AgKyBtZW51TWFyZ2luLnRvcDtcbiAgICAgICAgICAgICAgcmV0dXJuICd0cmFuc2xhdGUoJyArIHhwb3MgKyAnLCcgKyB5cG9zICsgJyknO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICBnXG4gICAgICAgICAgICAuc3R5bGUoJ29wYWNpdHknLCAxKVxuICAgICAgICAgICAgLnN0eWxlKCdkaXNwbGF5JywgJ2lubGluZScpO1xuXG4gICAgICAgICAgc2VyaWVzXG4gICAgICAgICAgICAuYXR0cigndHJhbnNmb3JtJywgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICB2YXIgcG9zID0ga2V5UG9zaXRpb25zW2Quc2VyaWVzSW5kZXhdO1xuICAgICAgICAgICAgICByZXR1cm4gJ3RyYW5zbGF0ZSgnICsgcG9zLnggKyAnLCcgKyBwb3MueSArICcpJztcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgc2VyaWVzLnNlbGVjdCgncmVjdCcpXG4gICAgICAgICAgICAuYXR0cigneCcsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgdmFyIHhwb3MgPSAwO1xuICAgICAgICAgICAgICBpZiAoaW5saW5lKSB7XG4gICAgICAgICAgICAgICAgeHBvcyA9IChkaWFtZXRlciArIGd1dHRlcikgLyAyICogc2lnbihydGwpO1xuICAgICAgICAgICAgICAgIHhwb3MgLT0gcnRsID8ga2V5V2lkdGgoZC5zZXJpZXNJbmRleCkgOiAwO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHhwb3MgPSBrZXlXaWR0aChkLnNlcmllc0luZGV4KSAvIC0yO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiB4cG9zO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5hdHRyKCd3aWR0aCcsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGtleVdpZHRoKGQuc2VyaWVzSW5kZXgpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5hdHRyKCdoZWlnaHQnLCBsaW5lSGVpZ2h0KTtcblxuICAgICAgICAgIGNpcmNsZXNcbiAgICAgICAgICAgIC5hdHRyKCdyJywgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICByZXR1cm4gZC50eXBlID09PSAnZGFzaCcgPyAwIDogcmFkaXVzO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgICAgIHZhciB4cG9zID0gaW5saW5lIHx8IHR5cGUgPT09ICdiYXInID8gMCA6IHJhZGl1cyAqIDMgKiBzaWduKGkpO1xuICAgICAgICAgICAgICByZXR1cm4gJ3RyYW5zbGF0ZSgnICsgeHBvcyArICcsMCknO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICBsaW5lc1xuICAgICAgICAgICAgLmF0dHIoJ3gxJywgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICByZXR1cm4gZC50eXBlID09PSAnZGFzaCcgPyByYWRpdXMgKiA4IDogcmFkaXVzICogNDtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuYXR0cigndHJhbnNmb3JtJywgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICB2YXIgeHBvcyA9IHJhZGl1cyAqIChkLnR5cGUgPT09ICdkYXNoJyA/IC00IDogLTIpO1xuICAgICAgICAgICAgICByZXR1cm4gJ3RyYW5zbGF0ZSgnICsgeHBvcyArICcsMCknO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdHlsZSgnc3Ryb2tlLWRhc2hhcnJheScsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGQudHlwZSA9PT0gJ2Rhc2gnID8gJzgsIDgnIDogJ25vbmUnO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdHlsZSgnc3Ryb2tlLWRhc2hvZmZzZXQnLCAtNCk7XG5cbiAgICAgICAgICB0ZXh0c1xuICAgICAgICAgICAgLmF0dHIoJ2R5JywgaW5saW5lID8gJy4zNmVtJyA6ICcuNzFlbScpXG4gICAgICAgICAgICAuYXR0cigndGV4dC1hbmNob3InLCBwb3NpdGlvbilcbiAgICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgIHZhciB4cG9zID0gaW5saW5lID8gKHJhZGl1cyArIHRleHRHYXApICogc2lnbighcnRsKSA6IDAsXG4gICAgICAgICAgICAgICAgICB5cG9zID0gaW5saW5lID8gMCA6IChkaWFtZXRlciArIGxpbmVTcGFjaW5nKSAvIDI7XG4gICAgICAgICAgICAgIHJldHVybiAndHJhbnNsYXRlKCcgKyB4cG9zICsgJywnICsgeXBvcyArICcpJztcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICBjb2xsYXBzZWQgPSB0cnVlO1xuICAgICAgICAgIHVzZVNjcm9sbCA9IHRydWU7XG5cbiAgICAgICAgICBsZWdlbmRcbiAgICAgICAgICAgIC53aWR0aChtZW51TWFyZ2luLmxlZnQgKyBkMy5tYXgoa2V5V2lkdGhzKSArIGRpYW1ldGVyICsgdGV4dEdhcCArIG1lbnVNYXJnaW4ucmlnaHQpXG4gICAgICAgICAgICAuaGVpZ2h0KG1hcmdpbi50b3AgKyBkaWFtZXRlciArIG1hcmdpbi50b3ApOyAvL2Rvbid0IHVzZSBib3R0b20gaGVyZSBiZWNhdXNlIHdlIHdhbnQgdmVydGljYWwgY2VudGVyaW5nXG5cbiAgICAgICAgICBsZWdlbmRIZWlnaHQgPSBtZW51TWFyZ2luLnRvcCArIGRpYW1ldGVyICoga2V5cyArIHNwYWNpbmcgKiAoa2V5cyAtIDEpICsgbWVudU1hcmdpbi5ib3R0b207XG4gICAgICAgICAgZHJvcGRvd25IZWlnaHQgPSBNYXRoLm1pbihjb250YWluZXJIZWlnaHQgLSBsZWdlbmQuaGVpZ2h0KCksIGxlZ2VuZEhlaWdodCk7XG5cbiAgICAgICAgICBjbGlwXG4gICAgICAgICAgICAuYXR0cigneCcsIDAuNSAtIG1lbnVNYXJnaW4udG9wIC0gcmFkaXVzKVxuICAgICAgICAgICAgLmF0dHIoJ3knLCAwLjUgLSBtZW51TWFyZ2luLnRvcCAtIHJhZGl1cylcbiAgICAgICAgICAgIC5hdHRyKCd3aWR0aCcsIGxlZ2VuZC53aWR0aCgpKVxuICAgICAgICAgICAgLmF0dHIoJ2hlaWdodCcsIGRyb3Bkb3duSGVpZ2h0KTtcblxuICAgICAgICAgIGJhY2tcbiAgICAgICAgICAgIC5hdHRyKCd4JywgMC41KVxuICAgICAgICAgICAgLmF0dHIoJ3knLCAwLjUgKyBsZWdlbmQuaGVpZ2h0KCkpXG4gICAgICAgICAgICAuYXR0cignd2lkdGgnLCBsZWdlbmQud2lkdGgoKSlcbiAgICAgICAgICAgIC5hdHRyKCdoZWlnaHQnLCBkcm9wZG93bkhlaWdodClcbiAgICAgICAgICAgIC5hdHRyKCdyeCcsIDIpXG4gICAgICAgICAgICAuYXR0cigncnknLCAyKVxuICAgICAgICAgICAgLmF0dHIoJ2ZpbHRlcicsIGJhY2tGaWx0ZXIpXG4gICAgICAgICAgICAuc3R5bGUoJ29wYWNpdHknLCBsZWdlbmRPcGVuICogMC45KVxuICAgICAgICAgICAgLnN0eWxlKCdkaXNwbGF5JywgbGVnZW5kT3BlbiA/ICdpbmxpbmUnIDogJ25vbmUnKTtcblxuICAgICAgICAgIGxpbmtcbiAgICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgICAgIHZhciB4cG9zID0gYWxpZ24gPT09ICdsZWZ0JyA/IDAuNSA6IDAuNSArIGxlZ2VuZC53aWR0aCgpLFxuICAgICAgICAgICAgICAgICAgeXBvcyA9IG1hcmdpbi50b3AgKyByYWRpdXM7XG4gICAgICAgICAgICAgIHJldHVybiAndHJhbnNsYXRlKCcgKyB4cG9zICsgJywnICsgeXBvcyArICcpJztcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuc3R5bGUoJ29wYWNpdHknLCAxKTtcblxuICAgICAgICAgIG1hc2tcbiAgICAgICAgICAgIC5hdHRyKCdjbGlwLXBhdGgnLCAndXJsKCNzYy1lZGdlLWNsaXAtJyArIGlkICsgJyknKVxuICAgICAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgICAgICAgdmFyIHhwb3MgPSBtZW51TWFyZ2luLmxlZnQgKyByYWRpdXMsXG4gICAgICAgICAgICAgICAgICB5cG9zID0gbGVnZW5kLmhlaWdodCgpICsgbWVudU1hcmdpbi50b3AgKyByYWRpdXM7XG4gICAgICAgICAgICAgIHJldHVybiAndHJhbnNsYXRlKCcgKyB4cG9zICsgJywnICsgeXBvcyArICcpJztcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgZ1xuICAgICAgICAgICAgLnN0eWxlKCdvcGFjaXR5JywgbGVnZW5kT3BlbilcbiAgICAgICAgICAgIC5zdHlsZSgnZGlzcGxheScsIGxlZ2VuZE9wZW4gPyAnaW5saW5lJyA6ICdub25lJylcbiAgICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgICAgIHZhciB4cG9zID0gcnRsID8gZDMubWF4KGtleVdpZHRocykgKyByYWRpdXMgOiAwO1xuICAgICAgICAgICAgICByZXR1cm4gJ3RyYW5zbGF0ZSgnICsgeHBvcyArICcsMCknO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICBzZXJpZXNcbiAgICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgICAgIHZhciB5cG9zID0gaSAqIChkaWFtZXRlciArIHNwYWNpbmcpO1xuICAgICAgICAgICAgICByZXR1cm4gJ3RyYW5zbGF0ZSgwLCcgKyB5cG9zICsgJyknO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICBzZXJpZXMuc2VsZWN0KCdyZWN0JylcbiAgICAgICAgICAgIC5hdHRyKCd4JywgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICB2YXIgdyA9IChkaWFtZXRlciArIGd1dHRlcikgLyAyICogc2lnbihydGwpO1xuICAgICAgICAgICAgICB3IC09IHJ0bCA/IGtleVdpZHRoKGQuc2VyaWVzSW5kZXgpIDogMDtcbiAgICAgICAgICAgICAgcmV0dXJuIHc7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmF0dHIoJ3dpZHRoJywgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICByZXR1cm4ga2V5V2lkdGgoZC5zZXJpZXNJbmRleCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmF0dHIoJ2hlaWdodCcsIGRpYW1ldGVyICsgbGluZVNwYWNpbmcpO1xuXG4gICAgICAgICAgY2lyY2xlc1xuICAgICAgICAgICAgLmF0dHIoJ3InLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgIHJldHVybiBkLnR5cGUgPT09ICdkYXNoJyA/IDAgOiBkLnR5cGUgPT09ICdsaW5lJyA/IHJhZGl1cyAtIDIgOiByYWRpdXM7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsICcnKTtcblxuICAgICAgICAgIGxpbmVzXG4gICAgICAgICAgICAuYXR0cigneDEnLCAxNilcbiAgICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKC04LDApJylcbiAgICAgICAgICAgIC5zdHlsZSgnc3Ryb2tlLWRhc2hhcnJheScsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGQudHlwZSA9PT0gJ2Rhc2gnID8gJzYsIDQsIDYnIDogJ25vbmUnO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdHlsZSgnc3Ryb2tlLWRhc2hvZmZzZXQnLCAwKTtcblxuICAgICAgICAgIHRleHRzXG4gICAgICAgICAgICAuYXR0cigndGV4dC1hbmNob3InLCAnc3RhcnQnKVxuICAgICAgICAgICAgLmF0dHIoJ2R5JywgJy4zNmVtJylcbiAgICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgIHZhciB4cG9zID0gKHJhZGl1cyArIHRleHRHYXApICogc2lnbighcnRsKTtcbiAgICAgICAgICAgICAgcmV0dXJuICd0cmFuc2xhdGUoJyArIHhwb3MgKyAnLDApJztcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH1cblxuICAgICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgICAvLyBFbmFibGUgc2Nyb2xsaW5nXG4gICAgICAgIGlmIChzY3JvbGxFbmFibGVkKSB7XG4gICAgICAgICAgdmFyIGRpZmYgPSBkcm9wZG93bkhlaWdodCAtIGxlZ2VuZEhlaWdodDtcblxuICAgICAgICAgIHZhciBhc3NpZ25TY3JvbGxFdmVudHMgPSBmdW5jdGlvbihlbmFibGUpIHtcbiAgICAgICAgICAgIGlmIChlbmFibGUpIHtcblxuICAgICAgICAgICAgICB2YXIgem9vbSA9IGQzLnpvb20oKVxuICAgICAgICAgICAgICAgICAgICAub24oJ3pvb20nLCBwYW5MZWdlbmQpO1xuICAgICAgICAgICAgICB2YXIgZHJhZyA9IGQzLmRyYWcoKVxuICAgICAgICAgICAgICAgICAgICAuc3ViamVjdCh1dGlscy5pZGVudGl0eSlcbiAgICAgICAgICAgICAgICAgICAgLm9uKCdkcmFnJywgcGFuTGVnZW5kKTtcblxuICAgICAgICAgICAgICBiYWNrLmNhbGwoem9vbSk7XG4gICAgICAgICAgICAgIGcuY2FsbCh6b29tKTtcblxuICAgICAgICAgICAgICBiYWNrLmNhbGwoZHJhZyk7XG4gICAgICAgICAgICAgIGcuY2FsbChkcmFnKTtcblxuICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICBiYWNrXG4gICAgICAgICAgICAgICAgICAub24oXCJtb3VzZWRvd24uem9vbVwiLCBudWxsKVxuICAgICAgICAgICAgICAgICAgLm9uKFwibW91c2V3aGVlbC56b29tXCIsIG51bGwpXG4gICAgICAgICAgICAgICAgICAub24oXCJtb3VzZW1vdmUuem9vbVwiLCBudWxsKVxuICAgICAgICAgICAgICAgICAgLm9uKFwiRE9NTW91c2VTY3JvbGwuem9vbVwiLCBudWxsKVxuICAgICAgICAgICAgICAgICAgLm9uKFwiZGJsY2xpY2suem9vbVwiLCBudWxsKVxuICAgICAgICAgICAgICAgICAgLm9uKFwidG91Y2hzdGFydC56b29tXCIsIG51bGwpXG4gICAgICAgICAgICAgICAgICAub24oXCJ0b3VjaG1vdmUuem9vbVwiLCBudWxsKVxuICAgICAgICAgICAgICAgICAgLm9uKFwidG91Y2hlbmQuem9vbVwiLCBudWxsKVxuICAgICAgICAgICAgICAgICAgLm9uKFwid2hlZWwuem9vbVwiLCBudWxsKTtcbiAgICAgICAgICAgICAgZ1xuICAgICAgICAgICAgICAgICAgLm9uKFwibW91c2Vkb3duLnpvb21cIiwgbnVsbClcbiAgICAgICAgICAgICAgICAgIC5vbihcIm1vdXNld2hlZWwuem9vbVwiLCBudWxsKVxuICAgICAgICAgICAgICAgICAgLm9uKFwibW91c2Vtb3ZlLnpvb21cIiwgbnVsbClcbiAgICAgICAgICAgICAgICAgIC5vbihcIkRPTU1vdXNlU2Nyb2xsLnpvb21cIiwgbnVsbClcbiAgICAgICAgICAgICAgICAgIC5vbihcImRibGNsaWNrLnpvb21cIiwgbnVsbClcbiAgICAgICAgICAgICAgICAgIC5vbihcInRvdWNoc3RhcnQuem9vbVwiLCBudWxsKVxuICAgICAgICAgICAgICAgICAgLm9uKFwidG91Y2htb3ZlLnpvb21cIiwgbnVsbClcbiAgICAgICAgICAgICAgICAgIC5vbihcInRvdWNoZW5kLnpvb21cIiwgbnVsbClcbiAgICAgICAgICAgICAgICAgIC5vbihcIndoZWVsLnpvb21cIiwgbnVsbCk7XG5cbiAgICAgICAgICAgICAgYmFja1xuICAgICAgICAgICAgICAgICAgLm9uKFwibW91c2Vkb3duLmRyYWdcIiwgbnVsbClcbiAgICAgICAgICAgICAgICAgIC5vbihcIm1vdXNld2hlZWwuZHJhZ1wiLCBudWxsKVxuICAgICAgICAgICAgICAgICAgLm9uKFwibW91c2Vtb3ZlLmRyYWdcIiwgbnVsbClcbiAgICAgICAgICAgICAgICAgIC5vbihcIkRPTU1vdXNlU2Nyb2xsLmRyYWdcIiwgbnVsbClcbiAgICAgICAgICAgICAgICAgIC5vbihcImRibGNsaWNrLmRyYWdcIiwgbnVsbClcbiAgICAgICAgICAgICAgICAgIC5vbihcInRvdWNoc3RhcnQuZHJhZ1wiLCBudWxsKVxuICAgICAgICAgICAgICAgICAgLm9uKFwidG91Y2htb3ZlLmRyYWdcIiwgbnVsbClcbiAgICAgICAgICAgICAgICAgIC5vbihcInRvdWNoZW5kLmRyYWdcIiwgbnVsbClcbiAgICAgICAgICAgICAgICAgIC5vbihcIndoZWVsLmRyYWdcIiwgbnVsbCk7XG4gICAgICAgICAgICAgIGdcbiAgICAgICAgICAgICAgICAgIC5vbihcIm1vdXNlZG93bi5kcmFnXCIsIG51bGwpXG4gICAgICAgICAgICAgICAgICAub24oXCJtb3VzZXdoZWVsLmRyYWdcIiwgbnVsbClcbiAgICAgICAgICAgICAgICAgIC5vbihcIm1vdXNlbW92ZS5kcmFnXCIsIG51bGwpXG4gICAgICAgICAgICAgICAgICAub24oXCJET01Nb3VzZVNjcm9sbC5kcmFnXCIsIG51bGwpXG4gICAgICAgICAgICAgICAgICAub24oXCJkYmxjbGljay5kcmFnXCIsIG51bGwpXG4gICAgICAgICAgICAgICAgICAub24oXCJ0b3VjaHN0YXJ0LmRyYWdcIiwgbnVsbClcbiAgICAgICAgICAgICAgICAgIC5vbihcInRvdWNobW92ZS5kcmFnXCIsIG51bGwpXG4gICAgICAgICAgICAgICAgICAub24oXCJ0b3VjaGVuZC5kcmFnXCIsIG51bGwpXG4gICAgICAgICAgICAgICAgICAub24oXCJ3aGVlbC5kcmFnXCIsIG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG5cbiAgICAgICAgICB2YXIgcGFuTGVnZW5kID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgZGlzdGFuY2UgPSAwLFxuICAgICAgICAgICAgICAgIG92ZXJmbG93RGlzdGFuY2UgPSAwLFxuICAgICAgICAgICAgICAgIHRyYW5zbGF0ZSA9ICcnLFxuICAgICAgICAgICAgICAgIHggPSAwLFxuICAgICAgICAgICAgICAgIHkgPSAwO1xuXG4gICAgICAgICAgICAvLyBkb24ndCBmaXJlIG9uIGV2ZW50cyBvdGhlciB0aGFuIHpvb20gYW5kIGRyYWdcbiAgICAgICAgICAgIC8vIHdlIG5lZWQgY2xpY2sgZm9yIGhhbmRsaW5nIGxlZ2VuZCB0b2dnbGVcbiAgICAgICAgICAgIGlmIChkMy5ldmVudCkge1xuICAgICAgICAgICAgICBpZiAoZDMuZXZlbnQudHlwZSA9PT0gJ3pvb20nICYmIGQzLmV2ZW50LnNvdXJjZUV2ZW50KSB7XG4gICAgICAgICAgICAgICAgeCA9IGQzLmV2ZW50LnNvdXJjZUV2ZW50LmRlbHRhWCB8fCAwO1xuICAgICAgICAgICAgICAgIHkgPSBkMy5ldmVudC5zb3VyY2VFdmVudC5kZWx0YVkgfHwgMDtcbiAgICAgICAgICAgICAgICBkaXN0YW5jZSA9IChNYXRoLmFicyh4KSA+IE1hdGguYWJzKHkpID8geCA6IHkpICogLTE7XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAoZDMuZXZlbnQudHlwZSA9PT0gJ2RyYWcnKSB7XG4gICAgICAgICAgICAgICAgeCA9IGQzLmV2ZW50LmR4IHx8IDA7XG4gICAgICAgICAgICAgICAgeSA9IGQzLmV2ZW50LmR5IHx8IDA7XG4gICAgICAgICAgICAgICAgZGlzdGFuY2UgPSB5O1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKGQzLmV2ZW50LnR5cGUgIT09ICdjbGljaycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBvdmVyZmxvd0Rpc3RhbmNlID0gKE1hdGguYWJzKHkpID4gTWF0aC5hYnMoeCkgPyB5IDogMCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHJlc2V0IHZhbHVlIGRlZmluZWQgaW4gcGFuTXVsdGliYXIoKTtcbiAgICAgICAgICAgIHNjcm9sbE9mZnNldCA9IE1hdGgubWluKE1hdGgubWF4KHNjcm9sbE9mZnNldCArIGRpc3RhbmNlLCBkaWZmKSwgMCk7XG4gICAgICAgICAgICB0cmFuc2xhdGUgPSAndHJhbnNsYXRlKCcgKyAocnRsID8gZDMubWF4KGtleVdpZHRocykgKyByYWRpdXMgOiAwKSArICcsJyArIHNjcm9sbE9mZnNldCArICcpJztcblxuICAgICAgICAgICAgaWYgKHNjcm9sbE9mZnNldCArIGRpc3RhbmNlID4gMCB8fCBzY3JvbGxPZmZzZXQgKyBkaXN0YW5jZSA8IGRpZmYpIHtcbiAgICAgICAgICAgICAgb3ZlcmZsb3dIYW5kbGVyKG92ZXJmbG93RGlzdGFuY2UpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBnLmF0dHIoJ3RyYW5zZm9ybScsIHRyYW5zbGF0ZSk7XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIGFzc2lnblNjcm9sbEV2ZW50cyh1c2VTY3JvbGwpO1xuICAgICAgICB9XG5cbiAgICAgIH07XG5cbiAgICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAvLyBFdmVudCBIYW5kbGluZy9EaXNwYXRjaGluZyAoaW4gY2hhcnQncyBzY29wZSlcbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgICAgIGZ1bmN0aW9uIGRpc3BsYXlNZW51KCkge1xuICAgICAgICBiYWNrXG4gICAgICAgICAgLnN0eWxlKCdvcGFjaXR5JywgbGVnZW5kT3BlbiAqIDAuOSlcbiAgICAgICAgICAuc3R5bGUoJ2Rpc3BsYXknLCBsZWdlbmRPcGVuID8gJ2lubGluZScgOiAnbm9uZScpO1xuICAgICAgICBnXG4gICAgICAgICAgLnN0eWxlKCdvcGFjaXR5JywgbGVnZW5kT3BlbilcbiAgICAgICAgICAuc3R5bGUoJ2Rpc3BsYXknLCBsZWdlbmRPcGVuID8gJ2lubGluZScgOiAnbm9uZScpO1xuICAgICAgICBsaW5rXG4gICAgICAgICAgLnRleHQobGVnZW5kT3BlbiA9PT0gMSA/IGxlZ2VuZC5zdHJpbmdzKCkuY2xvc2UgOiBsZWdlbmQuc3RyaW5ncygpLm9wZW4pO1xuICAgICAgfVxuXG4gICAgICBkaXNwYXRjaC5vbigndG9nZ2xlTWVudScsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgZDMuZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGxlZ2VuZE9wZW4gPSAxIC0gbGVnZW5kT3BlbjtcbiAgICAgICAgZGlzcGxheU1lbnUoKTtcbiAgICAgIH0pO1xuXG4gICAgICBkaXNwYXRjaC5vbignY2xvc2VNZW51JywgZnVuY3Rpb24oZCkge1xuICAgICAgICBpZiAobGVnZW5kT3BlbiA9PT0gMSkge1xuICAgICAgICAgIGxlZ2VuZE9wZW4gPSAwO1xuICAgICAgICAgIGRpc3BsYXlNZW51KCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgfSk7XG5cbiAgICByZXR1cm4gbGVnZW5kO1xuICB9XG5cblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBFeHBvc2UgUHVibGljIFZhcmlhYmxlc1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGxlZ2VuZC5kaXNwYXRjaCA9IGRpc3BhdGNoO1xuXG4gIGxlZ2VuZC5tYXJnaW4gPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7IHJldHVybiBtYXJnaW47IH1cbiAgICBtYXJnaW4udG9wICAgID0gdHlwZW9mIF8udG9wICAgICE9PSAndW5kZWZpbmVkJyA/IF8udG9wICAgIDogbWFyZ2luLnRvcDtcbiAgICBtYXJnaW4ucmlnaHQgID0gdHlwZW9mIF8ucmlnaHQgICE9PSAndW5kZWZpbmVkJyA/IF8ucmlnaHQgIDogbWFyZ2luLnJpZ2h0O1xuICAgIG1hcmdpbi5ib3R0b20gPSB0eXBlb2YgXy5ib3R0b20gIT09ICd1bmRlZmluZWQnID8gXy5ib3R0b20gOiBtYXJnaW4uYm90dG9tO1xuICAgIG1hcmdpbi5sZWZ0ICAgPSB0eXBlb2YgXy5sZWZ0ICAgIT09ICd1bmRlZmluZWQnID8gXy5sZWZ0ICAgOiBtYXJnaW4ubGVmdDtcbiAgICByZXR1cm4gbGVnZW5kO1xuICB9O1xuXG4gIGxlZ2VuZC53aWR0aCA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiB3aWR0aDtcbiAgICB9XG4gICAgd2lkdGggPSBNYXRoLnJvdW5kKF8pO1xuICAgIHJldHVybiBsZWdlbmQ7XG4gIH07XG5cbiAgbGVnZW5kLmhlaWdodCA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBoZWlnaHQ7XG4gICAgfVxuICAgIGhlaWdodCA9IE1hdGgucm91bmQoXyk7XG4gICAgcmV0dXJuIGxlZ2VuZDtcbiAgfTtcblxuICBsZWdlbmQuaWQgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gaWQ7XG4gICAgfVxuICAgIGlkID0gXztcbiAgICByZXR1cm4gbGVnZW5kO1xuICB9O1xuXG4gIGxlZ2VuZC5rZXkgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gZ2V0S2V5O1xuICAgIH1cbiAgICBnZXRLZXkgPSBfO1xuICAgIHJldHVybiBsZWdlbmQ7XG4gIH07XG5cbiAgbGVnZW5kLmNvbG9yID0gZnVuY3Rpb24oXykge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIGNvbG9yO1xuICAgIH1cbiAgICBjb2xvciA9IHV0aWxzLmdldENvbG9yKF8pO1xuICAgIHJldHVybiBsZWdlbmQ7XG4gIH07XG5cbiAgbGVnZW5kLmNsYXNzZXMgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gY2xhc3NlcztcbiAgICB9XG4gICAgY2xhc3NlcyA9IF87XG4gICAgcmV0dXJuIGxlZ2VuZDtcbiAgfTtcblxuICBsZWdlbmQuYWxpZ24gPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gYWxpZ247XG4gICAgfVxuICAgIGFsaWduID0gXztcbiAgICByZXR1cm4gbGVnZW5kO1xuICB9O1xuXG4gIGxlZ2VuZC5wb3NpdGlvbiA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBwb3NpdGlvbjtcbiAgICB9XG4gICAgcG9zaXRpb24gPSBfO1xuICAgIHJldHVybiBsZWdlbmQ7XG4gIH07XG5cbiAgbGVnZW5kLnNob3dBbGwgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7IHJldHVybiBzaG93QWxsOyB9XG4gICAgc2hvd0FsbCA9IF87XG4gICAgcmV0dXJuIGxlZ2VuZDtcbiAgfTtcblxuICBsZWdlbmQuc2hvd01lbnUgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7IHJldHVybiBzaG93TWVudTsgfVxuICAgIHNob3dNZW51ID0gXztcbiAgICByZXR1cm4gbGVnZW5kO1xuICB9O1xuXG4gIGxlZ2VuZC5jb2xsYXBzZWQgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGNvbGxhcHNlZDtcbiAgfTtcblxuICBsZWdlbmQucm93c0NvdW50ID0gZnVuY3Rpb24oXykge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHJvd3NDb3VudDtcbiAgICB9XG4gICAgcm93c0NvdW50ID0gXztcbiAgICByZXR1cm4gbGVnZW5kO1xuICB9O1xuXG4gIGxlZ2VuZC5zcGFjaW5nID0gZnVuY3Rpb24oXykge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHNwYWNpbmc7XG4gICAgfVxuICAgIHNwYWNpbmcgPSBfO1xuICAgIHJldHVybiBsZWdlbmQ7XG4gIH07XG5cbiAgbGVnZW5kLmd1dHRlciA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBndXR0ZXI7XG4gICAgfVxuICAgIGd1dHRlciA9IF87XG4gICAgcmV0dXJuIGxlZ2VuZDtcbiAgfTtcblxuICBsZWdlbmQucmFkaXVzID0gZnVuY3Rpb24oXykge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHJhZGl1cztcbiAgICB9XG4gICAgcmFkaXVzID0gXztcbiAgICByZXR1cm4gbGVnZW5kO1xuICB9O1xuXG4gIGxlZ2VuZC5zdHJpbmdzID0gZnVuY3Rpb24oXykge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHN0cmluZ3M7XG4gICAgfVxuICAgIHN0cmluZ3MgPSBfO1xuICAgIHJldHVybiBsZWdlbmQ7XG4gIH07XG5cbiAgbGVnZW5kLmVxdWFsQ29sdW1ucyA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBlcXVhbENvbHVtbnM7XG4gICAgfVxuICAgIGVxdWFsQ29sdW1ucyA9IF87XG4gICAgcmV0dXJuIGxlZ2VuZDtcbiAgfTtcblxuICBsZWdlbmQuZW5hYmxlZCA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBlbmFibGVkO1xuICAgIH1cbiAgICBlbmFibGVkID0gXztcbiAgICByZXR1cm4gbGVnZW5kO1xuICB9O1xuXG4gIGxlZ2VuZC5kaXJlY3Rpb24gPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gZGlyZWN0aW9uO1xuICAgIH1cbiAgICBkaXJlY3Rpb24gPSBfO1xuICAgIHJldHVybiBsZWdlbmQ7XG4gIH07XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXG4gIHJldHVybiBsZWdlbmQ7XG59XG4iLCJpbXBvcnQgZDMgZnJvbSAnZDMnO1xuaW1wb3J0IHV0aWxzIGZyb20gJy4uL3V0aWxzLmpzJztcblxuZXhwb3J0IGZ1bmN0aW9uIGZ1bm5lbCgpIHtcblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBQdWJsaWMgVmFyaWFibGVzIHdpdGggRGVmYXVsdCBTZXR0aW5nc1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHZhciBtYXJnaW4gPSB7dG9wOiAwLCByaWdodDogMCwgYm90dG9tOiAwLCBsZWZ0OiAwfSxcbiAgICAgIHdpZHRoID0gOTYwLFxuICAgICAgaGVpZ2h0ID0gNTAwLFxuICAgICAgaWQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMCksIC8vQ3JlYXRlIHNlbWktdW5pcXVlIElEIGluIGNhc2UgdXNlciBkb2Vzbid0IHNlbGVjdCBvbmVcbiAgICAgIGdldFggPSBmdW5jdGlvbihkKSB7IHJldHVybiBkLng7IH0sXG4gICAgICBnZXRZID0gZnVuY3Rpb24oZCkgeyByZXR1cm4gZC55OyB9LFxuICAgICAgZ2V0SCA9IGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuaGVpZ2h0OyB9LFxuICAgICAgZ2V0S2V5ID0gZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5rZXk7IH0sXG4gICAgICBnZXRWYWx1ZSA9IGZ1bmN0aW9uKGQsIGkpIHsgcmV0dXJuIGQudmFsdWU7IH0sXG4gICAgICBmbXRLZXkgPSBmdW5jdGlvbihkKSB7IHJldHVybiBnZXRLZXkoZC5zZXJpZXMgfHwgZCk7IH0sXG4gICAgICBmbXRWYWx1ZSA9IGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGdldFZhbHVlKGQuc2VyaWVzIHx8IGQpOyB9LFxuICAgICAgZm10Q291bnQgPSBmdW5jdGlvbihkKSB7IHJldHVybiAoJyAoJyArIChkLnNlcmllcy5jb3VudCB8fCBkLmNvdW50KSArICcpJykucmVwbGFjZSgnICgpJywgJycpOyB9LFxuICAgICAgbG9jYWxpdHkgPSB1dGlscy5idWlsZExvY2FsaXR5KCksXG4gICAgICBkaXJlY3Rpb24gPSAnbHRyJyxcbiAgICAgIGRlbGF5ID0gMCxcbiAgICAgIGR1cmF0aW9uID0gMCxcbiAgICAgIGNvbG9yID0gZnVuY3Rpb24oZCwgaSkgeyByZXR1cm4gdXRpbHMuZGVmYXVsdENvbG9yKCkoZC5zZXJpZXMsIGQuc2VyaWVzSW5kZXgpOyB9LFxuICAgICAgZmlsbCA9IGNvbG9yLFxuICAgICAgdGV4dHVyZUZpbGwgPSBmYWxzZSxcbiAgICAgIGNsYXNzZXMgPSBmdW5jdGlvbihkLCBpKSB7IHJldHVybiAnc2Mtc2VyaWVzIHNjLXNlcmllcy0nICsgZC5zZXJpZXNJbmRleDsgfTtcblxuICB2YXIgciA9IDAuMywgLy8gcmF0aW8gb2Ygd2lkdGggdG8gaGVpZ2h0IChvciBzbG9wZSlcbiAgICAgIHkgPSBkMy5zY2FsZUxpbmVhcigpLFxuICAgICAgeURvbWFpbixcbiAgICAgIGZvcmNlWSA9IFswXSwgLy8gMCBpcyBmb3JjZWQgYnkgZGVmYXVsdC4uIHRoaXMgbWFrZXMgc2Vuc2UgZm9yIHRoZSBtYWpvcml0eSBvZiBiYXIgZ3JhcGhzLi4uIHVzZXIgY2FuIGFsd2F5cyBkbyBjaGFydC5mb3JjZVkoW10pIHRvIHJlbW92ZVxuICAgICAgd3JhcExhYmVscyA9IHRydWUsXG4gICAgICBtaW5MYWJlbFdpZHRoID0gNzUsXG4gICAgICBkaXNwYXRjaCA9IGQzLmRpc3BhdGNoKCdjaGFydENsaWNrJywgJ2VsZW1lbnRDbGljaycsICdlbGVtZW50RGJsQ2xpY2snLCAnZWxlbWVudE1vdXNlb3ZlcicsICdlbGVtZW50TW91c2VvdXQnLCAnZWxlbWVudE1vdXNlbW92ZScpO1xuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFByaXZhdGUgVmFyaWFibGVzXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gVGhlc2UgdmFsdWVzIGFyZSBwcmVzZXJ2ZWQgYmV0d2VlbiByZW5kZXJpbmdzXG4gIHZhciBjYWxjdWxhdGVkV2lkdGggPSAwLFxuICAgICAgY2FsY3VsYXRlZEhlaWdodCA9IDAsXG4gICAgICBjYWxjdWxhdGVkQ2VudGVyID0gMDtcblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBVcGRhdGUgY2hhcnRcblxuICBmdW5jdGlvbiBjaGFydChzZWxlY3Rpb24pIHtcbiAgICBzZWxlY3Rpb24uZWFjaChmdW5jdGlvbihkYXRhKSB7XG5cbiAgICAgIHZhciBhdmFpbGFibGVXaWR0aCA9IHdpZHRoIC0gbWFyZ2luLmxlZnQgLSBtYXJnaW4ucmlnaHQsXG4gICAgICAgICAgYXZhaWxhYmxlSGVpZ2h0ID0gaGVpZ2h0IC0gbWFyZ2luLnRvcCAtIG1hcmdpbi5ib3R0b20sXG4gICAgICAgICAgY29udGFpbmVyID0gZDMuc2VsZWN0KHRoaXMpO1xuXG4gICAgICB2YXIgbGFiZWxHYXAgPSA1LFxuICAgICAgICAgIGxhYmVsU3BhY2UgPSA1LFxuICAgICAgICAgIGxhYmVsT2Zmc2V0ID0gMCxcbiAgICAgICAgICBmdW5uZWxUb3RhbCA9IDAsXG4gICAgICAgICAgZnVubmVsT2Zmc2V0ID0gMDtcblxuICAgICAgLy9zdW0gdGhlIHZhbHVlcyBmb3IgZWFjaCBkYXRhIGVsZW1lbnRcbiAgICAgIGZ1bm5lbFRvdGFsID0gZDMuc3VtKGRhdGEsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudmFsdWU7IH0pO1xuXG4gICAgICAvL3NldCB1cCB0aGUgZ3JhZGllbnQgY29uc3RydWN0b3IgZnVuY3Rpb25cbiAgICAgIGNoYXJ0LmdyYWRpZW50ID0gZnVuY3Rpb24oZCwgaSwgcCkge1xuICAgICAgICByZXR1cm4gdXRpbHMuY29sb3JMaW5lYXJHcmFkaWVudChkLCBpZCArICctJyArIGksIHAsIGNvbG9yKGQsIGkpLCB3cmFwLnNlbGVjdCgnZGVmcycpKTtcbiAgICAgIH07XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAvLyBTZXR1cCBzY2FsZXNcblxuICAgICAgZnVuY3Rpb24gY2FsY0RpbWVuc2lvbnMoKSB7XG4gICAgICAgIGNhbGN1bGF0ZWRXaWR0aCA9IGNhbGNXaWR0aChmdW5uZWxPZmZzZXQpO1xuICAgICAgICBjYWxjdWxhdGVkSGVpZ2h0ID0gY2FsY0hlaWdodCgpO1xuICAgICAgICBjYWxjdWxhdGVkQ2VudGVyID0gY2FsY0NlbnRlcihmdW5uZWxPZmZzZXQpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBjYWxjU2NhbGVzKCkge1xuICAgICAgICB2YXIgZnVubmVsQXJlYSA9IGFyZWFUcmFwZXpvaWQoY2FsY3VsYXRlZEhlaWdodCwgY2FsY3VsYXRlZFdpZHRoKSxcbiAgICAgICAgICAgIGZ1bm5lbFNoaWZ0ID0gMCxcbiAgICAgICAgICAgIGZ1bm5lbE1pbkhlaWdodCA9IDQsXG4gICAgICAgICAgICBfYmFzZSA9IGNhbGN1bGF0ZWRXaWR0aCAtIDIgKiByICogY2FsY3VsYXRlZEhlaWdodCxcbiAgICAgICAgICAgIF9ib3R0b20gPSBjYWxjdWxhdGVkSGVpZ2h0O1xuXG4gICAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgIC8vIEFkanVzdCBwb2ludHMgdG8gY29tcGVuc2F0ZSBmb3IgcGFyYWxsYXggb2Ygc2xpY2VcbiAgICAgICAgLy8gYnkgaW5jcmVhc2luZyBoZWlnaHQgcmVsYXRpdmUgdG8gYXJlYSBvZiBmdW5uZWxcblxuICAgICAgICAvLyBydW5zIGZyb20gYm90dG9tIHRvIHRvcFxuICAgICAgICBkYXRhLmZvckVhY2goZnVuY3Rpb24oc2VyaWVzLCBpKSB7XG4gICAgICAgICAgc2VyaWVzLnZhbHVlcy5mb3JFYWNoKGZ1bmN0aW9uKHBvaW50KSB7XG5cbiAgICAgICAgICAgIHBvaW50Ll9oZWlnaHQgPSBmdW5uZWxUb3RhbCA+IDAgP1xuICAgICAgICAgICAgICBoZWlnaHRUcmFwZXpvaWQoZnVubmVsQXJlYSAqIHBvaW50LnZhbHVlIC8gZnVubmVsVG90YWwsIF9iYXNlKSA6XG4gICAgICAgICAgICAgIDA7XG5cbiAgICAgICAgICAgIC8vVE9ETzogbm90IHdvcmtpbmdcbiAgICAgICAgICAgIGlmIChwb2ludC5faGVpZ2h0IDwgZnVubmVsTWluSGVpZ2h0KSB7XG4gICAgICAgICAgICAgIGZ1bm5lbFNoaWZ0ICs9IHBvaW50Ll9oZWlnaHQgLSBmdW5uZWxNaW5IZWlnaHQ7XG4gICAgICAgICAgICAgIHBvaW50Ll9oZWlnaHQgPSBmdW5uZWxNaW5IZWlnaHQ7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGZ1bm5lbFNoaWZ0IDwgMCAmJiBwb2ludC5faGVpZ2h0ICsgZnVubmVsU2hpZnQgPiBmdW5uZWxNaW5IZWlnaHQpIHtcbiAgICAgICAgICAgICAgcG9pbnQuX2hlaWdodCArPSBmdW5uZWxTaGlmdDtcbiAgICAgICAgICAgICAgZnVubmVsU2hpZnQgPSAwO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwb2ludC5fYmFzZSA9IF9iYXNlO1xuICAgICAgICAgICAgcG9pbnQuX2JvdHRvbSA9IF9ib3R0b207XG4gICAgICAgICAgICBwb2ludC5fdG9wID0gcG9pbnQuX2JvdHRvbSAtIHBvaW50Ll9oZWlnaHQ7XG5cbiAgICAgICAgICAgIF9iYXNlICs9IDIgKiByICogcG9pbnQuX2hlaWdodDtcbiAgICAgICAgICAgIF9ib3R0b20gLT0gcG9pbnQuX2hlaWdodDtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmVtYXAgYW5kIGZsYXR0ZW4gdGhlIGRhdGEgZm9yIHVzZSBpbiBjYWxjdWxhdGluZyB0aGUgc2NhbGVzJyBkb21haW5zXG4gICAgICAgIC8vVE9ETzogdGhpcyBpcyBubyBsb25nZXIgbmVlZGVkXG4gICAgICAgIHZhciBzZXJpZXNEYXRhID0geURvbWFpbiB8fCAvLyBpZiB3ZSBrbm93IHlEb21haW4sIG5vIG5lZWQgdG8gY2FsY3VsYXRlXG4gICAgICAgICAgICAgIGQzLmV4dGVudChcbiAgICAgICAgICAgICAgICBkMy5tZXJnZShcbiAgICAgICAgICAgICAgICAgIGRhdGEubWFwKGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQudmFsdWVzLm1hcChmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQuX3RvcDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICkuY29uY2F0KGZvcmNlWSlcbiAgICAgICAgICAgICAgKTtcblxuICAgICAgICB5IC5kb21haW4oc2VyaWVzRGF0YSlcbiAgICAgICAgICAucmFuZ2UoW2NhbGN1bGF0ZWRIZWlnaHQsIDBdKTtcbiAgICAgIH1cblxuICAgICAgY2FsY0RpbWVuc2lvbnMoKTtcbiAgICAgIGNhbGNTY2FsZXMoKTtcblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIC8vIFNldHVwIGNvbnRhaW5lcnMgYW5kIHNrZWxldG9uIG9mIGNoYXJ0XG4gICAgICB2YXIgd3JhcF9iaW5kID0gY29udGFpbmVyLnNlbGVjdEFsbCgnZy5zYy13cmFwJykuZGF0YShbZGF0YV0pO1xuICAgICAgdmFyIHdyYXBfZW50ciA9IHdyYXBfYmluZC5lbnRlcigpLmFwcGVuZCgnZycpLmF0dHIoJ2NsYXNzJywgJ3NjLXdyYXAgc2MtZnVubmVsJyk7XG4gICAgICB2YXIgd3JhcCA9IGNvbnRhaW5lci5zZWxlY3QoJy5zYy13cmFwJykubWVyZ2Uod3JhcF9lbnRyKTtcblxuICAgICAgdmFyIGRlZnNfZW50ciA9IHdyYXBfZW50ci5hcHBlbmQoJ2RlZnMnKTtcblxuICAgICAgd3JhcC5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyBtYXJnaW4ubGVmdCArICcsJyArIG1hcmdpbi50b3AgKyAnKScpO1xuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgLy8gRGVmaW5pdGlvbnNcblxuICAgICAgaWYgKHRleHR1cmVGaWxsKSB7XG4gICAgICAgIHZhciBtYXNrID0gdXRpbHMuY3JlYXRlVGV4dHVyZShkZWZzX2VudHIsIGlkKTtcbiAgICAgIH1cblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIC8vIEFwcGVuZCBtYWpvciBkYXRhIHNlcmllcyBncm91cGluZyBjb250YWluZXJzXG5cbiAgICAgIHZhciBzZXJpZXNfYmluZCA9IHdyYXAuc2VsZWN0QWxsKCcuc2Mtc2VyaWVzJykuZGF0YShkYXRhLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnNlcmllc0luZGV4OyB9KTtcbiAgICAgIHZhciBzZXJpZXNfZW50ciA9IHNlcmllc19iaW5kLmVudGVyKCkuYXBwZW5kKCdnJykuYXR0cignY2xhc3MnLCAnc2Mtc2VyaWVzJyk7XG4gICAgICAvLyBzZXJpZXNfYmluZC5leGl0KCkudHJhbnNpdGlvbigpLmR1cmF0aW9uKGR1cmF0aW9uKVxuICAgICAgLy8gICAuc2VsZWN0QWxsKCdnLnNjLXNsaWNlJylcbiAgICAgIC8vICAgLmRlbGF5KGZ1bmN0aW9uKGQsIGkpIHsgcmV0dXJuIGkgKiBkZWxheSAvIGRhdGFbMF0udmFsdWVzLmxlbmd0aDsgfSlcbiAgICAgIC8vICAgICAuYXR0cigncG9pbnRzJywgZnVuY3Rpb24oZCkge1xuICAgICAgLy8gICAgICAgcmV0dXJuIHBvaW50c1RyYXBlem9pZChkLCAwLCBjYWxjdWxhdGVkV2lkdGgpO1xuICAgICAgLy8gICAgIH0pXG4gICAgICAvLyAgICAgLnN0eWxlKCdzdHJva2Utb3BhY2l0eScsIDFlLTYpXG4gICAgICAvLyAgICAgLnN0eWxlKCdmaWxsLW9wYWNpdHknLCAxZS02KVxuICAgICAgLy8gICAgIC5yZW1vdmUoKTtcbiAgICAgIC8vIHNlcmllc19iaW5kLmV4aXQoKS50cmFuc2l0aW9uKCkuZHVyYXRpb24oZHVyYXRpb24pXG4gICAgICAvLyAgIC5zZWxlY3RBbGwoJ2cuc2MtbGFiZWwtdmFsdWUnKVxuICAgICAgLy8gICAuZGVsYXkoZnVuY3Rpb24oZCwgaSkgeyByZXR1cm4gaSAqIGRlbGF5IC8gZGF0YVswXS52YWx1ZXMubGVuZ3RoOyB9KVxuICAgICAgLy8gICAgIC5hdHRyKCd5JywgMClcbiAgICAgIC8vICAgICAuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgY2FsY3VsYXRlZENlbnRlciArICcsMCknKVxuICAgICAgLy8gICAgIC5zdHlsZSgnc3Ryb2tlLW9wYWNpdHknLCAxZS02KVxuICAgICAgLy8gICAgIC5zdHlsZSgnZmlsbC1vcGFjaXR5JywgMWUtNilcbiAgICAgIC8vICAgICAucmVtb3ZlKCk7XG4gICAgICBzZXJpZXNfYmluZC5leGl0KCkucmVtb3ZlKCk7XG4gICAgICB2YXIgc2VyaWVzID0gd3JhcC5zZWxlY3RBbGwoJy5zYy1zZXJpZXMnKS5tZXJnZShzZXJpZXNfZW50cik7XG5cbiAgICAgIHNlcmllc19lbnRyXG4gICAgICAgIC5zdHlsZSgnc3Ryb2tlJywgJyNGRkYnKVxuICAgICAgICAuc3R5bGUoJ3N0cm9rZS13aWR0aCcsIDIpXG4gICAgICAgIC5zdHlsZSgnc3Ryb2tlLW9wYWNpdHknLCAxKVxuICAgICAgICAub24oJ21vdXNlb3ZlcicsIGZ1bmN0aW9uKGQsIGksIGopIHsgLy9UT0RPOiBmaWd1cmUgb3V0IHdoeSBqIHdvcmtzIGFib3ZlLCBidXQgbm90IGhlcmVcbiAgICAgICAgICBkMy5zZWxlY3QodGhpcykuY2xhc3NlZCgnaG92ZXInLCB0cnVlKTtcbiAgICAgICAgfSlcbiAgICAgICAgLm9uKCdtb3VzZW91dCcsIGZ1bmN0aW9uKGQsIGksIGopIHtcbiAgICAgICAgICBkMy5zZWxlY3QodGhpcykuY2xhc3NlZCgnaG92ZXInLCBmYWxzZSk7XG4gICAgICAgIH0pO1xuXG4gICAgICBzZXJpZXNcbiAgICAgICAgLmF0dHIoJ2NsYXNzJywgZnVuY3Rpb24oZCkgeyByZXR1cm4gY2xhc3NlcyhkLCBkLnNlcmllc0luZGV4KTsgfSlcbiAgICAgICAgLmF0dHIoJ2ZpbGwnLCBmdW5jdGlvbihkKSB7IHJldHVybiBmaWxsKGQsIGQuc2VyaWVzSW5kZXgpOyB9KVxuICAgICAgICAuY2xhc3NlZCgnc2MtYWN0aXZlJywgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5hY3RpdmUgPT09ICdhY3RpdmUnOyB9KVxuICAgICAgICAuY2xhc3NlZCgnc2MtaW5hY3RpdmUnLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLmFjdGl2ZSA9PT0gJ2luYWN0aXZlJzsgfSk7XG5cbiAgICAgIHNlcmllcy50cmFuc2l0aW9uKCkuZHVyYXRpb24oZHVyYXRpb24pXG4gICAgICAgICAgLnN0eWxlKCdzdHJva2Utb3BhY2l0eScsIDEpXG4gICAgICAgICAgLnN0eWxlKCdmaWxsLW9wYWNpdHknLCAxKTtcblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIC8vIEFwcGVuZCBwb2x5Z29ucyBmb3IgZnVubmVsXG4gICAgICAvLyBTYXZlIGZvciBsYXRlci4uLlxuICAgICAgLy8gZnVuY3Rpb24ocywgaSkge1xuICAgICAgLy8gICByZXR1cm4gcy52YWx1ZXMubWFwKGZ1bmN0aW9uKHYsIGopIHtcbiAgICAgIC8vICAgICB2LmRpc2FibGVkID0gcy5kaXNhYmxlZDtcbiAgICAgIC8vICAgICB2LmtleSA9IHMua2V5O1xuICAgICAgLy8gICAgIHYuc2VyaWVzSW5kZXggPSBzLnNlcmllc0luZGV4O1xuICAgICAgLy8gICAgIHYuaW5kZXggPSBqO1xuICAgICAgLy8gICAgIHJldHVybiB2O1xuICAgICAgLy8gICB9KTtcbiAgICAgIC8vIH0sXG5cbiAgICAgIHZhciBzbGljZV9iaW5kID0gc2VyaWVzLnNlbGVjdEFsbCgnZy5zYy1zbGljZScpXG4gICAgICAgICAgICAuZGF0YShmdW5jdGlvbihkKSB7IHJldHVybiBkLnZhbHVlczsgfSwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5zZXJpZXNJbmRleDsgfSk7XG4gICAgICBzbGljZV9iaW5kLmV4aXQoKS5yZW1vdmUoKTtcbiAgICAgIHZhciBzbGljZV9lbnRyID0gc2xpY2VfYmluZC5lbnRlcigpLmFwcGVuZCgnZycpLmF0dHIoJ2NsYXNzJywgJ3NjLXNsaWNlJyk7XG4gICAgICB2YXIgc2xpY2VzID0gc2VyaWVzLnNlbGVjdEFsbCgnZy5zYy1zbGljZScpLm1lcmdlKHNsaWNlX2VudHIpO1xuXG4gICAgICBzbGljZV9lbnRyLmFwcGVuZCgncG9seWdvbicpXG4gICAgICAgIC5hdHRyKCdjbGFzcycsICdzYy1iYXNlJyk7XG5cbiAgICAgIHNsaWNlcy5zZWxlY3QoJ3BvbHlnb24uc2MtYmFzZScpXG4gICAgICAgIC5hdHRyKCdwb2ludHMnLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgcmV0dXJuIHBvaW50c1RyYXBlem9pZChkLCAwLCBjYWxjdWxhdGVkV2lkdGgpO1xuICAgICAgICB9KTtcblxuICAgICAgaWYgKHRleHR1cmVGaWxsKSB7XG4gICAgICAgIC8vIEZvciBvbiBjbGljayBhY3RpdmUgYmFyc1xuICAgICAgICBzbGljZV9lbnRyLmFwcGVuZCgncG9seWdvbicpXG4gICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ3NjLXRleHR1cmUnKVxuICAgICAgICAgIC5zdHlsZSgnbWFzaycsICd1cmwoJyArIG1hc2sgKyAnKScpO1xuXG4gICAgICAgIHNsaWNlcy5zZWxlY3QoJ3BvbHlnb24uc2MtdGV4dHVyZScpXG4gICAgICAgICAgLmF0dHIoJ3BvaW50cycsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiBwb2ludHNUcmFwZXpvaWQoZCwgMCwgY2FsY3VsYXRlZFdpZHRoKTtcbiAgICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgc2xpY2VfZW50clxuICAgICAgICAub24oJ21vdXNlb3ZlcicsIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgICBkMy5zZWxlY3QodGhpcykuY2xhc3NlZCgnaG92ZXInLCB0cnVlKTtcbiAgICAgICAgICB2YXIgZW8gPSBidWlsZEV2ZW50T2JqZWN0KGQzLmV2ZW50LCBkLCBpKTtcbiAgICAgICAgICBkaXNwYXRjaC5jYWxsKCdlbGVtZW50TW91c2VvdmVyJywgdGhpcywgZW8pO1xuICAgICAgICB9KVxuICAgICAgICAub24oJ21vdXNlbW92ZScsIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgICB2YXIgZSA9IGQzLmV2ZW50O1xuICAgICAgICAgIGRpc3BhdGNoLmNhbGwoJ2VsZW1lbnRNb3VzZW1vdmUnLCB0aGlzLCBlKTtcbiAgICAgICAgfSlcbiAgICAgICAgLm9uKCdtb3VzZW91dCcsIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgICBkMy5zZWxlY3QodGhpcykuY2xhc3NlZCgnaG92ZXInLCBmYWxzZSk7XG4gICAgICAgICAgZGlzcGF0Y2guY2FsbCgnZWxlbWVudE1vdXNlb3V0JywgdGhpcyk7XG4gICAgICAgIH0pXG4gICAgICAgIC5vbignY2xpY2snLCBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgZDMuZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgdmFyIGVvID0gYnVpbGRFdmVudE9iamVjdChkMy5ldmVudCwgZCwgaSk7XG4gICAgICAgICAgZGlzcGF0Y2guY2FsbCgnZWxlbWVudENsaWNrJywgdGhpcywgZW8pO1xuICAgICAgICB9KVxuICAgICAgICAub24oJ2RibGNsaWNrJywgZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICAgIGQzLmV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgIHZhciBlbyA9IGJ1aWxkRXZlbnRPYmplY3QoZDMuZXZlbnQsIGQsIGkpO1xuICAgICAgICAgIGRpc3BhdGNoLmNhbGwoJ2VsZW1lbnREYmxDbGljaycsIHRoaXMsIGVvKTtcbiAgICAgICAgfSk7XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAvLyBBcHBlbmQgY29udGFpbmVycyBmb3IgbGFiZWxzXG5cbiAgICAgIHZhciBsYWJlbHNfYmluZCA9IHNlcmllcy5zZWxlY3RBbGwoJy5zYy1sYWJlbC12YWx1ZScpXG4gICAgICAgICAgICAuZGF0YShmdW5jdGlvbihkKSB7IHJldHVybiBkLnZhbHVlczsgfSwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5zZXJpZXNJbmRleDsgfSk7XG4gICAgICBsYWJlbHNfYmluZC5leGl0KCkucmVtb3ZlKCk7XG4gICAgICB2YXIgbGFiZWxzX2VudHIgPSBsYWJlbHNfYmluZC5lbnRlcigpLmFwcGVuZCgnZycpLmF0dHIoJ2NsYXNzJywgJ3NjLWxhYmVsLXZhbHVlJyk7XG4gICAgICB2YXIgbGFiZWxzID0gc2VyaWVzLnNlbGVjdEFsbCgnZy5zYy1sYWJlbC12YWx1ZScpLm1lcmdlKGxhYmVsc19lbnRyKTtcblxuICAgICAgbGFiZWxzXG4gICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyBjYWxjdWxhdGVkQ2VudGVyICsgJywwKScpO1xuXG4gICAgICB2YXIgc2lkZUxhYmVscyA9IGxhYmVscy5maWx0ZXIoJy5zYy1sYWJlbC1zaWRlJyk7XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAvLyBVcGRhdGUgZnVubmVsIGxhYmVsc1xuXG4gICAgICBmdW5jdGlvbiByZW5kZXJGdW5uZWxMYWJlbHMoKSB7XG4gICAgICAgIC8vIFJlbW92ZSByZXNwb25zaXZlIGxhYmVsIGVsZW1lbnRzXG4gICAgICAgIGxhYmVscy5zZWxlY3RBbGwoJ3BvbHlsaW5lJykucmVtb3ZlKCk7XG4gICAgICAgIGxhYmVscy5zZWxlY3RBbGwoJ3JlY3QnKS5yZW1vdmUoKTtcbiAgICAgICAgbGFiZWxzLnNlbGVjdEFsbCgndGV4dCcpLnJlbW92ZSgpO1xuXG4gICAgICAgIGxhYmVscy5hcHBlbmQoJ3JlY3QnKVxuICAgICAgICAgIC5hdHRyKCdjbGFzcycsICdzYy1sYWJlbC1ib3gnKVxuICAgICAgICAgIC5hdHRyKCd4JywgMClcbiAgICAgICAgICAuYXR0cigneScsIDApXG4gICAgICAgICAgLmF0dHIoJ3dpZHRoJywgMClcbiAgICAgICAgICAuYXR0cignaGVpZ2h0JywgMClcbiAgICAgICAgICAuYXR0cigncngnLCAyKVxuICAgICAgICAgIC5hdHRyKCdyeScsIDIpXG4gICAgICAgICAgLnN0eWxlKCdwb2ludGVyLWV2ZW50cycsICdub25lJylcbiAgICAgICAgICAuc3R5bGUoJ3N0cm9rZS13aWR0aCcsIDApXG4gICAgICAgICAgLnN0eWxlKCdmaWxsLW9wYWNpdHknLCAwKTtcblxuICAgICAgICAvLyBBcHBlbmQgbGFiZWwgdGV4dCBhbmQgd3JhcCBpZiBuZWVkZWRcbiAgICAgICAgbGFiZWxzLmFwcGVuZCgndGV4dCcpXG4gICAgICAgICAgLnRleHQoZm10S2V5KVxuICAgICAgICAgICAgLmNhbGwoZm10TGFiZWwsICdzYy1sYWJlbCcsIDAuODUsICdtaWRkbGUnLCBmbXRGaWxsKTtcblxuICAgICAgICBsYWJlbHMuc2VsZWN0KCcuc2MtbGFiZWwnKVxuICAgICAgICAgIC5jYWxsKFxuICAgICAgICAgICAgaGFuZGxlTGFiZWwsXG4gICAgICAgICAgICAod3JhcExhYmVscyA/IHdyYXBMYWJlbCA6IGVsbGlwc2lmeUxhYmVsKSxcbiAgICAgICAgICAgIGNhbGNGdW5uZWxXaWR0aEF0U2xpY2VNaWRwb2ludCxcbiAgICAgICAgICAgIGZ1bmN0aW9uKHR4dCwgZHkpIHtcbiAgICAgICAgICAgICAgZm10TGFiZWwodHh0LCAnc2MtbGFiZWwnLCBkeSwgJ21pZGRsZScsIGZtdEZpbGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICk7XG5cbiAgICAgICAgLy8gQXBwZW5kIHZhbHVlIGFuZCBjb3VudCB0ZXh0XG4gICAgICAgIGxhYmVscy5hcHBlbmQoJ3RleHQnKVxuICAgICAgICAgIC50ZXh0KGZtdFZhbHVlKVxuICAgICAgICAgICAgLmNhbGwoZm10TGFiZWwsICdzYy12YWx1ZScsIDAuODUsICdtaWRkbGUnLCBmbXRGaWxsKTtcblxuICAgICAgICBsYWJlbHMuc2VsZWN0KCcuc2MtdmFsdWUnKVxuICAgICAgICAgIC5hcHBlbmQoJ3RzcGFuJylcbiAgICAgICAgICAgIC50ZXh0KGZtdENvdW50KTtcblxuICAgICAgICBsYWJlbHNcbiAgICAgICAgICAuY2FsbChwb3NpdGlvblZhbHVlKVxuICAgICAgICAgIC8vIFBvc2l0aW9uIGxhYmVscyBhbmQgaWRlbnRpZnkgc2lkZSBsYWJlbHNcbiAgICAgICAgICAuY2FsbChjYWxjRnVubmVsTGFiZWxEaW1lbnNpb25zKVxuICAgICAgICAgIC5jYWxsKHBvc2l0aW9uTGFiZWxCb3gpO1xuXG4gICAgICAgIGxhYmVsc1xuICAgICAgICAgIC5jbGFzc2VkKCdzYy1sYWJlbC1zaWRlJywgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC50b29UYWxsIHx8IGQudG9vV2lkZTsgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAvLyBVcGRhdGUgc2lkZSBsYWJlbHNcblxuICAgICAgZnVuY3Rpb24gcmVuZGVyU2lkZUxhYmVscygpIHtcbiAgICAgICAgLy8gUmVtb3ZlIGFsbCByZXNwb25zaXZlIGVsZW1lbnRzXG4gICAgICAgIHNpZGVMYWJlbHMgPSBsYWJlbHMuZmlsdGVyKCcuc2MtbGFiZWwtc2lkZScpO1xuICAgICAgICBzaWRlTGFiZWxzLnNlbGVjdEFsbCgnLnNjLWxhYmVsJykucmVtb3ZlKCk7XG4gICAgICAgIHNpZGVMYWJlbHMuc2VsZWN0QWxsKCdyZWN0JykucmVtb3ZlKCk7XG4gICAgICAgIHNpZGVMYWJlbHMuc2VsZWN0QWxsKCdwb2x5bGluZScpLnJlbW92ZSgpO1xuXG4gICAgICAgIC8vIFBvc2l0aW9uIHNpZGUgbGFiZWxzXG4gICAgICAgIHNpZGVMYWJlbHMuYXBwZW5kKCd0ZXh0JylcbiAgICAgICAgICAudGV4dChmbXRLZXkpXG4gICAgICAgICAgICAuY2FsbChmbXRMYWJlbCwgJ3NjLWxhYmVsJywgMC44NSwgJ3N0YXJ0JywgJyM1NTUnKTtcblxuICAgICAgICBzaWRlTGFiZWxzLnNlbGVjdCgnLnNjLWxhYmVsJylcbiAgICAgICAgICAuY2FsbChcbiAgICAgICAgICAgIGhhbmRsZUxhYmVsLFxuICAgICAgICAgICAgKHdyYXBMYWJlbHMgPyB3cmFwTGFiZWwgOiBlbGxpcHNpZnlMYWJlbCksXG4gICAgICAgICAgICAod3JhcExhYmVscyA/IGNhbGNTaWRlV2lkdGggOiBtYXhTaWRlTGFiZWxXaWR0aCksXG4gICAgICAgICAgICBmdW5jdGlvbih0eHQsIGR5KSB7XG4gICAgICAgICAgICAgIGZtdExhYmVsKHR4dCwgJ3NjLWxhYmVsJywgZHksICdzdGFydCcsICcjNTU1Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgKTtcblxuICAgICAgICBzaWRlTGFiZWxzXG4gICAgICAgICAgLmNhbGwocG9zaXRpb25WYWx1ZSk7XG5cbiAgICAgICAgc2lkZUxhYmVscy5zZWxlY3QoJy5zYy12YWx1ZScpXG4gICAgICAgICAgLnN0eWxlKCd0ZXh0LWFuY2hvcicsICdzdGFydCcpXG4gICAgICAgICAgLnN0eWxlKCdmaWxsJywgJyM1NTUnKTtcblxuICAgICAgICBzaWRlTGFiZWxzXG4gICAgICAgICAgLmNhbGwoY2FsY1NpZGVMYWJlbERpbWVuc2lvbnMpO1xuXG4gICAgICAgIC8vIFJlZmxvdyBzaWRlIGxhYmVsIHZlcnRpY2FsIHBvc2l0aW9uIHRvIHByZXZlbnQgb3ZlcmxhcFxuICAgICAgICB2YXIgZDAgPSAwO1xuXG4gICAgICAgIC8vIFRvcCB0byBib3R0b21cbiAgICAgICAgZm9yICh2YXIgZ3JvdXBzID0gc2lkZUxhYmVscy5ub2RlcygpLCBqID0gZ3JvdXBzLmxlbmd0aCAtIDE7IGogPj0gMDsgLS1qKSB7XG4gICAgICAgICAgdmFyIGQgPSBkMy5zZWxlY3QoZ3JvdXBzW2pdKS5kYXRhKClbMF07XG4gICAgICAgICAgaWYgKGQpIHtcbiAgICAgICAgICAgIGlmICghZDApIHtcbiAgICAgICAgICAgICAgZC5sYWJlbEJvdHRvbSA9IGQubGFiZWxUb3AgKyBkLmxhYmVsSGVpZ2h0ICsgbGFiZWxTcGFjZTtcbiAgICAgICAgICAgICAgZDAgPSBkLmxhYmVsQm90dG9tO1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZC5sYWJlbFRvcCA9IE1hdGgubWF4KGQwLCBkLmxhYmVsVG9wKTtcbiAgICAgICAgICAgIGQubGFiZWxCb3R0b20gPSBkLmxhYmVsVG9wICsgZC5sYWJlbEhlaWdodCArIGxhYmVsU3BhY2U7XG4gICAgICAgICAgICBkMCA9IGQubGFiZWxCb3R0b207XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQW5kIHRoZW4uLi5cbiAgICAgICAgaWYgKGQwICYmIGQwIC0gbGFiZWxTcGFjZSA+IGQzLm1heCh5LnJhbmdlKCkpKSB7XG5cbiAgICAgICAgICBkMCA9IDA7XG5cbiAgICAgICAgICAvLyBCb3R0b20gdG8gdG9wXG4gICAgICAgICAgZm9yICh2YXIgZ3JvdXBzID0gc2lkZUxhYmVscy5ub2RlcygpLCBqID0gMCwgbSA9IGdyb3Vwcy5sZW5ndGg7IGogPCBtOyArK2opIHtcbiAgICAgICAgICAgIHZhciBkID0gZDMuc2VsZWN0KGdyb3Vwc1tqXSkuZGF0YSgpWzBdO1xuICAgICAgICAgICAgaWYgKGQpIHtcbiAgICAgICAgICAgICAgaWYgKCFkMCkge1xuICAgICAgICAgICAgICAgIGQubGFiZWxCb3R0b20gPSBjYWxjdWxhdGVkSGVpZ2h0IC0gMTtcbiAgICAgICAgICAgICAgICBkLmxhYmVsVG9wID0gZC5sYWJlbEJvdHRvbSAtIGQubGFiZWxIZWlnaHQ7XG4gICAgICAgICAgICAgICAgZDAgPSBkLmxhYmVsVG9wO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgZC5sYWJlbEJvdHRvbSA9IE1hdGgubWluKGQwLCBkLmxhYmVsQm90dG9tKTtcbiAgICAgICAgICAgICAgZC5sYWJlbFRvcCA9IGQubGFiZWxCb3R0b20gLSBkLmxhYmVsSGVpZ2h0IC0gbGFiZWxTcGFjZTtcbiAgICAgICAgICAgICAgZDAgPSBkLmxhYmVsVG9wO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIG9rLCBGSU5BTExZLCBzbyBpZiB3ZSBhcmUgYWJvdmUgdGhlIHRvcCBvZiB0aGUgZnVubmVsLFxuICAgICAgICAgIC8vIHdlIG5lZWQgdG8gbG93ZXIgdGhlbSBhbGwgYmFjayBkb3duXG4gICAgICAgICAgaWYgKGQwIDwgMCkge1xuICAgICAgICAgICAgc2lkZUxhYmVscy5lYWNoKGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgICAgICAgICBkLmxhYmVsVG9wIC09IGQwO1xuICAgICAgICAgICAgICAgIGQubGFiZWxCb3R0b20gLT0gZDA7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGQwID0gMDtcblxuICAgICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgICAvLyBSZWNhbGN1bGF0ZSBmdW5uZWwgb2Zmc2V0IGJhc2VkIG9uIHNpZGUgbGFiZWwgZGltZW5zaW9uc1xuXG4gICAgICAgIHNpZGVMYWJlbHNcbiAgICAgICAgICAuY2FsbChjYWxjT2Zmc2V0cyk7XG4gICAgICB9XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAvLyBDYWxjdWxhdGUgdGhlIHdpZHRoIGFuZCBwb3NpdGlvbiBvZiBsYWJlbHMgd2hpY2hcbiAgICAgIC8vIGRldGVybWluZXMgdGhlIGZ1bm5lbCBvZmZzZXQgZGltZW5zaW9uXG5cbiAgICAgIGZ1bmN0aW9uIHJlbmRlckxhYmVscygpIHtcbiAgICAgICAgcmVuZGVyRnVubmVsTGFiZWxzKCk7XG4gICAgICAgIHJlbmRlclNpZGVMYWJlbHMoKTtcbiAgICAgIH1cblxuICAgICAgcmVuZGVyTGFiZWxzKCk7XG4gICAgICBjYWxjRGltZW5zaW9ucygpO1xuICAgICAgY2FsY1NjYWxlcygpO1xuXG4gICAgICAvLyBDYWxscyB0d2ljZSBzaW5jZSB0aGUgZmlyc3QgY2FsbCBtYXkgY3JlYXRlIGEgZnVubmVsIG9mZnNldFxuICAgICAgLy8gd2hpY2ggZGVjcmVhc2VzIHRoZSBmdW5uZWwgd2lkdGggd2hpY2ggaW1wYWN0cyBsYWJlbCBwb3NpdGlvblxuXG4gICAgICByZW5kZXJMYWJlbHMoKTtcbiAgICAgIGNhbGNEaW1lbnNpb25zKCk7XG4gICAgICBjYWxjU2NhbGVzKCk7XG5cbiAgICAgIHJlbmRlckxhYmVscygpO1xuICAgICAgY2FsY0RpbWVuc2lvbnMoKTtcbiAgICAgIGNhbGNTY2FsZXMoKTtcblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIC8vIFJlcG9zaXRpb24gcmVzcG9uc2l2ZSBlbGVtZW50c1xuXG4gICAgICBzbGljZXMuc2VsZWN0KCcuc2MtYmFzZScpXG4gICAgICAgIC5hdHRyKCdwb2ludHMnLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgcmV0dXJuIHBvaW50c1RyYXBlem9pZChkLCAxLCBjYWxjdWxhdGVkV2lkdGgpO1xuICAgICAgICB9KTtcblxuICAgICAgaWYgKHRleHR1cmVGaWxsKSB7XG4gICAgICAgIHNsaWNlcy5zZWxlY3RBbGwoJy5zYy10ZXh0dXJlJylcbiAgICAgICAgICAuYXR0cigncG9pbnRzJywgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgcmV0dXJuIHBvaW50c1RyYXBlem9pZChkLCAxLCBjYWxjdWxhdGVkV2lkdGgpO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLnN0eWxlKCdmaWxsJywgZm10RmlsbCk7XG4gICAgICB9XG5cbiAgICAgIGxhYmVsc1xuICAgICAgICAuYXR0cigndHJhbnNmb3JtJywgZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHZhciB4VHJhbnMgPSBkLnRvb1RhbGwgPyAwIDogY2FsY3VsYXRlZENlbnRlcixcbiAgICAgICAgICAgICAgeVRyYW5zID0gZC50b29UYWxsID8gMCA6IGQubGFiZWxUb3A7XG4gICAgICAgICAgcmV0dXJuICd0cmFuc2xhdGUoJyArIHhUcmFucyArICcsJyArIHlUcmFucyArICcpJztcbiAgICAgICAgfSk7XG5cbiAgICAgIHNpZGVMYWJlbHNcbiAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICByZXR1cm4gJ3RyYW5zbGF0ZSgnICsgbGFiZWxPZmZzZXQgKyAnLCcgKyBkLmxhYmVsVG9wICsgJyknO1xuICAgICAgICB9KTtcblxuICAgICAgc2lkZUxhYmVsc1xuICAgICAgICAuYXBwZW5kKCdwb2x5bGluZScpXG4gICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ3NjLWxhYmVsLWxlYWRlcicpXG4gICAgICAgICAgLnN0eWxlKCdmaWxsLW9wYWNpdHknLCAwKVxuICAgICAgICAgIC5zdHlsZSgnc3Ryb2tlJywgJyM5OTknKVxuICAgICAgICAgIC5zdHlsZSgnc3Ryb2tlLXdpZHRoJywgMSlcbiAgICAgICAgICAuc3R5bGUoJ3N0cm9rZS1vcGFjaXR5JywgMC41KTtcblxuICAgICAgc2lkZUxhYmVscy5zZWxlY3RBbGwoJ3BvbHlsaW5lJylcbiAgICAgICAgLmNhbGwocG9pbnRzTGVhZGVyKTtcblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIC8vIFV0aWxpdHkgZnVuY3Rpb25zXG5cbiAgICAgIC8vIFRPRE86IHVzZSBzY2FsZXMgaW5zdGVhZCBvZiByYXRpbyBhbGdlYnJhXG4gICAgICAvLyB2YXIgZnVubmVsU2NhbGUgPSBkMy5zY2FsZUxpbmVhcigpXG4gICAgICAvLyAgICAgICAuZG9tYWluKFt3IC8gMiwgbWluaW11bV0pXG4gICAgICAvLyAgICAgICAucmFuZ2UoWzAsIG1heHkxKnRoZW5zY2FsZXRoaXN0b3ByZXZlbnRtaW5pbXVtZnJvbXBhc3NpbmddKTtcblxuICAgICAgZnVuY3Rpb24gYnVpbGRFdmVudE9iamVjdChlLCBkLCBpKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgIGtleTogZm10S2V5KGQpLFxuICAgICAgICAgIHZhbHVlOiBmbXRWYWx1ZShkKSxcbiAgICAgICAgICBjb3VudDogZm10Q291bnQoZCksXG4gICAgICAgICAgZGF0YTogZCxcbiAgICAgICAgICBzZXJpZXM6IGQuc2VyaWVzLFxuICAgICAgICAgIGU6IGVcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gd3JhcExhYmVsKGQsIGxibCwgZm5XaWR0aCwgZm10TGFiZWwpIHtcbiAgICAgICAgdmFyIHRleHQgPSBsYmwudGV4dCgpLFxuICAgICAgICAgICAgZHkgPSBwYXJzZUZsb2F0KGxibC5hdHRyKCdkeScpKSxcbiAgICAgICAgICAgIHdvcmQsXG4gICAgICAgICAgICB3b3JkcyA9IHRleHQuc3BsaXQoL1xccysvKS5yZXZlcnNlKCksXG4gICAgICAgICAgICBsaW5lID0gW10sXG4gICAgICAgICAgICBsaW5lTnVtYmVyID0gMCxcbiAgICAgICAgICAgIG1heFdpZHRoID0gZm5XaWR0aChkLCAwKSxcbiAgICAgICAgICAgIHBhcmVudCA9IGQzLnNlbGVjdChsYmwubm9kZSgpLnBhcmVudE5vZGUpO1xuXG4gICAgICAgIGxibC50ZXh0KG51bGwpO1xuXG4gICAgICAgIHdoaWxlICh3b3JkID0gd29yZHMucG9wKCkpIHtcbiAgICAgICAgICBsaW5lLnB1c2god29yZCk7XG4gICAgICAgICAgbGJsLnRleHQobGluZS5qb2luKCcgJykpO1xuXG4gICAgICAgICAgaWYgKGxibC5ub2RlKCkuZ2V0Q29tcHV0ZWRUZXh0TGVuZ3RoKCkgPiBtYXhXaWR0aCAmJiBsaW5lLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIGxpbmUucG9wKCk7XG4gICAgICAgICAgICBsYmwudGV4dChsaW5lLmpvaW4oJyAnKSk7XG4gICAgICAgICAgICBsaW5lID0gW3dvcmRdO1xuICAgICAgICAgICAgbGJsID0gcGFyZW50LmFwcGVuZCgndGV4dCcpO1xuICAgICAgICAgICAgbGJsLnRleHQod29yZClcbiAgICAgICAgICAgICAgLmNhbGwoZm10TGFiZWwsICsrbGluZU51bWJlciAqIDEuMSArIGR5KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gaGFuZGxlTGFiZWwobGJscywgZm5Gb3JtYXQsIGZuV2lkdGgsIGZtdExhYmVsKSB7XG4gICAgICAgIGxibHMuZWFjaChmdW5jdGlvbihkKSB7XG4gICAgICAgICAgdmFyIGxibCA9IGQzLnNlbGVjdCh0aGlzKTtcbiAgICAgICAgICBmbkZvcm1hdChkLCBsYmwsIGZuV2lkdGgsIGZtdExhYmVsKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGVsbGlwc2lmeUxhYmVsKGQsIGxibCwgZm5XaWR0aCwgZm10TGFiZWwpIHtcbiAgICAgICAgdmFyIHRleHQgPSBsYmwudGV4dCgpLFxuICAgICAgICAgICAgZHkgPSBwYXJzZUZsb2F0KGxibC5hdHRyKCdkeScpKSxcbiAgICAgICAgICAgIG1heFdpZHRoID0gZm5XaWR0aChkKTtcblxuICAgICAgICBsYmwudGV4dCh1dGlscy5zdHJpbmdFbGxpcHNpZnkodGV4dCwgY29udGFpbmVyLCBtYXhXaWR0aCkpXG4gICAgICAgICAgLmNhbGwoZm10TGFiZWwsIGR5KTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gbWF4U2lkZUxhYmVsV2lkdGgoZCkge1xuICAgICAgICAvLyBvdmVyYWxsIHdpZHRoIG9mIGNvbnRhaW5lciBtaW51cyB0aGUgd2lkdGggb2YgZnVubmVsIHRvcFxuICAgICAgICAvLyBvciBtaW5MYWJlbFdpZHRoLCB3aGljaCBldmVyIGlzIGdyZWF0ZXJcbiAgICAgICAgLy8gdGhpcyBpcyBhbHNvIG5vdyBhcyBmdW5uZWxPZmZzZXQgKG1heWJlKVxuICAgICAgICB2YXIgdHdlbnR5ID0gTWF0aC5tYXgoYXZhaWxhYmxlV2lkdGggLSBhdmFpbGFibGVIZWlnaHQgLyAxLjEsIG1pbkxhYmVsV2lkdGgpLFxuICAgICAgICAgICAgLy8gYm90dG9tIG9mIHNsaWNlXG4gICAgICAgICAgICBzbGljZUJvdHRvbSA9IGQuX2JvdHRvbSxcbiAgICAgICAgICAgIC8vIHggY29tcG9uZW50IG9mIHNsb3BlIEYgYXQgeVxuICAgICAgICAgICAgYmFzZSA9IHNsaWNlQm90dG9tICogcixcbiAgICAgICAgICAgIC8vIHRvdGFsIHdpZHRoIGF0IGJvdHRvbSBvZiBzbGljZVxuICAgICAgICAgICAgbWF4V2lkdGggPSB0d2VudHkgKyBiYXNlLFxuICAgICAgICAgICAgLy8gaGVpZ2h0IG9mIHNsb3BlZCBsZWFkZXJcbiAgICAgICAgICAgIGxlYWRlckhlaWdodCA9IE1hdGguYWJzKGQubGFiZWxCb3R0b20gLSBzbGljZUJvdHRvbSksXG4gICAgICAgICAgICAvLyB3aWR0aCBvZiB0aGUgYW5nbGVkIGxlYWRlclxuICAgICAgICAgICAgbGVhZGVyV2lkdGggPSBsZWFkZXJIZWlnaHQgKiByLFxuICAgICAgICAgICAgLy8gdG90YWwgd2lkdGggb2YgbGVhZGVyXG4gICAgICAgICAgICBsZWFkZXJUb3RhbCA9IGxhYmVsR2FwICsgbGVhZGVyV2lkdGggKyBsYWJlbEdhcCArIGxhYmVsR2FwLFxuICAgICAgICAgICAgLy8gdGhpcyBpcyB0aGUgZGlzdGFuY2UgZnJvbSBlbmQgb2YgbGFiZWwgcGx1cyBzcGFjaW5nIHRvIEZcbiAgICAgICAgICAgIGlPZmZzZXQgPSBtYXhXaWR0aCAtIGxlYWRlclRvdGFsO1xuXG4gICAgICAgIHJldHVybiBNYXRoLm1heChpT2Zmc2V0LCBtaW5MYWJlbFdpZHRoKTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gcG9pbnRzVHJhcGV6b2lkKGQsIGgsIHcpIHtcbiAgICAgICAgLy9NQVRIOiBkb24ndCBkZWxldGVcbiAgICAgICAgLy8gdiA9IDEvMiAqIGggKiAoYiArIGIgKyAyKnIqaCk7XG4gICAgICAgIC8vIDJ2ID0gaCAqIChiICsgYiArIDIqcipoKTtcbiAgICAgICAgLy8gMnYgPSBoICogKDIqYiArIDIqcipoKTtcbiAgICAgICAgLy8gMnYgPSAyKmIqaCArIDIqcipoKmg7XG4gICAgICAgIC8vIHYgPSBiKmggKyByKmgqaDtcbiAgICAgICAgLy8gdiAtIGIqaCAtIHIqaCpoID0gMDtcbiAgICAgICAgLy8gdi9yIC0gYipoL3IgLSBoKmggPSAwO1xuICAgICAgICAvLyBiL3IqaCArIGgqaCArIGIvci8yKmIvci8yID0gdi9yICsgYi9yLzIqYi9yLzI7XG4gICAgICAgIC8vIGgqaCArIGIvcipoICsgYi9yLzIqYi9yLzIgPSB2L3IgKyBiL3IvMipiL3IvMjtcbiAgICAgICAgLy8gKGggKyBiL3IvMikoaCArIGIvci8yKSA9IHYvciArIGIvci8yKmIvci8yO1xuICAgICAgICAvLyBoICsgYi9yLzIgPSBNYXRoLnNxcnQodi9yICsgYi9yLzIqYi9yLzIpO1xuICAgICAgICAvLyBoICA9IE1hdGguYWJzKE1hdGguc3FydCh2L3IgKyBiL3IvMipiL3IvMikpIC0gYi9yLzI7XG4gICAgICAgIHZhciB5MCA9IGQuX2JvdHRvbSxcbiAgICAgICAgICAgIHkxID0gZC5fdG9wLFxuICAgICAgICAgICAgdzAgPSB3IC8gMiAtIHIgKiB5MCxcbiAgICAgICAgICAgIHcxID0gdyAvIDIgLSByICogeTEsXG4gICAgICAgICAgICBjID0gY2FsY3VsYXRlZENlbnRlcjtcblxuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgIChjIC0gdzApICsgJywnICsgKHkwICogaCkgKyAnICcgK1xuICAgICAgICAgIChjIC0gdzEpICsgJywnICsgKHkxICogaCkgKyAnICcgK1xuICAgICAgICAgIChjICsgdzEpICsgJywnICsgKHkxICogaCkgKyAnICcgK1xuICAgICAgICAgIChjICsgdzApICsgJywnICsgKHkwICogaClcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gaGVpZ2h0VHJhcGV6b2lkKGEsIGIpIHtcbiAgICAgICAgdmFyIHggPSBiIC8gciAvIDI7XG4gICAgICAgIHJldHVybiBNYXRoLmFicyhNYXRoLnNxcnQoYSAvIHIgKyB4ICogeCkpIC0geDtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gYXJlYVRyYXBlem9pZChoLCB3KSB7XG4gICAgICAgIHJldHVybiBoICogKHcgLSBoICogcik7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGNhbGNXaWR0aChvZmZzZXQpIHtcbiAgICAgICAgcmV0dXJuIE1hdGgucm91bmQoTWF0aC5tYXgoTWF0aC5taW4oYXZhaWxhYmxlSGVpZ2h0IC8gMS4xLCBhdmFpbGFibGVXaWR0aCAtIG9mZnNldCksIDQwKSk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGNhbGNIZWlnaHQoKSB7XG4gICAgICAgIC8vIE1BVEg6IGRvbid0IGRlbGV0ZVxuICAgICAgICAvLyBoID0gNjY2LjY2NlxuICAgICAgICAvLyB3ID0gNjAwXG4gICAgICAgIC8vIG0gPSAyMDBcbiAgICAgICAgLy8gYXQgd2hhdCBoZWlnaHQgaXMgbSA9IDIwMFxuICAgICAgICAvLyB3ID0gaCAqIDAuMyA9IDY2NiAqIDAuMyA9IDIwMFxuICAgICAgICAvLyBtYXhoZWlnaHQgPSAoKHcgLSBtKSAvIDIpIC8gMC4zID0gKHcgLSBtKSAvIDAuNiA9IGhcbiAgICAgICAgLy8gKDYwMCAtIDIwMCkgLyAwLjYgPSA0MDAgLyAwLjYgPSA2NjZcbiAgICAgICAgcmV0dXJuIE1hdGgubWluKGNhbGN1bGF0ZWRXaWR0aCAqIDEuMSwgKGNhbGN1bGF0ZWRXaWR0aCAtIGNhbGN1bGF0ZWRXaWR0aCAqIHIpIC8gKDIgKiByKSk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGNhbGNDZW50ZXIob2Zmc2V0KSB7XG4gICAgICAgIHJldHVybiBjYWxjdWxhdGVkV2lkdGggLyAyICsgb2Zmc2V0O1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBjYWxjRnVubmVsV2lkdGhBdFNsaWNlTWlkcG9pbnQoZCkge1xuICAgICAgICB2YXIgYiA9IGNhbGN1bGF0ZWRXaWR0aCxcbiAgICAgICAgICAgIHYgPSBkLl9ib3R0b20gLSBkLl9oZWlnaHQgLyAyOyAvLyBtaWQgcG9pbnQgb2Ygc2xpY2VcbiAgICAgICAgcmV0dXJuIGIgLSB2ICogciAqIDI7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGNhbGNTaWRlV2lkdGgoZCwgb2Zmc2V0KSB7XG4gICAgICAgIHZhciBiID0gTWF0aC5tYXgoKGF2YWlsYWJsZVdpZHRoIC0gY2FsY3VsYXRlZFdpZHRoKSAvIDIsIG9mZnNldCksXG4gICAgICAgICAgICB2ID0gZC5fdG9wOyAvLyB0b3Agb2Ygc2xpY2VcbiAgICAgICAgcmV0dXJuIGIgKyB2ICogcjtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gY2FsY0xhYmVsQkJveChsYmwpIHtcbiAgICAgICAgcmV0dXJuIGQzLnNlbGVjdChsYmwpLm5vZGUoKS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gY2FsY0Z1bm5lbExhYmVsRGltZW5zaW9ucyhsYmxzKSB7XG4gICAgICAgIGxibHMuZWFjaChmdW5jdGlvbihkKSB7XG4gICAgICAgICAgdmFyIGJib3ggPSBjYWxjTGFiZWxCQm94KHRoaXMpO1xuXG4gICAgICAgICAgZC5sYWJlbEhlaWdodCA9IGJib3guaGVpZ2h0O1xuICAgICAgICAgIGQubGFiZWxXaWR0aCA9IGJib3gud2lkdGg7XG4gICAgICAgICAgZC5sYWJlbFRvcCA9IChkLl9ib3R0b20gLSBkLl9oZWlnaHQgLyAyKSAtIGQubGFiZWxIZWlnaHQgLyAyO1xuICAgICAgICAgIGQubGFiZWxCb3R0b20gPSBkLmxhYmVsVG9wICsgZC5sYWJlbEhlaWdodCArIGxhYmVsU3BhY2U7XG4gICAgICAgICAgZC50b29XaWRlID0gZC5sYWJlbFdpZHRoID4gY2FsY0Z1bm5lbFdpZHRoQXRTbGljZU1pZHBvaW50KGQpO1xuICAgICAgICAgIGQudG9vVGFsbCA9IGQubGFiZWxIZWlnaHQgPiBkLl9oZWlnaHQgLSA0O1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gY2FsY1NpZGVMYWJlbERpbWVuc2lvbnMobGJscykge1xuICAgICAgICBsYmxzLmVhY2goZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHZhciBiYm94ID0gY2FsY0xhYmVsQkJveCh0aGlzKTtcblxuICAgICAgICAgIGQubGFiZWxIZWlnaHQgPSBiYm94LmhlaWdodDtcbiAgICAgICAgICBkLmxhYmVsV2lkdGggPSBiYm94LndpZHRoO1xuICAgICAgICAgIGQubGFiZWxUb3AgPSBkLl90b3A7XG4gICAgICAgICAgZC5sYWJlbEJvdHRvbSA9IGQubGFiZWxUb3AgKyBkLmxhYmVsSGVpZ2h0ICsgbGFiZWxTcGFjZTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIHBvaW50c0xlYWRlcihwb2x5bGluZXMpIHtcbiAgICAgICAgLy8gTWVzcyB3aXRoIHRoaXMgZnVuY3Rpb24gYXQgeW91ciBwZXJpbC5cbiAgICAgICAgdmFyIGMgPSBwb2x5bGluZXMuc2l6ZSgpO1xuXG4gICAgICAgIC8vIHJ1biB0b3AgdG8gYm90dG9tXG4gICAgICAgIGZvciAodmFyIGdyb3VwcyA9IHBvbHlsaW5lcy5ub2RlcygpLCBpID0gZ3JvdXBzLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICAgICAgdmFyIG5vZGUgPSBkMy5zZWxlY3QoZ3JvdXBzW2ldKTtcbiAgICAgICAgICB2YXIgZCA9IG5vZGUuZGF0YSgpWzBdO1xuICAgICAgICAgIHZhciAvLyBwcmV2aW91cyBsYWJlbFxuICAgICAgICAgICAgICBwID0gaSA8IGMgLSAxID8gZDMuc2VsZWN0KGdyb3Vwc1tpICsgMV0pLmRhdGEoKVswXSA6IG51bGwsXG4gICAgICAgICAgICAgIC8vIG5leHQgbGFiZWxcbiAgICAgICAgICAgICAgbiA9IGkgPyBkMy5zZWxlY3QoZ3JvdXBzW2kgLSAxXSkuZGF0YSgpWzBdIDogbnVsbCxcbiAgICAgICAgICAgICAgLy8gbGFiZWwgaGVpZ2h0XG4gICAgICAgICAgICAgIGggPSBNYXRoLnJvdW5kKGQubGFiZWxIZWlnaHQpICsgMC41LFxuICAgICAgICAgICAgICAvLyBzbGljZSBib3R0b21cbiAgICAgICAgICAgICAgdCA9IE1hdGgucm91bmQoZC5fYm90dG9tIC0gZC5sYWJlbFRvcCkgLSAwLjUsXG4gICAgICAgICAgICAgIC8vIHByZXZpb3VzIHdpZHRoXG4gICAgICAgICAgICAgIHdwID0gcCA/IHAubGFiZWxXaWR0aCAtIChkLmxhYmVsQm90dG9tIC0gcC5sYWJlbEJvdHRvbSkgKiByIDogMCxcbiAgICAgICAgICAgICAgLy8gY3VycmVudCB3aWR0aFxuICAgICAgICAgICAgICB3YyA9IGQubGFiZWxXaWR0aCxcbiAgICAgICAgICAgICAgLy8gbmV4dCB3aWR0aFxuICAgICAgICAgICAgICB3biA9IG4gJiYgaCA8IHQgPyBuLmxhYmVsV2lkdGggOiAwLFxuICAgICAgICAgICAgICAvLyBmaW5hbCB3aWR0aFxuICAgICAgICAgICAgICB3ID0gTWF0aC5yb3VuZChNYXRoLm1heCh3cCwgd2MsIHduKSkgKyBsYWJlbEdhcCxcbiAgICAgICAgICAgICAgLy8gZnVubmVsIGVkZ2VcbiAgICAgICAgICAgICAgZiA9IE1hdGgucm91bmQoY2FsY1NpZGVXaWR0aChkLCBmdW5uZWxPZmZzZXQpKSAtIGxhYmVsT2Zmc2V0IC0gbGFiZWxHYXA7XG5cbiAgICAgICAgICAvLyBwb2x5bGluZSBwb2ludHNcbiAgICAgICAgICB2YXIgcG9pbnRzID0gMCArICcsJyArIGggKyAnICcgK1xuICAgICAgICAgICAgICAgICB3ICsgJywnICsgaCArICcgJyArXG4gICAgICAgICAgICAgICAgICh3ICsgTWF0aC5hYnMoaCAtIHQpICogcikgKyAnLCcgKyB0ICsgJyAnICtcbiAgICAgICAgICAgICAgICAgZiArICcsJyArIHQ7XG5cbiAgICAgICAgICAvLyB0aGlzIHdpbGwgYmUgb3ZlcnJpZGRpbmcgdGhlIGxhYmVsIHdpZHRoIGluIGRhdGFcbiAgICAgICAgICAvLyByZWZlcmVuY2VkIGFib3ZlIGFzIHAubGFiZWxXaWR0aFxuICAgICAgICAgIGQubGFiZWxXaWR0aCA9IHc7XG4gICAgICAgICAgbm9kZS5hdHRyKCdwb2ludHMnLCBwb2ludHMpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGNhbGNPZmZzZXRzKGxibHMpIHtcbiAgICAgICAgdmFyIHNpZGVXaWR0aCA9IChhdmFpbGFibGVXaWR0aCAtIGNhbGN1bGF0ZWRXaWR0aCkgLyAyLCAvLyBuYXR1cmFsIHdpZHRoIG9mIHNpZGVcbiAgICAgICAgICAgIG9mZnNldCA9IDA7XG5cbiAgICAgICAgbGJscy5lYWNoKGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICB2YXIgLy8gYm90dG9tIG9mIHNsaWNlXG4gICAgICAgICAgICAgIHNsaWNlQm90dG9tID0gZC5fYm90dG9tLFxuICAgICAgICAgICAgICAvLyBpcyBzbGljZSBiZWxvdyBvciBhYm92ZSBsYWJlbCBib3R0b21cbiAgICAgICAgICAgICAgc2NhbGFyID0gZC5sYWJlbEJvdHRvbSA+PSBzbGljZUJvdHRvbSA/IDEgOiAwLFxuICAgICAgICAgICAgICAvLyB0aGUgd2lkdGggb2YgdGhlIGFuZ2xlZCBsZWFkZXJcbiAgICAgICAgICAgICAgLy8gZnJvbSBib3R0b20gcmlnaHQgb2YgbGFiZWwgdG8gYm90dG9tIG9mIHNsaWNlXG4gICAgICAgICAgICAgIGxlYWRlclNsb3BlID0gTWF0aC5hYnMoZC5sYWJlbEJvdHRvbSArIGxhYmVsR2FwIC0gc2xpY2VCb3R0b20pICogcixcbiAgICAgICAgICAgICAgLy8gdGhpcyBpcyB0aGUgeCBjb21wb25lbnQgb2Ygc2xvcGUgRiBhdCB5XG4gICAgICAgICAgICAgIGJhc2UgPSBzbGljZUJvdHRvbSAqIHIsXG4gICAgICAgICAgICAgIC8vIHRoaXMgaXMgdGhlIGRpc3RhbmNlIGZyb20gZW5kIG9mIGxhYmVsIHBsdXMgc3BhY2luZyB0byBGXG4gICAgICAgICAgICAgIGlPZmZzZXQgPSBkLmxhYmVsV2lkdGggKyBsZWFkZXJTbG9wZSArIGxhYmVsR2FwICogMyAtIGJhc2U7XG4gICAgICAgICAgLy8gaWYgdGhpcyBsYWJlbCBzdGlja3Mgb3V0IHBhc3QgRlxuICAgICAgICAgIGlmIChpT2Zmc2V0ID49IG9mZnNldCkge1xuICAgICAgICAgICAgLy8gdGhpcyBpcyB0aGUgbWluaW11bSBkaXN0YW5jZSBmb3IgRlxuICAgICAgICAgICAgLy8gaGFzIHRvIGJlIGF3YXkgZnJvbSB0aGUgbGVmdCBlZGdlIG9mIGxhYmVsc1xuICAgICAgICAgICAgb2Zmc2V0ID0gaU9mZnNldDtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIGhvdyBmYXIgZnJvbSBjaGFydCBlZGdlIGlzIGxhYmVsIGxlZnQgZWRnZVxuICAgICAgICBvZmZzZXQgPSBNYXRoLnJvdW5kKG9mZnNldCAqIDEwKSAvIDEwO1xuXG4gICAgICAgIC8vIHRoZXJlIGFyZSB0aHJlZSBzdGF0ZXM6XG4gICAgICAgIGlmIChvZmZzZXQgPD0gMCkge1xuICAgICAgICAvLyAxLiBubyBsYWJlbCBzdGlja3Mgb3V0IHBhc3QgRlxuICAgICAgICAgIGxhYmVsT2Zmc2V0ID0gc2lkZVdpZHRoO1xuICAgICAgICAgIGZ1bm5lbE9mZnNldCA9IHNpZGVXaWR0aDtcbiAgICAgICAgfSBlbHNlIGlmIChvZmZzZXQgPiAwICYmIG9mZnNldCA8IHNpZGVXaWR0aCkge1xuICAgICAgICAvLyAyLiBpT2Zmc2V0IGlzID4gMCBidXQgPCBzaWRlV2lkdGhcbiAgICAgICAgICBsYWJlbE9mZnNldCA9IHNpZGVXaWR0aCAtIG9mZnNldDtcbiAgICAgICAgICBmdW5uZWxPZmZzZXQgPSBzaWRlV2lkdGg7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIDMuIGlPZmZzZXQgaXMgPj0gc2lkZVdpZHRoXG4gICAgICAgICAgbGFiZWxPZmZzZXQgPSAwO1xuICAgICAgICAgIGZ1bm5lbE9mZnNldCA9IG9mZnNldDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBmbXRGaWxsKGQsIGksIGopIHtcbiAgICAgICAgdmFyIGJhY2tDb2xvciA9IGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLnN0eWxlKCdmaWxsJyk7XG4gICAgICAgIHJldHVybiB1dGlscy5nZXRUZXh0Q29udHJhc3QoYmFja0NvbG9yLCBpKTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZm10RGlyZWN0aW9uKGQpIHtcbiAgICAgICAgdmFyIG0gPSB1dGlscy5pc1JUTENoYXIoZC5zbGljZSgtMSkpLFxuICAgICAgICAgICAgZGlyID0gbSA/ICdydGwnIDogJ2x0cic7XG4gICAgICAgIHJldHVybiAnbHRyJztcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZm10TGFiZWwodHh0LCBjbGFzc2VzLCBkeSwgYW5jaG9yLCBmaWxsKSB7XG4gICAgICAgIHR4dFxuICAgICAgICAgIC5hdHRyKCd4JywgMClcbiAgICAgICAgICAuYXR0cigneScsIDApXG4gICAgICAgICAgLmF0dHIoJ2R5JywgZHkgKyAnZW0nKVxuICAgICAgICAgIC5hdHRyKCdjbGFzcycsIGNsYXNzZXMpXG4gICAgICAgICAgLmF0dHIoJ2RpcmVjdGlvbicsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIGZtdERpcmVjdGlvbih0eHQudGV4dCgpKTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5zdHlsZSgncG9pbnRlci1ldmVudHMnLCAnbm9uZScpXG4gICAgICAgICAgLnN0eWxlKCd0ZXh0LWFuY2hvcicsIGFuY2hvcilcbiAgICAgICAgICAuc3R5bGUoJ2ZpbGwnLCBmaWxsKTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gcG9zaXRpb25WYWx1ZShsYmxzKSB7XG4gICAgICAgIGxibHMuZWFjaChmdW5jdGlvbihkKSB7XG4gICAgICAgICAgdmFyIGxibCA9IGQzLnNlbGVjdCh0aGlzKTtcbiAgICAgICAgICB2YXIgY250ID0gbGJsLnNlbGVjdEFsbCgnLnNjLWxhYmVsJykuc2l6ZSgpICsgMTtcbiAgICAgICAgICB2YXIgZHkgPSAoLjg1ICsgY250IC0gMSkgKyAnZW0nO1xuICAgICAgICAgIGxibC5zZWxlY3QoJy5zYy12YWx1ZScpXG4gICAgICAgICAgICAuYXR0cignZHknLCBkeSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBwb3NpdGlvbkxhYmVsQm94KGxibHMpIHtcbiAgICAgICAgbGJscy5lYWNoKGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgICB2YXIgbGJsID0gZDMuc2VsZWN0KHRoaXMpO1xuXG4gICAgICAgICAgbGJsLnNlbGVjdCgnLnNjLWxhYmVsLWJveCcpXG4gICAgICAgICAgICAuYXR0cigneCcsIChkLmxhYmVsV2lkdGggKyA2KSAvIC0yKVxuICAgICAgICAgICAgLmF0dHIoJ3knLCAtMilcbiAgICAgICAgICAgIC5hdHRyKCd3aWR0aCcsIGQubGFiZWxXaWR0aCArIDYpXG4gICAgICAgICAgICAuYXR0cignaGVpZ2h0JywgZC5sYWJlbEhlaWdodCArIDQpXG4gICAgICAgICAgICAuYXR0cigncngnLCAyKVxuICAgICAgICAgICAgLmF0dHIoJ3J5JywgMilcbiAgICAgICAgICAgIC5zdHlsZSgnZmlsbC1vcGFjaXR5JywgMSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgfSk7XG5cbiAgICByZXR1cm4gY2hhcnQ7XG4gIH1cblxuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIEV4cG9zZSBQdWJsaWMgVmFyaWFibGVzXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgY2hhcnQuZGlzcGF0Y2ggPSBkaXNwYXRjaDtcblxuICBjaGFydC5pZCA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBpZDtcbiAgICB9XG4gICAgaWQgPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5jb2xvciA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBjb2xvcjtcbiAgICB9XG4gICAgY29sb3IgPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcbiAgY2hhcnQuZmlsbCA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBmaWxsO1xuICAgIH1cbiAgICBmaWxsID0gXztcbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG4gIGNoYXJ0LmNsYXNzZXMgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gY2xhc3NlcztcbiAgICB9XG4gICAgY2xhc3NlcyA9IF87XG4gICAgcmV0dXJuIGNoYXJ0O1xuICB9O1xuICBjaGFydC5ncmFkaWVudCA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBncmFkaWVudDtcbiAgICB9XG4gICAgY2hhcnQuZ3JhZGllbnQgPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5tYXJnaW4gPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gbWFyZ2luO1xuICAgIH1cbiAgICBtYXJnaW4udG9wICAgID0gdHlwZW9mIF8udG9wICAgICE9ICd1bmRlZmluZWQnID8gXy50b3AgICAgOiBtYXJnaW4udG9wO1xuICAgIG1hcmdpbi5yaWdodCAgPSB0eXBlb2YgXy5yaWdodCAgIT0gJ3VuZGVmaW5lZCcgPyBfLnJpZ2h0ICA6IG1hcmdpbi5yaWdodDtcbiAgICBtYXJnaW4uYm90dG9tID0gdHlwZW9mIF8uYm90dG9tICE9ICd1bmRlZmluZWQnID8gXy5ib3R0b20gOiBtYXJnaW4uYm90dG9tO1xuICAgIG1hcmdpbi5sZWZ0ICAgPSB0eXBlb2YgXy5sZWZ0ICAgIT0gJ3VuZGVmaW5lZCcgPyBfLmxlZnQgICA6IG1hcmdpbi5sZWZ0O1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC53aWR0aCA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiB3aWR0aDtcbiAgICB9XG4gICAgd2lkdGggPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5oZWlnaHQgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gaGVpZ2h0O1xuICAgIH1cbiAgICBoZWlnaHQgPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC54ID0gZnVuY3Rpb24oXykge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIGdldFg7XG4gICAgfVxuICAgIGdldFggPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC55ID0gZnVuY3Rpb24oXykge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIGdldFk7XG4gICAgfVxuICAgIGdldFkgPSB1dGlscy5mdW5jdG9yKF8pO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5nZXRLZXkgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gZ2V0S2V5O1xuICAgIH1cbiAgICBnZXRLZXkgPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5nZXRWYWx1ZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBnZXRWYWx1ZTtcbiAgICB9XG4gICAgZ2V0VmFsdWUgPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5mbXRLZXkgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gZm10S2V5O1xuICAgIH1cbiAgICBmbXRLZXkgPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5mbXRWYWx1ZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBmbXRWYWx1ZTtcbiAgICB9XG4gICAgZm10VmFsdWUgPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5mbXRDb3VudCA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBmbXRDb3VudDtcbiAgICB9XG4gICAgZm10Q291bnQgPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5kaXJlY3Rpb24gPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gZGlyZWN0aW9uO1xuICAgIH1cbiAgICBkaXJlY3Rpb24gPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5kZWxheSA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBkZWxheTtcbiAgICB9XG4gICAgZGVsYXkgPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5kdXJhdGlvbiA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBkdXJhdGlvbjtcbiAgICB9XG4gICAgZHVyYXRpb24gPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC50ZXh0dXJlRmlsbCA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiB0ZXh0dXJlRmlsbDtcbiAgICB9XG4gICAgdGV4dHVyZUZpbGwgPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5sb2NhbGl0eSA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBsb2NhbGl0eTtcbiAgICB9XG4gICAgbG9jYWxpdHkgPSB1dGlscy5idWlsZExvY2FsaXR5KF8pO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC54U2NhbGUgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4geDtcbiAgICB9XG4gICAgeCA9IF87XG4gICAgcmV0dXJuIGNoYXJ0O1xuICB9O1xuXG4gIGNoYXJ0LnlTY2FsZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiB5O1xuICAgIH1cbiAgICB5ID0gXztcbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQueURvbWFpbiA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiB5RG9tYWluO1xuICAgIH1cbiAgICB5RG9tYWluID0gXztcbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQuZm9yY2VZID0gZnVuY3Rpb24oXykge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIGZvcmNlWTtcbiAgICB9XG4gICAgZm9yY2VZID0gXztcbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQud3JhcExhYmVscyA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiB3cmFwTGFiZWxzO1xuICAgIH1cbiAgICB3cmFwTGFiZWxzID0gXztcbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQubWluTGFiZWxXaWR0aCA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBtaW5MYWJlbFdpZHRoO1xuICAgIH1cbiAgICBtaW5MYWJlbFdpZHRoID0gXztcbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICByZXR1cm4gY2hhcnQ7XG59XG4iLCJleHBvcnQge2xlZ2VuZCBhcyBsZWdlbmR9IGZyb20gJy4vbGVnZW5kLmpzJztcbi8vIGV4cG9ydCB7ZGVmYXVsdCBhcyBheGlzfSBmcm9tICcuL2F4aXMuanMnO1xuXG5leHBvcnQge2Z1bm5lbCBhcyBmdW5uZWx9IGZyb20gJy4vZnVubmVsLmpzJztcbi8vIGV4cG9ydCB7ZGVmYXVsdCBhcyBnYXVnZX0gZnJvbSAnLi9nYXVnZS5qcyc7XG4vLyBleHBvcnQge2RlZmF1bHQgYXMgbGluZX0gZnJvbSAnLi9saW5lLmpzJztcbi8vIGV4cG9ydCB7ZGVmYXVsdCBhcyBtdWx0aUJhcn0gZnJvbSAnLi9tdWx0aUJhci5qcyc7XG4vLyBleHBvcnQge2RlZmF1bHQgYXMgcGllfSBmcm9tICcuL3BpZS5qcyc7XG4vLyBleHBvcnQge2RlZmF1bHQgYXMgc2NhdHRlcn0gZnJvbSAnLi9zY2F0dGVyLmpzJztcbi8vIGV4cG9ydCB7ZGVmYXVsdCBhcyBzY3JvbGx9IGZyb20gJy4vc2Nyb2xsLmpzJztcbi8vIGV4cG9ydCB7ZGVmYXVsdCBhcyBzdGFja2VkQXJlYX0gZnJvbSAnLi9zdGFja2VkQXJlYS5qcyc7XG4vLyBleHBvcnQge2RlZmF1bHQgYXMgdGFibGV9IGZyb20gJy4vdGFibGUuanMnO1xuLy8gZXhwb3J0IHtkZWZhdWx0IGFzIHRyZWV9IGZyb20gJy4vdHJlZS5qcyc7XG4vLyBleHBvcnQge2RlZmF1bHQgYXMgdHJlZW1hcH0gZnJvbSAnLi90cmVlbWFwLmpzJztcbiIsImltcG9ydCBkMyBmcm9tICdkMyc7XG5pbXBvcnQgdXRpbHMgZnJvbSAnLi4vdXRpbHMuanMnO1xuLy8gaW1wb3J0ICogYXMgbW9kZWxzIGZyb20gJy4vbW9kZWxzLmpzJztcbi8vIGltcG9ydCBmdW5uZWwgYXMgbW9kZWxzLmZ1bm5lbCBmcm9tICcuL21vZGVscy5qcyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBmdW5uZWxDaGFydCgpIHtcblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBQdWJsaWMgVmFyaWFibGVzIHdpdGggRGVmYXVsdCBTZXR0aW5nc1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHZhciBtYXJnaW4gPSB7dG9wOiAxMCwgcmlnaHQ6IDEwLCBib3R0b206IDEwLCBsZWZ0OiAxMH0sXG4gICAgICB3aWR0aCA9IG51bGwsXG4gICAgICBoZWlnaHQgPSBudWxsLFxuICAgICAgc2hvd1RpdGxlID0gZmFsc2UsXG4gICAgICBzaG93Q29udHJvbHMgPSBmYWxzZSxcbiAgICAgIHNob3dMZWdlbmQgPSB0cnVlLFxuICAgICAgZGlyZWN0aW9uID0gJ2x0cicsXG4gICAgICBkZWxheSA9IDAsXG4gICAgICBkdXJhdGlvbiA9IDAsXG4gICAgICB0b29sdGlwID0gbnVsbCxcbiAgICAgIHRvb2x0aXBzID0gdHJ1ZSxcbiAgICAgIHN0YXRlID0ge30sXG4gICAgICBzdHJpbmdzID0ge1xuICAgICAgICBsZWdlbmQ6IHtjbG9zZTogJ0hpZGUgbGVnZW5kJywgb3BlbjogJ1Nob3cgbGVnZW5kJ30sXG4gICAgICAgIGNvbnRyb2xzOiB7Y2xvc2U6ICdIaWRlIGNvbnRyb2xzJywgb3BlbjogJ1Nob3cgY29udHJvbHMnfSxcbiAgICAgICAgbm9EYXRhOiAnTm8gRGF0YSBBdmFpbGFibGUuJyxcbiAgICAgICAgbm9MYWJlbDogJ3VuZGVmaW5lZCdcbiAgICAgIH0sXG4gICAgICBkaXNwYXRjaCA9IGQzLmRpc3BhdGNoKCdjaGFydENsaWNrJywgJ2VsZW1lbnRDbGljaycsICd0b29sdGlwU2hvdycsICd0b29sdGlwSGlkZScsICd0b29sdGlwTW92ZScsICdzdGF0ZUNoYW5nZScsICdjaGFuZ2VTdGF0ZScpO1xuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFByaXZhdGUgVmFyaWFibGVzXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgdmFyIGZ1bm5lbCA9IG1vZGVscy5mdW5uZWwoKSxcbiAgICAgIG1vZGVsID0gZnVubmVsLFxuICAgICAgY29udHJvbHMgPSBtb2RlbHMubGVnZW5kKCkuYWxpZ24oJ2NlbnRlcicpLFxuICAgICAgbGVnZW5kID0gbW9kZWxzLmxlZ2VuZCgpLmFsaWduKCdjZW50ZXInKTtcblxuICB2YXIgdG9vbHRpcENvbnRlbnQgPSBmdW5jdGlvbihrZXksIHgsIHksIGUsIGdyYXBoKSB7XG4gICAgICAgIHJldHVybiAnPGgzPicgKyBrZXkgKyAnPC9oMz4nICtcbiAgICAgICAgICAgICAgICc8cD4nICsgeSArICcgb24gJyArIHggKyAnPC9wPic7XG4gICAgICB9O1xuXG4gIHZhciBzaG93VG9vbHRpcCA9IGZ1bmN0aW9uKGVvLCBvZmZzZXRFbGVtZW50LCBwcm9wZXJ0aWVzKSB7XG4gICAgICAgIHZhciBrZXkgPSBtb2RlbC5nZXRLZXkoKShlbyksXG4gICAgICAgICAgICB5ID0gbW9kZWwuZ2V0VmFsdWUoKShlbyksXG4gICAgICAgICAgICB4ID0gcHJvcGVydGllcy50b3RhbCA/ICh5ICogMTAwIC8gcHJvcGVydGllcy50b3RhbCkudG9GaXhlZCgxKSA6IDEwMCxcbiAgICAgICAgICAgIGNvbnRlbnQgPSB0b29sdGlwQ29udGVudChrZXksIHgsIHksIGVvLCBjaGFydCk7XG5cbiAgICAgICAgcmV0dXJuIHRvb2x0aXAuc2hvdyhlby5lLCBjb250ZW50LCBudWxsLCBudWxsLCBvZmZzZXRFbGVtZW50KTtcbiAgICAgIH07XG5cbiAgdmFyIHNlcmllc0NsaWNrID0gZnVuY3Rpb24oZGF0YSwgZSwgY2hhcnQpIHsgcmV0dXJuOyB9O1xuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgZnVuY3Rpb24gY2hhcnQoc2VsZWN0aW9uKSB7XG5cbiAgICBzZWxlY3Rpb24uZWFjaChmdW5jdGlvbihjaGFydERhdGEpIHtcblxuICAgICAgdmFyIHRoYXQgPSB0aGlzLFxuICAgICAgICAgIGNvbnRhaW5lciA9IGQzLnNlbGVjdCh0aGlzKSxcbiAgICAgICAgICBtb2RlbENsYXNzID0gJ2Z1bm5lbCc7XG5cbiAgICAgIHZhciBwcm9wZXJ0aWVzID0gY2hhcnREYXRhID8gY2hhcnREYXRhLnByb3BlcnRpZXMgOiB7fSxcbiAgICAgICAgICBkYXRhID0gY2hhcnREYXRhID8gY2hhcnREYXRhLmRhdGEgOiBudWxsO1xuXG4gICAgICB2YXIgY29udGFpbmVyV2lkdGggPSBwYXJzZUludChjb250YWluZXIuc3R5bGUoJ3dpZHRoJyksIDEwKSxcbiAgICAgICAgICBjb250YWluZXJIZWlnaHQgPSBwYXJzZUludChjb250YWluZXIuc3R5bGUoJ2hlaWdodCcpLCAxMCk7XG5cbiAgICAgIHZhciB4SXNEYXRldGltZSA9IGNoYXJ0RGF0YS5wcm9wZXJ0aWVzLnhEYXRhVHlwZSA9PT0gJ2RhdGV0aW1lJyB8fCBmYWxzZSxcbiAgICAgICAgICB5SXNDdXJyZW5jeSA9IGNoYXJ0RGF0YS5wcm9wZXJ0aWVzLnlEYXRhVHlwZSA9PT0gJ2N1cnJlbmN5JyB8fCBmYWxzZTtcblxuICAgICAgY2hhcnQudXBkYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnRhaW5lci50cmFuc2l0aW9uKCkuZHVyYXRpb24oZHVyYXRpb24pLmNhbGwoY2hhcnQpO1xuICAgICAgfTtcblxuICAgICAgY2hhcnQuY29udGFpbmVyID0gdGhpcztcblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIC8vIFByaXZhdGUgbWV0aG9kIGZvciBkaXNwbGF5aW5nIG5vIGRhdGEgbWVzc2FnZS5cblxuICAgICAgZnVuY3Rpb24gZGlzcGxheU5vRGF0YShkKSB7XG4gICAgICAgIHZhciBoYXNEYXRhID0gZCAmJiBkLmxlbmd0aCxcbiAgICAgICAgICAgIHggPSAoY29udGFpbmVyV2lkdGggLSBtYXJnaW4ubGVmdCAtIG1hcmdpbi5yaWdodCkgLyAyICsgbWFyZ2luLmxlZnQsXG4gICAgICAgICAgICB5ID0gKGNvbnRhaW5lckhlaWdodCAtIG1hcmdpbi50b3AgLSBtYXJnaW4uYm90dG9tKSAvIDIgKyBtYXJnaW4udG9wO1xuICAgICAgICByZXR1cm4gdXRpbHMuZGlzcGxheU5vRGF0YShoYXNEYXRhLCBjb250YWluZXIsIGNoYXJ0LnN0cmluZ3MoKS5ub0RhdGEsIHgsIHkpO1xuICAgICAgfVxuXG4gICAgICAvLyBDaGVjayB0byBzZWUgaWYgdGhlcmUncyBub3RoaW5nIHRvIHNob3cuXG4gICAgICBpZiAoZGlzcGxheU5vRGF0YShkYXRhKSkge1xuICAgICAgICByZXR1cm4gY2hhcnQ7XG4gICAgICB9XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAvLyBQcm9jZXNzIGRhdGFcblxuICAgICAgY2hhcnQuZGF0YVNlcmllc0FjdGl2YXRlID0gZnVuY3Rpb24oZW8pIHtcbiAgICAgICAgdmFyIHNlcmllcyA9IGVvLnNlcmllcztcblxuICAgICAgICBzZXJpZXMuYWN0aXZlID0gKCFzZXJpZXMuYWN0aXZlIHx8IHNlcmllcy5hY3RpdmUgPT09ICdpbmFjdGl2ZScpID8gJ2FjdGl2ZScgOiAnaW5hY3RpdmUnO1xuXG4gICAgICAgIC8vIGlmIHlvdSBoYXZlIGFjdGl2YXRlZCBhIGRhdGEgc2VyaWVzLCBpbmFjdGl2YXRlIHRoZSByZXN0XG4gICAgICAgIGlmIChzZXJpZXMuYWN0aXZlID09PSAnYWN0aXZlJykge1xuICAgICAgICAgIGRhdGFcbiAgICAgICAgICAgIC5maWx0ZXIoZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICByZXR1cm4gZC5hY3RpdmUgIT09ICdhY3RpdmUnO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICBkLmFjdGl2ZSA9ICdpbmFjdGl2ZSc7XG4gICAgICAgICAgICAgIHJldHVybiBkO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBpZiB0aGVyZSBhcmUgbm8gYWN0aXZlIGRhdGEgc2VyaWVzLCBpbmFjdGl2YXRlIHRoZW0gYWxsXG4gICAgICAgIGlmICghZGF0YS5maWx0ZXIoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5hY3RpdmUgPT09ICdhY3RpdmUnOyB9KS5sZW5ndGgpIHtcbiAgICAgICAgICBkYXRhLm1hcChmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICBkLmFjdGl2ZSA9ICcnO1xuICAgICAgICAgICAgcmV0dXJuIGQ7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb250YWluZXIuY2FsbChjaGFydCk7XG4gICAgICB9O1xuXG4gICAgICAvLyBhZGQgc2VyaWVzIGluZGV4IHRvIGVhY2ggZGF0YSBwb2ludCBmb3IgcmVmZXJlbmNlXG4gICAgICBkYXRhLmZvckVhY2goZnVuY3Rpb24ocywgaSkge1xuICAgICAgICB2YXIgeSA9IG1vZGVsLnkoKTtcbiAgICAgICAgcy5zZXJpZXNJbmRleCA9IGk7XG5cbiAgICAgICAgaWYgKCFzLnZhbHVlICYmICFzLnZhbHVlcykge1xuICAgICAgICAgIHMudmFsdWVzID0gW107XG4gICAgICAgIH0gZWxzZSBpZiAoIWlzTmFOKHMudmFsdWUpKSB7XG4gICAgICAgICAgcy52YWx1ZXMgPSBbe3g6IDAsIHk6IHBhcnNlSW50KHMudmFsdWUsIDEwKX1dO1xuICAgICAgICB9XG4gICAgICAgIHMudmFsdWVzLmZvckVhY2goZnVuY3Rpb24ocCwgaikge1xuICAgICAgICAgIHAuaW5kZXggPSBqO1xuICAgICAgICAgIHAuc2VyaWVzID0gcztcbiAgICAgICAgICBpZiAodHlwZW9mIHAudmFsdWUgPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHAudmFsdWUgPSB5KHApO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcy52YWx1ZSA9IHMudmFsdWUgfHwgZDMuc3VtKHMudmFsdWVzLCBmdW5jdGlvbihwKSB7IHJldHVybiBwLnZhbHVlOyB9KTtcbiAgICAgICAgcy5jb3VudCA9IHMuY291bnQgfHwgcy52YWx1ZXMubGVuZ3RoO1xuICAgICAgICBzLmRpc2FibGVkID0gcy5kaXNhYmxlZCB8fCBzLnZhbHVlID09PSAwO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIG9ubHkgc3VtIGVuYWJsZWQgc2VyaWVzXG4gICAgICB2YXIgbW9kZWxEYXRhID0gZGF0YS5maWx0ZXIoZnVuY3Rpb24oZCwgaSkgeyByZXR1cm4gIWQuZGlzYWJsZWQ7IH0pO1xuXG4gICAgICBpZiAoIW1vZGVsRGF0YS5sZW5ndGgpIHtcbiAgICAgICAgbW9kZWxEYXRhID0gW3t2YWx1ZXM6IFtdfV07IC8vIHNhZmV0eSBhcnJheVxuICAgICAgfVxuXG4gICAgICBwcm9wZXJ0aWVzLmNvdW50ID0gZDMuc3VtKG1vZGVsRGF0YSwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5jb3VudDsgfSk7XG5cbiAgICAgIHByb3BlcnRpZXMudG90YWwgPSBkMy5zdW0obW9kZWxEYXRhLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnZhbHVlOyB9KTtcblxuICAgICAgLy8gc2V0IHRpdGxlIGRpc3BsYXkgb3B0aW9uXG4gICAgICBzaG93VGl0bGUgPSBzaG93VGl0bGUgJiYgcHJvcGVydGllcy50aXRsZS5sZW5ndGg7XG5cbiAgICAgIC8vc2V0IHN0YXRlLmRpc2FibGVkXG4gICAgICBzdGF0ZS5kaXNhYmxlZCA9IGRhdGEubWFwKGZ1bmN0aW9uKGQpIHsgcmV0dXJuICEhZC5kaXNhYmxlZDsgfSk7XG5cbiAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAvLyBEaXNwbGF5IE5vIERhdGEgbWVzc2FnZSBpZiB0aGVyZSdzIG5vdGhpbmcgdG8gc2hvdy5cblxuICAgICAgaWYgKCFwcm9wZXJ0aWVzLnRvdGFsKSB7XG4gICAgICAgIGRpc3BsYXlOb0RhdGEoKTtcbiAgICAgICAgcmV0dXJuIGNoYXJ0O1xuICAgICAgfVxuXG4gICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgLy8gTWFpbiBjaGFydCB3cmFwcGVyc1xuXG4gICAgICB2YXIgd3JhcF9iaW5kID0gY29udGFpbmVyLnNlbGVjdEFsbCgnZy5zYy1jaGFydC13cmFwJykuZGF0YShbbW9kZWxEYXRhXSk7XG4gICAgICB2YXIgd3JhcF9lbnRyID0gd3JhcF9iaW5kLmVudGVyKCkuYXBwZW5kKCdnJykuYXR0cignY2xhc3MnLCAnc2MtY2hhcnQtd3JhcCBzYy1jaGFydC0nICsgbW9kZWxDbGFzcyk7XG4gICAgICB2YXIgd3JhcCA9IGNvbnRhaW5lci5zZWxlY3QoJy5zYy1jaGFydC13cmFwJykubWVyZ2Uod3JhcF9lbnRyKTtcblxuICAgICAgd3JhcF9lbnRyLmFwcGVuZCgncmVjdCcpLmF0dHIoJ2NsYXNzJywgJ3NjLWJhY2tncm91bmQnKVxuICAgICAgICAuYXR0cigneCcsIC1tYXJnaW4ubGVmdClcbiAgICAgICAgLmF0dHIoJ3knLCAtbWFyZ2luLnRvcClcbiAgICAgICAgLmF0dHIoJ2ZpbGwnLCAnI0ZGRicpO1xuXG4gICAgICB3cmFwX2VudHIuYXBwZW5kKCdnJykuYXR0cignY2xhc3MnLCAnc2MtdGl0bGUtd3JhcCcpO1xuICAgICAgdmFyIHRpdGxlX3dyYXAgPSB3cmFwLnNlbGVjdCgnLnNjLXRpdGxlLXdyYXAnKTtcblxuICAgICAgd3JhcF9lbnRyLmFwcGVuZCgnZycpLmF0dHIoJ2NsYXNzJywgJ3NjLScgKyBtb2RlbENsYXNzICsgJy13cmFwJyk7XG4gICAgICB2YXIgbW9kZWxfd3JhcCA9IHdyYXAuc2VsZWN0KCcuc2MtJyArIG1vZGVsQ2xhc3MgKyAnLXdyYXAnKTtcblxuICAgICAgd3JhcF9lbnRyLmFwcGVuZCgnZycpLmF0dHIoJ2NsYXNzJywgJ3NjLWNvbnRyb2xzLXdyYXAnKTtcbiAgICAgIHZhciBjb250cm9sc193cmFwID0gd3JhcC5zZWxlY3QoJy5zYy1jb250cm9scy13cmFwJyk7XG4gICAgICB3cmFwX2VudHIuYXBwZW5kKCdnJykuYXR0cignY2xhc3MnLCAnc2MtbGVnZW5kLXdyYXAnKTtcbiAgICAgIHZhciBsZWdlbmRfd3JhcCA9IHdyYXAuc2VsZWN0KCcuc2MtbGVnZW5kLXdyYXAnKTtcblxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIC8vIE1haW4gY2hhcnQgZHJhd1xuXG4gICAgICBjaGFydC5yZW5kZXIgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICAvLyBDaGFydCBsYXlvdXQgdmFyaWFibGVzXG4gICAgICAgIHZhciByZW5kZXJXaWR0aCwgcmVuZGVySGVpZ2h0LFxuICAgICAgICAgICAgYXZhaWxhYmxlV2lkdGgsIGF2YWlsYWJsZUhlaWdodCxcbiAgICAgICAgICAgIGlubmVyTWFyZ2luLFxuICAgICAgICAgICAgaW5uZXJXaWR0aCwgaW5uZXJIZWlnaHQ7XG5cbiAgICAgICAgY29udGFpbmVyV2lkdGggPSBwYXJzZUludChjb250YWluZXIuc3R5bGUoJ3dpZHRoJyksIDEwKTtcbiAgICAgICAgY29udGFpbmVySGVpZ2h0ID0gcGFyc2VJbnQoY29udGFpbmVyLnN0eWxlKCdoZWlnaHQnKSwgMTApO1xuXG4gICAgICAgIHJlbmRlcldpZHRoID0gd2lkdGggfHwgY29udGFpbmVyV2lkdGggfHwgOTYwO1xuICAgICAgICByZW5kZXJIZWlnaHQgPSBoZWlnaHQgfHwgY29udGFpbmVySGVpZ2h0IHx8IDQwMDtcblxuICAgICAgICBhdmFpbGFibGVXaWR0aCA9IHJlbmRlcldpZHRoIC0gbWFyZ2luLmxlZnQgLSBtYXJnaW4ucmlnaHQ7XG4gICAgICAgIGF2YWlsYWJsZUhlaWdodCA9IHJlbmRlckhlaWdodCAtIG1hcmdpbi50b3AgLSBtYXJnaW4uYm90dG9tO1xuXG4gICAgICAgIGlubmVyTWFyZ2luID0ge3RvcDogMCwgcmlnaHQ6IDAsIGJvdHRvbTogMCwgbGVmdDogMH07XG4gICAgICAgIGlubmVyV2lkdGggPSBhdmFpbGFibGVXaWR0aCAtIGlubmVyTWFyZ2luLmxlZnQgLSBpbm5lck1hcmdpbi5yaWdodDtcbiAgICAgICAgaW5uZXJIZWlnaHQgPSBhdmFpbGFibGVIZWlnaHQgLSBpbm5lck1hcmdpbi50b3AgLSBpbm5lck1hcmdpbi5ib3R0b207XG5cbiAgICAgICAgd3JhcC5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyBtYXJnaW4ubGVmdCArICcsJyArIG1hcmdpbi50b3AgKyAnKScpO1xuICAgICAgICB3cmFwLnNlbGVjdCgnLnNjLWJhY2tncm91bmQnKVxuICAgICAgICAgIC5hdHRyKCd3aWR0aCcsIHJlbmRlcldpZHRoKVxuICAgICAgICAgIC5hdHRyKCdoZWlnaHQnLCByZW5kZXJIZWlnaHQpO1xuXG4gICAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgIC8vIFRpdGxlICYgTGVnZW5kICYgQ29udHJvbHNcblxuICAgICAgICAvLyBIZWFkZXIgdmFyaWFibGVzXG4gICAgICAgIHZhciBtYXhDb250cm9sc1dpZHRoID0gMCxcbiAgICAgICAgICAgIG1heExlZ2VuZFdpZHRoID0gMCxcbiAgICAgICAgICAgIHdpZHRoUmF0aW8gPSAwLFxuICAgICAgICAgICAgaGVhZGVySGVpZ2h0ID0gMCxcbiAgICAgICAgICAgIHRpdGxlQkJveCA9IHt3aWR0aDogMCwgaGVpZ2h0OiAwfSxcbiAgICAgICAgICAgIGNvbnRyb2xzSGVpZ2h0ID0gMCxcbiAgICAgICAgICAgIGxlZ2VuZEhlaWdodCA9IDAsXG4gICAgICAgICAgICB0cmFucyA9ICcnO1xuXG4gICAgICAgIHRpdGxlX3dyYXAuc2VsZWN0KCcuc2MtdGl0bGUnKS5yZW1vdmUoKTtcblxuICAgICAgICBpZiAoc2hvd1RpdGxlKSB7XG4gICAgICAgICAgdGl0bGVfd3JhcFxuICAgICAgICAgICAgLmFwcGVuZCgndGV4dCcpXG4gICAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICdzYy10aXRsZScpXG4gICAgICAgICAgICAgIC5hdHRyKCd4JywgZGlyZWN0aW9uID09PSAncnRsJyA/IGF2YWlsYWJsZVdpZHRoIDogMClcbiAgICAgICAgICAgICAgLmF0dHIoJ3knLCAwKVxuICAgICAgICAgICAgICAuYXR0cignZHknLCAnLjc1ZW0nKVxuICAgICAgICAgICAgICAuYXR0cigndGV4dC1hbmNob3InLCAnc3RhcnQnKVxuICAgICAgICAgICAgICAuYXR0cignc3Ryb2tlJywgJ25vbmUnKVxuICAgICAgICAgICAgICAuYXR0cignZmlsbCcsICdibGFjaycpXG4gICAgICAgICAgICAgIC50ZXh0KHByb3BlcnRpZXMudGl0bGUpO1xuXG4gICAgICAgICAgdGl0bGVCQm94ID0gdXRpbHMuZ2V0VGV4dEJCb3godGl0bGVfd3JhcC5zZWxlY3QoJy5zYy10aXRsZScpKTtcbiAgICAgICAgICBoZWFkZXJIZWlnaHQgKz0gdGl0bGVCQm94LmhlaWdodDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzaG93TGVnZW5kKSB7XG4gICAgICAgICAgbGVnZW5kXG4gICAgICAgICAgICAuaWQoJ2xlZ2VuZF8nICsgY2hhcnQuaWQoKSlcbiAgICAgICAgICAgIC5zdHJpbmdzKGNoYXJ0LnN0cmluZ3MoKS5sZWdlbmQpXG4gICAgICAgICAgICAuYWxpZ24oJ2NlbnRlcicpXG4gICAgICAgICAgICAuaGVpZ2h0KGF2YWlsYWJsZUhlaWdodCAtIGlubmVyTWFyZ2luLnRvcCk7XG4gICAgICAgICAgbGVnZW5kX3dyYXBcbiAgICAgICAgICAgIC5kYXR1bShkYXRhKVxuICAgICAgICAgICAgLmNhbGwobGVnZW5kKTtcbiAgICAgICAgICBsZWdlbmRcbiAgICAgICAgICAgIC5hcnJhbmdlKGF2YWlsYWJsZVdpZHRoKTtcblxuICAgICAgICAgIHZhciBsZWdlbmRMaW5rQkJveCA9IHV0aWxzLmdldFRleHRCQm94KGxlZ2VuZF93cmFwLnNlbGVjdCgnLnNjLWxlZ2VuZC1saW5rJykpLFxuICAgICAgICAgICAgICBsZWdlbmRTcGFjZSA9IGF2YWlsYWJsZVdpZHRoIC0gdGl0bGVCQm94LndpZHRoIC0gNixcbiAgICAgICAgICAgICAgbGVnZW5kVG9wID0gc2hvd1RpdGxlICYmIGxlZ2VuZC5jb2xsYXBzZWQoKSAmJiBsZWdlbmRTcGFjZSA+IGxlZ2VuZExpbmtCQm94LndpZHRoID8gdHJ1ZSA6IGZhbHNlLFxuICAgICAgICAgICAgICB4cG9zID0gZGlyZWN0aW9uID09PSAncnRsJyB8fCAhbGVnZW5kLmNvbGxhcHNlZCgpID8gMCA6IGF2YWlsYWJsZVdpZHRoIC0gbGVnZW5kLndpZHRoKCksXG4gICAgICAgICAgICAgIHlwb3MgPSB0aXRsZUJCb3guaGVpZ2h0O1xuXG4gICAgICAgICAgaWYgKGxlZ2VuZFRvcCkge1xuICAgICAgICAgICAgeXBvcyA9IHRpdGxlQkJveC5oZWlnaHQgLSBsZWdlbmQuaGVpZ2h0KCkgLyAyIC0gbGVnZW5kTGlua0JCb3guaGVpZ2h0IC8gMjtcbiAgICAgICAgICB9IGVsc2UgaWYgKCFzaG93VGl0bGUpIHtcbiAgICAgICAgICAgIHlwb3MgPSAtIGxlZ2VuZC5tYXJnaW4oKS50b3A7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGVnZW5kX3dyYXBcbiAgICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyB4cG9zICsgJywnICsgeXBvcyArICcpJyk7XG5cbiAgICAgICAgICBsZWdlbmRIZWlnaHQgPSBsZWdlbmRUb3AgPyAxMiA6IGxlZ2VuZC5oZWlnaHQoKSAtIChzaG93VGl0bGUgPyAwIDogbGVnZW5kLm1hcmdpbigpLnRvcCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZWNhbGMgaW5uZXIgbWFyZ2lucyBiYXNlZCBvbiB0aXRsZSBhbmQgbGVnZW5kIGhlaWdodFxuICAgICAgICBoZWFkZXJIZWlnaHQgKz0gbGVnZW5kSGVpZ2h0O1xuICAgICAgICBpbm5lck1hcmdpbi50b3AgKz0gaGVhZGVySGVpZ2h0O1xuICAgICAgICBpbm5lckhlaWdodCA9IGF2YWlsYWJsZUhlaWdodCAtIGlubmVyTWFyZ2luLnRvcCAtIGlubmVyTWFyZ2luLmJvdHRvbTtcbiAgICAgICAgaW5uZXJXaWR0aCA9IGF2YWlsYWJsZVdpZHRoIC0gaW5uZXJNYXJnaW4ubGVmdCAtIGlubmVyTWFyZ2luLnJpZ2h0O1xuXG4gICAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgIC8vIE1haW4gQ2hhcnQgQ29tcG9uZW50KHMpXG5cbiAgICAgICAgbW9kZWxcbiAgICAgICAgICAud2lkdGgoaW5uZXJXaWR0aClcbiAgICAgICAgICAuaGVpZ2h0KGlubmVySGVpZ2h0KTtcblxuICAgICAgICBtb2RlbF93cmFwXG4gICAgICAgICAgLmRhdHVtKG1vZGVsRGF0YSlcbiAgICAgICAgICAuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgaW5uZXJNYXJnaW4ubGVmdCArICcsJyArIGlubmVyTWFyZ2luLnRvcCArICcpJylcbiAgICAgICAgICAudHJhbnNpdGlvbigpLmR1cmF0aW9uKGR1cmF0aW9uKVxuICAgICAgICAgICAgLmNhbGwobW9kZWwpO1xuXG4gICAgICB9O1xuXG4gICAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgICBjaGFydC5yZW5kZXIoKTtcblxuICAgICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgIC8vIEV2ZW50IEhhbmRsaW5nL0Rpc3BhdGNoaW5nIChpbiBjaGFydCdzIHNjb3BlKVxuICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAgICAgbGVnZW5kLmRpc3BhdGNoLm9uKCdsZWdlbmRDbGljaycsIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgZC5kaXNhYmxlZCA9ICFkLmRpc2FibGVkO1xuICAgICAgICBkLmFjdGl2ZSA9IGZhbHNlO1xuXG4gICAgICAgIC8vIGlmIHRoZXJlIGFyZSBubyBlbmFibGVkIGRhdGEgc2VyaWVzLCBlbmFibGUgdGhlbSBhbGxcbiAgICAgICAgaWYgKCFkYXRhLmZpbHRlcihmdW5jdGlvbihkKSB7IHJldHVybiAhZC5kaXNhYmxlZDsgfSkubGVuZ3RoKSB7XG4gICAgICAgICAgZGF0YS5tYXAoZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgZC5kaXNhYmxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgcmV0dXJuIGQ7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBpZiB0aGVyZSBhcmUgbm8gYWN0aXZlIGRhdGEgc2VyaWVzLCBhY3RpdmF0ZSB0aGVtIGFsbFxuICAgICAgICBpZiAoIWRhdGEuZmlsdGVyKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuYWN0aXZlID09PSAnYWN0aXZlJzsgfSkubGVuZ3RoKSB7XG4gICAgICAgICAgZGF0YS5tYXAoZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgZC5hY3RpdmUgPSAnJztcbiAgICAgICAgICAgIHJldHVybiBkO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgc3RhdGUuZGlzYWJsZWQgPSBkYXRhLm1hcChmdW5jdGlvbihkKSB7IHJldHVybiAhIWQuZGlzYWJsZWQ7IH0pO1xuICAgICAgICBkaXNwYXRjaC5jYWxsKCdzdGF0ZUNoYW5nZScsIHRoaXMsIHN0YXRlKTtcblxuICAgICAgICBjb250YWluZXIudHJhbnNpdGlvbigpLmR1cmF0aW9uKGR1cmF0aW9uKS5jYWxsKGNoYXJ0KTtcbiAgICAgIH0pO1xuXG4gICAgICBkaXNwYXRjaC5vbigndG9vbHRpcFNob3cnLCBmdW5jdGlvbihlbykge1xuICAgICAgICBpZiAodG9vbHRpcHMpIHtcbiAgICAgICAgICB0b29sdGlwID0gc2hvd1Rvb2x0aXAoZW8sIHRoYXQucGFyZW50Tm9kZSwgcHJvcGVydGllcyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBkaXNwYXRjaC5vbigndG9vbHRpcE1vdmUnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlmICh0b29sdGlwKSB7XG4gICAgICAgICAgdG9vbHRpcC5wb3NpdGlvbih0aGF0LnBhcmVudE5vZGUsIHRvb2x0aXAsIGUpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgZGlzcGF0Y2gub24oJ3Rvb2x0aXBIaWRlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0b29sdGlwcykge1xuICAgICAgICAgIHRvb2x0aXAuY2xlYW51cCgpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgLy8gVXBkYXRlIGNoYXJ0IGZyb20gYSBzdGF0ZSBvYmplY3QgcGFzc2VkIHRvIGV2ZW50IGhhbmRsZXJcbiAgICAgIGRpc3BhdGNoLm9uKCdjaGFuZ2VTdGF0ZScsIGZ1bmN0aW9uKGVvKSB7XG4gICAgICAgIGlmICh0eXBlb2YgZW8uZGlzYWJsZWQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgbW9kZWxEYXRhLmZvckVhY2goZnVuY3Rpb24oc2VyaWVzLCBpKSB7XG4gICAgICAgICAgICBzZXJpZXMuZGlzYWJsZWQgPSBlby5kaXNhYmxlZFtpXTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBzdGF0ZS5kaXNhYmxlZCA9IGVvLmRpc2FibGVkO1xuICAgICAgICB9XG5cbiAgICAgICAgY29udGFpbmVyLnRyYW5zaXRpb24oKS5kdXJhdGlvbihkdXJhdGlvbikuY2FsbChjaGFydCk7XG4gICAgICB9KTtcblxuICAgICAgZGlzcGF0Y2gub24oJ2NoYXJ0Q2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgLy9kaXNwYXRjaC5jYWxsKCd0b29sdGlwSGlkZScsIHRoaXMpO1xuICAgICAgICBpZiAoY29udHJvbHMuZW5hYmxlZCgpKSB7XG4gICAgICAgICAgY29udHJvbHMuZGlzcGF0Y2guY2FsbCgnY2xvc2VNZW51JywgdGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxlZ2VuZC5lbmFibGVkKCkpIHtcbiAgICAgICAgICBsZWdlbmQuZGlzcGF0Y2guY2FsbCgnY2xvc2VNZW51JywgdGhpcyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBtb2RlbC5kaXNwYXRjaC5vbignZWxlbWVudENsaWNrJywgZnVuY3Rpb24oZW8pIHtcbiAgICAgICAgZGlzcGF0Y2guY2FsbCgnY2hhcnRDbGljaycsIHRoaXMpO1xuICAgICAgICBzZXJpZXNDbGljayhkYXRhLCBlbywgY2hhcnQpO1xuICAgICAgfSk7XG5cbiAgICB9KTtcblxuICAgIHJldHVybiBjaGFydDtcbiAgfVxuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIEV2ZW50IEhhbmRsaW5nL0Rpc3BhdGNoaW5nIChvdXQgb2YgY2hhcnQncyBzY29wZSlcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBtb2RlbC5kaXNwYXRjaC5vbignZWxlbWVudE1vdXNlb3Zlci50b29sdGlwJywgZnVuY3Rpb24oZW8pIHtcbiAgICBkaXNwYXRjaC5jYWxsKCd0b29sdGlwU2hvdycsIHRoaXMsIGVvKTtcbiAgfSk7XG5cbiAgbW9kZWwuZGlzcGF0Y2gub24oJ2VsZW1lbnRNb3VzZW1vdmUudG9vbHRpcCcsIGZ1bmN0aW9uKGUpIHtcbiAgICBkaXNwYXRjaC5jYWxsKCd0b29sdGlwTW92ZScsIHRoaXMsIGUpO1xuICB9KTtcblxuICBtb2RlbC5kaXNwYXRjaC5vbignZWxlbWVudE1vdXNlb3V0LnRvb2x0aXAnLCBmdW5jdGlvbigpIHtcbiAgICBkaXNwYXRjaC5jYWxsKCd0b29sdGlwSGlkZScsIHRoaXMpO1xuICB9KTtcblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBFeHBvc2UgUHVibGljIFZhcmlhYmxlc1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIGV4cG9zZSBjaGFydCdzIHN1Yi1jb21wb25lbnRzXG4gIGNoYXJ0LmRpc3BhdGNoID0gZGlzcGF0Y2g7XG4gIGNoYXJ0LmZ1bm5lbCA9IGZ1bm5lbDtcbiAgY2hhcnQubGVnZW5kID0gbGVnZW5kO1xuICBjaGFydC5jb250cm9scyA9IGNvbnRyb2xzO1xuXG4gIGZjLnJlYmluZChjaGFydCwgbW9kZWwsICdpZCcsICd4JywgJ3knLCAnY29sb3InLCAnZmlsbCcsICdjbGFzc2VzJywgJ2dyYWRpZW50JywgJ2xvY2FsaXR5JywgJ3RleHR1cmVGaWxsJyk7XG4gIGZjLnJlYmluZChjaGFydCwgbW9kZWwsICdnZXRLZXknLCAnZ2V0VmFsdWUnLCAnZm10S2V5JywgJ2ZtdFZhbHVlJywgJ2ZtdENvdW50Jyk7XG4gIGZjLnJlYmluZChjaGFydCwgZnVubmVsLCAneFNjYWxlJywgJ3lTY2FsZScsICd5RG9tYWluJywgJ2ZvcmNlWScsICd3cmFwTGFiZWxzJywgJ21pbkxhYmVsV2lkdGgnKTtcblxuICBjaGFydC5jb2xvckRhdGEgPSBmdW5jdGlvbihfKSB7XG4gICAgdmFyIHR5cGUgPSBhcmd1bWVudHNbMF0sXG4gICAgICAgIHBhcmFtcyA9IGFyZ3VtZW50c1sxXSB8fCB7fTtcbiAgICB2YXIgY29sb3IgPSBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgcmV0dXJuIHV0aWxzLmRlZmF1bHRDb2xvcigpKGQsIGQuc2VyaWVzSW5kZXgpO1xuICAgICAgICB9O1xuICAgIHZhciBjbGFzc2VzID0gZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICAgIHJldHVybiAnc2Mtc2VyaWVzIHNjLXNlcmllcy0nICsgZC5zZXJpZXNJbmRleDtcbiAgICAgICAgfTtcblxuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgY2FzZSAnZ3JhZHVhdGVkJzpcbiAgICAgICAgY29sb3IgPSBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgcmV0dXJuIGQzLmludGVycG9sYXRlSHNsKGQzLnJnYihwYXJhbXMuYzEpLCBkMy5yZ2IocGFyYW1zLmMyKSkoZC5zZXJpZXNJbmRleCAvIHBhcmFtcy5sKTtcbiAgICAgICAgfTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdjbGFzcyc6XG4gICAgICAgIGNvbG9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuICdpbmhlcml0JztcbiAgICAgICAgfTtcbiAgICAgICAgY2xhc3NlcyA9IGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgICB2YXIgaUNsYXNzID0gKGQuc2VyaWVzSW5kZXggKiAocGFyYW1zLnN0ZXAgfHwgMSkpICUgMTQ7XG4gICAgICAgICAgaUNsYXNzID0gKGlDbGFzcyA+IDkgPyAnJyA6ICcwJykgKyBpQ2xhc3M7XG4gICAgICAgICAgcmV0dXJuICdzYy1zZXJpZXMgc2Mtc2VyaWVzLScgKyBkLnNlcmllc0luZGV4ICsgJyBzYy1maWxsJyArIGlDbGFzcztcbiAgICAgICAgfTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdkYXRhJzpcbiAgICAgICAgY29sb3IgPSBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgcmV0dXJuIHV0aWxzLmRlZmF1bHRDb2xvcigpKGQsIGQuc2VyaWVzSW5kZXgpO1xuICAgICAgICB9O1xuICAgICAgICBjbGFzc2VzID0gZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICAgIHJldHVybiAnc2Mtc2VyaWVzIHNjLXNlcmllcy0nICsgZC5zZXJpZXNJbmRleCArIChkLmNsYXNzZXMgPyAnICcgKyBkLmNsYXNzZXMgOiAnJyk7XG4gICAgICAgIH07XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIHZhciBmaWxsID0gKCFwYXJhbXMuZ3JhZGllbnQpID8gY29sb3IgOiBmdW5jdGlvbihkLCBpKSB7XG4gICAgICB2YXIgcCA9IHtvcmllbnRhdGlvbjogcGFyYW1zLm9yaWVudGF0aW9uIHx8ICd2ZXJ0aWNhbCcsIHBvc2l0aW9uOiBwYXJhbXMucG9zaXRpb24gfHwgJ21pZGRsZSd9O1xuICAgICAgcmV0dXJuIG1vZGVsLmdyYWRpZW50KGQsIGQuc2VyaWVzSW5kZXgsIHApO1xuICAgIH07XG5cbiAgICBtb2RlbC5jb2xvcihjb2xvcik7XG4gICAgbW9kZWwuZmlsbChmaWxsKTtcbiAgICBtb2RlbC5jbGFzc2VzKGNsYXNzZXMpO1xuXG4gICAgbGVnZW5kLmNvbG9yKGNvbG9yKTtcbiAgICBsZWdlbmQuY2xhc3NlcyhjbGFzc2VzKTtcblxuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5tYXJnaW4gPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7IHJldHVybiBtYXJnaW47IH1cbiAgICBmb3IgKHZhciBwcm9wIGluIF8pIHtcbiAgICAgIGlmIChfLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICAgIG1hcmdpbltwcm9wXSA9IF9bcHJvcF07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC53aWR0aCA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHsgcmV0dXJuIHdpZHRoOyB9XG4gICAgd2lkdGggPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5oZWlnaHQgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7IHJldHVybiBoZWlnaHQ7IH1cbiAgICBoZWlnaHQgPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5zaG93VGl0bGUgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7IHJldHVybiBzaG93VGl0bGU7IH1cbiAgICBzaG93VGl0bGUgPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5zaG93Q29udHJvbHMgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7IHJldHVybiBzaG93Q29udHJvbHM7IH1cbiAgICBzaG93Q29udHJvbHMgPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5zaG93TGVnZW5kID0gZnVuY3Rpb24oXykge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgeyByZXR1cm4gc2hvd0xlZ2VuZDsgfVxuICAgIHNob3dMZWdlbmQgPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC50b29sdGlwID0gZnVuY3Rpb24oXykge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgeyByZXR1cm4gdG9vbHRpcDsgfVxuICAgIHRvb2x0aXAgPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC50b29sdGlwcyA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHsgcmV0dXJuIHRvb2x0aXBzOyB9XG4gICAgdG9vbHRpcHMgPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC50b29sdGlwQ29udGVudCA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHsgcmV0dXJuIHRvb2x0aXBDb250ZW50OyB9XG4gICAgdG9vbHRpcENvbnRlbnQgPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5zdGF0ZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHsgcmV0dXJuIHN0YXRlOyB9XG4gICAgc3RhdGUgPSBfO1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5zdHJpbmdzID0gZnVuY3Rpb24oXykge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgeyByZXR1cm4gc3RyaW5nczsgfVxuICAgIGZvciAodmFyIHByb3AgaW4gXykge1xuICAgICAgaWYgKF8uaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgc3RyaW5nc1twcm9wXSA9IF9bcHJvcF07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5kaXJlY3Rpb24gPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7IHJldHVybiBkaXJlY3Rpb247IH1cbiAgICBkaXJlY3Rpb24gPSBfO1xuICAgIG1vZGVsLmRpcmVjdGlvbihfKTtcbiAgICBsZWdlbmQuZGlyZWN0aW9uKF8pO1xuICAgIGNvbnRyb2xzLmRpcmVjdGlvbihfKTtcbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQuZHVyYXRpb24gPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7IHJldHVybiBkdXJhdGlvbjsgfVxuICAgIGR1cmF0aW9uID0gXztcbiAgICBtb2RlbC5kdXJhdGlvbihfKTtcbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQuZGVsYXkgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7IHJldHVybiBkZWxheTsgfVxuICAgIGRlbGF5ID0gXztcbiAgICBtb2RlbC5kZWxheShfKTtcbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQuc2VyaWVzQ2xpY2sgPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gc2VyaWVzQ2xpY2s7XG4gICAgfVxuICAgIHNlcmllc0NsaWNrID0gXztcbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQuY29sb3JGaWxsID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gIHJldHVybiBjaGFydDtcbn1cbiIsIi8vIGV4cG9ydCB7ZGVmYXVsdCBhcyBidWJibGVDaGFydH0gZnJvbSAnLi9idWJibGVDaGFydC5qcyc7XG5leHBvcnQge2Z1bm5lbENoYXJ0IGFzIGZ1bm5lbENoYXJ0fSBmcm9tICcuL2Z1bm5lbENoYXJ0LmpzJztcbi8vIGV4cG9ydCB7ZGVmYXVsdCBhcyBnYXVnZUNoYXJ0fSBmcm9tICcuL2dhdWdlQ2hhcnQuanMnO1xuLy8gZXhwb3J0IHtkZWZhdWx0IGFzIGdsb2JlQ2hhcnR9IGZyb20gJy4vZ2xvYmUuanMnO1xuLy8gZXhwb3J0IHtkZWZhdWx0IGFzIGxpbmVDaGFydH0gZnJvbSAnLi9saW5lQ2hhcnQuanMnO1xuLy8gZXhwb3J0IHtkZWZhdWx0IGFzIG11bHRpQmFyQ2hhcnR9IGZyb20gJy4vbXVsdGlCYXJDaGFydC5qcyc7XG4vLyBleHBvcnQge2RlZmF1bHQgYXMgcGFyZXRvQ2hhcnR9IGZyb20gJy4vcGFyZXRvQ2hhcnQuanMnO1xuLy8gZXhwb3J0IHtkZWZhdWx0IGFzIHBpZUNoYXJ0fSBmcm9tICcuL3BpZUNoYXJ0LmpzJztcbi8vIGV4cG9ydCB7ZGVmYXVsdCBhcyBzdGFja2VkQXJlYUNoYXJ0fSBmcm9tICcuL3N0YWNrZWRBcmVhQ2hhcnQuanMnO1xuLy8gZXhwb3J0IHtkZWZhdWx0IGFzIHRyZWVtYXBDaGFydH0gZnJvbSAnLi90cmVlbWFwQ2hhcnQuanMnO1xuIiwiaW1wb3J0ICogYXMgZDMgZnJvbSAnZDMnOyAvL3dpdGhvdXQgdGhpcyByb2xsdXAgZG9lcyBzb21ldGhpbmcgZnVua3kgdG8gZDMgZ2xvYmFsXG5pbXBvcnQgKiBhcyBmYyBmcm9tICdkM2ZjLXJlYmluZCc7XG5pbXBvcnQgKiBhcyBtb2RlbHMgZnJvbSAnLi9tb2RlbHMvbW9kZWxzLmpzJztcbmltcG9ydCAqIGFzIGNoYXJ0cyBmcm9tICcuL21vZGVscy9jaGFydHMuanMnO1xuXG52YXIgdmVyID0gJzAuMC4yJzsgLy9jaGFuZ2UgdG8gMC4wLjMgd2hlbiByZWFkeVxudmFyIGRldiA9IGZhbHNlOyAvL3NldCBmYWxzZSB3aGVuIGluIHByb2R1Y3Rpb25cbmV4cG9ydCB7dmVyIGFzIHZlcnNpb259O1xuZXhwb3J0IHtkZXYgYXMgZGV2ZWxvcG1lbnR9O1xuXG5leHBvcnQge2RlZmF1bHQgYXMgdXRpbHN9IGZyb20gJy4vdXRpbHMuanMnO1xuLy8gZXhwb3J0IHsqIGFzIG1vZGVsc30gZnJvbSAnLi9tb2RlbHMvbW9kZWxzLmpzJztcbi8vIGV4cG9ydCB7KiBhcyBjaGFydHN9IGZyb20gJy4vbW9kZWxzL2NoYXJ0cy5qcyc7XG4vLyBleHBvcnQge21vZGVscyBhcyBtb2RlbHN9O1xuLy8gZXhwb3J0IHtjaGFydHMgYXMgY2hhcnRzfTtcblxuXG4vLyBleHBvcnQge2RlZmF1bHQgYXMgYXhpc30gZnJvbSAnLi9tb2RlbHMvYXhpcy5qcyc7XG4vLyBleHBvcnQge2RlZmF1bHQgYXMgZnVubmVsfSBmcm9tICcuL21vZGVscy9mdW5uZWwuanMnO1xuLy8gZXhwb3J0IHtkZWZhdWx0IGFzIGdhdWdlfSBmcm9tICcuL21vZGVscy9nYXVnZS5qcyc7XG4vLyBleHBvcnQge2RlZmF1bHQgYXMgbGluZX0gZnJvbSAnLi9tb2RlbHMvbGluZS5qcyc7XG4vLyBleHBvcnQge2RlZmF1bHQgYXMgbXVsdGlCYXJ9IGZyb20gJy4vbW9kZWxzL211bHRpQmFyLmpzJztcbi8vIGV4cG9ydCB7ZGVmYXVsdCBhcyBwaWV9IGZyb20gJy4vbW9kZWxzL3BpZS5qcyc7XG4vLyBleHBvcnQge2RlZmF1bHQgYXMgc3RhY2tlZEFyZWF9IGZyb20gJy4vbW9kZWxzL3N0YWNrZWRBcmVhLmpzJztcbi8vIGV4cG9ydCB7ZGVmYXVsdCBhcyBzY2F0dGVyfSBmcm9tICcuL21vZGVscy9zY2F0dGVyLmpzJztcbi8vIGV4cG9ydCB7ZGVmYXVsdCBhcyBzY3JvbGx9IGZyb20gJy4vbW9kZWxzL3Njcm9sbC5qcyc7XG4vLyBleHBvcnQge2RlZmF1bHQgYXMgdGFibGV9IGZyb20gJy4vbW9kZWxzL3RhYmxlLmpzJztcbi8vIGV4cG9ydCB7ZGVmYXVsdCBhcyB0cmVlfSBmcm9tICcuL21vZGVscy90cmVlLmpzJztcbi8vIGV4cG9ydCB7ZGVmYXVsdCBhcyB0cmVlbWFwfSBmcm9tICcuL21vZGVscy90cmVlbWFwLmpzJztcblxuLy8gZXhwb3J0IHtkZWZhdWx0IGFzIGJ1YmJsZUNoYXJ0fSBmcm9tICcuL21vZGVscy9idWJibGVDaGFydC5qcyc7XG4vLyBleHBvcnQge2RlZmF1bHQgYXMgZnVubmVsQ2hhcnR9IGZyb20gJy4vbW9kZWxzL2Z1bm5lbENoYXJ0LmpzJztcbi8vIGV4cG9ydCB7ZGVmYXVsdCBhcyBnYXVnZUNoYXJ0fSBmcm9tICcuL21vZGVscy9nYXVnZUNoYXJ0LmpzJztcbi8vIGV4cG9ydCB7ZGVmYXVsdCBhcyBnbG9iZUNoYXJ0fSBmcm9tICcuL21vZGVscy9nbG9iZS5qcyc7XG4vLyBleHBvcnQge2RlZmF1bHQgYXMgbGluZUNoYXJ0fSBmcm9tICcuL21vZGVscy9saW5lQ2hhcnQuanMnO1xuLy8gZXhwb3J0IHtkZWZhdWx0IGFzIG11bHRpQmFyQ2hhcnR9IGZyb20gJy4vbW9kZWxzL211bHRpQmFyQ2hhcnQuanMnO1xuLy8gZXhwb3J0IHtkZWZhdWx0IGFzIHBhcmV0b0NoYXJ0fSBmcm9tICcuL21vZGVscy9wYXJldG9DaGFydC5qcyc7XG4vLyBleHBvcnQge2RlZmF1bHQgYXMgcGllQ2hhcnR9IGZyb20gJy4vbW9kZWxzL3BpZUNoYXJ0LmpzJztcbi8vIGV4cG9ydCB7ZGVmYXVsdCBhcyBzdGFja2VkQXJlYUNoYXJ0fSBmcm9tICcuL21vZGVscy9zdGFja2VkQXJlYUNoYXJ0LmpzJztcbi8vIGV4cG9ydCB7ZGVmYXVsdCBhcyB0cmVlbWFwQ2hhcnR9IGZyb20gJy4vbW9kZWxzL3RyZWVtYXBDaGFydC5qcyc7XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6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
