'use strict'

const id = require('../../../src/id')
const SpanContext = require('../../../src/opentracing/span_context')

describe('W3C Propagator', () => {
  let W3CPropagator
  let propagator

  beforeEach(() => {
    W3CPropagator = require('../../../src/opentracing/propagation/w3c')
    propagator = new W3CPropagator()
  })

  describe('inject', () => {
    it('should inject the span context into the headers', () => {
      const headers = {}
      const traceId = id()
      const spanId = id()
      const spanContext = new SpanContext({ traceId, spanId })

      propagator.inject(spanContext, headers)

      expect(headers.traceparent).to.equal(
        `00-0000000000000000${traceId.toString(16)}-${spanId.toString(16)}-01`
      )
    })
  })

  describe('extract', () => {
    it('should extract a span context from the headers', () => {
      const headers = {
        traceparent: `00-0a1b2c3d4e5f6a7b0c1d2e3f4a5b6c7d-4e5f6a7b0c1d2e3f-01`
      }
      const spanContext = propagator.extract(headers)

      expect(spanContext).to.deep.equal(new SpanContext({
        traceId: id('0c1d2e3f4a5b6c7d', 16),
        spanId: id('4e5f6a7b0c1d2e3f', 16)
      }))
    })
  })
})
