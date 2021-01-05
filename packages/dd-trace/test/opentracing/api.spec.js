'use strict'

const apiCompatibilityChecks = require('opentracing/lib/test/api_compatibility').default

apiCompatibilityChecks(() => {
  const tracer = proxyquire('../..', {})
  return tracer.init({
    service: 'test',
    flushInterval: 0,
    plugins: false
  })
})
