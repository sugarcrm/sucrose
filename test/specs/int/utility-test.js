"use strict";

const Dreams = require("../../lib/dreams.js");
const data = require("../../files/funnel_data.json");

const json = JSON.stringify(data);
const options = {
  port: 8080,
  uri: "/test/fixtures/chart.html",
  type: "charts",
  name: "pieChart",
}

const dreams = new Dreams(options);

// get new nightmare instance and wake up server
const nightmare = dreams.awaken();

// generate reports after all tests are run
dreams.sleep();

// run all tests against single nightmare instance
dreams.tests("INT: utility -", function(t) {

  // String tests
  t.test("stringSetLengths: returns an array of string lengths given an array of strings", function(assert) {
    nightmare
      .chart(options)
      .config("default")
      .render(null)
      .evaluate(function() {
        let strings = ["asdf", "qwerty", "onomatopoeia"];
        let svg = d3.select(c_);
        let format = function(d) { return d; };
        let classes = "sc-text";
        return sucrose.utility.stringSetLengths(strings, svg, format, classes);
      })
      .then(function(result) {
        assert.plan(2);
        assert.equal(result.length, 3);
        assert.equal(Number.isFinite(result[1]), true);
      })
      .catch(function(msg) { dreams.error(msg, assert, nightmare); });
  });
  t.test("stringSetThickness: retuns an array of string thicknesses given an array of strings", function(assert) {
    nightmare
      .chart(options)
      .config("default")
      .render(null)
      .evaluate(function() {
        let strings = ["asdf", "qwerty", "onomatopoeia"];
        let svg = d3.select(c_);
        let format = function(d) { return d; };
        let classes = "sc-text";
        return sucrose.utility.stringSetThickness(strings, svg, format, classes);
      })
      .then(function(result) {
        assert.plan(2);
        assert.equal(result.length, 3);
        assert.equal(Number.isFinite(result[1]), true);
      })
      .catch(function(msg) { dreams.error(msg, assert, nightmare); });
  });
  t.test("maxStringSetLength: retuns the maximum string length given an array of strings", function(assert) {
    nightmare
      .chart(options)
      .config("default")
      .render(null)
      .evaluate(function() {
        let strings = ["asdf", "qwerty", "onomatopoeia"];
        let svg = d3.select(c_);
        let format = function(d) { return d; };
        let classes = "sc-text";
        return sucrose.utility.maxStringSetLength(strings, svg, format, classes);
      })
      .then(function(result) {
        assert.equal(Number.isFinite(result), true);
        assert.end();
      })
      .catch(function(msg) { dreams.error(msg, assert, nightmare); });
  });
  t.test("stringEllipsify: retuns a string ellipsified to a specified length", function(assert) {
    nightmare
      .chart(options)
      .config("default")
      .render(null)
      .evaluate(function() {
        let string = "onomatopoeia";
        let svg = d3.select(c_);
        return sucrose.utility.stringEllipsify(string, svg, 50);
      })
      .then(function(result) {
        assert.equal(result, "onomat...");
        assert.end();
      })
      .catch(function(msg) { dreams.error(msg, assert, nightmare); });
  });
  t.test("getTextBBox: retuns the outer bound box dimensions of a string", function(assert) {
    nightmare
      .chart(options)
      .config("default")
      .render(null)
      .evaluate(function() {
        let txt = d3.select(c_).append("g").append("text");
        txt.text("TEXT");
        return {
          integers: sucrose.utility.getTextBBox(txt, false),
          floats: sucrose.utility.getTextBBox(txt, true),
        };
      })
      .then(function(result) {
        assert.plan(4);
        assert.equal(Number.isInteger(result.integers.width), true);
        assert.equal(Number.isInteger(result.integers.height), true);
        assert.equal(Number.isFinite(result.floats.width), true);
        assert.equal(Number.isFinite(result.floats.height), true);
      })
      .catch(function(msg) { dreams.error(msg, assert, nightmare); });
  });

  // Position tests
  t.test("getAbsoluteXY: retuns the absolute position of the element in the viewport", function(assert) {
    nightmare
      .chart(options)
      .config("default")
      .render(null)
      .evaluate(function() {
        let rect = d3.select(c_).append("g").append("rect");
        rect.attr("x", 100).attr("y", 50).attr("width", 100).attr("height", 50);
        return sucrose.utility.getAbsoluteXY(rect.node(), false);
      })
      .then(function(result) {
        assert.equal(result.left, 108);
        assert.equal(result.top, 58);
        assert.end();
      })
      .catch(function(msg) { dreams.error(msg, assert, nightmare); });
  });
  t.test("displayNoData: creates a no data message element and returns data exists", function(assert) {
    nightmare
      .chart(options)
      .config("default")
      .render(null)
      .evaluate(function() {
        let container = d3.select(c_);
        let label = "asdf";
        let result = {};
        result.dataYes = {
          exists: sucrose.utility.displayNoData(true, container, label, 100, 100),
          msg: getElement(".sc-no-data"),
        };
        result.dataNo = {
          exists: sucrose.utility.displayNoData(false, container, label, 100, 100),
          msg: getElement(".sc-no-data"),
        };
        return result;
      })
      .then(function(result) {
        assert.plan(4);
        assert.equal(result.dataYes.exists, false);
        assert.equal(result.dataYes.msg, null);
        assert.equal(result.dataNo.exists, true);
        assert.notEqual(result.dataNo.msg, null);
      })
      .catch(function(msg) { dreams.error(msg, assert, nightmare); });
  });

  t.end();
});
