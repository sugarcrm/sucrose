
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
