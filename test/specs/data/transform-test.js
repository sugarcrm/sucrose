"use strict";

const tape = require("tape");
const sucrose = require("../../fixtures/build/sucrose.js");
const tests = require("../../lib/twine.js");

let type = "transform";

// -------------------
// Multibar Unit Tests

tests("DATA: transform -", function(t) {
    t.methods(type, [
        "transform", //requires browser
    ]);

    tape.onFinish(function() {
        t.report(type);
    });

    t.test("transform: returns empty chart data structure for empty data array", function(assert) {
        let data = [];
        let expected = {
            properties: {}, data: undefined
        };
        assert.deepEqual(sucrose.transform(data), expected);
        assert.end();
    });

    t.test("transform: returns empty chart data structure for empty data object", function(assert) {
        let data = {};
        let expected = {
            properties: {}, data: undefined
        };
        assert.deepEqual(sucrose.transform(data), expected);
        assert.end();
    });

    t.test("transform: returns empty chart data structure for empty data object", function(assert) {
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

    t.test("transform: returns single series with multiple values", function(assert) {
        let data = {
          "data": [
            {"key": "Series A", "values": [{"x": 1, "y": 20}, {"x": 2, "y": 40}]}
          ]
        };
        let expected = {
          properties: {},
          data: [
            {key: "Series A", values: [{x: 1, y: 20}, {x: 2, y: 40}]}
          ]
        };
        assert.deepEqual(sucrose.transform(data), expected);
        assert.end();
    });

    t.test("transform: returns multiple series with multiple values", function(assert) {
        let data = {
          "data": [
            {"key": "Series A", "values": [{"x": 1, "y": 20}, {"x": 2, "y": 40}]},
            {"key": "Series B", "values": [{"x": 1, "y": 20}, {"x": 2, "y": 40}]}
          ]
        };
        let expected = {
          properties: {},
          data: [
            {key: "Series A", values: [{x: 1, y: 20}, {x: 2, y: 40}]},
            {key: "Series B", values: [{x: 1, y: 20}, {x: 2, y: 40}]}
          ]
        };
        assert.deepEqual(sucrose.transform(data), expected);
        assert.end();
    });

    t.test("transform: returns multi series with single pie value", function(assert) {
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
            {key: "Series A", value: 60},
            {key: "Series B", value: 60}
          ]
        };
        assert.deepEqual(sucrose.transform(data, "pie"), expected);
        assert.end();
    });

    t.skip("transform: returns multiple series with multiple values", function(assert) {
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
            title: "Chart title"
          },
          data: [
            {key: "Series A", values: [{x: 1, y: 20}, {x: 2, y: 40}]},
            {key: "Series B", values: [{x: 1, y: 20}, {x: 2, y: 40}]}
          ]
        };
        assert.deepEqual(sucrose.transform(data, "multibar", "grouped"), expected);
        assert.end();
    });

    t.end();
});
