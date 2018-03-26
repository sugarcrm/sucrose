# Sucrose
[![npm version](https://badge.fury.io/js/sucrose.svg)](https://www.npmjs.com/package/sucrose)
[![Build Status](https://travis-ci.org/sugarcrm/sucrose.svg?branch=master)](https://travis-ci.org/sugarcrm/sucrose)
[![codecov](https://codecov.io/gh/sugarcrm/sucrose/branch/master/graph/badge.svg)](https://codecov.io/gh/sugarcrm/sucrose)

SugarCRM's Business Chart Library based on [D3](http://d3js.org) and using the [NVD3](http://nvd3.org/) reusable component pattern. This SVG chart library was created to provide a:
- flexible integration within the Sugar development environment
- single library for both desktop and mobile applications
- responsive content and formatting controls
- internationalization and localization support
- clean styling for legibility and clarity
- uses ES6 modules for custom builds for selected chart types
- over 1,800 unit, integration and data transform tests

## Using
This library is dependent on the [D3](http://d3js.org) library so you will need to include that library before Sucrose. D3 version 4.13.0 is the currently supported version and the prebuilt version included in the Sucrose repo is a custom bundle with a subset of D3 modules. Assuming you have downloaded the following files from the [Sucrose GitHub Repository](https://github.com/sugarcrm/sucrose/tree/master/build) local to your webpage:

1. Include a link tag to the sucrose.min.css in you document head
```html
<link rel="stylesheet" href="sucrose.min.css">
```
1. Include the following script tags at the bottom of your document:
```html
<script src="d3.min.js"></script>
<script src="topojson.min.js"></script>
<script src="sucrose.min.js"></script>
```

To render a chart, instantiate a new chart model, configure chart with options, bind data to a SVG container and call the chart model.
```html
<div id="chart_" class="chart">
  <svg class="sucrose sc-chart"></svg>
</div>
```
```javascript
var myChart = sucrose.charts.pieChart()

myChart.options({
    "tooltips": true,
    "donut": true,
    "maxRadius": 250,
    "showLabels": true
  });

d3.select('#chart_ svg')
  .attr('class', 'sucrose sc-chart sc-chart-pie')
  .datum(data)
    .call(myChart);
```

Chart config options can be found in the API docs. Example data can be found in `/examples/data` or `/test/files/transform`.

## Examples
The Sucrose Charts example application is available at [sucrose.io](http://sucrose.io) with configurator, data editor and development package download. The following chart types are currently available:
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

To view the example application locally,
1. From the root of the repo directory, run `make examples-prod`.
1. Open a browser to `sucrose/examples/index.html`.
1. The examples application is a stand-alone single page application which will run offline.
1. Instruction for using the example application coming soon.

To develop the example application,
1. Follow the instructions below to verify the build environment is up and running.
1. From the root of the repo directory, run: `make examples-dev`.
1. Open a browser to `sucrose/examples/index.html`.
1. The production application is cached in the browser with a manifest and appcache so you may need to clear the application storage cache when changing from production to development.
1. Run `make help` from the `/examples` directory to see a full list of make commands for rebuilding specific code components.

## Building
If you are developing new charts in Sucrose you can set up a dev environment with:

1. Clone this repo: `git clone git@github.com:sugarcrm/sucrose.git`
1. Go to the cloned repo directory: `cd ./sucrose`
1. To install the NPM packages needed for building the Sucrose source code (including Js, Css, D3 dependencies, and localization resources), run: `make dev`
1. To rebuild the entire Sucrose library during development run the make commands: `make clean` and then `make all`
1. Verify that the following core Sucrose files are still in the `/build` directory:
    * `sucrose.js`
    * `sucrose.min.js`
    * `sucrose.css`
    * `sucrose.min.css`
    * `sucrose.node.js`
1. You should also see the l10n support (see l10n [README](./scripts/lang/README.md) for more details):
    * `translation.json`
    * `locales.json`
1. You should also see the following third-party library files:
    * `d3.js`
    * `d3.min.js`
    * `topojson.js`
    * `topojson.min.js`
1. To just compile the Sucrose Js file, run: `make sucrose`
1. To compile a custom bundle of Sucrose and D3 for SugarCRM, run: `make sgr`
1. To see a full list of make commands for building specific code components, run: `make help`

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

After running unit or DOM code coverage tests, then run `npm run cover-rpt` to generate a coverage report at `/coverage/lcov-report/index.html`. The `cover-all` or `cover-int` NPM scripts run the coverage report automatically. The results of all coverage runs are merged automatically by `nyc`. See the testing [README](./test/README.md) for more details.

### Contributing:
See [CONTRIBUTING](CONTRIBUTING.md) for how you can contribute changes back into this project.

## Features
* Check out the live [Examples](http://sucrose.io/) at sucrose.io

## Contributing
Everyone is welcome to contribute to Sucrose!  If you make a contribution, then the [Contributor Terms](CONTRIBUTOR_TERMS.pdf) apply to your submission.

Please check out our [Contribution Guidelines](CONTRIBUTING.md) for requirements that will allow us to accept your pull request.

## License
Copyright 2018 SugarCRM, Licensed by SugarCRM under the Apache 2.0 license.
