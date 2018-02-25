import d3 from 'd3';
import utility from '../utility.js';
import language from '../language.js';

export default function menu() {

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
      strings = language(),
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID in case user doesn't select one
      getKey = function(d) {
        return d.key.length > 0 || (!isNaN(parseFloat(d.key)) && utility.isNumeric(d.key)) ? d.key : strings.noLabel;
      },
      color = function(d) {
        return utility.defaultColor()(d, d.seriesIndex);
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
      overflowHandler = function() { return; };

  //============================================================

  function legend(selection) {

    selection.each(function(data) {

      var container = d3.select(this),
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
      data.filter(function(d) { return !d.hasOwnProperty('seriesIndex'); }).map(function(d) {
        d.seriesIndex = iSeries;
        iSeries += 1;
      });

      enabled = true;

      type = !data[0].type || data[0].type === 'bar' ? 'bar' : 'line';
      align = rtl && align !== 'center' ? align === 'left' ? 'right' : 'left' : align;

      //------------------------------------------------------------
      // Setup containers and skeleton of legend

      var wrap_bind = container.selectAll('g.sc-wrap').data([data]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-wrap sc-menu');
      var wrap = container.select('g.sc-wrap').merge(wrap_entr);
      wrap.attr('transform', 'translate(0,0)');

      var defs_entr = wrap_entr.append('defs');
      var defs = wrap.select('defs');

      defs_entr.append('clipPath').attr('id', 'sc-edge-clip-' + id).append('rect');
      var clip = wrap.select('#sc-edge-clip-' + id + ' rect');

      wrap_entr.append('rect').attr('class', 'sc-menu-background');
      var back = wrap.select('.sc-menu-background');
      var backFilter = utility.dropShadow('menu_back_' + id, defs, {blur: 2});

      wrap_entr.append('text').attr('class', 'sc-menu-link');
      var link = wrap.select('.sc-menu-link');

      var mask_entr = wrap_entr.append('g').attr('class', 'sc-menu-mask');
      var mask = wrap.select('.sc-menu-mask');

      mask_entr.append('g').attr('class', 'sc-group');
      var g = wrap.select('.sc-group');

      var series_bind = g.selectAll('.sc-series').data(utility.identity, function(d) { return d.seriesIndex; });
      series_bind.exit().remove();
      var series_entr = series_bind.enter().append('g').attr('class', 'sc-series')
            .on('mouseover', function(d) {
              dispatch.call('legendMouseover', this, d);
            })
            .on('mouseout', function(d) {
              dispatch.call('legendMouseout', this, d);
            })
            .on('click', function(d) {
              d3.event.preventDefault();
              d3.event.stopPropagation();
              dispatch.call('legendClick', this, d);
            });
      var series = g.selectAll('.sc-series').merge(series_entr);
      series
          .attr('class', classes)
          .attr('fill', color)
          .attr('stroke', color);

      var rects_entr = series_entr.append('rect')
            .attr('x', (diameter + textGap) / -2)
            .attr('y', (diameter + lineSpacing) / -2)
            .attr('width', diameter + textGap)
            .attr('height', diameter + lineSpacing)
            .style('fill', '#FFE')
            .style('stroke-width', 0)
            .style('opacity', 0.1);
      var rects = series.selectAll('rect').merge(rects_entr);

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

      var texts_entr = series_entr
        .append('text')
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
        .on('click', function() {
          d3.event.stopPropagation();
        });

      link
        .text(legendOpen === 1 ? strings.close : strings.open)
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

        texts.each(function() {
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
            maxHeight = height,
            maxRowWidth = 0,
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
            .attr('transform', function() {
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

          rects
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
            .attr('transform', function() {
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
          dropdownHeight = Math.min(maxHeight - legend.height(), legendHeight);

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
            .attr('transform', function() {
              var xpos = align === 'left' ? 0.5 : 0.5 + legend.width(),
                  ypos = margin.top + radius;
              return 'translate(' + xpos + ',' + ypos + ')';
            })
            .style('opacity', 1);

          mask
            .attr('clip-path', 'url(#sc-edge-clip-' + id + ')')
            .attr('transform', function() {
              var xpos = menuMargin.left + radius,
                  ypos = legend.height() + menuMargin.top + radius;
              return 'translate(' + xpos + ',' + ypos + ')';
            });

          g
            .style('opacity', legendOpen)
            .style('display', legendOpen ? 'inline' : 'none')
            .attr('transform', function() {
              var xpos = rtl ? d3.max(keyWidths) + radius : 0;
              return 'translate(' + xpos + ',0)';
            });

          series
            .attr('transform', function(d, i) {
              var ypos = i * (diameter + spacing);
              return 'translate(0,' + ypos + ')';
            });

          rects
            .attr('x', function(d) {
              var x = (diameter + gutter) / 2 * sign(rtl);
              x -= rtl ? keyWidth(d.seriesIndex) : 0;
              return x;
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
            .attr('transform', function() {
              var xpos = (radius + textGap) * sign(!rtl);
              return 'translate(' + xpos + ',0)';
            });

        }

        //------------------------------------------------------------
        // Enable scrolling
        if (scrollEnabled) {
          var maxScroll = dropdownHeight - legendHeight;

          var assignScrollEvents = function(enable) {
            if (enable) {
              var zoom = d3.zoom().on('zoom', panLegend);
              back.call(zoom);
              g.call(zoom);
            } else {
              back.on('.zoom', null);
              g.on('.zoom', null);
            }
          };

          var panLegend = function() {
            var evt = d3.event;
            var src;
            var x = 0;
            var y = 0;
            var distance = 0;
            var translate = '';

            // we need click for handling legend toggle
            if (!evt || (evt.type !== 'click' && evt.type !== 'zoom')) {
              return;
            }
            src = evt.sourceEvent;

            // don't fire on events other than zoom and drag
            if (evt.type === 'zoom' && src) {
              if (src.type === 'wheel') {
                x = -src.deltaX;
                y = -src.deltaY;
                distance = scrollOffset + (Math.abs(x) > Math.abs(y) ? x : y);
              } else if (src.type === 'mousemove') {
                x = src.movementX;
                y = src.movementY;
                distance = scrollOffset + (Math.abs(x) > Math.abs(y) ? x : y);
              } else if (src.type === 'touchmove') {
                x = evt.transform.x;
                y = evt.transform.y;
                distance = (Math.abs(x) > Math.abs(y) ? x : y);
              }
            }

            // reset value defined in panMultibar();
            scrollOffset = Math.min(Math.max(distance, maxScroll), 0);
            translate = 'translate(' + (rtl ? d3.max(keyWidths) + radius : 0) + ',' + scrollOffset + ')';

            if (distance > 0 || distance < maxScroll) {
              overflowHandler(Math.abs(y) > Math.abs(x) ? y : 0);
            }

            g.attr('transform', translate);
          };

          assignScrollEvents(useScroll);
        }

      };

      //============================================================
      // Event Handling/Dispatching (in legend's scope)
      //------------------------------------------------------------

      function displayMenu() {
        back
          .style('opacity', legendOpen * 0.9)
          .style('display', legendOpen ? 'inline' : 'none');
        g
          .style('opacity', legendOpen)
          .style('display', legendOpen ? 'inline' : 'none');
        link
          .text(legendOpen === 1 ? strings.close : strings.open);
      }

      dispatch.on('toggleMenu', function() {
        d3.event.stopPropagation();
        legendOpen = 1 - legendOpen;
        displayMenu();
      });

      dispatch.on('closeMenu', function() {
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
    color = utility.getColor(_);
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

  legend.collapsed = function() {
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
