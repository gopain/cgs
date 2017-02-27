'use strict';

var fs = require('fs-extra');
var path = require('path');
var spawn = require('cross-spawn');
var chalk = require('chalk');
var graphql = require('graphql');
var generateSchema = require('./schema');
var generateResolvers = require('./resolvers');
var generateModel = require('./model');
var utils = require('./utils');
var add = require('./add');

module.exports = function (inputDir, outputDir) {
  inputDir = path.resolve(inputDir);
  outputDir = path.resolve(outputDir);
  console.log('gen project from ' + chalk.cyan(inputDir) + ' to ' + chalk.cyan(outputDir));
  if (!fs.existsSync(inputDir)) return console.log(`${inputDir} is not exist.`);
  var inputs = fs.readdirSync(inputDir);
  readFilesAndAdd(inputs, inputDir, '', outputDir);
}

function readFilesAndAdd(files, inputDir, outputDir, outputBaseDir) {

  files.forEach(function loop(item, index) {
    var item_path = path.join(inputDir, item);//graphql file or directory
    if (fs.statSync(item_path).isDirectory()) {
      // console.log(`Cannot support subfolder import.`);
      // continue;
      readFilesAndAdd(fs.readdirSync(item_path), item_path, path.join(outputDir, item), outputBaseDir);
    } else {
      if (item.indexOf('.graphql') == -1) console.log(`${item} is not a graphql file.`);
      else {
        utils.ensureDirsOrFiles(outputBaseDir, ['schema', 'resolvers', 'model'], fs.ensureDirSync);
        var templatePath = path.join(__dirname, '..', 'template');
        if (!fs.existsSync(templatePath)) {
          console.error('Could not locate supplied template: ' + chalk.green(templatePath));
          return;
        }
        utils.copyTemplateFileIfNotExist(templatePath, outputBaseDir, ['schema/index.js', 'resolvers/index.js', 'model/index.js'], fs.copySync);
        var pwd = process.cwd();
        try {
          process.chdir(outputBaseDir);//change process current directory to {outputBaseDir}
          add(item_path, outputDir);
          process.chdir(pwd);
        } catch (Error) {
          console.log(`GraphGL cannot parse ${item_path} ,skipped this file.`);
          console.log(`ERROR:${Error}`);
          process.chdir(pwd);
        }
      }
    }
  });
}
