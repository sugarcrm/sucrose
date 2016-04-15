sucrose.models.axis = function() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var scale = d3.scale.linear(),
      axisLabelText = null,
      showMaxMin = true,
      highlightZero = true,
      direction = 'ltr',
      wrapTicks = false,
      staggerTicks = false,
      rotateTicks = 30, //one of (rotateTicks, staggerTicks, wrapTicks)
      reduceXTicks = false, // if false a tick will show for every data point
      rotateYLabel = true,
      hasRangeBand = false,
      textAnchor = null,
      ticks = null,
      valueFormat = function(d) { return d; },
      axisLabelDistance = 8; //The larger this number is, the closer the axis label is to the axis.

  // Public Read-only Variables
  //------------------------------------------------------------
  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      thickness = 0;

  var axis = d3.svg.axisStatic()
        .scale(scale)
        .orient('bottom')
        .tickFormat(function(d) { return valueFormat(d); });

  // Private Variables
  //------------------------------------------------------------
  var scale0;

  //============================================================

  function chart(selection) {
    selection.each(function(data) {

      var container = d3.select(this);
      var scaleCalc = axis.scale().copy();
      var marginCalc = {top: 0, right: 0, bottom: 0, left: 0};
      var extent = getRangeExtent();
      var scaleWidth = Math.abs(extent[1] - extent[0]);

      // Private
      scale0 = scale0 || axis.scale();

      var vertical = axis.orient() === 'left' || axis.orient() === 'right' ? true : false,
          reflect = axis.orient() === 'left' || axis.orient() === 'top' ? -1 : 1,
          maxLabelWidth = 0,
          maxLabelHeight = 0,
          tickGap = 6,
          tickSpacing = 0,
          labelThickness = 0;

      var tickDimensions = [],
          tickDimensionsHash = {},
          tickValueArray = [],
          minTickDimensions = {},
          maxTickDimensions = {};

      //------------------------------------------------------------
      // reset public readonly variables
      thickness = 0;

      if (ticks !== null) {
        axis.ticks(ticks);
      } else if (vertical) {
        axis.ticks(Math.ceil(scaleWidth / 48));
      } else {
        axis.ticks(Math.ceil(scaleWidth / 100));
      }

      // test to see if rotateTicks was passed as a boolean
      if (rotateTicks && !isFinite(String(rotateTicks))) {
        rotateTicks = 30;
      }

      // ordinal scales do not have max-min values
      if (hasRangeBand) {
        showMaxMin = false;
      }

      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = container.selectAll('g.sc-wrap.sc-axis').data([data]),
          gEnter = wrap.enter()
            .append('g').attr('class', 'sucrose sc-wrap sc-axis')
            .append('g').attr('class', 'sc-axis-inner'),
          g = wrap.select('.sc-axis-inner');

      g.call(axis);

      // Axis ticks
      var axisTicks = g.selectAll('g.tick');

      // Min Max ticks
      var dataMaxMin = showMaxMin ? d3.extent(scale.domain()) : [];
      var axisMaxMin = g.selectAll('g.sc-axisMaxMin').data(dataMaxMin);
      var enterMaxMin = axisMaxMin.enter().append('g').attr('class', 'sc-axisMaxMin');
      enterMaxMin.append('text')
        .style('opacity', 0);
      enterMaxMin.append('line')
        .style('opacity', 0);
      axisMaxMin.exit().remove();

      if (showMaxMin) {
        axisMaxMin.select('text')
          .text(function(d, i) {
            return axis.tickFormat()(d, i, false);
          });
      }

      // Axis and Maxmin tick text
      var tickText = g.selectAll('g.tick, g.sc-axisMaxMin').select('text')
            .filter(function(d) { return this.getBoundingClientRect().width; });
      tickText.each(function(d, i) {
        tickValueArray.push(d3.select(this).text());
      });

      // Axis label
      var axisLabelData = !!axisLabelText ? [axisLabelText] : [];
      var axisLabel = wrap.selectAll('text.sc-axislabel').data(axisLabelData);
      axisLabel.enter().append('text').attr('class', 'sc-axislabel')
        .text(function(d) { return d; });
      axisLabel.exit().remove();

      //------------------------------------------------------------
      // Tick label handling

      var wrapSucceeded = false,
          staggerSucceeded = false,
          rotateSucceeded = false;

      if (vertical) {

        resetTicks();

        tickText
          .style('text-anchor', rtlTextAnchor(textAnchor || (isMirrored() ? 'start' : 'end')));

      } else {

        //Not needed but keep for now
        // if (reduceXTicks) {
        //   axisTicks.each(function(d, i) {
        //       d3.select(this).selectAll('text,line')
        //         .style('opacity', i % Math.ceil(data[0].values.length / (scaleWidth / 100)) !== 0 ? 0 : 1);
        //     });
        // }
        resetTicks();
        recalcMargin();

        if (labelCollision(1)) {

          // if wrap is enabled, try it first (for ordinal scales only)
          if (wrapTicks) {
            resetTicks();
            handleWrap();
            recalcMargin();
            handleWrap();
            // check to see if we still have collisions
            if (!labelCollision(1)) {
              wrapSucceeded = true;
            }
          }

          // wrapping failed so fall back to stagger if enabled
          if (!wrapSucceeded && staggerTicks) {
            resetTicks();
            handleStagger();
            recalcMargin();
            handleStagger();
            // check to see if we still have collisions
            if (!labelCollision(2)) {
              staggerSucceeded = true;
            }
          }

          // if we still have a collision
          // add a test in the following if block to support opt-out of rotate method
          if (!wrapSucceeded && !staggerSucceeded) {
            if (!rotateTicks) {
              rotateTicks = 30;
            }
            resetTicks();
            handleRotation(rotateTicks);
            recalcMargin(rotateTicks);
            handleRotation(rotateTicks);
            rotateSucceeded = true;
          }
        }
      }

      //------------------------------------------------------------
      // Min Max values

      if (showMaxMin) {

        // only show max line
        axisMaxMin.select('line')
          .attr('x1', 0)
          .attr('y1', 0)
          .attr('y2', vertical ? 0 : (axis.tickSize() - marginCalc.bottom) * reflect)
          .attr('x2', vertical ? axis.tickSize() * reflect : 0)
          .style('opacity', function(d, i) {
            return isMirrored() ? (i ? 0 : 1) : (i ? 1 : 0);
          });

        //check if max and min overlap other values, if so, hide the values that overlap
        axisTicks.each(function(d, i) {
            var tick = d3.select(this),
                dim = tickDimensionsHash['key-' + d.toString()],
                collision = false;

            if (vertical) {
              collision = dim.bottom > minTickDimensions.top || dim.top < maxTickDimensions.bottom;
              tick.select('line')
                .style('opacity', 1 - collision);
            } else if (rotateSucceeded) {
              collision = false;
            } else if (staggerSucceeded) {
              collision = (dim.left < minTickDimensions.right + tickGap || dim.right > maxTickDimensions.left + tickGap) &&
                          (dim.bottom < minTickDimensions.top || dim.top > maxTickDimensions.bottom);
            } else {
              collision = dim.left < minTickDimensions.right + tickGap || dim.right > maxTickDimensions.left + tickGap;
            }

            tick.select('text')
              .style('opacity', 1 - collision);
            // accounts for minor floating point errors... though could be problematic if the scale is EXTREMELY SMALL
            // if (d < 1e-10 && d > -1e-10) { // Don't remove the ZERO line!!
            //   tick.select('line')
            //     .style('opacity', 0);
            // }
          });

      } else {

        //highlight zero line ... Maybe should not be an option and should just be in CSS?
        axisTicks
          .filter(function(d) {
            // this is because sometimes the 0 tick is a very small fraction, TODO: think of cleaner technique
            // return !parseFloat(Math.round(d * 100000) / 1000000);
            return scaleCalc(d) === extent[0 + isMirrored()];
          })
          .classed('zero', highlightZero);

        // hide zero line if same as domain line
        axisTicks.select('line')
          .style('opacity', function(d, i) {
            return scaleCalc(d) === extent[0 + isMirrored()] ? 0 : 1;
          });

      }

      //------------------------------------------------------------
      // Axis label

      if (!!axisLabelText) {
        var axisLabelX = vertical ?
              rotateYLabel ? scaleWidth / -2 : (thickness + axisLabelDistance) * reflect :
              scaleWidth / 2;
        var axisLabelY = vertical ?
              rotateYLabel ? (thickness + axisLabelDistance) * reflect : scaleWidth / 2 :
              (thickness + axisLabelDistance) * reflect;

        axisLabel
          .attr('x', axisLabelX)
          .attr('y', axisLabelY)
          .attr('dy', (0.355 + 0.355 * reflect) + 'em')
          .attr('transform', vertical && rotateYLabel ? 'rotate(-90)' : '')
          .style('text-anchor', vertical && !rotateYLabel ? rtlTextAnchor('end') : 'middle');

        axisLabel.each(function(d, i) {
          labelThickness += vertical ?
            parseInt(this.getBoundingClientRect().width / 1.3, 10) :
            parseInt(this.getBoundingClientRect().height / 1.3, 10);
        });

        thickness += labelThickness + axisLabelDistance;
      }

      //------------------------------------------------------------
      // Set final margins

      //store old scales for use in transitions on update
      scale0 = scale.copy();

      margin = {top: marginCalc.top, right: marginCalc.right, bottom: marginCalc.bottom, left: marginCalc.left};
      margin[axis.orient()] = thickness;

      //------------------------------------------------------------
      // Private functions

      function getStepInterval() {
        return scaleCalc.range().length > 1 ? Math.abs(scaleCalc.range()[1] - scaleCalc.range()[0]) : 0;
      }

      function getPaddingRatio() {
        return scaleCalc.range().length > 1 ? Math.max(0.25, 1 - d3.round(scaleCalc.rangeBand() / getStepInterval(), 2)) : 0;
      }

      function getRangeExtent() {
        return typeof scaleCalc.rangeExtent === 'function' ? scaleCalc.rangeExtent() : scaleCalc.range();
      }

      function getBarWidth() {
        return hasRangeBand ? scaleCalc.rangeBand() : 0;
      }

      function getOuterPadding() {
        return hasRangeBand ? scaleCalc.range()[0] : 0;
      }

      function getOuterPaddingRatio() {
        return getOuterPadding() / getTickSpacing();
      }

      function getTickSpacing() {
        var tickSpacing = 0,
            tickArray;
        if (hasRangeBand) {
          tickSpacing = scaleCalc.range().length > 1 ? Math.abs(scaleCalc.range()[1] - scaleCalc.range()[0]) : d3.max(getRangeExtent()) / 2;
        } else {
          tickArray = scaleCalc.ticks(axisTicks.size());
          tickSpacing = scaleCalc(tickArray[tickArray.length - 1]) - scaleCalc(tickArray[tickArray.length - 2]);
        }
        return tickSpacing;
      }

      function rtlTextAnchor(anchor) {
        if (direction === 'rtl') {
          if (anchor === 'start') {
            return 'end';
          } else if (anchor === 'end') {
            return 'start';
          }
        }
        return anchor;
      }

      function isMirrored() {
        return axis.orient() !== 'left' && axis.orient() !== 'bottom';
      }

      function setThickness(s) {
        s = s || 1;
        thickness = axis.tickPadding() + (vertical ? maxLabelWidth : maxLabelHeight) * s;
      }

      // Calculate the longest tick width and height
      function calcMaxLabelSizes() {
        calcTickLabelSizes();

        maxLabelWidth = d3.max(tickDimensions, function(d) { return d.width; });
        maxLabelHeight = d3.max(tickDimensions, function(d) { return d.height; });
      }

      function calcTickLabelSizes() {
        tickDimensions = [];
        tickDimensionsHash = {};

        // reposition max/min ticks before calculating bbox
        if (showMaxMin) {
          axisMaxMin
            .style('opacity', 1)
            .attr('transform', function(d, i) {
              var trans = vertical ? '0,' + scaleCalc(d) : scaleCalc(d) + ',0';
              return 'translate(' + trans + ')';
            });
        }

        tickText.each(function(d, i) { //TODO: make everything relative to domain path
            var bbox = this.getBoundingClientRect();
            if (bbox.width > 0) {
              tickDimensions.push({
                key: d,
                width: parseInt(bbox.width, 10),
                height: parseInt(bbox.height / 1.2, 10),
                left: bbox.left,
                right: bbox.right,
                top: bbox.top,
                bottom: bbox.bottom
              });
            }
          });

        tickDimensions.sort(function(a, b) {
            return a.key - b.key;
          })
          .forEach(function(d, i) {
            d.index = i;
            tickDimensionsHash['key-' + d.key.toString()] = d;
          });

        minTickDimensions = tickDimensions[0];
        maxTickDimensions = tickDimensions[tickDimensions.length - 1];
      }

      function labelCollision(s) {
        // {0}   [2]   [4]   {6}
        //    [1]   [3]   [5]
        calcTickLabelSizes();
        var skip = showMaxMin ? 2 : s || 1;
        // this resets the maxLabelWidth for label collision detection
        for (var i = (showMaxMin ? 1 : 0), l = tickDimensions.length - skip; i < l; i += 1) {
          if (tickDimensions[i].right + tickGap > tickDimensions[i + s].left) {
            return true;
          }
        }
        return false;
      }

      function recalcMargin(a) {
        var normRotation = a ? (a + 180) % 180 : 0, // Normalize rotation: (-30 + 360) % 360 = 330; (30 + 360) % 360 = 30
            isRotatedLeft = normRotation > 90,
            dMin = null,
            dMax = null;

        tickDimensions.forEach(function(d, i) {
          var isMin = dMin === null || d.left <= dMin,
              isMax = dMax === null || d.right >= dMax,
              textWidth = 0,
              tickPosition = 0,
              availableSpace = 0,
              textWidth = 0;

          if (!isMin && !isMax) {
            return;
          }

          textWidth = normRotation ? d.width - 6 : d.width / 2; // 6 is the cos(textHeight) @ 30
          tickPosition = scaleCalc(d.key) + (hasRangeBand * getBarWidth() / 2);

          if (isMin && (!normRotation || isRotatedLeft)) {
            dMin = d.left;
            availableSpace = Math.abs(extent[0] - tickPosition);
            marginCalc.left = Math.max(textWidth - availableSpace, 0);
          }
          if (isMax && (!normRotation || !isRotatedLeft)) {
            dMax = d.right;
            availableSpace = Math.abs(extent[1] - tickPosition);
            marginCalc.right = Math.max(textWidth - availableSpace, 0);
          }
        });

        // modify scale range
        if (!hasRangeBand) { //TODO: can we get rid of this for bar chart?
          var change = margin.right - Math.max(margin.right, marginCalc.right);
              change += margin.left - Math.max(margin.left, marginCalc.left);

          var newExtent = [extent[0], extent[1] + change]; // reduce operable width of axis by margins

          scaleCalc.range(newExtent);
          extent = getRangeExtent();
          scaleWidth = Math.abs(extent[1] - extent[0]);

          axis
            .scale(scaleCalc);
          g.call(axis);
        }
      }

      function resetTicks() {
        marginCalc = {top: 0, right: 0, bottom: 0, left: 0};

        scaleCalc = scale.copy();
        extent = getRangeExtent();
        scaleWidth = Math.abs(extent[1] - extent[0]);

        axis
          .scale(scale);

        g.call(axis);

        tickText.selectAll('tspan').remove();
        tickText
          .attr('dy', vertical ? '.32em' : 0.355 + 0.355 * reflect + 'em')
          .attr('x', vertical ? axis.tickPadding() * reflect : 0)
          .attr('y', vertical ? 0 : axis.tickPadding() * reflect)
          .attr('transform', 'translate(0,0)')
          .text(function(d, i) { return tickValueArray[i]; })
          .style('text-anchor', 'middle')
          .style('opacity', 1);

        calcMaxLabelSizes();
        setThickness();
      }

      function handleWrap() {
        tickSpacing = getTickSpacing();

        tickText.each(function(d, i) {
          var textContent = axis.tickFormat()(d, i, true),
              textNode = d3.select(this),
              isDate = sucrose.utils.isValidDate(textContent),
              textArray = (textContent && textContent !== '' ? isDate ? textContent : textContent.replace('/', '/ ') : []).split(' '),
              i = 0,
              l = textArray.length,
              dy = reflect === 1 ? 0.71 : -1; // TODO: wrong. fails on reflect with 3 lines of wrap

          this.textContent = '';

          var textString,
              textSpan = textNode.append('tspan')
                .text(textArray[i] + ' ')
                .attr('dy', dy + 'em')
                .attr('x', 0);

          i += 1;
          dy = 1; // TODO: wrong. fails on reflect with 3 lines of wrap

          while (i < l) {
            textSpan = textNode.append('tspan')
              .text(textArray[i] + ' ')
              .attr('dy', dy + 'em')
              .attr('x', 0);

            i += 1;

            while (i < l) {
              textString = textSpan.text();
              textSpan.text(textString + ' ' + textArray[i]);
              //TODO: this is different than collision test
              if (this.getBoundingClientRect().width <= tickSpacing) {
                i += 1;
              } else {
                textSpan.text(textString);
                break;
              }
            }
          }
        });

        calcMaxLabelSizes();
        setThickness();
      }

      function handleStagger() {
        tickText
          .attr('transform', function(d, i) {
            var yOffset = tickDimensionsHash['key-' + d.toString()].index % 2 * (maxLabelHeight + 2);
            return 'translate(0,' + yOffset + ')';
          });

        calcMaxLabelSizes();
        setThickness(2);
      }

      function handleRotation(a) {
        // 0..90 = IV, 90..180 = III, 180..270 = IV, 270..360 = III
        // 0..-90 = III, -90..-180 = IV, -180..-270 = III, -270..-360 = IV
        // Normalize rotation: (-30 + 180) % 180 = 150; (30 + 180) % 180 = 30
        var normRotation = (a + 180) % 180,
            isLeft = normRotation > 90,
            angle = (normRotation - (isLeft ? 180 : 0)) * reflect,
            tickAnchor = rtlTextAnchor(isLeft ? 'end' : 'start'),
            //Convert to radians before calculating sin.
            cos = Math.abs(Math.cos(a * Math.PI / 180));

        //Rotate all tickText
        tickText
          .attr('transform', function(d, i, j) {
            return 'translate(0,' + (axis.tickPadding() * reflect) + ') rotate(' + angle + ')';
          })
          .attr('y', '0')
          .style('text-anchor', tickAnchor);

        calcMaxLabelSizes();
        setThickness();
        thickness += cos * 11;
      }

      //------------------------------------------------------------
      // Public functions

      chart.resizeTickLines = function(dim) {
        g.selectAll('g.tick, g.sc-axisMaxMin').select('line')
          .attr(vertical ? 'x2' : 'y2', dim * reflect);
      };

      chart.labelThickness = function() {
        return labelThickness;
      };

    });

    return chart;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.axis = axis;

  d3.rebind(chart, axis, 'orient', 'tickValues', 'tickSubdivide', 'tickSize', 'tickPadding', 'tickFormat');
  d3.rebind(chart, scale, 'domain', 'range', 'rangeBand', 'rangeBands'); //these are also accessible by chart.scale(), but added common ones directly for ease of use

  // read only
  chart.width = function(_) {
    if (!arguments.length) {
      return thickness;
    }
    return chart;
  };

  // read only
  chart.height = function(_) {
    if (!arguments.length) {
      return thickness;
    }
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) {
      return margin;
    }
    margin = _;
    return chart;
  };

  chart.ticks = function(_) {
    if (!arguments.length) {
      return ticks;
    }
    ticks = _;
    return chart;
  };

  chart.valueFormat = function(_) {
    if (!arguments.length) {
      return valueFormat;
    }
    valueFormat = _;
    return chart;
  };

  chart.axisLabel = function(_) {
    if (!arguments.length) {
      return axisLabelText;
    }
    axisLabelText = _;
    return chart;
  };

  chart.showMaxMin = function(_) {
    if (!arguments.length) {
      return showMaxMin;
    }
    showMaxMin = _;
    return chart;
  };

  chart.highlightZero = function(_) {
    if (!arguments.length) {
      return highlightZero;
    }
    highlightZero = _;
    return chart;
  };

  chart.scale = function(_) {
    if (!arguments.length) {
      return scale;
    }
    scale = _;
    axis.scale(scale);
    hasRangeBand = typeof scale.rangeBands === 'function';
    d3.rebind(chart, scale, 'domain', 'range', 'rangeBand', 'rangeBands');
    return chart;
  };

  chart.wrapTicks = function(_) {
    if (!arguments.length) {
      return wrapTicks;
    }
    wrapTicks = _;
    return chart;
  };

  chart.rotateTicks = function(_) {
    if (!arguments.length) {
      return rotateTicks;
    }
    rotateTicks = _;
    return chart;
  };

  chart.staggerTicks = function(_) {
    if (!arguments.length) {
      return staggerTicks;
    }
    staggerTicks = _;
    return chart;
  };

  chart.reduceXTicks = function(_) {
    if (!arguments.length) {
      return reduceXTicks;
    }
    reduceXTicks = _;
    return chart;
  };

  chart.rotateYLabel = function(_) {
    if (!arguments.length) {
      return rotateYLabel;
    }
    rotateYLabel = _;
    return chart;
  };

  chart.axisLabelDistance = function(_) {
    if (!arguments.length) {
      return axisLabelDistance;
    }
    axisLabelDistance = _;
    return chart;
  };

  chart.maxLabelWidth = function(_) {
    if (!arguments.length) {
      return maxLabelWidth;
    }
    maxLabelWidth = _;
    return chart;
  };

  chart.textAnchor = function(_) {
    if (!arguments.length) {
      return textAnchor;
    }
    textAnchor = _;
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) {
      return direction;
    }
    direction = _;
    return chart;
  };

  //============================================================


  return chart;
};
