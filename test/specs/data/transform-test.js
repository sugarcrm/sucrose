"use strict";

const tape = require("tape");
const sucrose = require("../../fixtures/build/sucrose.js");
const tests = require("../../lib/twine.js");

let type = "transform";

// -------------------
// Data Transform Unit Tests

tests("-----------------------\nDATA: transform -", function(t) {
    tape.onFinish(function() {
        t.report(type);
    });

    t.methods(type, []);

    // Main function tests

    t.test("transform: returns empty chart data structure for empty data array", function(assert) {
        let data = [];
        let expected = {
            properties: {}, data: []
        };
        assert.deepEqual(sucrose.transform(data), expected);
        assert.end();
        t.register(assert, type);
    });

    t.test("returns empty chart data structure for empty data object", function(assert) {
        let data = {};
        let expected = {
            properties: {}, data: []
        };
        assert.deepEqual(sucrose.transform(data), expected);
        assert.end();
    });

    t.test("returns empty chart data structure for empty data object", function(assert) {
        let data = {
          "properties": {
              "title": "Chart title"
          },
          "data": []
        };
        let expected = {
            properties: {
                title: "Chart title"
            },
            data: []
        };
        assert.deepEqual(sucrose.transform(data), expected);
        assert.end();
    });

    t.test("returns single series with multiple values", function(assert) {
        let data = {
          "data": [
              {"key": "Series A", "values": [{"x": 1, "y": 20}, {"x": 2, "y": 40}]}
          ]
        };
        let expected = {
            properties: {
                colorLength: 2
            },
            data: [
                {key: "Series A", values: [{x: 1, y: 20}, {x: 2, y: 40}], seriesIndex: 0, total: 60}
            ]
        };
        assert.deepEqual(sucrose.transform(data, "multibar", "basic"), expected);
        assert.end();
    });

    t.test("returns multiple series with multiple values", function(assert) {
        let data = {
            "data": [
                {"key": "Series A", "values": [{"x": 1, "y": 20}, {"x": 2, "y": 40}]},
                {"key": "Series B", "values": [{"x": 1, "y": 20}, {"x": 2, "y": 40}]}
            ]
        };
        let expected = {
            properties: {
                colorLength: 2
            },
            data: [
                {key: "Series A", values: [{x: 1, y: 20}, {x: 2, y: 40}], seriesIndex: 0, total: 60},
                {key: "Series B", values: [{x: 1, y: 20}, {x: 2, y: 40}], seriesIndex: 1, total: 60}
            ]
        };
        assert.deepEqual(sucrose.transform(data, "multibar", "grouped"), expected);
        assert.end();
    });

    t.test("returns multiple series with multiple values", function(assert) {
        let data = {
            "properties": {
                "title": "Chart title"
            },
            "label": [
                "Group 1",
                "Group 2"
            ],
            "values": [
                {"label": ["Series A"], "values": [20]},
                {"label": ["Series B"], "values": [40]}
            ]
        };
        let expected = {
          properties: {
              title: "Chart title",
              groups: [{group: 1, label: "Group 1"}, {group: 2, label: "Group 2"}],
              colorLength: 2
          },
          data: [
              {key: "Series A", values: [{x: 1, y: 20}], seriesIndex: 0, total: 20},
              {key: "Series B", values: [{x: 1, y: 40}], seriesIndex: 1, total: 40}
          ]
        };
        assert.deepEqual(sucrose.transform(data, "multibar", "grouped"), expected);
        assert.end();
    });

    t.test("returns multi series with single pie value", function(assert) {
        let data = {
            "data": [
                {"key": "Series A", "values": [{"x": 1, "y": 20}, {"x": 2, "y": 40}]},
                {"key": "Series B", "values": [{"x": 1, "y": 20}, {"x": 2, "y": 40}]}
            ]
        };
        let expected = {
            properties: {
                colorLength: 2
            },
            data: [
                {key: "Series A", value: 60, seriesIndex: 0, total: 60},
                {key: "Series B", value: 60, seriesIndex: 1, total: 60}
            ]
        };
        assert.deepEqual(sucrose.transform(data, "pie"), expected);
        assert.end();
    });

    t.test("areValuesDiscrete: checks if data is discrete", function(assert) {
        let data = [
            {"key": "Series A", "values": [{"x": 1, "y": 20}, {"x": 2, "y": 40}]},
            {"key": "Series B", "values": [{"x": 1, "y": 20}, {"x": 2, "y": 40}]}
        ];
        let groups = [
            {"label": "Series A"}, {"label": "Series B"}
        ];
        let x = function(d) { return d.x; };
        let y = function(d) { return d.y; };
        assert.deepEqual(sucrose.transform.areValuesDiscrete(data, groups, x, y), false);
        data = [
            {"key": "Series A", "values": [{"x": 1, "y": 20}]},
            {"key": "Series B", "values": [{"x": 1, "y": 40}]}
        ];
        assert.deepEqual(sucrose.transform.areValuesDiscrete(data, groups, x, y), true);
        data = [
            {"key": "Series A", "values": [{"x": 1, "y": 20}]},
            {"key": "Series B", "values": [{"x": 2, "y": 40}]}
        ];
        assert.deepEqual(sucrose.transform.areValuesDiscrete(data, null, x, y), true);
        data = [
            {"key": "Series A", "values": [{"x": 1, "y": 20}, {"x": 2, "y": 0}]},
            {"key": "Series B", "values": [{"x": 1, "y": 0}, {"x": 2, "y": 40}]}
        ];
        assert.deepEqual(sucrose.transform.areValuesDiscrete(data, groups, x, y), true);
        data = [
            {"key": "Series A", "values": [20]},
            {"key": "Series B", "values": [40]}
        ];
        assert.deepEqual(sucrose.transform.areValuesDiscrete(data, groups, x, y), true);
        data = [
            {"key": "Series A", "value": 20},
            {"key": "Series B", "value": 40}
        ];
        assert.deepEqual(sucrose.transform.areValuesDiscrete(data, groups, x, y), true);
        data = [
            {"key": "Series A", "y": 20},
            {"key": "Series B", "y": 40}
        ];
        assert.deepEqual(sucrose.transform.areValuesDiscrete(data, groups, x, y), true);
        assert.end();
        t.register(assert, type);
    });

    t.end();
});
