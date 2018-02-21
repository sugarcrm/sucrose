"use strict";

const tape = require("tape");
const sucrose = require("../../fixtures/build/sucrose.js");
const tests = require("../../lib/twine.js");

let type = "treemap";

// ------------------
// Treemap Unit Tests

tests("UNIT: treemapChart -", function(t) {
    let _chart = null;
    let _model = null;

    tape.onFinish(function() {
        t.report(type);
    });

    t.methods(type, [
        "treemap", //module
        "legend", //module
    ]);

    t.beforeEach(function (assert) {
        _chart = sucrose.charts.treemapChart();
        _model = _chart.treemap;
        assert.end();
    });

    // Public method tests

    t.test("options: ", function(assert) {
        assert.plan(4);
        let opts = {
            width: 100,
            id: function(){ return "asdf"; },
            showTitle: false,
            strings: {
                noLabel: "there is no label"
            }
        };
        _chart.options(opts);
        assert.equal(_chart.width(), opts.width, "returns width value set by options");
        assert.equal(_chart.id(), opts.id, "returns id value set by options");
        assert.equal(_chart.showTitle(), opts.showTitle, "returns showTitle value set by options");
        assert.equal(_chart.strings().noLabel, opts.strings.noLabel, "returns string value set by options");
        t.register(assert, type);
    });

    t.test("margin: ", function(assert) {
        assert.plan(2);
        let def = {top: 10, right: 10, bottom: 10, left: 10};
        assert.deepEqual(_chart.margin(), def, "returns default 'hashmap' values");
        let val = {top: 1, right: 1, bottom: 1, left: 1};
        _chart.margin(val);
        assert.deepEqual(_chart.margin(), val, "returns set value");
        t.register(assert, type);
    });

    t.test("width: ", function(assert) {
        assert.plan(2);
        let def = null;
        assert.equal(_chart.width(), def, "returns default 'null' value");
        let val = 600;
        _chart.width(val);
        assert.equal(_chart.width(), val, "returns set value");
        t.register(assert, type);
    });

    t.test("height: ", function(assert) {
        assert.plan(2);
        let def = null;
        assert.equal(_chart.height(), def, "returns default 'null' value");
        let val = 600;
        _chart.height(val);
        assert.equal(_chart.height(), val, "returns set value");
        t.register(assert, type);
    });

    t.test("tooltips: ", function(assert) {
        assert.plan(2);
        let def = true;
        assert.equal(_chart.tooltips(), def, "returns default 'boolean' value");
        let val = false;
        _chart.tooltips(val);
        assert.equal(_chart.tooltips(), val, "returns set value");
        t.register(assert, type);
    });

    t.test("tooltipContent: ", function(assert) {
        assert.plan(3);
        var def = _chart.tooltipContent();
        assert.equal(typeof def, "function", "returns default function");
        let val = function(){return "asdf";};
        _chart.tooltipContent(val);
        assert.equal(_chart.tooltipContent(), val, "returns set function");
        assert.equal(_chart.tooltipContent()(), "asdf", "returns set function value");
        t.register(assert, type);
    });

    t.test("colorData: (set as data) ", function(assert) {
        assert.plan(3);
        _chart.colorData("data");
        let color = _chart.color();
        let fill = _chart.fill();
        let classes = _chart.classes();
        let val = {seriesIndex: 0, color: "#369", classes: "sc-test"};
        assert.equal(color(val, 0), "#369", "returns data defined color");
        assert.equal(fill(val, 0), "#369", "returns data defined color as fill");
        assert.equal(classes(val, 0), "sc-child", "returns data defined classes");
        t.register(assert, type);
    });
    t.test("colorData: (set as class) ", function(assert) {
        assert.plan(3);
        _chart.colorData("class");
        let color = _chart.color();
        let fill = _chart.fill();
        let classes = _chart.classes();
        let val = {seriesIndex: 0};
        assert.equal(color(val, 0), "inherit", "returns inherit color");
        assert.equal(fill(val, 0), "inherit", "returns inherit fill");
        assert.equal(classes(val, 0), "sc-child sc-fill00", "returns indexed fill and stroke classes");
        t.register(assert, type);
    });
    t.test("colorData: (set as graduated) ", function(assert) {
        assert.plan(3);
        _chart.colorData("graduated", {c1: "#FFF", c2: "#000", l: 4});
        let color = _chart.color();
        let fill = _chart.fill();
        let classes = _chart.classes();
        let val = {seriesIndex: 0};
        // treemap chart type requires passing data length as third argument
        // and the method uses the index instead of seriesIndex
        assert.equal(color(val, 0, 4), "rgb(255, 255, 255)", "returns graduated color");
        assert.equal(fill(val, 0, 4), "rgb(255, 255, 255)", "returns graduated color as fill");
        assert.equal(classes(val, 0), "sc-child", "returns default classes");
        t.register(assert, type);
    });

    // Masks header module
    t.test("strings: ", function(assert) {
        assert.plan(7);
        let def = {
            legend: {close: "Hide legend", open: "Show legend"},
            noData: "No Data Available.",
            noLabel: "undefined"
        };
        let defaultStrings = _chart.strings();
        assert.deepEqual(defaultStrings.legend, def.legend, "returns default 'hashmap' value legend");
        assert.equal(defaultStrings.noData, def.noData, "returns default 'hashmap' value noData");
        assert.equal(defaultStrings.noLabel, "undefined", "returns default 'hashmap' value noLabel");
        let val = {
            legend: {close: "fdsa", open: "asdf"},
            controls: {close: "fdsa", open: "asdf"},
            noData: "asdf",
            noLabel: "asdf"
        };
        _chart.strings(val);
        let modifiedStrings = _chart.strings();
        assert.deepEqual(modifiedStrings.legend, val.legend, "returns set value");
        assert.equal(modifiedStrings.noData, val.noData, "returns set value");
        assert.equal(modifiedStrings.noLabel, val.noLabel, "returns set value");
        assert.deepEqual(_chart.legend.strings(), val.legend, "legend returns set value");
        t.register(assert, type);
    });

    // Composed from header module
    t.test("showTitle: ", function(assert) {
        assert.plan(2);
        let def = true;
        assert.equal(_chart.showTitle(), def, "returns default 'boolean' value");
        let val = false;
        _chart.showTitle(val);
        assert.equal(_chart.showTitle(), val, "returns set value");
        t.register(assert, type);
    });
    t.test("showControls: ", function(assert) {
        assert.plan(2);
        let def = false;
        assert.equal(_chart.showControls(), def, "returns default 'boolean' value");
        let val = true;
        _chart.showControls(val);
        assert.equal(_chart.showControls(), val, "returns set value");
        t.register(assert, type);
    });
    t.test("showLegend: ", function(assert) {
        assert.plan(2);
        let def = false;
        assert.equal(_chart.showLegend(), def, "returns default 'boolean' value");
        let val = true;
        _chart.showLegend(val);
        assert.equal(_chart.showLegend(), val, "returns set value");
        t.register(assert, type);
    });

    // Masks model method
    t.test("direction: ", function(assert) {
        assert.plan(4);
        let def = "ltr";
        assert.equal(_chart.direction(), def, "returns default 'string' value");
        assert.equal(_model.direction(), def, "model returns default 'string' value");
        let val = "rtl";
        _chart.direction(val);
        assert.equal(_chart.direction(), val, "returns set value");
        assert.equal(_model.direction(), val, "model returns set value");
        t.register(assert, type);
    });
    t.test("duration: ", function(assert) {
        assert.plan(4);
        let def = 0;
        assert.equal(_chart.duration(), def, "returns default 'integer' value");
        assert.equal(_model.duration(), def, "model returns default 'integer' value");
        let val = 500;
        _chart.duration(val);
        assert.equal(_chart.duration(), val, "returns set value");
        assert.equal(_model.duration(), val, "model returns set value");
        t.register(assert, type);
    });
    t.test("delay: ", function(assert) {
        assert.plan(4);
        let def = 0;
        assert.equal(_chart.delay(), def, "returns default 'integer' value");
        assert.equal(_model.delay(), def, "model returns default 'integer' value");
        let val = 500;
        _chart.delay(val);
        assert.equal(_chart.delay(), val, "returns set value");
        assert.equal(_model.delay(), val, "model returns set value");
        t.register(assert, type);
    });

    // Composed from model
    t.test("id: ", function(assert) {
        assert.plan(2);
        let def = _chart.id();
        assert.equal(Number.isInteger(def), true, "returns default 'integer' value");
        let val = 12345;
        _chart.id(val);
        assert.equal(_chart.id(), val, "returns set value");
        t.register(assert, type);
    });
    t.test("color: ", function(assert) {
        assert.plan(5);
        let def = _chart.color();
        assert.equal(typeof def, "function", "returns default function");
        assert.deepEqual(_chart.color()({seriesIndex: 0}, 0), { b: 180, g: 119, opacity: 0.6, r: 31 }, "returns indexed color");
        _chart.colorData("data");
        assert.equal(_chart.color()({color: "#369"}, 0), "#369", "returns data defined color");
        let val = function(){return "#000";};
        _chart.color(val);
        assert.equal(_chart.color(), val, "returns set function");
        assert.equal(_chart.color()(), "#000", "returns set function value");
        t.register(assert, type);
    });
    t.test("fill: ", function(assert) {
        assert.plan(3);
        let def = _chart.fill();
        assert.equal(typeof def, "function", "returns default function");
        let val = function(){return "#000";};
        _chart.fill(val);
        assert.equal(_chart.fill(), val, "returns set function");
        assert.equal(_chart.fill()(), "#000", "returns set function value");
        t.register(assert, type);
    });
    t.test("classes: ", function(assert) {
        assert.plan(3);
        let def = _chart.classes();
        assert.equal(typeof def, "function", "returns default function");
        let val = function(){return "sc-class";};
        _chart.classes(val);
        assert.equal(_chart.classes(), val, "returns set function");
        assert.equal(_chart.classes()(), "sc-class", "returns set function value");
        t.register(assert, type);
    });

    t.test("leafClick: ", function(assert) {
        assert.plan(2);
        let def = _chart.leafClick();
        assert.equal(typeof def, "function", "returns default function");
        let val = function() {return true;};
        _chart.leafClick(val);
        assert.equal(_chart.leafClick(), val, "returns set value");
        t.register(assert, type);
    });
    t.test("seriesClick: ", function(assert) {
        assert.plan(3);
        var def = _chart.seriesClick();
        assert.equal(typeof def, "function", "returns default function");
        assert.equal(typeof _chart.seriesClick()(), "undefined", "returns default function value");
        let val = function(){return "asdf";};
        _chart.seriesClick(val);
        assert.equal(_chart.seriesClick(), val, "returns set function");
        t.register(assert, type);
    });
    t.test("textureFill: ", function(assert) {
        assert.plan(2);
        let def = false;
        assert.equal(_chart.textureFill(), def, "returns default value");
        let val = true;
        _chart.textureFill(val);
        assert.equal(_chart.textureFill(), val, "returns set value");
        t.register(assert, type);
    });
    t.test("getKey: ", function(assert) {
        assert.plan(3);
        let def = _chart.getKey();
        assert.equal(typeof def, "function", "returns default function");
        assert.equal(_chart.getKey()({name: "key"}), "key", "returns set value");
        let val = function(){return "yek";};
        _chart.getKey(val);
        assert.equal(_chart.getKey()(), "yek", "returns set value");
        t.register(assert, type);
    });
    t.test("getValue: ", function(assert) {
        assert.plan(3);
        let def = _chart.getValue();
        assert.equal(typeof def, "function", "returns default function");
        assert.equal(_chart.getValue()({size: 1}), 1, "returns set value");
        let val = function(){return 100;};
        _chart.getValue(val);
        assert.equal(_chart.getValue()(), 100, "returns set value");
        t.register(assert, type);
    });
    t.test("gradient: ", function(assert) {
        assert.plan(2);
        let def = _chart.gradient();
        let clg = sucrose.utility.colorLinearGradient;
        assert.equal(def, clg, "returns colorLinearGradient by default");
        let val = function(){return 1;};
        _chart.gradient(val);
        assert.equal(_chart.gradient(), val, "returns set function");
        t.register(assert, type);
    });

    t.end();
});
