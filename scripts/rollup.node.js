const fs = require('fs');
const rollup = require('rollup');
const dependencies = require('../package.json').dependencies;
const fileName = './build/sucrose.node.js';

rollup.rollup({
  entry: 'index.js',
  external: Object.keys(dependencies)
}).then(function(bundle) {
  var code = bundle.generate({format: 'cjs'}).code.replace(
        'require(\'sucrose\')',
        'require(\'./sucrose.js\')'
      );
  return new Promise(function(resolve, reject) {
    fs.writeFile(fileName, code, 'utf8', function(error) {
      if (error) {
        return reject(error);
      }
      else {
        resolve();
      }
    });
  });
}).catch(abort);

function abort(error) {
  console.error(error.stack);
}
