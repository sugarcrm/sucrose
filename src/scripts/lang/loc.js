/**
 * Npm module for generating D3 Locale settings files
 * based on Unicode CLDR JSON data
 *
 * Copyright 2016 SugarCRM, Inc.
 * Released under the Apache 2.0 License
 */

'use strict';

const cldrData = require('cldr-data');
const Cldr = require('cldrjs');

// On-demand load.
function onDemandLoad(languageId) {
  Cldr.load(
    cldrData('main/' + languageId + '/numbers'),
    cldrData('main/' + languageId + '/ca-gregorian'),
    cldrData('main/' + languageId + '/currencies'),
    cldrData('main/' + languageId + '/languages')
  );
}

// Load supplemental/likelySubtags.json.
Cldr.load(cldrData('supplemental/likelySubtags'));

// D3 Locale generator
function Loc(locale, currency) {
  let defaultNumberingSystem;

  onDemandLoad(locale);
  this.cldr = new Cldr(locale);

  defaultNumberingSystem = this.cldr.main('numbers/defaultNumberingSystem');

  this.symbols = this.cldr.main([
    'numbers/symbols-numberSystem-' + defaultNumberingSystem
  ]);

  this.numbers = this.cldr.main([
    'numbers/decimalFormats-numberSystem-' + defaultNumberingSystem
  ]);

  this.currencySystem = this.cldr.main([
    'numbers/currencyFormats-numberSystem-' + defaultNumberingSystem
  ]);

  this.currencies = this.cldr.main([
    'numbers/currencies/' + currency
  ]);

  this.dates = this.cldr.main([
    'dates/calendars/gregorian'
  ]);

  this.languages = this.cldr.main([
    'localeDisplayNames/languages'
  ]);
}

Loc.prototype.language = function(lang) {
  let data = this.languages;
  return data[lang];
};

Loc.prototype.decimal = function() {
  return this.symbols.decimal;
};

Loc.prototype.thousands = function() {
  return this.symbols.group;
};

Loc.prototype.grouping = function() {
  let pattern = this.numbers.standard.split('.')[0].split(',').slice(1);
  //[#,##,##0] [#,##0]
  return pattern.map(function(p) {
      return p.length;
    });
};

Loc.prototype.currency = function() {
  let currency = ['', ''];
  let symbol = this.currencies.symbol;
  let symbolAlt = this.currencies['symbol-alt-narrow'];
  if (this.currencySystem.standard.indexOf('¤ ') === 0) {
    currency[0] = symbolAlt || symbol + ' ';
  } else if (this.currencySystem.standard.indexOf('¤') === 0) {
    currency[0] = symbolAlt || symbol;
  } else {
    currency[1] = ' ' + symbol;
  }
  return currency;
};

