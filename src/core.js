var charts = {}; //stores all the ready to use charts
var ver = '0.0.2'; //change to 0.0.3 when ready
var dev = false; //set false when in production
var dispatch = d3.dispatch('render_start', 'render_end');

// *************************************************************************
//  Development render timers - disabled if dev = false

var logs = {}; //stores some statistics and potential error messages

if (dev) {
  dispatch.on('render_start', function(e) {
    logs.startTime = +new Date();
  });

  dispatch.on('render_end', function(e) {
    logs.endTime = +new Date();
    logs.totalTime = logs.endTime - logs.startTime;
    log('total', logs.totalTime); // used for development, to keep track of graph generation times
  });
}

// Logs all arguments, and returns the last so you can test things in place
var log = function() {
  if (dev && console.log && console.log.apply)
    console.log.apply(console, arguments)
  else if (dev && console.log && Function.prototype.bind) {
    var log = Function.prototype.bind.call(console.log, console);
    log.apply(console, arguments);
  }
  return arguments[arguments.length - 1];
};

// ********************************************
//  Public core functions

var graphs = []; //stores all the graphs currently on the page

var render = function render(step) {
  step = step || 1; // number of graphs to generate in each timeout loop

  render.active = true;
  dispatch.call('render_start', this);

  setTimeout(function() {
    var chart, graph;

    for (var i = 0; i < step && (graph = render.queue[i]); i += 1) {
      chart = graph.generate();
      if (typeof graph.callback === typeof(Function)) {
        graph.callback(chart);
      }
      graphs.push(chart);
    }

    render.queue.splice(0, i);

    if (render.queue.length) {
      setTimeout(arguments.callee, 0);
    } else {
      render.active = false;
      sucrose.dispatch.call('render_end', this);
    }
  }, 0);
};

render.active = false;
render.queue = [];

var addGraph = function(obj) {
  if (typeof arguments[0] === typeof(Function)) {
    obj = {generate: arguments[0], callback: arguments[1]};
  }

  render.queue.push(obj);

  if (!render.active) {
    render();
  }
};
