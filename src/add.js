var fs = require('fs-extra');
var path = require('path');
var spawn = require('cross-spawn');
var chalk = require('chalk');
var graphql = require('graphql');
var generateSchema = require('./schema');
var generateResolvers = require('./resolvers');
var generateModel = require('./model');
var utils = require('./utils');

module.exports = function (inputSchemaFile, outputDir) {

  const inputSchemaStr = fs.readFileSync(inputSchemaFile, 'utf8');
  let inputSchema = {};
  try {
    inputSchema = graphql.parse(inputSchemaStr);
  } catch (graphqlParseError) {
    console.log(graphqlParseError);
    throw graphqlParseError;
  }

  const type = inputSchema.definitions[0];
  const TypeName = type.name.value;
  const typeName = utils.lcFirst(TypeName);

  let outputSchemaStr = undefined;
  let resolversStr = undefined;
  let modelStr = undefined;
  try {
    outputSchemaStr = generateSchema(inputSchema);
    resolversStr = generateResolvers(inputSchema);
    modelStr = generateModel(inputSchema);
  } catch (createOutputError) {
    console.log(createOutputError);
    throw createOutputError;
  }
  var typeFolder = outputDir ? path.join(outputDir, typeName) : typeName;
  var TypeFolder = outputDir ? path.join(outputDir, TypeName) : TypeName;
  utils.ensureDirsOrFiles(process.cwd(), [path.join('schema', outputDir), path.join('resolvers', outputDir), path.join('model', outputDir)], fs.ensureDirSync);
  //TODO we need to check the exist of schema directory before write file
  if (fs.existsSync(path.join('schema', `${typeName}.graphql`)) || fs.existsSync(path.join('resolvers', `${typeName}.js`)) || fs.existsSync(path.join('model', `${typeName}.js`))) {
    throw new Error(`${typeName}.graphql already in ${process.cwd()} project.`);
  }

  fs.writeFileSync(path.join('schema', `${typeFolder}.graphql`), outputSchemaStr);
  fs.writeFileSync(path.join('resolvers', `${typeFolder}.js`), resolversStr);
  fs.writeFileSync(path.join('model', `${TypeFolder}.js`), modelStr);

  fs.appendFileSync(path.join('schema', 'index.js'),
    `\ntypeDefs.push(requireGraphQL('./${typeFolder}.graphql'));\n`
  );

  fs.appendFileSync(path.join('resolvers', 'index.js'),
    `\nimport ${typeName}Resolvers from './${typeFolder}';\n` +
    `merge(resolvers, ${typeName}Resolvers);\n`
  );

  fs.appendFileSync(path.join('model', 'index.js'),
    `\nimport ${TypeName} from './${TypeFolder}';\n` +
    `models.${TypeName} = ${TypeName};\n`
  );
}