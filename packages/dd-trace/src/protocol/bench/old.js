'use strict';

const tracer = require('../../../../..').init()

const ITERATIONS = process.env.ITERATIONS

for (let i = 0; i < ITERATIONS; i++) {
  const span1 = tracer.startSpan('span1', {
    tags: {
      'service.name': 'service1',
      type: 'type1',
      resource: 'resource1',
      meta1: 'hello'
    }
  })
  span1.finish()

  tracer.startSpan('span2', {
    childOf: span1,
    tags: {
      'service.name': 'service2',
      type: 'type2',
      resource: 'resource2',
      metric1: 1337.5
    }
  }).finish()
}

tracer._tracer._exporter._writer.flush()

