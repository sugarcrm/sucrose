const tape = require("tape");
const sucrose = require("../../fixtures/build/sucrose.js");

module.exports = function(moduleName) {
  var module = require(moduleName);
  tape("sucrose exports everything from " + moduleName, function(test) {
    for (var symbol in module) {
      if (symbol !== "version") {
        test.equal(symbol in sucrose, true, moduleName + " export " + symbol);
      }
    }
    test.end();
  });
};
