
var sucrose = window.sucrose || {};

sucrose.version = '0.0.1a';
sucrose.dev = false; //set false when in production

window.sucrose = sucrose;

sucrose.tooltip = {}; // For the tooltip system
sucrose.utils = {}; // Utility subsystem
sucrose.models = {}; //stores all the possible models/components
sucrose.charts = {}; //stores all the ready to use charts
sucrose.graphs = []; //stores all the graphs currently on the page
sucrose.logs = {}; //stores some statistics and potential error messages

sucrose.dispatch = d3.dispatch('render_start', 'render_end');

// *************************************************************************
//  Development render timers - disabled if dev = false

if (sucrose.dev) {
  sucrose.dispatch.on('render_start', function(e) {
    sucrose.logs.startTime = +new Date();
  });

  sucrose.dispatch.on('render_end', function(e) {
    sucrose.logs.endTime = +new Date();
    sucrose.logs.totalTime = sucrose.logs.endTime - sucrose.logs.startTime;
    sucrose.log('total', sucrose.logs.totalTime); // used for development, to keep track of graph generation times
  });
}

// ********************************************
//  Public Core NV functions

// Logs all arguments, and returns the last so you can test things in place
sucrose.log = function() {
  if (sucrose.dev && console.log && console.log.apply)
    console.log.apply(console, arguments)
  else if (sucrose.dev && console.log && Function.prototype.bind) {
    var log = Function.prototype.bind.call(console.log, console);
    log.apply(console, arguments);
  }
  return arguments[arguments.length - 1];
};


sucrose.render = function render(step) {
  step = step || 1; // number of graphs to generate in each timeout loop

  sucrose.render.active = true;
  sucrose.dispatch.render_start();

  setTimeout(function() {
    var chart, graph;

    for (var i = 0; i < step && (graph = sucrose.render.queue[i]); i++) {
      chart = graph.generate();
      if (typeof graph.callback == typeof(Function)) graph.callback(chart);
      sucrose.graphs.push(chart);
    }

    sucrose.render.queue.splice(0, i);

    if (sucrose.render.queue.length) setTimeout(arguments.callee, 0);
    else { sucrose.render.active = false; sucrose.dispatch.render_end(); }
  }, 0);
};

sucrose.render.active = false;
sucrose.render.queue = [];

sucrose.addGraph = function(obj) {
  if (typeof arguments[0] === typeof(Function))
    obj = {generate: arguments[0], callback: arguments[1]};

  sucrose.render.queue.push(obj);

  if (!sucrose.render.active) sucrose.render();
};

sucrose.identity = function(d) { return d; };

sucrose.strip = function(s) { return s.replace(/(\s|&)/g,''); };

function daysInMonth(month,year) {
  return (new Date(year, month+1, 0)).getDate();
}

function d3_time_range(floor, step, number) {
  return function(t0, t1, dt) {
    var time = floor(t0), times = [];
    if (time < t0) step(time);
    if (dt > 1) {
      while (time < t1) {
        var date = new Date(+time);
        if ((number(date) % dt === 0)) times.push(date);
        step(time);
      }
    } else {
      while (time < t1) { times.push(new Date(+time)); step(time); }
    }
    return times;
  };
}

d3.time.monthEnd = function(date) {
  return new Date(date.getFullYear(), date.getMonth(), 0);
};

d3.time.monthEnds = d3_time_range(d3.time.monthEnd, function(date) {
    date.setUTCDate(date.getUTCDate() + 1);
    date.setDate(daysInMonth(date.getMonth() + 1, date.getFullYear()));
  }, function(date) {
    return date.getMonth();
  }
);

