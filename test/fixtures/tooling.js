var c_ = "#c_ .sucrose";
var chart = null;
var data = null;

function reset() {
  var body;
  body = document.querySelector("body");
  body.removeChild(body.firstChild);
  body.innerHTML = '<div id="c_" style="width:600px;height:600px;"><svg class="sucrose sc-chart"></svg></div>';
}

function model(options) {
  chart = sucrose[options.type][options.name]();
}

function config(options) {
  if (typeof options === 'string') {
    chart.colorData(options);
  } else {
    chart.options(options);
  }
}

function render(d_) {
  var type;
  var d_;
  type = window.__name__.replace("Chart", "");
  d_ = d_ || [];
  data = (typeof d_ === "string") ? JSON.parse(d_) : d_;
  postProcessData(data, type, chart);
  d3.select(c_).datum(data).call(chart);
}

function getElement(selector) {
  return document.querySelector(c_).querySelector(selector) || null;
}

function getInnerHtml(selector) {
  var element = document.querySelector(c_).querySelector(selector);
  return (element) ? element.innerHTML : "";
}
