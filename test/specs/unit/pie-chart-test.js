"use strict";

const tape = require("tape");
const sucrose = require("../../fixtures/build/sucrose.js");
const tests = require("../../lib/twine.js");

let type = "pie";

// --------------
// Pie Unit Tests

tests("UNIT: pieChart -", function(t) {
    let _chart = null;
    let _model = null;

    tape.onFinish(function() {
        t.report(type);
    });

    t.methods(type, [
        "pie", //module
        "legend", //module
        "controls", //module
    ]);

    t.beforeEach(function (assert) {
        _chart = sucrose.charts.pieChart();
        _model = _chart.pie;
        assert.end();
    });

    // Public method tests

    t.test("options: ", function(assert) {
        assert.plan(4);
        let opts = {
            width: 100,
            id: function(){return "asdf";},
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

    t.test("state: ", function(assert) {
        assert.plan(2);
        let def = {};
        assert.deepEqual(_chart.state(), def, "returns default empty 'hashmap' value");
        let val = {disabled:[]};
        _chart.state(val);
        assert.deepEqual(_chart.state(), val, "returns set value");
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
        assert.equal(classes(val, 0), "sc-series sc-series-0 sc-test", "returns data defined classes");
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
        assert.equal(classes(val, 0), "sc-series sc-series-0 sc-fill00 sc-stroke00", "returns indexed fill and stroke classes");
        t.register(assert, type);
    });
    t.test("colorData: (set as graduated) ", function(assert) {
        assert.plan(3);
        _chart.colorData("graduated", {c1: "#FFF", c2: "#000", l: 4});
        let color = _chart.color();
        let fill = _chart.fill();
        let classes = _chart.classes();
        let val = {seriesIndex: 0};
        assert.equal(color(val, 0), "rgb(255, 255, 255)", "returns graduated color");
        assert.equal(fill(val, 0), "rgb(255, 255, 255)", "returns graduated color as fill");
        assert.equal(classes(val, 0), "sc-series sc-series-0", "returns default classes");
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
        let def = true;
        assert.equal(_chart.showLegend(), def, "returns default 'boolean' value");
        let val = false;
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
    t.test("getKey: ", function(assert) {
        assert.plan(3);
        let def = _chart.getKey();
        assert.equal(typeof def, "function", "returns default function");
        assert.equal(_chart.getKey()({key: "key"}), "key", "returns set value");
        let val = function(){return "yek";};
        _chart.getKey(val);
        assert.equal(_chart.getKey()(), "yek", "returns set value");
        t.register(assert, type);
    });
    t.test("getValue: ", function(assert) {
        assert.plan(4);
        let def = _chart.getValue();
        assert.equal(typeof def, "function", "returns default function");
        assert.equal(_chart.getValue()({value: 1}), 1, "returns default function value");
        let val = function(){return 100;};
        _chart.getValue(val);
        assert.equal(_chart.getValue(), val, "returns set function");
        assert.equal(_chart.getValue()(), 100, "returns set function value");
        t.register(assert, type);
    });
    t.test("getCount: ", function(assert) {
        assert.plan(4);
        let def = _chart.getCount();
        assert.equal(typeof def, "function", "returns default function");
        assert.equal(_chart.getCount()({count: 1}), 1, "returns set value");
        let val = function(){return 100;};
        _chart.getCount(val);
        assert.equal(_chart.getCount(), val, "returns set function");
        assert.equal(_chart.getCount()(), 100, "returns set function value");
        t.register(assert, type);
    });
    t.test("fmtKey: ", function(assert) {
        assert.plan(4);
        let def = _chart.fmtKey();
        assert.equal(typeof def, "function", "returns default function");
        assert.equal(_chart.fmtKey()({key: "key"}), "key", "returns set value");
        let val = function(){return "yek";};
        _chart.fmtKey(val);
        assert.equal(_chart.fmtKey(), val, "returns set function");
        assert.equal(_chart.fmtKey()(), "yek", "returns set function value");
        t.register(assert, type);
    });
    t.test("fmtValue: ", function(assert) {
        assert.plan(3);
        let def = _chart.fmtValue();
        assert.equal(typeof def, "function", "returns default function");
        assert.equal(_chart.fmtValue()({value: 1}), 1, "returns set value");
        let val = function(){return 100;};
        _chart.fmtValue(val);
        assert.equal(_chart.fmtValue()(), 100, "returns set value");
        t.register(assert, type);
    });
    t.test("fmtCount: ", function(assert) {
        assert.plan(3);
        let def = _chart.fmtCount();
        assert.equal(typeof def, "function", "returns default function");
        assert.equal(_chart.fmtCount()({count: 1}), " (1)", "returns set value");
        let val = function(){return 100;};
        _chart.fmtCount(val);
        assert.equal(_chart.fmtCount()(), 100, "returns set value");
        t.register(assert, type);
    });
    t.test("color: ", function(assert) {
        assert.plan(5);
        let def = _chart.color();
        assert.equal(typeof def, "function", "returns default function");
        assert.equal(_chart.color()({series: {seriesIndex: 0}, seriesIndex: 0}, 0), "#1f77b4", "returns indexed color");
        assert.equal(_chart.color()({series: {seriesIndex: 0, color: "#369"}, seriesIndex: 0}, 0), "#369", "returns data defined color");
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


    t.test("showLabels: ", function(assert) {
        assert.plan(2);
        let def = true;
        assert.equal(_chart.showLabels(), def, "returns default value");
        let val = false;
        _chart.showLabels(val);
        assert.equal(_chart.showLabels(), val, "returns set value");
        t.register(assert, type);
    });
    t.test("showLeaders: ", function(assert) {
        assert.plan(2);
        let def = true;
        assert.equal(_chart.showLeaders(), def, "returns default value");
        let val = false;
        _chart.showLeaders(val);
        assert.equal(_chart.showLeaders(), val, "returns set value");
        t.register(assert, type);
    });
    t.test("donutLabelsOutside: ", function(assert) {
        assert.plan(2);
        let def = true;
        assert.equal(_chart.donutLabelsOutside(), def, "returns default value");
        let val = false;
        _chart.donutLabelsOutside(val);
        assert.equal(_chart.donutLabelsOutside(), val, "returns set value");
        t.register(assert, type);
    });
    t.test("pieLabelsOutside: ", function(assert) {
        assert.plan(2);
        let def = true;
        assert.equal(_chart.pieLabelsOutside(), def, "returns default value");
        let val = false;
        _chart.pieLabelsOutside(val);
        assert.equal(_chart.pieLabelsOutside(), val, "returns set value");
        t.register(assert, type);
    });
    t.test("labelThreshold: ", function(assert) {
        assert.plan(2);
        let def = 0.01;
        assert.equal(_chart.labelThreshold(), def, "returns default value");
        let val = 1;
        _chart.labelThreshold(val);
        assert.equal(_chart.labelThreshold(), val, "returns set value");
        t.register(assert, type);
    });
    t.test("arcDegrees: ", function(assert) {
        assert.plan(2);
        let def = 360;
        assert.equal(_chart.arcDegrees(), def, "returns default value");
        let val = 180;
        _chart.arcDegrees(val);
        assert.equal(_chart.arcDegrees(), val, "returns set value");
        t.register(assert, type);
    });
    t.test("rotateDegrees: ", function(assert) {
        assert.plan(2);
        let def = 0;
        assert.equal(_chart.rotateDegrees(), def, "returns default value");
        let val = 45;
        _chart.rotateDegrees(val);
        assert.equal(_chart.rotateDegrees(), val, "returns set value");
        t.register(assert, type);
    });
    t.test("minRadius: ", function(assert) {
        assert.plan(2);
        let def = 75;
        assert.equal(_chart.minRadius(), def, "returns default value");
        let val = 0;
        _chart.minRadius(val);
        assert.equal(_chart.minRadius(), val, "returns set value");
        t.register(assert, type);
    });
    t.test("maxRadius: ", function(assert) {
        assert.plan(2);
        let def = 250;
        assert.equal(_chart.maxRadius(), def, "returns default value");
        let val = 0;
        _chart.maxRadius(val);
        assert.equal(_chart.maxRadius(), val, "returns set value");
        t.register(assert, type);
    });
    t.test("fixedRadius: ", function(assert) {
        assert.plan(3);
        let def = _chart.fixedRadius();
        assert.equal(typeof def, "function", "returns default function");
        let val = function(){return 100;};
        _chart.fixedRadius(val);
        assert.equal(_chart.fixedRadius()(), 100, "returns set value");
        _chart.fixedRadius(10);
        assert.equal(_chart.fixedRadius()(), 10, "returns set value");
        t.register(assert, type);
    });
    t.test("startAngle: ", function(assert) {
        assert.plan(2);
        let def = _chart.startAngle();
        assert.equal(typeof def, "function", "returns default function");
        let val = function(){return 100;};
        _chart.startAngle(val);
        assert.equal(_chart.startAngle()(), 100, "returns set value");
        t.register(assert, type);
    });
    t.test("endAngle: ", function(assert) {
        assert.plan(2);
        let def = _chart.endAngle();
        assert.equal(typeof def, "function", "returns default function");
        let val = function(){return 100;};
        _chart.endAngle(val);
        assert.equal(_chart.endAngle()(), 100, "returns set value");
        t.register(assert, type);
    });
    t.test("donut: ", function(assert) {
        assert.plan(2);
        let def = false;
        assert.equal(_chart.donut(), def, "returns default value");
        let val = true;
        _chart.donut(val);
        assert.equal(_chart.donut(), val, "returns set value");
        t.register(assert, type);
    });
    t.test("hole: ", function(assert) {
        assert.plan(2);
        let def = false;
        assert.equal(_chart.hole(), def, "returns default value");
        let val = true;
        _chart.hole(val);
        assert.equal(_chart.hole(), val, "returns set value");
        t.register(assert, type);
    });
    t.test("holeFormat: ", function(assert) {
        assert.plan(3);
        let def = _chart.holeFormat();
        assert.equal(typeof def, "function", "returns default function");
        let val = 10;
        _chart.holeFormat(val);
        assert.equal(_chart.holeFormat()(), val, "returns set value");
        _chart.holeFormat(function(){return 111;});
        assert.equal(_chart.holeFormat()(), 111, "returns set value");
        t.register(assert, type);
    });
    t.test("donutRatio: ", function(assert) {
        assert.plan(2);
        let def = 0.447;
        assert.equal(_chart.donutRatio(), def, "returns default value");
        let val = 0.5;
        _chart.donutRatio(val);
        assert.equal(_chart.donutRatio(), val, "returns set value");
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
    t.test("gradient: ", function(assert) {
        assert.plan(2);
        let def = _chart.gradient();
        let crg = sucrose.utility.colorRadialGradient;
        assert.equal(def, crg, "returns colorRadialGradient by default");
        let val = function(){return 1;};
        _chart.gradient(val);
        assert.equal(_chart.gradient(), val, "returns set function");
        t.register(assert, type);
    });
    t.test("locality: ", function(assert) {
        assert.plan(2);
        let def = _chart.locality();
        let expected = {
            "decimal": ".",
            "thousands": ",",
            "grouping": [3],
            "currency": ["$", ""],
            "periods": ["AM", "PM"],
            "days": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            "shortDays": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
            "months": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
            "shortMonths": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            "date": "%b %-d, %Y", //defines %x
            "time": "%-I:%M:%S %p", //defines %X
            "dateTime": "%B %-d, %Y at %X GMT%Z", //defines %c
            // Custom patterns
            "full": "%A, %c",
            "long": "%c",
            "medium": "%x, %X",
            "short": "%-m/%-d/%y, %-I:%M %p",
            "yMMMEd": "%a, %x",
            "yMEd": "%a, %-m/%-d/%Y",
            "yMMMMd": "%B %-d, %Y",
            "yMMMd": "%x",
            "yMd": "%-m/%-d/%Y",
            "yMMMM": "%B %Y",
            "yMMM": "%b %Y",
            "MMMd": "%b %-d",
            "MMMM": "%B",
            "MMM": "%b",
            "y": "%Y"
        };
        assert.deepEqual(def, expected, "returns locality settings hashmap by default");
        let val = {
            "decimal": ",",
            "thousands": " ",
        };
        _chart.locality(val);
        let mod = _chart.locality();
        expected = {
            "decimal": ",",
            "thousands": " ",
            "grouping": [3],
            "currency": ["$", ""],
            "periods": ["AM", "PM"],
            "days": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            "shortDays": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
            "months": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
            "shortMonths": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            "date": "%b %-d, %Y", //defines %x
            "time": "%-I:%M:%S %p", //defines %X
            "dateTime": "%B %-d, %Y at %X GMT%Z", //defines %c
            // Custom patterns
            "full": "%A, %c",
            "long": "%c",
            "medium": "%x, %X",
            "short": "%-m/%-d/%y, %-I:%M %p",
            "yMMMEd": "%a, %x",
            "yMEd": "%a, %-m/%-d/%Y",
            "yMMMMd": "%B %-d, %Y",
            "yMMMd": "%x",
            "yMd": "%-m/%-d/%Y",
            "yMMMM": "%B %Y",
            "yMMM": "%b %Y",
            "MMMd": "%b %-d",
            "MMMM": "%B",
            "MMM": "%b",
            "y": "%Y"
        };
        assert.deepEqual(mod, expected, "returns set function");
        t.register(assert, type);
    });

    t.end();
});
