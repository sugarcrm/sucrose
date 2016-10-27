
sucrose.version = version;
sucrose.dev = false; //set false when in production

sucrose.tooltip = {}; // For the tooltip system
sucrose.utils = {}; // Utility subsystem
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
  sucrose.dispatch.call('render_start', this);

  setTimeout(function() {
    var chart, graph;

    for (var i = 0; i < step && (graph = sucrose.render.queue[i]); i++) {
      chart = graph.generate();
      if (typeof graph.callback == typeof(Function)) graph.callback(chart);
      sucrose.graphs.push(chart);
    }

    sucrose.render.queue.splice(0, i);

    if (sucrose.render.queue.length) setTimeout(arguments.callee, 0);
    else { sucrose.render.active = false; sucrose.dispatch.call('render_end', this); }
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
