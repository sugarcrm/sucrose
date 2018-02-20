"use strict";

const fs = require("fs");
const tape = require("tape");
const sucrose = require("../../fixtures/build/sucrose.js");
const tests = require("../../lib/twine.js");
const spec = require("./spec.json");

let type = "transform";

function loadSource(name) {
  let contents = fs.readFileSync("./test/files/transform/discrete/" + name + ".json");
  return JSON.parse(contents);
}

// --------------------
// Discrete Data Transform Tests

tests("-------------------------\nDATA: transform -", function(t) {
    t.methods(type, [
        "transform", //requires browser
    ]);

    tape.onFinish(function() {
        t.report(type);
    });

    // CSV

    t.test("discrete: csv: datetime object", function(assert) {
        let source = loadSource("discrete_csv_datetime_object");
        let actual = sucrose.transform(source, "multibar", "discrete");
        let expect = spec.discrete.datetime;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("discrete: csv: datetime string", function(assert) {
        let source = loadSource("discrete_csv_datetime_string");
        let actual = sucrose.transform(source, "multibar", "discrete");
        let expect = spec.discrete.datetime_string;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("discrete: csv: datetime year", function(assert) {
        let source = loadSource("discrete_csv_datetime_year");
        let actual = sucrose.transform(source, "multibar", "discrete");
        let expect = spec.discrete.datetime;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("discrete: csv: datetime value", function(assert) {
        let source = loadSource("discrete_csv_datetime");
        let actual = sucrose.transform(source, "multibar", "discrete");
        let expect = spec.discrete.datetime;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("discrete: csv: numeric", function(assert) {
        let source = loadSource("discrete_csv_numeric");
        let actual = sucrose.transform(source, "multibar", "discrete");
        let expect = spec.discrete.numeric;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("discrete: csv: ordinal", function(assert) {
        let source = loadSource("discrete_csv_ordinal");
        let actual = sucrose.transform(source, "multibar", "discrete");
        let expect = spec.discrete.ordinal;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    // Arrays

    t.test("discrete: arrays: datetime object", function(assert) {
        let source = loadSource("discrete_arrays_datetime_object");
        let actual = sucrose.transform(source, "multibar", "discrete");
        let expect = spec.discrete.datetime;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("discrete: arrays: datetime string", function(assert) {
        let source = loadSource("discrete_arrays_datetime_string");
        let actual = sucrose.transform(source, "multibar", "discrete");
        let expect = spec.discrete.datetime_string;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("discrete: arrays: datetime year", function(assert) {
        let source = loadSource("discrete_arrays_datetime_year");
        let actual = sucrose.transform(source, "multibar", "discrete");
        let expect = spec.discrete.datetime;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("discrete: arrays: datetime value", function(assert) {
        let source = loadSource("discrete_arrays_datetime");
        let actual = sucrose.transform(source, "multibar", "discrete");
        let expect = spec.discrete.datetime;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("discrete: arrays: numeric", function(assert) {
        let source = loadSource("discrete_arrays_numeric");
        let actual = sucrose.transform(source, "multibar", "discrete");
        let expect = spec.discrete.numeric;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("discrete: arrays: ordinal", function(assert) {
        let source = loadSource("discrete_arrays_ordinal");
        let actual = sucrose.transform(source, "multibar", "discrete");
        let expect = spec.discrete.ordinal;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    // Objects

    t.test("discrete: arrays: datetime object", function(assert) {
        let source = loadSource("discrete_objects_datetime_object");
        let actual = sucrose.transform(source, "multibar", "discrete");
        let expect = spec.discrete.datetime;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("discrete: objects: datetime string", function(assert) {
        let source = loadSource("discrete_objects_datetime_string");
        let actual = sucrose.transform(source, "multibar", "discrete");
        let expect = spec.discrete.datetime_string;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("discrete: objects: datetime year", function(assert) {
        let source = loadSource("discrete_objects_datetime_year");
        let actual = sucrose.transform(source, "multibar", "discrete");
        let expect = spec.discrete.datetime;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("discrete: objects: datetime value", function(assert) {
        let source = loadSource("discrete_objects_datetime");
        let actual = sucrose.transform(source, "multibar", "discrete");
        let expect = spec.discrete.datetime;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("discrete: objects: numeric", function(assert) {
        let source = loadSource("discrete_objects_numeric");
        let actual = sucrose.transform(source, "multibar", "discrete");
        let expect = spec.discrete.numeric;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("discrete: objects: ordinal", function(assert) {
        let source = loadSource("discrete_objects_ordinal");
        let actual = sucrose.transform(source, "multibar", "discrete");
        let expect = spec.discrete.ordinal;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    // Sugar

    t.test("discrete: sugar: ordinal", function(assert) {
        let source = loadSource("discrete_sugar_ordinal");
        let expect = spec.discrete.ordinal;
        let actual = sucrose.transform(source, "multibar", "discrete");
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.end();
});