/* Create static d3 axis for printing */
d3.svg.axisStatic = function() {
    var scale = d3.scale.linear(),
        orient = d3_svg_axisDefaultOrient,
        tickMajorSize = 6,
        tickMinorSize = 6,
        tickEndSize = 6,
        tickPadding = 3,
        tickArguments_ = [10],
        tickValues = null,
        tickFormat_, tickSubdivide = 0;
    var d3_svg_axisDefaultOrient = "bottom",
        d3_svg_axisOrients = {
            top: 1,
            right: 1,
            bottom: 1,
            left: 1
        };

    function d3_scaleExtent(domain) {
        var start = domain[0],
            stop = domain[domain.length - 1];
        return start < stop ? [start, stop] : [stop, start];
    }

    function d3_scaleRange(scale) {
        return scale.rangeExtent ? scale.rangeExtent() : d3_scaleExtent(scale.range());
    }

    function d3_svg_axisX(selection, x) {
        selection.attr("transform", function(d) {
            return "translate(" + x(d) + ",0)";
        });
    }

    function d3_svg_axisY(selection, y) {
        selection.attr("transform", function(d) {
            return "translate(0," + y(d) + ")";
        });
    }

    function d3_svg_axisSubdivide(scale, ticks, m) {
        subticks = [];
        if (m && ticks.length > 1) {
            var extent = d3_scaleExtent(scale.domain()),
                subticks, i = -1,
                n = ticks.length,
                d = (ticks[1] - ticks[0]) / ++m,
                j, v;
            while (++i < n) {
                for (j = m; --j > 0;) {
                    if ((v = +ticks[i] - j * d) >= extent[0]) {
                        subticks.push(v);
                    }
                }
            }
            for (--i, j = 0; ++j < m && (v = +ticks[i] + j * d) < extent[1];) {
                subticks.push(v);
            }
        }
        return subticks;
    }

    function axis(g) {
        g.each(function() {
            var g = d3.select(this);
            var ticks = tickValues == null ? scale.ticks ? scale.ticks.apply(scale, tickArguments_) : scale.domain() : tickValues,
                tickFormat = tickFormat_ == null ? scale.tickFormat ? scale.tickFormat.apply(scale, tickArguments_) : String : tickFormat_;
            var subticks = d3_svg_axisSubdivide(scale, ticks, tickSubdivide),
                subtick = g.selectAll(".tick.minor").data(subticks, String),
                subtickEnter = subtick.enter().insert("line", ".tick").attr("class", "tick minor").style("opacity", 1),
                subtickExit = subtick.exit().remove(),
                subtickUpdate = subtick.style("opacity", 1);
            var tick = g.selectAll(".tick.major").data(ticks, String),
                tickEnter = tick.enter().insert("g", "path").attr("class", "tick major").style("opacity", 1),
                tickExit = tick.exit().remove(),
                tickUpdate = tick.style("opacity", 1),
                tickTransform;
            var range = d3_scaleRange(scale),
                path = g.selectAll(".domain").data([0]),
                pathUpdate = (path.enter().append("path").attr("class", "domain"), path);
            var scale1 = scale.copy();

            tickEnter.append("line");
            tickEnter.append("text");

            var lineEnter = tickEnter.select("line"),
                lineUpdate = tickUpdate.select("line"),
                text = tick.select("text").text(tickFormat),
                textEnter = tickEnter.select("text"),
                textUpdate = tickUpdate.select("text");

            switch (orient) {
                case "bottom":
                    {
                        tickTransform = d3_svg_axisX;

                        subtickEnter.attr("y2", tickMinorSize);
                        subtickUpdate.attr("x2", 0).attr("y2", tickMinorSize);

                        lineEnter.attr("y2", tickMajorSize);
                        textEnter.attr("y", Math.max(tickMajorSize, 0) + tickPadding);

                        lineUpdate.attr("x2", 0).attr("y2", tickMajorSize);
                        textUpdate.attr("x", 0).attr("y", Math.max(tickMajorSize, 0) + tickPadding);

                        text.attr("dy", ".71em").style("text-anchor", "middle");

                        pathUpdate.attr("d", "M" + range[0] + "," + tickEndSize + "V0H" + range[1] + "V" + tickEndSize);
                        break;
                    }

                case "top":
                    {
                        tickTransform = d3_svg_axisX;
                        subtickEnter.attr("y2", -tickMinorSize);
                        subtickUpdate.attr("x2", 0).attr("y2", -tickMinorSize);
                        lineEnter.attr("y2", -tickMajorSize);
                        textEnter.attr("y", -(Math.max(tickMajorSize, 0) + tickPadding));
                        lineUpdate.attr("x2", 0).attr("y2", -tickMajorSize);
                        textUpdate.attr("x", 0).attr("y", -(Math.max(tickMajorSize, 0) + tickPadding));
                        text.attr("dy", "0em").style("text-anchor", "middle");
                        pathUpdate.attr("d", "M" + range[0] + "," + -tickEndSize + "V0H" + range[1] + "V" + -tickEndSize);
                        break;
                    }

                case "left":
                    {
                        tickTransform = d3_svg_axisY;
                        subtickEnter.attr("x2", -tickMinorSize);
                        subtickUpdate.attr("x2", -tickMinorSize).attr("y2", 0);
                        lineEnter.attr("x2", -tickMajorSize);
                        textEnter.attr("x", -(Math.max(tickMajorSize, 0) + tickPadding));
                        lineUpdate.attr("x2", -tickMajorSize).attr("y2", 0);
                        textUpdate.attr("x", -(Math.max(tickMajorSize, 0) + tickPadding)).attr("y", 0);
                        text.attr("dy", ".32em").style("text-anchor", "end");
                        pathUpdate.attr("d", "M" + -tickEndSize + "," + range[0] + "H0V" + range[1] + "H" + -tickEndSize);
                        break;
                    }

                case "right":
                    {
                        tickTransform = d3_svg_axisY;
                        subtickEnter.attr("x2", tickMinorSize);
                        subtickUpdate.attr("x2", tickMinorSize).attr("y2", 0);
                        lineEnter.attr("x2", tickMajorSize);
                        textEnter.attr("x", Math.max(tickMajorSize, 0) + tickPadding);
                        lineUpdate.attr("x2", tickMajorSize).attr("y2", 0);
                        textUpdate.attr("x", Math.max(tickMajorSize, 0) + tickPadding).attr("y", 0);
                        text.attr("dy", ".32em").style("text-anchor", "start");
                        pathUpdate.attr("d", "M" + tickEndSize + "," + range[0] + "H0V" + range[1] + "H" + tickEndSize);
                        break;
                    }
            }
            if (scale.ticks) {
                tickEnter.call(tickTransform, scale1);
                tickUpdate.call(tickTransform, scale1);
                tickExit.call(tickTransform, scale1);
                subtickEnter.call(tickTransform, scale1);
                subtickUpdate.call(tickTransform, scale1);
                subtickExit.call(tickTransform, scale1);
            } else {
                var dx = scale1.rangeBand() / 2,
                    x = function(d) {
                        return scale1(d) + dx;
                    };
                tickEnter.call(tickTransform, x);
                tickUpdate.call(tickTransform, x);
            }
        });
    }
    axis.scale = function(x) {
        if (!arguments.length) return scale;
        scale = x;
        return axis;
    };
    axis.orient = function(x) {
        if (!arguments.length) return orient;
        orient = x in d3_svg_axisOrients ? x + "" : d3_svg_axisDefaultOrient;
        return axis;
    };
    axis.ticks = function() {
        if (!arguments.length) return tickArguments_;
        tickArguments_ = arguments;
        return axis;
    };
    axis.tickValues = function(x) {
        if (!arguments.length) return tickValues;
        tickValues = x;
        return axis;
    };
    axis.tickFormat = function(x) {
        if (!arguments.length) return tickFormat_;
        tickFormat_ = x;
        return axis;
    };
    axis.tickSize = function(x, y) {
        if (!arguments.length) return tickMajorSize;
        var n = arguments.length - 1;
        tickMajorSize = +x;
        tickMinorSize = n > 1 ? +y : tickMajorSize;
        tickEndSize = n > 0 ? +arguments[n] : tickMajorSize;
        return axis;
    };
    axis.tickPadding = function(x) {
        if (!arguments.length) return tickPadding;
        tickPadding = +x;
        return axis;
    };
    axis.tickSubdivide = function(x) {
        if (!arguments.length) return tickSubdivide;
        tickSubdivide = +x;
        return axis;
    };
    return axis;
};

