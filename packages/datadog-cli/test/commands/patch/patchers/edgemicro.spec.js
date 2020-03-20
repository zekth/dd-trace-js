'use strict'

const fs = require('fs')
const patch = require('../../../../src/commands/patch/patchers/edgemicro')

wrapIt()

const dirname = `${__dirname}/../../../../node_modules/edgemicro/cli/lib`

describe('cli/commands/patch/edgemicro', () => {
  afterEach(() => {
    if (fs.existsSync(`${dirname}/start-agent.original.js`)) {
      fs.copyFileSync(`${dirname}/start-agent.original.js`, `${dirname}/start-agent.js`)
      fs.unlinkSync(`${dirname}/start-agent.original.js`)
    }
  })

  it('should patch edgemicro locally', () => {
    const unpatched = fs.readFileSync(`${dirname}/start-agent.js`).toString()

    patch()

    const patched = fs.readFileSync(`${dirname}/start-agent.js`).toString()
    const original = fs.readFileSync(`${dirname}/start-agent.original.js`).toString()

    expect(unpatched).to.equal(original)
    expect(patched).to.include('edgemicro')
    expect(patched).to.include('dd-trace')
  })
})
