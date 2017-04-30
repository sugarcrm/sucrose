"use strict";

const istanbul = require("istanbul");
const path = require("path");
const fs = require("fs");

const accumulator = new istanbul.Collector();
let sync = true;
let counter = 0;

const Coverage = function() {
  this.collector = new istanbul.Collector();
  this.reporter = new istanbul.Reporter();
  counter += 1;

  // get coverage data from browser window
  this.load = function(nightmare) {
    nightmare
      .evaluate(function() {
        return {
          cov: window.__coverage__,
          name: window.__name__,
        };
      })
      .end()
      .then(function(covData) {
        let covFile = covData.name + "-" + nightmare.proc.pid + "-coverage.json";
        let covPath = path.join(process.cwd(), ".coverage");
        fs.mkdir(covPath, function() {
          fs.writeFile(path.join(covPath, covFile), JSON.stringify(covData.cov), "utf8", function (err) {
            if (err) {
              return console.log(err);
            }
          });
        });
        console.log("\nCoverage report:", covData.name);
        accumulator.add(covData.cov);
        this.collector.add(covData.cov);
        this.report(covData.name);
      }.bind(this))
      .catch(function(error) {
        let msg = error.details || error;
        console.error({"status": "error", "message": msg});
      });
  };

  this.report = function(name) {
    this.reporter.add("text");
    this.reporter.write(this.collector, sync, function() {
      console.log(name, "report generated.\n");
    });
    counter -= 1;
    if (counter === 0) {
      this.reportAll();
    }
  };

  this.reportAll = function() {
    let reporter = new istanbul.Reporter();
    reporter.addAll(["text"]);
    console.log("Cummulative Coverage Report:");
    reporter.write(accumulator, sync, function() {
      // console.log("Cummulative report generated.");
    });
  };
};

module.exports = Coverage;
