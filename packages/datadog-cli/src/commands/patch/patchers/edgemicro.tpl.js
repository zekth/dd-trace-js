'use strict'

try {
  require('cluster').isWorker && require('{TRACER}').init()
} catch (e) {
  console.error('Failed to initialize Datadog.') // eslint-disable-line
}

module.exports = require('./start-agent.original.js')
