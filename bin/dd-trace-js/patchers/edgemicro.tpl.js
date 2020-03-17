'use strict'

/* eslint-disable */

try {
  require('{TRACER}')
    .init({
      plugins: false
    })
    .use('edgemicro')
} catch (e) {
  console.error('Failed to initialize Datadog.')
}

module.exports = require('{ORIGINAL}')
