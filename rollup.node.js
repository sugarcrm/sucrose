var fs = require('fs'),
    rollup = require('rollup'),
    dependencies = require('./package.json').dependencies;

rollup
  .rollup({
    entry: 'index.js',
    external: Object.keys(dependencies),
    // context: './build/' //TODO: the index.js issue might be resolved by context
  }) // returns a Promise
  .then(function(bundle) {
    var code = bundle.generate({
          format: 'cjs'
        }).code;

    code = code
      .replace(
        /^exports\.event = (.*);$/m,
        'Object.defineProperty(exports, \'event\', {get: function() { return $1; }});'
      )
      //TODO: why do i need to do this? because index.js can't import from ./build/sucrose.js
      .replace(
        'require(\'sucrose\')',
        'require(\'./build/sucrose.js\')'
      );

    return new Promise(function(resolve, reject) {
      fs.writeFile('./build/sucrose.node.js', code, 'utf8', function(error) {
        if (error) return reject(error);
        else resolve();
      });
    });
  })
  .catch(abort);

function abort(error) {
  console.error(error.stack);
}
