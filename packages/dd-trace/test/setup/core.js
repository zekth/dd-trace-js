'use strict'

const sinon = require('sinon')
const chai = require('chai')
const sinonChai = require('sinon-chai')
const os = require('os')
const path = require('path')
const proxyquire = require('../proxyquire')
const semver = require('semver')
const metrics = require('../../src/metrics')
const agent = require('../plugins/agent')
const externals = require('../plugins/externals.json')
const { storage } = require('../../../datadog-core')

chai.use(sinonChai)
chai.use(require('../asserts/profile'))

global.sinon = sinon
global.expect = chai.expect
global.proxyquire = proxyquire
global.withVersions = withVersions

afterEach(() => {
  agent.reset()
  metrics.stop()
})

afterEach(() => {
  storage.enterWith(undefined)
})

function loadInst (plugin) {
  console.log('sleek')
  const instrumentations = []
  const instrument = {
    addHook (instrumentation) {
      instrumentations.push(instrumentation)
    }
  }
  const instPath = path.join(__dirname, `../../../datadog-instrumentations/src/${plugin}.js`)
  console.log('yay')
  console.log(instPath)
  proxyquire.noPreserveCache()(instPath, {
    './helpers/instrument': instrument
  })
  return instrumentations
}

function withVersions (plugin, modules, range, cb) {
  console.log('check')
  const instrumentations = typeof plugin === 'string' ? loadInst(plugin) : [].concat(plugin)
  const names = [].concat(plugin).map(instrumentation => instrumentation.name)
  console.log(names)
  console.log('hello')

  modules = [].concat(modules)

  console.log(modules)

  names.forEach(name => {
    if (externals[name]) {
      [].concat(externals[name]).forEach(external => {
        instrumentations.push(external)
      })
    }
  })

  if (!cb) {
    cb = range
    range = null
  }

  modules.forEach(moduleName => {
    const testVersions = new Map()
    console.log('heyyys')
    console.log('heyyyasdasdass')
    console.log(instrumentations[0].versions)
    console.log(instrumentations[0].file)
    console.log(instrumentations)
    console.log(moduleName)
    console.log(instrumentations[0].name)
    console.log(instrumentations[0])
    console.log(JSON.stringify(instrumentations[0], null, 4));
    console.log(instrumentations[0].versions)
    instrumentations
      .filter(instrumentation => instrumentation.name === moduleName)
      .forEach(instrumentation => {
        console.log('dasdasdasdas')
        console.log(instrumentation)
        instrumentation.versions
          .forEach(version => {
            const min = semver.coerce(version).version
            const max = require(`../../../../versions/${moduleName}@${version}`).version()

            testVersions.set(min, { range: version, test: min })
            testVersions.set(max, { range: version, test: version })
          })
      })

    Array.from(testVersions)
      .filter(v => !range || semver.satisfies(v[0], range))
      .sort(v => v[0].localeCompare(v[0]))
      .map(v => Object.assign({}, v[1], { version: v[0] }))
      .forEach(v => {
        const versionPath = `${__dirname}/../../../../versions/${moduleName}@${v.test}/node_modules`

        describe(`with ${moduleName} ${v.range} (${v.version})`, () => {
          let nodePath

          before(() => {
            nodePath = process.env.NODE_PATH
            process.env.NODE_PATH = [process.env.NODE_PATH, versionPath]
              .filter(x => x && x !== 'undefined')
              .join(os.platform() === 'win32' ? ';' : ':')

            require('module').Module._initPaths()
          })

          cb(v.test, moduleName)

          after(() => {
            process.env.NODE_PATH = nodePath
            require('module').Module._initPaths()
          })
        })
      })
  })
}
