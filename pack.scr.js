// Modify the package.json for custom @sugarcrm/sucrose-sugar bundle

var fs = require('fs');
var packageName = './package.json';
var backupName = './package.backup.json'

fs.access(backupName, fs.constants.F_OK, function(err) {
    if (err) {
        return;
    }
    let package = fs.createReadStream(backupName);

    package.once('error', function(err) {
        console.log(err);
    });
    package.once('end', function() {
        console.log('Restored package backup');
    });

    package.pipe(fs.createWriteStream(packageName));
    fs.unlinkSync(backupName);
});
