import d3 from 'd3';
import utility from '../utility.js';

export default function multibar() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 960,
      height = 500,
      x = d3.scaleBand(),
      y = d3.scaleLinear(),
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID in case user doesn't select one
      getX = function(d) { return d.x; },
      getY = function(d) { return d.y; },
      valueFormat = function(value, i, label) { return label || value; },
      getLabel = function(d, i) { return valueFormat(d.y, i, d.label); },
      locality = utility.buildLocality(),
      forceX = [],
      forceY = [0], // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do model.forceY([]) to remove
      stacked = true,
      disabled, // used in conjunction with barColor to communicate to multibarChart what series are disabled
      showValues = false,
      withLine = false,
      vertical = true,
      baseDimension = 60,
      direction = 'ltr',
      clipEdge = false, // if true, masks bars within x and y scale
      delay = 0, // transition
      duration = 0, // transition
      xDomain = null,
      yDomain = null,
      nice = false,
      color = function(d, i) { return utility.defaultColor()(d, d.seriesIndex); },
      gradient = utility.colorLinearGradient,
      fill = color,
      textureFill = false,
      barColor = null, // adding the ability to set the color for each rather than the whole group
      classes = function(d, i) { return 'sc-series sc-series-' + d.seriesIndex; },
      dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout', 'elementMousemove');

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var x0,
      y0; //used to store previous scales

  //============================================================

  function model(selection) {
    selection.each(function(data) {

      // baseDimension = stacked ? vertical ? 72 : 30 : 20;

      var container = d3.select(this),
          availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          dimX = vertical ? 'width' : 'height',
          dimY = vertical ? 'height' : 'width',
          valX = vertical ? 'x' : 'y',
          valY = vertical ? 'y' : 'x',
          seriesCount = 0,
          groupCount = 0,
          minSeries = 0,
          maxSeries = data.length - 1,
          verticalLabels = false,
          useWidth = false,
          labelPosition = showValues,
          labelsOutside = false,
          labelLengths = [],
          labelThickness = 0,
          labelData = [],
          seriesData = [],
          groupTotals = [];

      function sign(bool) {
        return bool ? 1 : -1;
      }
      function unique(x) {
        return x.reverse()
                .filter(function (e, i, x) { return x.indexOf(e, i + 1) === -1; })
                .reverse();
      }

      if (labelPosition) {
        if (stacked) {
          // var stack = d3.stack()
          //      .offset('zero')
          //      .keys(data.map(function(d) { return d.key; }))
          //      .value(function(d) { return d.key; });
          // data = stack(data);
          // stacked bars can't have label position 'top'
          if (labelPosition === 'top' || labelPosition === true) {
            labelPosition = 'end';
          }
        } else {
          // grouped bars can't have label position 'total'
          if (labelPosition === 'total') {
            labelPosition = 'top';
          } else if (labelPosition === true) {
            labelPosition = 'end';
          }
        }
        verticalLabels = vertical;
        labelsOutside = labelPosition === 'total' || labelPosition === 'top';
      }

      // restore code removed by SCR-19 but still needed to display totals for stacked bar
      if (stacked) {
        groupTotals = [];
        data[0].values.map(function(d, i) {
          var pos = 0;
          var neg = 0;
          data.map(function(d) {
            var f = d.values[i];
            f.size = Math.abs(f.y);
            if (f.y < 0) {
              f.y0 = neg - (vertical ? 0 : f.size);
              neg -= f.size;
            } else {
              f.y0 = pos + (vertical ? f.size : 0);
              pos += f.size;
            }
          });
          groupTotals[i] = {
            neg: {
              label: valueFormat(neg, i),
              y: neg
            },
            pos: {
              label: valueFormat(pos, i),
              y: pos
            }
          };
        });
      }

      //------------------------------------------------------------
      // Setup Scales

      model.resetDimensions = function(w, h) {
        width = w;
        height = h;
        availableWidth = w - margin.left - margin.right;
        availableHeight = h - margin.top - margin.bottom;
        resetScale();
      };

      // remap and flatten the data for use in calculating the scales' domains
      seriesData = d3.merge(data.map(function(d) {
          return d.values;
        }));

      seriesCount = data.length;
      groupCount = data[0].values.length;

      if (showValues) {
        data.forEach(function(series, s) {
          series.values.forEach(function(value, v) {
            // reset label if not defined
            value.label = getLabel(value);
          });
        });

        // this must be total because that is the only option that requires summing
        labelData = labelPosition === 'total' ?
          d3.merge(groupTotals.map(function(d) {
            return [d.neg, d.pos];
          })) :
          seriesData;

        labelLengths = utility.stringSetLengths(labelData.map(getLabel), container, 'sc-label-value');
        labelThickness = utility.stringSetThickness(['Xy'], container, 'sc-label-value')[0];

        var seriesExtents = d3.extent(data.map(function(d, i) { return d.seriesIndex; }));
        minSeries = seriesExtents[0];
        maxSeries = seriesExtents[1];
      }

      function resetScale() {
        var xDomain = xDomain || unique(seriesData.map(getX).concat(forceX));
        var maxX = vertical ? availableWidth : availableHeight,
            maxY = vertical ? availableHeight : availableWidth;

        var boundsWidth = stacked ? baseDimension : baseDimension * seriesCount + baseDimension,
            gap = baseDimension * (stacked ? 0.25 : 1),
            outerPadding = Math.max(0.25, (maxX - (groupCount * boundsWidth) - gap) / (2 * boundsWidth));

        x .domain(xDomain)
          .range([0, maxX])
          .paddingInner(withLine ? 0.3 : 0.25)
          .paddingOuter(outerPadding);

        var yDomain = yDomain || d3.extent(seriesData.map(function(d) {
                var posOffset = d.y0 + (vertical ? 0 : d.y);
                var negOffset = d.y0 + (vertical ? d.y : 0);
                return stacked ? (d.y > 0 ? posOffset : negOffset) : d.y;
              }).concat(forceY));
        var yRange = vertical ? [maxY, 0] : [0, maxY];

        y .domain(yDomain)
          .range(yRange);

        if (showValues) {
          // this must go here because barThickness varies based on x.bandwidth()
          verticalLabels = vertical && d3.max(labelLengths) + 8 > barThickness();
          useWidth = verticalLabels || !vertical;
        }

        //------------------------------------------------------------
        // recalculate y.range if grouped and show values

        if (labelsOutside) {
          var minBarY = 0, // top
              maxBarY = maxY, // bottom
              negValuePadding = 0,
              posValuePadding = 0;

          gap = vertical ? verticalLabels ? 2 : -2 : 2;

          labelData.forEach(function(label, l) {
            var labelDimension = useWidth ?
                  labelLengths[l] :
                  labelThickness;
            var value = parseFloat(label.y);

            // this the vertical pixel position of the bar top (or bottom for negative values)
            var labelY = y(value);
            var offset = 0;

            // d is sometimes numeric but sometimes a string
            // minBarY = 0 unless there are negative values
            if (vertical && value > 0 || !vertical && value < 0) {
              offset = labelY - labelDimension;
              if (offset < minBarY) {
                posValuePadding = labelDimension;
                minBarY = offset; // min because top of graph has y = 0
              }
            } else {
              offset = labelY + labelDimension;
              if (offset > maxBarY) {
                negValuePadding = labelDimension;
                maxBarY = offset; // max because top of graph has y = height
              }
            }
          });

          if (vertical) {
            y.range([
              maxY - (y.domain()[0] < 0 ? negValuePadding + gap + 2 : 0),
                      y.domain()[1] > 0 ? posValuePadding + gap : 0
            ]);
          } else {
            y.range([
                      y.domain()[0] < 0 ? posValuePadding + gap + 4 : 0,
              maxY - (y.domain()[1] > 0 ? negValuePadding + gap : 0)
            ]);
          }
        }

        if (nice) {
          y.nice();
        }

        x0 = x0 || x;
        y0 = y0 || y;
      }

      resetScale();

      //------------------------------------------------------------
      // Setup containers and skeleton of model

      var wrap_bind = container.selectAll('g.sc-wrap.sc-multibar').data([data]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-wrap sc-multibar');
      var wrap = container.select('.sc-wrap.sc-multibar').merge(wrap_entr);

      var defs_entr = wrap_entr.append('defs');
      var defs = wrap.select('defs');

      wrap.attr('transform', utility.translation(margin.left, margin.top));

      //------------------------------------------------------------
      // Definitions

      if (clipEdge) {
        defs_entr.append('clipPath')
          .attr('id', 'sc-edge-clip-' + id)
          .append('rect');
        defs.select('#sc-edge-clip-' + id + ' rect')
          .attr('width', availableWidth)
          .attr('height', availableHeight);
      }
      wrap.attr('clip-path', clipEdge ? 'url(#sc-edge-clip-' + id + ')' : '');

      if (textureFill) {
        var mask = utility.createTexture(defs_entr, id);
      }

      // set up the gradient constructor function
      model.gradientFill = function(d, i, params) {
        var gradientId = id + '-' + i;
        var c = color(d, i);
        return gradient(d, gradientId, params, c, defs);
      };
      var noGradient = fill === color;

      //------------------------------------------------------------

      var series_bind = wrap.selectAll('.sc-series').data(utility.identity);
      var series_entr = series_bind.enter().append('g')
            .attr('class', classes)
            .style('stroke-opacity', 1e-6)
            .style('fill-opacity', 1e-6);
      series_bind.exit().remove();
      var series = wrap.selectAll('.sc-series').merge(series_entr);

      // series_bind.exit()
      //   .style('stroke-opacity', 1e-6)
      //   .style('fill-opacity', 1e-6)
      //     .selectAll('g.sc-bar')
      //       .attr('y', function(d) {
      //         return stacked ? y0(d.y0) : y0(0);
      //       })
      //       .attr(dimX, 0)
      //       .remove();

      series
        .attr('fill', fill)
        .attr('class', classes)
        .classed('hover', function(d) { return d.hover; })
        .classed('sc-active', function(d) { return d.active === 'active'; })
        .classed('sc-inactive', function(d) { return d.active === 'inactive'; })
        .style('stroke-opacity', 1)
        .style('fill-opacity', 1);

      series
        .on('mouseover', function(d, i, j) {
          //TODO: figure out why j works above, but not here
          d3.select(this).classed('hover', true);
        })
        .on('mouseout', function(d, i, j) {
          d3.select(this).classed('hover', false);
        });

      //------------------------------------------------------------

      var bars_bind = series.selectAll('.sc-bar').data(function(d) { return d.values; });
      var bars_entr = bars_bind.enter().append('g').attr('class', 'sc-bar');
      bars_bind.exit().remove();
      var bars = series.selectAll('.sc-bar').merge(bars_entr);

      // The actual bar rectangle
      bars_entr.append('rect')
        .attr('class', 'sc-base')
        .style('fill', 'inherit')
        .attr('x', 0)
        .attr('y', 0);

      if (textureFill) {
        // For on click active bars
        bars_entr.append('rect')
          .attr('class', 'sc-texture')
          .attr('x', 0)
          .attr('y', 0)
          .style('mask', 'url(' + mask + ')');
      }

      // For label background
      bars_entr.append('rect')
        .attr('class', 'sc-label-box')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 0)
        .attr('height', 0)
        .attr('rx', 2)
        .attr('ry', 2)
        .style('fill', 'transparent')
        .style('stroke-width', 0)
        .style('fill-opacity', 0);
      var barBox = bars.select('.sc-label-box');

      // For label text
      bars_entr.append('text').attr('class', 'sc-label-value');
      var barText = bars.select('.sc-label-value');

      //------------------------------------------------------------
      function getContrastColor(d, i) {
        var fillColor = fill(d);
        var backColor = fillColor === 'inherit'
          ? d3.select('.' + classes(d, i).split(' ').join('.')).style('color')
          : fillColor;
        return utility.getTextContrast(backColor, i);
      }
      function barLength(d, i) {
        return Math.max(Math.round(Math.abs(y(getY(d, i)) - y(0))), 0);
      }
      function barThickness() {
        return x.bandwidth() / (stacked ? 1 : data.length);
      }
      function barTransform(d, i) {
        var trans;
        if (stacked) {
          trans = {
            x: Math.round(x(getX(d, i))),
            y: Math.round(y(d.y0))
          };
        } else {
          // i is the group index, seri is the virtual series index, seriesIndex is the actual index
          trans = {
            x: Math.round(d.seri * barThickness() + x(getX(d, i))),
            //TODO: clean this up
            y: Math.round(getY(d, i) < 0
              ? (vertical ? y(0) : y(getY(d, i)))
              : (vertical ? y(getY(d, i)) : y(0)))
          };
        }
        return 'translate(' + trans[valX] + ',' + trans[valY] + ')';
      }

      bars
        .attr('class', function(d, i) {
          return 'sc-bar ' + (getY(d, i) < 0 ? 'negative' : 'positive');
        })
        .classed('sc-active', function(d) { return d.active === 'active'; })
        .attr('transform', barTransform)
        .style('display', function(d, i) {
          return barLength(d, i) !== 0 ? 'inline' : 'none';
        });

      bars.select('rect.sc-base')
        .attr(valX, 0)
        .attr(dimY, barLength)
        .attr(dimX, barThickness);

      if (textureFill) {
        bars.select('rect.sc-texture')
          .attr(valX, 0)
          .attr(dimY, barLength)
          .attr(dimX, barThickness)
          .style('fill', getContrastColor);
      }

      //------------------------------------------------------------
      // Bar text: begin, middle, end, top

      function getLabelText(d, i) {
        // this must be total because that is the only option that requires summing
        var value = labelPosition === 'total' ?
          groupTotals[i][getY(d, i) < 0 ? 'neg' : 'pos'] :
          d;
        return getLabel(value);
      }
      function setLabelDimensions(d, i) {
        var bbox = this.getBoundingClientRect();
        var width = Math.floor(bbox.width);
        var height = Math.floor(bbox.height);
        d.labelWidth = d.labelWidth || (verticalLabels ? height : width) + 4;
        d.labelHeight = d.labelHeight || (verticalLabels ? width : height);
        d.barLength = barLength(d, i);
        d.barThickness = barThickness();
      }
      function getLabelAnchor(d, i) {
        var anchor = 'middle',
            negative = getY(d, i) < 0;
        if (useWidth) {
          switch (labelPosition) {
            case 'start':
              anchor = negative ? 'end' : 'start';
              break;
            case 'middle':
              anchor = 'middle';
              break;
            case 'end':
              anchor = negative ? 'start' : 'end';
              break;
            case 'top':
            case 'total':
              anchor = negative ? 'end' : 'start';
              break;
          }
          anchor = direction === 'rtl' && anchor !== 'middle' ? anchor === 'start' ? 'end' : 'start' : anchor;
        } else {
          anchor = 'middle';
        }
        return anchor;
      }
      function getLabelX(d, i) {
        var offset = 0,
            negative = getY(d, i) < 0 ? -1 : 1,
            shift = negative < 0;

        var padding = (4 + useWidth * 2) * negative;

        if (vertical && !verticalLabels) {
          offset = d.barThickness / 2;
        } else {
          switch (labelPosition) {
            case 'start':
              // vrt: neg 0 , pos -1
              // hrz: neg 1 , pos  0
              offset = d.barLength * (shift - verticalLabels) + padding;
              break;
            case 'middle':
              offset = d.barLength * (verticalLabels ? -1 : 1) / 2;
              break;
            case 'end':
              // vrt: neg -1 , pos 0.
              // hrz: neg  0 , pos 1;
              offset = d.barLength * (!verticalLabels - shift) - padding;
              break;
            case 'top':
            case 'total':
              offset = d.barLength * (!verticalLabels - shift) + 2 * negative;
              break;
          }
        }
        return offset;
      }
      function getLabelY(d, i) {
        var offset = 0,
            negative = getY(d, i) < 0 ? -1 : 1,
            shift = negative < 0;

        var padding = (
              d.labelHeight / 2 +
              (4 + verticalLabels * 2) * !labelsOutside
            ) * negative;

        if (useWidth) {
          offset = d.barThickness / 2;
        } else {
          switch (labelPosition) {
            case 'start':
              offset = d.barLength * (1 - shift) - padding;
              break;
            case 'middle':
              offset = d.barLength / 2;
              break;
            case 'end':
              offset = d.barLength * (0 + shift) + padding;
              break;
            case 'top':
            case 'total':
              offset = d.barLength * (0 + shift) - padding;
              break;
          }
        }
        return offset;
      }
      function getLabelFill(d, i, j) {
        return labelsOutside ? '#000' : getContrastColor(d, i);
      }
      function getLabelOpacity(d, i) {
        if (labelsOutside) {
          if (labelPosition === 'total' && stacked) {
            // hide non-total labels for stacked bar
            var y = getY(d, i);
            return (y <  0 && groupTotals[i].neg.y === d.y0 + (vertical ? y : 0)) ||
              (y >= 0 && groupTotals[i].pos.y === d.y0 + (vertical ? 0 : y)) ? 1 : 0;
          } else {
            return 1;
          }
        } else {
          var lengthOverlaps = d.barLength < (useWidth ? d.labelWidth : d.labelHeight) + 8;
          var thicknessOverlaps = d.barThickness < (useWidth ? d.labelHeight : d.labelWidth) + 4;
          return lengthOverlaps || thicknessOverlaps ? 0 : 1;
        }
      }

      function getLabelBoxX(d, i) {
        return getLabelBoxOffset(d, i, true);
      }
      function getLabelBoxY(d, i) {
        return getLabelBoxOffset(d, i, false);
      }
      function getLabelBoxOffset(d, i, isX) {
        var offset, pos, gap, shift, labelDim, barLength, isY;
        // if x, isX is true and gap is 4
        // if y, isX is false and gap is -4
        offset = 0;
        pos = getY(d, i) >= 0;
        gap = 4 * sign(isX) * sign(pos);

        //    neg  pos
        // x:  1    0
        // y:  0    1
        shift = isX === pos ? 0 : 1;

        // if get x and vertical or get y and horizontal
        if (!isX ^ vertical) {
          offset = (d.barThickness - (useWidth ? d.labelHeight : d.labelWidth)) / 2;
        } else {
          //       vert lbl    horz lbl
          // x:    height      width
          // y:    width       height
          // label width is bbox.w+4
          barLength = d.barLength - (useWidth ? d.labelWidth : d.labelHeight);

          switch (labelPosition) {
            case 'start':
              offset = barLength * (0 + shift) + gap;
              break;
            case 'middle':
              offset = barLength / 2;
              break;
            case 'end':
              offset = barLength * (1 - shift) - gap;
              break;
            case 'top':
            case 'total':
              labelDim = verticalLabels === isX ? d.labelHeight : d.labelWidth;
              offset = d.barLength * (1 - shift) - labelDim * (0 + shift);
              break;
          }
        }

        return offset;
      }
      function getLabelBoxWidth(d) {
        return verticalLabels ? d.labelHeight : d.labelWidth;
      }
      function getLabelBoxHeight(d) {
        return verticalLabels ? d.labelWidth : d.labelHeight;
      }
      function getLabelBoxFill(d, i) {
        return labelsOutside ? '#fff' : color(d, i);
      }

      if (showValues) {

        barText
          .text(getLabelText)
          .attr('transform', 'rotate(' + (0 - 90 * verticalLabels) + ')')
          .each(setLabelDimensions);

        barText
          .attr('dy', '0.35em')
          .attr('text-anchor', getLabelAnchor)
          .attr('x', getLabelX)
          .attr('y', getLabelY)
          .style('fill', getLabelFill)
          .style('fill-opacity', getLabelOpacity);

        barBox
          .attr('x', getLabelBoxX)
          .attr('y', getLabelBoxY)
          .attr('width', getLabelBoxWidth)
          .attr('height', getLabelBoxHeight)
          .style('fill', getLabelBoxFill)
          .style('fill-opacity', getLabelOpacity);

      } else {
        barText
          .text('')
          .style('fill-opacity', 0);

        bars
          .select('rect.label-box')
            .style('fill-opacity', 0);
      }

      //------------------------------------------------------------
      // Assign events

      function buildEventObject(e, d, i) {
        return {
          pointIndex: i,
          point: d,
          seriesIndex: d.seriesIndex,
          series: data[d.seri],
          groupIndex: d.groupIndex,
          id: id,
          e: e
        };
      }

      bars
        .on('mouseover', function(d, i) { //TODO: figure out why j works above, but not here
          var eo = buildEventObject(d3.event, d, i);
          dispatch.call('elementMouseover', this, eo);
        })
        .on('mousemove', function(d, i) {
          var e = d3.event;
          dispatch.call('elementMousemove', this, e);
        })
        .on('mouseout', function(d, i) {
          var eo = buildEventObject(d3.event, d, i);
          dispatch.call('elementMouseout', this, eo);
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

      // TODO: fix way of passing in a custom color function
      // if (barColor) {
      //   if (!disabled) {
      //     disabled = data.map(function() { return true; });
      //   }
      //   bars
      //     //.style('fill', barColor)
      //     //.style('stroke', barColor)
      //     //.style('fill', function(d,i,j) { return d3.rgb(barColor(d,i)).darker(j).toString(); })
      //     //.style('stroke', function(d,i,j) { return d3.rgb(barColor(d,i)).darker(j).toString(); })
      //     .style('fill', function(d, i, j) {
      //       return d3.rgb(barColor(d, i))
      //                .darker(disabled.map(function(d, i) { return i; })
      //                .filter(function(d, i) { return !disabled[i]; })[j])
      //                .toString();
      //     })
      //     .style('stroke', function(d, i, j) {
      //       return d3.rgb(barColor(d, i))
      //                .darker(disabled.map(function(d, i) { return i; })
      //                .filter(function(d, i) { return !disabled[i]; })[j])
      //                .toString();
      //     });
      // }

      //store old scales for use in transitions on update
      x0 = x.copy();
      y0 = y.copy();

    });

    return model;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  model.dispatch = dispatch;

  model.color = function(_) {
    if (!arguments.length) { return color; }
    color = _;
    return model;
  };
  model.fill = function(_) {
    if (!arguments.length) { return fill; }
    fill = _;
    return model;
  };
  model.classes = function(_) {
    if (!arguments.length) { return classes; }
    classes = _;
    return model;
  };
  model.gradient = function(_) {
    if (!arguments.length) { return gradient; }
    gradient = _;
    return model;
  };

  model.x = function(_) {
    if (!arguments.length) { return getX; }
    getX = _;
    return model;
  };

  model.y = function(_) {
    if (!arguments.length) { return getY; }
    getY = _;
    return model;
  };

  model.margin = function(_) {
    if (!arguments.length) { return margin; }
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        margin[prop] = _[prop];
      }
    }
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

  model.xScale = function(_) {
    if (!arguments.length) { return x; }
    x = _;
    return model;
  };

  model.yScale = function(_) {
    if (!arguments.length) { return y; }
    y = _;
    return model;
  };

  model.xDomain = function(_) {
    if (!arguments.length) { return xDomain; }
    xDomain = _;
    return model;
  };

  model.yDomain = function(_) {
    if (!arguments.length) { return yDomain; }
    yDomain = _;
    return model;
  };

  model.forceX = function(_) {
    if (!arguments.length) { return forceX; }
    forceX = _;
    return model;
  };

  model.forceY = function(_) {
    if (!arguments.length) { return forceY; }
    forceY = _;
    return model;
  };

  model.stacked = function(_) {
    if (!arguments.length) { return stacked; }
    stacked = _;
    return model;
  };

  model.barColor = function(_) {
    if (!arguments.length) { return barColor; }
    barColor = utility.getColor(_);
    return model;
  };

  model.disabled = function(_) {
    if (!arguments.length) { return disabled; }
    disabled = _;
    return model;
  };

  model.id = function(_) {
    if (!arguments.length) { return id; }
    id = _;
    return model;
  };

  model.delay = function(_) {
    if (!arguments.length) { return delay; }
    delay = _;
    return model;
  };

  model.duration = function(_) {
    if (!arguments.length) { return duration; }
    duration = _;
    return model;
  };

  model.clipEdge = function(_) {
    if (!arguments.length) { return clipEdge; }
    clipEdge = _;
    return model;
  };

  model.showValues = function(_) {
    if (!arguments.length) { return showValues; }
    showValues = isNaN(parseInt(_, 10)) ? _ : parseInt(_, 10) && true || false;
    return model;
  };

  model.valueFormat = function(_) {
    if (!arguments.length) { return valueFormat; }
    valueFormat = _;
    return model;
  };

  model.withLine = function(_) {
    if (!arguments.length) { return withLine; }
    withLine = _;
    return model;
  };

  model.vertical = function(_) {
    if (!arguments.length) { return vertical; }
    vertical = _;
    return model;
  };

  model.baseDimension = function(_) {
    if (!arguments.length) { return baseDimension; }
    baseDimension = _;
    return model;
  };

  model.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    return model;
  };

  model.textureFill = function(_) {
    if (!arguments.length) { return textureFill; }
    textureFill = _;
    return model;
  };

  model.nice = function(_) {
    if (!arguments.length) { return nice; }
    nice = _;
    return model;
  };

  model.locality = function(_) {
    if (!arguments.length) { return locality; }
    locality = utility.buildLocality(_);
    return model;
  };

  //============================================================

  return model;
}
