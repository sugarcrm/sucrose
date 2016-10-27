var tape = require("tape"),
    sucrose = require("../"),
    testExports = require("./test-exports");

tape("version matches package.json", function(test) {
  test.equal(sucrose.version, require("../package.json").version);
  test.end();
});

// for (var dependency in require("../package.json").dependencies) {
//   testExports(dependency);
// }

// Utilities

tape("sucrose.strip(string+padding) returns string", function(test) {
  test.equal(sucrose.strip("d "), "d");
  test.equal(sucrose.strip("d&"), "d");
  test.end();
});

tape("sucrose.identity(d) returns d", function(test) {
  test.equal(sucrose.identity("d"), "d");
  test.end();
});
