# Build Locale Objects for D3js
Npm module for generating D3 Locale settings files based on Unicode CLDR JSON data

Inspired by Rafael Xavier de Souza's
https://github.com/rxaviers/cldr-data-npm/tree/example-application

## Usage
Make sure you run in root of sucrose (should already exist if you ran `npm i` earlier):
    `npm i cldr cldr-data cldrjs`
To build locales, in root of sucrose run:
    `node ./scripts/lang/build_locales.js` or `make locales`
which will make a hashmap of D3 localities in:
    `build/locales.json`.
The build command will copy the locales file to the build folder.

To add or remove locales, edit the `src/data/cldr-locales.json` file using the pattern:
    `["xx_YY", "xx", "ZZZ", "xx-YY", "Klingon (Klinzhai)"]`
where `xx_YY` is the locales.json key, `xx` is the ISO language code, `ZZZ` is the ISO currency code,
`xx-YY` is the `node_modules/cldr/main/xx-YY` data folder, followed by an english translation of
the language and locale (country) like `"Klingon (Klinzhai)"`.

Then load the `build/locales.json` on your page into a `locales` variable and in Sucrose chart instantiation pass a locale object to set string/datetime/number formatting options:
```javascript
    var myLocale = locales['en_US'];
    var chart = sucrose.chart.pieChart.locality(myLocale);
```
The default formatters in the charts and models will now have localized content.
For instance, the pieChart tooltip uses a format utility function:
```javascript
    var val = utility.numberFormat(y, 2, yIsCurrency, chart.locality());
```
With locales['en_US'] the display string for `1234.567` as currency will be `$1,234.57`
while for locales['fr_FR'] the display string will be `1 234,57 €`.

## Resources
The following sites were extremely helpful in developing this script:

http://cldr.unicode.org/index  
https://github.com/rxaviers/cldrjs  
https://github.com/jquery/globalize  
https://github.com/twitter/twitter-cldr-js  
https://github.com/mbostock/d3/wiki/Time-Formatting  
http://cldr.unicode.org/translation/number-patterns  
https://rxaviers.github.io/javascript-globalization/  
http://www.unicode.org/cldr/charts/28/by_type/numbers.number_formatting_patterns.html  
https://lh.2xlibre.net/  
http://www.localeplanet.com/icu/index.html  
http://momentjs.com/  
http://johnnyreilly.github.io/globalize-so-what-cha-want/#/?currency=true&date=true&message=false&number=true&plural=false&relativeTime=false&unit=false  
http://www.globalbydesign.com/2011/12/08/how-to-localize-date-formats-using-globalize-js/  
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString  
http://www.unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table  
http://npm.taobao.org/browse/keyword/locale  
https://www.branah.com/unicode-converter  
https://github.com/globalizejs/globalize/issues/758  
https://github.com/d3/d3-format/issues/34  

## License
Copyright 2018 SugarCRM, Licensed by SugarCRM under the Apache 2.0 license.
