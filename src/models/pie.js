import d3 from 'd3v4';
import utility from '../utility.js';

export default function pie() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 500,
      height = 500,
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID in case user doesn't select one
      getX = function(d) { return d.x; },
      getY = function(d) { return d.y; },
      getKey = function(d) { return d.key; },
      getValue = function(d, i) { return d.value; },
      fmtKey = function(d) { return getKey(d.series || d); },
      fmtValue = function(d) { return getValue(d.series || d); },
      fmtCount = function(d) { return (' (' + (d.series.count || d.count) + ')').replace(' ()', ''); },
      locality = utility.buildLocality(),
      direction = 'ltr',
      delay = 0,
      duration = 0,
      color = function(d, i) { return utility.defaultColor()(d.series, d.seriesIndex); },
      gradient = null,
      fill = color,
      textureFill = false,
      classes = function(d, i) { return 'sc-series sc-series-' + d.seriesIndex; },
      dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout', 'elementMousemove');

  var showLabels = true,
      showLeaders = true,
      pieLabelsOutside = true,
      donutLabelsOutside = true,
      labelThreshold = 0.01, //if slice percentage is under this, don't show label
      donut = false,
      hole = false,
      labelSunbeamLayout = false,
      leaderLength = 20,
      textOffset = 5,
      arcDegrees = 360,
      rotateDegrees = 0,
      donutRatio = 0.447,
      minRadius = 75,
      maxRadius = 250;

  var holeFormat = function(hole_wrap, data) {
        var hole_bind = hole_wrap.selectAll('.sc-hole-container').data(data),
            hole_entr = hole_bind.enter().append('g').attr('class', 'sc-hole-container');
        hole_entr.append('text')
          .text(data)
          .attr('class', 'sc-pie-hole-value')
          .attr('dy', '.35em')
          .attr('text-anchor', 'middle')
          .style('font-size', '50px');
        hole_bind.exit().remove();
      };

  var startAngle = function(d) {
        // DNR (Math): simplify d.startAngle - ((rotateDegrees * Math.PI / 180) * (360 / arcDegrees)) * (arcDegrees / 360);
        return d.startAngle * arcDegrees / 360 + utility.angleToRadians(rotateDegrees);
      };
  var endAngle = function(d) {
        return d.endAngle * arcDegrees / 360 + utility.angleToRadians(rotateDegrees);
      };

  var fixedRadius = function(chart) { return null; };

  //============================================================
  // Private Variables
  //------------------------------------------------------------

  // Setup the Pie chart and choose the data element
  var pie = d3.pie()
        .sort(null)
        .value(getValue);

  //============================================================
  // Update chart

  function chart(selection) {

    selection.each(function(data) {

      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          container = d3.select(this);

      //set up the gradient constructor function
      gradient = function(d, i) {
        var params = {x: 0, y: 0, r: pieRadius, s: (donut ? (donutRatio * 100) + '%' : '0%'), u: 'userSpaceOnUse'};
        return utility.colorRadialGradient(d, id + '-' + i, params, color(d, i), wrap.select('defs'));
      };

      //------------------------------------------------------------
      // recalculate width and height based on label length

      var labelLengths = [],
          doLabels = showLabels && pieLabelsOutside ? true : false;

      if (doLabels) {
        labelLengths = utility.stringSetLengths(
            data,
            container,
            fmtKey,
            'sc-label'
          );
      }

      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap_bind = container.selectAll('g.sc-wrap').data([data]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-wrap sc-pie');
      var wrap = container.select('.sc-wrap.sc-pie').merge(wrap_entr);

      var defs_entr = wrap_entr.append('defs');

      wrap_entr.append('g').attr('class', 'sc-group');
      var group_wrap = wrap.select('.sc-group');

      wrap_entr.append('g').attr('class', 'sc-hole-wrap');
      var hole_wrap = wrap.select('.sc-hole-wrap');

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      //------------------------------------------------------------
      // Definitions

      if (textureFill) {
        var mask = utility.createTexture(defs_entr, id, -availableWidth / 2, -availableHeight / 2);
      }

      //------------------------------------------------------------
      // Append major data series grouping containers

      var series_bind = group_wrap.selectAll('.sc-series').data(pie);
      var series_entr = series_bind.enter().append('g').attr('class', 'sc-series');
      series_bind.exit().remove();
      var series = group_wrap.selectAll('.sc-series').merge(series_entr);

      series_entr
        .style('stroke', '#FFF')
        .style('stroke-width', 2)
        .style('stroke-opacity', 0)
        .on('mouseover', function(d, i, j) { //TODO: figure out why j works above, but not here
          d3.select(this).classed('hover', true);
        })
        .on('mouseout', function(d, i, j) {
          d3.select(this).classed('hover', false);
        });

      series
        .attr('class', function(d) { return classes(d.data, d.data.seriesIndex); })
        .attr('fill', function(d) { return fill(d.data, d.data.seriesIndex); })
        .classed('sc-active', function(d) { return d.data.active === 'active'; })
        .classed('sc-inactive', function(d) { return d.data.active === 'inactive'; });

      //------------------------------------------------------------
      // Append polygons for funnel

      var slice_bind = series.selectAll('g.sc-slice').data(
            // I wish we didn't have to do this :-(
            function(s, i) {
              return s.data.values.map(function(v, j) {
                v.endAngle = s.endAngle;
                v.padAngle = s.padAngle;
                v.startAngle = s.startAngle;
                return v;
              });
            },
            function(d) { return d.seriesIndex; }
          );
      slice_bind.exit().remove();
      var slice_entr = slice_bind.enter().append('g').attr('class', 'sc-slice');
      var slices = series.selectAll('g.sc-slice').merge(slice_entr);

      slice_entr.append('path')
        .attr('class', 'sc-base')
        .each(function(d, i) {
          this._current = d;
        });

      if (textureFill) {
        slice_entr.append('path')
          .attr('class', 'sc-texture')
          .each(function(d, i) {
            this._current = d;
          })
          .style('mask', 'url(' + mask + ')');
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

      slice_entr.append('g')
        .attr('class', 'sc-label')
        .attr('transform', 'translate(0,0)');

      slice_entr.select('.sc-label')
        .append('rect')
        .style('fill-opacity', 0)
        .style('stroke-opacity', 0);
      slice_entr.select('.sc-label')
        .append('text')
        .style('fill-opacity', 0);

      slice_entr.append('polyline')
        .attr('class', 'sc-label-leader')
        .style('stroke-opacity', 0);

      //------------------------------------------------------------
      // UPDATE

      var maxWidthRadius = availableWidth / 2,
          maxHeightRadius = availableHeight / 2,
          extWidths = [],
          extHeights = [],
          verticalShift = 0,
          verticalReduction = doLabels ? 5 : 0,
          horizontalShift = 0,
          horizontalReduction = leaderLength + textOffset;

      // side effect :: resets extWidths, extHeights
      slices.select('.sc-base').call(calcScalars, maxWidthRadius, maxHeightRadius);

      // Donut Hole Text
      hole_wrap.call(holeFormat, hole ? [hole] : []);

      if (hole) {
        var heightHoleHalf = hole_wrap.node().getBoundingClientRect().height * 0.30,
            heightPieHalf = Math.abs(maxHeightRadius * d3.min(extHeights)),
            holeOffset = Math.round(heightHoleHalf - heightPieHalf);

        if (holeOffset > 0) {
          verticalReduction += holeOffset;
          verticalShift -= holeOffset / 2;
        }
      }

      var offsetHorizontal = availableWidth / 2,
          offsetVertical = availableHeight / 2;

      //first adjust the leaderLength to be proportional to radius
      if (doLabels) {
        leaderLength = Math.max(Math.min(Math.min(calcMaxRadius()) / 12, 20), 10);
      }

      if (fixedRadius(chart)) {
        minRadius = fixedRadius(chart);
        maxRadius = fixedRadius(chart);
      }

      var labelRadius = Math.min(Math.max(calcMaxRadius(), minRadius), maxRadius),
          pieRadius = labelRadius - (doLabels ? leaderLength : 0);

      offsetVertical += ((d3.max(extHeights) - d3.min(extHeights)) / 2 + d3.min(extHeights)) * ((labelRadius + verticalShift) / offsetVertical);
      offsetHorizontal += ((d3.max(extWidths) - d3.min(extWidths)) / 2 - d3.max(extWidths)) * (labelRadius / offsetHorizontal);
      offsetVertical += verticalShift / 2;

      group_wrap
        .attr('transform', 'translate(' + offsetHorizontal + ',' + offsetVertical + ')');
      hole_wrap
        .attr('transform', 'translate(' + offsetHorizontal + ',' + offsetVertical + ')');
      group_wrap.select(mask)
        .attr('x', -pieRadius / 2)
        .attr('y', -pieRadius / 2);

      var pieArc = d3.arc()
            .innerRadius(donut ? pieRadius * donutRatio : 0)
            .outerRadius(pieRadius)
            .startAngle(startAngle)
            .endAngle(endAngle);

      var labelArc = d3.arc()
            .innerRadius(0)
            .outerRadius(pieRadius)
            .startAngle(startAngle)
            .endAngle(endAngle);

      if (pieLabelsOutside) {
        if (!donut || donutLabelsOutside) {
          labelArc
            .innerRadius(labelRadius)
            .outerRadius(labelRadius);
        } else {
          labelArc
            .outerRadius(pieRadius * donutRatio);
        }
      }

      // removed d3 transition in MACAROON-133 because
      // there is a "Maximum call stack size exceeded at Date.toString" error
      // in PMSE that stops d3 from calling transitions
      // this may be a logger issue or some recursion somewhere in PMSE
      // slices.select('path').transition().duration(duration)
      //   .attr('d', arc)
      //   .attrTween('d', arcTween);

      slices.select('.sc-base')
        .attr('d', pieArc)
        .style('stroke-opacity', function(d) {
          return startAngle(d) === endAngle(d) ? 0 : 1;
        });

      if (textureFill) {
        slices.select('.sc-texture')
          .attr('d', pieArc)
          .style('stroke-opacity', function(d) {
            return startAngle(d) === endAngle(d) ? 0 : 1;
          })
          .style('fill', function(d, i) {
            var backColor = d3.select(this.parentNode).style('fill');
            return utility.getTextContrast(backColor, i);
          });
      }

      //------------------------------------------------------------
      // Update label containers

      if (showLabels) {
        // This does the normal label
        slices.select('.sc-label')
          .attr('transform', function(d) {
            if (labelSunbeamLayout) {
              d.outerRadius = pieRadius + 10; // Set Outer Coordinate
              d.innerRadius = pieRadius + 15; // Set Inner Coordinate
              var rotateAngle = (startAngle(d) + endAngle(d)) / 2 * (180 / Math.PI);
              rotateAngle += 90 * alignedRight(d, labelArc);
              return 'translate(' + labelArc.centroid(d) + ') rotate(' + rotateAngle + ')';
            } else {
              var labelsPosition = labelArc.centroid(d),
                  leadOffset = showLeaders ? (leaderLength + textOffset) * alignedRight(d, labelArc) : 0;
              return 'translate(' + [labelsPosition[0] + leadOffset, labelsPosition[1]] + ')';
            }
          });

        slices.select('.sc-label text')
          .text(fmtKey)
          .attr('dy', '.35em')
          .style('fill', '#555')
          .style('fill-opacity', labelOpacity)
          .style('text-anchor', function(d) {
            //center the text on it's origin or begin/end if orthogonal aligned
            //labelSunbeamLayout ? ((d.startAngle + d.endAngle) / 2 < Math.PI ? 'start' : 'end') : 'middle'
            if (!pieLabelsOutside) {
              return 'middle';
            }
            var anchor = alignedRight(d, labelArc) === 1 ? 'start' : 'end';
            if (direction === 'rtl') {
              anchor = anchor === 'start' ? 'end' : 'start';
            }
            return anchor;
          });

        slices
          .each(function(d, i) {
            if (labelLengths[i] > minRadius || labelRadius === minRadius) {
              var theta = (startAngle(d) + endAngle(d)) / 2,
                  sin = Math.abs(Math.sin(theta)),
                  bW = labelRadius * sin + leaderLength + textOffset + labelLengths[i],
                  rW = (availableWidth / 2 - offsetHorizontal) + availableWidth / 2 - bW;
              if (rW < 0) {
                var label = utility.stringEllipsify(fmtKey(d), container, labelLengths[i] + rW);
                d3.select(this).select('text').text(label);
              }
            }
          });

        if (!pieLabelsOutside) {
          slices.select('.sc-label')
            .each(function(d) {
              if (!labelOpacity(d)) {
                return;
              }
              var slice = d3.select(this),
                  textBox = slice.select('text').node().getBoundingClientRect();
              slice.select('rect')
                .attr('rx', 3)
                .attr('ry', 3)
                .attr('width', textBox.width + 10)
                .attr('height', textBox.height + 10)
                .attr('transform', function() {
                  return 'translate(' + [textBox.x - 5, textBox.y - 5] + ')';
                })
                .style('fill', '#FFF')
                .style('fill-opacity', labelOpacity);
            });
        } else if (showLeaders) {
          slices.select('.sc-label-leader')
            .attr('points', function(d) {
              if (!labelOpacity(d)) {
                // canvg needs at least 2 points because the lib doesnt have
                // any defensive code around an array with 1 element, it expects 2+ els
                return '0,0 0,0';
              }
              var outerArc = d3.arc()
                    .innerRadius(pieRadius)
                    .outerRadius(pieRadius)
                    .startAngle(startAngle)
                    .endAngle(endAngle);
              var leadOffset = showLeaders ? leaderLength * alignedRight(d, outerArc) : 0,
                  outerArcPoints = outerArc.centroid(d),
                  labelArcPoints = labelArc.centroid(d),
                  leadArcPoints = [labelArcPoints[0] + leadOffset, labelArcPoints[1]];
              return outerArcPoints + ' ' + labelArcPoints + ' ' + leadArcPoints;
            })
            .style('stroke', '#AAA')
            .style('fill', 'none')
            .style('stroke-opacity', labelOpacity);
        }
      } else {
        slices.select('.sc-label-leader').style('stroke-opacity', 0);
        slices.select('.sc-label rect').style('fill-opacity', 0);
        slices.select('.sc-label text').style('fill-opacity', 0);
      }

      //------------------------------------------------------------
      // Utility functions

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

      // calculate max and min height of slice vertices
      function calcScalars(slices, maxWidth, maxHeight) {
        var widths = [],
            heights = [],
            Pi = Math.PI,
            twoPi = 2 * Math.PI,
            north = 0,
            east = Math.PI / 2,
            south = Math.PI,
            west = 3 * Math.PI / 2,
            norm = 0;

        function normalize(a) {
          return (a + norm) % twoPi;
        }

        slices.each(function(d, i) {
          var aStart = (startAngle(d) + twoPi) % twoPi,
              aEnd = (endAngle(d) + twoPi) % twoPi;

          var wStart = Math.round(Math.sin(aStart) * 10000) / 10000,
              wEnd = Math.round(Math.sin(aEnd) * 10000) / 10000,
              hStart = Math.round(Math.cos(aStart) * 10000) / 10000,
              hEnd = Math.round(Math.cos(aEnd) * 10000) / 10000;

          // if angles go around the horn, normalize
          norm = aEnd < aStart ? twoPi - aStart : 0;

          if (aEnd === aStart) {
            aStart = 0;
            aEnd = twoPi;
          } else {
            aStart = normalize(aStart);
            aEnd = normalize(aEnd);
          }

          north = normalize(north);
          east = normalize(east);
          south = normalize(south);
          west = normalize(west);

          // North
          if (aStart % twoPi === 0 || aEnd % twoPi === 0) {
            heights.push(maxHeight);
            if (donut) {
              heights.push(maxHeight * donutRatio);
            }
          }
          // East
          if (aStart <= east && aEnd >= east) {
            widths.push(maxWidth);
            if (donut) {
              widths.push(maxWidth * donutRatio);
            }
          }
          // South
          if (aStart <= south && aEnd >= south) {
            heights.push(-maxHeight);
            if (donut) {
              heights.push(-maxHeight * donutRatio);
            }
          }
          // West
          if (aStart <= west && aEnd >= west) {
            widths.push(-maxWidth);
            if (donut) {
              widths.push(-maxWidth * donutRatio);
            }
          }

          widths.push(maxWidth * wStart);
          widths.push(maxWidth * wEnd);
          if (donut) {
            widths.push(maxWidth * donutRatio * wStart);
            widths.push(maxWidth * donutRatio * wEnd);
          } else {
            widths.push(0);
          }

          heights.push(maxHeight * hStart);
          heights.push(maxHeight * hEnd);
          if (donut) {
            heights.push(maxHeight * donutRatio * hStart);
            heights.push(maxHeight * donutRatio * hEnd);
          } else {
            heights.push(0);
          }
        });

        extWidths = d3.extent(widths);
        extHeights = d3.extent(heights);

        // scale up height radius to fill extents
        maxWidthRadius *= availableWidth / (d3.max(extWidths) - d3.min(extWidths));
        maxHeightRadius *= availableHeight / (d3.max(extHeights) - d3.min(extHeights));
      }

      // reduce width radius for width of labels
      function calcMaxRadius() {
        var widthRadius = [maxWidthRadius],
            heightRadius = [maxHeightRadius + leaderLength];

        series.select('.sc-base').each(function(d, i) {
          if (!labelOpacity(d)) {
            return;
          }

          var theta = (startAngle(d) + endAngle(d)) / 2,
              sin = Math.sin(theta),
              cos = Math.cos(theta),
              bW = maxWidthRadius - horizontalReduction - labelLengths[i],
              bH = maxHeightRadius - verticalReduction,
              rW = sin ? bW / sin : bW, //don't divide by zero, fool
              rH = cos ? bH / cos : bH;

          widthRadius.push(rW);
          heightRadius.push(rH);
        });

        var radius = d3.min(widthRadius.concat(heightRadius).concat([]), function(d) { return Math.abs(d); });

        return radius;
      }

      function labelOpacity(d) {
        var percent = (endAngle(d) - startAngle(d)) / (2 * Math.PI);
        return percent > labelThreshold ? 1 : 0;
      }

      function alignedRight(d, arc) {
        var circ = Math.PI * 2,
            midArc = ((startAngle(d) + endAngle(d)) / 2 + circ) % circ;
        return midArc > 0 && midArc < Math.PI ? 1 : -1;
      }

      function arcTween(d) {
        if (!donut) {
          d.innerRadius = 0;
        }
        var i = d3.interpolate(this._current, d);
        this._current = i(0);

        return function(t) {
          var iData = i(t);
          return pieArc(iData);
        };
      }

      function tweenPie(b) {
        b.innerRadius = 0;
        var i = d3.interpolate({startAngle: 0, endAngle: 0}, b);
        return function(t) {
          return pieArc(i(t));
        };
      }

    });

    return chart;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;

  chart.id = function(_) {
    if (!arguments.length) { return id; }
    id = _;
    return chart;
  };

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

  chart.margin = function(_) {
    if (!arguments.length) { return margin; }
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
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

  chart.x = function(_) {
    if (!arguments.length) { return getX; }
    getX = _;
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) { return getY; }
    getY = utility.functor(_);
    return chart;
  };

  chart.getKey = function(_) {
    if (!arguments.length) { return getKey; }
    getKey = _;
    return chart;
  };

  chart.getValue = function(_) {
    if (!arguments.length) { return getValue; }
    getValue = _;
    return chart;
  };

  chart.fmtKey = function(_) {
    if (!arguments.length) { return fmtKey; }
    fmtKey = _;
    return chart;
  };

  chart.fmtValue = function(_) {
    if (!arguments.length) { return fmtValue; }
    fmtValue = _;
    return chart;
  };

  chart.fmtCount = function(_) {
    if (!arguments.length) { return fmtCount; }
    fmtCount = _;
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
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

  chart.locality = function(_) {
    if (!arguments.length) { return locality; }
    locality = utility.buildLocality(_);
    return chart;
  };

  chart.values = function(_) {
    if (!arguments.length) { return getValues; }
    getValues = _;
    return chart;
  };

  chart.textureFill = function(_) {
    if (!arguments.length) { return textureFill; }
    textureFill = _;
    return chart;
  };

  // PIE

  chart.showLabels = function(_) {
    if (!arguments.length) { return showLabels; }
    showLabels = _;
    return chart;
  };

  chart.labelSunbeamLayout = function(_) {
    if (!arguments.length) { return labelSunbeamLayout; }
    labelSunbeamLayout = _;
    return chart;
  };

  chart.donutLabelsOutside = function(_) {
    if (!arguments.length) { return donutLabelsOutside; }
    donutLabelsOutside = _;
    return chart;
  };

  chart.pieLabelsOutside = function(_) {
    if (!arguments.length) { return pieLabelsOutside; }
    pieLabelsOutside = _;
    return chart;
  };

  chart.showLeaders = function(_) {
    if (!arguments.length) { return showLeaders; }
    showLeaders = _;
    return chart;
  };

  chart.donut = function(_) {
    if (!arguments.length) { return donut; }
    donut = _;
    return chart;
  };

  chart.hole = function(_) {
    if (!arguments.length) { return hole; }
    hole = _;
    return chart;
  };

  chart.holeFormat = function(_) {
    if (!arguments.length) { return holeFormat; }
    holeFormat = utility.functor(_);
    return chart;
  };

  chart.donutRatio = function(_) {
    if (!arguments.length) { return donutRatio; }
    donutRatio = _;
    return chart;
  };

  chart.startAngle = function(_) {
    if (!arguments.length) { return startAngle; }
    startAngle = _;
    return chart;
  };

  chart.endAngle = function(_) {
    if (!arguments.length) { return endAngle; }
    endAngle = _;
    return chart;
  };

  chart.labelThreshold = function(_) {
    if (!arguments.length) { return labelThreshold; }
    labelThreshold = _;
    return chart;
  };

  chart.arcDegrees = function(_) {
    if (!arguments.length) { return arcDegrees; }
    arcDegrees = Math.max(Math.min(_, 360), 1);
    return chart;
  };

  chart.rotateDegrees = function(_) {
    if (!arguments.length) { return rotateDegrees; }
    rotateDegrees = _ % 360;
    return chart;
  };

  chart.minRadius = function(_) {
    if (!arguments.length) { return minRadius; }
    minRadius = _;
    return chart;
  };

  chart.maxRadius = function(_) {
    if (!arguments.length) { return maxRadius; }
    maxRadius = _;
    return chart;
  };

  chart.fixedRadius = function(_) {
    if (!arguments.length) { return fixedRadius; }
    fixedRadius = utility.functor(_);
    return chart;
  };

  //============================================================

  return chart;
}
