// Modify the package.json for custom @sugarcrm/sucrose-sugar bundle

const fs = require('fs');
const packageName = 'package.json';
const backupName = 'package.backup.json';

fs.access(backupName, fs.constants.F_OK, err => {
    let packageJson = require('../' + packageName);
    if (err) {
        fs.writeFileSync(backupName, JSON.stringify(packageJson, null, '  '));
        console.log('Created package backup.');
    }
    if (packageJson.name === '@sugarcrm/sucrose-sugar') {
        console.log('sucrose-sugar package already built.');
        return;
    }
    packageJson.name = '@sugarcrm/sucrose-sugar';
    packageJson.dependencies['@sugarcrm/d3-sugar'] = packageJson.dependencies.d3;
    delete packageJson.dependencies.d3;
    delete packageJson.dependencies.topojson;
    delete packageJson.devDependencies;
    fs.writeFileSync(packageName, JSON.stringify(packageJson, null, '  '));
    console.log('Created package for sucrose-sugar.');
});
