'use strict'

const fs = require('fs')
const proxyquire = require('proxyquire')
const { execSync } = require('child_process')

const dirname = `${__dirname}/../node_modules/edgemicro/cli/lib`

describe('cli/patchers/edgemicro', () => {
  let patcher
  let childProcess

  beforeEach(() => {
    childProcess = {
      execSync: sinon.stub().callsFake(execSync)
    }

    patcher = proxyquire('../../src/patchers/edgemicro', {
      'child_process': childProcess
    })
  })

  describe('in the current working directory', () => {
    let cwd

    beforeEach(() => {
      cwd = process.cwd()
      process.chdir(`${__dirname}/..`)
    })

    afterEach(() => {
      process.chdir(cwd)
    })

    it('should patch edgemicro', () => {
      const unpatched = fs.readFileSync(`${dirname}/start-agent.js`).toString()

      patcher.patch()

      const patched = fs.readFileSync(`${dirname}/start-agent.js`).toString()
      const original = fs.readFileSync(`${dirname}/start-agent.original.js`).toString()

      expect(unpatched).to.equal(original)
      expect(patched).to.include('dd-trace')
    })

    it('should unpatch edgemicro', () => {
      const original = fs.readFileSync(`${dirname}/start-agent.original.js`).toString()

      patcher.unpatch()

      const unpatched = fs.readFileSync(`${dirname}/start-agent.js`).toString()

      expect(unpatched).to.equal(original)
      expect(unpatched).to.not.include('dd-trace')
      expect(fs.existsSync(`${dirname}/start-agent.original.js`)).to.be.false
    })
  })

  describe('locally', () => {
    let nodePath

    beforeEach(() => {
      nodePath = process.env.NODE_PATH
      process.env.NODE_PATH = `${__dirname}/../node_modules`
      require('module').Module._initPaths()
    })

    afterEach(() => {
      process.env.NODE_PATH = nodePath
      require('module').Module._initPaths()
    })

    it('should patch edgemicro', () => {
      const unpatched = fs.readFileSync(`${dirname}/start-agent.js`).toString()

      patcher.patch()

      const patched = fs.readFileSync(`${dirname}/start-agent.js`).toString()
      const original = fs.readFileSync(`${dirname}/start-agent.original.js`).toString()

      expect(unpatched).to.equal(original)
      expect(patched).to.include('dd-trace')
    })

    it('should unpatch edgemicro', () => {
      const original = fs.readFileSync(`${dirname}/start-agent.original.js`).toString()

      patcher.unpatch()

      const unpatched = fs.readFileSync(`${dirname}/start-agent.js`).toString()

      expect(unpatched).to.equal(original)
      expect(unpatched).to.not.include('dd-trace')
      expect(fs.existsSync(`${dirname}/start-agent.original.js`)).to.be.false
    })
  })

  describe('globally', () => {
    beforeEach(() => {
      childProcess.execSync.withArgs('npm root -g').returns(`${__dirname}/../node_modules`)
    })

    it('should patch edgemicro', () => {
      const unpatched = fs.readFileSync(`${dirname}/start-agent.js`).toString()

      patcher.patch()

      const patched = fs.readFileSync(`${dirname}/start-agent.js`).toString()
      const original = fs.readFileSync(`${dirname}/start-agent.original.js`).toString()

      expect(unpatched).to.equal(original)
      expect(patched).to.include('dd-trace')
    })

    it('should unpatch edgemicro', () => {
      const original = fs.readFileSync(`${dirname}/start-agent.original.js`).toString()

      patcher.unpatch()

      const unpatched = fs.readFileSync(`${dirname}/start-agent.js`).toString()

      expect(unpatched).to.equal(original)
      expect(unpatched).to.not.include('dd-trace')
      expect(fs.existsSync(`${dirname}/start-agent.original.js`)).to.be.false
    })
  })
})
