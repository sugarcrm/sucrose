"use strict";

const tape = require("tape");
const tapes = require("tapes");
const addAssertions = require("extend-tape");
const sucrose = require("../fixtures/build/sucrose.js");

tape._missing = tape._missing || {};
tape._methods = tape._methods || {};
let _counter = 0;
let _left = 0;

// add a new assertions
const test = addAssertions(tape, {

    methods(type, exclusions) {
        let instance;
        let native = Object.getOwnPropertyNames(new Function());
        let common = ["dispatch"];
        let excluded = native.concat(common, exclusions);
        switch(type) {
            case "area":
                instance = sucrose.charts.areaChart();
                break;
            case "bubble":
                instance = sucrose.charts.bubbleChart();
                break;
            case "funnel":
                instance = sucrose.charts.funnelChart();
                break;
            case "gauge":
                instance = sucrose.charts.gaugeChart();
                break;
            case "globe":
                instance = sucrose.charts.globeChart();
                break;
            case "line":
                instance = sucrose.charts.lineChart();
                break;
            case "multibar":
                instance = sucrose.charts.multibarChart();
                break;
            case "pareto":
                instance = sucrose.charts.paretoChart();
                break;
            case "pie":
                instance = sucrose.charts.pieChart();
                break;
            case "tree":
                instance = sucrose.charts.treeChart();
                break;
            case "treemap":
                instance = sucrose.charts.treemapChart();
                break;
            case "tooltip":
                instance = sucrose.tooltip();
                break;
            case "utility":
                instance = sucrose.utility;
                break;
            case "transform":
                instance = sucrose.transform;
                break;
            default:
                instance = new Function();
        }
        let methods = Object.getOwnPropertyNames(instance).filter(function(name) {
            return excluded.indexOf(name) === -1;
        });
        tape._methods[type] = methods;
        _counter += 1;
    },

    register(assert, type) {
        let name = assert.name.match(/ - ([\w]*)\:/)[1];
        tape._methods[type] = tape._methods[type].filter(function(d) {
            return d !== name;
        });
    },

    report(type) {
        _counter -= 1;
        if (tape._methods[type].length) {
            tape._missing[type] = tape._methods[type];
            _left += tape._methods[type].length;
        }
        if (_counter === 0) {
            if (_left > 0) {
                console.log("===================\nPublic methods left: " + _left);
                console.log(tape._missing);
            } else {
                console.log("All public methods are covered!");
            }
        }
    },
});

module.exports = tapes(test);
