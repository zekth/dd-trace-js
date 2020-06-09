'use strict'

const id = require('../../id')
const DatadogSpanContext = require('../span_context')

// https://www.w3.org/TR/trace-context/#traceparent-header-field-values
// <version>-<trace-id>-<parent-id>-<trace-flags>

const PADDING = Array(16).fill(0).join('')

class W3CPropagator {
  inject (spanContext, carrier) {
    if (!carrier) return
    if (!spanContext) return
    if (!spanContext._traceId) return
    if (!spanContext._spanId) return
    const traceId = spanContext._traceId.toString(16)
    const parentId = spanContext._spanId.toString(16)

    // TODO do we need to set sampling flag based on data? or just always set to 1?

    // carrier is assumed to be an http headers object
    carrier.traceparent = `00-${PADDING}${traceId}-${parentId}-01`
  }

  extract (carrier) {
    if (!carrier) return
    if (!carrier.traceparent) return

    const chunks = carrier.traceparent.trim().split('-')
    if (chunks.length !== 4) return
    if (chunks[0] !== '00') return

    let traceId = chunks[1]
    if (traceId.length > 16) {
      traceId = traceId.substring(traceId.length - 16, traceId.length)
    }
    const parentId = chunks[2]

    // TODO do we need to grab the sampling flag from chunk 3?

    return new DatadogSpanContext({
      traceId: id(traceId, 16),
      spanId: id(parentId, 16)
    })
  }
}

module.exports = W3CPropagator
