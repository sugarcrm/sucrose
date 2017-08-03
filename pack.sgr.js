// Modify the package.json for custom @sugarcrm/sucrose-sugar bundle

const fs = require('fs');
const packageName = './package.json';
const backupName = './package.backup.json'

fs.access(backupName, fs.constants.F_OK, function(err) {
    let package = require(packageName);
    if (err) {
        fs.writeFileSync(backupName, JSON.stringify(package, null, '  '));
        console.log('Created package backup.');
    }
    if (package.name === '@sugarcrm/sucrose-sugar') {
        console.log('sucrose-sugar package already built.')
        return;
    }
    package.name = '@sugarcrm/sucrose-sugar';
    package.dependencies['@sugarcrm/d3-sugar'] = package.dependencies.d3;
    delete package.dependencies.d3;
    delete package.dependencies.topojson;
    fs.writeFileSync(packageName, JSON.stringify(package, null, '  '));
});
