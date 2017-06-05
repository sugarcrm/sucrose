// Modify the package.json for custom @sugarcrm/sucrose-sugar bundle

var fs = require('fs');
var packageName = './package.json';
var backupName = './package.backup.json'

fs.access(backupName, fs.constants.F_OK, function(err) {
    var package = require(packageName);
    if (err) {
        fs.writeFileSync(backupName, JSON.stringify(package, null, '  '));
    }
    package.name = '@sugarcrm/sucrose-sugar';
    package.dependencies['@sugarcrm/d3-sugar'] = package.dependencies.d3;
    delete package.dependencies.d3;
    delete package.dependencies.topojson;
    fs.writeFileSync(packageName, JSON.stringify(package, null, '  '));
    console.log('Created package backup');
});
