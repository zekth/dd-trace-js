'use strict'
const path = require('path')

const apiCompatibilityChecks = require('opentracing/lib/test/api_compatibility').default

apiCompatibilityChecks(() => {
  const tracer = proxyquire(path.join(__dirname, '../..'), {})
  return tracer.init({
    service: 'test',
    flushInterval: 0,
    plugins: false
  })
})
