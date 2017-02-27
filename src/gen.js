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
        try {
          var pwd = process.cwd();
          process.chdir(outputBaseDir);//change process current directory to {outputBaseDir}
          add(item_path, outputDir);
          process.chdir(pwd);
        } catch (Error) {
          console.log(`GraphGL cannot parse ${inputSchemaFile} ,skipped this file.`);
          console.log(`ERROR:${Error}`);
        }
      }
    }
  });
}

function add(inputSchemaFile, outputDir, outputBaseDir) {
  const inputSchemaStr = fs.readFileSync(inputSchemaFile, 'utf8');
  const inputSchema = graphql.parse(inputSchemaStr);

  const type = inputSchema.definitions[0];
  const TypeName = type.name.value;
  const typeName = utils.lcFirst(TypeName);

  const outputSchemaStr = generateSchema(inputSchema);
  const resolversStr = generateResolvers(inputSchema);
  const modelStr = generateModel(inputSchema);

  ensureDirsOrFiles(outputBaseDir, ['schema', 'resolvers', 'model'], fs.ensureDirSync);

  fs.ensureDirSync(path.join(outputBaseDir, 'schema', outputDir));
  fs.ensureDirSync(path.join(outputBaseDir, 'resolvers', outputDir));
  fs.ensureDirSync(path.join(outputBaseDir, 'model', outputDir));

  fs.removeSync(path.join(outputBaseDir, 'schema', `${outputDir}/${typeName}.graphql`));
  fs.removeSync(path.join(outputBaseDir, 'resolvers', `${outputDir}/${typeName}.js`));
  fs.removeSync(path.join(outputBaseDir, 'model', `${outputDir}/${TypeName}.js`));

  fs.writeFileSync(path.join(outputBaseDir, 'schema', `${outputDir}/${typeName}.graphql`), outputSchemaStr);
  fs.writeFileSync(path.join(outputBaseDir, 'resolvers', `${outputDir}/${typeName}.js`), resolversStr);
  fs.writeFileSync(path.join(outputBaseDir, 'model', `${outputDir}/${TypeName}.js`), modelStr);

  var templatePath = path.join(__dirname, '..', 'template');
  if (!fs.existsSync(templatePath)) {
    console.error('Could not locate supplied template: ' + chalk.green(templatePath));
    return;
  }

  if (!fs.existsSync(path.join(outputBaseDir, 'schema', 'index.js'))) {
    fs.copySync(path.join(templatePath, 'schema/index.js'), path.join(outputBaseDir, 'schema/index.js'));
    console.log(`created ${path.join(templatePath, 'schema/index.js'), path.join(outputBaseDir, 'schema/index.js')}.`);
  }
  if (!fs.existsSync(path.join(outputBaseDir, 'resolvers', 'index.js'))) {
    fs.copySync(path.join(templatePath, 'resolvers/index.js'), path.join(outputBaseDir, 'resolvers/index.js'));
    console.log(`created ${path.join(templatePath, 'resolvers/index.js'), path.join(outputBaseDir, 'resolvers/index.js')}.`);
  }
  if (!fs.existsSync(path.join(outputBaseDir, 'model', 'index.js'))) {
    fs.copySync(path.join(templatePath, 'model/index.js'), path.join(outputBaseDir, 'model/index.js'));
    console.log(`created ${path.join(templatePath, 'model/index.js'), path.join(outputBaseDir, 'model/index.js')}.`);
  }

  fs.appendFileSync(path.join(outputBaseDir, 'schema', 'index.js'),
    `\ntypeDefs.push(requireGraphQL('./${path.join(outputDir, typeName)}.graphql'));\n`
  );
  console.log(`added schema:${typeName}`);
  fs.appendFileSync(path.join(outputBaseDir, 'resolvers', 'index.js'),
    `\nimport ${typeName}Resolvers from './${path.join(outputDir, typeName)}';\n` +
    `merge(resolvers, ${typeName}Resolvers);\n`
  );
  console.log(`added Resolver:${typeName}`);
  fs.appendFileSync(path.join(outputBaseDir, 'model', 'index.js'),
    `\nimport ${TypeName} from './${path.join(outputDir, typeName)}';\n` +
    `models.${TypeName} = ${TypeName};\n`
  );
  console.log(`added model:${typeName}`);
}

/**
 * 
 */
function ensureDirsOrFiles(dir, folders, exec) {
  forlders.forEach(function (item, index) {
    exec(path.join(dir, item));
  });
}

function copyTemplateFileIfNotExist(src, dist, files) {
  files.forEach(function (item, index) {
    if (!fs.existsSync(path.join(dist, item)))
      fs.copySync(path.join(src, item), path.join(dist, item));
  });
}