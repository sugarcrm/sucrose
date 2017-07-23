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
    ]);

    t.test("identity: returns d", function(assert) {
        assert.equal(sucrose.utility.identity("d"), "d");
        assert.end();
        t.register(assert, type);
    });

    t.test("functor: returns function that returns d", function(assert) {
        let f = sucrose.utility.functor("d");
        assert.equal(f(), "d");
        assert.end();
        t.register(assert, type);
    });

    t.test("functor: returns function that returns f", function(assert) {
        let f = sucrose.utility.functor(function(d) { return d;     t.register(assert, type);
    });
        assert.equal(f("d"), "d");
        assert.end();
        t.register(assert, type);
    });

    // Color tests

    t.test("getColor: returns the default color function", function(assert) {
        assert.equal(sucrose.utility.getColor()({}, 0), "#1f77b4");
        assert.end();
        t.register(assert, type);
    });
    t.test("getColor: returns indexed color of an array", function(assert) {
        assert.plan(3);
        assert.equal(sucrose.utility.getColor(["#000", "#555", "#ddd"])({}, 0), "#000");
        assert.equal(sucrose.utility.getColor(["#000", "#555", "#ddd"])({}, 1), "#555");
        assert.equal(sucrose.utility.getColor(["#000", "#555", "#ddd"])({}, 3), "#000");
        t.register(assert, type);
    });
    t.test("getColor: returns data color or default color", function(assert) {
        assert.plan(2);
        assert.equal(sucrose.utility.getColor("#000")({}), "#000");
        assert.equal(sucrose.utility.getColor("#000")({color: "#555"}), "#555");
        t.register(assert, type);
    });
    t.test("getColor: returns color function if provided", function(assert) {
        assert.equal(sucrose.utility.getColor(function() { return "#555"; })(), "#555");
        assert.end();
        t.register(assert, type);
    });
    t.test("defaultColor: returns colors from the d3.schemeCategory20 range", function(assert) {
        assert.plan(3);
        assert.equal(sucrose.utility.getColor()({}, 0), "#1f77b4");
        assert.equal(sucrose.utility.getColor()({}, 9), "#c5b0d5");
        assert.equal(sucrose.utility.getColor()({}, 20), "#1f77b4");
        t.register(assert, type);
    });
    t.test("getTextContrast: returns colors from the d3.schemeCategory20 range", function(assert) {
        assert.plan(3);
        assert.equal(sucrose.utility.getTextContrast("#000"), "rgb(212, 212, 212)");
        assert.equal(sucrose.utility.getTextContrast("#369"), "rgb(246, 246, 246)");
        assert.equal(sucrose.utility.getTextContrast("#e95"), "rgb(6, 6, 6)");
        t.register(assert, type);
    });
    t.test("customTheme: returns colors from the d3.schemeCategory20 range", function(assert) {
        assert.plan(10);
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
        t.register(assert, type);
    });

    // Numeric tests

    t.test("NaNtoZero: returns a value that is undefined, null or NaN as zeros", function(assert) {
        let x = {};
        assert.plan(4);
        assert.equal(sucrose.utility.NaNtoZero(x.y), 0);
        assert.equal(sucrose.utility.NaNtoZero(NaN), 0);
        assert.equal(sucrose.utility.NaNtoZero(null), 0);
        assert.equal(sucrose.utility.NaNtoZero(123), 123);
        t.register(assert, type);
    });

    t.test("polarToCartesian: converts polar coordinates to cartesian", function(assert) {
        assert.plan(4);
        let cart = sucrose.utility.polarToCartesian(0, 0, 1, 0);
        assert.equal(cart[0], 1);
        assert.equal(cart[1], 0);
        cart = sucrose.utility.polarToCartesian(0, 0, 1, 45);
        assert.equal(cart[0], 0.7071067811865476);
        assert.equal(cart[1], 0.7071067811865475);
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

    // Format tests

    t.test("buildLocality: returns a d3 locale options hashmap", function(assert) {
        let opts = {
            'decimal': '.',
            'thousands': ',',
            'grouping': [3],
            'currency': ['$', ''],
            'periods': ['AM', 'PM'],
            'days': ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            'shortDays': ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            'months': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
            'shortMonths': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            'date': '%b %-d, %Y', //defines %x
            'time': '%-I:%M:%S %p', //defines %X
            'dateTime': '%B %-d, %Y at %X GMT%Z', //defines %c
            // Custom patterns
            'full': '%A, %c',
            'long': '%c',
            'medium': '%x, %X',
            'short': '%-m/%-d/%y, %-I:%M %p',
            'yMMMEd': '%a, %x',
            'yMEd': '%a, %-m/%-d/%Y',
            'yMMMMd': '%B %-d, %Y',
            'yMMMd': '%x',
            'yMd': '%-m/%-d/%Y',
            'yMMMM': '%B %Y',
            'yMMM': '%b %Y',
            'MMMd': '%b %-d',
            'MMMM': '%B',
            'MMM': '%b',
            'y': '%Y'
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

    t.test("numberFormatSI: formats numer in SI units", function(assert) {
        const fmtr = sucrose.utility.numberFormatSI;
        let locale = {
              'decimal': '.',
              'thousands': ',',
              'grouping': [3],
              'currency': ['$', ''],
              'dateTime': '%B %-d, %Y at %X %p GMT%Z', //%c
              'date': '%b %-d, %Y', //%x
              'time': '%-I:%M:%S', //%X
              'periods': ['AM', 'PM'],
              'days': ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
              'shortDays': ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
              'months': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
              'shortMonths': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
              // Custom patterns
              'full': '%A, %c',
              'long': '%c',
              'medium': '%x, %X %p',
              'short': '%-m/%-d/%y, %-I:%M %p',
              'yMMMEd': '%a, %x',
              'yMEd': '%a, %-m/%-d/%Y',
              'yMMMMd': '%B %-d, %Y',
              'yMMMd': '%x',
              'yMd': '%-m/%-d/%Y',
              'yMMMM': '%B %Y',
              'yMMM': '%b %Y',
              'MMMd': '%b %-d',
              'MMMM': '%B',
              'MMM': '%b',
              'y': '%Y'
            };
        let currency = false;
        let precision = 0;
        assert.equal(fmtr(1, precision, currency, locale), "1");
        assert.equal(fmtr(1, 2, true, locale), "$1.0");
        assert.equal(fmtr(1, 2, false, locale), "1.0");
        assert.equal(fmtr(10, 2, false, locale), "10");
        assert.equal(fmtr(100, 2, false, locale), "100");
        assert.equal(fmtr(1000, 2, false, locale), "1,000");
        assert.equal(fmtr(10000, 2, false, locale), "10k");
        assert.equal(fmtr(100000, 2, false, locale), "100k");
        assert.equal(fmtr(1000000, 2, false, locale), "1.0M");
        assert.equal(fmtr(1000000, 0, false, locale), "1M");
        assert.equal(fmtr(100, 2, true, locale), "$100");
        assert.equal(fmtr(100.24, 0, true, locale), "$100.24");
        // assert.equal(sucrose.utility.numberFormatSI(100.24, 2, true, locale), "$100.24");
        assert.end();
        t.register(assert, type);
    });

    t.test("numberFormatRound: rounds and formats number with given precision, currency and locale", function(assert) {
        const fmtr = sucrose.utility.numberFormatRound;
        assert.equal(fmtr(Math.PI, 5, true), "$3.14159");
        assert.equal(fmtr(Math.PI, 4, true), "$3.1416");
        assert.equal(fmtr(Math.PI, 3, false), "3.142");
        assert.equal(fmtr(Math.PI, 2), "3.14");
        // yeah, i know it technically breaks unitized tests
        let locale = sucrose.utility.buildLocality({
              'decimal': ',',
              'thousands': ' '
            });
        assert.equal(fmtr(Math.PI * 1000, 1, true, locale), "$3 141,6");
        assert.end();
        t.register(assert, type);
    });

    t.test("dateFormat: formats datetime objects and strings", function(assert) {
        const fmtr = sucrose.utility.dateFormat;

        assert.equal(fmtr(1994, "periods"), "AM,PM");
        assert.equal(fmtr(1994, "days"), "Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday");
        assert.equal(fmtr(1994, "shortDays"), "Sun,Mon,Tue,Wed,Thu,Fri,Sat");
        assert.equal(fmtr(1994, "months"), "January,February,March,April,May,June,July,August,September,October,November,December");
        assert.equal(fmtr(1994, "shortMonths"), "Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec");

        assert.equal(fmtr(1994), "1994");
        assert.equal(fmtr(1994, "date"), "Jan 1, 1994");
        assert.equal(fmtr(1994, "yMMMd"), "Jan 1, 1994");
        assert.equal(fmtr(1994, "%x"), "Jan 1, 1994");
        assert.equal(fmtr(1994, "time"), "12:00:00 AM");
        assert.equal(fmtr(1994, "%X"), "12:00:00 AM");
        assert.equal(fmtr(1994, "dateTime"), "January 1, 1994 at 12:00:00 AM GMT+0000");
        assert.equal(fmtr(1994, "%c"), "January 1, 1994 at 12:00:00 AM GMT+0000");
        assert.equal(fmtr(1994, "long"), "January 1, 1994 at 12:00:00 AM GMT+0000");

        assert.equal(fmtr(1994, "full"), "Saturday, January 1, 1994 at 12:00:00 AM GMT+0000");
        assert.equal(fmtr(1994, "%A, %c"), "Saturday, January 1, 1994 at 12:00:00 AM GMT+0000");
        assert.equal(fmtr(1994, "medium"), "Jan 1, 1994, 12:00:00 AM");
        assert.equal(fmtr(1994, "%x, %X"), "Jan 1, 1994, 12:00:00 AM");
        assert.equal(fmtr(1994, "short"), "1/1/94, 12:00 AM");
        assert.equal(fmtr(1994, "%-m/%-d/%y, %-I:%M %p"), "1/1/94, 12:00 AM");
        assert.equal(fmtr(1994, "yMMMEd"), "Sat, Jan 1, 1994");
        assert.equal(fmtr(1994, "%a, %x"), "Sat, Jan 1, 1994");
        assert.equal(fmtr(1994, "yMEd"), "Sat, 1/1/1994");
        assert.equal(fmtr(1994, "%a, %-m/%-d/%Y"), "Sat, 1/1/1994");
        assert.equal(fmtr(1994, "yMMMMd"), "January 1, 1994");
        assert.equal(fmtr(1994, "%B %-d, %Y"), "January 1, 1994");
        assert.equal(fmtr(1994, "yMd"), "1/1/1994");
        assert.equal(fmtr(1994, "%-m/%-d/%Y"), "1/1/1994");
        assert.equal(fmtr(1994, "yMMMM"), "January 1994");
        assert.equal(fmtr(1994, "%B %Y"), "January 1994");
        assert.equal(fmtr(1994, "yMMM"), "Jan 1994");
        assert.equal(fmtr(1994, "%b %Y"), "Jan 1994");
        assert.equal(fmtr(1994, "MMMd"), "Jan 1");
        assert.equal(fmtr(1994, "%b %-d"), "Jan 1");
        assert.equal(fmtr(1994, "MMMM"), "January");
        assert.equal(fmtr(1994, "%B"), "January");
        assert.equal(fmtr(1994, "MMM"), "Jan");
        assert.equal(fmtr(1994, "%b"), "Jan");
        assert.equal(fmtr(1994, "y"), "1994");
        assert.equal(fmtr(1994, "%Y"), "1994");

        assert.end();
        t.register(assert, type);
    });

    t.test("getDateFormat: returns matching d3 date format specifier given array of datetime objects", function(assert) {
        const fmtr = sucrose.utility.getDateFormat;
        assert.equal(fmtr([new Date("1991-2-3, 4:05:06 AM")]), ":%S");
        assert.equal(fmtr([new Date("1991-2-3, 4:05:00 AM")]), "%I:%M");
        assert.equal(fmtr([new Date("1991-2-3, 4:00:00 AM")]), "%I %p");
        assert.equal(fmtr([new Date("1991-2-3")]), "%x");
        assert.equal(fmtr([new Date("1991-2-1")]), "%B");
        assert.equal(fmtr([new Date("1991-1-1")]), "%Y");

        assert.end();
        t.register(assert, type);
    });

    t.test("getUTCDateFormat: returns matching d3 date format specifier given array of datetime objects", function(assert) {
        const fmtr = sucrose.utility.getDateFormat;
        assert.equal(fmtr([new Date("1991-2-3, 4:05:06 AM")]), ":%S");
        assert.equal(fmtr([new Date("1991-2-3, 4:05:00 AM")]), "%I:%M");
        assert.equal(fmtr([new Date("1991-2-3, 4:00:00 AM")]), "%I %p");
        assert.equal(fmtr([new Date("1991-2-3")]), "%x");
        assert.equal(fmtr([new Date("1991-2-1")]), "%B");
        assert.equal(fmtr([new Date("1991-1-1")]), "%Y");

        assert.end();
        t.register(assert, type);
    });

    t.test("multiFormat: returns matching d3 date format specifier given datetime object", function(assert) {
        const fmtr = sucrose.utility.multiFormat;
        assert.equal(fmtr(new Date("2017-1-1")), "%Y");
        assert.equal(fmtr(new Date("2017-2-1")), "%B");
        assert.equal(fmtr(new Date("2017-2-13")), "%x");
        assert.equal(fmtr(new Date("1/1/1994, 5:00 AM")), "%I %p");
        // assert.equal(fmtr(new Date("1/1/1994, 5:02 AM")), "%I %p");
        // assert.equal(fmtr(new Date(757400400001)), "%x");
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
        const validator = sucrose.utility.isValidDate;
        assert.equal(validator(1998), true);
        assert.equal(validator("1998-1-1"), true);
        assert.equal(validator("1998/1/1"), true);
        assert.equal(validator("1/1/1998"), true);
        assert.equal(validator("January 1998"), true);
        assert.equal(validator("January 1, 1994"), true);
        assert.equal(validator("asdf"), false);
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
