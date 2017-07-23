# Sucrose
[![Build Status](https://travis-ci.org/sugarcrm/sucrose.svg?branch=master)](https://travis-ci.org/sugarcrm/sucrose)
[![codecov](https://codecov.io/gh/sugarcrm/sucrose/branch/master/graph/badge.svg)](https://codecov.io/gh/sugarcrm/sucrose)

SugarCRM's Chart Library: based on [D3](http://d3js.org) and derived from [NVD3](http://nvd3.org/).

## Using

### Note:
This library is dependent on the [D3](http://d3js.org) library so you will need to include that library before Sucrose.

1. Include a link tag to the sucrose.min.css in you document head
1. Include a link to the following script tags at the bottom of your document:
    - `d3.min.js`
    - `d3fc-rebind.min.js`
    - `sucrose.min.js`

## Building

1. Clone this repo: `git clone git@github.com:sugarcrm/sucrose.git`
1. Go to the cloned repo directory: `cd ./sucrose`
1. Run `npm i --save-dev` to install node modules needed for building source code
1. Run the make commands: `make clean` and then `make all`
1. Verify that the files sucrose.js, sucrose.min.js, sucrose.css, and sucrose.min.css are still in the /build directory

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

After running unit or DOm code coverage tests then run `npm run cover-rpt` to generate a coverage report at `/coverage/lcov-report/index.html`. The cover-all or cover-int scripts run the report automatically. The results of all coverage runs are merged automatically by `nyc`.


### Contributing:
See [CONTRIBUTING](CONTRIBUTING.md) for how you can contribute changes back into this project.

## Features
* Check out the live [Examples](http://sucrose.io/) at sucrose.io

## Contributing

Everyone is welcome to contribute to Sucrose!  If you make a contribution, then the [Contributor Terms](CONTRIBUTOR_TERMS.pdf) apply to your submission.

Please check out our [Contribution Guidelines](CONTRIBUTING.md) for requirements that will allow us to accept your pull request.

-----
Copyright 2016 SugarCRM, Licensed by SugarCRM under the Apache 2.0 license.
