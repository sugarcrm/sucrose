"use strict";

const fs = require("fs");
const tape = require("tape");
const sucrose = require("../../fixtures/build/sucrose.js");
const tests = require("../../lib/twine.js");
const spec = require("../../files/transform/spec.json");

let type = "transform";

function loadSource(name) {
  let contents = fs.readFileSync("./test/files/transform/basic/" + name + ".json");
  return JSON.parse(contents);
}

// --------------------
// Basic Data Transform Tests

tests("----------------------\nDATA: transform - basic:", function(t) {
    t.methods(type, [
        "transform", //requires browser
    ]);

    tape.onFinish(function() {
        t.report(type);
    });

    // CSV

    t.test("csv: datetime object", function(assert) {
        let source = loadSource("basic_csv_datetime_object");
        let actual = sucrose.transform(source, "multibar", "basic");
        let expect = spec.basic.datetime;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("csv: datetime string", function(assert) {
        let source = loadSource("basic_csv_datetime_string");
        let actual = sucrose.transform(source, "multibar", "basic");
        let expect = spec.basic.datetime_string;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("csv: datetime year", function(assert) {
        let source = loadSource("basic_csv_datetime_year");
        let actual = sucrose.transform(source, "multibar", "basic");
        let expect = spec.basic.datetime;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("csv: datetime value", function(assert) {
        let source = loadSource("basic_csv_datetime");
        let actual = sucrose.transform(source, "multibar", "basic");
        let expect = spec.basic.datetime;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("csv: numeric", function(assert) {
        let source = loadSource("basic_csv_numeric");
        let actual = sucrose.transform(source, "multibar", "basic");
        let expect = spec.basic.numeric;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("csv: ordinal", function(assert) {
        let source = loadSource("basic_csv_ordinal");
        let actual = sucrose.transform(source, "multibar", "basic");
        let expect = spec.basic.ordinal;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    // Arrays

    t.test("arrays: datetime object", function(assert) {
        let source = loadSource("basic_arrays_datetime_object");
        let actual = sucrose.transform(source, "multibar", "basic");
        let expect = spec.basic.datetime;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("arrays: datetime string", function(assert) {
        let source = loadSource("basic_arrays_datetime_string");
        let actual = sucrose.transform(source, "multibar", "basic");
        let expect = spec.basic.datetime_string;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("arrays: datetime year", function(assert) {
        let source = loadSource("basic_arrays_datetime_year");
        let actual = sucrose.transform(source, "multibar", "basic");
        let expect = spec.basic.datetime;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("arrays: datetime value", function(assert) {
        let source = loadSource("basic_arrays_datetime");
        let actual = sucrose.transform(source, "multibar", "basic");
        let expect = spec.basic.datetime;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("arrays: numeric", function(assert) {
        let source = loadSource("basic_arrays_numeric");
        let actual = sucrose.transform(source, "multibar", "basic");
        let expect = spec.basic.numeric;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("arrays: ordinal", function(assert) {
        let source = loadSource("basic_arrays_ordinal");
        let actual = sucrose.transform(source, "multibar", "basic");
        let expect = spec.basic.ordinal;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    // Objects

    t.test("objects: datetime object", function(assert) {
        let source = loadSource("basic_objects_datetime_object");
        let actual = sucrose.transform(source, "multibar", "basic");
        let expect = spec.basic.datetime;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("objects: datetime string", function(assert) {
        let source = loadSource("basic_objects_datetime_string");
        let actual = sucrose.transform(source, "multibar", "basic");
        let expect = spec.basic.datetime_string;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("objects: datetime year", function(assert) {
        let source = loadSource("basic_objects_datetime_year");
        let actual = sucrose.transform(source, "multibar", "basic");
        let expect = spec.basic.datetime;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("objects: datetime value", function(assert) {
        let source = loadSource("basic_objects_datetime");
        let actual = sucrose.transform(source, "multibar", "basic");
        let expect = spec.basic.datetime;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("objects: numeric", function(assert) {
        let source = loadSource("basic_objects_numeric");
        let actual = sucrose.transform(source, "multibar", "basic");
        let expect = spec.basic.numeric;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("objects: ordinal", function(assert) {
        let source = loadSource("basic_objects_ordinal");
        let actual = sucrose.transform(source, "multibar", "basic");
        let expect = spec.basic.ordinal;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("objects: multiple ordinal", function(assert) {
        let source = loadSource("basic_objects_ordinal_multiple");
        let actual = sucrose.transform(source, "multibar", "basic");
        let expect = spec.basic.ordinal;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    // Sugar

    t.test("sugar: ordinal", function(assert) {
        let source = loadSource("basic_sugar_ordinal");
        let actual = sucrose.transform(source, "multibar", "basic");
        let expect = spec.basic.ordinal;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.end();
});
