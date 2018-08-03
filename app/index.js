#! /usr/bin/env node

const yaml = require('js-yaml');
const fs = require('fs');
const { ArgumentParser, Action } = require('argparse');
const transformInfo = require('./transformers/info');
const transformPath = require('./transformers/path');
const transformSecurityDefinitions = require('./transformers/securityDefinitions');
const transformExternalDocs = require('./transformers/externalDocs');
const transformDefinition = require('./transformers/definitions');
const packageInfo = require('../package.json');

const parser = new ArgumentParser({
  addHelp: true,
  description: 'swagger-markdown',
  version: packageInfo.version
});

parser.addArgument(['-i', '--input'], {
  required: true,
  help: 'Path to the swagger yaml file',
  metavar: '',
  dest: 'input'
});
parser.addArgument(['-o', '--output'], {
  help: 'Path to the resulting md file',
  metavar: '',
  dest: 'output'
});
parser.addArgument(['--match-path'], {
  help: 'Include paths that match the specified regex',
  metavar: '',
  type: 'string',
  dest: 'matchPath'
});
parser.addArgument(['--match-defn'], {
  help: 'Include definitions that match the specified regex',
  metavar: '',
  type: 'string',
  dest: 'matchDefn'
});
parser.addArgument(['--skip-info'], {
  action: Action.storeTrue,
  nargs: 0,
  help: 'Skip the title, description, version etc, whatever is in the info block.',
  metavar: '',
  dest: 'skipInfo'
});
const args = parser.parseArgs();
if (args.input) {
  const document = [];

  try {
    const inputDoc = yaml.safeLoad(fs.readFileSync(args.input, 'utf8'));
    const outputFile = args.output || args.input.replace(/(yaml|yml|json)$/i, 'md');

    const matchPathRe = (typeof args.matchPath === 'string' ? new RegExp(args.matchPath, 'g') : null);
    const matchDefnRe = (typeof args.matchDefn === 'string' ? new RegExp(args.matchDefn, 'g') : null);

    // Collect parameters
    const parameters = ('parameters' in inputDoc) ? inputDoc.parameters : {};

    // Process info
    if (!args.skipInfo && ('info' in inputDoc)) {
      document.push(transformInfo(inputDoc.info));
    }

    if ('externalDocs' in inputDoc) {
      document.push(transformExternalDocs(inputDoc.externalDocs));
    }

    // Security definitions
    if ('securityDefinitions' in inputDoc) {
      document.push(transformSecurityDefinitions(inputDoc.securityDefinitions));
    }

    // Process Paths
    if ('paths' in inputDoc) {
      Object.keys(inputDoc.paths).forEach(path => {
        if (matchPathRe == null || path.match(matchPathRe) != null) {
          document.push(transformPath(
            path,
            inputDoc.paths[path],
            parameters
          ));
        } else {
          console.log(`Skipping path '${path}'`);
        }
      });
    }

    // Models (definitions)
    if ('definitions' in inputDoc) {
      document.push(transformDefinition(
        inputDoc.definitions,
        { matchDefnRe }
      ));
    }

    fs.writeFile(outputFile, document.join('\n'), err => {
      if (err) {
        console.log(err);
      }
    });
  } catch (e) {
    console.log(e);
  }
}
