import d3 from 'd3';
import utility from '../utility.js';

export default function scatter() {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var id = Math.floor(Math.random() * 100000), //Create semi-unique ID incase user doesn't select one
      width = 960,
      height = 500,
      margin = {top: 0, right: 0, bottom: 0, left: 0},
      color = function(d, i) { return utility.defaultColor()(d, d.seriesIndex); }, // chooses color
      gradient = utility.colorRadialGradient,
      fill = color,
      classes = function(d, i) { return 'sc-series sc-series-' + d.seriesIndex; },
      x = d3.scaleLinear(),
      y = d3.scaleLinear(),
      z = d3.scaleLinear(), //linear because d3.symbol.size is treated as area
      getX = function(d) { return d.x; }, // accessor to get the x value
      getY = function(d) { return d.y; }, // accessor to get the y value
      getZ = function(d) { return d.size || 1; }, // accessor to get the point size, set by public method .size()
      forceX = [], // List of numbers to Force into the X scale (ie. 0, or a max / min, etc.)
      forceY = [], // List of numbers to Force into the Y scale
      forceZ = [], // List of numbers to Force into the Size scale
      xDomain = null, // Override x domain (skips the calculation from data)
      yDomain = null, // Override y domain
      zDomain = null, // Override point size domain
      zRange = [1 * 1 * Math.PI, 5 * 5 * Math.PI],
      circleRadius = function(d, i) {
        // a = pi*r^2
        // a / pi = r^2
        // sqrt(a / pi) = r
        // 1 = 1 * pi , 5 = 25 * pi
        return Math.sqrt(z(getZ(d, i)) / Math.PI);
      }, // function to get the radius for voronoi point clips
      symbolSize = function(d, i) {
        return z(getZ(d, i));
      },
      getShape = function(d) { return d.shape || 'circle'; }, // accessor to get point shape
      locality = utility.buildLocality(),
      onlyCircles = true, // Set to false to use shapes

      interactive = true, // If true, plots a voronoi overlay for advanced point intersection
      pointActive = function(d) { return !d.notActive; }, // any points that return false will be filtered out
      padData = false, // If true, adds half a data points width to front and back, for lining up a line chart with a bar chart
      padDataOuter = 0.1, //outerPadding to imitate ordinal scale outer padding
      direction = 'ltr',
      clipEdge = false, // if true, masks points within x and y scale
      delay = 0,
      duration = 0,
      useVoronoi = true,
      clipVoronoi = true, // if true, masks each point with a circle... can turn off to slightly increase performance
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


  function model(selection) {
    selection.each(function(data) {

      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          container = d3.select(this);

      var t = d3.transition('scatter')
          .duration(duration)
          .ease(d3.easeLinear);

      needsUpdate = true;

      //------------------------------------------------------------
      // Setup Scales

      // remap and flatten the data for use in calculating the scales' domains
      // if we know xDomain and yDomain and zDomain, no need to calculate....
      // if Size is constant remember to set zDomain to speed up performance
      var seriesData = (xDomain && yDomain && zDomain) ? [] :
            d3.merge(
              data.map(function(d) {
                return d.values.map(function(d, i) {
                  return { x: getX(d, i), y: getY(d, i), size: getZ(d, i) };
                });
              })
            );

      model.resetDimensions = function(w, h) {
        width = w;
        height = h;
        availableWidth = w - margin.left - margin.right;
        availableHeight = h - margin.top - margin.bottom;
        resetScale();
      };

      function resetScale() {
        // WHEN GETX RETURN 1970, THIS FAILS, BECAUSE X IS A DATETIME SCALE
        // RESOLVE BY MAKING SURE GETX RETURN A DATE OBJECT WHEN X SCALE IS DATETIME

        x.domain(xDomain || d3.extent(seriesData.map(getX).concat(forceX)));
        y.domain(yDomain || d3.extent(seriesData.map(getY).concat(forceY)));

        if (padData && data[0]) {
          if (padDataOuter === -1) {
            // shift range so that largest bubble doesn't cover scales
            var largestPossible = Math.sqrt(zRange[1] / Math.PI);
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

        // If scale's domain don't have a range, slightly adjust to make one... so a chart can show a single data point
        singlePoint = (x.domain()[0] === x.domain()[1] || y.domain()[0] === y.domain()[1]);

        if (x.domain()[0] === x.domain()[1]) {
          x.domain()[0] ?
            x.domain([x.domain()[0] - x.domain()[0] * 0.1, x.domain()[1] + x.domain()[1] * 0.1]) :
            x.domain([-1, 1]);
        }

        if (y.domain()[0] === y.domain()[1]) {
          y.domain()[0] ?
            y.domain([y.domain()[0] - y.domain()[0] * 0.1, y.domain()[1] + y.domain()[1] * 0.1]) :
            y.domain([-1, 1]);
        }

        z.domain(zDomain || d3.extent(seriesData.map(function(d) { return d.size; }).concat(forceZ)))
         .range(zRange);

        if (z.domain().length < 2) {
          z.domain([0, z.domain()]);
        }

        x0 = x0 || x;
        y0 = y0 || y;
        z0 = z0 || z;
      }

      resetScale();

      //------------------------------------------------------------
      // Setup containers and skeleton of model

      var wrap_bind = container.selectAll('g.sc-wrap.sc-scatter').data([data]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-wrap sc-scatter');
      var wrap = container.select('.sc-wrap.sc-scatter').merge(wrap_entr);

      var defs_entr = wrap_entr.append('defs');
      var defs = wrap.select('defs');

      wrap_entr.append('g').attr('class', 'sc-group');
      var group_wrap = wrap.select('.sc-group');

      wrap_entr.append('g').attr('class', 'sc-point-paths');
      var paths_wrap = wrap.select('.sc-point-paths');

      wrap
        .classed('sc-single-point', singlePoint)
        .attr('transform', utility.translation(margin.left, margin.top));

      //------------------------------------------------------------

      defs_entr.append('clipPath')
        .attr('id', 'sc-edge-clip-' + id)
        .append('rect');
      defs_entr.append('clipPath')
        .attr('id', 'sc-points-clip-' + id)
        .attr('class', 'sc-point-clips');

      defs.select('#sc-edge-clip-' + id + ' rect')
          .attr('width', availableWidth)
          .attr('height', availableHeight);

      wrap.attr('clip-path', clipEdge ? 'url(#sc-edge-clip-' + id + ')' : '');

      // set up the gradient constructor function
      model.gradientFill = function(d, i) {
        var gradientId = id + '-' + i;
        var params = {
          x: 0.5,
          y: 0.5,
          r: 0.5,
          s: 0,
          u: 'objectBoundingBox'
        };
        var c = color(d, i);
        return gradient(d, gradientId, params, c, defs);
      };

      //------------------------------------------------------------
      // Series

      var series_bind = group_wrap.selectAll('.sc-series')
            .data(utility.identity, function(d) { return d.seriesIndex; });
      var series_entr = series_bind.enter().append('g')
            .attr('class', 'sc-series')
            .style('stroke-opacity', 1e-6)
            .style('fill-opacity', 1e-6);
      var series = group_wrap.selectAll('.sc-series').merge(series_entr);

      series
        .attr('class', function(d, i) { return classes(d, d.seriesIndex); })
        .attr('fill', function(d, i) { return fill(d, d.seriesIndex); })
        .attr('stroke', function(d, i) { return fill(d, d.seriesIndex); })
        .classed('hover', function(d) { return d.hover; });
      series
        .transition(t)
          .style('stroke-opacity', 1)
          .style('fill-opacity', 1);
      series_bind.exit()
        .transition(t)
          .style('stroke-opacity', 1e-6)
          .style('fill-opacity', 1e-6)
          .remove();

      //------------------------------------------------------------
      // Interactive Layer

      var points_bind;
      var points_entr;
      var points;

      if (onlyCircles) {

        points_bind = series.selectAll('circle.sc-point')
          .data(function(d) { return d.values; });
        points_entr = points_bind.enter().append('circle')
          .attr('class', function(d, i) { return 'sc-point sc-enter sc-point-' + i; })
          .attr('r', circleRadius);
        points = series.selectAll('.sc-point').merge(points_entr);

        points
          .filter(function(d) {
            return d3.select(this).classed('sc-enter');
          })
          .attr('cx', function(d, i) {
            return x(getX(d, i));
          })
          .attr('cy', function(d, i) {
            return y(0);
          });
        points
          .transition(t)
            .attr('cx', function(d, i) { return x(getX(d, i)); })
            .attr('cy', function(d, i) { return y(getY(d, i)); })
            .on('end', function(d) {
              d3.select(this)
                .classed('sc-enter', false)
                .classed('sc-active', function(d) {
                  return d.active === 'active';
                });
            });

        series_bind.exit()
          .transition(t).selectAll('.sc-point')
            .attr('cx', function(d, i) { return x(getX(d, i)); })
            .attr('cy', function(d, i) { return y(0); })
            .remove();

      } else {

        points_bind = series.selectAll('path.sc-point').data(function(d) { return d.values; });
        points_entr = points_bind.enter().append('path')
          .attr('class', function(d, i) { return 'sc-point sc-enter sc-point-' + i; })
          .attr('d',
            d3.symbol()
              .type(getShape)
              .size(symbolSize)
          );
        points = series.selectAll('.sc-point').merge(points_entr);

        points
          .filter(function(d) {
            return d3.select(this).classed('sc-enter');
          })
          .attr('transform', function(d, i) {
            return 'translate(' + x0(getX(d, i)) + ',' + y(0) + ')';
          });
        points
          .transition(t)
            .attr('transform', function(d, i) {
              return 'translate(' + x(getX(d, i)) + ',' + y(getY(d, i)) + ')';
            })
            .attr('d',
              d3.symbol()
                .type(getShape)
                .size(symbolSize)
            )
            .on('end', function(d) {
              d3.select(this)
                .classed('sc-enter', false)
                .classed('active', function(d) {
                  return d.active === 'active';
                });
            });

        series_bind.exit()
          .transition(t).selectAll('.sc-point')
            .attr('transform', function(d, i) {
              return 'translate(' + x(getX(d, i)) + ',' + y(0) + ')';
            })
            .remove();

      }

      function buildEventObject(e, p, i, s) {
        var eo = {
            pointIndex: i,
            point: p,
            seriesIndex: s.seriesIndex,
            series: s,
            groupIndex: p.group,
            id: id,
            e: e
          };
        return eo;
      }

      function updateInteractiveLayer() {

        if (!interactive) {
          return false;
        }

        //inject series, group and point index for reference into voronoi
        if (useVoronoi === true) {

          var vertices = d3.merge(data.map(function(series, seriesIndex) {
              return series.values
                .map(function(point, pointIndex) {
                  // *Adding noise to make duplicates very unlikely
                  // *Injecting series and point index for reference
                  /* *Adding a 'jitter' to the points, because there's an issue in d3.voronoi.
                   */
                  var pX = getX(point, pointIndex);
                  var pY = getY(point, pointIndex);
                  var groupIndex = point.group;

                  return [
                      x(pX) + Math.random() * 1e-4,
                      y(pY) + Math.random() * 1e-4,
                      point,
                      seriesIndex,
                      groupIndex,
                      pointIndex
                    ]; //temp hack to add noise until I think of a better way so there are no duplicates
                })
                .filter(function(pointArray, pointIndex) {
                  return pointActive(pointArray[4], pointIndex); // Issue #237.. move filter to after map, so pointIndex is correct!
                });
            })
          );

          if (vertices.length <= 3) {
            // Issue #283 - Adding 2 dummy points to the voronoi b/c voronoi requires min 3 points to work
            vertices.push([x.range()[0] - 20, y.range()[0] - 20, null, null, null, null]);
            vertices.push([x.range()[1] + 20, y.range()[1] + 20, null, null, null, null]);
            vertices.push([x.range()[0] - 20, y.range()[0] + 20, null, null, null, null]);
            vertices.push([x.range()[1] + 20, y.range()[1] - 20, null, null, null, null]);
          }

          try {
            var voronoi = d3.voronoi()
                  .extent([[-10, -10], [width + 10, height + 10]])
                  .polygons(vertices)
                  .map(function(d, i) {
                    return {
                      'data': d,
                      'seriesIndex': vertices[i][3],
                      'groupIndex': vertices[i][4],
                      'pointIndex': vertices[i][5]
                    };
                  })
                  .filter(function(d) { return d.seriesIndex !== null; });
          } catch (e) {
            useVoronoi = false;
            // eslint-disable-next-line
            console.warn('Sucrose: [ERROR] D3 Voronoi paths in line chart are disabled due to error.');
          }

        }

        if (useVoronoi) {

          if (clipVoronoi) {
            var clips_bind = wrap.select('#sc-points-clip-' + id).selectAll('circle').data(vertices);
            var clips_entr = clips_bind.enter().append('circle');
            var clips = wrap.select('#sc-points-clip-' + id).selectAll('circle').merge(clips_entr);
            clips_bind.exit().remove();

            clips
              .attr('cx', function(d) { return d[0]; })
              .attr('cy', function(d) { return d[1]; })
              .attr('r', function(d, i) {
                // Fallback to 25 which is the nvd3 default
                // This should only happen when we have less than 4 records and have to use dummy points
                return d[2] ? circleRadius(d[2], i) : 25;
              });

            paths_wrap
                .attr('clip-path', 'url(#sc-points-clip-' + id + ')');
          }

          var paths_bind = paths_wrap.selectAll('path').data(voronoi);
          var paths_entr = paths_bind.enter().append('path').attr('class', function(d, i) { return 'sc-path-' + i; });
          var paths = paths_wrap.selectAll('path').merge(paths_entr);
          paths_bind.exit().remove();

          paths
            .attr('d', function(d) { return d ? 'M' + d.data.join('L') + 'Z' : null; })
            .on('mouseover', function(d) {
              var s = data[d.seriesIndex];
              var i = d.pointIndex;
              var p = s.values[i];
              if (needsUpdate || !s) return 0;
              var eo = buildEventObject(d3.event, p, i, s);
              dispatch.call('elementMouseover', this, eo);
            })
            .on('mousemove', function(d) {
              var e = d3.event;
              dispatch.call('elementMousemove', this, e);
            })
            .on('mouseout', function(d) {
              var s = data[d.seriesIndex];
              var i = d.pointIndex;
              var p = s.values[i];
              if (needsUpdate || !s) return 0;
              var eo = buildEventObject(d3.event, p, i, s);
              dispatch.call('elementMouseout', this, eo);
            })
            .on('click', function(d) {
              var s = data[d.seriesIndex];
              var i = d.pointIndex;
              var p = s.values[i];
              if (needsUpdate || !s) return 0;
              var eo = buildEventObject(d3.event, p, i, s);
              dispatch.call('elementClick', this, eo);
            });

        } else {

          // add event handlers to points instead voronoi paths
          series.selectAll('.sc-point')
            //.data(dataWithPoints)
            .style('pointer-events', 'auto') // recaptivate events, disabled by css
            .on('mouseover', function(d, i) {
              var s = d3.select(this.parentNode).datum();
              var p = s.values[i];
              if (needsUpdate || !s) return 0; //check if this is a dummy point
              var eo = buildEventObject(d3.event, p, i, s);
              dispatch.call('elementMouseover', this, eo);
            })
            .on('mousemove', function(d, i) {
              var e = d3.event;
              dispatch.call('elementMousemove', this, e);
            })
            .on('mouseout', function(d, i) {
              var s = d3.select(this.parentNode).datum();
              var p = s.values[i];
              if (needsUpdate || !s) return 0; //check if this is a dummy point
              var eo = buildEventObject(d3.event, p, i, s);
              dispatch.call('elementMouseout', this, eo);
            })
            .on('click', function(d, i) {
              var s = d3.select(this.parentNode).datum();
              var p = s.values[i];
              if (needsUpdate || !s) return 0; //check if this is a dummy point
              var eo = buildEventObject(d3.event, p, i, s);
              dispatch.call('elementClick', this, eo);
            });

        }

        needsUpdate = false;
      }

      // Delay updating the invisible interactive layer for smoother animation
      clearTimeout(timeoutID); // stop repeat calls to updateInteractiveLayer
      timeoutID = setTimeout(updateInteractiveLayer, 300);

      //store old scales for use in transitions on update
      x0 = x.copy();
      y0 = y.copy();
      z0 = z.copy();

      //============================================================
      // Event Handling/Dispatching (in model's scope)
      //------------------------------------------------------------

      dispatch.on('elementMouseover.point', function(eo) {
        if (interactive) {
          container.select('.sc-series-' + eo.seriesIndex + ' .sc-point-' + eo.pointIndex)
            .classed('hover', true);
        }
      });

      dispatch.on('elementMouseout.point', function(eo) {
        if (interactive) {
          container.select('.sc-series-' + eo.seriesIndex + ' .sc-point-' + eo.pointIndex)
            .classed('hover', false);
        }
      });

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

  model.x = function(_) {
    if (!arguments.length) { return getX; }
    getX = utility.functor(_);
    return model;
  };

  model.y = function(_) {
    if (!arguments.length) { return getY; }
    getY = utility.functor(_);
    return model;
  };

  model.z = function(_) {
    if (!arguments.length) { return getZ; }
    getZ = utility.functor(_);
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

  model.zScale = function(_) {
    if (!arguments.length) { return z; }
    z = _;
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

  model.zDomain = function(_) {
    if (!arguments.length) { return zDomain; }
    zDomain = _;
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

  model.forceZ = function(_) {
    if (!arguments.length) { return forceZ; }
    forceZ = _;
    return model;
  };

  model.size = function(_) {
    if (!arguments.length) { return getZ; }
    getZ = utility.functor(_);
    return model;
  };

  model.sizeRange = function(_) {
    if (!arguments.length) { return zRange; }
    zRange = _;
    return model;
  };
  model.sizeDomain = function(_) {
    if (!arguments.length) { return zDomain; }
    zDomain = _;
    return model;
  };
  model.forceSize = function(_) {
    if (!arguments.length) { return forceZ; }
    forceZ = _;
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

  model.interactive = function(_) {
    if (!arguments.length) { return interactive; }
    interactive = _;
    return model;
  };

  model.pointActive = function(_) {
    if (!arguments.length) { return pointActive; }
    pointActive = _;
    return model;
  };

  model.padData = function(_) {
    if (!arguments.length) { return padData; }
    padData = _;
    return model;
  };

  model.padDataOuter = function(_) {
    if (!arguments.length) { return padDataOuter; }
    padDataOuter = _;
    return model;
  };

  model.clipEdge = function(_) {
    if (!arguments.length) { return clipEdge; }
    clipEdge = _;
    return model;
  };

  model.clipVoronoi = function(_) {
    if (!arguments.length) { return clipVoronoi; }
    clipVoronoi = _;
    return model;
  };

  model.useVoronoi = function(_) {
    if (!arguments.length) { return useVoronoi; }
    useVoronoi = _;
    if (useVoronoi === false) {
        clipVoronoi = false;
    }
    return model;
  };

  model.circleRadius = function(_) {
    if (!arguments.length) { return circleRadius; }
    circleRadius = _;
    return model;
  };

  model.clipRadius = function(_) {
    if (!arguments.length) { return circleRadius; }
    circleRadius = _;
    return model;
  };

  model.shape = function(_) {
    if (!arguments.length) { return getShape; }
    getShape = _;
    return model;
  };

  model.onlyCircles = function(_) {
    if (!arguments.length) { return onlyCircles; }
    onlyCircles = _;
    return model;
  };

  model.singlePoint = function(_) {
    if (!arguments.length) { return singlePoint; }
    singlePoint = _;
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

  model.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
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