Loc.prototype.dateTime = function(format) {
  let data = this.dates.dateTimeFormats[format];
  let dateFormat = this._dateFormat(this.dates.dateFormats[format]);
  let timeFormat = this._timeFormat(this.dates.timeFormats[format]);
  return data
    .replace(/\'/g, '')
    .replace('\{1\}', dateFormat)
    .replace('\{0\}', timeFormat);
};

Loc.prototype.date = function() {
  let data = this.dates.dateTimeFormats.availableFormats.yMd;
  let dateFormat = this._dateFormat(data);
  return dateFormat;
};

Loc.prototype.time = function() {
  let data = this.dates.timeFormats.short;
  let timeFormat = this._timeFormat(data);
  return timeFormat;
};

Loc.prototype.periods = function() {
  let data = this.dates.dayPeriods.format.abbreviated;
  let periods = [data.am, data.pm];
  return periods;
};

Loc.prototype.days = function() {
  let data = this.dates.days.format.wide;
  let keys = Object.keys(data);
  let days = [];
  keys.forEach(function(key) {
    days.push(data[key]);
  });
  return days;
};

Loc.prototype.shortDays = function() {
  let data = this.dates.days.format.abbreviated;
  let keys = Object.keys(data);
  let days = [];
  keys.forEach(function(key) {
    days.push(data[key]);
  });
  return days;
};

Loc.prototype.months = function() {
  let data = this.dates.months.format.wide;
  let keys = Object.keys(data);
  let months = [];
  keys.forEach(function(key) {
    months.push(data[key]);
  });
  return months;
};

Loc.prototype.shortMonths = function() {
  let data = this.dates.months.format.abbreviated;
  let keys = Object.keys(data);
  let months = [];
  keys.forEach(function(key) {
    months.push(data[key]);
  });
  return months;
};

Loc.prototype.customDateFormats = function() {
  let formats = this.dates.dateTimeFormats.availableFormats;
  return {
    'full':   this.dateTime('full'),   //"EEEE, MMMM d, y at h:mm:ss a zzzz" => '%A, %c'
    'long':   this.dateTime('long'),   //"MMMM d, y at h:mm:ss a z" => '%c'
    'medium': this.dateTime('medium'), //"MMM d, y, h:mm:ss a" => '%x, %X %p'
    'short':  this.dateTime('short'),  //"M/d/yy, h:mm a" => '%-b/%-d/%y, %-I:%M %p'

    'yMMMEd': this._dateFormat(formats['yMMMEd']), //"E, MMM d, y" => '%a, %x'
    'yMEd':   this._dateFormat(formats['yMEd']),   //"E, M/d/y"    => '%a, %-m/%-d/%Y'
    'yMMMMd': this._dateFormat(formats['yMMMMd']), //"MMMM d, y"   => '%B %-d, %Y'
    'yMMMd':  this._dateFormat(formats['yMMMMd']), //"MMM d, y"    => '%x'
    'yMd':    this._dateFormat(formats['yMd']),    //"M/d/y"       => '%-m/%-d/%Y'

    'yMMMM':  this._dateFormat(formats['yMMMM']),  //"MMMM y" => '%B %Y'
    'yMMM':   this._dateFormat(formats['yMMM']),   //"MMM y"  => '%b %Y'
    'MMMd':   this._dateFormat(formats['MMMd']),   //"MMM d"  => '%b %-d'

    'EEEE': '%A',
    'MMMM': '%B',
    'MMM': '%b',
    'M': '%-m',
    'y': '%Y',
    'd': '%-d',
    'E': '%a'
  };
};

// "availableFormats": {
  //   "d": "d",
  //   "E": "ccc",
  //   "Ed": "ccc, d",
  //   "Ehm": "E h:mm a",
  //   "EHm": "E HH:mm",
  //   "Ehms": "E h:mm:ss a",
  //   "EHms": "E HH:mm:ss",
  //   "h": "h a",
  //   "H": "H",
  //   "hm": "h:mm a",
  //   "Hm": "H:mm",
  //   "hms": "h:mm:ss a",
  //   "Hms": "H:mm:ss",
  //   "hmsv": "h:mm:ss a v",
  //   "Hmsv": "H:mm:ss v",
  //   "hmv": "h:mm a v",
  //   "Hmv": "H:mm v",
  //   "M": "L",
  //   "Md": "dd.MM",
  //   "MEd": "E, dd.MM",
  //   "MMdd": "dd.MM",
  //   "MMM": "LLL",
  //   "MMMd": "d MMM",
  //   "MMMEd": "ccc, d MMM",
  //   "MMMMd": "d MMMM",
  //   "ms": "mm:ss",
  //   "y": "y",
  //   "yM": "MM.y",
  //   "yMd": "dd.MM.y",
  //   "yMEd": "ccc, d.MM.y 'г'.",
  //   "yMM": "MM.y",
  //   "yMMM": "LLL y 'г'.",
  //   "yMMMd": "d MMM y 'г'.",
  //   "yMMMEd": "E, d MMM y 'г'.",
  //   "yMMMM": "LLLL y 'г'.",
// },

Loc.prototype.numberFormat = function(number) {
  // Convert it into a String.
  number = '' + number;
  // Localize its decimal separator.
  number = number.replace(/\./, this.decimalSep);
  return number;
};

/**
 * Given a user date format preference in a form like 'mm/dd/yyyy'
 * returns a D3 formatting specifier like '%b/%d/%Y'
 *
 * @param {String} pref  A string encoding in the form 'yyyyMMDD'
 * which can contain one or more upper or lower case characters
 * in any order with optional separators or spaces
 * @return {String}  A date format pattern string in the form of '%b %-d, %Y'
 * @private
 */
Loc.prototype._dateFormat = function(pref) {
  var pattern = '%b %-d, %Y';
  if (!pref) {
    return pattern;
  }
  pattern = pref
    .replace('EEEE', '%A')
    .replace('MMMM', '%B')
    .replace('LLLL', '%B')
    .replace('MMM', '%b')
    .replace('LLL', '%b')
    .replace('MM', '%m')
    .replace('M', '%-m')
    .replace('dd', 'DD')
    .replace('d', '%-d')
    .replace('DD', '%d')
    .replace('yy', '*')
    .replace('y', '%Y')
    .replace('*', '%y')
    .replace(/\'/g, '');
  return pattern;
};

/**
 * Given a Sugar user time format preference
 * returns a D3 time formatting specifier
 *
 * @param {String} pref  A string encoding in the form 'h:ia'
 * where 'h' indicates 12 hour clock and 'H' indicates 24 hour clock
 * and 'i' with a colon as separator
 * @return {String}  A time format pattern string in the form of '%-I:%M'
 * @private
 */
Loc.prototype._timeFormat = function(pref) {
  var pattern = '%-I:%M:%S';
  if (!pref) {
    return pattern;
  }
  pattern = pref
    .replace('hh', '%I')
    .replace('h', '%-I')
    .replace('HH', '**')
    .replace('H', '%-H')
    .replace('**', '%H')
    .replace('mm', '%M')
    .replace('ss', '%S')
    .replace('zzzz', 'GMT%Z')
    .replace('z', 'GMT%Z')
    .replace(/[aA]+/, '%p')
    .replace(/\'/g, '');
  return pattern;
};

module.exports = Loc;

// D3 Formating
// %a - abbreviated weekday name.
// %A - full weekday name.
// %b - abbreviated month name.
// %B - full month name.
// %c - date and time, as "%a %b %e %H:%M:%S %Y".
// %d - zero-padded day of the month as a decimal number [01,31].
// %e - space-padded day of the month as a decimal number [ 1,31]; equivalent to %_d.
// %H - hour (24-hour clock) as a decimal number [00,23].
// %I - hour (12-hour clock) as a decimal number [01,12].
// %j - day of the year as a decimal number [001,366].
// %m - month as a decimal number [01,12].
// %M - minute as a decimal number [00,59].
// %L - milliseconds as a decimal number [000, 999].
// %p - either AM or PM.
// %S - second as a decimal number [00,61].
// %U - week number of the year (Sunday as the first day of the week) as a decimal number [00,53].
// %w - weekday as a decimal number [0(Sunday),6].
// %W - week number of the year (Monday as the first day of the week) as a decimal number [00,53].
// %x - date, as "%m/%d/%Y".
// %X - time, as "%H:%M:%S".
// %y - year without century as a decimal number [00,99].
// %Y - year with century as a decimal number.
// %Z - time zone offset, such as "-0700".
// %% - a literal "%" character.

// 0 - zero-padding
// _ - space-padding
// - - disable padding
