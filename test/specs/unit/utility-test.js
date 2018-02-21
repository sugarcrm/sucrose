"use strict";

const tape = require("tape");
const d3 = require("../../fixtures/build/d3.min.js");
const sucrose = require("../../fixtures/build/sucrose.js");
const tests = require("../../lib/twine.js");

let type = "utility";

// ---------
// Utilities Unit Tests

tests("UNIT: utility -", function(t) {

    // Function tests

    tape.onFinish(function() {
        t.report(type);
    });

    t.methods(type, [
        "windowSize", //requires browser
        "windowResize", //requires browser
        "windowUnResize", //requires browser
        "resizeOnPrint", //requires browser
        "unResizeOnPrint", //requires browser

        "stringSetLengths", //requires browser
        "stringSetThickness", //requires browser
        "maxStringSetLength", //requires browser
        "stringEllipsify", //requires browser
        "getTextBBox", //requires browser
        "displayNoData", //requires browser,
        "getAbsoluteXY", //requires browser

        "colorLinearGradient", //requires dom
        "createLinearGradient", //requires dom
        "colorRadialGradient", //requires dom
        "createRadialGradient", //requires dom
        "dropShadow", //requires dom
        "createTexture", //requires dom

        "optionsFunc", //tested in each module
        "rebind", //tested in each module
    ]);

    t.test("identity: returns d", function(assert) {
        assert.equal(sucrose.utility.identity("d"), "d");
        assert.end();
        t.register(assert, type);
    });

    t.test("functor: returns function that returns d", function(assert) {
        let fn = sucrose.utility.functor("d");
        assert.equal(fn(), "d");
        assert.end();
        t.register(assert, type);
    });

    t.test("functor: returns function that returns f", function(assert) {
        let fn = sucrose.utility.functor(function(d) {return d;});
        assert.equal(fn("d"), "d");
        assert.end();
        t.register(assert, type);
    });

    t.test("isFunction: returns true for functions", function(assert) {
        let fn = function(d) {return d;};
        assert.equal(sucrose.utility.isFunction(fn), true);
        assert.equal(sucrose.utility.isFunction("adsf"), false);
        assert.end();
        t.register(assert, type);
    });

    // Color tests

    t.test("getColor: returns the default color function", function(assert) {
        assert.equal(sucrose.utility.getColor()({}, 0), "#1f77b4");
        assert.equal(sucrose.utility.getColor("#fff000")({}, 0), "#fff000");
        assert.equal(sucrose.utility.getColor("#fff000")({color: "#000fff"}, 0), "#000fff");
        assert.end();
        t.register(assert, type);
    });
    t.test("getColor: returns indexed color of an array", function(assert) {
        assert.equal(sucrose.utility.getColor(["#000", "#555", "#ddd"])({}, 0), "#000");
        assert.equal(sucrose.utility.getColor(["#000", "#555", "#ddd"])({}, 1), "#555");
        assert.equal(sucrose.utility.getColor(["#000", "#555", "#ddd"])({}, 3), "#000");
        assert.end();
        t.register(assert, type);
    });
    t.test("getColor: returns data color or default color", function(assert) {
        assert.equal(sucrose.utility.getColor("#000")({}), "#000");
        assert.equal(sucrose.utility.getColor("#000")({color: "#555"}), "#555");
        assert.end();
        t.register(assert, type);
    });
    t.test("getColor: returns color function if provided", function(assert) {
        assert.equal(sucrose.utility.getColor(function() { return "#555"; })(), "#555");
        assert.end();
        t.register(assert, type);
    });
    t.test("defaultColor: returns colors from the d3.schemeCategory20 range", function(assert) {
        assert.equal(sucrose.utility.getColor()({}, 0), "#1f77b4");
        assert.equal(sucrose.utility.getColor()({}, 9), "#c5b0d5");
        assert.equal(sucrose.utility.getColor()({}, 20), "#1f77b4");
        assert.end();
        t.register(assert, type);
    });
    t.test("getTextContrast: returns colors from the d3.schemeCategory20 range", function(assert) {
        assert.equal(sucrose.utility.getTextContrast("#000"), "rgb(212, 212, 212)");
        assert.equal(sucrose.utility.getTextContrast("#369"), "rgb(246, 246, 246)");
        assert.equal(sucrose.utility.getTextContrast("#e95"), "rgb(6, 6, 6)");
        let txt = sucrose.utility.getTextContrast("#e95", 0, function (b, t) {
            assert.equal(b.toString(), "rgb(238, 153, 85)");
            assert.equal(t.toString(), "rgb(6, 6, 6)");
        });
        assert.equal(txt, "rgb(6, 6, 6)");
        assert.end();
        t.register(assert, type);
    });
    t.test("customTheme: returns colors from the d3.schemeCategory20 range", function(assert) {
        let color = sucrose.utility.customTheme({
            "red": "rgb(255, 0, 0)",
            "blue": "rgb(0, 255, 0)",
            "green": "rgb(0, 0, 255)",
        });
        assert.equal(color("aaa"), "#9edae5");
        assert.equal(color("sss"), "#17becf");
        assert.equal(color("sss"), "#dbdb8d"); //incremented

        assert.equal(color({"key": "red"}), "rgb(255, 0, 0)");
        assert.equal(color({"key": "blue"}), "rgb(0, 255, 0)");
        assert.equal(color({"key": "green"}), "rgb(0, 0, 255)");

        color = sucrose.utility.customTheme({
            "red": "rgb(255, 0, 0)",
            "blue": "rgb(0, 255, 0)",
            "green": "rgb(0, 0, 255)",
        }, function(d){return d.k;});
        assert.equal(color({"k": "red"}), "rgb(255, 0, 0)");
        color = sucrose.utility.customTheme({
            "red": "rgb(255, 0, 0)",
            "blue": "rgb(0, 255, 0)",
            "green": "rgb(0, 0, 255)",
        }, function(d){return d.k;}, ["#036", "#369", "#69C"]);
        assert.equal(color("aaa"), "#69C");
        assert.equal(color("sss"), "#369");
        assert.equal(color("ddd"), "#036");
        assert.end();
        t.register(assert, type);
    });

    // Numeric tests

    t.test("NaNtoZero: returns a value that is undefined, null or NaN as zeros", function(assert) {
        let x = {};
        assert.equal(sucrose.utility.NaNtoZero(x.y), 0);
        assert.equal(sucrose.utility.NaNtoZero(NaN), 0);
        assert.equal(sucrose.utility.NaNtoZero(null), 0);
        assert.equal(sucrose.utility.NaNtoZero(123), 123);
        assert.end();
        t.register(assert, type);
    });

    t.test("polarToCartesian: converts polar coordinates to cartesian", function(assert) {
        let cart = sucrose.utility.polarToCartesian(0, 0, 1, 0);
        assert.equal(cart[0], 1);
        assert.equal(cart[1], 0);
        cart = sucrose.utility.polarToCartesian(0, 0, 1, 45);
        assert.equal(cart[0], 0.7071067811865476);
        assert.equal(cart[1], 0.7071067811865475);
        assert.end();
        t.register(assert, type);
    });

    t.test("angleToRadians: converts degrees to radains", function(assert) {
        assert.equal(sucrose.utility.angleToRadians(45), 0.7853981633974483);
        assert.end();
        t.register(assert, type);
    });

    t.test("angleToDegrees: converts radians to degrees", function(assert) {
        assert.equal(sucrose.utility.angleToDegrees(Math.PI), 180);
        assert.end();
        t.register(assert, type);
    });

    t.test("round: rounds number to given precision", function(assert) {
        assert.equal(sucrose.utility.round(Math.PI, 5), 3.14159);
        assert.equal(sucrose.utility.round(Math.PI, 2), 3.14);
        assert.equal(sucrose.utility.round(Math.PI, 0), 3);
        assert.end();
        t.register(assert, type);
    });

    t.test("isNumeric: checks if a value is a finite number", function(assert) {
        assert.equal(sucrose.utility.isNumeric(123), true);
        assert.equal(sucrose.utility.isNumeric("123"), true);
        assert.equal(sucrose.utility.isNumeric(1/0), false);
        assert.equal(sucrose.utility.isNumeric("abc"), false);
        assert.end();
        t.register(assert, type);
    });

    t.test("toNative: translates string values to boolean or number", function(assert) {
        assert.equal(sucrose.utility.toNative("false"), false);
        assert.equal(sucrose.utility.toNative("true"), true);
        assert.equal(sucrose.utility.toNative("1"), 1);
        assert.equal(sucrose.utility.toNative("asdf"), "asdf");
        assert.end();
        t.register(assert, type);
    });

    t.test("toBoolean: translates number or string to truthy value", function(assert) {
        assert.equal(sucrose.utility.toBoolean("false"), false);
        assert.equal(sucrose.utility.toBoolean("true"), true);
        assert.equal(sucrose.utility.toBoolean("1"), true);
        assert.equal(sucrose.utility.toBoolean(0), false);
        assert.equal(sucrose.utility.toBoolean("asdf"), "asdf");
        assert.end();
        t.register(assert, type);
    });

    t.test("countSigFigsAfter: returns the number of decimal places of a number", function(assert) {
        assert.equal(sucrose.utility.countSigFigsAfter(123), 0);
        assert.equal(sucrose.utility.countSigFigsAfter(123.345), 3);
        assert.equal(sucrose.utility.countSigFigsAfter(123.340), 2);
        assert.equal(sucrose.utility.countSigFigsAfter("123.340"), 2);
        assert.equal(sucrose.utility.countSigFigsAfter("123.340"), 2);
        assert.equal(sucrose.utility.countSigFigsAfter("$123.340"), 2);
        assert.equal(sucrose.utility.countSigFigsAfter("$123.343"), 3);
        assert.equal(sucrose.utility.countSigFigsAfter("$123.34k"), 2);
        assert.equal(sucrose.utility.countSigFigsAfter("$123,34k"), 2);
        assert.equal(sucrose.utility.countSigFigsAfter("$123 34k"), 2);
        assert.end();
        t.register(assert, type);
    });

    t.test("countSigFigsBefore: returns the significant digits before the decimal", function(assert) {
        assert.equal(sucrose.utility.countSigFigsBefore(123), 3);
        assert.equal(sucrose.utility.countSigFigsBefore(123.345), 3);
        assert.equal(sucrose.utility.countSigFigsBefore(1200.340), 2);
        assert.end();
        t.register(assert, type);
    });

    t.test("siValue: returns the exponential value of si unit", function(assert) {
        assert.equal(sucrose.utility.siValue("k"), 1e3);
        assert.equal(sucrose.utility.siValue("kilo"), 1e3);
        assert.end();
        t.register(assert, type);
    });

    t.test("siDecimal: returns the thousands magnitude of number", function(assert) {
        assert.equal(sucrose.utility.siDecimal(10), 1e1);
        assert.equal(sucrose.utility.siDecimal(1000), 1e3);
        assert.equal(sucrose.utility.siDecimal(1234), 1e3);
        assert.equal(sucrose.utility.siDecimal(1000000), 1e6);
        assert.equal(sucrose.utility.siDecimal(1234567), 1e6);
        assert.end();
        t.register(assert, type);
    });


    // Format tests

    t.test("buildLocality: returns a d3 locale options hashmap", function(assert) {
        let opts = {
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
        let locale = sucrose.utility.buildLocality();
        assert.deepEqual(locale, opts);
        locale = sucrose.utility.buildLocality({
          "decimal": ",",
        });
        assert.equal(locale.decimal, ",");
        assert.end();
        t.register(assert, type);
    });
    // t.test("buildLocality: default formatting options support", function(assert) {
    //     let locale = sucrose.utility.buildLocality();
    //     let frmtr = d3.formatLocale(locale).format;
    //     assert.equal(frmtr("$,.2f")(12345), "$12,345.00");
    //     assert.end();
    //     t.register(assert, type);
    // });

    t.test("numberFormatSI: formats number in SI units", function(assert) {
        const fmtr = sucrose.utility.numberFormatSI;
        let locale = {
              "decimal": ".",
              "thousands": ",",
              "grouping": [3],
              "currency": ["$", ""],
              "dateTime": "%B %-d, %Y at %X %p GMT%Z", //%c
              "date": "%b %-d, %Y", //%x
              "time": "%-I:%M:%S", //%X
              "periods": ["AM", "PM"],
              "days": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
              "shortDays": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
              "months": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
              "shortMonths": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
              // Custom patterns
              "full": "%A, %c",
              "long": "%c",
              "medium": "%x, %X %p",
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
        let currency = false;
        let precision = 0;
        assert.equal(fmtr(1, precision, currency, locale), "1");
        assert.equal(fmtr(1, 2, true, locale), "$1");
        assert.equal(fmtr(1, 2, false, locale), "1");
        assert.equal(fmtr(10, 2, false, locale), "10");
        assert.equal(fmtr(100, 2, false, locale), "100");
        assert.equal(fmtr(100.23, 0, false, locale), "100");
        assert.equal(fmtr(100.23, 1, false, locale), "100.2");
        assert.equal(fmtr(100.23, 2, false, locale), "100.23");
        assert.equal(fmtr(1000, 2, false, locale), "1k");
        assert.equal(fmtr(10000, 2, false, locale), "10k");
        assert.equal(fmtr(100000, 2, false, locale), "100k");
        assert.equal(fmtr(1000000, 2, false, locale), "1M");
        assert.equal(fmtr(1000000, 0, false, locale), "1M");
        assert.equal(fmtr(100, 2, true, locale), "$100");
        assert.equal(fmtr(100.23, 1, true, locale), "$100.20");
        assert.equal(fmtr(100.23, 0, true, locale), "$100");
        assert.equal(fmtr("asdf", 0, true, locale), "asdf");
        assert.equal(fmtr(0.5, 0, true, locale), "$1");
        assert.equal(fmtr(0.5, 0, false, locale), "1");
        assert.equal(fmtr(0.5, 1, true, locale), "$0.50");
        assert.equal(fmtr(0.559, 2, false, locale), "0.56");
        assert.equal(fmtr(0.49, 0, false, locale), "500m");
        assert.equal(fmtr(100), "100");

        // assert.equal(sucrose.utility.numberFormatSI(100.24, 2, true, locale), "$100.24");
        assert.end();
        t.register(assert, type);
    });

    t.test("numberFormatSIFixed: formats number in SI units to a fixed position", function(assert) {
        const fmtr = sucrose.utility.numberFormatSIFixed;
        let locale = {
              "decimal": ".",
              "thousands": ",",
              "grouping": [3],
              "currency": ["$", ""],
              "dateTime": "%B %-d, %Y at %X %p GMT%Z", //%c
              "date": "%b %-d, %Y", //%x
              "time": "%-I:%M:%S", //%X
              "periods": ["AM", "PM"],
              "days": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
              "shortDays": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
              "months": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
              "shortMonths": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
              // Custom patterns
              "full": "%A, %c",
              "long": "%c",
              "medium": "%x, %X %p",
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
        let currency = false;
        let precision = 0;
        assert.equal(fmtr(1, precision, currency, locale), "1");
        assert.equal(fmtr(1, 2, true, locale, 0), "$1.00");
        assert.equal(fmtr(1, 2, false, locale), "1.00");
        assert.equal(fmtr(10, 2, false, locale), "10.00");
        assert.equal(fmtr(100, 2, false, locale), "100.00");
        assert.equal(fmtr(1000, 2, false, locale, "k"), "1.00k");
        assert.equal(fmtr(10000, 2, false, locale, 1000), "10.00k");
        assert.equal(fmtr(100000, 2, false, locale, "kilo"), "100.00k");
        assert.equal(fmtr(1000000, 2, false, locale, "M"), "1.00M");
        assert.equal(fmtr(1000000, 0, false, locale, "M"), "1M");
        assert.equal(fmtr(100, 2, true, locale), "$100.00");
        assert.equal(fmtr(100.24, 0, true, locale), "$100");
        assert.equal(fmtr("asdf", 0, true, locale), "asdf");
        assert.equal(fmtr(100), "100");
        assert.equal(fmtr(100, null, true), "$100.00");
        // assert.equal(sucrose.utility.numberFormatSI(100.24, 2, true, locale), "$100.24");
        assert.end();
        t.register(assert, type);
    });

    t.test("numberFormat: rounds and formats number with given precision, currency and locale", function(assert) {
        const fmtr = sucrose.utility.numberFormat;
        assert.equal(fmtr(Math.PI, 5, true), "$3.14159");
        assert.equal(fmtr(Math.PI, 4, true), "$3.1416");
        assert.equal(fmtr(Math.PI, 3, false), "3.142");
        assert.equal(fmtr(Math.PI, 2), "3.14");
        assert.equal(fmtr(0, 2), "0");
        assert.equal(fmtr(123.450, 2), "123.45");
        assert.equal(fmtr(123.450, 3), "123.45");
        // yeah, i know it technically breaks unitized tests
        let locale = sucrose.utility.buildLocality({
              "decimal": ",",
              "thousands": " "
            });
        assert.equal(fmtr(Math.PI * 1000, 1, true, locale), "$3 141,6");
        assert.end();
        t.register(assert, type);
    });

    t.test("numberFormatFixed: formats number with given precision, currency and locale", function(assert) {
        const fmtr = sucrose.utility.numberFormatFixed;
        assert.equal(fmtr(Math.PI, 5, true), "$3.14159");
        assert.equal(fmtr(Math.PI, 4, true), "$3.1416");
        assert.equal(fmtr(Math.PI, 3, false), "3.142");
        assert.equal(fmtr(Math.PI, 2), "3.14");
        assert.equal(fmtr("asdf", 2), "asdf");
        assert.equal(fmtr(0, 2), "0.00");
        assert.equal(fmtr(Math.PI, null, true), "$3.14");
        assert.equal(fmtr(Math.PI, null, false), "3");
        // yeah, i know it technically breaks unitized tests
        let locale = sucrose.utility.buildLocality({
              "decimal": ",",
              "thousands": " "
            });
        assert.equal(fmtr(Math.PI * 1000, 1, true, locale), "$3 141,6");
        assert.end();
        t.register(assert, type);
    });

    t.test("numberFormatPercent: formats number as a percentage with given precision", function(assert) {
        const fmtr = sucrose.utility.numberFormatPercent;
        assert.equal(fmtr(1, 1), "100%");
        assert.equal(fmtr(1, 0), "100%");
        assert.equal(fmtr(0, 1), "0%");
        assert.equal(fmtr(1, 2), "50%");
        // yeah, i know it technically breaks unitized tests
        let locale = sucrose.utility.buildLocality({
              "decimal": ",",
              "thousands": " ",
              "precision": 3
            });
        assert.equal(fmtr(Math.PI, 100, locale), "3,142%");
        assert.end();
        t.register(assert, type);
    });

    t.test("parseDatetime: returns matching d3 date format specifier given array of datetime objects", function(assert) {
        const fmtr = sucrose.utility.parseDatetime;
        let expected = new Date("Fri Dec 31 1993 19:00:00 GMT-0500 (EST)").valueOf();
        assert.equal(fmtr(1994).valueOf(), expected);
        assert.equal(fmtr("1994").valueOf(), expected);
        expected = new Date(1330837567000).valueOf();
        assert.equal(fmtr(1330837567000).valueOf(), expected);
        assert.equal(fmtr("1330837567000").valueOf(), expected);
        assert.equal(fmtr("2012-03-04T05:06:07.000Z").valueOf(), expected);
        assert.equal(fmtr("2012-03-04T00:06:07.000-05:00").valueOf(), expected);
        assert.equal(fmtr("2012-03-04T05:06:07.000Z").valueOf(), expected);
        assert.equal(fmtr("March 4, 2012, 5:06:07 AM").valueOf(), expected);
        assert.equal(fmtr("March 4, 2012, 5:06:07 AM GMT").valueOf(), expected);
        assert.equal(fmtr("Sun Mar 04 2012 05:06:07 GMT+0000 (UTC)").valueOf(), expected);
        assert.equal(fmtr("Sun Mar 04 2012 00:06:07 GMT-0500 (EST)").valueOf(), expected);
        assert.equal(fmtr("asdf"), "asdf");
        assert.end();
        t.register(assert, type);
    });

    t.test("getDateFormat: returns matching d3 date format specifier given array of datetime objects", function(assert) {
        const fmtr = sucrose.utility.getDateFormat;
        assert.equal(fmtr([new Date("1991-2-3, 4:05:06 AM")]), "%x, %I:%M:%S %p");
        assert.equal(fmtr([new Date("1991-2-3, 4:05:00 AM")]), "%x, %I:%M %p");
        assert.equal(fmtr([new Date("1991-2-3, 4:00:00 AM")]), "%x, %I %p");
        assert.equal(fmtr([new Date("1991-2-3")]), "%x");
        assert.equal(fmtr([new Date("1991-2-1")]), "%B %Y");
        assert.equal(fmtr([new Date("1991-1-1")]), "%Y");

        assert.end();
        t.register(assert, type);
    });

    t.test("getDateFormatUTC: returns matching d3 date format specifier given array of datetime objects", function(assert) {
        const fmtr = sucrose.utility.getDateFormatUTC;
        assert.equal(fmtr([new Date("1991-2-3, 4:05:06 AM GMT")]), "%x, %I:%M:%S %p");
        assert.equal(fmtr([new Date("1991-2-3, 4:05:00 AM GMT")]), "%x, %I:%M %p");
        assert.equal(fmtr([new Date("1991-2-3, 4:00:00 AM GMT")]), "%x, %I %p");
        assert.equal(fmtr([new Date("1991-2-3 GMT")]), "%x");
        assert.equal(fmtr([new Date("1991-2-1 GMT")]), "%B %Y");
        assert.equal(fmtr([new Date("1991-1-1 GMT")]), "%Y");

        assert.end();
        t.register(assert, type);
    });

    t.test("multiFormat: returns matching d3 date format specifier given datetime object", function(assert) {
        const fmtr = sucrose.utility.multiFormat;
        assert.equal(fmtr(new Date("2017-1-1"), false), "%Y");
        assert.equal(fmtr(new Date("2017-2-1"), false), "%B %Y");
        assert.equal(fmtr(new Date("2017-2-13"), false), "%x");
        assert.equal(fmtr(new Date("1/1/1994, 5:00 AM")), "%x, %I %p");
        assert.equal(fmtr(new Date("1/1/1994, 5:02 AM")), "%x, %I:%M %p");
        assert.equal(fmtr(new Date("1/1/1994, 5:02:45 AM")), "%x, %I:%M:%S %p");
        assert.equal(fmtr(new Date(757400400001)), "%x, %I:%M:%S.%L %p");
        assert.end();
        t.register(assert, type);
    });

    t.test("dateFormat: formats datetime objects and strings", function(assert) {
        const fmtr = sucrose.utility.dateFormat;
        let locale = sucrose.utility.buildLocality();
        let localeFmtr = d3.timeFormatLocale(locale);

        // let dto = new Date(1994, 0, 1);
        let dto = 1994;

        assert.equal(fmtr(dto, "periods"), "AM,PM");
        assert.equal(fmtr(dto, "days"), "Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday");
        assert.equal(fmtr(dto, "shortDays"), "Sun,Mon,Tue,Wed,Thu,Fri,Sat");
        assert.equal(fmtr(dto, "months"), "January,February,March,April,May,June,July,August,September,October,November,December");
        assert.equal(fmtr(dto, "shortMonths"), "Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec");

        assert.equal(fmtr(dto), "1994");
        assert.equal(fmtr(dto, "date"), "Jan 1, 1994");
        assert.equal(fmtr(dto, "yMMMd"), "Jan 1, 1994");
        assert.equal(fmtr(dto, "%x"), "Jan 1, 1994");
        assert.equal(fmtr(dto, "time"), "12:00:00 AM");
        assert.equal(fmtr(dto, "%X"), "12:00:00 AM");
        assert.equal(fmtr(dto, "dateTime"), "January 1, 1994 at 12:00:00 AM GMT+0000");
        assert.equal(fmtr(dto, "%c"), "January 1, 1994 at 12:00:00 AM GMT+0000");
        assert.equal(fmtr(dto, "long"), "January 1, 1994 at 12:00:00 AM GMT+0000");

        assert.equal(fmtr(dto, "full"), "Saturday, January 1, 1994 at 12:00:00 AM GMT+0000");
        assert.equal(fmtr(dto, "%A, %c"), "Saturday, January 1, 1994 at 12:00:00 AM GMT+0000");
        assert.equal(fmtr(dto, "medium"), "Jan 1, 1994, 12:00:00 AM");
        assert.equal(fmtr(dto, "%x, %X"), "Jan 1, 1994, 12:00:00 AM");
        assert.equal(fmtr(dto, "short"), "1/1/94, 12:00 AM");
        assert.equal(fmtr(dto, "%-m/%-d/%y, %-I:%M %p"), "1/1/94, 12:00 AM");
        assert.equal(fmtr(dto, "yMMMEd"), "Sat, Jan 1, 1994");
        assert.equal(fmtr(dto, "%a, %x"), "Sat, Jan 1, 1994");
        assert.equal(fmtr(dto, "yMEd"), "Sat, 1/1/1994");
        assert.equal(fmtr(dto, "%a, %-m/%-d/%Y"), "Sat, 1/1/1994");
        assert.equal(fmtr(dto, "yMMMMd"), "January 1, 1994");
        assert.equal(fmtr(dto, "%B %-d, %Y"), "January 1, 1994");
        assert.equal(fmtr(dto, "yMd"), "1/1/1994");
        assert.equal(fmtr(dto, "%-m/%-d/%Y"), "1/1/1994");
        assert.equal(fmtr(dto, "yMMMM"), "January 1994");
        assert.equal(fmtr(dto, "%B %Y"), "January 1994");
        assert.equal(fmtr(dto, "yMMM"), "Jan 1994");
        assert.equal(fmtr(dto, "%b %Y"), "Jan 1994");
        assert.equal(fmtr(dto, "MMMd"), "Jan 1");
        assert.equal(fmtr(dto, "%b %-d"), "Jan 1");
        assert.equal(fmtr(dto, "MMMM"), "January");
        assert.equal(fmtr(dto, "%B"), "January");
        assert.equal(fmtr(dto, "MMM"), "Jan");
        assert.equal(fmtr(dto, "%b"), "Jan");
        assert.equal(fmtr(dto, "y"), "1994");
        assert.equal(fmtr(dto, "%Y"), "1994");
        assert.equal(fmtr("asdf", "%Y"), "asdf");
        assert.equal(fmtr(dto, "%Y", localeFmtr), "1994");
        assert.equal(fmtr(dto, null, localeFmtr), "1994");
        assert.equal(fmtr(dto, "multi", localeFmtr), "1994");
        assert.equal(fmtr(dto, "multi"), "1994");

        assert.end();
        t.register(assert, type);
    });

    // Date tests

    t.test("daysInMonth: returns 29 for February 2016 and 31 for January 2017", function(assert) {
        assert.equal(sucrose.utility.daysInMonth(0, 2017), 31);
        assert.equal(sucrose.utility.daysInMonth(1, 2016), 29);
        assert.end();
        t.register(assert, type);
    });

    t.test("isValidDate: returns 29 for February 2016 and 31 for January 2017", function(assert) {
        const validator = function(d) {
            return sucrose.utility.isValidDate(new Date(d));
        };
        assert.equal(validator(1998), true);
        assert.equal(validator("1998-1-1"), true);
        assert.equal(validator("1998/1/1"), true);
        assert.equal(validator("1/1/1998"), true);
        assert.equal(validator("January 1998"), true);
        assert.equal(validator("January 1, 1994"), true);
        assert.equal(validator("asdf"), false);
        assert.equal(validator(sucrose.utility.isValidDate(null)), true);
        assert.end();
        t.register(assert, type);
    });

    // Shape tests

    t.test("roundedRectangle: returns path string for rounded rectangle", function(assert) {
        assert.equal(sucrose.utility.roundedRectangle(0, 0, 20, 20, 5), "M0,0h10a5,5 0 0 1 5,5v8a5,5 0 0 1 -5,5h-10a-5,5 0 0 1 -5,-5v-8a5,5 0 0 1 5,-5z");
        assert.end();
        t.register(assert, type);
    });

    // String tests

    t.test("strip: returns string trimmed with ampersands removed", function(assert) {
        assert.equal(sucrose.utility.strip("d "), "d");
        assert.equal(sucrose.utility.strip("d&"), "d");
        assert.end();
        t.register(assert, type);
    });

    t.test("isRTLChar: returns true if the character is RTL character", function(assert) {
        assert.equal(sucrose.utility.isRTLChar("a"), false);
        assert.equal(sucrose.utility.isRTLChar("ת"), true);
        assert.end();
        t.register(assert, type);
    });

    t.test("translation: returns transform translation string given x and y", function(assert) {
        assert.equal(sucrose.utility.translation(5, 6), "translate(5,6)");
        assert.end();
        t.register(assert, type);
    });

    t.end();
});
