#!/usr/bin/env node

'use strict'

const yargs = require('yargs')

const patch = require('./commands/patch')

const argv = yargs
  .scriptName('dd-trace-js')
  .usage('$0 <cmd> [args]')
  .command('patch [name]', 'Patch one or multiple comma-separated modules statically.', (yargs) => {
    yargs.positional('name', {
      type: 'string',
      default: '*',
      describe: 'The module name(s).'
    })
  }, patch)
  .showHelpOnFail(true)
  .demandCommand(1, '')
  .strict()
  .help()
  .argv

module.exports = argv
