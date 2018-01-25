const fs = require('fs');
const rollup = require('rollup');
const dependencies = require('../package.json').dependencies;
const fileName = './build/sucrose.node.js';

rollup
  .rollup({
    input: 'index.js',
    external: Object.keys(dependencies),
  })
  .then(bundle => {
    return bundle.generate({
      format: 'cjs',
    });
  })
  .then(result => {
    return result.code.replace(
      'require(\'sucrose\')',
      'require(\'./sucrose.js\')'
    );
  })
  .then(code => {
    return new Promise((resolve, reject) => {
      fs.writeFile(fileName, code, 'utf8', error => {
        if (error) {
          return reject(error);
        } else {
          resolve();
        }
      });
    });
  })
  .catch(error => {
    console.error(error.stack);
  });
