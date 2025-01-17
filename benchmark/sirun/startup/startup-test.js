'use strict'

if (Number(process.env.USE_TRACER)) {
  require('../../..').init()
}

if (Number(process.env.EVERYTHING)) {
  const json = require('../../../package.json')
  for (const pkg in json.dependencies) {
    if (pkg !== '@types/node' && pkg !== 'nan') {
      require(pkg)
    }
  }
  for (const devPkg in json.devDependencies) {
    require(devPkg)
  }
}
