var fs = require('fs-extra');
var path = require('path');
var spawn = require('cross-spawn');
var chalk = require('chalk');

module.exports = function (name) {
  console.log('init projct ' + name);

  var appPath = path.resolve(name); //Full path
  var appName = path.basename(appPath); //last name in path string

  //Ensures that the directory exists. 
  //If the directory structure does not exist, it is created. Like mkdir -p.
  fs.ensureDirSync(name);

  //check if the directory is valid
  if (!isSafeToCreateProjectIn(appPath)) {
    console.log('The directory ' + chalk.green(name) + ' contains files that could conflict.');
    console.log('Try using a new directory name.');
    process.exit(1);
  }

  console.log('Creating a new GraphQL server ' + chalk.cyan(appName) + ' in ' + chalk.green(appPath) + '.');
  console.log();

  var packageJson = {
    name: appName,
    version: '0.1.0',
    private: true,
  };
  fs.writeFileSync(
    path.join(appPath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  var originalDirectory = process.cwd();
  process.chdir(appPath);

  var appPackage = require(path.join(appPath, 'package.json'));

  // Setup the script rules
  appPackage.scripts = {
    'start': 'babel-node index.js',
  };

  fs.writeFileSync(
    path.join(appPath, 'package.json'),
    JSON.stringify(appPackage, null, 2)
  );

  // Copy the files for the user
  var templatePath = path.join(__dirname, '..', 'template');
  if (fs.existsSync(templatePath)) {
    fs.copySync(templatePath, appPath);
  } else {
    console.error('Could not locate supplied template: ' + chalk.green(templatePath));
    return;
  }

  console.log('Installing npm packages!');
  var command;
  var args;
  command = 'yarn';
  args = ['add', '--dev'];
  args.push(
    'babel-cli',
    'babel-core',
    'babel-eslint',
    'babel-loader',
    'babel-plugin-inline-import',
    'babel-polyfill',
    'babel-preset-es2015',
    'babel-preset-es2017',
    'babel-preset-react',
    'babel-preset-stage-0',
    'babel-register',
    'chai',
    'eslint',
    'eslint-config-react-app',
    'eslint-plugin-babel',
    'eslint-plugin-flowtype',
    'eslint-plugin-import',
    'eslint-plugin-jsx-a11y',
    'eslint-plugin-react',
    'mocha',
    'node-fetch',
    'nodemon');

  var child = spawn(command, args, {
    stdio: 'inherit'
  });
  child.on('close', installDependencies);
}


// If project only contains files generated by GH, it’s safe.
function isSafeToCreateProjectIn(appPath) {
  var validFiles = [
    '.DS_Store', 'Thumbs.db', '.git', '.gitignore', '.idea', 'README.md', 'LICENSE', '.vscode'
  ];
  return fs.readdirSync(appPath)
    .every(function (file) {
      return validFiles.indexOf(file) >= 0;
    });
}

function installDependencies() {
  var args = ['add'];
  args.push(
    'express',
    'express-session',
    'body-parser',
    'cors',
    'lodash',
    'graphql',
    'graphql-tools',
    'graphql-server-express',
    'mongodb',
    'mongo-find-by-ids',
    'dataloader',
    'dotenv',
    'request-promise');

  var proc = spawn('yarn', args, {
    stdio: 'inherit'
  });
}