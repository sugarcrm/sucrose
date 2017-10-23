# Sucrose
[![npm version](https://badge.fury.io/js/sucrose.svg)](https://badge.fury.io/js/sucrose)
[![Build Status](https://travis-ci.org/sugarcrm/sucrose.svg?branch=master)](https://travis-ci.org/sugarcrm/sucrose)
[![codecov](https://codecov.io/gh/sugarcrm/sucrose/branch/master/graph/badge.svg)](https://codecov.io/gh/sugarcrm/sucrose)

SugarCRM's Business Chart Library based on [D3](http://d3js.org) and using the [NVD3](http://nvd3.org/) reusable component pattern. This SVG chart library was created to provide a:
- flexible integration within the Sugar development environment
- single library for both desktop and mobile applications
- responsive content and formatting controls
- internationalization and localization support
- clean styling for legibility and clarity
- uses ES6 modules for custom builds for selected chart types
- over 1,500 unit and integration tests

## Using
This library is dependent on the [D3](http://d3js.org) library so you will need to include that library before Sucrose.

1. Include a link tag to the sucrose.min.css in you document head
```html
<link rel="stylesheet" href="css/sucrose.min.css">
```
1. Include the following script tags at the bottom of your document:
```html
<script src="d3.min.js"></script>
<script src="topojson.min.js"></script>
<script src="sucrose.min.js"></script>
```

To render a chart, instantiate a new chart model, configure chart with options, bind data to a svg container and call the chart model.
```html
<div id="chart_" class="chart">
  <svg class="sucrose sc-chart"></svg>
</div>
```
```javascript
var myChart = sucrose.charts.pieChart()

myChart.options{
  "tooltips": true,
  "donut": true,
  "maxRadius": 250,
  "showLabels": true
})

d3.select('#chart_ svg')
  .attr('class', 'sucrose sc-chart sc-chart-pie')
  .datum(data)
    .call(myChart)
```

Chart config options can be found in the API docs.

## Examples
The Sucrose Charts example application is available at [sucrose.io](http://sucrose.io) with configurator, data editor and package download. The following chart types are currently available:
  - [Multibar Chart](http://sucrose.io/index.html?type=multibar)
  - [Line Chart](http://sucrose.io/index.html?type=line)
  - [Pie Chart](http://sucrose.io/index.html?type=pie)
  - [Funnel Chart](http://sucrose.io/index.html?type=funnel)
  - [Bubble Chart](http://sucrose.io/index.html?type=bubble)
  - [Treemap Chart](http://sucrose.io/index.html?type=treemap)
  - [Pareto Chart](http://sucrose.io/index.html?type=pareto)
  - [Gauge Chart](http://sucrose.io/index.html?type=gauge)
  - [Stacked Area Chart](http://sucrose.io/index.html?type=area)
  - [Tree Chart](http://sucrose.io/index.html?type=tree)
  - [Globe Chart](http://sucrose.io/index.html?type=globe)

## Building
If you are developing new charts in Sucrose you can set a dev environment with:

1. Clone this repo: `git clone git@github.com:sugarcrm/sucrose.git`
1. Go to the cloned repo directory: `cd ./sucrose`
1. Run `npm install` to install node modules needed for building source code
1. Run the make commands: `make clean` and then `make all`
1. Verify that the following core Sucrose files are still in the /build directory:
  - `sucrose.js`
  - `sucrose.min.js`
  - `sucrose.css`
  - `sucrose.min.css`
  - `sucrose.node.js`
1. You should also see the l10n support (see l10n [README](./src/scripts/lang/README.md) for more details):
  - `translation.json`
  - `locales.json`
1. You should also see the following third-party library files:
  - `d3.js`
  - `d3.min.js`
  - `topojson.js`
  - `topojson.min.js`
1. Run `make sucrose` to just compile the sucrose library
1. Run `make help` to see a full list of make commands for building specific code components

## Testing

Unit and integration tests can be run with and without code coverage reporting, from within the repo root:
1. for unit tests run: `npm run test-unit`
1. for DOM (simple integration) tests run: `npm run test-dom`
1. for integration tests running in a headless browser run: `npm run test-int`
1. for all tests run: `npm test`

For code coverage analysis first run `npm run instrument` in order to generate the needed instrumented source files, then:
1. for unit test code coverage run: `npm run cover-unit`
1. for DOM test code coverage run: `npm run cover-dom`
1. for integration test code coverage run: `npm run cover-int`
1. for complete code coverage run: `npm run cover-all`

After running unit or DOm code coverage tests then run `npm run cover-rpt` to generate a coverage report at `/coverage/lcov-report/index.html`. The cover-all or cover-int scripts run the report automatically. The results of all coverage runs are merged automatically by `nyc`. See the testing [README](./test/README.md) for more details.

### Contributing:
See [CONTRIBUTING](CONTRIBUTING.md) for how you can contribute changes back into this project.

## Features
* Check out the live [Examples](http://sucrose.io/) at sucrose.io

## Contributing
Everyone is welcome to contribute to Sucrose!  If you make a contribution, then the [Contributor Terms](CONTRIBUTOR_TERMS.pdf) apply to your submission.

Please check out our [Contribution Guidelines](CONTRIBUTING.md) for requirements that will allow us to accept your pull request.

## License
Copyright 2017 SugarCRM, Licensed by SugarCRM under the Apache 2.0 license.
