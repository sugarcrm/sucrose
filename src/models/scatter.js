sucrose.models.scatter = function() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 960,
      height = 500,
      color = function(d, i) { return sucrose.utils.defaultColor()(d, d.series); }, // chooses color
      fill = color,
      classes = function(d, i) { return 'sc-group sc-series-' + d.series; },
      id = Math.floor(Math.random() * 100000), //Create semi-unique ID incase user doesn't select one
      x = d3.scaleLinear(),
      y = d3.scaleLinear(),
      z = d3.scaleLinear(), //linear because d3.svg.shape.size is treated as area
      getX = function(d) { return d.x; }, // accessor to get the x value
      getY = function(d) { return d.y; }, // accessor to get the y value
      getSize = function(d) { return d.size || 1; }, // accessor to get the point size
      getShape = function(d) { return d.shape || 'circle'; }, // accessor to get point shape
      locality = sucrose.utils.buildLocality(),
      onlyCircles = true, // Set to false to use shapes
      forceX = [], // List of numbers to Force into the X scale (ie. 0, or a max / min, etc.)
      forceY = [], // List of numbers to Force into the Y scale
      forceSize = [], // List of numbers to Force into the Size scale
      interactive = true, // If true, plots a voronoi overlay for advanced point intersection
      pointActive = function(d) { return !d.notActive; }, // any points that return false will be filtered out
      padData = false, // If true, adds half a data points width to front and back, for lining up a line chart with a bar chart
      padDataOuter = 0.1, //outerPadding to imitate ordinal scale outer padding
      clipEdge = false, // if true, masks points within x and y scale
      useVoronoi = true,
      clipVoronoi = true, // if true, masks each point with a circle... can turn off to slightly increase performance
      circleRadius = function(d, i) {
        return Math.sqrt(z(getSize(d, i)) / Math.PI);
      }, // function to get the radius for voronoi point clips
      symbolSize = function(d, i) {
        return z(getSize(d, i));
      },
      xDomain = null, // Override x domain (skips the calculation from data)
      yDomain = null, // Override y domain
      sizeDomain = null, // Override point size domain
      sizeRange = [16, 256],
      singlePoint = false,
      dispatch = d3.dispatch('elementClick', 'elementMouseover', 'elementMouseout', 'elementMousemove'),
      nice = false;

  //============================================================


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var x0, y0, z0, // used to store previous scales
      timeoutID,
      needsUpdate = false; // Flag for when the points are visually updating, but the interactive layer is behind, to disable tooltips

  //============================================================


  function chart(selection) {
    selection.each(function(data) {
      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          container = d3.select(this);

      //add series index to each data point for reference
      data = data.map(function(series, i) {
        series.values = series.values.map(function(point) {
          point.series = i;
          return point;
        });
        return series;
      });

      //------------------------------------------------------------
      // Setup Scales

      // remap and flatten the data for use in calculating the scales' domains
      var seriesData = (xDomain && yDomain && sizeDomain) ? [] : // if we know xDomain and yDomain and sizeDomain, no need to calculate.... if Size is constant remember to set sizeDomain to speed up performance
            d3.merge(
              data.map(function(d) {
                return d.values.map(function(d, i) {
                  return { x: getX(d, i), y: getY(d, i), size: getSize(d, i) };
                });
              })
            );

      chart.resetDimensions = function(w, h) {
        width = w;
        height = h;
        availableWidth = w - margin.left - margin.right;
        availableHeight = h - margin.top - margin.bottom;
        resetScale();
      };

      function resetScale() {
        x.domain(xDomain || d3.extent(seriesData.map(function(d) { return d.x; }).concat(forceX)));
        y.domain(yDomain || d3.extent(seriesData.map(function(d) { return d.y; }).concat(forceY)));

        if (padData && data[0]) {
          if (padDataOuter === -1) {
            // shift range so that largest bubble doesn't cover scales
            var largestPossible = Math.sqrt(sizeRange[1] / Math.PI);
            x.range([
              0 + largestPossible,
              availableWidth - largestPossible
            ]);
            y.range([
              availableHeight - largestPossible,
              0 + largestPossible
            ]);
          } else if (padDataOuter < 1) {
            // adjust range to line up with value bars
            x.range([
              (availableWidth * padDataOuter + availableWidth) / (2 * data[0].values.length),
              availableWidth - availableWidth * (1 + padDataOuter) / (2 * data[0].values.length)
            ]);
            y.range([availableHeight, 0]);
          } else {
            x.range([
              padDataOuter,
              availableWidth - padDataOuter
            ]);
            y.range([
              availableHeight - padDataOuter,
              padDataOuter
            ]);
          }
          // From original sucrose
          //x.range([
          //   availableWidth * .5 / data[0].values.length,
          //   availableWidth * (data[0].values.length - .5) / data[0].values.length
          // ]);
        } else {
          x.range([0, availableWidth]);
          y.range([availableHeight, 0]);
        }

        if (nice) {
          y.nice();
        }

        z.domain(sizeDomain || d3.extent(seriesData.map(function(d) { return d.size; }).concat(forceSize)))
         .range(sizeRange);

        // If scale's domain don't have a range, slightly adjust to make one... so a chart can show a single data point
        if (x.domain()[0] === x.domain()[1] || y.domain()[0] === y.domain()[1]) singlePoint = true;
        if (x.domain()[0] === x.domain()[1])
          x.domain()[0] ?
              x.domain([x.domain()[0] - x.domain()[0] * 0.1, x.domain()[1] + x.domain()[1] * 0.1]) :
              x.domain([-1, 1]);

        if (y.domain()[0] === y.domain()[1])
          y.domain()[0] ?
              y.domain([y.domain()[0] - y.domain()[0] * 0.1, y.domain()[1] + y.domain()[1] * 0.1]) :
              y.domain([-1, 1]);

        if (z.domain().length < 2) {
          z.domain([0, z.domain()]);
        }

        x0 = x0 || x;
        y0 = y0 || y;
        z0 = z0 || z;
      }

      resetScale();

      //------------------------------------------------------------

      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap_bind = container.selectAll('g.sc-wrap.sc-scatter').data([data]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sucrose sc-wrap sc-scatter sc-chart-' + id);
      var wrap = container.select('.sucrose.sc-wrap').merge(wrap_entr);
      var defs_entr = wrap_entr.append('defs');
      var g_entr =wrap_entr.append('g').attr('class', 'sc-chart-wrap');
      var g = container.select('g.sc-chart-wrap').merge(g_entr);

      //set up the gradient constructor function
      chart.gradient = function(d, i) {
        return sucrose.utils.colorRadialGradient(d, id + '-' + i, {x: 0.5, y: 0.5, r: 0.5, s: 0, u: 'objectBoundingBox'}, color(d, i), wrap.select('defs'));
      };

      g_entr.append('g').attr('class', 'sc-groups');
      g_entr.append('g').attr('class', 'sc-point-paths');

      wrap
        .classed('sc-single-point', singlePoint)
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      //------------------------------------------------------------


      defs_entr.append('clipPath')
          .attr('id', 'sc-edge-clip-' + id)
        .append('rect');

      wrap.select('#sc-edge-clip-' + id + ' rect')
          .attr('width', availableWidth)
          .attr('height', availableHeight);

      g.attr('clip-path', clipEdge ? 'url(#sc-edge-clip-' + id + ')' : '');


      function updateInteractiveLayer() {

        if (!interactive) return false;

        var eventElements;

        function buildEventObject(e, d, i, j) {
          var seriesData = data[j];
          return {
              series: seriesData,
              point: seriesData.values[i],
              pointIndex: i,
              seriesIndex: seriesData.series,
              id: id,
              e: e
            };
        }

        //inject series and point index for reference into voronoi
        if (useVoronoi === true) {

          var vertices = d3.merge(data.map(function(group, groupIndex) {
              return group.values
                .map(function(point, pointIndex) {
                  // *Adding noise to make duplicates very unlikely
                  // *Injecting series and point index for reference
                  /* *Adding a 'jitter' to the points, because there's an issue in d3.geom.voronoi.
                   */
                  var pX = getX(point, pointIndex);
                  var pY = getY(point, pointIndex);

                  return [x(pX) + Math.random() * 1e-4,
                          y(pY) + Math.random() * 1e-4,
                      groupIndex,
                      pointIndex, point]; //temp hack to add noise until I think of a better way so there are no duplicates
                })
                .filter(function(pointArray, pointIndex) {
                  return pointActive(pointArray[4], pointIndex); // Issue #237.. move filter to after map, so pointIndex is correct!
                });
            })
          );

          if (clipVoronoi) {
            var pointClipsEnter = wrap.select('defs').selectAll('.sc-point-clips')
                .data([id])
              .enter();

            pointClipsEnter.append('clipPath')
                  .attr('class', 'sc-point-clips')
                  .attr('id', 'sc-points-clip-' + id);

            var pointClips = wrap.select('#sc-points-clip-' + id).selectAll('circle')
                .data(vertices);
            pointClips.enter().append('circle');
            pointClips.exit().remove();
            pointClips
                .attr('cx', function(d) { return d[0] })
                .attr('cy', function(d) { return d[1] })
                .attr('r', function(d, i) {
                  return circleRadius(d[4], i);
                });

            wrap.select('.sc-point-paths')
                .attr('clip-path', 'url(#sc-points-clip-' + id + ')');
          }

          if (vertices.length <= 3) {
            // Issue #283 - Adding 2 dummy points to the voronoi b/c voronoi requires min 3 points to work
            vertices.push([x.range()[0] - 20, y.range()[0] - 20, null, null]);
            vertices.push([x.range()[1] + 20, y.range()[1] + 20, null, null]);
            vertices.push([x.range()[0] - 20, y.range()[0] + 20, null, null]);
            vertices.push([x.range()[1] + 20, y.range()[1] - 20, null, null]);
          }

          var bounds = d3.geom.polygon([
              [-10, -10],
              [-10, height + 10],
              [width + 10, height + 10],
              [width + 10, -10]
          ]);

          var voronoi = d3.geom.voronoi(vertices).map(function(d, i) {
              return {
                'data': bounds.clip(d),
                'series': vertices[i][2],
                'point': vertices[i][3]
              };
            }).filter(function(d) { return d.series !== null; });

          var pointPaths = wrap.select('.sc-point-paths').selectAll('path')
              .data(voronoi);
          pointPaths.enter().append('path')
              .attr('class', function(d, i) { return 'sc-path-' + i; });
          pointPaths.exit().remove();
          pointPaths
              .attr('d', function(d) { return 'M' + d.data.join('L') + 'Z'; });


          pointPaths
              .on('mouseover', function(d) {
                if (needsUpdate) return 0;
                var eo = buildEventObject(d3.event, d, d.point, d.series);
                dispatch.call('elementMouseover', this, eo);
              })
              .on('mousemove', function(d, i) {
                var e = d3.event;
                dispatch.call('elementMousemove', this, e);
              })
              .on('mouseout', function(d, i) {
                if (needsUpdate) return 0;
                dispatch.call('elementMouseout', this);
              })
              .on('click', function(d) {
                if (needsUpdate) return 0;
                var eo = buildEventObject(d3.event, d, d.point, d.series);
                dispatch.call('elementClick', this, eo);
              });
        } else {
          // add event handlers to points instead voronoi paths
          wrap.select('.sc-groups').selectAll('.sc-group')
            .selectAll('.sc-point')
              //.data(dataWithPoints)
              .style('pointer-events', 'auto') // recativate events, disabled by css
              .on('mouseover', function(d, i) {
                if (needsUpdate || !data[d.series]) return 0; //check if this is a dummy point
                var eo = buildEventObject(d3.event, d, i, d.series);
                dispatch.call('elementMouseover', this, eo);
              })
              .on('mousemove', function(d, i) {
                var e = d3.event;
                dispatch.call('elementMousemove', this, e);
              })
              .on('mouseout', function(d, i) {
                if (needsUpdate || !data[d.series]) return 0; //check if this is a dummy point
                dispatch.call('elementMouseout', this);
              })
              .on('click', function(d, i) {
                if (needsUpdate || !data[d.series]) return 0; //check if this is a dummy point
                var eo = buildEventObject(d3.event, d, i, d.series);
                dispatch.call('elementClick', this, eo);
              });
        }

        needsUpdate = false;
      }

      needsUpdate = true;

      var groups = wrap.select('.sc-groups').selectAll('.sc-group')
          .data(function(d) { return d; }, function(d) { return d.key; });
      groups.enter().append('g')
          .style('stroke-opacity', 1e-6)
          .style('fill-opacity', 1e-6);
      d3.transition(groups.exit())
          .style('stroke-opacity', 1e-6)
          .style('fill-opacity', 1e-6)
          .remove();
      groups
          .attr('class', function(d, i) { return classes(d, d.series); })
          .attr('fill', function(d, i) { return fill(d, d.series); })
          .attr('stroke', function(d, i) { return fill(d, d.series); })
          .classed('hover', function(d) { return d.hover; });
      d3.transition(groups)
          .style('stroke-opacity', 1)
          .style('fill-opacity', 0.5);


      if (onlyCircles) {

        var points = groups.selectAll('circle.sc-point')
            .data(function(d) { return d.values; });
        points.enter().append('circle')
            .attr('cx', function(d, i) { return x0(getX(d, i)); })
            .attr('cy', function(d, i) { return y0(getY(d, i)); })
            .attr('r', circleRadius);
        points.exit().remove();
        d3.transition(groups.exit().selectAll('path.sc-point'))
            .attr('cx', function(d, i) { return x(getX(d, i)); })
            .attr('cy', function(d, i) { return y(getY(d, i)); })
            .remove();
        points.attr('class', function(d, i) { return 'sc-point sc-point-' + i; });
        d3.transition(points)
            .attr('cx', function(d, i) { return x(getX(d, i)); })
            .attr('cy', function(d, i) { return y(getY(d, i)); })
            .attr('r', circleRadius);

      } else {

        var points = groups.selectAll('path.sc-point')
            .data(function(d) { return d.values; });
        points.enter().append('path')
            .attr('transform', function(d, i) {
              return 'translate(' + x0(getX(d, i)) + ',' + y0(getY(d, i)) + ')';
            })
            .attr('d',
              d3.svg.symbol()
                .type(getShape)
                .size(symbolSize)
            );
        points.exit().remove();
        d3.transition(groups.exit().selectAll('path.sc-point'))
            .attr('transform', function(d, i) {
              return 'translate(' + x(getX(d, i)) + ',' + y(getY(d, i)) + ')';
            })
            .remove();
        points.attr('class', function(d, i) { return 'sc-point sc-point-' + i; });
        d3.transition(points)
            .attr('transform', function(d, i) {
              return 'translate(' + x(getX(d, i)) + ',' + y(getY(d, i)) + ')';
            })
            .attr('d',
              d3.svg.symbol()
                .type(getShape)
                .size(symbolSize)
            );
      }


      // Delay updating the invisible interactive layer for smoother animation
      clearTimeout(timeoutID); // stop repeat calls to updateInteractiveLayer
      timeoutID = setTimeout(updateInteractiveLayer, 300);
      //updateInteractiveLayer();

      //store old scales for use in transitions on update
      x0 = x.copy();
      y0 = y.copy();
      z0 = z.copy();

    });

    return chart;
  }


  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  dispatch.on('elementMouseover.point', function(d) {
    if (interactive)
      d3.select('.sc-chart-' + id + ' .sc-series-' + d.seriesIndex + ' .sc-point-' + d.pointIndex)
          .classed('hover', true);
  });

  dispatch.on('elementMouseout.point', function(d) {
    if (interactive)
      d3.select('.sc-chart-' + id + ' .sc-series-' + d.seriesIndex + ' .sc-point-' + d.pointIndex)
          .classed('hover', false);
  });

  //============================================================


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
    getX = sucrose.functor(_);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = sucrose.functor(_);
    return chart;
  };

  chart.size = function(_) {
    if (!arguments.length) return getSize;
    getSize = sucrose.functor(_);
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
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

  chart.zScale = function(_) {
    if (!arguments.length) return z;
    z = _;
    return chart;
  };

  chart.xDomain = function(_) {
    if (!arguments.length) return xDomain;
    xDomain = _;
    return chart;
  };

  chart.yDomain = function(_) {
    if (!arguments.length) return yDomain;
    yDomain = _;
    return chart;
  };

  chart.sizeDomain = function(_) {
    if (!arguments.length) return sizeDomain;
    sizeDomain = _;
    return chart;
  };

  chart.sizeRange = function(_) {
    if (!arguments.length) return sizeRange;
    sizeRange = _;
    return chart;
  };

  chart.forceX = function(_) {
    if (!arguments.length) return forceX;
    forceX = _;
    return chart;
  };

  chart.forceY = function(_) {
    if (!arguments.length) return forceY;
    forceY = _;
    return chart;
  };

  chart.forceSize = function(_) {
    if (!arguments.length) return forceSize;
    forceSize = _;
    return chart;
  };

  chart.interactive = function(_) {
    if (!arguments.length) return interactive;
    interactive = _;
    return chart;
  };

  chart.pointActive = function(_) {
    if (!arguments.length) return pointActive;
    pointActive = _;
    return chart;
  };

  chart.padData = function(_) {
    if (!arguments.length) return padData;
    padData = _;
    return chart;
  };

  chart.padDataOuter = function(_) {
    if (!arguments.length) return padDataOuter;
    padDataOuter = _;
    return chart;
  };

  chart.clipEdge = function(_) {
    if (!arguments.length) return clipEdge;
    clipEdge = _;
    return chart;
  };

  chart.clipVoronoi = function(_) {
    if (!arguments.length) return clipVoronoi;
    clipVoronoi = _;
    return chart;
  };

  chart.useVoronoi = function(_) {
    if (!arguments.length) return useVoronoi;
    useVoronoi = _;
    if (useVoronoi === false) {
        clipVoronoi = false;
    }
    return chart;
  };

  chart.circleRadius = function(_) {
    if (!arguments.length) return circleRadius;
    circleRadius = _;
    return chart;
  };

  chart.shape = function(_) {
    if (!arguments.length) return getShape;
    getShape = _;
    return chart;
  };

  chart.onlyCircles = function(_) {
    if (!arguments.length) return onlyCircles;
    onlyCircles = _;
    return chart;
  };

  chart.id = function(_) {
    if (!arguments.length) return id;
    id = _;
    return chart;
  };

  chart.singlePoint = function(_) {
    if (!arguments.length) return singlePoint;
    singlePoint = _;
    return chart;
  };

  chart.nice = function(_) {
    if (!arguments.length) {
      return nice;
    }
    nice = _;
    return chart;
  };

  chart.locality = function(_) {
    if (!arguments.length) {
      return locality;
    }
    locality = sucrose.utils.buildLocality(_);
    return chart;
  };

  //============================================================

  return chart;
};
