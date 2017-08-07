// Usage: from /examples/manifest folder run:
//      `node scripts/serialize manifest.js` will generate single manifest.json
//      `for f in *.js ; do node scripts/serialize "$f" ; done` will generate all manifests
const fs = require('fs');
const toJson = require('./tojson.js');
let inFile = './' + process.argv[2];
let outFile = inFile + 'on';

fs.access(inFile, fs.constants.R_OK, function(err) {
    if (err) {
        if (err.code === 'ENOENT') {
            console.error('Manifest source file does not exist.');
            return;
        }

        throw err;
    }

    let manifest = require('.' + inFile);
    let json = toJson(manifest);

    fs.writeFile(outFile, json, function() {
        console.log('Manifest file written to ' + outFile);
    });
});
