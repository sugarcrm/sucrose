// Modify the package.json for custom @sugarcrm/sucrose-sugar bundle

const fs = require('fs');
const packageName = 'package.json';
const backupName = 'package.backup.json';

fs.access(backupName, fs.constants.F_OK, err => {
    if (err) {
        return;
    }
    let packageJson = fs.createReadStream(backupName);

    packageJson.once('error', err => {
        console.log('======== ERROR ========');
        console.log(err);
    });
    packageJson.once('end', () => {
        console.log('Restored package backup');
    });

    packageJson.pipe(fs.createWriteStream(packageName));
    fs.unlinkSync(backupName);
});
