/* global d3, sucrose */

var c_ = "#c_ .sucrose";
var chart = null;
var data = null;

function reset() {
  var body;
  body = document.querySelector("body");
  body.removeChild(body.firstChild);
  // eslint-disable-next-line quotes
  body.innerHTML = '<div id="c_" style="width:600px;height:600px;"><svg class="sucrose sc-chart"></svg></div>';
}

function model(options) {
  chart = sucrose[options.type][options.name]();
}

function config(options) {
  if (typeof options === "string") {
    chart.colorData(options);
  } else {
    chart.options(options);
  }
}

function render(d_) {
  var type;
  var d;
  type = window.__name__.replace("Chart", "");
  d = d_ || [];
  data = (typeof d === "string") ? JSON.parse(d) : d;
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

function postProcessData(chartData, chartType, Chart) {

  switch (chartType) {

    case "area":
    case "line":
      if (!chartData || !chartData.data || !chartData.data.length ||
        !Array.isArray(chartData.data) ||
        !Array.isArray(chartData.data[0].values) ||
        !Array.isArray(chartData.data[0].values[0])
      ) {
        break;
      }
      // Convert array data to objects
      chartData.data.forEach(function(d) {
        d.values = d.values.map(function(g) {
          var value = {x: g[0], y: g[1]};
          if (g[2]) {
            value.z = g[2];
          }
          return value;
        });
      });
      break;

    case "multibar":
      if (!chartData || !chartData.properties) {
        break;
      }
      Chart.stacked(chartData.properties.stacked === false ? false : true);
      break;

    case "pareto":
      if (!chartData || !chartData.properties) {
        break;
      }
      Chart.stacked(chartData.properties.stacked);
      break;
  }
}
