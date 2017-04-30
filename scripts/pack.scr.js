// Modify the package.json for custom @sugarcrm/sucrose-sugar bundle

const fs = require('fs');
const packageName = '../package.json';
const backupName = '../package.backup.json';

fs.access(backupName, fs.constants.F_OK, function(err) {
    if (err) {
        return;
    }
    let packageJson = fs.createReadStream(backupName);

    packageJson.once('error', function(err) {
        console.log('======== ERROR ========');
        console.log(err);
    });
    packageJson.once('end', function() {
        console.log('Restored package backup');
    });

    packageJson.pipe(fs.createWriteStream(packageName));
    fs.unlinkSync(backupName);
});
