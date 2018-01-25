/* global getInnerHtml, getElement, chart, render */
"use strict";

const Dreams = require("../../lib/dreams.js");

const data = require("../../files/line_data.json");
const json = JSON.stringify(data);

const options = {
  port: 8080,
  uri: "/test/fixtures/chart.html",
  type: "charts",
  name: "lineChart",
};

const dreams = new Dreams(options);

// get new nightmare instance and wake up server
const nightmare = dreams.awaken();

// generate reports after all tests are run
dreams.sleep();

// run all tests against single nightmare instance
dreams.tests("INT: lineChart -", function(t) {

  // Data tests
  t.test("data: renders no data message if data is empty", function(assert) {
    nightmare
      .chart(options)
      .config("default")
      .render(null)
      .evaluate(function() {
        return getInnerHtml(".sc-no-data");
      })
      .then(function(result) {
        assert.equal(result, "No Data Available.");
        assert.end();
      })
      .catch(function(msg) { dreams.error(msg, assert, nightmare); });
  });
  t.test("data: does not render no data message if data is not empty", function(assert) {
    nightmare
      .chart(options)
      .config("default")
      .render(json)
      .evaluate(function() {
        return getElement(".sc-no-data");
      })
      .then(function(result) {
        assert.equal(result, null);
        assert.end();
      })
      .catch(function(msg) { dreams.error(msg, assert, nightmare); });
  });
  t.test("data: renders chart if data is not empty", function(assert) {
    nightmare
      .chart(options)
      .config("default")
      .render(json)
      .exists(".sc-chart-line")
      .then(function(result) {
        assert.ok(result);
        assert.end();
      })
      .catch(function(msg) { dreams.error(msg, assert, nightmare); });
  });

  // Title tests
  t.test("title: render title by default", function(assert) {
    nightmare
      .chart(options)
      .config("default")
      .render(json)
      .evaluate(function() {
        return getInnerHtml(".sc-title-wrap text");
      })
      .then(function(result) {
        assert.equal(result, "Test line chart");
        assert.end();
      })
      .catch(function(msg) { dreams.error(msg, assert, nightmare); });
  });
  t.test("title: do not render title if no title in properties", function(assert) {
    nightmare
      .chart(options)
      .config("default")
      .evaluate(function(json) {
        var d = JSON.parse(json);
        delete d.properties.title;
        chart.showTitle(true);
        render(d);
        return getInnerHtml(".sc-title-wrap");
      }, json)
      .then(function(result) {
        assert.equal(result, "");
        assert.end();
      })
      .catch(function(msg) { dreams.error(msg, assert, nightmare); });
  });
  t.test("title: do not render title if showTitle set to 'false'", function(assert) {
    nightmare
      .chart(options)
      .config("default")
      .evaluate(function(json) {
        chart.showTitle(false);
        render(json);
        return getInnerHtml(".sc-title");
      }, json)
      .then(function(result) {
        assert.equal(result, "");
        assert.end();
      })
      .catch(function(msg) { dreams.error(msg, assert, nightmare); });
  });

  // Menu
  t.test("menu: legend menu is rendered by default", function(assert) {
    nightmare
      .chart(options)
      .config("default")
      .render(json)
      .evaluate(function() {
        return getInnerHtml(".sc-legend-wrap");
      })
      .then(function(result) {
        assert.notEqual(result, "");
        assert.end();
      })
      .catch(function(msg) { dreams.error(msg, assert, nightmare); });
  });
  t.test("menu: legend menu is never rendered if showLegend set to 'false'", function(assert) {
    nightmare
      .chart(options)
      .config("default")
      .evaluate(function(json) {
        chart.showLegend(false);
        render(json);
        return getInnerHtml(".sc-legend-wrap");
      }, json)
      .then(function(result) {
        assert.equal(result, "");
        assert.end();
      })
      .catch(function(msg) { dreams.error(msg, assert, nightmare); });
  });
  t.test("menu: control menu is rendered if showControl set to 'true'", function(assert) {
    nightmare
      .chart(options)
      .config("default")
      .evaluate(function(json) {
        chart.showControls(true);
        render(json);
        return getInnerHtml(".sc-controls-wrap");
      }, json)
      .then(function(result) {
        assert.notEqual(result, "");
        assert.end();
      })
      .catch(function(msg) { dreams.error(msg, assert, nightmare); });
  });

  // Color tests
  t.test("color: palette is category20 by default", function(assert) {
    nightmare
      .chart(options)
      .config("default")
      .render(json)
      .evaluate(function() {
        var result = getElement(".sc-line .sc-series-0");
        return {
          fill: result.getAttribute("fill"),
          class: result.getAttribute("class"),
        };
      })
      .then(function(result) {
        assert.plan(2);
        assert.equal(result.class, "sc-series sc-series-0");
        assert.equal(result.fill, "#1f77b4");
      })
      .catch(function(msg) { dreams.error(msg, assert, nightmare); });
  });
  t.test("color: palette uses classnames if colorData set to 'class'", function(assert) {
    nightmare
      .chart(options)
      .config("class")
      .render(json)
      .evaluate(function() {
        var result = getElement(".sc-line .sc-series-0");
        return {
          fill: result.getAttribute("fill"),
          class: result.getAttribute("class"),
        };
      })
      .then(function(result) {
        assert.plan(2);
        assert.equal(result.class, "sc-series sc-series-0 sc-fill00 sc-stroke00");
        assert.equal(result.fill, "inherit");
      })
      .catch(function(msg) { dreams.error(msg, assert, nightmare); });
  });
  t.test("color: palette controlled by color attribute of series Data", function(assert) {
    nightmare
      .chart(options)
      .config("data")
      .evaluate(function(json) {
        var d, result;
        d = JSON.parse(json);
        d.data[0].color = "#000";
        render(d);
        result = getElement(".sc-line .sc-series-0");
        return {
          fill: result.getAttribute("fill"),
          class: result.getAttribute("class"),
        };
      }, json)
      .then(function(result) {
        assert.plan(2);
        assert.equal(result.class, "sc-series sc-series-0");
        assert.equal(result.fill, "#000");
      })
      .catch(function(msg) { dreams.error(msg, assert, nightmare); });
  });
  t.test("color: palette graduated on gray scale", function(assert) {
    nightmare
      .chart(options)
      .evaluate(function(json) {
        var result;
        chart.colorData("graduated", {c1: "#FFF", c2: "#000", l: 4});
        render(json);
        result = getElement(".sc-line");
        return {
          fill0: result.querySelector(".sc-series-0").getAttribute("fill"),
          fill3: result.querySelector(".sc-series-2").getAttribute("fill"),
        };
      }, json)
      .then(function(result) {
        assert.plan(2);
        assert.equal(result.fill0, "rgb(255, 255, 255)");
        assert.equal(result.fill3, "rgb(128, 128, 128)");
      })
      .catch(function(msg) { dreams.error(msg, assert, nightmare); });
  });

  // Dimensions
  t.test("dimensions: margins can be defined", function(assert) {
    nightmare
      .chart(options)
      .config("default")
      .evaluate(function(json) {
        var background, wrap;
        chart.margin({top: 20, right: 10, bottom: 30, left: 40});
        render(json);
        background = getElement(".sc-background");
        wrap = getElement(".sc-chart-wrap");
        return {
          background: {
            x: background.getAttribute("x"),
            y: background.getAttribute("y"),
          },
          wrap: {
            transform: wrap.getAttribute("transform"),
          }
        };
      }, json)
      .then(function(result) {
        assert.plan(3);
        assert.equal(result.background.x, "-40");
        assert.equal(result.background.y, "-20");
        assert.equal(result.wrap.transform, "translate(40,20)");
      })
      .catch(function(msg) { dreams.error(msg, assert, nightmare); });
  });
  t.test("dimensions: default to container dimensions", function(assert) {
    nightmare
      .chart(options)
      .config("default")
      .render(json)
      .evaluate(function() {
        var background = getElement(".sc-background");
        return {
          width: background.getAttribute("width"),
          height: background.getAttribute("height"),
        };
      })
      .then(function(result) {
        assert.plan(2);
        assert.equal(result.width, "600");
        assert.equal(result.height, "600");
      })
      .catch(function(msg) { dreams.error(msg, assert, nightmare); });
  });
  t.test("dimensions: width and height can be defined", function(assert) {
    nightmare
      .chart(options)
      .config("default")
      .evaluate(function(json) {
        var background;
        chart.width(400).height(300);
        render(json);
        background = getElement(".sc-background");
        return {
          width: background.getAttribute("width"),
          height: background.getAttribute("height"),
        };
      }, json)
      .then(function(result) {
        assert.plan(2);
        assert.equal(result.width, "400");
        assert.equal(result.height, "300");
      })
      .catch(function(msg) { dreams.error(msg, assert, nightmare); });
  });

  // Tooltip tests
  t.skip("tooltips: setting tooltips to false prevents tooltip display", function(assert) {
    nightmare
      .chart(options)
      .config("default")
      .render(json)
      .evaluate(function() {
        chart.tooltips(false);
        chart.scatter.dispatch.call("elementMouseover", this, {
          id: "asfd",
          key: "test",
          value: 100,
          count: 1,
          data: null,
          series: null,
          e: {x:0, y:0}
        });
        return document.querySelector(".tooltip");
      })
      .then(function(result) {
        assert.equal(result, null);
        assert.end();
      })
      .catch(function(msg) { dreams.error(msg, assert, nightmare); });
  });
  t.skip("tooltips: dispatching elementMouseover on chart triggers tooltip", function(assert) {
    nightmare
      .chart(options)
      .config("default")
      .render(json)
      .evaluate(function() {
        var pointData = getElement(".sc-series.sc-series-0 .sc-base").__data__;
        var seriesData = getElement(".sc-series.sc-series-0").__data__;
        chart.scatter.dispatch.call("elementMouseover", this, {
          id: "asfd",
          key: "test",
          value: 100,
          count: 1,
          data: pointData,
          series: seriesData,
          e: {x: 0, y: 0},
        });
        return document.querySelector(".tooltip").getAttribute("class");
      })
      .then(function(result) {
        assert.equal(result, "sc-tooltip tooltip xy-tooltip in top");
        assert.end();
      })
      .catch(function(msg) { dreams.error(msg, assert, nightmare); });
  });
  t.skip("tooltips: dispatching elementMouseout on chart destroys tooltip", function(assert) {
    nightmare
      .chart(options)
      .config("default")
      .render(json)
      .evaluate(function() {
        var pointData = getElement(".sc-series.sc-series-0 .sc-base").__data__;
        var seriesData = getElement(".sc-series.sc-series-0").__data__;
        chart.scatter.dispatch.call("elementMouseover", this, {
          id: "asfd",
          key: "test",
          value: 100,
          count: 1,
          data: pointData,
          series: seriesData,
          e: {x: 0, y: 0},
        });
        chart.scatter.dispatch.call("elementMouseout", this);
        return document.querySelector(".tooltip");
      })
      .then(function(result) {
        assert.equal(result, null);
        assert.end();
      })
      .catch(function(msg) { dreams.error(msg, assert, nightmare); });
  });
  t.skip("tooltips: define tooltip content", function(assert) {
    nightmare
      .chart(options)
      .config("default")
      .render(json)
      .evaluate(function() {
        var pointData = getElement(".sc-series.sc-series-0 .sc-base").__data__;
        var seriesData = getElement(".sc-series.sc-series-0").__data__;
        chart.tooltipContent(function() {
          return "expected";
        });
        chart.line.dispatch.call("elementMouseover", this, {
          id: "asfd",
          key: "test",
          value: 100,
          count: 1,
          data: pointData,
          series: seriesData,
          e: {x:0, y:0}
        });
        return document.querySelector(".tooltip .tooltip-inner").innerHTML;
      })
      .then(function(result) {
        assert.equal(result, "expected");
        assert.end();
      })
      .catch(function(msg) { dreams.error(msg, assert, nightmare); });
  });

  // State tests

  // Strings tests
  t.test("strings: chart should display custom strings", function(assert) {
    nightmare
      .chart(options)
      .config("default")
      .evaluate(function(json) {
        var d, result;
        d = JSON.parse(json);
        chart.width(200).height(200).strings({
            legend: {close: "fdsa", open: "asdf"},
            controls: {close: "fdsa", open: "asdf"},
            noData: "asdf",
            noLabel: "asdf"
        });
        d.data[0].key = "";
        render(d);
        result = {
          label: getInnerHtml(".sc-legend-wrap .sc-series-0 text"),
          link: getInnerHtml(".sc-legend-wrap .sc-menu-link"),
        };
        render(null);
        result.noData = getInnerHtml(".sc-no-data");
        return result;
      }, json)
      .then(function(result) {
        assert.plan(3);
        assert.equal(result.label, "asdf");
        assert.equal(result.link, "asdf");
        assert.equal(result.noData, "asdf");
      })
      .catch(function(msg) { dreams.error(msg, assert, nightmare); });
  });

  // Localization tests
  t.test("direction: setting direction changes position of title", function(assert) {
    nightmare
      .chart(options)
      .config("default")
      .evaluate(function(json) {
        var result;
        chart.showTitle(true);
        render(json);
        result = {
          ltr: getElement(".sc-title").getAttribute("x")
        };
        chart.direction("rtl");
        render(json);
        result.rtl = getElement(".sc-title").getAttribute("x");
        return result;
      }, json)
      .then(function(result) {
        assert.plan(2);
        assert.equal(result.ltr, "0");
        assert.notEqual(result.rtl, "0");
      })
      .catch(function(msg) { dreams.error(msg, assert, nightmare); });
  });

  // Delay & Duration

  // Click tests
  t.skip("series click: setting active state of series sets active class on element", function(assert) {
    nightmare
      .chart(options)
      .config("default")
      .evaluate(function(json) {
        var d = JSON.parse(json);
        d.data[0].active = "active";
        render(d);
        return getElement(".sc-series-0").getAttribute("class");
      }, json)
      .then(function(result) {
        assert.equal(result, "sc-series sc-series-0 sc-active");
        assert.end();
      })
      .catch(function(msg) { dreams.error(msg, assert, nightmare); });
  });

  // Series Click
  // t.test("series click: dispatching elementClick on chart triggers active state", function(test) {
  //     chart.textureFill(true).seriesClick(function(eo) {
  //         chart.dataSeriesActivate(eo);
  //     });
  //     data.data[0].active = "active";
  //     render(data);
  //     chart.line.dispatch.call("elementClick", this, {
  //           id: "asfd",
  //           key: "test",
  //           value: 100,
  //           count: 1,
  //           data: data,
  //           series: data.data[0],
  //           e: {x:0, y:0}
  //         });
  //     target = getElement(".sc-series-0 .sc-texture");
  //     test.equal(dom.window.getComputedStyle(target).fillOpacity, "1");
  //     test.end();
  // });

  t.end();
});
