
sucrose.models.funnel = function() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 960,
      height = 500,
      r = 0.3, // ratio of width to height (or slope)
      y = d3.scale.linear(),
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID in case user doesn't select one
      getX = function(d) { return d.x; },
      getY = function(d) { return d.y; },
      getH = function(d) { return d.height; },
      getV = function(d) { return d.value; },
      forceY = [0], // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do chart.forceY([]) to remove
      clipEdge = true,
      yDomain,
      delay = 0,
      wrapLabels = true,
      minLabelWidth = 75,
      durationMs = 0,
      fmtValueLabel = function(d) { return d.label || d.value || d; },
      color = function(d, i) { return sucrose.utils.defaultColor()(d, d.series); },
      fill = color,
      textureFill = false,
      classes = function(d, i) { return 'sc-group sc-series-' + d.series; },
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
          container = d3.select(this),

          labelGap = 5,
          labelSpace = 5,
          labelOffset = 0,
          funnelTotal = 0,
          funnelOffset = 0;

      // Add series index to each data point for reference
      data.map(function(series, i) {
        series.values = series.values.map(function(point) {
          point.index = i;
          if (typeof point.series === 'undefined') {
            point.series = i;
          }
          // if value is undefined, not a legitimate 0 value, use point.y
          if (typeof point.value == 'undefined') {
            point.value = getY(point);
          }
          // count total of funnel
          funnelTotal += parseFloat(point.value);
          return point;
        });
        return series;
      });

      //------------------------------------------------------------
      // Setup scales

      function calcDimensions() {
        calculatedWidth = calcWidth(funnelOffset);
        calculatedHeight = calcHeight();
        calculatedCenter = calcCenter(funnelOffset);
      }

      function calcScales() {
        var funnelArea = areaTrapezoid(calculatedHeight, calculatedWidth),
            funnelBase = calculatedWidth - 2 * r * calculatedHeight,
            funnelShift = 0,
            funnelMinHeight = 24;

        //------------------------------------------------------------
        // Adjust points to compensate for parallax of slice
        // by increasing height relative to area of funnel

        data.map(function(series, i) {
          series.values = series.values.map(function(point) {
            point.height = 0;
            if (funnelTotal > 0) {
              point.height = heightTrapezoid(funnelArea * point.value / funnelTotal, funnelBase);
            }
            if (point.height < funnelMinHeight / 2) {
              funnelShift += point.height - funnelMinHeight / 2;
              point.height = funnelMinHeight / 2;
            } else if (funnelShift < 0 && point.height + funnelShift > funnelMinHeight / 2) {
              point.height += funnelShift;
              funnelShift = 0;
            }
            funnelBase += 2 * r * point.height;
            return point;
          });
          return series;
        });

        data = d3.layout.stack()
                    .offset('zero')
                    .values(function(d) { return d.values; })
                    .y(getH)(data);

        // Remap and flatten the data for use in calculating the scales' domains
        var seriesData = (yDomain) ? [] : // if we know yDomain, no need to calculate
              d3.extent(d3.merge(data.map(function(d) {
                return d.values.map(function(d, i) {
                  return getH(d, i) + d.y0;
                });
              })).concat(forceY));

        y .domain(yDomain || seriesData)
          .range([calculatedHeight, 0]);
      }

      calcDimensions();
      calcScales();

      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = container.selectAll('g.sc-wrap.sc-funnel').data([data]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'sucrose sc-wrap sc-funnel');
      var defsEnter = wrapEnter.append('defs');
      var gEnter = wrapEnter.append('g');
      var g = wrap.select('g');

      //set up the gradient constructor function
      chart.gradient = function(d, i, p) {
        return sucrose.utils.colorLinearGradient(d, id + '-' + i, p, color(d, i), wrap.select('defs'));
      };

      gEnter.append('g').attr('class', 'sc-groups');
      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      //------------------------------------------------------------
      // Clip path

      defsEnter.append('clipPath')
        .attr('id', 'sc-edge-clip-' + id)
          .append('rect');
      wrap.select('#sc-edge-clip-' + id + ' rect')
        .attr('width', availableWidth + 1)
        .attr('height', availableHeight + 1);
      g.attr('clip-path', clipEdge ? 'url(#sc-edge-clip-' + id + ')' : '');


      //------------------------------------------------------------

      if (textureFill) {
        var mask = sucrose.utils.createTexture(defsEnter, id);
      }

      //------------------------------------------------------------
      // Append major data series grouping containers

      var groups = wrap.select('.sc-groups').selectAll('.sc-group')
            .data(function(d) { return d; }, function(d) { return d.key; });

      groups.enter().append('g')
        .style('stroke-opacity', 1e-6)
        .style('fill-opacity', 1e-6);

      groups
        .attr('class', classes)
        .attr('fill', fill)
        .classed('hover', function(d) { return d.hover; })
        .classed('sc-active', function(d) { return d.active === 'active'; })
        .classed('sc-inactive', function(d) { return d.active === 'inactive'; })
        .style({'stroke': '#FFFFFF', 'stroke-width': 2});

      groups.transition().duration(durationMs)
          .style('stroke-opacity', 1)
          .style('fill-opacity', 1);

      groups.exit().transition().duration(durationMs)
        .selectAll('g.sc-slice')
        .delay(function(d, i) { return i * delay / data[0].values.length; })
          .attr('points', function(d) {
            return pointsTrapezoid(d, 0, calculatedWidth);
          })
          .style('stroke-opacity', 1e-6)
          .style('fill-opacity', 1e-6)
          .remove();

      groups.exit().transition().duration(durationMs)
        .selectAll('g.sc-label-value')
        .delay(function(d, i) { return i * delay / data[0].values.length; })
          .attr('y', 0)
          .attr('transform', 'translate(' + calculatedCenter + ',0)')
          .style('stroke-opacity', 1e-6)
          .style('fill-opacity', 1e-6)
          .remove();

      //------------------------------------------------------------
      // Append polygons for funnel

      var funs = groups.selectAll('g.sc-slice')
            .data(function(d) {
              return d.values;
            });
      var funsEnter = funs.enter().append('g').attr('class', 'sc-slice');

      funs.exit().remove();

      funsEnter.append('polygon')
        .attr('class', 'sc-base')
        .attr('points', function(d) {
          return pointsTrapezoid(d, 0, calculatedWidth);
        });

      if (textureFill) {
        // For on click active bars
        funsEnter.append('polygon')
          .attr('class', 'sc-texture')
          .attr('points', function(d) {
            return pointsTrapezoid(d, 0, calculatedWidth);
          })
          .style('mask', 'url(' + mask + ')');
      }

      funs
        .on('mouseover', function(d, i) {
          d3.select(this).classed('hover', true);
          var eo = buildEventObject(d3.event, d, i);
          dispatch.elementMouseover(eo);
        })
        .on('mousemove', function(d, i) {
          dispatch.elementMousemove(d3.event);
        })
        .on('mouseout', function(d, i) {
          d3.select(this).classed('hover', false);
          dispatch.elementMouseout();
        })
        .on('click', function(d, i) {
          d3.event.stopPropagation();
          var eo = buildEventObject(d3.event, d, i);
          dispatch.elementClick(eo);
        })
        .on('dblclick', function(d, i) {
          d3.event.stopPropagation();
          var eo = buildEventObject(d3.event, d, i);
          dispatch.elementDblClick(eo);
        });


      function buildEventObject(e, d, i) {
        return {
            value: getV(d, i),
            point: d,
            id: id,
            series: data[d.index],
            pointIndex: i,
            seriesIndex: d.series,
            e: e
          };
      }

      //------------------------------------------------------------
      // Append containers for labels

      var labels = groups.selectAll('.sc-label-value')
            .data(function(d) { return d.values; });

      labels.enter()
        .append('g')
          .attr('class', 'sc-label-value')
          .attr('transform', 'translate(' + calculatedCenter + ',0)');

      var sideLabels = labels.filter('.sc-label-side');

      //------------------------------------------------------------
      // Update funnel labels

      function renderFunnelLabels() {
        // Remove responsive label elements
        labels.selectAll('polyline').remove();
        labels.selectAll('rect').remove();
        labels.selectAll('text').remove();

        labels
          .append('rect')
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
          .text(fmtValueLabel)
            .call(fmtLabel, 'sc-value', 0.85, 'middle', fmtFill);

        labels.select('.sc-value')
          .append('tspan')
            .text(fmtCount);

        labels
          .call(positionValue);

        // Position labels and identify side labels
        labels
          .call(calcFunnelLabelDimensions);

        labels
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
          .style({'text-anchor': 'start', 'fill': '#555'});

        sideLabels
          .call(calcSideLabelDimensions);

        // Reflow side label vertical position to prevent overlap
        // Top to bottom

        var d0 = 0;

        sideLabels.reverse().each(function(d, i) {
            if (!d0) {
              d.labelBottom = d.labelTop + d.labelHeight + labelSpace;
              d0 = d.labelBottom;
              return;
            }

            d.labelTop = Math.max(d0, d.labelTop);
            d.labelBottom = d.labelTop + d.labelHeight + labelSpace;
            d0 = d.labelBottom;
          });

        sideLabels.reverse();

        // And then...
        // Bottom to top
        if (d0 && d0 - labelSpace > d3.max(y.range())) {

          d0 = 0;

          sideLabels.each(function(d, i) {
              if (!d0) {
                d.labelBottom = d3.max(y.range()) - 1;
                d.labelTop = d.labelBottom - d.labelHeight;
                d0 = d.labelTop;
                return;
              }

              d.labelBottom = Math.min(d0, d.labelBottom);
              d.labelTop = d.labelBottom - d.labelHeight - labelSpace;
              d0 = d.labelTop;
            });

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

      // Calls twice since the first call may create a funnel offset
      // which decreases the funnel width which impacts label position

      calcScales();
      renderLabels();
      calcDimensions();

      calcScales();
      renderLabels();
      calcDimensions();

      //------------------------------------------------------------
      // Reposition responsive elements

      funs.selectAll('polygon')
        .attr('points', function(d) {
          return pointsTrapezoid(d, 1, calculatedWidth);
        });

      if (textureFill) {
        funs.select('.sc-texture')
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
          .style({'fill-opacity': 0, 'stroke': '#999', 'stroke-width': 1, 'stroke-opacity': 0.5});

      sideLabels.reverse();
      sideLabels.selectAll('polyline')
        .call(pointsLeader);
      sideLabels.reverse();

      //------------------------------------------------------------
      // Utility functions

      // TODO: use scales instead of ratio algebra
      // var funnelScale = d3.scale.linear()
      //       .domain([w / 2, minimum])
      //       .range([0, maxy1*thenscalethistopreventminimumfrompassing]);

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

        lbl.text(sucrose.utils.stringEllipsify(text, container, maxWidth))
          .call(fmtLabel, dy);
      }

      function maxSideLabelWidth(d) {
        // overall width of container minus the width of funnel top
        // or minLabelWidth, which ever is greater
        // this is also now as funnelOffset (maybe)
        var twenty = Math.max(availableWidth - availableHeight / 1.1, minLabelWidth),
            // bottom of slice
            sliceBottom = y(d.y0),
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
        var y0 = y(d.y0),
            y1 = y(d.y0 + d.y),
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
            v = y(d.y0 + d.y1 / 2); // mid point of slice
        return b - v * r * 2;
      }

      function calcSideWidth(d, offset) {
        var b = Math.max((availableWidth - calculatedWidth) / 2, offset),
            v = y(d.y0 + d.y1); // top of slice
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
          d.labelTop = y(d.y0 + d.y / 2) - d.labelHeight / 2;
          d.labelBottom = d.labelTop + d.labelHeight + labelSpace;
          d.y1 = d.y - d.labelHeight;
          d.tooWide = d.labelWidth > calcFunnelWidthAtSliceMidpoint(d);
          d.tooTall = d.labelHeight > d.height - 4;
        });
      }

      function calcSideLabelDimensions(lbls) {
        lbls.each(function(d) {
          var bbox = calcLabelBBox(this);
          d.labelHeight = bbox.height;
          d.labelWidth = bbox.width;
          d.labelTop = y(d.y0 + d.y);
          d.labelBottom = d.labelTop + d.labelHeight + labelSpace;
        });
      }

      function pointsLeader(polylines, i) {
        var c = polylines.length;
        polylines.each(function(d, i, j) {
          d.y1 = 0;
          var // previous label
              p = j ? d3.select(polylines[j - 1][i]).data()[0] : null,
              // next label
              n = j < c - 1 ? d3.select(polylines[j + 1][i]).data()[0] : null,
              // label height
              h = Math.round(d.labelHeight) + 0.5,
              // slice bottom
              t = Math.round(y(d.y0) - d.labelTop) - 0.5,
              // previous width
              wp = p ? p.labelWidth - (d.labelBottom - p.labelBottom) * r : 0,
              // current width
              wc = d.labelWidth,
              // next width
              wn = n && h < t ? n.labelWidth : 0,
              // final width
              w = Math.round(Math.max(wp, wc, wn)) + labelGap,
              // funnel edge
              f = Math.round(calcSideWidth(d, funnelOffset)) - labelOffset - labelGap,
              // polyline points
              p = 0 + ',' + h + ' ' +
                 w + ',' + h + ' ' +
                 (w + Math.abs(h - t) * r) + ',' + t + ' ' +
                 f + ',' + t;
          d.labelWidth = w;
          d3.select(this).attr('points', p);
        });
      }

      function calcOffsets(lbls) {
        var sideWidth = (availableWidth - calculatedWidth) / 2, // natural width of side
            offset = 0;

        lbls.each(function(d) {

          var // bottom of slice
              sliceBottom = y(d.y0),
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
        return sucrose.utils.getTextContrast(backColor, i);
      }

      function fmtKey(d) {
        return data[d.index].key;
      }

      function fmtCount(d) {
        var i = data[d.index].count;
        return i ? ' (' + i + ')' : '';
      }

      function fmtDirection(d) {
        var m = sucrose.utils.isRTLChar(d.slice(-1)),
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
          .style({'pointer-events': 'none', 'text-anchor': anchor, 'fill': fill});
      }

      function positionValue(lbls) {
        lbls.each(function(d) {
          var lbl = d3.select(this),
              cnt = lbl.selectAll('.sc-label')[0].length + 1,
              dy = (.85 + cnt - 1) + 'em';

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

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = _;
    return chart;
  };
  chart.fill = function(_) {
    if (!arguments.length) return fill;
    fill = _;
    return chart;
  };
  chart.classes = function(_) {
    if (!arguments.length) return classes;
    classes = _;
    return chart;
  };
  chart.gradient = function(_) {
    if (!arguments.length) return gradient;
    gradient = _;
    return chart;
  };

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = _;
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = _;
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin = _;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
  };

  chart.xScale = function(_) {
    if (!arguments.length) return x;
    x = _;
    return chart;
  };

  chart.yScale = function(_) {
    if (!arguments.length) return y;
    y = _;
    return chart;
  };

  chart.yDomain = function(_) {
    if (!arguments.length) return yDomain;
    yDomain = _;
    return chart;
  };

  chart.forceY = function(_) {
    if (!arguments.length) return forceY;
    forceY = _;
    return chart;
  };

  chart.id = function(_) {
    if (!arguments.length) return id;
    id = _;
    return chart;
  };

  chart.delay = function(_) {
    if (!arguments.length) return delay;
    delay = _;
    return chart;
  };

  chart.clipEdge = function(_) {
    if (!arguments.length) return clipEdge;
    clipEdge = _;
    return chart;
  };

  chart.fmtValueLabel = function(_) {
    if (!arguments.length) return fmtValueLabel;
    fmtValueLabel = d3.functor(_);
    return chart;
  };

  chart.wrapLabels = function(_) {
    if (!arguments.length) return wrapLabels;
    wrapLabels = _;
    return chart;
  };

  chart.minLabelWidth = function(_) {
    if (!arguments.length) return minLabelWidth;
    minLabelWidth = _;
    return chart;
  };

  chart.textureFill = function(_) {
    if (!arguments.length) return textureFill;
    textureFill = _;
    return chart;
  };

  //============================================================

  return chart;
}
