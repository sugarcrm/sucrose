"use strict";

const tape = require("tape");
const tapes = require("tapes");
const tests = tapes(tape);

const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const d3 = require("../../fixtures/build/d3.min.js");
const sucrose = require("../../fixtures/build/sucrose.js");
const data = require("../../files/pie_data.json");
const json = JSON.stringify(data);

// DOM tests
tests("DOM: pieChart -", function (t) {
    let target;
    let chart;
    let data;
    let dom;
    let c_;
    let s;

    function getElement(selector) {
        return c_.querySelector(selector) || dom.window.document.createElement("div");
    }

    function getInnerHtml(selector) {
        var element = c_.querySelector(selector);
        return (element) ? element.innerHTML : "";
    }

    // FINALLY!
    t.beforeEach(function (t) {
        // do some set up for each test
        target = null;
        chart = sucrose.charts.pieChart().colorData("default");
        data = JSON.parse(json);
        // eslint-disable-next-line quotes
        // dom = new JSDOM('<!DOCTYPE html><div id="c_"><svg class="sucrose sc-chart"></svg></div>');
        dom = new JSDOM('<!DOCTYPE html><div id="c_"></div>');

        global.window = dom.window;
        global.document = global.window.document;
        global.navigator = global.window.navigator;

        // jsdom 11.3.0 breaks SVG DOM manipulation.
        // stick with 11.2.0 or change selector below to #c_ and let d3 modify the HTML DOM.
        // Its not valid SVG but these are DOM manipulation unit tests.
        // c_ = dom.window.document.querySelector("#c_ .sucrose");
        c_ = dom.window.document.querySelector("#c_");
        s = d3.select(c_).append("svg").attr("class", "sucrose sc-chart");
        t.end();
    });

    t.afterEach(function (t) {
        // do some tear down for each test
        s = null;
        c_ = null;
        dom = null;
        data = null;
        chart = null;
        target = null;
        t.end();
    });

    t.test("data: renders no data message if data is empty", function(assert) {
        s.datum([]).call(chart);
        target = getElement(".sc-no-data");
        assert.equal(target.innerHTML, "No Data Available.");
        assert.end();
    });
    t.test("data: does not render no data message if data is not empty", function(assert) {
        s.datum(data).call(chart);
        target = c_.querySelector(".sc-no-data");
        assert.equal(target, null);
        assert.end();
    });
    t.test("data: renders chart if data is not empty", function(assert) {
        s.datum(data).call(chart);
        target = getElement(".sc-chart-pie");
        assert.ok(target);
        assert.end();
    });

    // Title
    t.test("title: renders title by default", function(assert) {
        s.datum(data).call(chart);
        target = getInnerHtml(".sc-title-wrap text");
        assert.equal(target, "Test pie chart");
        assert.end();
    });
    t.test("title: does not render title if no title in properties", function(assert) {
        chart.showTitle(true);
        delete data.properties.title;
        s.datum(data).call(chart);
        target = getInnerHtml(".sc-title-wrap");
        assert.equal(target, "");
        assert.end();
    });
    t.test("title: does not render title if showTitle set to 'false'", function(assert) {
        chart.showTitle(false);
        s.datum(data).call(chart);
        target = getInnerHtml(".sc-title");
        assert.equal(target, "");
        assert.end();
    });

    // Menues
    t.test("menu: renders legend by default", function(assert) {
        s.datum(data).call(chart);
        target = getElement(".sc-legend-wrap");
        assert.notEqual(target.innerHTML, "");
        assert.end();
    });
    t.test("menu: does not render legend if showLegend set to 'false'", function(assert) {
        chart.showLegend(false);
        s.datum(data).call(chart);
        target = getElement(".sc-legend-wrap");
        assert.equal(target.innerHTML, "");
        assert.end();
    });
    t.test("menu: does not render controls ever", function(assert) {
        s.datum(data).call(chart);
        target = c_.querySelector(".sc-controls-wrap").innerHTML;
        assert.equal(target, "");
        assert.end();
    });

    // Color
    t.test("color: palette is category20 by default", function(assert) {
        s.datum(data).call(chart);
        target = getElement(".sc-series-0");
        assert.equal(target.getAttribute("class"), "sc-series sc-series-0");
        assert.equal(target.getAttribute("fill"), "#1f77b4");
        assert.end();
    });
    t.test("color: palette uses classnames if colorData set to 'class'", function(assert) {
        chart.colorData("class");
        s.datum(data).call(chart);
        target = getElement(".sc-series-0");
        assert.equal(target.getAttribute("class"), "sc-series sc-series-0 sc-fill00 sc-stroke00");
        assert.equal(target.getAttribute("fill"), "inherit");
        assert.end();
    });
    t.test("color: palette controlled by color attribute of series Data", function(assert) {
        chart.colorData("data");
        data.data[0].color = "#000";
        s.datum(data).call(chart);
        target = getElement(".sc-series-0");
        assert.equal(target.getAttribute("class"), "sc-series sc-series-0");
        assert.equal(target.getAttribute("fill"), "#000");
        assert.end();
    });
    t.test("color: palette graduated on gray scale", function(assert) {
        chart.colorData("graduated", {c1: "#FFF", c2: "#000", l: 4});
        data.data[0].color = "#000";
        s.datum(data).call(chart);
        target = getElement(".sc-series-0");
        assert.equal(target.getAttribute("fill"), "rgb(255, 255, 255)");
        target = getElement(".sc-series-3");
        assert.equal(target.getAttribute("fill"), "rgb(64, 64, 64)");
        assert.end();
    });

    // Dimensions
    t.test("dimensions: margins can be defined", function(assert) {
        chart.margin({top: 20, right: 10, bottom: 30, left: 40});
        s.datum(data).call(chart);
        target = getElement(".sc-background");
        assert.equal(target.getAttribute("x"), "-40");
        assert.equal(target.getAttribute("y"), "-20");
        target = getElement(".sc-chart-wrap");
        assert.equal(target.getAttribute("transform"), "translate(40,20)");
        assert.end();
    });
    t.test("dimensions: default to fixed dimensions if outer container is indeterminate", function(assert) {
        s.datum(data).call(chart);
        target = getElement(".sc-background");
        assert.equal(target.getAttribute("width"), "960");
        assert.equal(target.getAttribute("height"), "400");
        assert.end();
    });
    t.test("dimensions: width and height can be defined", function(assert) {
        assert.plan(2);
        chart.width(400).height(300);
        s.datum(data).call(chart);
        target = getElement(".sc-background");
        assert.equal(target.getAttribute("width"), "400");
        assert.equal(target.getAttribute("height"), "300");
    });

    // State

    // Strings
    t.test("strings: chart should display custom strings", function(assert) {
        assert.plan(3);
        chart.width(200).height(200).strings({
            legend: {close: "fdsa", open: "asdf"},
            controls: {close: "fdsa", open: "asdf"},
            noData: "asdf",
            noLabel: "asdf"
        });
        data.data[0].key = "";
        s.datum(data).call(chart);
        target = getElement(".sc-series-0 .sc-label text");
        assert.equal(target.innerHTML, "asdf");

        target = getElement(".sc-legend-wrap .sc-menu-link");
        assert.equal(target.innerHTML, "asdf");

        s.datum([]).call(chart);
        target = getElement(".sc-no-data");
        assert.equal(target.innerHTML, "asdf");
    });

    // Direction
    t.test("direction: setting direction changes position of title", function(assert) {
        assert.plan(2);
        chart.showTitle(true);
        s.datum(data).call(chart);
        target = getElement(".sc-title");
        assert.equal(target.getAttribute("x"), "0");

        chart.direction("rtl");
        s.datum(data).call(chart);
        target = getElement(".sc-title");
        assert.notEqual(target.getAttribute("x"), "0");
    });

    // Texture fill
    t.test("texture fill: texture fill elements are not rendered by default", function(assert) {
        s.datum(data).call(chart);
        target = c_.querySelector(".sc-series-0 .sc-texture");
        assert.equal(target, null);
        assert.end();
    });
    t.test("texture fill: setting texture fill to true renders texture elements", function(assert) {
        chart.textureFill(true);
        s.datum(data).call(chart);
        target = getElement(".sc-series-0 .sc-texture");
        assert.notEqual(target, null);
        assert.end();
    });
    t.test("series click: setting active state of series sets active class on element", function(assert) {
        chart.textureFill(true);
        data.data[0].active = "active";
        s.datum(data).call(chart);
        target = getElement(".sc-series-0");
        assert.equal(target.getAttribute("class"), "sc-series sc-series-0 sc-active");
        assert.end();
    });

    t.end();
});
