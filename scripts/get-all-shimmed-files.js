'use strict'

const plugins = require('../packages/dd-trace/src/plugins')
const fs = require('fs')
const path = require('path')

const names = new Set()

for (const pluginName in plugins) {
  for (const plugin of [].concat(plugins[pluginName])) {
    names.add([plugin.name, plugin.file].filter(val => val).join('/'))
  }
}

fs.writeFileSync(path.join(__dirname, '..', 'packages/dd-trace/src/plugins/all-shimmed-files.js'), `
'use strict'
/* eslint-disable */
// This file is generated from script/get-all-shimmed-files.js
module.exports = new Set(${JSON.stringify(Array.from(names))})
`)
