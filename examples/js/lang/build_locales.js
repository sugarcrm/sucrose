/**
 * Npm module for generating D3 Locale settings files
 * based on Unicode CLDR JSON data
 *
 * Copyright 2016 SugarCRM, Inc.
 * Released under the MIT license
 *
 * Inspired by Rafael Xavier de Souza's
 * https://github.com/rxaviers/cldr-data-npm/tree/example-application
 */
// Make sure you run `npm i cldr-data --save` in root of examples
// to build locales, run `node < build_locales.js

"use strict";

var Loc = require("./loc.js");
var locales = [['en', 'USD'], ['de', 'EUR'], ['ru', 'RUB']];
var localeSettings = {};
var fs = require('fs');

locales.forEach(function(l) {
    var locale = new Loc(l[0], l[1]);
    var settings = {
        label: locale.language(l[0]),
        decimal: locale.decimal(), // "."
        thousands: locale.thousands(), // ","
        grouping: [3],
        currency: locale.currency(), // ["$", ""]
        dateTime: locale.dateTime('long'), // "%a %b %e %X %Y",
        date: locale.date(), // "%m/%d/%Y",
        time: locale.time(), // "%H:%M:%S",
        periods: locale.periods(), //["AM", "PM"]
        days: locale.days(), // ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        shortDays: locale.shortDays(), // ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        months: locale.months(), // ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        shortMonths: locale.shortMonths() // ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    };
    var customDateFormats = locale.customDateFormats();
    for (var f in customDateFormats) {
        if (customDateFormats.hasOwnProperty(f)) {
            settings[f] = customDateFormats[f];
        }
    }
    localeSettings[l[0]] = settings;
});

fs.writeFile('../../data/locales/locales.json', JSON.stringify(localeSettings, null, '  '), function (err) {
  if (err) return console.log(err);
  console.log('Wrote localeSettings to file.');
});
