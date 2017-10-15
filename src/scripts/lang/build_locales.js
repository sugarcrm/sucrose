/**
 * Npm module for generating D3 Locale settings files
 * based on Unicode CLDR JSON data
 *
 * Copyright 2016 SugarCRM, Inc.
 * Released under the MIT license
 *
 * Inspired by Rafael Xavier de Souza's
 * https://github.com/rxaviers/cldr-data-npm/tree/example-application
 * with much learned from
 * https://lh.2xlibre.net
 * http://www.localeplanet.com
 */

// Usage:
// Make sure you run:       `npm i cldr-data` in root of examples
// to build locales, run:   `node < build_locales.js`
// will make a hashmap of D3 localities in data/locales/locales.json

'use strict';

var fs = require('fs');
var Loc = require('./loc.js');

// ICU Code, Language, Currency, CLDR, Label
var locales = require('../../data/cldr-locales.json');
//http://www.localeplanet.com/icu/currency.html

var localeSettings = {};
var localeJson;

locales.forEach(function(l) {
    var icuc = l[0];
    var lang = l[1];
    var curr = l[2];
    var file = l[3];
    var name = l[4];
    var locale = new Loc(file, curr);
    var settings = {
        label: locale.language(lang),
        decimal: locale.decimal(), // "."
        thousands: locale.thousands(), // ","
        grouping: locale.grouping(), // [3]
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

localeJson = JSON.stringify(localeSettings, null, '  ');

fs.writeFile('../../data/locales.json', localeJson, function (err) {
  if (err) return console.log(err);
  console.log('Wrote localeSettings to file.');
});

// there are FOUR problems:

// ar_SA should be ar_AR
// el_EL should be el_GR
// en_UK should be en_GB
// it_it should be it_IT
// es_LA is not a locale, should be es_419
