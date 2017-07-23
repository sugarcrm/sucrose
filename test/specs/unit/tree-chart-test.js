"use strict";

const tape = require("tape");
const sucrose = require("../../fixtures/build/sucrose.js");
const tests = require("../../lib/twine.js");

let type = "tree";

// ---------------
// Tree Unit Tests

tests("UNIT: treeChart -", function(t) {
    let _chart = null;
    let _model = null;

    tape.onFinish(function() {
        t.report(type);
    });

    t.methods(type, []);

    t.beforeEach(function (assert) {
        _chart = sucrose.charts.treeChart();
        _model = _chart.tree;
        assert.end();
    });

    // Public method tests

    t.test("options: ", function(assert) {
        assert.plan(4);
        let opts = {
            width: 100,
            id: function(){return "asdf";},
            showLabels: false,
            zoomExtents: {"min": 123, "max": 987}
        };
        _chart.options(opts);
        assert.equal(_chart.width(), opts.width, "returns width value set by options");
        assert.equal(_chart.id(), opts.id, "returns id value set by options");
        assert.equal(_chart.showLabels(), opts.showLabels, "returns showLabels value set by options");
        assert.equal(_chart.zoomExtents().min, opts.zoomExtents.min, "returns string value set by options");
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

    t.test("id: ", function(assert) {
        assert.plan(2);
        let def = _chart.id();
        assert.equal(Number.isInteger(def), true, "returns default 'integer' value");
        let val = 12345;
        _chart.id(val);
        assert.equal(_chart.id(), val, "returns set value");
        t.register(assert, type);
    });

    t.test("x: ", function(assert) {
        assert.plan(5);
        var def = _chart.x();
        assert.equal(typeof def, "function", "returns default function");
        assert.equal(typeof _chart.x()({}), "undefined", "returns undefined if value is undefined");
        assert.equal(_chart.x()({x: 1}), 1, "returns value if value is defined");
        let val = function(d){return d.x * 2;};
        _chart.x(val);
        assert.equal(_chart.x(), val, "returns set function");
        assert.equal(_chart.x()({x: 1}), 2, "returns set function value");
        t.register(assert, type);
    });
    t.test("y: ", function(assert) {
        assert.plan(5);
        var def = _chart.x();
        assert.equal(typeof def, "function", "returns default function");
        assert.equal(typeof _chart.y()({}), "undefined", "returns undefined if value is undefined");
        assert.equal(_chart.y()({y: 1}), 1, "returns value if value is defined");
        let val = function(d){return d.y * 2;};
        _chart.y(val);
        assert.equal(_chart.y(), val, "returns set function");
        assert.equal(_chart.y()({y: 1}), 2, "returns set function value");
        t.register(assert, type);
    });

    t.test("color: ", function(assert) {
        assert.plan(3);
        let def = _chart.color();
        assert.equal(typeof def, "function", "returns default function");
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
    t.test("useClass: ", function(assert) {
        assert.plan(2);
        let def = false;
        assert.equal(_chart.useClass(), def, "returns default 'boolean' value");
        let val = true;
        _chart.useClass(val);
        assert.equal(_chart.useClass(), val, "returns set value");
        t.register(assert, type);
    });
    t.test("showLabels: ", function(assert) {
        assert.plan(2);
        let def = true;
        assert.equal(_chart.showLabels(), def, "returns default function");
        let val = false;
        _chart.showLabels(val);
        assert.equal(_chart.showLabels(), val, "returns set function");
        t.register(assert, type);
    });

    t.test("radius: ", function(assert) {
        assert.plan(2);
        let def = _chart.radius();
        assert.equal(Number.isInteger(def), true, "returns default 'integer' value");
        let val = 12345;
        _chart.radius(val);
        assert.equal(_chart.radius(), val, "returns set value");
        t.register(assert, type);
    });

    t.test("duration: ", function(assert) {
        assert.plan(2);
        let def = 0;
        assert.equal(_chart.duration(), def, "returns default 'integer' value");
        let val = 500;
        _chart.duration(val);
        assert.equal(_chart.duration(), val, "returns set value");
        t.register(assert, type);
    });

    t.test("zoomExtents: ", function(assert) {
        assert.plan(2);
        let def = {"min": 0.25, "max": 2};
        assert.deepEqual(_chart.zoomExtents(), def, "returns default 'hashmap' value");
        let val = {"min": 0, "max": 1};
        _chart.zoomExtents(val);
        assert.deepEqual(_chart.zoomExtents(), val, "returns set value");
        t.register(assert, type);
    });

    t.test("zoomCallback: ", function(assert) {
        assert.plan(3);
        let def = _chart.zoomCallback();
        assert.equal(typeof def, "function", "returns default function");
        let val = function(d){return true;};
        _chart.zoomCallback(val);
        assert.equal(_chart.zoomCallback(), val, "returns set function");
        assert.equal(_chart.zoomCallback()(), true, "returns set function value");
        t.register(assert, type);
    });

    t.test("nodeCallback: ", function(assert) {
        assert.plan(3);
        let def = _chart.nodeCallback();
        assert.equal(typeof def, "function", "returns default function");
        let val = function(d){return true;};
        _chart.nodeCallback(val);
        assert.equal(_chart.nodeCallback(), val, "returns set function");
        assert.equal(_chart.nodeCallback()(), true, "returns set function value");
        t.register(assert, type);
    });

    t.test("nodeSize: ", function(assert) {
        assert.plan(2);
        let def = {"width": 100, "height": 50};
        assert.deepEqual(_chart.nodeSize(), def, "returns default 'hashmap' value");
        let val = {"width": 10, "height": 5};
        _chart.nodeSize(val);
        assert.deepEqual(_chart.nodeSize(), val, "returns set value");
        t.register(assert, type);
    });

    t.test("nodeClick: ", function(assert) {
        assert.plan(3);
        let def = _chart.nodeClick();
        assert.equal(typeof def, "function", "returns default function");
        let val = function(d){return true;};
        _chart.nodeClick(val);
        assert.equal(_chart.nodeClick(), val, "returns set function");
        assert.equal(_chart.nodeClick()(), true, "returns set function value");
        t.register(assert, type);
    });
    t.test("horizontal: ", function(assert) {
        assert.plan(2);
        let def = false;
        assert.equal(_chart.horizontal(), def, "returns default 'boolean' value");
        let val = true;
        _chart.horizontal(val);
        assert.equal(_chart.horizontal(), val, "returns set value");
        t.register(assert, type);
    });
    t.test("getId: ", function(assert) {
        assert.plan(3);
        let def = _chart.getId();
        assert.equal(typeof def, "function", "returns default function");
        let val = function(d){return 123;};
        _chart.getId(val);
        assert.equal(_chart.getId(), val, "returns set function");
        assert.equal(_chart.getId()(), 123, "returns set function value");
        t.register(assert, type);
    });
    t.test("nodeRenderer: ", function(assert) {
        assert.plan(4);
        let def = _chart.nodeRenderer();
        assert.equal(typeof def, "function", "returns default function");
        assert.equal(def(), '<div class="sc-tree-node"></div>', "returns default html template");
        let val = function(d){return "<span></span>";};
        _chart.nodeRenderer(val);
        assert.equal(_chart.nodeRenderer(), val, "returns set function");
        assert.equal(_chart.nodeRenderer()(), "<span></span>", "returns set function value");
        t.register(assert, type);
    });
    t.test("nodeImgPath: ", function(assert) {
        assert.plan(2);
        let def = "../img/";
        assert.equal(_chart.nodeImgPath(), def, "returns default 'string' value");
        let val = "../images/";
        _chart.nodeImgPath(val);
        assert.equal(_chart.nodeImgPath(), val, "returns set value");
        t.register(assert, type);
    });

    t.end();
});
