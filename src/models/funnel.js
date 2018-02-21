import d3 from 'd3';
import utility from '../utility.js';

export default function funnel() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 960,
      height = 500,
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID in case user doesn't select one
      getKey = function(d) { return (d.series || d).key; },
      getValue = function(d, i) { return (d.series || d).value; },
      getCount = function(d, i) { return (d.series || d).count; },
      fmtKey = function(d) { return getKey(d); },
      fmtValue = function(d) { return getValue(d); },
      fmtCount = function(d) { return !isNaN(getCount(d)) ? (' (' + getCount(d) + ')') : ''; },
      locality = utility.buildLocality(),
      direction = 'ltr',
      delay = 0,
      duration = 0,
      color = function(d, i) { return utility.defaultColor()(d, d.seriesIndex); },
      gradient = utility.colorLinearGradient,
      fill = color,
      textureFill = false,
      classes = function(d, i) { return 'sc-series sc-series-' + d.seriesIndex; };

  var r = 0.3, // ratio of width to height (or slope)
      y = d3.scaleLinear(),
      yDomain = null,
      forceY = [0], // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do model.forceY([]) to remove
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
  // Update model

  function model(selection) {
    selection.each(function(data) {

      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          container = d3.select(this);

      var labelGap = 5,
          labelSpace = 5,
          labelOffset = 0,
          funnelTotal = 0,
          funnelOffset = 0;

      // sum the values for each data element
      funnelTotal = d3.sum(data, function(d) { return d.value; });

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
      // Setup containers and skeleton of model

      var wrap_bind = container.selectAll('g.sc-wrap').data([data]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-wrap sc-funnel');
      var wrap = container.select('.sc-wrap.sc-funnel').merge(wrap_entr);

      var defs_entr = wrap_entr.append('defs');
      var defs = wrap.select('defs');

      wrap.attr('transform', utility.translation(margin.left, margin.top));

      //------------------------------------------------------------
      // Definitions

      if (textureFill) {
        var mask = utility.createTexture(defs_entr, id);
      }

      // set up the gradient constructor function
      model.gradientFill = function(d, i, params) {
        var gradientId = id + '-' + i;
        var c = color(d, i);
        return gradient(d, gradientId, params, c, defs);
      };

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
        // For on click active slices
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
        var d0 = 0;
        var d1 = 0;
        var g, i, j, l;

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

        // Top to bottom
        for (g = sideLabels.nodes(), j = g.length - 1; j >= 0; j -= 1) {
          d1 = d3.select(g[j]).data()[0];
          if (d1) {
            if (!d0) {
              d1.labelBottom = d1.labelTop + d1.labelHeight + labelSpace;
              d0 = d1.labelBottom;
              continue;
            }

            d1.labelTop = Math.max(d0, d1.labelTop);
            d1.labelBottom = d1.labelTop + d1.labelHeight + labelSpace;
            d0 = d1.labelBottom;
          }
        }

        // And then...
        if (d0 && d0 - labelSpace > d3.max(y.range())) {

          d0 = 0;

          // Bottom to top
          for (g = sideLabels.nodes(), i = 0, l = g.length; i < l; i += 1) {
            d1 = d3.select(g[i]).data()[0];
            if (d1) {
              if (!d0) {
                d1.labelBottom = calculatedHeight - 1;
                d1.labelTop = d1.labelBottom - d1.labelHeight;
                d0 = d1.labelTop;
                continue;
              }

              d1.labelBottom = Math.min(d0, d1.labelBottom);
              d1.labelTop = d1.labelBottom - d1.labelHeight - labelSpace;
              d0 = d1.labelTop;
            }
          }

          // ok, FINALLY, so if we are above the top of the funnel,
          // we need to lower them all back down
          if (d0 < 0) {
            sideLabels.each(function(d) {
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
          value: getValue(d),
          count: getCount(d),
          data: d,
          series: d.series,
          seriesIndex: d.series.seriesIndex,
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

        while ((word = words.pop())) {
          line.push(word);
          lbl.text(line.join(' '));
          if (lbl.node().getBoundingClientRect().width > maxWidth && line.length > 1) {
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

        lbl.text(utility.stringEllipsify(text, container, maxWidth))
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
              // scalar = d.labelBottom >= sliceBottom ? 1 : 0,
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
        var series = d.series || d;
        var index = series.seriesIndex || i;
        var fillColor = fill(series);
        var backColor = fillColor === 'inherit'
          ? d3.select('.' + classes(series, index).split(' ').join('.')).style('color')
          : fillColor;
        return utility.getTextContrast(backColor, index);
      }

      function fmtDirection(d) {
        return utility.isRTLChar(d.slice(-1)) ? 'rtl' : 'ltr';
      }

      function fmtLabel(txt, classes, dy, anchor, fill) {
        txt
          .attr('x', 0)
          .attr('y', 0)
          .attr('dy', dy + 'em')
          .attr('class', classes)
          .attr('direction', function() {
            return 'ltr';
            //TODO: should labels change sides in RTL?
            // return fmtDirection(txt.text());
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
            //NOTE: not sure is we want to do this?
            // .style('fill', function(d, i) {
            //   return color(d.series, i);
            // })
            .style('fill-opacity', 1);
        });
      }

    });

    return model;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  model.dispatch = dispatch;

  model.id = function(_) {
    if (!arguments.length) { return id; }
    id = _;
    return model;
  };

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

  model.margin = function(_) {
    if (!arguments.length) { return margin; }
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
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

  model.getKey = function(_) {
    if (!arguments.length) { return getKey; }
    getKey = _;
    return model;
  };

  model.getValue = function(_) {
    if (!arguments.length) { return getValue; }
    getValue = _;
    return model;
  };

  model.getCount = function(_) {
    if (!arguments.length) { return getCount; }
    getCount = _;
    return model;
  };

  model.fmtKey = function(_) {
    if (!arguments.length) { return fmtKey; }
    fmtKey = _;
    return model;
  };

  model.fmtValue = function(_) {
    if (!arguments.length) { return fmtValue; }
    fmtValue = _;
    return model;
  };

  model.fmtCount = function(_) {
    if (!arguments.length) { return fmtCount; }
    fmtCount = _;
    return model;
  };

  model.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
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

  model.locality = function(_) {
    if (!arguments.length) { return locality; }
    locality = utility.buildLocality(_);
    return model;
  };

  model.textureFill = function(_) {
    if (!arguments.length) { return textureFill; }
    textureFill = _;
    return model;
  };

  // FUNNEL

  model.yScale = function(_) {
    if (!arguments.length) { return y; }
    y = _;
    return model;
  };

  model.yDomain = function(_) {
    if (!arguments.length) { return yDomain; }
    yDomain = _;
    return model;
  };

  model.forceY = function(_) {
    if (!arguments.length) { return forceY; }
    forceY = _;
    return model;
  };

  model.wrapLabels = function(_) {
    if (!arguments.length) { return wrapLabels; }
    wrapLabels = _;
    return model;
  };

  model.minLabelWidth = function(_) {
    if (!arguments.length) { return minLabelWidth; }
    minLabelWidth = _;
    return model;
  };

  //============================================================

  return model;
}
