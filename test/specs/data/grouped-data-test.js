"use strict";

const fs = require("fs");
const tape = require("tape");
const sucrose = require("../../fixtures/build/sucrose.js");
const tests = require("../../lib/twine.js");
const spec = require("../../files/transform/spec.json");

let type = "transform";

function loadSource(name) {
  let contents = fs.readFileSync("./test/files/transform/grouped/" + name + ".json");
  return JSON.parse(contents);
}

// --------------------
// Grouped Data Transform Tests

tests("------------------------\nDATA: transform - grouped:", function(t) {
    t.methods(type, [
        "transform", //requires browser
    ]);

    tape.onFinish(function() {
        t.report(type);
    });

    // CSV

    t.test("csv: datetime object", function(assert) {
        let source = loadSource("grouped_csv_datetime_object");
        let actual = sucrose.transform(source, "multibar", "grouped");
        let expect = spec.grouped.datetime;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("csv: datetime string", function(assert) {
        let source = loadSource("grouped_csv_datetime_string");
        let actual = sucrose.transform(source, "multibar", "grouped");
        let expect = spec.grouped.datetime_string;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("csv: datetime year", function(assert) {
        let source = loadSource("grouped_csv_datetime_year");
        let actual = sucrose.transform(source, "multibar", "grouped");
        let expect = spec.grouped.datetime;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("csv: datetime value", function(assert) {
        let source = loadSource("grouped_csv_datetime");
        let actual = sucrose.transform(source, "multibar", "grouped");
        let expect = spec.grouped.datetime;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("csv: numeric", function(assert) {
        let source = loadSource("grouped_csv_numeric");
        let actual = sucrose.transform(source, "multibar", "grouped");
        let expect = spec.grouped.numeric;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("csv: ordinal", function(assert) {
        let source = loadSource("grouped_csv_ordinal");
        let actual = sucrose.transform(source, "multibar", "grouped");
        let expect = spec.grouped.ordinal_multi;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    // Arrays

    t.test("arrays: datetime object", function(assert) {
        let source = loadSource("grouped_arrays_datetime_object");
        let actual = sucrose.transform(source, "multibar", "grouped");
        let expect = spec.grouped.datetime;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("arrays: datetime string", function(assert) {
        let source = loadSource("grouped_arrays_datetime_string");
        let actual = sucrose.transform(source, "multibar", "grouped");
        let expect = spec.grouped.datetime_string;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("arrays: datetime year", function(assert) {
        let source = loadSource("grouped_arrays_datetime_year");
        let actual = sucrose.transform(source, "multibar", "grouped");
        let expect = spec.grouped.datetime;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("arrays: datetime value", function(assert) {
        let source = loadSource("grouped_arrays_datetime");
        let actual = sucrose.transform(source, "multibar", "grouped");
        let expect = spec.grouped.datetime;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("arrays: numeric", function(assert) {
        let source = loadSource("grouped_arrays_numeric");
        let actual = sucrose.transform(source, "multibar", "grouped");
        let expect = spec.grouped.numeric;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("arrays: ordinal", function(assert) {
        let source = loadSource("grouped_arrays_ordinal");
        let actual = sucrose.transform(source, "multibar", "grouped");
        let expect = spec.grouped.ordinal_multi;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("arrays: datetime object", function(assert) {
        let source = loadSource("grouped_objects_datetime_object");
        let actual = sucrose.transform(source, "multibar", "grouped");
        let expect = spec.grouped.datetime;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    // Objects

    t.test("objects: datetime string", function(assert) {
        let source = loadSource("grouped_objects_datetime_string");
        let actual = sucrose.transform(source, "multibar", "grouped");
        let expect = spec.grouped.datetime_string;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("objects: datetime year", function(assert) {
        let source = loadSource("grouped_objects_datetime_year");
        let actual = sucrose.transform(source, "multibar", "grouped");
        let expect = spec.grouped.datetime;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("objects: datetime value", function(assert) {
        let source = loadSource("grouped_objects_datetime");
        let actual = sucrose.transform(source, "multibar", "grouped");
        let expect = spec.grouped.datetime;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("objects: numeric", function(assert) {
        let source = loadSource("grouped_objects_numeric");
        let actual = sucrose.transform(source, "multibar", "grouped");
        let expect = spec.grouped.numeric;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("objects: ordinal", function(assert) {
        let source = loadSource("grouped_objects_ordinal");
        let actual = sucrose.transform(source, "multibar", "grouped");
        let expect = spec.grouped.ordinal_multi;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.test("objects: ordinal single", function(assert) {
        let source = loadSource("grouped_objects_ordinal_single");
        let actual = sucrose.transform(source, "multibar", "grouped");
        let expect = spec.grouped.ordinal_single;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    // Sugar

    t.test("sugar: ordinal", function(assert) {
        let source = loadSource("grouped_sugar_ordinal");
        let actual = sucrose.transform(source, "multibar", "grouped");
        let expect = spec.grouped.ordinal_multi;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    // Pie

    t.test("objects: ordinal: pie", function(assert) {
        let source = loadSource("grouped_objects_ordinal");
        let actual = sucrose.transform(source, "pie");
        let expect = spec.pie.ordinal;
        assert.deepEqual(actual, expect);
        assert.end();
    });

    t.end();
});
