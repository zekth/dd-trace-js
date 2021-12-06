'use strict'

const semver = require('semver')
const logger = require('./log')

if (semver.satisfies(process.versions.node, '^12.20.0 || >=14.13.1')) {
  const iitm = require('import-in-the-middle')
  module.exports = (modules, hookFn) => {
    return iitm(modules, (moduleExports, moduleName, moduleBaseDir) => {
      return hookFn(moduleExports, moduleName, decodeURIComponent(moduleBaseDir))
    })
  }
} else {
  logger.warn('ESM is not fully supported by this version of Node.js, ' +
    'so dd-trace will not intercept ESM loading.')
  module.exports = () => {}
}
