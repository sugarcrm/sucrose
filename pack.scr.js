// Modify the package.json for custom @sugarcrm/sucrose-sugar bundle

var fs = require('fs');
var packageName = './package.json';
var backupName = './package.backup.json'

fs.access(backupName, fs.constants.F_OK, function(err) {
    var package;
    if (err) {
        return;
    }
    package = require(backupName);
    fs.writeFileSync(packageName, JSON.stringify(package, null, '  '));
    fs.unlinkSync(backupName);
    console.log('Restored package backup');
});
