import d3 from 'd3v4';
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
      locality = utility.buildLocality(),
      forceY = [0], // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do chart.forceY([]) to remove
      stacked = true,
      barColor = null, // adding the ability to set the color for each rather than the whole group
      disabled, // used in conjunction with barColor to communicate to multibarChart what series are disabled
      showValues = false,
      valueFormat = function(d) { return d; },
      withLine = false,
      vertical = true,
      baseDimension = 60,
      direction = 'ltr',
      clipEdge = false, // if true, masks bars within x and y scale
      delay = 0, // transition
      duration = 300, // transition
      xDomain,
      yDomain,
      nice = false,
      color = function(d, i) { return utility.defaultColor()(d, d.seriesIndex); },
      gradient = null,
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

  function chart(selection) {
    selection.each(function(data) {

      // baseDimension = stacked ? vertical ? 72 : 30 : 20;

      var container = d3.select(this),
          orientation = vertical ? 'vertical' : 'horizontal',
          availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          dimX = vertical ? 'width' : 'height',
          dimY = vertical ? 'height' : 'width',
          dimLabel = vertical ? 'width' : 'height',
          valX = vertical ? 'x' : 'y',
          valY = vertical ? 'y' : 'x',
          seriesCount = 0,
          groupCount = 0,
          minSeries = 0,
          maxSeries = data.length - 1,
          verticalLabels = false,
          labelPosition = showValues,
          labelLengths = [],
          labelThickness = 0;

      function barLength(d, i) {
        return Math.max(Math.round(Math.abs(y(getY(d, i)) - y(0))), 0);
      }
      function barThickness() {
        return x.bandwidth() / (stacked ? 1 : data.length);
      }
      function sign(bool) {
        return bool ? 1 : -1;
      }

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
      } else if (labelPosition) {
        // grouped bars can't have label position 'total'
        if (labelPosition === 'total') {
          labelPosition = 'top';
        } else if (labelPosition === true) {
          labelPosition = 'end';
        }
        verticalLabels = vertical;
      }

      //------------------------------------------------------------
      // HACK for negative value stacking
      if (stacked) {
        var groupTotals = [];
        data[0].values.map(function(d, i) {
          var posBase = 0,
              negBase = 0;
          data.map(function(d) {
            var f = d.values[i];
            f.size = Math.abs(f.y);
            if (f.y < 0) {
              f.y0 = negBase - (vertical ? 0 : f.size);
              negBase -= f.size;
            } else {
              f.y0 = posBase + (vertical ? f.size : 0);
              posBase += f.size;
            }
          });
          groupTotals[i] = {neg: negBase, pos: posBase};
        });
      }

      //------------------------------------------------------------
      // Setup Scales

      // remap and flatten the data for use in calculating the scales' domains
      var seriesData = d3.merge(data.map(function(d) {
              return d.values.map(function(d, i) {
                return {x: getX(d, i), y: getY(d, i), y0: d.y0, y0: d.y0};
              });
            }));

      groupCount = data[0].values.length;
      seriesCount = data.length;

      if (showValues) {
        var labelData = labelPosition === 'total' && stacked ?
              groupTotals.map(function(d) { return d.neg; }).concat(
                groupTotals.map(function(d) { return d.pos; })
              ) :
              seriesData.map(getY);

        var seriesExtents = d3.extent(data.map(function(d, i) { return d.seriesIndex; }));
        minSeries = seriesExtents[0];
        maxSeries = seriesExtents[1];

        labelLengths = utility.stringSetLengths(
            labelData,
            container,
            valueFormat,
            'sc-label-value'
          );

        labelThickness = utility.stringSetThickness(
            ['Xy'],
            container,
            valueFormat,
            'sc-label-value'
          )[0];
      }

      chart.resetDimensions = function(w, h) {
        width = w;
        height = h;
        availableWidth = w - margin.left - margin.right;
        availableHeight = h - margin.top - margin.bottom;
        resetScale();
      };

      function unique(x) {
        return x.reverse()
                .filter(function (e, i, x) { return x.indexOf(e, i+1) === -1; })
                .reverse();
      }

      function resetScale() {
        var xDomain = xDomain || unique(seriesData.map(getX));
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
                var posOffset = (vertical ? 0 : d.y),
                    negOffset = (vertical ? d.y : 0);
                return stacked ? (d.y > 0 ? d.y0 + posOffset : d.y0 + negOffset) : d.y;
              }).concat(forceY));

        var yRange = vertical ? [availableHeight, 0] : [0, availableWidth];

        // initial set of y scale based on full dimension
        y .domain(yDomain)
          .range(yRange);


        if (showValues) {
          // this must go here because barThickness varies
          if (vertical && stacked && d3.max(labelLengths) + 8 > barThickness()) {
            verticalLabels = true;
          }
          //       vlbl   hlbl
          // vrt:   N      Y
          // hrz:   N      N
          dimLabel = vertical && !verticalLabels ? 'labelHeight' : 'labelWidth';
        }

        //------------------------------------------------------------
        // recalculate y.range if grouped and show values

        if (labelPosition === 'top' || labelPosition === 'total') {
          var maxBarLength = maxY,
              minBarLength = 0,
              maxValuePadding = 0,
              minValuePadding = 0,
              gap = vertical ? verticalLabels ? 2 : -2 : 2;

          labelData.forEach(function(d, i) {
            var labelDim = labelPosition === 'total' && stacked && vertical && !verticalLabels ? labelThickness : labelLengths[i];
            if (vertical && d > 0 || !vertical && d < 0) {
              if (y(d) - labelDim < minBarLength) {
                minBarLength = y(d) - labelDim;
                minValuePadding = labelDim;
              }
            } else {
              if (y(d) + labelDim > maxBarLength) {
                maxBarLength = y(d) + labelDim;
                maxValuePadding = labelDim;
              }
            }
          });

          if (vertical) {
            y.range([
              maxY - (y.domain()[0] < 0 ? maxValuePadding + gap + 2 : 0),
                      y.domain()[1] > 0 ? minValuePadding + gap : 0
            ]);
          } else {
            y.range([
                      y.domain()[0] < 0 ? minValuePadding + gap + 4 : 0,
              maxY - (y.domain()[1] > 0 ? maxValuePadding + gap : 0)
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
      // Setup containers and skeleton of chart

      var wrap_bind = container.selectAll('g.sc-wrap.sc-multibar').data([data]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-wrap sc-multibar');
      var wrap = container.select('.sc-wrap.sc-multibar').merge(wrap_entr);

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

      //set up the gradient constructor function
      gradient = function(d, i, p) {
        return utility.colorLinearGradient(d, id + '-' + i, p, color(d, i), wrap.select('defs'));
      };

      //------------------------------------------------------------
      // Definitions

      var defs_entr = wrap_entr.append('defs');

      if (clipEdge) {
        defs_entr.append('clipPath')
          .attr('id', 'sc-edge-clip-' + id)
          .append('rect');
        wrap.select('#sc-edge-clip-' + id + ' rect')
          .attr('width', availableWidth)
          .attr('height', availableHeight);
      }
      wrap.attr('clip-path', clipEdge ? 'url(#sc-edge-clip-' + id + ')' : '');


      if (textureFill) {
        var mask = utility.createTexture(defs_entr, id);
      }

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
        .attr('class', function(d,i) { return classes(d,i); })
        .classed('hover', function(d) { return d.hover; })
        .classed('sc-active', function(d) { return d.active === 'active'; })
        .classed('sc-inactive', function(d) { return d.active === 'inactive'; })
        .style('stroke-opacity', 1)
        .style('fill-opacity', 1);

      series
        .on('mouseover', function(d, i, j) { //TODO: figure out why j works above, but not here
          d3.select(this).classed('hover', true);
        })
        .on('mouseout', function(d, i, j) {
          d3.select(this).classed('hover', false);
        });

      //------------------------------------------------------------

      var bars_bind = series.selectAll('.sc-bar').data(function(d) { return d.values; });
      var bars_entr = bars_bind.enter().append('g')
            .attr('class', 'sc-bar');
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

      // For label text
      var barText_entr = bars_entr.append('text') // TODO: should this be inside labelPosition?
        .attr('class', 'sc-label-value');
      var barText = bars.select('.sc-label-value').merge(barText_entr);

      //------------------------------------------------------------

      bars
        .attr('class', function(d, i) {
          return 'sc-bar ' + (getY(d, i) < 0 ? 'negative' : 'positive');
        })
        .attr('transform', function(d, i) {
          var trans = stacked ? {
                x: Math.round(x(getX(d, i))),
                y: Math.round(y(d.y0))
              } :
              { x: Math.round(d.seri * barThickness() + x(getX(d, i))),
                y: Math.round(getY(d, i) < 0 ? (vertical ? y(0) : y(getY(d, i))) : (vertical ? y(getY(d, i)) : y(0)))
              };
          return 'translate(' + trans[valX] + ',' + trans[valY] + ')';
        });

      bars
        .select('rect.sc-base')
          .attr(valX, 0)
          .attr(dimY, barLength)
          .attr(dimX, barThickness);

      if (textureFill) {
        bars
          .select('rect.sc-texture')
            .attr(valX, 0)
            .attr(dimY, barLength)
            .attr(dimX, barThickness)
            .classed('sc-active', function(d) { return d.active === 'active'; })
            .style('fill', function(d, i) {
              var backColor = fill(d),
                  foreColor = utility.getTextContrast(backColor, i);
              return foreColor;
            });
      }

      //------------------------------------------------------------
      // Assign events

      function buildEventObject(e, d, i) {
        return {
            value: getY(d, i),
            point: d,
            series: data[d.seriesIndex],
            pointIndex: i,
            seriesIndex: d.seriesIndex,
            groupIndex: d.group,
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
      // Bar text: begin, middle, end, top

      if (showValues) {

          barText
            .text(function(d, i) {
              var val = labelPosition === 'total' && stacked ?
                getY(d, i) < 0 ?
                  groupTotals[i].neg :
                  groupTotals[i].pos :
                getY(d, i);
              return valueFormat(val);
            })
            .each(function(d, i) {
              var bbox = this.getBoundingClientRect();
              d.labelWidth = Math.floor(bbox.width) + 4;
              d.labelHeight = Math.floor(bbox.height);
              d.barLength = barLength(d, i);
              d.barThickness = barThickness();
            });

          barText
            .attr('dy', '0.35em')
            .attr('text-anchor', function(d, i) {
              var anchor = 'middle',
                  negative = getY(d, i) < 0;
              if (vertical && !verticalLabels) {
                anchor = 'middle';
              } else {
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
              }
              return anchor;
            })
            .attr('transform', 'rotate(' + (verticalLabels ? -90 : 0) + ' 0,0)')
            .attr('x', function(d, i) {
              var offset = 0,
                  negative = getY(d, i) < 0 ? -1 : 1,
                  shift = negative < 0,
                  padding = (4 + (verticalLabels || !vertical) * 2) * negative;

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
            })
            .attr('y', function(d, i) {
              var offset = 0,
                  negative = getY(d, i) < 0 ? -1 : 1,
                  shift = negative < 0,
                  padding = (d.labelHeight / 2 + (4 + verticalLabels * 2) * (labelPosition === 'total' ? 0 : 1)) * negative;

              if (vertical && !verticalLabels) {
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
                  case 'total':
                    offset = d.barLength * (0 + shift) + padding * -1;
                    break;
                }
              } else {
                offset = d.barThickness / 2;
              }
              return offset;
            })
            .style('fill', function(d, i, j) {
              if (labelPosition === 'top' || labelPosition === 'total') {
                return '#000';
              }
              // var backColor = d3.select(this.previousSibling).style('fill'),
              var backColor = fill(d),
                  textColor = utility.getTextContrast(backColor, i);
              return textColor;
            })
            .style('fill-opacity', function(d, i) {
              if (labelPosition === 'total') {
                if (d.seriesIndex !== minSeries && d.seriesIndex !== maxSeries) {
                  return 0;
                }
                var y = getY(d, i);
                return (y <  0 && groupTotals[i].neg === d.y0 + (vertical ? y : 0)) ||
                       (y >= 0 && groupTotals[i].pos === d.y0 + (vertical ? 0 : y)) ? 1 : 0;
              } else {
                var lengthOverlaps = d.barLength < (!vertical || verticalLabels ? d.labelWidth : d.labelHeight) + 8,
                    thicknessOverlaps = d.barThickness < (!vertical || verticalLabels ? d.labelHeight : d.labelWidth) + 4;
                return labelPosition !== 'top' && (lengthOverlaps || thicknessOverlaps) ? 0 : 1;
              }
            });

          function getLabelBoxOffset(d, i, s, gap) {
            var offset = 0,
                negative = getY(d, i) < 0 ? -1 : 1,
                shift = s === negative < 0 ? 1 : 0,
                barLength = d.barLength - d[dimLabel];
            if (s ? vertical : !vertical) {
              offset = (d.barThickness - (verticalLabels === s ? d.labelHeight : d.labelWidth)) / 2;
            } else {
              switch (labelPosition) {
                case 'start':
                  offset = barLength * (0 + shift) + gap * negative;
                  break;
                case 'middle':
                  offset = barLength / 2;
                  break;
                case 'end':
                  offset = barLength * (1 - shift) - gap * negative;
                  break;
                case 'top':
                  offset = d.barLength * (1 - shift) - d.labelWidth * (0 + shift);
                  break;
                case 'total':
                  offset = d.barLength * (1 - shift) - (verticalLabels === s ? d.labelHeight : d.labelWidth) * (0 + shift);
                  break;
              }
            }

            return offset;
          }

          //------------------------------------------------------------
          // Label background box
          // bars.filter(function(d, i) {
          //     return labelPosition === 'total' && stacked ? (d.seriesIndex !== minSeries && d.seriesIndex !== maxSeries) : false;
          //   })
          //   .select('rect.sc-label-box')
          //       .style('fill-opacity', 0);
          if (labelPosition === 'total' && stacked) {
            bars.select('rect.sc-label-box')
              .style('fill-opacity', 0);
          }
          bars.filter(function(d, i) {
              return labelPosition === 'total' && stacked ? (d.seriesIndex === minSeries || d.seriesIndex === maxSeries) : true;
            })
            .select('rect.sc-label-box')
                .attr('x', function(d, i) {
                  return getLabelBoxOffset(d, i, true, 4);
                })
                .attr('y', function(d, i) {
                  return getLabelBoxOffset(d, i, false, -4);
                })
                .attr('width', function(d, i) {
                  return verticalLabels ? d.labelHeight : d.labelWidth;
                })
                .attr('height', function(d, i) {
                  return verticalLabels ? d.labelWidth : d.labelHeight;
                })
                .style('fill', function(d, i) {
                  return labelPosition === 'top' || labelPosition === 'total' ? '#fff' : fill(d, i);
                })
                .style('fill-opacity', function(d, i) {
                  var lengthOverlaps = d.barLength < (!vertical || verticalLabels ? d.labelWidth : d.labelHeight) + 8,
                      thicknessOverlaps = d.barThickness < (!vertical || verticalLabels ? d.labelHeight : d.labelWidth) + 4;
                  return labelPosition !== 'top' && (lengthOverlaps || thicknessOverlaps) ? 0 : 1;
                });

      } else {
        barText
          .text('')
          .style('fill-opacity', 0);

        bars
          .select('rect.label-box')
            .style('fill-opacity', 0);
      }

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

    return chart;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;

  chart.color = function(_) {
    if (!arguments.length) { return color; }
    color = _;
    return chart;
  };
  chart.fill = function(_) {
    if (!arguments.length) { return fill; }
    fill = _;
    return chart;
  };
  chart.classes = function(_) {
    if (!arguments.length) { return classes; }
    classes = _;
    return chart;
  };
  chart.gradient = function(_) {
    if (!arguments.length) { return gradient; }
    gradient = _;
    return chart;
  };

  chart.x = function(_) {
    if (!arguments.length) { return getX; }
    getX = _;
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) { return getY; }
    getY = _;
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

  chart.xScale = function(_) {
    if (!arguments.length) { return x; }
    x = _;
    return chart;
  };

  chart.yScale = function(_) {
    if (!arguments.length) { return y; }
    y = _;
    return chart;
  };

  chart.xDomain = function(_) {
    if (!arguments.length) { return xDomain; }
    xDomain = _;
    return chart;
  };

  chart.yDomain = function(_) {
    if (!arguments.length) { return yDomain; }
    yDomain = _;
    return chart;
  };

  chart.forceY = function(_) {
    if (!arguments.length) { return forceY; }
    forceY = _;
    return chart;
  };

  chart.stacked = function(_) {
    if (!arguments.length) { return stacked; }
    stacked = _;
    return chart;
  };

  chart.barColor = function(_) {
    if (!arguments.length) { return barColor; }
    barColor = utility.getColor(_);
    return chart;
  };

  chart.disabled = function(_) {
    if (!arguments.length) { return disabled; }
    disabled = _;
    return chart;
  };

  chart.id = function(_) {
    if (!arguments.length) { return id; }
    id = _;
    return chart;
  };

  chart.delay = function(_) {
    if (!arguments.length) { return delay; }
    delay = _;
    return chart;
  };

  chart.duration = function(_) {
    if (!arguments.length) { return duration; }
    duration = _;
    return chart;
  };

  chart.clipEdge = function(_) {
    if (!arguments.length) { return clipEdge; }
    clipEdge = _;
    return chart;
  };

  chart.showValues = function(_) {
    if (!arguments.length) { return showValues; }
    showValues = isNaN(parseInt(_, 10)) ? _ : parseInt(_, 10) && true || false;
    return chart;
  };

  chart.valueFormat = function(_) {
    if (!arguments.length) { return valueFormat; }
    valueFormat = _;
    return chart;
  };

  chart.withLine = function(_) {
    if (!arguments.length) { return withLine; }
    withLine = _;
    return chart;
  };

  chart.vertical = function(_) {
    if (!arguments.length) { return vertical; }
    vertical = _;
    return chart;
  };

  chart.baseDimension = function(_) {
    if (!arguments.length) { return baseDimension; }
    baseDimension = _;
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    return chart;
  };

  chart.nice = function(_) {
    if (!arguments.length) { return nice; }
    nice = _;
    return chart;
  };

  chart.textureFill = function(_) {
    if (!arguments.length) { return textureFill; }
    textureFill = _;
    return chart;
  };

  chart.locality = function(_) {
    if (!arguments.length) { return locality; }
    locality = utility.buildLocality(_);
    return chart;
  };

  //============================================================

  return chart;
}
