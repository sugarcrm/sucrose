// Modify the package.json for custom @sugarcrm/sucrose-sugar bundle

const fs = require('fs');
const packageName = './package.json';
const backupName = './package.backup.json'

fs.access(backupName, fs.constants.F_OK, function(err) {
    if (err) {
        return;
    }
    let package = fs.createReadStream(backupName);

    package.once('error', function(err) {
        console.log('======== ERROR ========');
        console.log(err);
    });
    package.once('end', function() {
        console.log('Restored package backup');
    });

    package.pipe(fs.createWriteStream(packageName));
    fs.unlinkSync(backupName);
});
