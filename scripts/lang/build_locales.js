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
// Make sure you have the following packages installed: `cldr`, `cldr-data`, `cldrjs`
// to build locales, run:   `node ./scripts/lang/build_locales.js`
// will make a hashmap of D3 localities in build/locales.json

'use strict';

let fs = require('fs');
let Loc = require('./loc.js');

// ICU Code, Language, Currency, CLDR, Label
let locales = require('../../src/data/cldr-locales.json');
//http://www.localeplanet.com/icu/currency.html

let localeSettings = {};
let localeJson;

locales.forEach(function(l) {
    // eslint-disable-next-line no-unused-vars
    let icuc = l[0];
    let lang = l[1];
    let curr = l[2];
    let file = l[3];
    // eslint-disable-next-line no-unused-vars
    let name = l[4];
    let locale = new Loc(file, curr);
    let settings = {
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
    let customDateFormats = locale.customDateFormats();
    for (let f in customDateFormats) {
        if (customDateFormats.hasOwnProperty(f)) {
            settings[f] = customDateFormats[f];
        }
    }
    localeSettings[l[0]] = settings;
});

localeJson = JSON.stringify(localeSettings, null, '  ');

fs.writeFile('./build/locales.json', localeJson, function (err) {
  if (err) {
    return console.log(err);
  }
  console.log('Wrote localeSettings to file.');
});

// there are FOUR problems:

// ar_SA should be ar_AR
// el_EL should be el_GR
// en_UK should be en_GB
// it_it should be it_IT
// es_LA is not a locale, should be es_419
