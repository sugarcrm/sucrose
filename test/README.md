# Sucrose Testing Framework

## NVD3 Chart Component Pattern
Because the Sucrose Chart Library started off as a clone of NVD3, it uses the chart component pattern introduced by NVD3 as a response to Mike Bostok's blog post on reusable chart components. As such, it is built from individual common components (e.g., axis, menu, header) and rendering models (e.g., line, multibar, pie) that are composed into richer chart objects (e.g., paretoChart, lineChart). There are also a few tooling components like utility, tooltip and scroller.

The component, model and chart modules are built using the revealing module Js pattern where chainable public methods assigned to a closure are responsible for setting/getting protected properties. Private functions have access to public and private properties and protected methods defined inside the closure are responsible for rendering the SVG.

## Testing Methodology
Unit tests are written to cover all public accessor methods, but since the Sucrose chart objects also have many private rendering methods, the entire component can't be tested with just unit tests. Take for instance the example code below.

```javascript
sucrose.charts.pieChart = function() {
  // protected property
  var showTitle = false;
  // private property
  var titleIntro = "Chart title: ";
  // private function
  function formatTitle(data) {
    return titleIntro + data.title;
  }
  // render function (closure)
  var chart = function(selection) {
    selection.each(function(chartData) {
      var container = this;

      // protected method
      chart.render = function() {
        if (showTitle) {
          container.append('text')
            .text(formatTitle(chartData));
        } else {
          container.select('text')
            .remove();
        }
      };

      chart.render();
    });

    return chart;
  };

  // public getter/setter
  chart.showTitle = function(_) {
    if (!arguments.length) return showTitle;
    showTitle = _;
    return chart;
  };

  return chart;
};

var myChart = sucrose.charts.pieChart();

myChart.showTitle(true);

d3.select('svg.container')
  .data(myJson)
    .call(myChart);
```

The public `showTitle()` method can be unit tested. Called without parameters it will return the default showTitle value `false`. If called with a parameter option, that value will be persisted in the chart instance (and the chart object returned for for method chaining).

However, the private `formatTitle()` rendering method cannot be unit tested. The Sucrose testing methodology requires configuring the chart options then executing various public rendering and user interaction methods before testing the attached DOM for artifacts.

There are two test types that can be used to provide coverage for the private rendering functions. The easiest is to use JSDOM to create an HTML context then attach the chart object to a new DOM element in that context. When a property in the chart object is set and its rendering script is executed, the DOM can be inspected to verify that the proper manipulation has taken place. This test by proxy is almost as fast as a unit test but there is some integration or functional tests that are not possible with this solution.

In order to support various test scenarios that require more complex rendering functionality, it is necessary to set up a browser client and web server within the testing framework:
- testing methods that respond to user interaction,
- how the chart interacts within a browser context (like resizing as a window resizes), or
- if the chart is formatted using CSS.

Also, there are a few visual tests for validating datetime/number formatting with locales.

## Testing Framework
Scripts: /sucrose/package.json  
Test folder location: /sucrose/test/  
Data files: ./test/files/  
Text target fixtures: ./test/fixtures/  
Instrumented Sucrose source: ./fixtures/build/  
Harnesses libraries: ./test/lib/  
Test specifications: ./test/specs/  
Unit tests: ./specs/unit/  
DOM tests: ./specs/dom/  
Integration tests: ./specs/int/

## Running Tests
### NPM Scripts
The NPM root `package.json` file contains a number of code blocks that are related to running tests. The “scripts” block contains a list of NPM scripts that run the three types of tests (unit, dom, integration). Before running any automated tests, it is necessary to generate the instrumented version of the Sucrose library by executing `npm run instrument`. To run only the unit test suites execute `npm run test-unit` from the root of your local checkout of the Sucrose repository, while using `npm test` will run all tests found under `/test/specs/`. During development if you only wish to run one test suite, then run the command node `./node_modules/.bin/tape 'test/specs/[type]/[your-test].js'`

All tests are developed using the Tape testing library and organized into test suites using Tapes under `./test/specs/`. Common test harness scripts written specifically for Sucrose are under the `./test/lib/`. The `twine.js` script is included in all unit tests to provide custom assertions that all public methods available in the tested chart components are covered. For integration tests, the script `dreams.js` is for configuring and extending the Nightmare browser automation library, `server.js` is for bootstrapping a simple node web server, and `coverage.js` is for setting up the Istanbul code coverage analysis and reporting tools.

