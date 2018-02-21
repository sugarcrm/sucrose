import d3 from 'd3';
import utility from '../utility.js';
import tooltip from '../tooltip.js';
import language from '../language.js';

export default function globeChart() {

  // http://cldr.unicode.org/
  // http://www.geonames.org/countries/
  // http://www.naturalearthdata.com/downloads/
  // http://geojson.org/geojson-spec.html
  // http://bl.ocks.org/mbostock/4183330
  // http://bost.ocks.org/mike/map/
  // https://github.com/mbostock/topojson
  // https://github.com/mbostock/topojson/wiki/Command-Line-Reference
  // https://github.com/mbostock/us-atlas
  // https://github.com/mbostock/world-atlas
  // https://github.com/papandreou/node-cldr
  // https://github.com/melalj/topojson-map-generator
  // http://bl.ocks.org/mbostock/248bac3b8e354a9103c4#cubicInOut
  // https://www.jasondavies.com/maps/rotate/
  // https://www.jasondavies.com/maps/zoom/
  // http://www.kirupa.com/html5/animating_with_easing_functions_in_javascript.htm
  // http://www.jacklmoore.com/notes/mouse-position/

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var id = Math.floor(Math.random() * 10000), //Create semi-unique ID in case user doesn't select one,
      margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = null,
      height = null,
      showTitle = false,
      direction = 'ltr',
      tooltips = true,
      initialTilt = 0,
      initialRotate = 100,
      state = {},
      strings = language(),
      showLabels = true,
      autoSpin = false,
      showGraticule = true,
      gradient = null,
      world_map = [],
      country_map = {},
      country_labels = {},
      color = function(d, i) { return utility.defaultColor()(d, i); },
      classes = function(d, i) { return 'sc-country-' + i; },
      fill = color,
      dispatch = d3.dispatch('chartClick', 'tooltipShow', 'tooltipHide', 'tooltipMove', 'stateChange', 'changeState', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout');


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var projection = d3.geoOrthographic().precision(0.1);
  var path = d3.geoPath().projection(projection);
  var graticule = d3.geoGraticule();
  var colorLimit = 0;

  var tt = null;

  var tooltipContent = function(eo, properties) {
    return '<p><b>' + eo.name + '</b></p>' +
           '<p><b>Amount:</b> $' + d3.format(',.0f')(eo.amount) + '</p>';
  };

  function showTooltip(eo, offsetElement, properties) {
    var content = tooltipContent(eo, properties);
    return tooltip.show(eo.e, content, null, null, offsetElement);
  }

  var seriesClick = function(data, e, chart) {
    return;
  };

  //============================================================

  function chart(selection) {

    selection.each(function(chartData) {

      var that = this,
          container = d3.select(this),
          node = d3.select('#' + id + ' svg').node();

      var properties = chartData ? chartData.properties : {},
          data = chartData ? chartData.data : null;

      var containerWidth = parseInt(container.style('width'), 10),
          containerHeight = parseInt(container.style('height'), 10);

      var tooltips0 = tooltips,
          m0, n0, o0;

      // Globe variables
      var world,
          active_country = false,
          world_view = {rotate: [initialRotate, initialTilt], scale: 1, zoom: 1},
          country_view = {rotate: [null, null], scale: null, zoom: null},
          iRotation;

      // Chart layout variables
      var renderWidth, renderHeight, availableWidth, availableHeight;

      chart.container = this;

      gradient = gradient || function(d, i) {
        return utility.colorRadialGradient(d, i, 0, 0, '35%', '35%', color(d, i), defs);
      };

      //------------------------------------------------------------
      // Private method for displaying no data message.

      function displayNoData(data, msg) {
        var hasData = data && data.length;
        var x = (containerWidth - margin.left - margin.right) / 2 + margin.left;
        var y = (containerHeight - margin.top - margin.bottom) / 2 + margin.top;
        return utility.displayNoData(hasData, container, (msg || strings.noData), x, y);
      }

      // Check to see if there's nothing to show.
      if (displayNoData(data)) {
        return chart;
      }

      //------------------------------------------------------------
      // Process data
      var results = data[0];

      //------------------------------------------------------------
      // Setup svgs and skeleton of chart

      var wrap_bind = container.selectAll('g.sc-chart-wrap').data([1]);
      var wrap_entr = wrap_bind.enter().append('g').attr('class', 'sc-chart-wrap sc-chart-globe');
      var wrap = container.select('.sc-chart-wrap').merge(wrap_entr);

      wrap_entr.append('defs');
      var defs = wrap.select('defs');

      wrap_entr.append('svg:rect')
        .attr('class', 'sc-chart-background')
        .attr('transform', utility.translation(margin.left, margin.top));
      var backg = wrap.select('.sc-chart-background');

      var globe_entr = wrap_entr.append('g').attr('class', 'sc-globe');
      var globe = wrap.select('.sc-globe');

      globe_entr.append('path')
        .datum({type: 'Sphere'})
        .attr('class', 'sphere');
      var sphere = d3.select('.sphere');

      if (showGraticule) {
        globe_entr.append('path')
          .datum(graticule)
          .attr('class', 'graticule');
        var grid = d3.select('.graticule');
      }

      // zoom and pan
      var zoom = d3.zoom()
            .on('start', zoomStart)
            .on('zoom', zoomMove)
            .on('end', zoomEnd);
      globe.call(zoom);

      sphere
        .on('click', function () {
          unLoadCountry();
        });

      function zoomStart() {
        m0 = normalizeOffset(d3.event.sourceEvent);
        n0 = projection.invert(m0);
        o0 = projection.rotate();

        if (tooltips) {
          tooltip.cleanup();
          tooltips = false;
        }

        if (autoSpin) {
          clearInterval(iRotation);
        }
      }

      function zoomMove() {
        if (!m0) {
          return;
        }
        var scale = calcScale(d3.event.transform.k);
        var m1, n1, o1;

        m1 = normalizeOffset(d3.event.sourceEvent);
        n1 = projection.invert(m1);

        if (!n1[0]) {
          return;
        }

        o1 = [o0[0] + n1[0] - n0[0], (country_view.rotate[1] || world_view.rotate[1])];
        o0 = [o1[0], o1[1]];

        projection
          .rotate(o1)
          .scale(scale);

        refresh();
      }

      function zoomEnd() {
        m0 = null;
        tooltips = tooltips0;
      }

      function normalizeOffset(e) {
        var rect = node.getBoundingClientRect(),
            offsetX = (e ? e.clientX || 0 : 0) - rect.left,
            offsetY = (e ? e.clientY || 0 : 0) - rect.top;
        return [offsetX, offsetY];
      }

      //------------------------------------------------------------
      // Main chart draw methods

      chart.update = function() {
        container.transition().call(chart);
      };

      chart.resize = function () {
        var scale, translate;
        calcDimensions();
        scale = calcScale(projection.scale());
        translate = calcTranslate();
        backg
          .attr('width', availableWidth)
          .attr('height', availableHeight);
        projection
          .scale(scale)
          .translate(translate);
        refresh();
      };

      chart.render = function() {
        calcDimensions();

        projection
          .translate(calcTranslate())
          .rotate(world_view.rotate)
          .scale(calcScale(world_view.scale));

        path.projection(projection);

        sphere
          .attr('d', path);

        if (showGraticule) {
          grid
            .attr('d', path);
        }

        backg
          .attr('width', availableWidth)
          .attr('height', availableHeight);

        refresh();
      };

      //============================================================

      chart.render();

      loadChart(world_map, 'countries');

      if (autoSpin) {
        iRotation = setInterval(spin, 10);
      }

      //------------------------------------------------------------
      // Internal functions

      function calcDimensions() {
        renderWidth = width || parseInt(container.style('width'), 10) || 960;
        renderHeight = height || parseInt(container.style('height'), 10) || 400;
        availableWidth = renderWidth - margin.left - margin.right;
        availableHeight = renderHeight - margin.top - margin.bottom;
      }

      function calcScale(s) {
        var scale = Math.min(Math.max(s, 0.75), 3),
            size = Math.min(availableHeight, availableWidth) / 2;
        return scale * size;
      }

      function calcTranslate() {
        return [availableWidth / 2 + margin.left, availableHeight / 2 + margin.top];
      }

      function loadChart(data, type) {
        colorLimit = results._total;

        var world_bind = globe_entr.append('g').attr('class', type)
              .selectAll('path').data(data);
        var world_entr = world_bind.enter().append('path')
              .attr('d', clip)
              .attr('class', classes)
              .style('fill', function (d, i) {
                d.amount = amount(d);
                return fill(d, d.properties.mapcolor13 || i);
              });
        world = globe.selectAll('path').merge(world_entr);

        world_entr
          .on('click', loadCountry)
          .on('mouseover', function (d, i, j) {
            if (!d.properties) {
              return;
            }
            var eo = buildEventObject(d3.event, d, i, j);
            dispatch.call('tooltipShow', this, eo);
          })
          .on('mousemove', function(d, i, j) {
            var e = d3.event;
            dispatch.call('tooltipMove', this, e);
          })
          .on('mouseout', function () {
            dispatch.call('tooltipHide', this);
          });

        function buildEventObject(e, d, i, j) {
          var eo = {
              point: d,
              e: e,
              name: (country_labels[d.properties.iso_a2] || d.properties.name),
              amount: amount(d)
          };
          return eo;
        }
      }

      function loadCountry(d) {
        if (active_country == d3.select(this)) {
          return;
        }

        unLoadCountry();

        // If we have country-specific geographic features.
        if (!country_map[d.id]) {
          return;
        }

        if (tooltips) {
          tooltip.cleanup();
        }

        var centroid = d3.geoCentroid(d);
        var bounds = path.bounds(d);
        var hscale = availableWidth  / (bounds[1][0] - bounds[0][0]);
        var vscale = availableHeight / (bounds[1][1] - bounds[0][1]);
        var scale = Math.min(availableWidth * hscale, availableHeight * vscale) / 2;
        var rotate = [-centroid[0], -centroid[1]];

        world_view = {
          rotate: projection.rotate(),
          scale: projection.scale()
        };

        projection
          .rotate(rotate)
          .scale(scale);

        country_view = {
          rotate: projection.rotate(),
          scale: projection.scale()
        };

        // Flatten the results and include the state-level
        // results so that we don't need complex tooltip logic.
        var obj = region_results(d);
        obj.parent = results;
        results = obj;
        colorLimit = results._total;

        active_country = d3.select(this);
        loadChart(country_map[d.id], 'states');
        active_country.style('display', 'none');

        refresh();
      }

      function unLoadCountry() {
        if (!active_country) {
          return;
        }

        projection
          .rotate(world_view.rotate)
          .scale(world_view.scale);

        country_view = {
          rotate: [null, null],
          scale: null
        };

        results = results.parent;
        colorLimit = results._total;

        active_country.style('display', 'inline');
        d3.select('.states').remove();
        active_country = false;

        refresh();
      }

      function region_results(d) {
        return (
          results._values[d.id] ||
          results._values[d.properties.name] ||
          {'_total': 0}
        );
      }

      function amount(d) {
        return region_results(d)._total || 0;
      }

      function spin() {
        var o0 = projection.rotate(),
            m1 = [10, 0],
            o1 = [o0[0] + m1[0] / 8, initialTilt];
        rotate(o1);
      }

      function rotate(o) {
        projection.rotate(o);
        refresh();
      }

      function refresh(duration) {
        globe.selectAll('path')
          .attr('d', clip);
      }

      function clip(d) {
        return path(d) || 'M0,0Z';
      }

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      dispatch.on('tooltipShow', function(eo) {
          if (tooltips) {
            tt = showTooltip(eo, that.parentNode, properties);
          }
        });

      dispatch.on('tooltipMove', function(e) {
          if (tt) {
            tooltip.position(that.parentNode, tt, e, 's');
          }
        });

      dispatch.on('tooltipHide', function() {
          if (tooltips) {
            tooltip.cleanup();
          }
        });

      // Update chart from a state object passed to event handler
      dispatch.on('changeState', function(eo) {
          //TODO: handle active country

          container.transition().call(chart);
        });

      // dispatch.on('chartClick', function() {
      //     if (controls.enabled()) {
      //       controls.dispatch.call('closeMenu', this);
      //     }
      //     if (legend.enabled()) {
      //       legend.dispatch.call('closeMenu', this);
      //     }
      //   });

    });

    return chart;
  }

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;
  chart.projection = projection;
  chart.path = path;
  chart.graticule = graticule;
  chart.options = utility.optionsFunc.bind(chart);

  chart.margin = function(_) {
    if (!arguments.length) {
      return margin;
    }
    for (var prop in _) {
      if (_.hasOwnProperty(prop)) {
        margin[prop] = _[prop];
      }
    }
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

  chart.tooltips = function(_) {
    if (!arguments.length) {
      return tooltips;
    }
    tooltips = _;
    return chart;
  };

  chart.tooltipContent = function(_) {
    if (!arguments.length) {
      return tooltipContent;
    }
    tooltipContent = _;
    return chart;
  };

  chart.state = function(_) {
    if (!arguments.length) {
      return state;
    }
    state = _;
    return chart;
  };

  chart.strings = function(_) {
    if (!arguments.length) {
      return strings;
    }
    strings = language(_);
    return chart;
  };

  chart.showTitle = function(_) {
    if (!arguments.length) {
      return showTitle;
    }
    showTitle = _;
    return chart;
  };

  chart.direction = function(_) {
    if (!arguments.length) { return direction; }
    direction = _;
    return chart;
  };

  chart.id = function(_) {
    if (!arguments.length) return id;
    id = _;
    return chart;
  };

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


  chart.colorData = function(_) {
    var type = arguments[0],
        params = arguments[1] || {};
    var color = function(d, i) {
          return utility.defaultColor()(d, i);
        };
    var classes = function(d, i) {
          return 'sc-country-' + i + (d.classes ? ' ' + d.classes : '');
        };

    switch (type) {
      case 'graduated':
        color = function(d, i) {
          return d3.interpolateHsl(d3.rgb(params.c1), d3.rgb(params.c2))(i / params.l);
        };
        break;
      case 'class':
        color = function() {
          return '';
        };
        classes = function(d, i) {
          var iClass = (i * (params.step || 1)) % 14;
          iClass = (iClass > 9 ? '' : '0') + iClass; //TODO: use d3.format
          return 'sc-country-' + i + ' sc-fill' + iClass;
        };
        break;
      case 'data':
        color = function(d, i) {
          var r = d.amount || 0;
          return d3.interpolateHsl(d3.rgb(params.c1), d3.rgb(params.c2))(r / colorLimit);
        };
        break;
    }
    var fill = (!params.gradient) ? color : function(d, i) {
          return chart.gradient()(d, i);
        };

    chart.color(color);
    chart.classes(classes);
    chart.fill(fill);

    return chart;
  };

  chart.gradient = function(_) {
    if (!arguments.length) return gradient;
    gradient = _;
    return chart;
  };

  chart.showLabels = function(_) {
    if (!arguments.length) return showLabels;
    showLabels = _;
    return chart;
  };

  chart.autoSpin = function(_) {
    if (!arguments.length) return autoSpin;
    autoSpin = _;
    return chart;
  };

  chart.worldMap = function(_) {
    if (!arguments.length) {
      return world_map;
    }
    world_map = _;
    return chart;
  };

  chart.countryMap = function(_) {
    if (!arguments.length) {
      return country_map;
    }
    country_map = _;
    return chart;
  };

  chart.countryLabels = function(_) {
    if (!arguments.length) {
      return country_labels;
    }
    country_labels = _;
    return chart;
  };

  chart.seriesClick = function(_) {
    if (!arguments.length) {
      return seriesClick;
    }
    seriesClick = _;
    return chart;
  };

  //============================================================

  return chart;
}
