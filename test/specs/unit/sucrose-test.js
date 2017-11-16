const tape = require("tape");
const sucrose = require("../../fixtures/build/sucrose.js");
// const testExports = require("./test-exports");

tape("UNIT: sucrose - version matches package.json", function(test) {
    test.equal(sucrose.version, require("../../../package.json").version);
    test.end();
});

// for (var dependency in require("../package.json").dependencies) {
//   testExports(dependency);
// }