### Code Coverage
Tracking which lines of library code are executed during a full run of testing is useful for making sure there is complete test coverage and also will identify heavily used sections of code appropriate for optimization efforts or sections of dead code not run at all. To run coverage analysis for just the unit tests execute the  npm run cover-unit script to run the unit tests along with code coverage analysis and reporting provided by Istanbul’s `nyc` CLI. Configuration of nyc is defined in the `package.json` which defines which fixture files are to anaylized and that the output of the Istanbul tool is written to the `./.coverage` temporary directory. After running code coverage scripts, then execute the `npm run cover-rpt `script to generate a human readable HTML report in the `./coverage/lcov-report/index.html` file. To generate a full coverage report for all test types then execute npm run cover-all.

Because the unit and DOM tests are executing in a node environment, Istanbul is able to share the same temporary coverage data file under `./.coverage/`. However, because the integration tests are executed in isolated Nightmare browser contexts, the `coverage.js` harness script included in all integration tests handles writing the coverage data to the temporary directory. The nyc reporting tool is then able to merge all the temporary files into one unified report because they all share the same instrumented `sucrose.js` file in `./test/fixtures/build/`.

## Travis-ci Integration [![Build Status](https://travis-ci.org/sugarcrm/sucrose.svg?branch=master)](https://travis-ci.org/sugarcrm/sucrose)
A continous integration service provides a way for any pull requests against the Github repository to have a complete run of all tests pass before they are merged. It is helpful to show on the repository home page the status of all tests. The sucrose repository is now set up to use the Travis-ci service. When Travis-ci detects a new PR, it will create a new execution environment and run the npm install script. The .travis.yml file defines three npm scripts to run for each pull request: npm run instrument to run before the tests, npm run cover-all (instead of the default npm test), and then npm run report-coverage which uploads the raw Instanbul code coverage data to the code coverage reporting service codecov.io  after all tests are complete. The test pass/fail badge is now displayed on the Sucrose Github repository.

## Codecov.io Integration [![codecov](https://codecov.io/gh/sugarcrm/sucrose/branch/master/graph/badge.svg)](https://codecov.io/gh/sugarcrm/sucrose)
As new code contributions are offered as pull requests against the Github repository, it is import that the overall code coverage does not decrease. Over time the percentage of code in the Sucrose library should increase to 100%. Sucrose is now set up to use the codecov.io coverage reporting service provides the ability to monitor the progress or regression towards complete code coverage by storing the codecov report data from each PR test run. A badge on the Sucrose Github repository shows the current percentage of code coverage.

## Testing Libraries
Tape: test assertions, runner and TAP reporter  
Extend-tape: custom test assertions  
Tapes: test grouping with before/afterEach  
Faucet: TAP summarizer and formatting  
Jsdom: virtual HTML DOM  
Nightmare: Electorn based browser automation library  
Istanbul: code coverage  
Nyc: coverage runner  
Travis-ci: continuous integration hosting  
Codecov.io: coverage reporting hosting

## Using Tape and Nightmare
They rock. Some articles that helped very much:
https://github.com/substack/tape
https://medium.com/javascript-scene/why-i-use-tape-instead-of-mocha-so-should-you-6aa105d8eaf4
https://ponyfoo.com/articles/testing-javascript-modules-with-tape
https://www.npmjs.com/package/tape-suite
https://remysharp.com/2015/12/14/my-node-test-strategy
http://www.nodejsconnect.com/blog/articles/using-promises-and-tape-easy-testing
https://ci.testling.com/guide/tape
https://github.com/dwyl/learn-tape
https://paul.kinlan.me/the-headless-web/
https://developers.google.com/web/updates/2017/04/headless-chrome
http://www.nightmarejs.org/
https://segment.com/blog/ui-testing-with-nightmare/
https://www.toptal.com/nodejs/nodejs-guide-integration-tests
https://github.com/visionmedia/supertest
http://codecept.io/nightmare/
https://nodejs.org/en/docs/guides/anatomy-of-an-http-transaction/
https://gist.github.com/ryanflorence/701407
http://benjamincollins.com/blog/an-integration-testing-nightmare/
https://electron.atom.io/docs/api/browser-window/#new-browserwindowoptions
https://github.com/rosshinkley/nightmare-examples/blob/master/docs/beginner/action.md
http://christopherdecoster.com/posts/nightmare/
https://github.com/Raynos/test-server-request
https://github.com/binocarlos/nightmare-tape
https://www.toptal.com/nodejs/nodejs-guide-integration-tests
https://blog.engineyard.com/2015/measuring-clientside-javascript-test-coverage-with-istanbul
https://medium.com/@arnaudrinquin/frictionless-unit-testing-in-javascript-with-browser-tap-6ac2cea89a59

## License
Copyright 2017 SugarCRM, Licensed by SugarCRM under the Apache 2.0 license.
