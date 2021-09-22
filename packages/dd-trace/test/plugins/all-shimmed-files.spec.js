'use strict'

const plugins = require('../../src/plugins')

const names = new Set()

for (const pluginName in plugins) {
  for (const plugin of [].concat(plugins[pluginName])) {
    names.add([plugin.name, plugin.file].filter(val => val).join('/'))
  }
}

const allShimmed = require('../../src/plugins/all-shimmed-files.js')

describe('all-shimmed-files', () => {
  it('should have the correct content', () => {
    expect(allShimmed instanceof Set).to.be.true
    expect(Array.from(allShimmed)).to.deep.equal(Array.from(names))
  })
})
