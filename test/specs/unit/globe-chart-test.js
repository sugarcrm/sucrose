"use strict";

const tape = require("tape");
const sucrose = require("../../fixtures/build/sucrose.js");
const tests = require("../../lib/twine.js");

let type = "globe";

// ----------------
// Globe Unit Tests

tests("UNIT: globeChart -", function(t) {
    let _chart = null;

    tape.onFinish(function() {
        t.report(type);
    });

    t.methods(type, [
        "projection", //d3 module
        "graticule", //d3 module
        "path", //d3 module
    ]);

    t.beforeEach(function (assert) {
        _chart = sucrose.charts.globeChart();
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
                noLabel: 'there is no label'
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
        let def = {top: 0, right: 0, bottom: 0, left: 0};
        assert.deepEqual(_chart.margin(), def, "returns default value");
        let val = {top: 1, right: 1, bottom: 1, left: 1};
        _chart.margin(val);
        assert.deepEqual(_chart.margin(), val, "returns set value");
        t.register(assert, type);
    });

    t.test("width: ", function(assert) {
        assert.plan(2);
        let def = null;
        assert.equal(_chart.width(), def, "returns default value");
        let val = 600;
        _chart.width(val);
        assert.equal(_chart.width(), val, "returns set value");
        t.register(assert, type);
    });

    t.test("height: ", function(assert) {
        assert.plan(2);
        let def = null;
        assert.equal(_chart.height(), def, "returns default value");
        let val = 600;
        _chart.height(val);
        assert.equal(_chart.height(), val, "returns set value");
        t.register(assert, type);
    });

    t.test("tooltips: ", function(assert) {
        assert.plan(2);
        let def = true;
        assert.equal(_chart.tooltips(), def, "returns default value");
        let val = false;
        _chart.tooltips(val);
        assert.equal(_chart.tooltips(), val, "returns set value");
        t.register(assert, type);
    });

    t.test("tooltipContent: ", function(assert) {
        assert.plan(2);
        var def = _chart.tooltipContent();
        assert.equal(typeof def, "function", "returns default function");
        let val = function(){return "asdf";};
        _chart.tooltipContent(val);
        assert.equal(_chart.tooltipContent(), val, "returns set value");
        t.register(assert, type);
    });

    t.test("state: ", function(assert) {
        assert.plan(2);
        let def = {};
        assert.deepEqual(_chart.state(), def, "returns default value");
        let val = {disabled:[]};
        _chart.state(val);
        assert.deepEqual(_chart.state(), val, "returns set value");
        t.register(assert, type);
    });

    // not testable as the color is based on an interpolation on data
    // element amount relative to total amount which is calucalted at runtime
    t.skip("colorData: (set as data) ", function(assert) {
        assert.plan(3);
        _chart.colorData("data", {c1: "#FFF", c2: "#000", l: 4});
        let color = _chart.color({amount: 100});
        let fill = _chart.fill({amount: 100});
        let classes = _chart.classes();
        let val = {seriesIndex: 0, color: "#369", classes: "sc-test"};
        assert.equal(color(val, 0), "#369", "returns data defined color");
        assert.equal(fill(val, 0), "#369", "returns data defined color as fill");
        assert.equal(classes(val, 0), "sc-country-0 sc-test", "returns data defined classes");
        t.register(assert, type);
    });
    t.test("colorData: (set as class) ", function(assert) {
        assert.plan(3);
        _chart.colorData("class");
        let color = _chart.color();
        let fill = _chart.fill();
        let classes = _chart.classes();
        let val = {seriesIndex: 0};
        assert.equal(color(val, 0), "", "returns inherit color");
        assert.equal(fill(val, 0), "", "returns inherit fill");
        assert.equal(classes(val, 0), "sc-country-0 sc-fill00", "returns indexed fill and stroke classes");
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
        assert.equal(classes(val, 0), "sc-country-0", "returns default classes");
        t.register(assert, type);
    });

    // Masks header module
    t.test("strings: ", function(assert) {
        assert.plan(2);
        let def = {
            legend: {close: 'Hide legend', open: 'Show legend'},
            controls: {close: 'Hide controls', open: 'Show controls'},
            noData: 'No Data Available.',
            noLabel: 'undefined'
        };
        assert.deepEqual(_chart.strings(), def, "returns default value");
        let val = {
            legend: {close: "fdsa", open: "asdf"},
            controls: {close: "fdsa", open: "asdf"},
            noData: "asdf",
            noLabel: "asdf"
        };
        _chart.strings(val);
        assert.deepEqual(_chart.strings(), val, "returns set value");
        t.register(assert, type);
    });

    // Composed from header module
    t.test("showTitle: ", function(assert) {
        assert.plan(2);
        let def = false;
        assert.equal(_chart.showTitle(), def, "returns default value");
        let val = true;
        _chart.showTitle(val);
        assert.equal(_chart.showTitle(), val, "returns set value");
        t.register(assert, type);
    });

    // Masks model method
    t.test("direction: ", function(assert) {
        assert.plan(2);
        let def = "ltr";
        assert.equal(_chart.direction(), def, "returns default value");
        let val = "rtl";
        _chart.direction(val);
        assert.equal(_chart.direction(), val, "returns set value");
        t.register(assert, type);
    });

    // Composed from model
    t.test("id: ", function(assert) {
        assert.plan(2);
        let def = _chart.id();
        assert.equal(Number.isInteger(def), true, "returns default value");
        let val = 12345;
        _chart.id(val);
        assert.equal(_chart.id(), val, "returns set value");
        t.register(assert, type);
    });
    t.test("color: ", function(assert) {
        assert.plan(5);
        let def = _chart.color();
        assert.equal(typeof def, "function", "returns default function");
        assert.equal(_chart.color()({seriesIndex: 0}, 0), "#1f77b4", "returns set value");
        assert.equal(_chart.color()({color: "#369"}, 0), "#369", "returns set value");
        let val = function(){return "#000";};
        _chart.color(val);
        assert.equal(_chart.color(), val, "returns set value");
        assert.equal(_chart.color()(), "#000", "returns set value");
        t.register(assert, type);
    });
    t.test("fill: ", function(assert) {
        assert.plan(3);
        let def = _chart.fill();
        assert.equal(typeof def, "function", "returns default function");
        let val = function(){return "#000";};
        _chart.fill(val);
        assert.equal(_chart.fill(), val, "returns set value");
        assert.equal(_chart.fill()(), "#000", "returns set value");
        t.register(assert, type);
    });
    t.test("classes: ", function(assert) {
        assert.plan(3);
        let def = _chart.classes();
        assert.equal(typeof def, "function", "returns default function");
        let val = function(){return "sc-class";};
        _chart.classes(val);
        assert.equal(_chart.classes(), val, "returns set value");
        assert.equal(_chart.classes()(), "sc-class", "returns set value");
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
    t.test("autoSpin: ", function(assert) {
        assert.plan(2);
        let def = false;
        assert.equal(_chart.autoSpin(), def, "returns default value");
        let val = true;
        _chart.autoSpin(val);
        assert.equal(_chart.autoSpin(), val, "returns set value");
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

    t.test("worldMap: ", function(assert) {
        assert.plan(2);
        let def = [];
        assert.deepEqual(_chart.worldMap(), def, "returns default value");
        let val = [
            {
              "type": "Feature",
              "id": "AFG",
              "properties": {
                "name": "Afghanistan",
                "iso_a3": "AFG",
                "mapcolor13": 7
              },
              "geometry": {
                "type": "Polygon",
                "coordinates": [
                  [
                    [
                      61.22412241224123,
                      35.64481603660366
                    ],
                    [
                      60.54005400540055,
                      33.68242982898289
                    ],
                    [
                      61.22412241224123,
                      35.64481603660366
                    ]
                  ]
                ]
              }
            }
        ];
        _chart.worldMap(val);
        assert.equal(_chart.worldMap(), val, "returns set value");
        t.register(assert, type);
    });
    t.test("countryMap: ", function(assert) {
        assert.plan(2);
        let def = {};
        assert.deepEqual(_chart.countryMap(), def, "returns default value");
        let val = {
            "USA": {
              "type": "Feature",
              "id": "US-MN",
              "properties": {
                "name": "Minnesota",
                "postal": "MN",
                "sr_adm0_a3": "USA"
              },
              "geometry": {
                "type": "Polygon",
                "coordinates": [
                  [
                    [
                      -89.52556826056825,
                      47.96123795170557
                    ],
                    [
                      -89.48363348684971,
                      48.013684769964335
                    ],
                    [
                      -89.52556826056825,
                      47.96123795170557
                    ]
                  ]
                ]
              }
            }
        };
        _chart.countryMap(val);
        assert.equal(_chart.countryMap(), val, "returns set value");
        t.register(assert, type);
    });
    t.test("countryLabels: ", function(assert) {
        assert.plan(2);
        let def = {};
        assert.deepEqual(_chart.countryLabels(), def, "returns default value");
        let val = {
            "142": "Asia",
            "143": "Central Asia",
            "145": "Western Asia",
            "150": "Europe"
        };
        _chart.countryLabels(val);
        assert.equal(_chart.countryLabels(), val, "returns set value");
        t.register(assert, type);
    });
    t.test("gradient: ", function(assert) {
        assert.plan(2);
        let def = _chart.gradient();
        assert.equal(def, null, "returns null by default");
        let val = function(){return 1;};
        _chart.gradient(val);
        assert.equal(_chart.gradient(), val, "returns set function");
        t.register(assert, type);
    });

    t.end();
});
