"use strict";

const Nightmare = require("nightmare");
const tape = require("tape");
const tapes = require("tapes");

const Coverage = require("./coverage.js");
const server = require("./server.js");

let argv = process.argv.slice(2);
let dts = new Date();

Nightmare
  .action("chart", function(options, done) {
    this.evaluate_now(function(options) {
      reset();
      model(options);
    }, done, options);
  });
Nightmare
  .action("config", function(options, done) {
    this.evaluate_now(function(options) {
      config(options);
    }, done, options);
  });
Nightmare
  .action("render", function(data, done) {
    this.evaluate_now(function(data) {
      // accepts json or object
      render(data);
    }, done, data);
  });


const Dreams = function(options) {
  // CLI flag --debug loads dev config in nightmare
  this.tests = tapes(tape);
  this.coverage = new Coverage();
  this.nightmare = new Nightmare(this.config());

  // Boot up the server
  this.awaken = function() {
    this.startup(options);

    this.nightmare
      .goto("http://localhost:" + options.port + options.uri)
      .wait(options.wait)
      .evaluate(function(name) {
        window.__name__ = name;
      }, options.name);

    return this.nightmare;
  };

  // Shutdown server and finish test report
  this.sleep = function() {
    tape.onFinish(function() {
      console.log(options.name + " sleep");
      // closes the server
      this.shutdown();
      // test coverage if enabled
      this.runCoverage();
    }.bind(this));
  };

  this.runCoverage = function() {
    let coverActive = argv.reduce(function(a, c) {
        return a || c === "--cover";
      }, false);
    if (coverActive) {
      this.coverage.load(this.nightmare);
    } else {
      this.nightmare.end().then();
    }
  };

};

Dreams.prototype.config = function() {
  let config_prod = {
        show: false,
        wait: 10,
        executionTimeout: 10000,
      };
  let config_dev = {
        show: true,
        openDevTools: true,
        waitTimeout: 90000000,
        wait: 90000000,
        executionTimeout: 90000000,
        dock: true,
      };
  return argv.reduce(function(a, c) {
      return a || c === "--debug";
    }, false) ? config_dev : config_prod;
};

Dreams.prototype.error = function(error, assert, nightmare) {
  let message;
  assert.end();
  nightmare.end().then();
  if (typeof error.details !== "undefined" && error.details !== "") {
    message = error.details;
  } else if (typeof error == "string") {
    message = error;
    if (error === "Cannot read property 'focus' of null") {
      message += " (Likely because a non-existent selector was used)";
    }
  } else {
    message = error.message;
  }
  console.error({"status": "error", "message": message});
};

Dreams.prototype.startup = function(options) {
  if (server.address()) {
    return;
  }
  server.listen(options.port, function(err) {
    if (err) {
      return console.error("HTTP server: something bad happened.", err);
    }
    console.log(`HTTP server: is listening on ${options.port}`);
  });
};

Dreams.prototype.shutdown = function() {
  if (!server.address()) {
    return;
  }
  server.close();
  console.log("HTTP server: server shutdown");
  let dte = new Date();
  console.log("Total test time:", (dte - dts) + "ms");
};


module.exports = Dreams;
